import { ref, computed, reactive } from 'vue';
import axios from 'axios';
import {
  calculateMonthMath,
  calculatePocketCash,
  generateFinancialMatrix,
  settleAdvanceCredit,
  normalizeChittiParams
} from './chitti_math_engine';

const STORAGE_SHARES_KEY = 'clearflow_shares_store_v2';
const STORAGE_TXNS_KEY = 'clearflow_txns_store_v2';

const sharesMap = ref({});
const transactionsMap = ref({});

const initStores = () => {
  try {
    const savedShares = localStorage.getItem(STORAGE_SHARES_KEY);
    if (savedShares) {
      sharesMap.value = JSON.parse(savedShares);
    }
    const savedTxns = localStorage.getItem(STORAGE_TXNS_KEY);
    if (savedTxns) {
      transactionsMap.value = JSON.parse(savedTxns);
    }
  } catch (e) {
    console.warn('Failed to parse store data:', e);
  }
};

initStores();

const saveStores = () => {
  try {
    localStorage.setItem(STORAGE_SHARES_KEY, JSON.stringify(sharesMap.value));
    localStorage.setItem(STORAGE_TXNS_KEY, JSON.stringify(transactionsMap.value));
  } catch (e) {
    console.warn('Failed to save store data:', e);
  }
};

export function useApi() {
  const activeChitti = ref(null);
  const currentMonth = ref(1);
  const shares = ref([]);
  const transactions = ref([]);
  const scoreboard = ref(null);
  const poolData = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  let loadSequence = 0;

  const flushState = () => {
    activeChitti.value = null;
    shares.value = [];
    transactions.value = [];
    scoreboard.value = null;
    poolData.value = null;
    error.value = null;
  };

  const getTenantHeaders = () => {
    let authUser = {};
    try {
      authUser = JSON.parse(localStorage.getItem('clearflow_auth_user') || '{}');
    } catch (e) {}
    const mgrEmail = authUser.email || authUser.manager_id || '';
    const tid = localStorage.getItem('clearflow_tenant_id') || (mgrEmail ? `TNT-${mgrEmail}` : '');
    return {
      'x-tenant-id': tid,
      'x-manager-id': mgrEmail,
      'x-manager-email': mgrEmail
    };
  };

  /**
   * Spawns transaction rows for a specific cycle month on demand,
   * applying automatic advance credit settlement.
   */
  const spawnMonthCycleIfNeeded = (chitti, month) => {
    if (!chitti) return;
    const cid = chitti.Chitti_ID;
    const allTxns = transactionsMap.value[cid] || [];
    const existingMonthTxns = allTxns.filter((t) => t.Month_Number === month);

    if (existingMonthTxns.length > 0) {
      return; // Already spawned
    }

    const currentShares = sharesMap.value[cid] || [];
    if (currentShares.length === 0) return;

    const newTxns = [];

    currentShares.forEach((share) => {
      const isDrawnAtMonth = share.Month_Drawn !== null && share.Month_Drawn < month;
      const amountDue = isDrawnAtMonth ? Number(chitti.Drawn_Due) : Number(chitti.Undrawn_Due);

      // Check advance credit settlement engine
      const settlement = settleAdvanceCredit(share, amountDue);

      if (settlement.deductedCredit > 0) {
        share.Advance_Credit = settlement.newAdvanceCredit;
      }

      newTxns.push({
        Trans_ID: `${cid}_M${month}_${share.Share_ID}`,
        Share_ID: share.Share_ID,
        Chitti_ID: cid,
        Month_Number: month,
        Draw_Status: isDrawnAtMonth ? 'Drawn' : 'Undrawn',
        Amount_Due: amountDue,
        Amount_Paid: settlement.amountPaid,
        Pending_Dues: settlement.pendingDues,
        Payment_Status: settlement.paymentStatus,
        Payment_Mode: settlement.deductedCredit > 0 ? 'Advance Credit' : 'UPI',
        Payment_Date: settlement.deductedCredit > 0 ? new Date().toISOString().split('T')[0] : null,
        Payment_Ref: settlement.deductedCredit > 0 ? `ADV-SETTLE-M${month}` : null,
        Entry_Type: 'Credit'
      });
    });

    transactionsMap.value[cid] = [...allTxns, ...newTxns];
    saveStores();
  };

  /**
   * Initializes shares store for chitti group
   */
  const ensureChittiData = (chitti) => {
    if (!chitti) return;
    const cid = chitti.Chitti_ID;

    if (!sharesMap.value[cid]) {
      sharesMap.value[cid] = [];
    }

    if (!transactionsMap.value[cid]) {
      transactionsMap.value[cid] = [];
    }
  };

  /**
   * Loads group details and synchronizes current month feed from Backend API
   * Immediately flushes previous state before fetching to ensure strict group isolation.
   */
  const loadGroupDetails = async (chittiOrId, month = null) => {
    if (!chittiOrId) return;
    const cid = typeof chittiOrId === 'string' ? chittiOrId : chittiOrId.Chitti_ID;
    if (!cid) return;

    const sequence = ++loadSequence;
    flushState();
    isLoading.value = true;
    error.value = null;

    if (typeof chittiOrId === 'object') {
      activeChitti.value = chittiOrId;
      currentMonth.value = month !== null ? Number(month) : Number(chittiOrId.Current_Month || 1);
    }

    try {
      let authUser = {};
      try {
        authUser = JSON.parse(localStorage.getItem('clearflow_auth_user') || '{}');
      } catch (e) {}
      const mgrEmail = authUser.email || authUser.manager_id || activeChitti.value?.Manager_ID || '';

      const resp = await axios.get(`/api/v2/incremental-chitti/${cid}`, {
        headers: getTenantHeaders(),
        params: mgrEmail ? { manager_id: mgrEmail } : {},
        timeout: 8000
      });

      if (sequence !== loadSequence) return;

      if (resp.data?.chitti) {
        activeChitti.value = resp.data.chitti;
        currentMonth.value = month !== null ? Number(month) : Number(resp.data.chitti.Current_Active_Month || resp.data.chitti.Current_Month || 1);
      }

      if (resp.data?.scoreboard) {
        scoreboard.value = resp.data.scoreboard;
      }

      if (resp.data?.pool) {
        poolData.value = resp.data.pool;
      }

      if (resp.data?.shares) {
        const normalizedShares = resp.data.shares.map((s, idx) => ({
          ...s,
          Share_Number: s.Share_Number || (idx + 1),
          Member_Phone: s.Member_Phone || s.Phone_Number || s.Phone || '',
          Phone: s.Member_Phone || s.Phone_Number || s.Phone || '',
          Phone_Number: s.Member_Phone || s.Phone_Number || s.Phone || '',
          Won_Cycle_Month: s.Won_Cycle_Month ?? s.Month_Drawn ?? null,
          Month_Drawn: s.Won_Cycle_Month ?? s.Month_Drawn ?? null,
          Advance_Credit: Number(s.Advance_Credit || 0),
          Total_Pending_Arrears: Number(s.Total_Pending_Arrears || 0)
        }));
        sharesMap.value[cid] = normalizedShares;
        shares.value = normalizedShares;
      } else {
        shares.value = sharesMap.value[cid] || [];
      }

      if (resp.data?.transactions) {
        const remoteTxns = resp.data.transactions.map((rt) => {
          const mNum = rt.Cycle_Month || rt.Month_Number;
          return {
            ...rt,
            Month_Number: mNum,
            Cycle_Month: mNum,
            Amount_Paid: Number(rt.Credit_Amount ?? rt.Amount_Paid ?? 0),
            Pending_Dues: Number(rt.Debit_Amount ?? rt.Pending_Dues ?? 0)
          };
        });
        transactionsMap.value[cid] = remoteTxns;
        transactions.value = remoteTxns.filter((t) => t.Month_Number === currentMonth.value);
      } else {
        const allTxns = transactionsMap.value[cid] || [];
        transactions.value = allTxns.filter((t) => t.Month_Number === currentMonth.value);
      }

      saveStores();

      if (activeChitti.value) {
        spawnMonthCycleIfNeeded(activeChitti.value, currentMonth.value);
        const allTxns = transactionsMap.value[cid] || [];
        transactions.value = allTxns.filter((t) => t.Month_Number === currentMonth.value);
      }
    } catch (apiErr) {
      console.warn('[API] loadGroupDetails backend fetch error:', apiErr.message);
      if (sequence === loadSequence) {
        if (!activeChitti.value && typeof chittiOrId === 'object') {
          activeChitti.value = chittiOrId;
          shares.value = sharesMap.value[cid] || [];
          const allTxns = transactionsMap.value[cid] || [];
          transactions.value = allTxns.filter((t) => t.Month_Number === currentMonth.value);
        } else if (!activeChitti.value) {
          error.value = apiErr.message || 'Failed to load group data';
        }
      }
    } finally {
      if (sequence === loadSequence) {
        isLoading.value = false;
      }
    }
  };


  /**
   * Dynamic Month Metrics powered by isolated math engine
   */
  const monthMetrics = computed(() => {
    if (!activeChitti.value) {
      return {
        expectedCollection: 0,
        totalCollected: 0,
        pendingCollection: 0,
        collectionRate: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
        drawnCount: 0,
        undrawnCount: 0,
        monthlyCommission: 0,
        netPayout: 0,
        pocketCashSurplus: 0,
        cashWithoutAdvances: 0,
        cashWithAdvances: 0,
        totalAdvanceReserve: 0,
        isSurplusWithoutAdvances: true,
        isSurplusWithAdvances: true
      };
    }

    const cid = activeChitti.value.Chitti_ID;
    const allTxns = transactionsMap.value[cid] || [];
    const monthTxns = allTxns.filter((t) => t.Month_Number === currentMonth.value);
    const currentShares = sharesMap.value[cid] || [];

    const pocketData = calculatePocketCash({
      chitti: activeChitti.value,
      month: currentMonth.value,
      transactions: monthTxns,
      shares: currentShares
    });

    return {
      expectedCollection: pocketData.expectedPool,
      totalCollected: pocketData.totalCollected,
      pendingCollection: pocketData.pendingCollection,
      collectionRate: pocketData.collectionRate,
      paidCount: pocketData.paidCount,
      partialCount: pocketData.partialCount,
      pendingCount: pocketData.pendingCount,
      drawnCount: pocketData.nDrawn,
      undrawnCount: pocketData.nUndrawn,
      monthlyCommission: pocketData.commission,
      netPayout: pocketData.netPayout,
      pocketCashSurplus: pocketData.cashWithoutAdvances,
      cashWithoutAdvances: pocketData.cashWithoutAdvances,
      cashWithAdvances: pocketData.cashWithAdvances,
      totalAdvanceReserve: pocketData.totalAdvanceReserve,
      isSurplusWithoutAdvances: pocketData.isSurplusWithoutAdvances,
      isSurplusWithAdvances: pocketData.isSurplusWithAdvances
    };
  });

  /**
   * Dynamic Master 20-Month Financial Matrix
   */
  const masterMatrix = computed(() => {
    if (!activeChitti.value) return [];
    return generateFinancialMatrix(activeChitti.value);
  });

  /**
   * Portfolio-wide metrics across all historical months for active chitti
   */
  const portfolioSummary = computed(() => {
    if (!activeChitti.value) {
      return {
        totalPendingDues: 0,
        totalAdvanceReserve: 0,
        totalEarnedCommission: 0,
        cyclesCompleted: 0
      };
    }

    const cid = activeChitti.value.Chitti_ID;
    const allTxns = transactionsMap.value[cid] || [];
    const currentShares = sharesMap.value[cid] || [];

    const totalPendingDues = allTxns.reduce((sum, t) => sum + Number(t.Pending_Dues || 0), 0);
    const totalAdvanceReserve = currentShares.reduce((sum, s) => sum + Number(s.Advance_Credit || 0), 0);
    const commission = Number(activeChitti.value.Monthly_Commission || 4000);
    const totalEarnedCommission = currentMonth.value * commission;

    return {
      totalPendingDues,
      totalAdvanceReserve,
      totalEarnedCommission,
      cyclesCompleted: currentMonth.value
    };
  });

  /**
   * Determine exact share installment due for a specific month
   */
  const determineShareDue = (share, monthNumber = currentMonth.value, chitti = activeChitti.value) => {
    if (!chitti || !share) return 0;
    const isDrawn = share.Month_Drawn !== null && share.Month_Drawn < monthNumber;
    return isDrawn ? Number(chitti.Drawn_Due) : Number(chitti.Undrawn_Due);
  };

  /**
   * Inline Draw Winner Assignment with 202 Accepted Queue Buffering
   */
  const updateShareDrawStatus = async ({ shareId, isDrawn, winningMonth }) => {
    if (!activeChitti.value) return;
    const cid = activeChitti.value.Chitti_ID;
    const shareList = sharesMap.value[cid];
    if (!shareList) return;

    const share = shareList.find((s) => s.Share_ID === shareId);
    if (!share) return;

    share.Draw_Status = isDrawn ? 'Drawn' : 'Undrawn';
    share.Month_Drawn = isDrawn ? (winningMonth || currentMonth.value) : null;

    // Dynamically recalculate dues for all subsequent transactions of this share
    const allTxns = transactionsMap.value[cid] || [];
    allTxns.forEach((t) => {
      if (t.Share_ID === shareId) {
        const isDrawnAtM = share.Month_Drawn !== null && share.Month_Drawn < t.Month_Number;
        t.Draw_Status = isDrawnAtM ? 'Drawn' : 'Undrawn';
        t.Amount_Due = isDrawnAtM ? Number(activeChitti.value.Drawn_Due) : Number(activeChitti.value.Undrawn_Due);
        t.Pending_Dues = Math.max(0, t.Amount_Due - Number(t.Amount_Paid || 0));
        t.Payment_Status = t.Pending_Dues === 0 ? 'Verified' : (Number(t.Amount_Paid || 0) > 0 ? 'Partial' : 'Pending');
      }
    });

    saveStores();
    loadGroupDetails(activeChitti.value, currentMonth.value);

    // Dispatch to Backend API
    try {
      if (isDrawn) {
        await axios.post(
          '/api/v2/incremental-chitti/record-winner',
          {
            chitti_id: cid,
            share_id: shareId,
            cycle_month: Number(winningMonth || currentMonth.value)
          },
          { headers: getTenantHeaders(), timeout: 4000 }
        );
      }
    } catch (err) {
      console.warn('[API] Winner record warning:', err.message);
    }
  };

  /**
   * Records a payment with Smart Over/Under settlement
   */
  const recordPayment = async ({
    shareId,
    monthNumber,
    amount,
    paymentMode = 'UPI',
    entryType = 'Credit',
    paymentRef = ''
  }) => {
    if (!activeChitti.value) return;
    const cid = activeChitti.value.Chitti_ID;
    const allTxns = transactionsMap.value[cid] || [];
    const currentShares = sharesMap.value[cid] || [];

    const share = currentShares.find((s) => s.Share_ID === shareId);
    const targetMonth = monthNumber || currentMonth.value;

    let txn = allTxns.find(
      (t) => t.Share_ID === shareId && t.Month_Number === targetMonth
    );

    if (!txn) {
      spawnMonthCycleIfNeeded(activeChitti.value, targetMonth);
      txn = (transactionsMap.value[cid] || []).find(
        (t) => t.Share_ID === shareId && t.Month_Number === targetMonth
      );
    }

    if (!txn) throw new Error('Transaction record could not be found or spawned');

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Please enter a valid positive payment amount');
    }

    const dueAmount = Number(txn.Amount_Due || 0);

    // OPTIMISTIC LOCAL APPLICATION
    if (entryType === 'Credit') {
      const currentPaid = Number(txn.Amount_Paid || 0);
      const totalPaidAttempt = currentPaid + numAmount;

      if (totalPaidAttempt > dueAmount) {
        const excess = totalPaidAttempt - dueAmount;
        txn.Amount_Paid = dueAmount;
        txn.Pending_Dues = 0;
        txn.Payment_Status = 'Verified';

        if (share) {
          share.Advance_Credit = Number(share.Advance_Credit || 0) + excess;
        }
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

    txn.Payment_Mode = paymentMode;
    txn.Payment_Date = new Date().toISOString().split('T')[0];
    txn.Payment_Ref = paymentRef || `TXN-${Date.now().toString().slice(-6)}`;
    txn.Entry_Type = entryType;

    saveStores();
    loadGroupDetails(activeChitti.value, currentMonth.value);

    // DISPATCH TO BACKEND API
    try {
      await axios.post(
        '/api/v2/incremental-chitti/record-payment',
        {
          manager_id: activeChitti.value?.Manager_ID || '840192',
          chitti_id: cid,
          share_id: shareId,
          amount_paid: numAmount,
          remarks: paymentRef || `${entryType} payment recorded for M${targetMonth}`
        },
        { headers: getTenantHeaders(), timeout: 4000 }
      );
    } catch (err) {
      console.warn('[API] Payment save warning:', err.message);
    }

    return { txn, share };
  };

  /**
   * Updates single-line member contact info
   */
  const updateMemberContact = async ({ shareId, memberName, phone }) => {
    if (!activeChitti.value) return;
    const cid = activeChitti.value.Chitti_ID;
    const shareList = sharesMap.value[cid] || [];
    const share = shareList.find((s) => s.Share_ID === shareId);
    if (!share) return;

    if (memberName) share.Member_Name = memberName.trim();
    if (phone) {
      let rawPhone = phone.trim();
      if (rawPhone && !rawPhone.startsWith('+91')) {
        rawPhone = `+91${rawPhone}`;
      }
      share.Member_Phone = rawPhone;
      share.Phone = rawPhone;
      share.Phone_Number = rawPhone;
    }

    saveStores();
    loadGroupDetails(activeChitti.value, currentMonth.value);

    // Dispatch to Backend API
    try {
      await axios.post(
        '/api/v2/incremental-chitti/share/edit',
        {
          share_id: shareId,
          chitti_id: cid,
          member_name: share.Member_Name,
          member_phone: share.Member_Phone
        },
        { headers: getTenantHeaders(), timeout: 4000 }
      );
    } catch (err) {
      console.warn('[API] Contact update warning:', err.message);
    }
  };

  /**
   * Records pool adjustment to backend /manager-expense
   */
  const recordAdjustment = async ({ chittiId, amount, entryType, monthNumber }) => {
    try {
      const transactionType = entryType === 'Credit' ? 'Expense Correction' : 'Manager Expense';
      await axios.post(
        '/api/v2/incremental-chitti/manager-expense',
        {
          manager_id: activeChitti.value?.Manager_ID || '840192',
          chitti_id: chittiId,
          transaction_type: transactionType,
          amount: Number(amount),
          remarks: `Manager Ledger Adjustment M${monthNumber}: ${entryType}`
        },
        { headers: getTenantHeaders(), timeout: 4000 }
      );
    } catch (err) {
      console.warn('[API] Adjustment save warning:', err.message);
    }
  };

  /**
   * Spawns cycle month on the backend
   */
  const spawnCycleMonth = async (chittiId) => {
    const cid = chittiId || activeChitti.value?.Chitti_ID;
    if (!cid) return;
    try {
      const res = await axios.post(
        '/api/v2/incremental-chitti/spawn-month',
        { chitti_id: cid },
        { headers: getTenantHeaders(), timeout: 4000 }
      );
      if (activeChitti.value) {
        const nextMonth = Number(activeChitti.value.Current_Active_Month || activeChitti.value.Current_Month || 1) + 1;
        activeChitti.value.Current_Active_Month = nextMonth;
        activeChitti.value.Current_Month = nextMonth;
        currentMonth.value = nextMonth;
      }
      await loadGroupDetails(activeChitti.value, currentMonth.value);
      return res.data;
    } catch (err) {
      console.warn('[API] Spawn month warning:', err.message);
    }
  };

  /**
   * Get 20-month historical statement for an individual share
   */
  const getShareStatement = (shareId) => {
    if (!activeChitti.value) return [];
    const cid = activeChitti.value.Chitti_ID;
    const allTxns = transactionsMap.value[cid] || [];
    return allTxns
      .filter((t) => t.Share_ID === shareId)
      .sort((a, b) => a.Month_Number - b.Month_Number);
  };

  return {
    activeChitti,
    currentMonth,
    shares,
    transactions,
    scoreboard,
    poolData,
    isLoading,
    error,
    monthMetrics,
    masterMatrix,
    portfolioSummary,
    syncState: ref({ isSyncing: false, activeJobsCount: 0 }),
    loadGroupDetails,
    flushState,
    determineShareDue,
    updateShareDrawStatus,
    recordPayment,
    recordAdjustment,
    spawnCycleMonth,
    updateMemberContact,
    getShareStatement,
    refreshSyncMetrics: () => {}
  };
}

