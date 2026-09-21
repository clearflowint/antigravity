import { ref, computed } from 'vue';
import axios from 'axios';
import { generateUnique6DigitId, registerAllocatedId } from '../utils/idGenerator';

const STORAGE_KEY_MANAGER = 'clearflow_manager_user_v2';
const STORAGE_SHARES_KEY = 'clearflow_shares_store_v2';
const STORAGE_KEY_CUSTOMER_TYPE = 'clearflow_customer_type_v2';

const manager = ref(null);
const groups = ref([]);
const isLoading = ref(false);
const error = ref(null);
const customerType = ref(localStorage.getItem(STORAGE_KEY_CUSTOMER_TYPE) || 'existing');

export const getActiveManagerEmail = (explicitEmail = null) => {
  if (explicitEmail && typeof explicitEmail === 'string' && explicitEmail.includes('@')) {
    return explicitEmail.trim().toLowerCase();
  }
  if (manager.value?.Email && String(manager.value.Email).includes('@')) {
    return String(manager.value.Email).trim().toLowerCase();
  }
  if (manager.value?.email && String(manager.value.email).includes('@')) {
    return String(manager.value.email).trim().toLowerCase();
  }
  if (manager.value?.Manager_ID && String(manager.value.Manager_ID).includes('@')) {
    return String(manager.value.Manager_ID).trim().toLowerCase();
  }
  if (manager.value?.manager_id && String(manager.value.manager_id).includes('@')) {
    return String(manager.value.manager_id).trim().toLowerCase();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MANAGER) || localStorage.getItem('clearflow_auth_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      const em = parsed?.email || parsed?.Email || parsed?.manager_id || parsed?.Manager_ID;
      if (em && String(em).includes('@')) {
        return String(em).trim().toLowerCase();
      }
    }
  } catch (e) {}
  return '';
};

export const getScopedStorageKey = (email = null) => {
  const em = getActiveManagerEmail(email);
  return em ? `clearflow_groups_${em.replace(/[^a-zA-Z0-9]/g, '_')}` : 'clearflow_groups_guest';
};

const isNewCustomer = computed(() => {
  return customerType.value === 'new' || (!groups.value || groups.value.length === 0);
});

const isExistingCustomer = computed(() => {
  return !isNewCustomer.value && Boolean(groups.value && groups.value.length > 0);
});

const setCustomerType = (type) => {
  customerType.value = type;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOMER_TYPE, type);
  } catch (e) {}
};

const loadPersistedData = () => {
  try {
    // Clear any obsolete legacy un-scoped store
    localStorage.removeItem('clearflow_manager_groups_v2');

    const savedMgr = localStorage.getItem(STORAGE_KEY_MANAGER) || localStorage.getItem('clearflow_auth_user');
    if (savedMgr) {
      manager.value = JSON.parse(savedMgr);
    }
    const email = getActiveManagerEmail();
    if (email) {
      const savedGroups = localStorage.getItem(getScopedStorageKey(email));
      if (savedGroups) {
        groups.value = JSON.parse(savedGroups);
      } else {
        groups.value = [];
      }
    } else {
      // If no authenticated manager, groups must be empty (strict tenant isolation)
      groups.value = [];
    }
  } catch (e) {
    console.warn('Failed to parse localStorage data:', e);
    groups.value = [];
  }
};

loadPersistedData();

const persistGroups = (email = null) => {
  try {
    const key = getScopedStorageKey(email);
    localStorage.setItem(key, JSON.stringify(groups.value));
  } catch (e) {
    console.warn('Failed to persist groups:', e);
  }
};

export function useManagerWorkspace() {
  const getTenantHeaders = () => {
    const mgrEmail = getActiveManagerEmail();
    const tid = manager.value?.Tenant_ID || (mgrEmail ? `TNT-${mgrEmail}` : '');
    return {
      'x-tenant-id': tid,
      'x-manager-id': mgrEmail,
      'x-manager-email': mgrEmail
    };
  };

  const setManagerUser = (user) => {
    if (!user) {
      manager.value = null;
      groups.value = [];
      return;
    }
    manager.value = user;
    const email = getActiveManagerEmail(user.email || user.manager_id);
    if (email) {
      const saved = localStorage.getItem(getScopedStorageKey(email));
      if (saved) {
        try {
          groups.value = JSON.parse(saved);
        } catch (e) {
          groups.value = [];
        }
      } else {
        groups.value = [];
      }
    }
  };

  const fetchWorkspace = async (targetEmail = null) => {
    const mgrEmail = getActiveManagerEmail(targetEmail);

    // STRICT TENANT ISOLATION:
    // If no manager is active or logged in, immediately clear groups and return.
    if (!mgrEmail) {
      groups.value = [];
      setCustomerType('new');
      return;
    }

    // Keep manager object aligned
    if (!manager.value || getActiveManagerEmail() !== mgrEmail) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_MANAGER) || localStorage.getItem('clearflow_auth_user');
        if (saved) {
          manager.value = JSON.parse(saved);
        } else {
          manager.value = {
            Email: mgrEmail,
            email: mgrEmail,
            Manager_ID: mgrEmail,
            Name: mgrEmail.split('@')[0]
          };
        }
      } catch (e) {}
    }

    isLoading.value = true;
    error.value = null;

    try {
      const headers = {
        'x-tenant-id': `TNT-${mgrEmail}`,
        'x-manager-id': mgrEmail,
        'x-manager-email': mgrEmail
      };

      const chittisRes = await axios.get('/api/v2/incremental-chitti/list', {
        headers,
        params: { manager_id: mgrEmail },
        timeout: 8000
      });
      const fetchedList = chittisRes.data?.groups || (Array.isArray(chittisRes.data) ? chittisRes.data : []);

      // Only groups belonging to this manager are populated
      groups.value = fetchedList.map((g) => ({
        ...g,
        Current_Month: g.Current_Active_Month || g.Current_Month || 1,
        Current_Active_Month: g.Current_Active_Month || g.Current_Month || 1,
        Monthly_Commission: g.Commission_Amount || g.Monthly_Commission || 4000,
        Commission_Amount: g.Commission_Amount || g.Monthly_Commission || 4000,
        Rule_Template: g.Template_ID || g.Rule_Template || 'Incremental Model V1',
        Template_ID: g.Template_ID || 'INCREMENTAL_TEMPLATE_V1'
      }));

      if (groups.value.length > 0) {
        setCustomerType('existing');
      } else {
        setCustomerType('new');
      }
      persistGroups(mgrEmail);
    } catch (err) {
      console.warn('[Workspace] Backend fetch error:', err.message);
      error.value = err.message;
      // On network failure, read strictly from the manager-scoped local key
      const scopedKey = getScopedStorageKey(mgrEmail);
      const saved = localStorage.getItem(scopedKey);
      if (saved) {
        try {
          groups.value = JSON.parse(saved);
        } catch (e) {
          groups.value = [];
        }
      } else {
        groups.value = [];
      }
    } finally {
      isLoading.value = false;
    }
  };

  const addGroup = async (newGroup) => {
    const S = Number(newGroup.Total_Members || newGroup.Total_Shares || 20);
    const M = Number(newGroup.Total_Months || 20);
    const C = Number(newGroup.Commission_Amount || newGroup.Monthly_Commission || 4000);
    const D_undrawn = Number(newGroup.Undrawn_Due || 5000);
    const D_drawn = Number(newGroup.Drawn_Due || 6000);

    if (D_drawn < D_undrawn) {
      throw new Error('Drawn Due cannot be less than Undrawn Due');
    }

    const cid = String(newGroup.Chitti_ID || generateUnique6DigitId()).trim();
    registerAllocatedId(cid);

    const currentMgrEmail = getActiveManagerEmail();
    if (!currentMgrEmail) {
      throw new Error('Authentication required: please sign in as an authorized manager');
    }

    const created = {
      Chitti_ID: cid,
      Manager_ID: currentMgrEmail,
      Chitti_Name: newGroup.Chitti_Name || 'New Chitti Group',
      Template_ID: 'INCREMENTAL_TEMPLATE_V1',
      Rule_Template: 'Incremental Model V1',
      Total_Members: S,
      Total_Shares: S,
      Total_Months: M,
      Current_Month: 1,
      Current_Active_Month: 1,
      Monthly_Commission: C,
      Commission_Amount: C,
      Drawn_Due: D_drawn,
      Undrawn_Due: D_undrawn,
      Cycle_Anchor_Day: newGroup.Cycle_Anchor_Day || 10,
      Start_Date: newGroup.Start_Date || new Date().toISOString().split('T')[0],
      Status: 'Active',
      Is_Sample: false
    };

    // Prepare members payload
    const membersPayload = Array.isArray(newGroup.members) ? newGroup.members : [];

    // Optimistic UI insertion immediately
    groups.value.unshift(created);
    setCustomerType('existing');
    persistGroups(currentMgrEmail);

    // Fire API call to backend
    try {
      const headers = {
        'x-tenant-id': `TNT-${currentMgrEmail}`,
        'x-manager-id': currentMgrEmail,
        'x-manager-email': currentMgrEmail
      };
      await axios.post(
        '/api/v2/incremental-chitti/create',
        {
          manager_id: currentMgrEmail,
          chitti_id: cid,
          chitti_name: created.Chitti_Name,
          template_id: 'INCREMENTAL_TEMPLATE_V1',
          total_months: M,
          total_members: S,
          commission_amount: C,
          undrawn_due: D_undrawn,
          drawn_due: D_drawn,
          start_date: created.Start_Date
        },
        { headers, timeout: 8000 }
      );

      // Register shares in backend if members provided
      if (membersPayload.length > 0) {
        for (const m of membersPayload) {
          try {
            await axios.post(
              '/api/v2/incremental-chitti/share/create',
              {
                share_id: m.Share_ID || `${cid}${String(m.Share_Number || 1).padStart(2, '0')}`,
                chitti_id: cid,
                member_name: m.Member_Name || 'Member',
                member_phone: m.Member_Phone || m.Phone || m.Phone_Number || '+919800000000'
              },
              { headers, timeout: 4000 }
            );
          } catch (mErr) {
            console.warn('[Workspace] Share registration warning:', mErr.message);
          }
        }
      }
    } catch (err) {
      console.warn('[Workspace] API save warning, retained in local store:', err.message);
    }

    return created;
  };

  const getGroupById = (chittiId) => {
    return groups.value.find((g) => g.Chitti_ID === chittiId) || null;
  };

  const deleteGroup = async (chittiId) => {
    if (!chittiId) return false;
    const initialCount = groups.value.length;
    groups.value = groups.value.filter((g) => g.Chitti_ID !== chittiId);

    // Clean up stored shares and transactions for this chittiId
    try {
      const sharesRaw = localStorage.getItem(STORAGE_SHARES_KEY);
      if (sharesRaw) {
        const sharesStore = JSON.parse(sharesRaw);
        delete sharesStore[chittiId];
        localStorage.setItem(STORAGE_SHARES_KEY, JSON.stringify(sharesStore));
      }
      const txnsRaw = localStorage.getItem('clearflow_txns_v2');
      if (txnsRaw) {
        const txnsStore = JSON.parse(txnsRaw);
        delete txnsStore[chittiId];
        localStorage.setItem('clearflow_txns_v2', JSON.stringify(txnsStore));
      }
    } catch (e) {
      console.warn('Failed to clean up shares/txns for deleted group', e);
    }

    if (groups.value.length === 0) {
      setCustomerType('new');
    }
    persistGroups();

    // Notify backend queue
    try {
      const headers = getTenantHeaders();
      await axios.delete(`/api/chittis/${chittiId}`, { headers, timeout: 2500 });
    } catch (e) {
      console.warn('[Workspace] Delete queue dispatch warning:', e.message);
    }

    return groups.value.length < initialCount;
  };

  const signOut = () => {
    const email = getActiveManagerEmail();
    if (email) {
      localStorage.removeItem(getScopedStorageKey(email));
    }
    localStorage.removeItem(STORAGE_KEY_MANAGER);
    localStorage.removeItem('clearflow_manager_groups_v2');
    localStorage.removeItem('clearflow_auth_token');
    localStorage.removeItem(STORAGE_KEY_CUSTOMER_TYPE);
    manager.value = null;
    groups.value = [];
  };

  return {
    manager,
    groups,
    isLoading,
    error,
    customerType,
    isNewCustomer,
    isExistingCustomer,
    setCustomerType,
    setManagerUser,
    fetchWorkspace,
    addGroup,
    deleteGroup,
    getGroupById,
    signOut
  };
}
