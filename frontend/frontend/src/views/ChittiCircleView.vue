<template>
  <div id="single-page-group-view" class="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4">
    <!-- Feedback Toast -->
    <div
      v-if="toastMessage"
      class="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
    >
      <svg class="w-4 h-4 text-emerald-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      <span>{{ toastMessage }}</span>
    </div>

    <!-- Loading State with Complete Flush Feedback -->
    <div v-if="isLoading" class="p-12 text-center text-slate-400 text-xs">
      <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
      <span class="font-medium">Loading isolated Chitti ledger...</span>
    </div>

    <!-- Not Found State -->
    <div v-else-if="!activeChitti" class="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
      <h2 class="text-base font-bold text-slate-200">Chitti Group Not Found</h2>
      <p class="text-xs text-slate-400">Please select a Chitti from the sidebar navigation or return to Home.</p>
      <router-link
        to="/home"
        class="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
      >
        Go to Home
      </router-link>
    </div>

    <!-- Dynamic Template-Specific Dashboard Component -->
    <!-- Ensures UI variables and math components never cross over between different model templates -->
    <component
      v-else
      :is="activeTemplateComponent"
      :chitti="activeChitti"
      :shares="shares"
      :transactions="transactions"
      :scoreboard="scoreboard"
      :pool-data="poolData"
      @record-payment="handleRecordPayment"
      @draw-updated="handleDrawUpdated"
      @record-adjustment="handleRecordAdjustment"
      @spawn-next-month="handleSpawnNextMonth"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useApi } from '../composables/useApi';
import { useManagerWorkspace } from '../composables/useManagerWorkspace';
import IncrementalDashboard from '../components/templates/IncrementalDashboard.vue';

const route = useRoute();

const {
  activeChitti,
  shares,
  transactions,
  scoreboard,
  poolData,
  isLoading,
  loadGroupDetails,
  flushState,
  recordPayment,
  recordAdjustment,
  updateShareDrawStatus,
  spawnCycleMonth
} = useApi();

const { groups } = useManagerWorkspace();

// Feedback Toast
const toastMessage = ref('');
let toastTimeout = null;
const showToast = (msg) => {
  toastMessage.value = msg;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastMessage.value = '';
  }, 2500);
};

/**
 * Template-Wise Dashboard Routing:
 * Mounts the appropriate UI component strictly according to Rule_Template.
 */
const activeTemplateComponent = computed(() => {
  const templateName = (activeChitti.value?.Rule_Template || activeChitti.value?.Template_ID || 'Incremental Model V1').trim();
  
  if (templateName.toLowerCase().includes('incremental') || templateName === 'Incremental Model V1') {
    return IncrementalDashboard;
  }
  
  // Pluggable routing for future templates:
  // if (templateName === 'Fixed Pool Model') return FixedPoolDashboard;
  // Default to IncrementalDashboard as standard baseline
  return IncrementalDashboard;
});

/**
 * Switching between Chitti groups:
 * Immediately flushes the previous group's shares and transactions from memory
 * before fetching and mounting the new chittiId.
 */
const switchChittiGroup = async (targetId) => {
  if (!targetId) return;
  // 1. Immediately flush state to prevent any data bleed across groups
  flushState();
  
  // 2. Fetch fresh, strictly isolated group records from backend
  await loadGroupDetails(targetId);
};

const handleRecordPayment = async (payload) => {
  try {
    await recordPayment(payload);
    const prefix = payload.entryType === 'Credit' ? '+ Record' : '- Debit';
    showToast(`${prefix} of ₹${Number(payload.amount).toLocaleString('en-IN')} recorded successfully`);
  } catch (err) {
    alert(err.message || 'Payment recording failed');
  }
};

const handleDrawUpdated = (payload) => {
  updateShareDrawStatus(payload);
  showToast(`Draw winner updated for Share ${payload.shareId}`);
};

const handleRecordAdjustment = (payload) => {
  recordAdjustment(payload);
  showToast('Adjustment recorded successfully');
};

const handleSpawnNextMonth = async () => {
  try {
    await spawnCycleMonth(activeChitti.value?.Chitti_ID);
    showToast(`Advanced to next cycle month`);
  } catch (err) {
    alert(err.message || 'Failed to advance cycle month');
  }
};

// Route watcher: Triggers clean flush & fresh isolated load on sidebar navigation
watch(
  () => route.params.chittiId,
  (newId) => {
    if (newId) {
      switchChittiGroup(newId);
    }
  }
);

onMounted(() => {
  const initialId = route.params.chittiId || groups.value[0]?.Chitti_ID;
  if (initialId) {
    switchChittiGroup(initialId);
  }
});
</script>
