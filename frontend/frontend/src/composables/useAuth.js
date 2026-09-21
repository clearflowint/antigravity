import { ref, computed } from 'vue';
import { useManagerWorkspace } from './useManagerWorkspace';

const STORAGE_KEY = 'clearflow_auth_user';
const STORAGE_MANAGER_KEY = 'clearflow_manager_user_v2';
const STORAGE_TOKEN_KEY = 'clearflow_auth_token';
const STORAGE_TENANT_KEY = 'clearflow_tenant_id';

/**
 * Decode standard Google JWT credential token without external libraries
 */
export function decodeGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('[useAuth] Failed to parse Google JWT credential:', err);
    return null;
  }
}

/**
 * Load initial authenticated user from persistent storage
 */
const loadInitialUser = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.email || parsed.manager_id)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[useAuth] Failed to load saved user session:', e);
  }
  return null;
};

// Reactive shared state
const currentUser = ref(loadInitialUser());

/**
 * Sync manager session to localStorage and active state
 */
function syncUserState(user) {
  currentUser.value = user;
  const workspace = useManagerWorkspace();
  if (user) {
    workspace.setManagerUser(user);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      // Sync with useManagerWorkspace expected structure
      localStorage.setItem(
        STORAGE_MANAGER_KEY,
        JSON.stringify({
          Manager_ID: user.manager_id,
          Manager_Name: user.name,
          Name: user.name,
          Email: user.email,
          Picture: user.picture,
          Tenant_ID: user.Tenant_ID,
          Phone: user.phone || ''
        })
      );
      if (user.token) {
        localStorage.setItem(STORAGE_TOKEN_KEY, user.token);
      }
      localStorage.setItem(STORAGE_TENANT_KEY, user.Tenant_ID);
    } catch (e) {
      console.warn('[useAuth] Storage error:', e);
    }
  } else {
    workspace.setManagerUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_MANAGER_KEY);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_TENANT_KEY);
    } catch (e) {
      console.warn('[useAuth] Storage clearance error:', e);
    }
  }
}

export function useAuth() {
  const isAuthenticated = computed(() => {
    return Boolean(currentUser.value && (currentUser.value.email || currentUser.value.manager_id));
  });

  const isManager = computed(() => {
    return currentUser.value?.role === 'manager' || true;
  });

  // Critical requirement: Extract user's Google email and set it as manager_id
  const managerId = computed(() => {
    return currentUser.value?.manager_id || currentUser.value?.email || '';
  });

  const userEmail = computed(() => {
    return currentUser.value?.email || '';
  });

  const userName = computed(() => {
    return currentUser.value?.name || userEmail.value.split('@')[0] || 'Chitti Manager';
  });

  const userPicture = computed(() => {
    return currentUser.value?.picture || '';
  });

  /**
   * The Bouncer: Verifies user's email against TABLE_MANAGERS in NocoDB via FastAPI
   */
  const verifyManagerWithBouncer = async (email) => {
    if (!email) {
      throw new Error('Email is required for manager verification');
    }
    const cleanEmail = email.trim().toLowerCase();
    const resp = await fetch('/api/v2/auth/verify-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      const detailMsg = errorData.detail || `Unauthorized Account: '${cleanEmail}' is not registered as an active manager in ClearFlow. Access restricted to authorized personnel.`;
      const err = new Error(detailMsg);
      err.status = resp.status;
      throw err;
    }

    return await resp.json();
  };

  /**
   * Handle Google Credential Response from Google Identity Services (GSI)
   */
  const loginWithGoogleCredential = (credentialToken) => {
    if (!credentialToken) {
      throw new Error('Missing Google credential token');
    }

    const payload = decodeGoogleJwt(credentialToken);
    if (!payload || !payload.email) {
      throw new Error('Invalid Google credential payload or missing email');
    }

    const email = payload.email.trim().toLowerCase();
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || '';

    // CRITICAL REQUIREMENT: Extract the user's Google email and set it as the manager_id
    const user = {
      id: payload.sub || `mgr-${Date.now()}`,
      email: email,
      name: name,
      picture: picture,
      avatar: (payload.given_name?.[0] || name[0] || 'C').toUpperCase(),
      role: 'manager',
      manager_id: email, // Google email set as manager_id
      managerId: email,
      Manager_ID: email,
      Tenant_ID: `TNT-${email}`,
      tenantId: `TNT-${email}`,
      token: credentialToken,
      authProvider: 'google_gsi',
      loginAt: new Date().toISOString()
    };

    syncUserState(user);
    return user;
  };

  /**
   * Handle Google UserInfo from OAuth2 token response
   */
  const loginWithGoogleUserInfo = (userInfo, accessToken = '') => {
    if (!userInfo || !userInfo.email) {
      throw new Error('Invalid Google user info or missing email');
    }

    const email = userInfo.email.trim().toLowerCase();
    const name = userInfo.name || userInfo.displayName || email.split('@')[0];
    const picture = userInfo.picture || '';

    // CRITICAL REQUIREMENT: Extract the user's Google email and set it as the manager_id
    const user = {
      id: userInfo.sub || userInfo.id || `mgr-${Date.now()}`,
      email: email,
      name: name,
      picture: picture,
      avatar: (name[0] || 'C').toUpperCase(),
      role: 'manager',
      manager_id: email, // Google email set as manager_id
      managerId: email,
      Manager_ID: email,
      Tenant_ID: `TNT-${email}`,
      tenantId: `TNT-${email}`,
      token: accessToken,
      authProvider: 'google_oauth2',
      loginAt: new Date().toISOString()
    };

    syncUserState(user);
    return user;
  };

  /**
   * Universal login handler for Google Auth profile object
   */
  const loginWithGoogleProfile = (profile, token = '') => {
    if (!profile || !profile.email) {
      throw new Error('Google profile is missing an email address');
    }
    return loginWithGoogleUserInfo(profile, token);
  };

  /**
   * Sign out and clear all stored credentials
   */
  const logout = () => {
    syncUserState(null);
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (e) {
        // Safe ignore
      }
    }
  };

  return {
    currentUser,
    isAuthenticated,
    isManager,
    managerId,
    userEmail,
    userName,
    userPicture,
    loginWithGoogleCredential,
    loginWithGoogleUserInfo,
    loginWithGoogleProfile,
    verifyManagerWithBouncer,
    logout
  };
}
