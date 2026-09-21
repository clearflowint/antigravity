// app/routes/apiRouter.js
import crypto from 'crypto';
import url from 'url';
import { extractTenantContext } from '../middleware/tenantContext.js';
import { saasStore } from '../database/store.js';
import { nocodbClient } from '../database/nocodbClient.js';

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.end(JSON.stringify(data));
}

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

export async function handleApiRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '';
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

    if (req.method === 'POST' && pathname === '/sync/reset') {
      saasStore.resetTenantData(tenantId);
      return sendJson(res, 200, {
        status: 'reset_success',
        message: `Tenant ${tenantId} restored to initial sample workspace`
      });
    }

    if (req.method === 'GET' && pathname === '/tenants/current') {
      return sendJson(res, 200, context.tenant);
    }

    if (req.method === 'GET' && (pathname === '/chittis' || pathname === '/v2/incremental-chitti/list' || pathname === '/v2/incremental-chitti')) {
      const groups = saasStore.getGroups(tenantId);
      return sendJson(res, 200, {
        status: 'success',
        tenantId,
        count: groups.length,
        groups
      });
    }

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

      saasStore.upsertRecord('Chitti_Groups', newGroup);
      sharesList.forEach((s) => saasStore.upsertRecord('Shares', s));

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
      txn.Payment_Ref = paymentRef;
      txn.Updated_At = new Date().toISOString();

      saasStore.upsertRecord('Transactions', txn);
      saasStore.upsertRecord('Shares', share);

      return sendJson(res, 200, {
        status: 'success',
        transaction: txn,
        share
      });
    }

    if (req.method === 'POST' && (pathname === '/winners' || pathname === '/v2/incremental-chitti/record-winner')) {
      const body = await parseBody(req);
      const chittiId = body.chittiId || body.chitti_id;
      const shareId = body.shareId || body.share_id;
      const monthNumber = Number(body.monthNumber || body.cycle_month || 1);

      const group = saasStore.getGroup(tenantId, chittiId);
      if (!group) return sendJson(res, 404, { error: 'Group not found' });

      const share = saasStore.getShare(tenantId, chittiId, shareId);
      if (!share) return sendJson(res, 404, { error: 'Share not found' });

      share.Draw_Status = 'Drawn';
      share.Month_Drawn = monthNumber;
      share.Updated_At = new Date().toISOString();
      saasStore.upsertRecord('Shares', share);

      const cycleGlobalId = crypto.randomUUID();
      const grossPool = group.Total_Members * group.Undrawn_Due;
      const cycleRecord = {
        Global_ID: cycleGlobalId,
        Tenant_ID: tenantId,
        Chitti_ID: chittiId,
        Month_Number: monthNumber,
        Gross_Pool: grossPool,
        Monthly_Commission: group.Monthly_Commission,
        Net_Payout: grossPool - group.Monthly_Commission,
        Winner_Share_ID: shareId,
        Status: 'Reconciled',
        Reconciled_At: new Date().toISOString(),
        Created_At: new Date().toISOString()
      };
      saasStore.upsertRecord('Chitti_Cycles', cycleRecord);

      return sendJson(res, 200, {
        status: 'success',
        message: `Recorded winner ${share.Member_Name} for Month ${monthNumber}`,
        share,
        cycle: cycleRecord
      });
    }

    if (req.method === 'POST' && pathname === '/v2/incremental-chitti/spawn-month') {
      const body = await parseBody(req);
      const chittiId = body.chittiId || body.chitti_id;
      const group = saasStore.getGroup(tenantId, chittiId);
      if (!group) return sendJson(res, 404, { error: 'Group not found' });

      group.Current_Month = Number(group.Current_Month || 1) + 1;
      group.Updated_At = new Date().toISOString();
      saasStore.upsertRecord('Chitti_Groups', group);

      return sendJson(res, 200, {
        status: 'success',
        message: `Advanced to Month ${group.Current_Month}`,
        group
      });
    }

    return sendJson(res, 404, { error: 'API endpoint not found', pathname });
  } catch (err) {
    console.error('[API Error]:', err);
    return sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}
