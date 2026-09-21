# backend/chitti_router.py
import os
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel, Field
import httpx
from dotenv import load_dotenv

from chitti_math_engine import get_math_engine, normalize_template_name

load_dotenv(override=True)

logger = logging.getLogger("chitti_router")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/api/v2/incremental-chitti", tags=["incremental-chitti"])

# NocoDB Configuration
NOCODB_BASE_URL = os.getenv("NOCODB_BASE_URL", "https://nocodbclearflow.duckdns.org").rstrip("/")
NOCODB_API_TOKEN = os.getenv("NOCODB_API_TOKEN", "nc_pat_Vf0ArT5N1viLmhSbkmZj1JQB37Aq38ogQrKgYvki")

TABLE_CHITTIS = os.getenv("TABLE_CHITTIS", "ma9c6ih3cgbhxnu")
TABLE_SHARES = os.getenv("TABLE_SHARES", "vw5v1nha7uv7tnlv")
TABLE_TRANSACTIONS = os.getenv("TABLE_TRANSACTIONS", "p9hecvxlw635owy")
TABLE_MANAGERS = os.getenv("TABLE_MANAGERS", "mwpjsb0cjfm9lzl")

# Direct table IDs in NocoDB v2
ACTUAL_SHARES_TABLE = os.getenv("NOCODB_TABLE_SHARES", "m6u5e5h8w1q3mgw")
ACTUAL_TX_TABLE = os.getenv("NOCODB_TABLE_TRANSACTIONS", "m81w3utpq3h43im")
JUNCTION_TABLE_CHITTI_SHARES = "mz700sc4t3gjem5"
JUNCTION_TABLE_MANAGERS = "m0e1yupo1z24a25"

HEADERS = {
    "xc-token": NOCODB_API_TOKEN,
    "Content-Type": "application/json"
}


def unpack_nocodb_list(data: Any) -> List[Dict[str, Any]]:
    """Safely unpacks NocoDB response dictionary or list."""
    if isinstance(data, dict):
        return data.get("list", [])
    if isinstance(data, list):
        return data
    return []


async def get_manager_map(client: httpx.AsyncClient) -> Dict[str, Any]:
    """Returns mapping between manager id, email, and records from TABLE_MANAGERS."""
    url = f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_MANAGERS}/records?limit=100"
    resp = await client.get(url, headers=HEADERS)
    records = unpack_nocodb_list(resp.json()) if resp.status_code == 200 else []
    id_to_email = {}
    email_to_id = {}
    for r in records:
        mid = r.get("Id")
        memail = str(r.get("Manager_ID") or r.get("Email") or "").strip().lower()
        if memail:
            if mid is not None:
                id_to_email[str(mid)] = memail
                id_to_email[mid] = memail
            email_to_id[memail] = mid
    return {
        "id_to_email": id_to_email,
        "email_to_id": email_to_id,
        "records": records
    }


def get_record_manager_email(record: dict, id_to_email: dict) -> Optional[str]:
    """Extracts authenticated manager email for a chitti record."""
    raw_mgr = record.get("Manager_ID")
    if isinstance(raw_mgr, dict):
        mid = str(raw_mgr.get("Id"))
        if mid in id_to_email:
            return id_to_email[mid]
        if raw_mgr.get("Email"):
            return str(raw_mgr["Email"]).strip().lower()
    elif isinstance(raw_mgr, (str, int)):
        smgr = str(raw_mgr).strip().lower()
        if smgr in id_to_email:
            return id_to_email[smgr]
        if "@" in smgr:
            return smgr

    # Also check nc_nlto___nc_m2m_Chittis_Managers
    m2m = record.get("nc_nlto___nc_m2m_Chittis_Managers") or []
    if isinstance(m2m, list):
        for link in m2m:
            mid = str(link.get("nc_nlto___Managers_id"))
            if mid in id_to_email:
                return id_to_email[mid]

    # Also check Title
    title = str(record.get("Title") or "").strip().lower()
    if "@" in title:
        return title

    return None


def extract_authenticated_manager(request: Request, manager_id: Optional[str] = None) -> str:
    """Extracts and verifies manager email from query params or headers."""
    auth_manager = manager_id
    if not auth_manager or not auth_manager.strip():
        auth_manager = request.headers.get("x-manager-id") or request.headers.get("x-manager-email")
    if not auth_manager or not auth_manager.strip():
        tenant_hdr = request.headers.get("x-tenant-id")
        if tenant_hdr and tenant_hdr.startswith("TNT-"):
            auth_manager = tenant_hdr.replace("TNT-", "")

    if not auth_manager or not auth_manager.strip():
        raise HTTPException(
            status_code=401,
            detail="Authentication required: manager_id (email) must be provided"
        )
    return auth_manager.strip().lower()


def normalize_chitti(c: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalizes NocoDB Pascal_Case Chitti record to include
    snake_case, camelCase, and original Pascal_Case keys.
    """
    cid = str(c.get("Chitti_ID") or c.get("Id") or "").strip()
    name = c.get("Chitti_Name") or f"Chitti Circle #{cid}"
    members = int(c.get("Total_Members") or 20)
    months = int(c.get("Total_Months") or 20)
    commission = float(c.get("Commission_Amount") or c.get("Monthly_Commission") or 4000)
    undrawn = float(c.get("Undrawn_Due") or 5000)
    drawn = float(c.get("Drawn_Due") or 6000)
    cur_month = int(c.get("Current_Active_Month") or c.get("Current_Month") or 1)
    
    # Store clean canonical template title: 'Incremental Model V1'
    raw_template = c.get("Rule_Template") or c.get("Template_ID") or "Incremental Model V1"
    template = "Incremental Model V1" if "incremental" in str(raw_template).lower() else str(raw_template)
    start_date = c.get("Start_Date") or "2026-09-01"

    schedule_raw = c.get("Incremental_Schedule")
    schedule = []
    if isinstance(schedule_raw, str):
        try:
            schedule = json.loads(schedule_raw)
        except Exception:
            schedule = []
    elif isinstance(schedule_raw, list):
        schedule = schedule_raw

    mapped = {
        # Pascal_Case
        "Id": c.get("Id"),
        "Chitti_ID": cid,
        "Chitti_Name": name,
        "Total_Members": members,
        "Total_Shares": members,
        "Total_Months": months,
        "Commission_Amount": commission,
        "Monthly_Commission": commission,
        "Undrawn_Due": undrawn,
        "Drawn_Due": drawn,
        "Current_Active_Month": cur_month,
        "Current_Month": cur_month,
        "Template_ID": template,
        "Rule_Template": template,
        "Start_Date": start_date,
        "Incremental_Schedule": schedule,
        "Net_Commission_Earned": c.get("Net_Commission_Earned"),
        "Overall_Net_Debt": c.get("Overall_Net_Debt"),
        "Net_Balance": c.get("Net_Balance"),
        "Ledger_Remark": c.get("Ledger_Remark"),
        "Total_Net_Collected": c.get("Total_Net_Collected"),
        "Manager_ID": c.get("Manager_ID") or "",

        # snake_case
        "id": c.get("Id"),
        "chitti_id": cid,
        "chitti_name": name,
        "total_members": members,
        "total_shares": members,
        "total_months": months,
        "commission_amount": commission,
        "monthly_commission": commission,
        "undrawn_due": undrawn,
        "drawn_due": drawn,
        "current_active_month": cur_month,
        "current_month": cur_month,
        "template_id": template,
        "rule_template": template,
        "start_date": start_date,
        "incremental_schedule": schedule,
        "manager_id": c.get("Manager_ID") or "",

        # camelCase
        "chittiId": cid,
        "chittiName": name,
        "totalMembers": members,
        "totalShares": members,
        "totalMonths": months,
        "commissionAmount": commission,
        "monthlyCommission": commission,
        "undrawnDue": undrawn,
        "drawnDue": drawn,
        "currentActiveMonth": cur_month,
        "currentMonth": cur_month,
        "templateId": template,
        "ruleTemplate": template,
        "startDate": start_date,
        "managerId": c.get("Manager_ID") or "",
    }
    return mapped


def normalize_share(s: Dict[str, Any], idx: int = 1, chitti_id: str = "") -> Dict[str, Any]:
    """Normalizes NocoDB Pascal_Case Share record."""
    sid = str(s.get("Share_ID") or s.get("Id") or f"SHR-{idx:03d}").strip()
    member_name = s.get("Member_Name") or f"Member {idx}"
    member_phone = s.get("Member_Phone") or s.get("Phone_Number") or s.get("Phone") or "+919800000000"
    draw_status = s.get("Draw_Status") or "Undrawn"
    advance_credit = float(s.get("Advance_Credit") or 0.0)
    won_cycle = s.get("Won_Cycle_Month") or s.get("Month_Drawn")
    prize_amount = float(s.get("Prize_Amount_Received") or 0.0) if s.get("Prize_Amount_Received") else None
    pending_arrears = float(s.get("Total_Pending_Arrears") or 0.0)
    resolved_chitti_id = str(s.get("Chitti_ID") or chitti_id or "").strip()

    mapped = {
        "Id": s.get("Id"),
        "Share_ID": sid,
        "Share_Number": idx,
        "Member_Name": member_name,
        "Member_Phone": member_phone,
        "Phone": member_phone,
        "Phone_Number": member_phone,
        "Draw_Status": draw_status,
        "Advance_Credit": advance_credit,
        "Won_Cycle_Month": won_cycle,
        "Month_Drawn": won_cycle,
        "Prize_Amount_Received": prize_amount,
        "Total_Pending_Arrears": pending_arrears,
        "Chitti_ID": resolved_chitti_id,
        "Manager_ID": s.get("Manager_ID") or "",

        # snake_case
        "id": s.get("Id"),
        "share_id": sid,
        "share_number": idx,
        "member_name": member_name,
        "member_phone": member_phone,
        "draw_status": draw_status,
        "advance_credit": advance_credit,
        "won_cycle_month": won_cycle,
        "month_drawn": won_cycle,
        "prize_amount_received": prize_amount,
        "total_pending_arrears": pending_arrears,
        "chitti_id": resolved_chitti_id,

        # camelCase
        "shareId": sid,
        "shareNumber": idx,
        "memberName": member_name,
        "memberPhone": member_phone,
        "phone": member_phone,
        "phoneNumber": member_phone,
        "drawStatus": draw_status,
        "advanceCredit": advance_credit,
        "wonCycleMonth": won_cycle,
        "monthDrawn": won_cycle,
        "prizeAmountReceived": prize_amount,
        "totalPendingArrears": pending_arrears,
        "chittiId": resolved_chitti_id,
    }
    return mapped



def normalize_transaction(t: Dict[str, Any]) -> Dict[str, Any]:
    """Normalizes Transaction records."""
    tid = str(t.get("Trans_ID") or t.get("Id") or "").strip()
    m_num = int(t.get("Cycle_Month") or t.get("Month_Number") or 1)
    debit = float(t.get("Debit_Amount") or 0.0)
    credit = float(t.get("Credit_Amount") or 0.0)
    remarks = t.get("Remarks") or ""
    t_type = t.get("Transaction_Type") or "Payment"
    t_date = t.get("Transaction_Date") or t.get("CreatedAt") or "2026-09-01"

    mapped = {
        "Trans_ID": tid,
        "Cycle_Month": m_num,
        "Month_Number": m_num,
        "Debit_Amount": debit,
        "Credit_Amount": credit,
        "Amount_Paid": credit,
        "Pending_Dues": debit,
        "Remarks": remarks,
        "Transaction_Type": t_type,
        "Transaction_Date": t_date,
        "Chitti_ID": str(t.get("Chitti_ID") or ""),
        "Share_ID": str(t.get("Share_ID") or ""),

        # snake_case
        "trans_id": tid,
        "cycle_month": m_num,
        "month_number": m_num,
        "debit_amount": debit,
        "credit_amount": credit,
        "amount_paid": credit,
        "pending_dues": debit,
        "remarks": remarks,
        "transaction_type": t_type,
        "transaction_date": t_date,

        # camelCase
        "transId": tid,
        "monthNumber": m_num,
        "amountPaid": credit,
        "pendingDues": debit,
        "transactionType": t_type,
        "transactionDate": t_date
    }
    return mapped


# ---------------------------------------------------------------------
# Pydantic Request Models
# ---------------------------------------------------------------------
class ManagerVerifyRequest(BaseModel):
    email: str
    token: Optional[str] = None

class WinnerRequest(BaseModel):
    manager_id: Optional[str] = None
    chitti_id: str
    share_id: str
    cycle_month: int = Field(..., ge=1, le=100)

class PaymentRequest(BaseModel):
    manager_id: Optional[str] = None
    chitti_id: str
    share_id: str
    amount_paid: float
    remarks: Optional[str] = "Payment recorded"

class ShareEditRequest(BaseModel):
    share_id: str
    chitti_id: str
    member_name: Optional[str] = None
    member_phone: Optional[str] = None

class ShareCreateRequest(BaseModel):
    share_id: str
    chitti_id: str
    member_name: str
    member_phone: str

class ChittiCreateRequest(BaseModel):
    manager_id: str = Field(..., description="Google email of manager creating this chitti")
    chitti_name: str
    chitti_id: Optional[str] = None
    rule_template: Optional[str] = "Incremental Model V1"
    template_id: Optional[str] = "Incremental Model V1"
    total_months: int = 20
    total_members: int = 20
    commission_amount: float = 4000
    undrawn_due: float = 5000
    drawn_due: float = 6000
    start_date: Optional[str] = "2026-09-01"

class ManagerExpenseRequest(BaseModel):
    manager_id: Optional[str] = None
    chitti_id: str
    transaction_type: Optional[str] = "Manager Expense"
    amount: float
    remarks: Optional[str] = "Expense"

class SpawnMonthRequest(BaseModel):
    manager_id: Optional[str] = None
    chitti_id: str


# ---------------------------------------------------------------------
# Helpers for Strict Chitti-Wise Filtering & Gatekeeping
# ---------------------------------------------------------------------
async def fetch_and_gatekeep_chitti(
    client: httpx.AsyncClient,
    chitti_id: str,
    auth_manager: str
) -> Dict[str, Any]:
    """
    1. Fetches Chitti Group from NocoDB.
    2. Enforces Tenant Isolation: must belong to auth_manager.
    3. Enforces Template-Wise Gatekeeping: must be 'Incremental Model V1'.
    """
    url_chitti = f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_CHITTIS}/records?where=(Chitti_ID,eq,{chitti_id})"
    resp = await client.get(url_chitti, headers=HEADERS)
    records = unpack_nocodb_list(resp.json()) if resp.status_code == 200 else []

    if not records:
        # Fallback search
        resp_all = await client.get(f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_CHITTIS}/records?limit=100", headers=HEADERS)
        all_chittis = unpack_nocodb_list(resp_all.json())
        for c in all_chittis:
            if str(c.get("Chitti_ID") or "").strip() == str(chitti_id).strip() or str(c.get("Id")) == str(chitti_id):
                records = [c]
                break

    if not records:
        raise HTTPException(status_code=404, detail=f"Chitti circle '{chitti_id}' not found")

    raw_chitti = records[0]
    mgr_data = await get_manager_map(client)
    rec_owner = get_record_manager_email(raw_chitti, mgr_data["id_to_email"])

    # Strict Tenant Isolation
    if auth_manager and rec_owner and rec_owner != auth_manager:
        logger.warning(f"Tenant isolation block: Manager '{auth_manager}' attempted to access Chitti '{chitti_id}' owned by '{rec_owner}'")
        raise HTTPException(status_code=403, detail="Access denied: This chitti circle belongs to another manager")

    chitti_dict = normalize_chitti(raw_chitti)

    # Strict Template Gatekeeping for /incremental-chitti routes
    template_normalized = normalize_template_name(chitti_dict["Rule_Template"])
    if template_normalized != "incremental model v1":
        raise HTTPException(
            status_code=400,
            detail=f"Template mismatch: Chitti '{chitti_id}' is configured with '{chitti_dict['Rule_Template']}'. This endpoint only handles 'Incremental Model V1' chittis."
        )

    return chitti_dict


async def fetch_strictly_isolated_shares(
    client: httpx.AsyncClient,
    chitti_id: str,
    chitti_int_id: Optional[int],
    total_members: int
) -> List[Dict[str, Any]]:
    """
    Strict Chitti-Wise Share Isolation:
    Returns ONLY shares that belong to this Chitti_ID.
    Prevents any bleeding from other groups. Deduplicates by Share_ID.
    """
    shares_url = f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_SHARES_TABLE}/records?limit=100"
    resp_shares = await client.get(shares_url, headers=HEADERS)
    all_shares_raw = unpack_nocodb_list(resp_shares.json()) if resp_shares.status_code == 200 else []

    # Check junction table for links
    junction_url = f"{NOCODB_BASE_URL}/api/v2/tables/{JUNCTION_TABLE_CHITTI_SHARES}/records?limit=100"
    resp_junction = await client.get(junction_url, headers=HEADERS)
    junction_records = unpack_nocodb_list(resp_junction.json()) if resp_junction.status_code == 200 else []

    linked_share_ids = set()
    for j in junction_records:
        j_cid = str(j.get("nc_nlto___Chittis_id") or "").strip()
        if j_cid == str(chitti_id) or (chitti_int_id and j_cid == str(chitti_int_id)):
            s_id = j.get("nc_nlto___Shares_id")
            if s_id:
                linked_share_ids.add(s_id)

    matched_shares = []
    seen_share_ids = set()

    for s in all_shares_raw:
        s_cid = str(s.get("Chitti_ID") or "").strip()
        s_id = s.get("Id")
        s_title = str(s.get("Title") or "")
        sid = str(s.get("Share_ID") or "").strip()

        # Strict group boundary check
        belongs_to_this_chitti = (
            (s_cid == str(chitti_id)) or
            (s_title.startswith(f"{chitti_id}_")) or
            (s_id in linked_share_ids)
        )

        if belongs_to_this_chitti:
            # Deduplicate by Share_ID so duplicate database entries never leak
            dedup_key = sid if sid else str(s_id)
            if dedup_key not in seen_share_ids:
                seen_share_ids.add(dedup_key)
                matched_shares.append(normalize_share(s, idx=len(matched_shares) + 1, chitti_id=chitti_id))

    # If shares already exist in DB for this chitti, return them (up to total_members)
    if matched_shares:
        return matched_shares[:total_members]

    # Synthesize clean initial roster specifically for this Chitti if none registered yet
    clean_shares = []
    for i in range(1, total_members + 1):
        clean_shares.append({
            "Id": i,
            "Share_ID": f"{chitti_id}{i:02d}",
            "Share_Number": i,
            "Member_Name": f"Member {i}",
            "Member_Phone": "+919800000000",
            "Phone": "+919800000000",
            "Phone_Number": "+919800000000",
            "Draw_Status": "Undrawn",
            "Advance_Credit": 0.0,
            "Won_Cycle_Month": None,
            "Month_Drawn": None,
            "Prize_Amount_Received": None,
            "Total_Pending_Arrears": 0.0,
            "Chitti_ID": chitti_id,
            "share_id": f"{chitti_id}{i:02d}",
            "member_name": f"Member {i}",
            "member_phone": "+919800000000",
            "draw_status": "Undrawn",
            "advance_credit": 0.0,
            "total_pending_arrears": 0.0,
            "chitti_id": chitti_id
        })
    return clean_shares


async def fetch_strictly_isolated_transactions(
    client: httpx.AsyncClient,
    chitti_id: str,
    chitti_int_id: Optional[int]
) -> List[Dict[str, Any]]:
    """Strict Chitti-Wise Transaction Isolation."""
    tx_url = f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_TX_TABLE}/records?limit=100"
    resp_tx = await client.get(tx_url, headers=HEADERS)
    all_tx_raw = unpack_nocodb_list(resp_tx.json()) if resp_tx.status_code == 200 else []

    matched_tx = []
    for t in all_tx_raw:
        t_cid = str(t.get("Chitti_ID") or "").strip()
        t_title = str(t.get("Title") or "")
        if t_cid == str(chitti_id) or t_title.startswith(f"{chitti_id}_"):
            matched_tx.append(normalize_transaction(t))

    return matched_tx


# ---------------------------------------------------------------------
# POST /api/v2/incremental-chitti/auth/verify-manager
# ---------------------------------------------------------------------
@router.post("/auth/verify-manager")
async def verify_manager(req: ManagerVerifyRequest):
    """
    The Bouncer: Checks email against Managers Table.
    Allows user ONLY if email exists AND Status is 'Active'.
    """
    clean_email = req.email.strip().lower() if req.email else ""
    if not clean_email:
        raise HTTPException(status_code=400, detail="Email is required for authentication")

    url = f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_MANAGERS}/records?limit=100"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                logger.error(f"NocoDB error querying managers: {resp.status_code} {resp.text}")
                raise HTTPException(status_code=502, detail="Failed to reach authentication database")

            records = unpack_nocodb_list(resp.json())
            matched_manager = None

            for r in records:
                m_email = str(r.get("Manager_ID") or r.get("Email") or "").strip().lower()
                if m_email == clean_email:
                    matched_manager = r
                    break

            if not matched_manager:
                logger.warning(f"Bouncer rejected unauthorized email: '{clean_email}'")
                raise HTTPException(
                    status_code=403,
                    detail=f"Access Denied: The account '{clean_email}' is not an authorized Manager in the system. Contact your administrator."
                )

            status = str(matched_manager.get("Status") or "Active").strip().lower()
            if status not in ["active", "approved", "verified"]:
                logger.warning(f"Bouncer rejected manager with status: '{status}'")
                raise HTTPException(
                    status_code=403,
                    detail=f"Access Denied: Manager account is {status.title()}. Please contact administration."
                )

            manager_id_val = str(matched_manager.get("Manager_ID") or clean_email).strip().lower()

            return {
                "status": "success",
                "authorized": True,
                "manager": {
                    "Id": matched_manager.get("Id"),
                    "Manager_ID": manager_id_val,
                    "Name": matched_manager.get("Name") or clean_email.split("@")[0].title(),
                    "Email": clean_email,
                    "Status": "Active"
                }
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Bouncer authentication check failed")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# GET /api/v2/incremental-chitti/list
# ---------------------------------------------------------------------
@router.get("/list")
async def list_incremental_chittis(
    request: Request,
    manager_id: Optional[str] = Query(None)
):
    """Lists only Chittis belonging to the authenticated manager."""
    auth_manager = extract_authenticated_manager(request, manager_id)

    url = f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_CHITTIS}/records?limit=100"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                logger.error(f"NocoDB error fetching chittis: {resp.status_code} {resp.text}")
                raise HTTPException(status_code=502, detail=f"NocoDB error: {resp.text}")

            records = unpack_nocodb_list(resp.json())
            mgr_data = await get_manager_map(client)
            id_to_email = mgr_data["id_to_email"]

            matched = []
            for r in records:
                rec_owner = get_record_manager_email(r, id_to_email)
                if rec_owner and rec_owner == auth_manager:
                    cid = str(r.get("Chitti_ID") or "").strip()
                    if cid and cid != "string":
                        matched.append(normalize_chitti(r))
                    elif r.get("Chitti_Name") and r.get("Chitti_Name") != "string":
                        matched.append(normalize_chitti(r))

            return {
                "status": "success",
                "count": len(matched),
                "groups": matched
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to query NocoDB chittis")
            raise HTTPException(status_code=500, detail=str(e))

list_chittis = list_incremental_chittis



# ---------------------------------------------------------------------
# GET /api/v2/incremental-chitti/{chitti_id}
# Strict Chitti-Wise Isolation + Template Gatekeeping + Math Scoreboard
# ---------------------------------------------------------------------
@router.get("/{chitti_id}")
async def get_chitti_details(
    chitti_id: str,
    request: Request,
    manager_id: Optional[str] = Query(None)
):
    """
    Fetches details for a specific Chitti with:
    1. Strict Tenant Isolation (belongs to authenticated manager)
    2. Strict Template Gatekeeping (Rule_Template must be 'Incremental Model V1')
    3. Strict Chitti-Wise Share & Ledger Isolation
    4. Real-time Math Scoreboard execution
    """
    auth_manager = extract_authenticated_manager(request, manager_id)

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 1. Gatekeep and verify Chitti ownership & template
            chitti = await fetch_and_gatekeep_chitti(client, chitti_id, auth_manager)
            chitti_int_id = chitti.get("Id")

            # 2. Strict Chitti-Wise Share Isolation
            shares = await fetch_strictly_isolated_shares(
                client, chitti_id, chitti_int_id, chitti["Total_Members"]
            )

            # 3. Strict Chitti-Wise Transaction Isolation
            transactions = await fetch_strictly_isolated_transactions(
                client, chitti_id, chitti_int_id
            )

            # 4. Execute Pluggable Math Engine for Scoreboard & Current Pool
            engine = get_math_engine(chitti["Rule_Template"])
            scoreboard = engine.calculate_scoreboard(chitti, shares, transactions)

            drawn_count = sum(1 for s in shares if str(s.get("Draw_Status") or "").lower() == "drawn")
            undrawn_count = len(shares) - drawn_count
            pool_data = engine.calculate_month_pool(chitti, drawn_count, undrawn_count)

            return {
                "status": "success",
                "chitti": chitti,
                "group": chitti,
                "shares": shares,
                "transactions": transactions,
                "scoreboard": scoreboard,
                "pool": pool_data
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to get chitti details")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# POST /api/v2/incremental-chitti/create
# Tags every Chitti with selected math Rule_Template
# ---------------------------------------------------------------------
@router.post("/create")
async def create_chitti(req: ChittiCreateRequest):
    """Creates a new Chitti Group tagged with the chosen Rule Template."""
    cid = req.chitti_id.strip() if (req.chitti_id and req.chitti_id.strip()) else None
    if not cid:
        cid = str(int(req.chitti_name) if req.chitti_name.isdigit() else os.urandom(3).hex().upper())
        if len(cid) < 6:
            cid = f"{cid:0>6}"

    clean_email = req.manager_id.strip().lower()
    canonical_template = "Incremental Model V1"

    # Precalculate schedule using math engine
    engine = get_math_engine(canonical_template)
    schedule = []
    for m in range(1, req.total_months + 1):
        n_drawn = m - 1
        n_undrawn = req.total_members - n_drawn
        p_data = engine.calculate_month_pool(
            {
                "Undrawn_Due": req.undrawn_due,
                "Drawn_Due": req.drawn_due,
                "Monthly_Commission": req.commission_amount
            },
            drawn_count=n_drawn,
            undrawn_count=n_undrawn
        )
        schedule.append(p_data["winner_prize"])

    url = f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_CHITTIS}/records"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            mgr_data = await get_manager_map(client)
            mgr_int_id = mgr_data["email_to_id"].get(clean_email)

            payload = {
                "Title": clean_email,
                "Chitti_ID": cid,
                "Chitti_Name": req.chitti_name,
                "Template_ID": canonical_template,
                "Rule_Template": canonical_template,
                "Total_Members": req.total_members,
                "Total_Months": req.total_months,
                "Commission_Amount": req.commission_amount,
                "Undrawn_Due": req.undrawn_due,
                "Drawn_Due": req.drawn_due,
                "Current_Active_Month": 1,
                "Start_Date": req.start_date,
                "Incremental_Schedule": json.dumps(schedule),
            }
            if mgr_int_id:
                payload["Manager_ID"] = mgr_int_id

            resp = await client.post(url, headers=HEADERS, json=payload)
            data = resp.json()
            new_record = {**payload, **(data if isinstance(data, dict) else {})}

            # Link into junction table for relational persistence
            try:
                new_chitti_id = new_record.get("Id")
                if new_chitti_id and mgr_int_id:
                    j_url = f"{NOCODB_BASE_URL}/api/v2/tables/{JUNCTION_TABLE_MANAGERS}/records"
                    await client.post(j_url, headers=HEADERS, json={
                        "nc_nlto___Managers_id": mgr_int_id,
                        "nc_nlto___Chittis_id": new_chitti_id
                    })
            except Exception as link_err:
                logger.warning(f"Could not link chitti to manager junction table: {link_err}")

            return {
                "status": "success",
                "message": "Chitti created successfully",
                "chitti": normalize_chitti(new_record)
            }
        except Exception as e:
            logger.exception("Failed to create chitti")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# POST /api/v2/incremental-chitti/record-winner
# Switches share to 'Drawn', computes prize, updates scoreboard
# ---------------------------------------------------------------------
@router.post("/record-winner")
async def record_winner(req: WinnerRequest, request: Request):
    """
    Records cycle winner in NocoDB, updates share Draw_Status to 'Drawn',
    sets Won_Cycle_Month, logs Prize Disbursement transaction, and updates scoreboard.
    """
    auth_manager = extract_authenticated_manager(request, req.manager_id)

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            chitti = await fetch_and_gatekeep_chitti(client, req.chitti_id, auth_manager)
            shares = await fetch_strictly_isolated_shares(client, req.chitti_id, chitti.get("Id"), chitti["Total_Members"])
            transactions = await fetch_strictly_isolated_transactions(client, req.chitti_id, chitti.get("Id"))

            # Find target share
            target_share = None
            for s in shares:
                if str(s.get("Share_ID") or "").strip() == str(req.share_id).strip() or str(s.get("Id")) == str(req.share_id):
                    target_share = s
                    break

            if not target_share:
                raise HTTPException(status_code=404, detail=f"Share '{req.share_id}' not found in Chitti '{req.chitti_id}'")

            # Calculate pool prize using math engine
            engine = get_math_engine(chitti["Rule_Template"])
            # Count after this win: target becomes drawn
            drawn_count = sum(1 for s in shares if str(s.get("Draw_Status") or "").lower() == "drawn")
            if str(target_share.get("Draw_Status") or "").lower() != "drawn":
                drawn_count += 1
            undrawn_count = max(0, len(shares) - drawn_count)

            pool_calc = engine.calculate_month_pool(chitti, drawn_count, undrawn_count)
            prize_amount = pool_calc["winner_prize"]

            # Update share record in NocoDB
            if target_share.get("Id"):
                update_url = f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_SHARES_TABLE}/records"
                patch_data = {
                    "Id": target_share["Id"],
                    "Draw_Status": "Drawn",
                    "Won_Cycle_Month": req.cycle_month,
                    "Prize_Amount_Received": prize_amount
                }
                await client.patch(update_url, headers=HEADERS, json=patch_data)
                target_share["Draw_Status"] = "Drawn"
                target_share["Won_Cycle_Month"] = req.cycle_month
                target_share["Prize_Amount_Received"] = prize_amount

            # Log Prize Disbursement transaction
            tx_payload = {
                "Title": f"{req.chitti_id}_{req.share_id}",
                "Chitti_ID": req.chitti_id,
                "Share_ID": req.share_id,
                "Cycle_Month": req.cycle_month,
                "Debit_Amount": prize_amount,
                "Credit_Amount": prize_amount,
                "Transaction_Type": "Prize Disbursement",
                "Remarks": f"Winner for Month {req.cycle_month} drawn: prize ₹{prize_amount:.0f}"
            }
            await client.post(f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_TX_TABLE}/records", headers=HEADERS, json=tx_payload)
            transactions.append(tx_payload)

            # Update scoreboard in TABLE_CHITTIS
            scoreboard = engine.calculate_scoreboard(chitti, shares, transactions)
            if chitti.get("Id"):
                await client.patch(
                    f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_CHITTIS}/records",
                    headers=HEADERS,
                    json={
                        "Id": chitti["Id"],
                        "Net_Balance": scoreboard["net_balance"],
                        "Total_Net_Collected": scoreboard["total_net_collected"],
                        "Overall_Net_Debt": scoreboard["total_pending_arrears"]
                    }
                )

            return {
                "status": "success",
                "message": f"Share {req.share_id} recorded as winner for Month {req.cycle_month}",
                "prize_amount": prize_amount,
                "scoreboard": scoreboard
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to record winner")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# POST /api/v2/incremental-chitti/record-payment
# Waterfall payment settlement:
# 1. Clears Pending_Arrears to zero
# 2. Any surplus cash deposited into Advance_Credit
# ---------------------------------------------------------------------
@router.post("/record-payment")
async def record_payment(req: PaymentRequest, request: Request):
    """Applies waterfall member payment settlement and updates NocoDB."""
    auth_manager = extract_authenticated_manager(request, req.manager_id)

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            chitti = await fetch_and_gatekeep_chitti(client, req.chitti_id, auth_manager)
            shares = await fetch_strictly_isolated_shares(client, req.chitti_id, chitti.get("Id"), chitti["Total_Members"])
            transactions = await fetch_strictly_isolated_transactions(client, req.chitti_id, chitti.get("Id"))

            target_share = None
            for s in shares:
                if str(s.get("Share_ID") or "").strip() == str(req.share_id).strip() or str(s.get("Id")) == str(req.share_id):
                    target_share = s
                    break

            if not target_share:
                raise HTTPException(status_code=404, detail=f"Share '{req.share_id}' not found in Chitti '{req.chitti_id}'")

            engine = get_math_engine(chitti["Rule_Template"])
            updated_share, breakdown = engine.process_member_payment(target_share, req.amount_paid)

            # Persist updated share in NocoDB
            if target_share.get("Id"):
                update_url = f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_SHARES_TABLE}/records"
                await client.patch(
                    update_url,
                    headers=HEADERS,
                    json={
                        "Id": target_share["Id"],
                        "Total_Pending_Arrears": updated_share["Total_Pending_Arrears"],
                        "Advance_Credit": updated_share["Advance_Credit"]
                    }
                )

            # Log payment transaction
            tx_payload = {
                "Title": f"{req.chitti_id}_{req.share_id}",
                "Chitti_ID": req.chitti_id,
                "Share_ID": req.share_id,
                "Credit_Amount": req.amount_paid,
                "Transaction_Type": "Payment",
                "Remarks": f"{req.remarks or 'Payment'}: Cleared ₹{breakdown['cleared_arrears']:.0f} debt, ₹{breakdown['surplus_deposited_to_advance']:.0f} added to advance",
                "Manager_ID": auth_manager
            }
            tx_resp = await client.post(f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_TX_TABLE}/records", headers=HEADERS, json=tx_payload)
            transactions.append(tx_payload)

            # Recalculate and update scoreboard
            # Replace target share in shares list
            updated_shares_list = [updated_share if s.get("Id") == target_share.get("Id") else s for s in shares]
            scoreboard = engine.calculate_scoreboard(chitti, updated_shares_list, transactions)

            if chitti.get("Id"):
                await client.patch(
                    f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_CHITTIS}/records",
                    headers=HEADERS,
                    json={
                        "Id": chitti["Id"],
                        "Net_Balance": scoreboard["net_balance"],
                        "Total_Net_Collected": scoreboard["total_net_collected"],
                        "Overall_Net_Debt": scoreboard["total_pending_arrears"]
                    }
                )

            return {
                "status": "success",
                "message": "Payment recorded via waterfall settlement",
                "breakdown": breakdown,
                "scoreboard": scoreboard,
                "share": updated_share
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to record payment")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# POST /api/v2/incremental-chitti/spawn-month
# Spawns Month: generates dues, consumes advance credit, logs remaining debt
# ---------------------------------------------------------------------
@router.post("/spawn-month")
async def spawn_month(req: SpawnMonthRequest, request: Request):
    """
    Advances cycle to next month:
    1. For each share, determines liability (Undrawn_Due or Drawn_Due).
    2. Crucial: Consumes existing Advance_Credit before logging debt.
    3. Any remaining balance is added to Pending_Arrears.
    4. Recalculates and stores macro scoreboard.
    """
    auth_manager = extract_authenticated_manager(request, req.manager_id)

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            chitti = await fetch_and_gatekeep_chitti(client, req.chitti_id, auth_manager)
            cur_month = int(chitti.get("Current_Active_Month") or 1)
            next_m = cur_month + 1

            shares = await fetch_strictly_isolated_shares(client, req.chitti_id, chitti.get("Id"), chitti["Total_Members"])
            transactions = await fetch_strictly_isolated_transactions(client, req.chitti_id, chitti.get("Id"))

            engine = get_math_engine(chitti["Rule_Template"])
            updated_shares, generated_tx = engine.spawn_cycle_month(chitti, shares, next_m)

            # Update each share in NocoDB
            for s in updated_shares:
                if s.get("Id"):
                    await client.patch(
                        f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_SHARES_TABLE}/records",
                        headers=HEADERS,
                        json={
                            "Id": s["Id"],
                            "Advance_Credit": s["Advance_Credit"],
                            "Total_Pending_Arrears": s["Total_Pending_Arrears"]
                        }
                    )

            # Insert spawn transactions into NocoDB
            for tx in generated_tx:
                tx_payload = {
                    "Title": f"{req.chitti_id}_{tx['Share_ID']}",
                    "Chitti_ID": req.chitti_id,
                    "Share_ID": tx["Share_ID"],
                    "Cycle_Month": next_m,
                    "Debit_Amount": tx["Debit_Amount"],
                    "Credit_Amount": tx["Credit_Amount"],
                    "Transaction_Type": tx["Transaction_Type"],
                    "Remarks": tx["Remarks"]
                }
                await client.post(f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_TX_TABLE}/records", headers=HEADERS, json=tx_payload)
                transactions.append(tx_payload)

            # Update scoreboard & Active Month on Chitti
            scoreboard = engine.calculate_scoreboard(chitti, updated_shares, transactions)
            if chitti.get("Id"):
                await client.patch(
                    f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_CHITTIS}/records",
                    headers=HEADERS,
                    json={
                        "Id": chitti["Id"],
                        "Current_Active_Month": next_m,
                        "Net_Balance": scoreboard["net_balance"],
                        "Total_Net_Collected": scoreboard["total_net_collected"],
                        "Overall_Net_Debt": scoreboard["total_pending_arrears"]
                    }
                )

            return {
                "status": "success",
                "next_month": next_m,
                "scoreboard": scoreboard,
                "shares": updated_shares
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to spawn month")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# POST /api/v2/incremental-chitti/manager-expense
# ---------------------------------------------------------------------
@router.post("/manager-expense")
async def manager_expense(req: ManagerExpenseRequest, request: Request):
    """Records manager expense or correction and recalculates scoreboard."""
    auth_manager = extract_authenticated_manager(request, req.manager_id)

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            chitti = await fetch_and_gatekeep_chitti(client, req.chitti_id, auth_manager)
            shares = await fetch_strictly_isolated_shares(client, req.chitti_id, chitti.get("Id"), chitti["Total_Members"])
            transactions = await fetch_strictly_isolated_transactions(client, req.chitti_id, chitti.get("Id"))

            tx_payload = {
                "Title": f"{req.chitti_id}_EXPENSE",
                "Chitti_ID": req.chitti_id,
                "Debit_Amount": req.amount,
                "Transaction_Type": req.transaction_type or "Manager Expense",
                "Remarks": req.remarks or "Manager adjustment",
                "Manager_ID": auth_manager
            }
            await client.post(f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_TX_TABLE}/records", headers=HEADERS, json=tx_payload)
            transactions.append(tx_payload)

            engine = get_math_engine(chitti["Rule_Template"])
            scoreboard = engine.calculate_scoreboard(chitti, shares, transactions)

            if chitti.get("Id"):
                await client.patch(
                    f"{NOCODB_BASE_URL}/api/v2/tables/{TABLE_CHITTIS}/records",
                    headers=HEADERS,
                    json={
                        "Id": chitti["Id"],
                        "Net_Balance": scoreboard["net_balance"],
                        "Total_Net_Collected": scoreboard["total_net_collected"],
                        "Overall_Net_Debt": scoreboard["total_pending_arrears"]
                    }
                )

            return {
                "status": "success",
                "scoreboard": scoreboard
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to record manager expense")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# POST /api/v2/incremental-chitti/share/create
# ---------------------------------------------------------------------
@router.post("/share/create")
async def create_share(req: ShareCreateRequest, request: Request):
    """Registers a new share in NocoDB strictly linked to chitti_id."""
    auth_manager = extract_authenticated_manager(request)

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Verify chitti belongs to manager
            chitti = await fetch_and_gatekeep_chitti(client, req.chitti_id, auth_manager)

            payload = {
                "Title": f"{req.chitti_id}_{req.share_id}",
                "Share_ID": req.share_id,
                "Member_Name": req.member_name,
                "Member_Phone": req.member_phone,
                "Draw_Status": "Undrawn",
                "Advance_Credit": 0.0,
                "Total_Pending_Arrears": 0.0
            }
            resp = await client.post(f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_SHARES_TABLE}/records", headers=HEADERS, json=payload)
            share_record = resp.json() if resp.status_code in [200, 201] else payload

            # Relational link into junction table
            try:
                new_share_int_id = share_record.get("Id")
                chitti_int_id = chitti.get("Id")
                if new_share_int_id and chitti_int_id:
                    await client.post(
                        f"{NOCODB_BASE_URL}/api/v2/tables/{JUNCTION_TABLE_CHITTI_SHARES}/records",
                        headers=HEADERS,
                        json={
                            "nc_nlto___Chittis_id": chitti_int_id,
                            "nc_nlto___Shares_id": new_share_int_id
                        }
                    )
            except Exception as j_err:
                logger.warning(f"Failed to link share to junction: {j_err}")

            return {"status": "success", "share": share_record}
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to create share")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# POST /api/v2/incremental-chitti/share/edit
# ---------------------------------------------------------------------
@router.post("/share/edit")
async def edit_share(req: ShareEditRequest, request: Request):
    """Updates share member contact information in NocoDB."""
    auth_manager = extract_authenticated_manager(request)

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            chitti = await fetch_and_gatekeep_chitti(client, req.chitti_id, auth_manager)
            shares = await fetch_strictly_isolated_shares(client, req.chitti_id, chitti.get("Id"), chitti["Total_Members"])

            target = None
            for s in shares:
                if str(s.get("Share_ID") or "").strip() == str(req.share_id).strip() or str(s.get("Id")) == str(req.share_id):
                    target = s
                    break

            if not target:
                raise HTTPException(status_code=404, detail=f"Share '{req.share_id}' not found in Chitti '{req.chitti_id}'")

            if target.get("Id"):
                update_payload = {"Id": target["Id"]}
                if req.member_name:
                    update_payload["Member_Name"] = req.member_name
                if req.member_phone:
                    update_payload["Member_Phone"] = req.member_phone
                await client.patch(f"{NOCODB_BASE_URL}/api/v2/tables/{ACTUAL_SHARES_TABLE}/records", headers=HEADERS, json=update_payload)

            return {"status": "success", "message": "Share updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to edit share")
            raise HTTPException(status_code=500, detail=str(e))
