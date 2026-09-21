// chitti_math_engine.js
// Isolated, Pure Mathematical & Domain Rules Engine for ClearFlow SaaS Chit Fund Platform.
// Detached completely from UI/UX views. Supports pluggable chitti rule templates based on
// manager selection during circle creation. Fully defensive against null/undefined params.

/**
 * Validates and normalizes chitti financial parameters with complete null-safety.
 */
export function normalizeChittiParams(params) {
  const p = params || {};
  const S = Math.max(1, Number(p.Total_Members || p.Total_Shares || 20));
  const M = Math.max(1, Number(p.Total_Months || 20));
  const C = Math.max(0, Number(p.Monthly_Commission !== undefined ? p.Monthly_Commission : 4000));
  const D_undrawn = Math.max(0, Number(p.Undrawn_Due !== undefined ? p.Undrawn_Due : 5000));
  const D_drawn = Math.max(D_undrawn, Number(p.Drawn_Due !== undefined ? p.Drawn_Due : 6000));

  return { S, M, C, D_undrawn, D_drawn };
}

/**
 * SaaS Rule Template Registry.
 * Each template implements:
 *  - calculateMonthMath(normalizedParams, month)
 */
export const CHITTI_TEMPLATES = {
  'Incremental Model V1': {
    name: 'Incremental Model V1',
    description: 'Dynamic winner payout with incremental pool as members take prize',
    calculateMonthMath(params, month) {
      const { S, M, C, D_undrawn, D_drawn } = normalizeChittiParams(params);
      const m = Math.max(1, Math.min(M, Number(month) || 1));
      const n_drawn = m - 1;
      const n_undrawn = S - (m - 1);
      const gross_pool = (n_undrawn * D_undrawn) + (n_drawn * D_drawn);
      const net_payout = Math.max(0, gross_pool - C);
      return {
        month: m,
        total_members: S,
        total_months: M,
        n_undrawn,
        d_undrawn: D_undrawn,
        n_drawn,
        d_drawn: D_drawn,
        gross_pool,
        commission: C,
        net_payout
      };
    }
  },
  'Fixed Pool Model': {
    name: 'Fixed Pool Model',
    description: 'Fixed monthly pool and fixed winner prize with constant installment',
    calculateMonthMath(params, month) {
      const { S, M, C, D_undrawn } = normalizeChittiParams(params);
      const m = Math.max(1, Math.min(M, Number(month) || 1));
      const n_drawn = m - 1;
      const n_undrawn = S - (m - 1);
      const gross_pool = S * D_undrawn;
      const net_payout = Math.max(0, gross_pool - C);
      return {
        month: m,
        total_members: S,
        total_months: M,
        n_undrawn,
        d_undrawn: D_undrawn,
        n_drawn,
        d_drawn: D_undrawn,
        gross_pool,
        commission: C,
        net_payout
      };
    }
  },
  'Standard Auction Model': {
    name: 'Standard Auction Model',
    description: 'Reverse auction model with bid discounts distributed as member dividends',
    calculateMonthMath(params, month) {
      const { S, M, C, D_undrawn, D_drawn } = normalizeChittiParams(params);
      const m = Math.max(1, Math.min(M, Number(month) || 1));
      const n_drawn = m - 1;
      const n_undrawn = S - (m - 1);
      const gross_pool = (n_undrawn * D_undrawn) + (n_drawn * D_drawn);
      const net_payout = Math.max(0, gross_pool - C);
      return {
        month: m,
        total_members: S,
        total_months: M,
        n_undrawn,
        d_undrawn: D_undrawn,
        n_drawn,
        d_drawn: D_drawn,
        gross_pool,
        commission: C,
        net_payout
      };
    }
  }
};

/**
 * Retrieves the specific rule template strategy.
 */
export function getChittiTemplate(templateName) {
  return CHITTI_TEMPLATES[templateName] || CHITTI_TEMPLATES['Incremental Model V1'];
}

/**
 * Calculates dynamic financial metrics for a specific cycle month m based on the circle's template.
 * 
 * @param {Object} params - Circle parameters (including optional Rule_Template)
 * @param {number} month - Cycle month number (1 <= month <= M)
 */
export function calculateMonthMath(params, month = 1) {
  const p = params || {};
  const norm = normalizeChittiParams(p);
  const templateName = p?.Rule_Template || 'Incremental Model V1';
  const template = getChittiTemplate(templateName);
  return template.calculateMonthMath(norm, month);
}

/**
 * Generates the full dynamic financial matrix for all M months of the chit circle.
 * 
 * @param {Object} params - Circle parameters
 * @returns {Array<Object>} Array of monthly calculations for month 1..M
 */
export function generateFinancialMatrix(params) {
  const p = params || {};
  const { M } = normalizeChittiParams(p);
  const matrix = [];
  for (let m = 1; m <= M; m++) {
    matrix.push(calculateMonthMath(p, m));
  }
  return matrix;
}

/**
 * Merges raw shares with transactions and computes dues according to chitti rule template.
 * Decoupled from any Vue template rendering. Completely null-safe.
 */
export function calculateMergedShares(options = {}) {
  const opts = options || {};
  const chitti = opts.chitti || {};
  const month = Number(opts.month || 1);
  const shares = Array.isArray(opts.shares) ? opts.shares : [];
  const transactions = Array.isArray(opts.transactions) ? opts.transactions : [];

  const { D_undrawn, D_drawn } = normalizeChittiParams(chitti);

  return shares.map((share) => {
    if (!share) return null;
    const txn = transactions.find((t) => t && t.Share_ID === share.Share_ID) || null;
    const isDrawn = share.Draw_Status === 'Drawn';
    const due = txn?.Amount_Due !== undefined
      ? Number(txn.Amount_Due)
      : (isDrawn ? D_drawn : D_undrawn);
    const paid = Number(txn?.Amount_Paid || 0);
    const pending = txn?.Pending_Dues !== undefined
      ? Number(txn.Pending_Dues)
      : Math.max(0, due - paid);
    const isPaid = txn?.Payment_Status === 'Paid' || txn?.Payment_Status === 'Verified' || (paid >= due && due > 0);
    const isPartial = !isPaid && paid > 0;

    return {
      share,
      transaction: txn,
      due,
      paid,
      pending,
      isPaid,
      isPartial,
      advanceCredit: Number(share.Advance_Credit || 0)
    };
  }).filter(Boolean);
}

/**
 * Pure calculation of Month Card summary metrics, isolated from UI/UX views.
 * Completely null-safe.
 */
export function calculateMonthCardSummary(options = {}) {
  const opts = options || {};
  const chitti = opts.chitti || {};
  const summaryMonth = Number(opts.summaryMonth || 1);
  const activeCycleMonth = Number(opts.activeCycleMonth || 1);
  const shares = Array.isArray(opts.shares) ? opts.shares : [];
  const transactions = Array.isArray(opts.transactions) ? opts.transactions : [];

  const monthMetrics = calculateMonthMath(chitti, summaryMonth);
  const m = summaryMonth;
  const activeM = activeCycleMonth;
  const grossTarget = monthMetrics.gross_pool;
  const drawAmt = monthMetrics.net_payout;
  const totalSharesCount = shares.length || normalizeChittiParams(chitti).S;

  if (m === activeM) {
    // Current live active cycle: calculate actual collections from active transactions
    const merged = calculateMergedShares({ chitti, month: activeM, shares, transactions });
    const totalCollected = merged.reduce((acc, i) => acc + (i?.paid || 0), 0);
    const totalPending = merged.reduce((acc, i) => acc + (i?.pending || 0), 0);
    const paidCount = merged.filter((i) => i?.isPaid).length;
    const pendingCount = merged.filter((i) => !i?.isPaid).length;

    return {
      month: m,
      totalCollected,
      totalPending,
      paidCount,
      pendingCount,
      drawAmount: drawAmt,
      grossTarget,
      metrics: monthMetrics
    };
  } else if (m < activeM) {
    // Past completed cycle: fully collected
    return {
      month: m,
      totalCollected: grossTarget,
      totalPending: 0,
      paidCount: totalSharesCount,
      pendingCount: 0,
      drawAmount: drawAmt,
      grossTarget,
      metrics: monthMetrics
    };
  } else {
    // Future cycle: uncollected
    return {
      month: m,
      totalCollected: 0,
      totalPending: grossTarget,
      paidCount: 0,
      pendingCount: totalSharesCount,
      drawAmount: drawAmt,
      grossTarget,
      metrics: monthMetrics
    };
  }
}

/**
 * Computes pocket cash metrics for the active cycle month.
 * Completely null-safe.
 * 
 * @param {Object} options
 * @param {Object} options.chitti - Circle parameters
 * @param {number} options.month - Active month number
 * @param {Array} options.transactions - Month m transactions
 * @param {Array} options.shares - All shares of the group
 */
export function calculatePocketCash(options = {}) {
  const opts = options || {};
  const chitti = opts.chitti || {};
  const month = Number(opts.month || 1);
  const transactions = Array.isArray(opts.transactions) ? opts.transactions : [];
  const shares = Array.isArray(opts.shares) ? opts.shares : [];

  const monthMath = calculateMonthMath(chitti, month);

  // Total collected strictly for this month's installment
  const totalCollectedThisMonth = transactions.reduce((acc, t) => acc + Number(t?.Amount_Paid || 0), 0);

  // Expected collection according to dynamic math
  const expectedPool = monthMath.gross_pool;

  // Pending balance for this month
  const pendingCollection = Math.max(0, expectedPool - totalCollectedThisMonth);

  // Total advance credit reserve held by manager across all shares
  const totalAdvanceReserve = shares.reduce((acc, s) => acc + Number(s?.Advance_Credit || 0), 0);

  // Cash without Advances: actual inflows minus winner payout minus manager commission
  const cashWithoutAdvances = totalCollectedThisMonth - monthMath.net_payout - monthMath.commission;

  // Cash with Advances: cash without advances + advance buffer
  const cashWithAdvances = cashWithoutAdvances + totalAdvanceReserve;

  // Counts of paid, partial, pending
  let paidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  transactions.forEach((t) => {
    if (!t) return;
    if (t.Payment_Status === 'Verified' || t.Payment_Status === 'Paid') {
      paidCount++;
    } else if (t.Payment_Status === 'Partial' || Number(t.Amount_Paid || 0) > 0) {
      partialCount++;
    } else {
      pendingCount++;
    }
  });

  const collectionRate = expectedPool > 0 ? Math.round((totalCollectedThisMonth / expectedPool) * 100) : 0;

  return {
    month: monthMath.month,
    expectedPool,
    totalCollected: totalCollectedThisMonth,
    pendingCollection,
    collectionRate,
    netPayout: monthMath.net_payout,
    commission: monthMath.commission,
    nUndrawn: monthMath.n_undrawn,
    nDrawn: monthMath.n_drawn,
    dUndrawn: monthMath.d_undrawn,
    dDrawn: monthMath.d_drawn,
    paidCount,
    partialCount,
    pendingCount,
    cashWithoutAdvances,
    cashWithAdvances,
    totalAdvanceReserve,
    isSurplusWithoutAdvances: cashWithoutAdvances >= 0,
    isSurplusWithAdvances: cashWithAdvances >= 0
  };
}

/**
 * Auto-settles advance credit when spawning a new cycle or applying advance credit to a share.
 * Completely null-safe.
 * 
 * @param {Object} share - Share record with Advance_Credit
 * @param {number} amountDue - Monthly installment due
 * @returns {Object} { amountPaid, pendingDues, paymentStatus, newAdvanceCredit, deductedCredit }
 */
export function settleAdvanceCredit(share, amountDue) {
  const s = share || {};
  const currentCredit = Number(s.Advance_Credit || 0);
  const due = Number(amountDue || 0);

  if (currentCredit <= 0) {
    return {
      amountPaid: 0,
      pendingDues: due,
      paymentStatus: 'Pending',
      newAdvanceCredit: 0,
      deductedCredit: 0
    };
  }

  if (currentCredit >= due) {
    return {
      amountPaid: due,
      pendingDues: 0,
      paymentStatus: 'Verified',
      newAdvanceCredit: currentCredit - due,
      deductedCredit: due
    };
  }

  // Partial settlement from advance credit
  return {
    amountPaid: currentCredit,
    pendingDues: due - currentCredit,
    paymentStatus: 'Partial',
    newAdvanceCredit: 0,
    deductedCredit: currentCredit
  };
}

/**
 * Pure calculation of up-to-date Share Statement data snippet.
 * Completely detached from UI/UX and preloaded as a plain JSON structure
 * for ultra-fast, zero-overhead 1-click rendering in StatementModal.
 */
export function calculateShareStatementData(options = {}) {
  const opts = options || {};
  const chitti = opts.chitti || {};
  const share = opts.share || null;
  const rawTxns = Array.isArray(opts.statement) ? opts.statement : [];
  const currentMonth = Number(opts.currentMonth || chitti?.Current_Month || 1);

  if (!share) return null;

  const totalDue = rawTxns.reduce((acc, t) => acc + Number(t?.Amount_Due || 0), 0);
  const totalPaid = rawTxns.reduce((acc, t) => acc + Number(t?.Amount_Paid || 0), 0);
  const outstandingBalance = Math.max(0, totalDue - totalPaid);
  const advanceCredit = Number(share.Advance_Credit || 0);

  const records = rawTxns.map((t) => {
    const due = Number(t?.Amount_Due || 0);
    const paid = Number(t?.Amount_Paid || 0);
    const pending = t?.Pending_Dues !== undefined ? Number(t.Pending_Dues) : Math.max(0, due - paid);
    const isPaid = t?.Payment_Status === 'Paid' || t?.Payment_Status === 'Verified' || (paid >= due && due > 0);
    const isPartial = !isPaid && paid > 0;
    const status = isPaid ? 'Paid' : (isPartial ? 'Partial' : 'Pending');

    return {
      monthNumber: t.Month_Number,
      date: t.Transaction_Date ? t.Transaction_Date.split('T')[0] : `M${t.Month_Number} Cycle`,
      amountDue: due,
      amountPaid: paid,
      pendingDues: pending,
      paymentStatus: status,
      paymentMode: t.Payment_Mode || 'Cash',
      referenceId: t.Reference_ID || '—'
    };
  });

  return {
    shareId: share.Share_ID,
    shareNumber: share.Share_Number,
    memberName: share.Member_Name,
    phone: share.Phone || share.Phone_Number || '—',
    drawStatus: share.Draw_Status,
    monthDrawn: share.Month_Drawn,
    advanceCredit,
    currentMonth,
    chittiId: chitti?.Chitti_ID || '',
    chittiName: chitti?.Chitti_Name || '',
    cycleAnchorDay: chitti?.Cycle_Anchor_Day || '10th',
    totalDue,
    totalPaid,
    outstandingBalance,
    records,
    summaryText: `📄 *CLEARFLOW CHITTI STATEMENT*\nMember: ${share.Member_Name} (#${share.Share_Number})\nShare ID: ${share.Share_ID}\nGroup: ${chitti?.Chitti_Name || chitti?.Chitti_ID || ''}\nDraw Status: ${share.Draw_Status}\n\n• Total Due: ₹${totalDue.toLocaleString('en-IN')}\n• Total Paid: ₹${totalPaid.toLocaleString('en-IN')}\n• Pending Dues: ₹${outstandingBalance.toLocaleString('en-IN')}\n• Advance Credit: ₹${advanceCredit.toLocaleString('en-IN')}\n\nCycle Month: M${currentMonth}`
  };
}

/**
 * Pure calculation of up-to-date Month Statement data snippet.
 * Completely detached from UI/UX and preloaded as a plain JSON structure
 * for ultra-fast, zero-overhead 1-click rendering in MonthStatementModal.
 */
export function calculateMonthStatementData(options = {}) {
  const opts = options || {};
  const chitti = opts.chitti || {};
  const month = Number(opts.month || 1);
  const shares = Array.isArray(opts.shares) ? opts.shares : [];
  const transactions = Array.isArray(opts.transactions) ? opts.transactions : [];

  const monthMetrics = calculateMonthMath(chitti, month);
  const mergedShares = calculateMergedShares({ chitti, month, shares, transactions });

  const expectedPool = monthMetrics.gross_pool;
  const totalCollected = mergedShares.reduce((acc, i) => acc + (i?.paid || 0), 0);
  const netDrawAmount = monthMetrics.net_payout;
  const paidCount = mergedShares.filter((i) => i?.isPaid).length;
  const pendingCount = mergedShares.filter((i) => !i?.isPaid).length;

  const startYear = 2026;
  const totalOffset = month - 1;
  const year = startYear + Math.floor(totalOffset / 12);
  const mIdx = ((totalOffset % 12) + 12) % 12;
  const d = new Date(year, mIdx, 1);
  const monthYearStr = `${d.toLocaleString('en-US', { month: 'short' })} ${year}`;

  const rows = mergedShares.map((i) => ({
    shareId: i.share.Share_ID,
    shareNumber: i.share.Share_Number,
    memberName: i.share.Member_Name,
    drawStatus: i.share.Draw_Status,
    due: i.due,
    paid: i.paid,
    pending: i.pending,
    isPaid: i.isPaid,
    advanceCredit: Number(i.share.Advance_Credit || 0)
  }));

  return {
    chittiId: chitti?.Chitti_ID || '',
    chittiName: chitti?.Chitti_Name || '',
    month,
    monthYearStr,
    cycleAnchorDay: chitti?.Cycle_Anchor_Day || '10th to 10th',
    expectedPool,
    totalCollected,
    netDrawAmount,
    paidCount,
    pendingCount,
    totalShares: rows.length,
    rows,
    summaryText: `📄 *CLEARFLOW MONTH ${month} STATEMENT*\nGroup: ${chitti?.Chitti_Name} (${chitti?.Chitti_ID})\n\n• Target Pool: ₹${expectedPool.toLocaleString('en-IN')}\n• Total Collected: ₹${totalCollected.toLocaleString('en-IN')}\n• This Month Draw Amount: ₹${netDrawAmount.toLocaleString('en-IN')}\n• Paid: ${paidCount} / ${rows.length}\n• Pending: ${pendingCount}`
  };
}

/**
 * Pure calculation of Manager Personal Ledger.
 * Detached completely from UI/UX and preloaded as a plain JSON structure.
 * Provides the manager with their complete financial ledger:
 *  - Monthly Commission details (rate, total earned across months, collected vs pending)
 *  - Manager's own share details (e.g. Share S01 / Foreman Share dues, paid installments, advance balance)
 *  - Net Cash in Hand / Pocket Ledger (total member collections received, prize payouts disbursed, commission retained, net balance)
 */
export function calculateManagerPersonalLedger(options = {}) {
  const opts = options || {};
  const chitti = opts.chitti || {};
  const activeMonth = Number(opts.activeMonth || chitti?.Current_Month || 1);
  const totalMonths = Number(chitti?.Total_Months || 20);
  const shares = Array.isArray(opts.shares) ? opts.shares : [];
  const transactions = Array.isArray(opts.transactions) ? opts.transactions : [];

  const { C, D_undrawn, D_drawn } = normalizeChittiParams(chitti);

  // 1. Commission Ledger
  const monthlyCommission = C;
  const totalCommissionEarnedToDate = activeMonth * monthlyCommission;
  const totalCommissionContract = totalMonths * monthlyCommission;
  const remainingCommission = Math.max(0, totalCommissionContract - totalCommissionEarnedToDate);

  // 2. Manager's Personal Share (Foreman Share, conventionally Share #01 or designated manager share)
  const managerShare = shares.find((s) => s && (s.Share_Number === 1 || s.Share_ID === 'S01' || (s.Member_Name && s.Member_Name.toLowerCase().includes('foreman')))) || shares[0] || null;
  const managerTxn = managerShare ? (transactions.find((t) => t && t.Share_ID === managerShare.Share_ID) || null) : null;

  const managerDue = managerTxn?.Amount_Due !== undefined
    ? Number(managerTxn.Amount_Due)
    : (managerShare?.Draw_Status === 'Drawn' ? D_drawn : D_undrawn);
  const managerPaid = Number(managerTxn?.Amount_Paid || 0);
  const managerPending = managerTxn?.Pending_Dues !== undefined
    ? Number(managerTxn.Pending_Dues)
    : Math.max(0, managerDue - managerPaid);
  const managerAdvance = Number(managerShare?.Advance_Credit || 0);
  const managerShareStatus = managerPaid >= managerDue && managerDue > 0 ? 'Paid' : (managerPaid > 0 ? 'Partial' : 'Pending');

  // 3. Cash-in-hand / Pocket Ledger for Month & Cumulative
  const merged = calculateMergedShares({ chitti, month: activeMonth, shares, transactions });
  const monthCollected = merged.reduce((acc, i) => acc + (i?.paid || 0), 0);
  const monthMath = calculateMonthMath(chitti, activeMonth);
  const monthTarget = monthMath.gross_pool;
  const monthDrawPayout = monthMath.net_payout;
  const totalAdvancesHeld = shares.reduce((acc, s) => acc + Number(s?.Advance_Credit || 0), 0);

  // Cash in hand for current cycle = collections - prize payout - manager commission
  const netCycleCash = monthCollected - monthDrawPayout - monthlyCommission;
  const netPocketBalance = (monthCollected + totalAdvancesHeld) - monthDrawPayout - monthlyCommission;

  return {
    chittiId: chitti?.Chitti_ID || '',
    chittiName: chitti?.Chitti_Name || '',
    activeMonth,
    totalMonths,
    commission: {
      monthlyRate: monthlyCommission,
      earnedToDate: totalCommissionEarnedToDate,
      totalContract: totalCommissionContract,
      remaining: remainingCommission,
      status: 'Retained from Monthly Pool'
    },
    managerShare: managerShare ? {
      shareId: managerShare.Share_ID,
      shareNumber: managerShare.Share_Number,
      memberName: managerShare.Member_Name,
      drawStatus: managerShare.Draw_Status,
      monthDrawn: managerShare.Month_Drawn,
      due: managerDue,
      paid: managerPaid,
      pending: managerPending,
      advance: managerAdvance,
      status: managerShareStatus
    } : null,
    pocketLedger: {
      monthTarget,
      monthCollected,
      monthDrawPayout,
      totalAdvancesHeld,
      netCycleCash,
      netPocketBalance,
      isSurplus: netPocketBalance >= 0
    }
  };
}
