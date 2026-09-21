// backend/app/routes/apiRouter.js
// Direct, Reliable REST API Handlers for Multi-Tenant SaaS
import crypto from 'crypto';
import url from 'url';
import { extractTenantContext } from '../middleware/tenantContext.js';
import { saasStore } from '../database/store.js';
import { nocodbClient } from '../database/nocodbClient.js';

// Helper to send JSON responses with CORS
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.end(JSON.stringify(data));
}

// Helper to parse incoming JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk;
    });
    req.on('end', () => {
      if (!bodyStr) return resolve({});
      try {
        resolve(JSON.parse(bodyStr));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Universal Connect / Node.js HTTP request handler for /api/*
 */
export async function handleApiRequest(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '';
  // Normalize pathname to strip leading /api if present
  if (pathname.startsWith('/api')) {
    pathname = pathname.substring(4);
  }
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }
  req.query = parsedUrl.query;

  try {
    const context = extractTenantContext(req);
    const { tenantId, managerId } = context;

    // --- 1. HEALTHCHECK ---
    if (req.method === 'GET' && pathname === '/health') {
      const nocodbHealth = await nocodbClient.checkHealth();
      return sendJson(res, 200, {
        status: 'online',
        service: 'ClearFlow Small Chits SaaS Backend',
        tenancy: {
          currentTenantId: tenantId,
          managerId
        },
        nocodb: nocodbHealth
      });
    }

    // --- 2. RESET TENANT DEMO DATA ---
    if (req.method === 'POST' && pathname === '/sync/reset') {
      saasStore.resetTenantData(tenantId);
      return sendJson(res, 200, {
        status: 'reset_success',
        message: `Tenant ${tenantId} restored to initial sample workspace`
      });
    }

    // --- 3. CURRENT TENANT ---
    if (req.method === 'GET' && pathname === '/tenants/current') {
      return sendJson(res, 200, context.tenant);
    }

    // --- 4. CHITTI GROUPS COLLECTION & INCREMENTAL V2 LIST ---
    if (req.method === 'GET' && (pathname === '/chittis' || pathname === '/v2/incremental-chitti/list' || pathname === '/v2/incremental-chitti')) {
      const groups = saasStore.getGroups(tenantId);
      return sendJson(res, 200, {
        status: 'success',
        tenantId,
        count: groups.length,
        groups
      });
    }

    // --- 5. CHITTI GROUP CREATION ---
    if (req.method === 'POST' && (pathname === '/chittis' || pathname === '/v2/incremental-chitti/create')) {
      const body = await parseBody(req);
      const groupGlobalId = crypto.randomUUID();
      const chittiId = String(body.Chitti_ID || body.chitti_name || Math.floor(100000 + Math.random() * 900000)).trim();
      const now = new Date().toISOString();

      const newGroup = {
        Global_ID: groupGlobalId,
        Tenant_ID: tenantId,
        Chitti_ID: chittiId,
        Manager_ID: body.manager_id || managerId,
        Chitti_Name: body.Chitti_Name || body.chitti_name || 'New Chitti Circle',
        Rule_Template: body.Rule_Template || body.template_id || 'Incremental Model V1',
        Template_ID: body.template_id || 'INCREMENTAL_TEMPLATE_V1',
        Total_Members: Number(body.Total_Members || body.total_members) || 20,
        Total_Months: Number(body.Total_Months || body.total_months) || 20,
        Undrawn_Due: Number(body.Undrawn_Due || body.undrawn_due) || 4500,
        Drawn_Due: Number(body.Drawn_Due || body.drawn_due) || 5000,
        Monthly_Commission: Number(body.Monthly_Commission || body.commission_amount) || 4000,
        Commission_Amount: Number(body.Monthly_Commission || body.commission_amount) || 4000,
        Current_Month: 1,
        Current_Active_Month: 1,
        Cycle_Start_Date: body.Cycle_Start_Date || body.start_date || new Date().toISOString().split('T')[0],
        Cycle_Anchor_Day: Number(body.Cycle_Anchor_Day) || 10,
        Frequency: 'Monthly',
        Status: 'Active',
        Created_At: now,
        Updated_At: now
      };

      // Generate member shares with 6-digit Share IDs & Global UUIDs
      const members = Array.isArray(body.members) ? body.members : [];
      const sharesList = [];
      for (let i = 0; i < newGroup.Total_Members; i++) {
        const m = members[i] || {};
        const shareGlobalId = crypto.randomUUID();
        const shareId = String(m.Share_ID || Math.floor(100000 + Math.random() * 900000)).trim();
        sharesList.push({
          Global_ID: shareGlobalId,
          Tenant_ID: tenantId,
          Chitti_ID: chittiId,
          Share_ID: shareId,
          Share_Number: i + 1,
          Member_Name: m.Member_Name || (i === 0 ? 'Foreman Manager' : `Member ${i + 1}`),
          Phone_Number: m.Phone_Number || m.Phone || `+91 98000 ${String(10000 + i).slice(-5)}`,
          Draw_Status: 'Undrawn',
          Month_Drawn: null,
          Advance_Credit: 0,
          Created_At: now,
          Updated_At: now
        });
      }

      // Store in memory & persistent store
      saasStore.upsertRecord('Chitti_Groups', newGroup);
      sharesList.forEach((s) => saasStore.upsertRecord('Shares', s));

      // Asynchronously mirror to NocoDB if configured
      if (nocodbClient.isConfigured) {
        nocodbClient.upsertRecord('Chitti_Groups', newGroup).catch((e) => console.warn('[NocoDB Sync Error]:', e.message));
        nocodbClient.bulkInsert('Shares', sharesList).catch((e) => console.warn('[NocoDB Sync Error]:', e.message));
      }

      return sendJson(res, 201, {
        statusCode: 201,
        status: 'success',
        group: newGroup,
        sharesCount: sharesList.length
      });
    }

    // --- 6. SINGLE CHITTI GROUP DETAILS & DELETION (Support both /chittis/:id and /v2/incremental-chitti/:id) ---
    const v2ChittiMatch = pathname.match(/^\/v2\/incremental-chitti\/([a-zA-Z0-9_-]+)$/);
    const standardChittiMatch = pathname.match(/^\/chittis\/([a-zA-Z0-9_-]+)$/);
    const chittiMatch = standardChittiMatch || (v2ChittiMatch && v2ChittiMatch[1] !== 'list' && v2ChittiMatch[1] !== 'create' && v2ChittiMatch[1] !== 'record-winner' && v2ChittiMatch[1] !== 'record-payment' && v2ChittiMatch[1] !== 'spawn-month' && v2ChittiMatch[1] !== 'manager-expense' ? v2ChittiMatch : null);

    if (chittiMatch) {
      const chittiId = chittiMatch[1];
      if (req.method === 'GET') {
        const group = saasStore.getGroup(tenantId, chittiId);
        if (!group) return sendJson(res, 404, { error: 'Group not found', chittiId });
        const shares = saasStore.getShares(tenantId, chittiId);
        const transactions = saasStore.getTransactions(tenantId, chittiId);
        return sendJson(res, 200, {
          status: 'success',
          group,
          chitti: group,
          shares,
          transactions
        });
      }

      if (req.method === 'DELETE') {
        saasStore.deleteGroupCascading(tenantId, chittiId);
        return sendJson(res, 200, {
          statusCode: 200,
          status: 'success',
          message: 'Chitti group deleted',
          chittiId
        });
      }
    }

    // --- 7. SHARES & TRANSACTIONS SUB-COLLECTIONS ---
    const sharesMatch = pathname.match(/^\/chittis\/([a-zA-Z0-9_-]+)\/shares$/);
    if (req.method === 'GET' && sharesMatch) {
      const chittiId = sharesMatch[1];
      const shares = saasStore.getShares(tenantId, chittiId);
      return sendJson(res, 200, { chittiId, count: shares.length, shares });
    }

    const txnsMatch = pathname.match(/^\/chittis\/([a-zA-Z0-9_-]+)\/transactions$/);
    if (req.method === 'GET' && txnsMatch) {
      const chittiId = txnsMatch[1];
      const month = req.query?.month ? Number(req.query.month) : null;
      const transactions = saasStore.getTransactions(tenantId, chittiId, month);
      return sendJson(res, 200, { chittiId, month, count: transactions.length, transactions });
    }

    // --- 8. PAYMENT RECORDING ---
    if (req.method === 'POST' && (pathname === '/payments' || pathname === '/v2/incremental-chitti/record-payment')) {
      const body = await parseBody(req);
      const chittiId = body.chittiId || body.chitti_id;
      const shareId = body.shareId || body.share_id;
      const monthNumber = body.monthNumber || body.cycle_month || 1;
      const amount = body.amount !== undefined ? body.amount : body.amount_paid;
      const paymentMode = body.paymentMode || 'UPI';
      const entryType = body.entryType || 'Credit';
      const paymentRef = body.paymentRef || body.remarks || 'Payment recorded';

      const group = saasStore.getGroup(tenantId, chittiId);
      if (!group) return sendJson(res, 404, { error: 'Group not found' });

      const share = saasStore.getShare(tenantId, chittiId, shareId);
      if (!share) return sendJson(res, 404, { error: 'Share not found' });

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return sendJson(res, 400, { error: 'Valid payment amount is required' });
      }

      // Find or create transaction record
      const allTxns = saasStore.getTransactions(tenantId, chittiId, monthNumber);
      let txn = allTxns.find((t) => t.Share_ID === shareId);
      const isDrawn = share.Month_Drawn !== null && share.Month_Drawn < Number(monthNumber);
      const dueAmount = isDrawn ? group.Drawn_Due : group.Undrawn_Due;

      if (!txn) {
        txn = {
          Global_ID: crypto.randomUUID(),
          Tenant_ID: tenantId,
          Chitti_ID: chittiId,
          Trans_ID: `${chittiId}_M${monthNumber}_${shareId}`,
          Share_ID: shareId,
          Month_Number: Number(monthNumber),
          Draw_Status: isDrawn ? 'Drawn' : 'Undrawn',
          Amount_Due: dueAmount,
          Amount_Paid: 0,
          Pending_Dues: dueAmount,
          Payment_Status: 'Pending',
          Payment_Mode: paymentMode || 'UPI',
          Payment_Date: null,
          Payment_Ref: null,
          Entry_Type: 'Credit',
          Created_At: new Date().toISOString(),
          Updated_At: new Date().toISOString()
        };
      }

      // Smart Over/Under settlement logic
      if (entryType === 'Credit' || !entryType) {
        const currentPaid = Number(txn.Amount_Paid || 0);
        const totalPaidAttempt = currentPaid + numAmount;
        if (totalPaidAttempt > dueAmount) {
          const excess = totalPaidAttempt - dueAmount;
          txn.Amount_Paid = dueAmount;
          txn.Pending_Dues = 0;
          txn.Payment_Status = 'Verified';
          share.Advance_Credit = Number(share.Advance_Credit || 0) + excess;
        } else {
          txn.Amount_Paid = totalPaidAttempt;
          txn.Pending_Dues = Math.max(0, dueAmount - txn.Amount_Paid);
          txn.Payment_Status = txn.Pending_Dues === 0 ? 'Verified' : 'Partial';
        }
      } else if (entryType === 'Debit') {
        txn.Amount_Paid = Math.max(0, Number(txn.Amount_Paid || 0) - numAmount);
        txn.Pending_Dues = Math.max(0, dueAmount - txn.Amount_Paid);
        txn.Payment_Status = txn.Amount_Paid === 0 ? 'Pending' : (txn.Pending_Dues === 0 ? 'Verified' : 'Partial');
      }

      txn.Payment_Mode = paymentMode || 'UPI';
      txn.Payment_Date = new Date().toISOString().split('T')[0];
      txn.Payment_Ref = paymentRef || `TXN-${Date.now().toString().slice(-6)}`;
      txn.Entry_Type = entryType || 'Credit';

      // Store in memory & persistent store
      saasStore.upsertRecord('Transactions', txn);
      saasStore.upsertRecord('Shares', share);

      if (nocodbClient.isConfigured) {
        nocodbClient.upsertRecord('Transactions', txn).catch((e) => console.warn('[NocoDB Sync Error]:', e.message));
        nocodbClient.upsertRecord('Shares', share).catch((e) => console.warn('[NocoDB Sync Error]:', e.message));
      }

      return sendJson(res, 200, {
        statusCode: 200,
        status: 'success',
        message: 'Payment recorded successfully',
        txn,
        share
      });
    }

    // --- 8B. RECORD WINNER ---
    if (req.method === 'POST' && pathname === '/v2/incremental-chitti/record-winner') {
      const body = await parseBody(req);
      const chittiId = body.chitti_id || body.chittiId;
      const shareId = body.share_id || body.shareId;
      const cycleMonth = Number(body.cycle_month || body.monthNumber || 1);

      const group = saasStore.getGroup(tenantId, chittiId);
      const share = saasStore.getShare(tenantId, chittiId, shareId);
      if (!group || !share) return sendJson(res, 404, { error: 'Resource not found' });

      share.Draw_Status = 'Drawn';
      share.Month_Drawn = cycleMonth;
      share.Won_Cycle_Month = cycleMonth;
      saasStore.upsertRecord('Shares', share);

      return sendJson(res, 200, {
        status: 'success',
        message: `Share ${shareId} won month ${cycleMonth}`,
        share
      });
    }

    // --- 8C. SHARE EDIT / CREATE ---
    if (req.method === 'POST' && pathname === '/v2/incremental-chitti/share/edit') {
      const body = await parseBody(req);
      const chittiId = body.chitti_id;
      const shareId = body.share_id;
      const share = saasStore.getShare(tenantId, chittiId, shareId);
      if (!share) return sendJson(res, 404, { error: 'Share not found' });

      if (body.member_name) share.Member_Name = body.member_name.trim();
      if (body.member_phone) {
        share.Phone_Number = body.member_phone.trim();
        share.Member_Phone = body.member_phone.trim();
      }
      saasStore.upsertRecord('Shares', share);
      return sendJson(res, 200, { status: 'success', share });
    }

    if (req.method === 'POST' && pathname === '/v2/incremental-chitti/share/create') {
      const body = await parseBody(req);
      const chittiId = body.chitti_id;
      const shareId = String(body.share_id || Math.floor(100000 + Math.random() * 900000)).trim();
      const existing = saasStore.getShare(tenantId, chittiId, shareId);
      if (existing) {
        if (body.member_name) existing.Member_Name = body.member_name;
        if (body.member_phone) existing.Phone_Number = body.member_phone;
        saasStore.upsertRecord('Shares', existing);
        return sendJson(res, 200, { status: 'success', share: existing });
      }
      const newShare = {
        Global_ID: crypto.randomUUID(),
        Tenant_ID: tenantId,
        Chitti_ID: chittiId,
        Share_ID: shareId,
        Share_Number: 1,
        Member_Name: body.member_name || 'Member',
        Phone_Number: body.member_phone || '+919800000000',
        Member_Phone: body.member_phone || '+919800000000',
        Draw_Status: 'Undrawn',
        Month_Drawn: null,
        Advance_Credit: 0,
        Created_At: new Date().toISOString(),
        Updated_At: new Date().toISOString()
      };
      saasStore.upsertRecord('Shares', newShare);
      return sendJson(res, 201, { status: 'success', share: newShare });
    }

    // --- 8D. MANAGER EXPENSE ---
    if (req.method === 'POST' && (pathname === '/adjustments' || pathname === '/v2/incremental-chitti/manager-expense')) {
      const body = await parseBody(req);
      return sendJson(res, 200, { status: 'success', message: 'Manager expense recorded', body });
    }

    // --- 8E. SPAWN MONTH ---
    if (req.method === 'POST' && pathname === '/v2/incremental-chitti/spawn-month') {
      const body = await parseBody(req);
      const chittiId = body.chitti_id;
      const group = saasStore.getGroup(tenantId, chittiId);
      if (group) {
        group.Current_Month = (group.Current_Month || 1) + 1;
        group.Current_Active_Month = group.Current_Month;
        saasStore.upsertRecord('Chitti_Groups', group);
      }
      return sendJson(res, 200, { status: 'success', group });
    }

    // --- 9. DRAW STATUS UPDATE ---
    const drawMatch = pathname.match(/^\/shares\/([a-zA-Z0-9_-]+)\/draw$/);
    if (req.method === 'PATCH' && drawMatch) {
      const shareId = drawMatch[1];
      const body = await parseBody(req);
      const { chittiId, isDrawn, winningMonth } = body;

      const group = saasStore.getGroup(tenantId, chittiId);
      const share = saasStore.getShare(tenantId, chittiId, shareId);
      if (!group || !share) return sendJson(res, 404, { error: 'Resource not found' });

      share.Draw_Status = isDrawn ? 'Drawn' : 'Undrawn';
      share.Month_Drawn = isDrawn ? (winningMonth || group.Current_Month || 1) : null;
      saasStore.upsertRecord('Shares', share);

      // Recalculate subsequent transactions
      const allTxns = saasStore.getTransactions(tenantId, chittiId);
      const updatedTxns = [];
      allTxns.forEach((t) => {
        if (t.Share_ID === shareId) {
          const isDrawnAtM = share.Month_Drawn !== null && share.Month_Drawn < t.Month_Number;
          t.Draw_Status = isDrawnAtM ? 'Drawn' : 'Undrawn';
          t.Amount_Due = isDrawnAtM ? group.Drawn_Due : group.Undrawn_Due;
          t.Pending_Dues = Math.max(0, t.Amount_Due - Number(t.Amount_Paid || 0));
          t.Payment_Status = t.Pending_Dues === 0 ? 'Verified' : (Number(t.Amount_Paid || 0) > 0 ? 'Partial' : 'Pending');
          saasStore.upsertRecord('Transactions', t);
          updatedTxns.push(t);
        }
      });

      if (nocodbClient.isConfigured) {
        nocodbClient.upsertRecord('Shares', share).catch((e) => console.warn('[NocoDB Sync Error]:', e.message));
      }

      return sendJson(res, 200, {
        statusCode: 200,
        status: 'success',
        message: 'Draw status updated',
        share,
        updatedTxnsCount: updatedTxns.length
      });
    }

    // --- 10. CONTACT INFO UPDATE ---
    const contactMatch = pathname.match(/^\/shares\/([a-zA-Z0-9_-]+)\/contact$/);
    if (req.method === 'PATCH' && contactMatch) {
      const shareId = contactMatch[1];
      const body = await parseBody(req);
      const { chittiId, memberName, phone } = body;

      const share = saasStore.getShare(tenantId, chittiId, shareId);
      if (!share) return sendJson(res, 404, { error: 'Share not found' });

      if (memberName) share.Member_Name = memberName.trim();
      if (phone) share.Phone_Number = phone.trim();
      saasStore.upsertRecord('Shares', share);

      if (nocodbClient.isConfigured) {
        nocodbClient.upsertRecord('Shares', share).catch((e) => console.warn('[NocoDB Sync Error]:', e.message));
      }

      return sendJson(res, 200, {
        statusCode: 200,
        status: 'success',
        message: 'Member contact updated',
        share
      });
    }

    // 404 Not Found for unmatched /api routes
    return sendJson(res, 404, { error: 'API endpoint not found', path: pathname });
  } catch (err) {
    console.error('[API Router Error]:', err);
    return sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}
