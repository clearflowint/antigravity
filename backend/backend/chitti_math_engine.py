# backend/chitti_math_engine.py
"""
ClearFlow Pluggable Chit Fund Math Engine.
Encapsulates Chit Fund models with a Factory pattern.
Currently implementing 'Incremental Model V1', designed for future template pluggability.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Tuple


class BaseChittiMathEngine(ABC):
    """Abstract Base Class for all Chit Fund Mathematical Models."""

    @abstractmethod
    def calculate_month_pool(self, chitti: Dict[str, Any], drawn_count: int, undrawn_count: int) -> Dict[str, float]:
        """Calculates total collection pool, commission, and winner's prize."""
        pass

    @abstractmethod
    def spawn_cycle_month(self, chitti: Dict[str, Any], shares: List[Dict[str, Any]], target_month: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Generates month liabilities for each share, automatically consuming advance credit.
        Returns: (updated_shares, generated_transactions)
        """
        pass

    @abstractmethod
    def process_member_payment(self, share: Dict[str, Any], amount_paid: float) -> Tuple[Dict[str, Any], Dict[str, float]]:
        """
        Applies waterfall payment:
        1. Clears Pending_Arrears to zero.
        2. Any surplus cash is deposited into Advance_Credit.
        Returns: (updated_share, settlement_breakdown)
        """
        pass

    @abstractmethod
    def calculate_scoreboard(self, chitti: Dict[str, Any], shares: List[Dict[str, Any]], transactions: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Recalculates macro-health metrics:
        Total_Pending_Arrears, Total_Net_Collected, Total_Disbursed, Manager_Expenses, Net_Balance
        """
        pass


class IncrementalModelV1Engine(BaseChittiMathEngine):
    """
    Incremental Model V1:
    - Fixed dues that increase after a member wins.
    - Undrawn members pay Undrawn_Due.
    - Drawn members pay Drawn_Due.
    - Dynamic Prize Pool grows each month as more members become 'Drawn':
        Total Pool = (Count of Drawn Members * Drawn_Due) + (Count of Undrawn Members * Undrawn_Due)
        Winner's Prize = Total Pool - Monthly_Commission
    """

    def calculate_month_pool(self, chitti: Dict[str, Any], drawn_count: int, undrawn_count: int) -> Dict[str, float]:
        undrawn_due = float(chitti.get("Undrawn_Due") or chitti.get("undrawn_due") or 5000)
        drawn_due = float(chitti.get("Drawn_Due") or chitti.get("drawn_due") or 6000)
        commission = float(chitti.get("Monthly_Commission") or chitti.get("Commission_Amount") or chitti.get("monthly_commission") or 4000)

        total_pool = (drawn_count * drawn_due) + (undrawn_count * undrawn_due)
        winner_prize = max(0.0, total_pool - commission)

        return {
            "drawn_count": drawn_count,
            "undrawn_count": undrawn_count,
            "undrawn_due": undrawn_due,
            "drawn_due": drawn_due,
            "total_pool": total_pool,
            "commission": commission,
            "winner_prize": winner_prize
        }

    def spawn_cycle_month(self, chitti: Dict[str, Any], shares: List[Dict[str, Any]], target_month: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        undrawn_due = float(chitti.get("Undrawn_Due") or chitti.get("undrawn_due") or 5000)
        drawn_due = float(chitti.get("Drawn_Due") or chitti.get("drawn_due") or 6000)
        cid = str(chitti.get("Chitti_ID") or chitti.get("chitti_id") or "")

        updated_shares = []
        generated_transactions = []

        for s in shares:
            s_copy = dict(s)
            draw_status = str(s_copy.get("Draw_Status") or s_copy.get("draw_status") or "Undrawn")
            is_drawn = draw_status.lower() == "drawn"

            # Generate correct liability
            liability = drawn_due if is_drawn else undrawn_due

            # Crucial: Automatically consume any existing Advance_Credit before logging debt
            existing_advance = float(s_copy.get("Advance_Credit") or s_copy.get("advance_credit") or 0.0)
            consumed_advance = 0.0
            remaining_liability = liability

            if existing_advance >= liability:
                consumed_advance = liability
                new_advance = existing_advance - liability
                remaining_liability = 0.0
            else:
                consumed_advance = existing_advance
                new_advance = 0.0
                remaining_liability = liability - consumed_advance

            # Any remaining balance is added to Pending_Arrears
            current_arrears = float(s_copy.get("Total_Pending_Arrears") or s_copy.get("total_pending_arrears") or 0.0)
            new_arrears = current_arrears + remaining_liability

            s_copy["Advance_Credit"] = new_advance
            s_copy["advance_credit"] = new_advance
            s_copy["Total_Pending_Arrears"] = new_arrears
            s_copy["total_pending_arrears"] = new_arrears

            updated_shares.append(s_copy)

            # Generate cycle transaction entry
            share_id = str(s_copy.get("Share_ID") or s_copy.get("share_id") or "")
            tx = {
                "Chitti_ID": cid,
                "Share_ID": share_id,
                "Cycle_Month": target_month,
                "Month_Number": target_month,
                "Debit_Amount": liability,
                "Credit_Amount": consumed_advance,
                "Advance_Credit_Applied": consumed_advance,
                "Pending_Dues": remaining_liability,
                "Transaction_Type": "Cycle Month Spawn",
                "Remarks": f"M{target_month} spawned: liability ₹{liability:.0f}, advance consumed ₹{consumed_advance:.0f}, remaining debt ₹{remaining_liability:.0f}"
            }
            generated_transactions.append(tx)

        return updated_shares, generated_transactions

    def process_member_payment(self, share: Dict[str, Any], amount_paid: float) -> Tuple[Dict[str, Any], Dict[str, float]]:
        s_copy = dict(share)
        amount = max(0.0, float(amount_paid))

        current_arrears = float(s_copy.get("Total_Pending_Arrears") or s_copy.get("total_pending_arrears") or 0.0)
        current_advance = float(s_copy.get("Advance_Credit") or s_copy.get("advance_credit") or 0.0)

        # Waterfall settlement:
        # 1. Clear existing Pending_Arrears to zero
        if amount <= current_arrears:
            cleared_arrears = amount
            new_arrears = current_arrears - amount
            surplus_credit = 0.0
            new_advance = current_advance
        else:
            cleared_arrears = current_arrears
            new_arrears = 0.0
            surplus_credit = amount - current_arrears
            new_advance = current_advance + surplus_credit

        s_copy["Total_Pending_Arrears"] = new_arrears
        s_copy["total_pending_arrears"] = new_arrears
        s_copy["Advance_Credit"] = new_advance
        s_copy["advance_credit"] = new_advance

        breakdown = {
            "amount_paid": amount,
            "cleared_arrears": cleared_arrears,
            "surplus_deposited_to_advance": surplus_credit,
            "remaining_arrears": new_arrears,
            "total_advance_credit": new_advance
        }

        return s_copy, breakdown

    def calculate_scoreboard(self, chitti: Dict[str, Any], shares: List[Dict[str, Any]], transactions: List[Dict[str, Any]]) -> Dict[str, float]:
        # Sum of all missing street cash across shares
        total_pending_arrears = sum(
            float(s.get("Total_Pending_Arrears") or s.get("total_pending_arrears") or 0.0)
            for s in shares
        )

        # Total member collections (Credit_Amount on member payments)
        total_net_collected = sum(
            float(t.get("Credit_Amount") or t.get("credit_amount") or 0.0)
            for t in transactions
            if str(t.get("Transaction_Type") or "").lower() in ["payment", "credit"]
        )

        # Total disbursed to winners
        total_disbursed = sum(
            float(t.get("Debit_Amount") or t.get("debit_amount") or t.get("Credit_Amount") or 0.0)
            for t in transactions
            if str(t.get("Transaction_Type") or "").lower() == "prize disbursement"
        )

        # Manager expenses / debit adjustments
        manager_expenses = sum(
            float(t.get("Debit_Amount") or t.get("debit_amount") or 0.0)
            for t in transactions
            if str(t.get("Transaction_Type") or "").lower() == "manager expense"
        )

        # Net Balance = Total_Net_Collected - Total_Disbursed - Manager_Expenses
        net_balance = total_net_collected - total_disbursed - manager_expenses

        # Total advance reserves currently held by manager
        total_advance_reserve = sum(
            float(s.get("Advance_Credit") or s.get("advance_credit") or 0.0)
            for s in shares
        )

        return {
            "total_pending_arrears": total_pending_arrears,
            "total_net_collected": total_net_collected,
            "total_disbursed": total_disbursed,
            "manager_expenses": manager_expenses,
            "net_balance": net_balance,
            "total_advance_reserve": total_advance_reserve
        }


# ---------------------------------------------------------------------
# Factory Pattern: Template Registry & Engine Resolver
# ---------------------------------------------------------------------
_ENGINE_REGISTRY: Dict[str, BaseChittiMathEngine] = {
    "incremental model v1": IncrementalModelV1Engine(),
    "incremental_template_v1": IncrementalModelV1Engine(),
}

def normalize_template_name(template_name: str) -> str:
    """Normalizes template strings to standard canonical form."""
    cleaned = (template_name or "").strip().lower()
    if "incremental" in cleaned:
        return "incremental model v1"
    return cleaned


def get_math_engine(rule_template: str) -> BaseChittiMathEngine:
    """
    Factory function to retrieve the math engine corresponding to the given Rule_Template.
    Raises ValueError if an unsupported template is requested.
    """
    key = normalize_template_name(rule_template)
    engine = _ENGINE_REGISTRY.get(key)
    if not engine:
        raise ValueError(f"No math engine registered for Rule Template: '{rule_template}'")
    return engine
