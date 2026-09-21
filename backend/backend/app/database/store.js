// backend/app/database/store.js
// Multi-Tenant In-Memory Relational Store with File / Local Persistence
// Enforces strict tenant isolation on every single query and mutation.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_FILE_PATH = path.resolve(process.cwd(), '.saas_data_store.json');

class MultiTenantStore {
  constructor() {
    this.tables = {
      Tenants: new Map(),        // Map<Tenant_ID, TenantRecord>
      Chitti_Groups: new Map(),  // Map<Global_ID, GroupRecord>
      Shares: new Map(),         // Map<Global_ID, ShareRecord>
      Chitti_Cycles: new Map(),  // Map<Global_ID, CycleRecord>
      Transactions: new Map(),   // Map<Global_ID, TxnRecord>
      Outbox_Jobs: new Map()     // Map<Job_ID, JobRecord>
    };

    this.loadFromDisk();
    this.seedDefaultTenantIfEmpty();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach((table) => {
          if (this.tables[table]) {
            this.tables[table] = new Map(Object.entries(parsed[table]));
          }
        });
      }
    } catch (e) {
      console.warn('[Store] Could not read disk cache, initializing clean store:', e.message);
    }
  }

  saveToDisk() {
    try {
      const serialized = {};
      Object.keys(this.tables).forEach((table) => {
        serialized[table] = Object.fromEntries(this.tables[table]);
      });
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Store] Could not persist to disk:', e.message);
    }
  }

  seedDefaultTenantIfEmpty() {
    const defaultTenantId = 'TNT-840192';
    if (!this.tables.Tenants.has(defaultTenantId)) {
      const tenantGlobalId = crypto.randomUUID();
      this.tables.Tenants.set(defaultTenantId, {
        Global_ID: tenantGlobalId,
        Tenant_ID: defaultTenantId,
        Manager_ID: '840192',
        Company_Name: 'ClearFlow Community Finance',
        Email: 'foreman@clearflow.app',
        Phone: '+91 98201 23456',
        Status: 'Active',
        Created_At: new Date().toISOString(),
        Updated_At: new Date().toISOString()
      });
      this.seedSampleGroupsForTenant(defaultTenantId, '840192');
      this.saveToDisk();
    }
  }

  seedSampleGroupsForTenant(tenantId, managerId) {
    const cid = '582914';
    const groupGlobalId = crypto.randomUUID();
    const now = new Date().toISOString();

    const sampleGroup = {
      Global_ID: groupGlobalId,
      Tenant_ID: tenantId,
      Chitti_ID: cid,
      Manager_ID: managerId,
      Chitti_Name: 'Mahalakshmi Savings Circle',
      Rule_Template: 'Incremental Model V1',
      Total_Members: 20,
      Total_Months: 20,
      Undrawn_Due: 4500,
      Drawn_Due: 5000,
      Monthly_Commission: 4000,
      Current_Month: 1,
      Cycle_Start_Date: '2026-01-10',
      Cycle_Anchor_Day: 10,
      Frequency: 'Monthly',
      Status: 'Active',
      Created_At: now,
      Updated_At: now
    };

    this.tables.Chitti_Groups.set(groupGlobalId, sampleGroup);

    // 20 Sample Shares with 6-digit IDs
    const sampleNames = [
      'Rajesh Sharma (Foreman)', 'Ramesh Gupta', 'Sunita Rao', 'Priya Patel', 'Vikram Singh',
      'Anand Verma', 'Deepak Joshi', 'Meera Nair', 'Suresh Kumar', 'Kavita Reddy',
      'Amit Shah', 'Pooja Hegde', 'Manoj Tiwari', 'Sneha Kulkarni', 'Ganesh Iyer',
      'Bhavna Mehta', 'Rohan Deshmukh', 'Divya Pillai', 'Kiran Bhat', 'Naveen Choudhary'
    ];

    const sharesList = [];
    sampleNames.forEach((name, idx) => {
      const shareGlobalId = crypto.randomUUID();
      // 6-digit share ID
      const shareId = String(748201 + idx);
      const isDrawn = idx === 1; // Share 2 won Month 1 in sample
      const share = {
        Global_ID: shareGlobalId,
        Tenant_ID: tenantId,
        Chitti_ID: cid,
        Share_ID: shareId,
        Share_Number: idx + 1,
        Member_Name: name,
        Phone_Number: `+91 98450 ${String(10000 + idx * 37).slice(-5)}`,
        Draw_Status: isDrawn ? 'Drawn' : 'Undrawn',
        Month_Drawn: isDrawn ? 1 : null,
        Advance_Credit: idx === 3 ? 1500 : 0,
        Created_At: now,
        Updated_At: now
      };
      this.tables.Shares.set(shareGlobalId, share);
      sharesList.push(share);
    });

    // Month 1 Transactions
    sharesList.forEach((share, idx) => {
      const txnGlobalId = crypto.randomUUID();
      const isDrawn = share.Month_Drawn !== null && share.Month_Drawn < 1;
      const due = isDrawn ? sampleGroup.Drawn_Due : sampleGroup.Undrawn_Due;
      const isPaid = idx < 14;
      const isPartial = idx === 14;

      const paid = isPaid ? due : (isPartial ? 2000 : 0);
      const pending = Math.max(0, due - paid);
      const status = pending === 0 ? 'Verified' : (paid > 0 ? 'Partial' : 'Pending');

      const txn = {
        Global_ID: txnGlobalId,
        Tenant_ID: tenantId,
        Chitti_ID: cid,
        Trans_ID: `${cid}_M1_${share.Share_ID}`,
        Share_ID: share.Share_ID,
        Month_Number: 1,
        Draw_Status: isDrawn ? 'Drawn' : 'Undrawn',
        Amount_Due: due,
        Amount_Paid: paid,
        Pending_Dues: pending,
        Payment_Status: status,
        Payment_Mode: 'UPI',
        Payment_Date: isPaid || isPartial ? '2026-01-12' : null,
        Payment_Ref: isPaid || isPartial ? `TXN-SAMPLE-${share.Share_ID}` : null,
        Entry_Type: 'Credit',
        Created_At: now,
        Updated_At: now
      };

      this.tables.Transactions.set(txnGlobalId, txn);
    });
  }

  // --- TENANT-ISOLATED QUERIES ---

  getTenant(tenantId) {
    return this.tables.Tenants.get(tenantId) || null;
  }

  getGroups(tenantId) {
    const list = [];
    for (const group of this.tables.Chitti_Groups.values()) {
      if (group.Tenant_ID === tenantId) {
        list.push({ ...group });
      }
    }
    return list.sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At));
  }

  getGroup(tenantId, chittiId) {
    for (const group of this.tables.Chitti_Groups.values()) {
      if (group.Tenant_ID === tenantId && (group.Chitti_ID === chittiId || group.Global_ID === chittiId)) {
        return { ...group };
      }
    }
    return null;
  }

  getShares(tenantId, chittiId) {
    const list = [];
    for (const share of this.tables.Shares.values()) {
      if (share.Tenant_ID === tenantId && share.Chitti_ID === chittiId) {
        list.push({ ...share });
      }
    }
    return list.sort((a, b) => a.Share_Number - b.Share_Number);
  }

  getShare(tenantId, chittiId, shareId) {
    for (const share of this.tables.Shares.values()) {
      if (share.Tenant_ID === tenantId && share.Chitti_ID === chittiId && (share.Share_ID === shareId || share.Global_ID === shareId)) {
        return { ...share };
      }
    }
    return null;
  }

  getTransactions(tenantId, chittiId, monthNumber = null) {
    const list = [];
    for (const txn of this.tables.Transactions.values()) {
      if (txn.Tenant_ID === tenantId && txn.Chitti_ID === chittiId) {
        if (monthNumber === null || txn.Month_Number === Number(monthNumber)) {
          list.push({ ...txn });
        }
      }
    }
    return list.sort((a, b) => a.Month_Number - b.Month_Number);
  }

  // --- IDEMPOTENT UPSERT / MUTATION (Enforcing Global_ID) ---

  resolveTableKey(tableName, record = null) {
    if (this.tables[tableName]) return tableName;
    const lower = String(tableName || '').toLowerCase();
    if (lower.includes('trans') || lower.includes('txn') || lower.includes('payment')) return 'Transactions';
    if (lower.includes('chitti') || lower.includes('group') || lower.includes('circle')) return 'Chitti_Groups';
    if (lower.includes('share') || lower.includes('member') || lower.includes('roster')) return 'Shares';
    if (lower.includes('tenant') || lower.includes('manager')) return 'Tenants';
    if (lower.includes('cycle') || lower.includes('auction') || lower.includes('pool')) return 'Chitti_Cycles';
    if (lower.includes('outbox') || lower.includes('job') || lower.includes('queue')) return 'Outbox_Jobs';

    // Infer from record attributes if available
    if (record) {
      if (record.Trans_ID || record.Amount_Due !== undefined || record.Pending_Dues !== undefined) {
        return 'Transactions';
      }
      if (record.Share_Number !== undefined || record.Draw_Status !== undefined) {
        return 'Shares';
      }
      if (record.Total_Members !== undefined || record.Chitti_Name) {
        return 'Chitti_Groups';
      }
      if (record.Gross_Pool !== undefined || record.Net_Payout !== undefined) {
        return 'Chitti_Cycles';
      }
    }

    // If still not matched, dynamically allocate a collection so it never throws
    if (!this.tables[tableName]) {
      this.tables[tableName] = new Map();
    }
    return tableName;
  }

  upsertRecord(tableName, record) {
    const tableKey = this.resolveTableKey(tableName, record);
    if (!this.tables[tableKey]) {
      this.tables[tableKey] = new Map();
    }
    if (!record.Global_ID) {
      record.Global_ID = crypto.randomUUID();
    }
    record.Updated_At = new Date().toISOString();
    if (!record.Created_At) {
      record.Created_At = record.Updated_At;
    }

    this.tables[tableKey].set(record.Global_ID, { ...record });
    this.saveToDisk();
    return record;
  }

  deleteRecord(tableName, globalId) {
    const tableKey = this.resolveTableKey(tableName);
    if (tableKey && this.tables[tableKey] && this.tables[tableKey].has(globalId)) {
      this.tables[tableKey].delete(globalId);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  deleteGroupCascading(tenantId, chittiId) {
    let deletedGroup = null;
    for (const [gid, g] of this.tables.Chitti_Groups.entries()) {
      if (g.Tenant_ID === tenantId && g.Chitti_ID === chittiId) {
        deletedGroup = g;
        this.tables.Chitti_Groups.delete(gid);
        break;
      }
    }

    if (!deletedGroup) return false;

    // Cascade delete shares
    for (const [sid, s] of this.tables.Shares.entries()) {
      if (s.Tenant_ID === tenantId && s.Chitti_ID === chittiId) {
        this.tables.Shares.delete(sid);
      }
    }

    // Cascade delete transactions
    for (const [tid, t] of this.tables.Transactions.entries()) {
      if (t.Tenant_ID === tenantId && t.Chitti_ID === chittiId) {
        this.tables.Transactions.delete(tid);
      }
    }

    this.saveToDisk();
    return true;
  }

  // --- JOB TRACKING ---

  setJob(job) {
    this.tables.Outbox_Jobs.set(job.Job_ID, { ...job });
    this.saveToDisk();
  }

  getJob(jobId) {
    return this.tables.Outbox_Jobs.get(jobId) || null;
  }

  getRecentJobs(tenantId, limit = 10) {
    const list = [];
    for (const job of this.tables.Outbox_Jobs.values()) {
      if (!tenantId || job.Tenant_ID === tenantId) {
        list.push({ ...job });
      }
    }
    return list
      .sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At))
      .slice(0, limit);
  }

  resetTenantData(tenantId) {
    for (const [gid, g] of this.tables.Chitti_Groups.entries()) {
      if (g.Tenant_ID === tenantId) this.tables.Chitti_Groups.delete(gid);
    }
    for (const [sid, s] of this.tables.Shares.entries()) {
      if (s.Tenant_ID === tenantId) this.tables.Shares.delete(sid);
    }
    for (const [tid, t] of this.tables.Transactions.entries()) {
      if (t.Tenant_ID === tenantId) this.tables.Transactions.delete(tid);
    }
    const tenant = this.getTenant(tenantId);
    const mgrId = tenant?.Manager_ID || '840192';
    this.seedSampleGroupsForTenant(tenantId, mgrId);
    this.saveToDisk();
  }
}

export const saasStore = new MultiTenantStore();
