<template>
  <div class="min-h-screen bg-clearflow-slate text-slate-100 flex flex-col font-sans selection:bg-clearflow-blue selection:text-white">
    <!-- Top Mobile-Focused Header with Sidebar Toggle -->
    <header class="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div class="max-w-4xl mx-auto px-3 h-14 flex items-center justify-between gap-2">
        <!-- Left: Hamburger Button, Brand, and Contextual Circle ID -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="openSidebar"
            class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Open Chitti Router Sidebar"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <!-- Brand link back to Home page -->
          <router-link
            to="/"
            class="flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            title="ClearFlow Home"
          >
            <span class="font-bold text-slate-100 text-sm tracking-tight">
              ClearFlow <span class="text-blue-400">Chits</span>
            </span>
          </router-link>

          <!-- Contextual Active Chitti: ONLY rendered when currently viewing a circle (/groups/:chittiId) -->
          <template v-if="currentCircleId">
            <span class="text-slate-600 hidden xs:inline">&bull;</span>
            <button
              type="button"
              @click="openSidebar"
              class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 transition-colors flex items-center gap-1"
              title="Switch Chitti Circle"
            >
              <span>{{ currentCircleId }}</span>
              <svg class="w-3 h-3 text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </template>
        </div>

        <!-- Right: Authenticated Profile / Sign In -->
        <div class="flex items-center gap-2">
          <template v-if="isAuthenticated">
            <div class="flex items-center gap-1.5 bg-slate-800/80 pl-1 pr-2.5 py-1 rounded-full border border-slate-700/60">
              <img
                v-if="userPicture"
                :src="userPicture"
                :alt="userName"
                class="w-5 h-5 rounded-full border border-slate-600 object-cover"
              />
              <div
                v-else
                class="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {{ (userName[0] || 'M').toUpperCase() }}
              </div>
              <span class="text-xs text-slate-300 font-medium hidden sm:inline max-w-[100px] truncate">
                {{ userName }}
              </span>
            </div>
            <button
              type="button"
              @click="handleSignOut"
              class="text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              title="Sign Out"
            >
              Sign out
            </button>
          </template>
          <template v-else>
            <router-link
              to="/login"
              class="text-xs font-semibold text-blue-400 hover:text-blue-300 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20"
            >
              Sign In
            </router-link>
          </template>
        </div>
      </div>
    </header>

    <!-- Sidebar Router Drawer (The Chitti Router for Manager) -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity"
      @click="closeSidebar"
    >
      <aside
        class="fixed top-0 bottom-0 left-0 w-72 sm:w-80 bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl z-50 animate-in slide-in-from-left duration-200"
        @click.stop
      >
        <!-- Sidebar Header -->
        <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow">
              CF
            </div>
            <div>
              <h2 class="font-bold text-slate-100 text-sm leading-tight">Chitti Groups</h2>
              <p class="text-[10px] text-slate-400">Select Circle</p>
            </div>
          </div>

          <button
            type="button"
            @click="closeSidebar"
            class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        <!-- Chitti Groups Router List -->
        <div class="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <div class="flex items-center justify-between px-1 mb-1 pt-1">
            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quick Select Circle</span>
            <span class="text-[10px] font-mono text-slate-500">
              {{ isNewCustomer ? '0 Circles (New)' : `${groups.length} Circles` }}
            </span>
          </div>

          <!-- IF NEW CUSTOMER: Empty State in Sidebar -->
          <div v-if="isNewCustomer" class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2.5 my-2">
            <div class="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto text-xs font-bold">
              0
            </div>
            <span class="text-xs text-slate-300 font-bold block">No Circles Created Yet</span>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              New customer mode: Set up your first chitti circle to activate the live management ledger.
            </p>
            <router-link
              to="/onboarding"
              @click="closeSidebar"
              class="block w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow"
            >
              + Create First Chitti
            </router-link>
          </div>

          <!-- IF EXISTING CUSTOMER: Group Router Cards -->
          <template v-else>
            <div
              v-for="group in groups"
              :key="group.Chitti_ID"
              @click="selectGroup(group.Chitti_ID)"
              class="p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5"
              :class="currentCircleId === group.Chitti_ID
                ? 'bg-blue-600/15 border-blue-500/50 shadow-sm'
                : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'"
            >
              <div class="flex items-center justify-between">
                <span class="font-mono font-bold text-xs" :class="currentCircleId === group.Chitti_ID ? 'text-blue-400' : 'text-slate-300'">
                  {{ group.Chitti_ID }}
                </span>
                <span
                  v-if="currentCircleId === group.Chitti_ID"
                  class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono"
                >
                  Current Active
                </span>
                <span v-else class="text-[9px] font-mono text-slate-500">
                  Tap to load &rarr;
                </span>
              </div>

              <h4 class="font-bold text-slate-200 text-xs truncate">
                {{ group.Chitti_Name }}
              </h4>

              <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                <span>Month {{ group.Current_Month || 1 }}/{{ group.Total_Months || 20 }}</span>
                <span>₹{{ (Number(group.Monthly_Commission) || 4000).toLocaleString('en-IN') }}/mo</span>
              </div>
            </div>
          </template>

          <!-- Sign Out Button under group names as requested -->
          <div class="pt-2">
            <button
              id="sidebar-signout-btn"
              type="button"
              @click="handleSignOut"
              class="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-semibold text-xs transition-colors flex items-center justify-between"
              title="Sign Out of ClearFlow"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                <span>Sign Out</span>
              </div>
              <span class="text-[10px] text-slate-400 font-mono">{{ manager?.Name || 'Manager' }}</span>
            </button>
          </div>
        </div>

        <!-- Sidebar Actions & Navigation -->
        <div class="p-3 border-t border-slate-800 bg-slate-900/40 space-y-2 text-xs">
          <router-link
            to="/onboarding"
            @click="isSidebarOpen = false"
            class="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>+ Create New Chitti</span>
          </router-link>
        </div>
      </aside>
    </div>

    <!-- Main View: Single Page ShareID Card Focused -->
    <main class="flex-1 pb-10">
      <router-view />
    </main>

    <!-- Footer at the end of every page scrolling -->
    <footer class="border-t border-slate-900 bg-slate-950 py-3 text-center">
      <p class="text-[11px] sm:text-xs text-slate-500 tracking-normal whitespace-nowrap overflow-hidden text-ellipsis px-4">
        Thankyou for using ClearFlow Automations
      </p>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useManagerWorkspace } from './composables/useManagerWorkspace';
import { useSidebar } from './composables/useSidebar';
import { useAuth } from './composables/useAuth';

const route = useRoute();
const router = useRouter();
const { manager, groups, isNewCustomer, signOut, fetchWorkspace } = useManagerWorkspace();
const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
const { isAuthenticated, userName, userPicture, logout, managerId } = useAuth();

onMounted(async () => {
  if (isAuthenticated.value && managerId.value) {
    await fetchWorkspace(managerId.value);
  }
});

watch(managerId, async (newId) => {
  if (newId) {
    await fetchWorkspace(newId);
  } else {
    signOut();
  }
});

// Active circle ID is ONLY present when the user is explicitly viewing a chitti group (/groups/:chittiId).
// On Home (/), Onboarding (/onboarding), etc., it is null so no default chitti ID leaks into the header.
const currentCircleId = computed(() => {
  return route.name === 'GroupDetail' && route.params.chittiId ? route.params.chittiId : null;
});

const selectGroup = (chittiId) => {
  closeSidebar();
  router.push(`/groups/${chittiId}`);
};

const handleSignOut = () => {
  closeSidebar();
  logout();
  signOut();
  router.push('/login');
};
</script>
