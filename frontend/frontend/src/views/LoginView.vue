<template>
  <div id="login-view" class="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
    <!-- Ambient Background Glows -->
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="max-w-md w-full relative z-10">
      <!-- Main Login Card -->
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
        <!-- Brand & App Header -->
        <div class="text-center space-y-2.5">
          <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-lg shadow-blue-500/25 border border-blue-400/20">
            CF
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-100 tracking-tight">ClearFlow Chits</h1>
            <p class="text-xs text-slate-400 mt-0.5">
              Small Chits Workflow Automation &bull; Manager Workspace
            </p>
          </div>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live NocoDB Connected</span>
          </div>
        </div>

        <!-- Notification / Error Banner -->
        <div
          v-if="errorMessage"
          id="auth-error-banner"
          class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2"
        >
          <div class="flex items-start gap-2.5">
            <svg class="w-5 h-5 shrink-0 text-rose-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div class="flex-1">
              <p class="font-bold text-rose-200 uppercase tracking-wider text-[11px]">
                {{ isUnauthorizedAccount ? 'Unauthorized Account' : 'Authentication Error' }}
              </p>
              <p class="mt-1 text-slate-200 leading-relaxed">{{ errorMessage }}</p>
            </div>
          </div>
          <div v-if="isUnauthorizedAccount" class="pt-2 border-t border-rose-500/20 flex items-center justify-between">
            <span class="text-[10px] text-rose-400">Need access? Contact admin.</span>
            <button
              type="button"
              @click="triggerGoogleLogin"
              class="text-[11px] font-semibold text-rose-200 hover:text-white underline cursor-pointer"
            >
              Sign in with another account &rarr;
            </button>
          </div>
        </div>

        <div
          v-if="statusMessage"
          class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs flex items-center gap-2"
        >
          <svg class="w-4 h-4 shrink-0 animate-spin text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ statusMessage }}</span>
        </div>

        <!-- Google Sign-In Actions -->
        <div class="space-y-3 pt-1">
          <!-- Primary Styled Google Sign-In Button -->
          <button
            id="google-signin-btn"
            type="button"
            @click="triggerGoogleLogin"
            :disabled="isLoading"
            class="w-full py-3.5 px-4 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 rounded-xl text-sm font-semibold transition-all shadow-lg flex items-center justify-center gap-3 border border-slate-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <!-- Google Official "G" SVG Icon -->
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{{ isLoading ? 'Signing in...' : 'Sign in with Google' }}</span>
          </button>

          <!-- Native Google GSI Rendered Button Container (Auto-populated by Google SDK) -->
          <div id="gsi-button-container" class="flex justify-center min-h-[44px] empty:hidden"></div>

          <p class="text-[11px] text-center text-slate-400 leading-relaxed px-2">
            Secure login via Google OAuth 2.0. Your Google email is securely linked as your <span class="text-slate-300 font-mono">manager_id</span> to isolate your chitti circles.
          </p>
        </div>

        <!-- Google Cloud Console Whitelist Quick Reference Info -->
        <div class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-2">
          <div class="flex items-center justify-between text-slate-300 font-semibold">
            <span class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Google Cloud Console Whitelist
            </span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/50">Required</span>
          </div>
          <div class="space-y-1 font-mono text-[10px] text-slate-300 break-all">
            <div>
              <span class="text-slate-500">Origin: </span>
              <span>{{ currentOrigin }}</span>
            </div>
            <div>
              <span class="text-slate-500">Redirect URI: </span>
              <span>{{ currentOrigin }}/auth/callback</span>
            </div>
          </div>
        </div>

        <!-- Support & WhatsApp Section -->
        <div class="pt-4 border-t border-slate-800/80 text-center space-y-3">
          <div class="space-y-0.5">
            <h2 class="text-xs sm:text-sm font-semibold text-slate-200">
              ClearFlow Automations Support
            </h2>
            <p class="text-[11px] text-slate-400">
              For any onboarding assistance:
              <a href="tel:+919652169196" class="text-blue-400 hover:text-blue-300 font-mono font-semibold underline decoration-dotted ml-1">+919652169196</a>
            </p>
          </div>

          <a
            id="whatsapp-contact-btn"
            href="https://wa.me/919652169196?text=Hello%20ClearFlow%20Automations%2C%20I%20have%20a%20query%20regarding%20Google%20Login"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full py-2.5 px-4 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/30"
          >
            <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth, decodeGoogleJwt } from '../composables/useAuth';
import { useManagerWorkspace } from '../composables/useManagerWorkspace';

const router = useRouter();
const route = useRoute();
const { loginWithGoogleCredential, loginWithGoogleUserInfo, loginWithGoogleProfile, verifyManagerWithBouncer, logout } = useAuth();
const { setCustomerType, fetchWorkspace } = useManagerWorkspace();

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '248057622784-nine3ac3upgkv5tvq716ov10l1tf6o3e.apps.googleusercontent.com';

const isLoading = ref(false);
const errorMessage = ref('');
const statusMessage = ref('');
const isUnauthorizedAccount = ref(false);
const currentOrigin = ref(typeof window !== 'undefined' ? window.location.origin : '');

let tokenClient = null;

const targetRedirectPath = computed(() => {
  return (route.query.redirect && String(route.query.redirect) !== '/login')
    ? String(route.query.redirect)
    : '/';
});

/**
 * Handle successful login transition with Bouncer check
 */
const completeAuthentication = async (user) => {
  try {
    statusMessage.value = 'Validating manager credentials with ClearFlow Bouncer...';
    isUnauthorizedAccount.value = false;

    // THE BOUNCER: Check email against Managers Table (TABLE_MANAGERS)
    const verification = await verifyManagerWithBouncer(user.email);

    statusMessage.value = `Welcome, ${user.name || user.email}! Loading workspace...`;
    setCustomerType('existing');
    try {
      await fetchWorkspace(user.email);
    } catch (e) {
      console.warn('[Login] Workspace fetch error:', e);
    }
    router.replace(targetRedirectPath.value);
  } catch (err) {
    console.error('[The Bouncer] Authentication rejected:', err);
    // Discard any credentials or local state
    logout();
    isUnauthorizedAccount.value = err.status === 403 || err.message.toLowerCase().includes('unauthorized');
    errorMessage.value = err.message || 'Unauthorized Account: Access restricted to authorized ClearFlow managers.';
    statusMessage.value = '';
    throw err;
  }
};

/**
 * Callback from Google Identity Services (GSI) credential
 */
const handleGsiCredential = async (response) => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    statusMessage.value = 'Verifying Google account...';

    if (!response || !response.credential) {
      throw new Error('No credential received from Google Identity Services');
    }

    const user = loginWithGoogleCredential(response.credential);
    await completeAuthentication(user);
  } catch (err) {
    console.error('[GSI Auth Error]:', err);
    errorMessage.value = err.message || 'Google sign-in failed. Please try again.';
  } finally {
    isLoading.value = false;
    statusMessage.value = '';
  }
};

/**
 * Handle OAuth Token response from Google token client
 */
const handleTokenResponse = async (tokenResponse) => {
  try {
    if (tokenResponse.error) {
      throw new Error(tokenResponse.error_description || tokenResponse.error);
    }
    if (!tokenResponse.access_token) {
      throw new Error('Access token not returned by Google');
    }

    statusMessage.value = 'Retrieving profile information...';

    // Fetch Google User Profile with access token
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`
      }
    });

    if (!userInfoRes.ok) {
      throw new Error(`Failed to fetch user profile from Google (${userInfoRes.status})`);
    }

    const userInfo = await userInfoRes.json();
    const user = loginWithGoogleUserInfo(userInfo, tokenResponse.access_token);
    await completeAuthentication(user);
  } catch (err) {
    console.error('[Token Auth Error]:', err);
    errorMessage.value = err.message || 'Failed to authenticate with Google';
  } finally {
    isLoading.value = false;
    statusMessage.value = '';
  }
};

/**
 * Trigger Google Login via GSI Token Client or popup authorization
 */
const triggerGoogleLogin = () => {
  errorMessage.value = '';
  isLoading.value = true;
  statusMessage.value = 'Opening Google Sign-In...';

  // Attempt 1: Google Identity Services Token Client
  if (window.google?.accounts?.oauth2) {
    try {
      if (!tokenClient) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: handleTokenResponse
        });
      }
      tokenClient.requestAccessToken({ prompt: 'consent' });
      return;
    } catch (e) {
      console.warn('[GSI TokenClient Warning]:', e);
    }
  }

  // Attempt 2: Standard OAuth 2.0 Popup Flow
  const redirectUri = `${window.location.origin}/auth/callback`;
  const stateNonce = Math.random().toString(36).substring(2);
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token%20id_token` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&nonce=${encodeURIComponent(stateNonce)}` +
    `&prompt=select_account`;

  const popup = window.open(
    authUrl,
    'google_oauth_popup',
    'width=520,height=640,status=no,toolbar=no,menubar=no'
  );

  if (!popup) {
    isLoading.value = false;
    statusMessage.value = '';
    errorMessage.value = 'Popup was blocked by your browser. Please allow popups for this site.';
  }
};

/**
 * Listen for messages from OAuth callback window
 */
const handleWindowMessage = async (event) => {
  // Validate origin
  if (event.origin !== window.location.origin && !event.origin.includes('run.app') && !event.origin.includes('localhost')) {
    return;
  }

  if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
    try {
      isLoading.value = true;
      statusMessage.value = 'Received authorization from Google...';
      const payload = event.data.payload;

      let user = null;
      if (payload.credential) {
        user = loginWithGoogleCredential(payload.credential);
      } else if (payload.userInfo) {
        user = loginWithGoogleUserInfo(payload.userInfo, payload.access_token);
      } else if (payload.email) {
        user = loginWithGoogleProfile(payload);
      }

      if (user) {
        await completeAuthentication(user);
      }
    } catch (e) {
      errorMessage.value = e.message || 'Authentication callback failed';
    } finally {
      isLoading.value = false;
      statusMessage.value = '';
    }
  }
};

/**
 * Handle incoming callback if this component is rendered at /auth/callback
 */
const handleCallbackRoute = async () => {
  if (route.path.includes('/auth/callback')) {
    try {
      isLoading.value = true;
      statusMessage.value = 'Processing Google callback...';

      // Check hash params (#access_token=... or #id_token=...)
      const hash = window.location.hash.substring(1);
      const search = window.location.search.substring(1);
      const params = new URLSearchParams(hash || search);

      const idToken = params.get('id_token');
      const accessToken = params.get('access_token');
      const code = params.get('code');

      let userPayload = null;

      if (idToken) {
        const decoded = decodeGoogleJwt(idToken);
        if (decoded?.email) {
          userPayload = { ...decoded, credential: idToken };
        }
      } else if (accessToken) {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.ok) {
          const info = await res.json();
          userPayload = { userInfo: info, access_token: accessToken };
        }
      }

      if (userPayload) {
        if (window.opener && window.opener !== window) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', payload: userPayload }, '*');
          window.close();
          return;
        } else {
          // Direct navigation callback
          let user = null;
          if (userPayload.credential) {
            user = loginWithGoogleCredential(userPayload.credential);
          } else if (userPayload.userInfo) {
            user = loginWithGoogleUserInfo(userPayload.userInfo, userPayload.access_token);
          }
          if (user) {
            await completeAuthentication(user);
            return;
          }
        }
      }
    } catch (err) {
      console.error('[Callback Route Error]:', err);
      errorMessage.value = 'Failed to process Google login response';
    } finally {
      isLoading.value = false;
      statusMessage.value = '';
    }
  }
};

onMounted(() => {
  window.addEventListener('message', handleWindowMessage);

  // Check if loaded on /auth/callback
  handleCallbackRoute();

  // Initialize Google Identity Services (GSI)
  const initGsi = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGsiCredential,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Render native GSI button if container exists
        const btnContainer = document.getElementById('gsi-button-container');
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            width: 320
          });
        }
      } catch (e) {
        console.warn('[GSI Init Warning]:', e);
      }
    }
  };

  if (window.google?.accounts?.id) {
    initGsi();
  } else {
    // Retry shortly in case script is loading asynchronously
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        initGsi();
      }
    }, 200);
    setTimeout(() => clearInterval(timer), 4000);
  }
});

onUnmounted(() => {
  window.removeEventListener('message', handleWindowMessage);
});
</script>
