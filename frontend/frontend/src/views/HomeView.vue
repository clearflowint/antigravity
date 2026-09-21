<template>
  <div id="clean-home-view" class="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
    <!-- Greetings Section (Clean, uncluttered, no default circle IDs) -->
    <div class="text-center space-y-2.5">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>ClearFlow Manager Workspace</span>
      </div>

      <h1 class="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight">
        Hi, {{ userName || manager?.Name || 'Manager' }} 👋
      </h1>

      <div v-if="managerId" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400 font-mono">
        <span class="text-slate-500">Manager ID:</span>
        <span class="text-blue-400 font-semibold">{{ managerId }}</span>
      </div>

      <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
        {{ isNewCustomer 
          ? "Welcome to ClearFlow Automations! Let's get your chit fund setup started by creating your first group."
          : "Welcome to your workspace. Create a new chitti group or select an active circle."
        }}
      </p>
    </div>

    <!-- Core Actions Flow -->
    <div class="space-y-4">
      <!-- Option 1: Create New Chitti Group -->
      <router-link
        id="home-create-chitti-card"
        to="/onboarding"
        class="group block p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-600/25 via-blue-900/15 to-slate-900 border border-blue-500/35 hover:border-blue-400 shadow-lg hover:shadow-blue-500/10 transition-all text-left"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow">
                +
              </span>
              <h2 class="text-base sm:text-lg font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                Create new chitti group
              </h2>
            </div>
            <p class="text-xs text-slate-300 pl-10 leading-relaxed">
              Configure custom members, monthly pool target, rule template, and foreman commission.
            </p>
          </div>
          <span class="text-blue-400 font-bold text-base shrink-0 group-hover:translate-x-1 transition-transform pt-1">
            &rarr;
          </span>
        </div>
      </router-link>

      <!-- Active Chitti Circles (for existing managers with active circles) -->
      <div v-if="hasActiveCircles" class="space-y-3 pt-2">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-sm font-bold text-slate-300">Active Circles</h2>
          <span class="text-xs text-slate-500 font-mono">{{ groups.length }} Total</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div
            v-for="g in groups"
            :key="g.Chitti_ID"
            @click="navigateToGroup(g.Chitti_ID)"
            class="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between text-xs group"
          >
            <div class="min-w-0 pr-2 space-y-0.5">
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-bold text-blue-400 text-xs">
                  {{ g.Chitti_ID }}
                </span>
                <span class="text-[9px] text-slate-500 font-mono">
                  M{{ g.Current_Month || 1 }}/{{ g.Total_Months || 20 }}
                </span>
              </div>
              <p class="font-semibold text-slate-200 truncate">
                {{ g.Chitti_Name }}
              </p>
              <span class="text-[10px] text-slate-400 font-mono block">
                {{ g.Total_Members || g.Total_Shares || 20 }} Members &bull; ₹{{ (Number(g.Monthly_Commission) || 4000).toLocaleString('en-IN') }}/mo
              </span>
            </div>
            <span class="text-slate-500 group-hover:text-blue-400 text-xs font-bold transition-colors shrink-0">
              Open &rarr;
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Down side: Powered by ClearFlow Automations -->
    <div class="pt-8 text-center border-t border-slate-800/60">
      <div class="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <span>Powered by ClearFlow Automations</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useManagerWorkspace } from '../composables/useManagerWorkspace';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { manager, groups, fetchWorkspace } = useManagerWorkspace();
const { userName, userEmail, managerId, isAuthenticated } = useAuth();

onMounted(async () => {
  if (isAuthenticated.value && managerId.value) {
    await fetchWorkspace(managerId.value);
  }
});

const hasActiveCircles = computed(() => {
  return Array.isArray(groups.value) && groups.value.length > 0;
});

const navigateToGroup = (chittiId) => {
  router.push(`/groups/${chittiId}`);
};
</script>
