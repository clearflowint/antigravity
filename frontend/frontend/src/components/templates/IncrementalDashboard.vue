<template>
  <div id="incremental-dashboard" class="space-y-3.5">
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

    <!-- 1. Top: Month Summary Card with Quick Statement & Month Stepper -->
    <section
      id="month-summary-card"
      class="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2.5"
    >
      <!-- Header: Month Number, Stepper, Statement, and Manager Ledger -->
      <div class="flex items-start justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="font-bold text-slate-100 text-sm sm:text-base leading-tight">
              {{ formattedMonthHeader }}
            </h2>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
              {{ chitti.Chitti_ID }}
            </span>
            <span class="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
              Incremental Model V1
            </span>
          </div>

          <!-- Draw amount for that month computed via dynamic formula -->
          <div class="text-xs text-purple-300 font-mono font-medium mt-0.5 flex items-center gap-2">
            <span>Winner's Prize: ₹{{ (monthCardData.drawAmount || 0).toLocaleString('en-IN') }}</span>
            <span class="text-slate-500 font-sans text-[11px]">(Pool - Commission)</span>
          </div>
        </div>

        <!-- Action Triggers: Month Statement and Month Stepper -->
        <div class="flex items-center gap-1.5 shrink-0 mt-0.5">
          <!-- One-Click Month Statement Button -->
          <button
            type="button"
            @click="isMonthStatementOpen = true"
            class="text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
            title="View Statement for this Month"
          >
            <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>Statement</span>
          </button>

          <!-- Month Stepper -->
          <div class="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              type="button"
              @click="prevSummaryMonth"
              :disabled="summaryMonth <= 1"
              class="w-6 h-6 rounded flex items-center justify-center text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Month"
            >
              &larr;
            </button>
            <span class="px-1.5 font-mono text-xs font-bold text-slate-300">
              M{{ summaryMonth }}
            </span>
            <button
              type="button"
              @click="nextSummaryMonth"
              :disabled="summaryMonth >= totalMonths"
              class="w-6 h-6 rounded flex items-center justify-center text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Month"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Month Card Content: Total collection, pending collection, paid count, pending count -->
      <div class="grid grid-cols-2 gap-2 text-xs font-mono">
        <!-- Total Collection of that Month -->
        <div class="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
          <span class="text-[10px] text-slate-400 font-sans block">Total Collection</span>
          <strong class="text-sm font-bold text-emerald-400">
            ₹{{ (monthCardData.totalCollected || 0).toLocaleString('en-IN') }}
          </strong>
          <span class="text-[10px] text-slate-500 block font-sans mt-0.5">
            Target Pool: ₹{{ (summaryMetrics.gross_pool || 0).toLocaleString('en-IN') }}
          </span>
        </div>

        <!-- Pending Collection of that Month -->
        <div class="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
          <span class="text-[10px] text-slate-400 font-sans block">Pending Collection</span>
          <strong
            class="text-sm font-bold"
            :class="monthCardData.totalPending > 0 ? 'text-red-400' : 'text-slate-400'"
          >
            ₹{{ (monthCardData.totalPending || 0).toLocaleString('en-IN') }}
          </strong>
          <span class="text-[10px] text-slate-500 block font-sans mt-0.5">
            {{ monthCardData.paidCount }} Paid &bull; {{ monthCardData.pendingCount }} Pending
          </span>
        </div>
      </div>

      <!-- Pocket Cash & Advance Info Bar -->
      <div class="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
        <div>
          <span class="text-slate-400">Net Balance: </span>
          <span :class="chittiNetBalance >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'">
            {{ chittiNetBalance >= 0 ? '+' : '' }}₹{{ Math.round(chittiNetBalance).toLocaleString('en-IN') }}
          </span>
        </div>
        <div>
          <span class="text-slate-400">Total Advance Reserve: </span>
          <span class="text-blue-400 font-bold">₹{{ Math.round(totalLiveAdvance).toLocaleString('en-IN') }}</span>
        </div>
      </div>
    </section>

    <!-- 2. Sticky Filter Bar (Clean: All / Paid / Pending tabs) -->
    <section
      id="sticky-actions-bar"
      class="sticky top-14 z-30 bg-slate-950/95 backdrop-blur-md py-2 px-1 border-b border-slate-800/80 space-y-2"
    >
      <!-- 3 Filter Tabs (All / Paid / Pending) -->
      <div class="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          @click="activeFilterTab = 'all'"
          class="py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
          :class="activeFilterTab === 'all'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
        >
          <span>All</span>
          <span class="text-[10px] font-mono px-1 rounded bg-black/25">
            {{ mergedSharesList.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeFilterTab = 'paid'"
          class="py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
          :class="activeFilterTab === 'paid'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
        >
          <span>Paid</span>
          <span class="text-[10px] font-mono px-1 rounded bg-black/25">
            {{ paidCount }}
          </span>
        </button>

        <button
          type="button"
          @click="activeFilterTab = 'pending'"
          class="py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
          :class="activeFilterTab === 'pending'
            ? 'bg-red-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
        >
          <span>Pending</span>
          <span class="text-[10px] font-mono px-1 rounded bg-black/25">
            {{ pendingCount }}
          </span>
        </button>
      </div>
    </section>

    <!-- 3. Roster of Single-View Share Cards -->
    <section id="shares-roster" class="space-y-3">
      <div v-if="filteredShares.length === 0" class="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
        No shares match the "{{ activeFilterTab }}" filter.
      </div>

      <ShareCard
        v-for="item in filteredShares"
        :key="item.share.Share_ID"
        :share="item.share"
        :chitti="chitti"
        :transaction="item.transaction"
        :month="activeCycleMonth"
        @record-payment="handleRecordPayment"
        @draw-updated="handleDrawUpdated"
        @open-statement="openStatementModal"
      />
    </section>

    <!-- 4. Bottom Section: WhatsApp Reminders & ChittiID Card -->
    <section id="circle-bottom-actions" class="pt-6 border-t border-slate-800/80 space-y-3">
      <!-- WhatsApp Reminders Button on Top of ChittiID Card -->
      <button
        type="button"
        @click="promptSendWebhook"
        :disabled="isTriggeringWebhook || pendingCount === 0"
        class="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        title="Send WhatsApp payment reminders to pending members"
      >
        <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span v-if="isTriggeringWebhook">Sending Reminders...</span>
        <span v-else>WhatsApp Reminders ({{ pendingCount }} Pending)</span>
      </button>

      <!-- ChittiID Card -->
      <div
        id="chitti-id-card"
        class="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 sm:p-3 transition-all shadow-sm space-y-2 hover:border-slate-700"
      >
        <!-- Top Row: Chitti Name (Dominant) with Chitti ID Badge -->
        <div class="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-800/80">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h4 class="font-bold text-slate-100 text-sm leading-tight truncate">
                {{ chitti.Chitti_Name }}
              </h4>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 leading-tight font-sans tracking-wide bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono">
                Chitti ID: {{ chitti.Chitti_ID }}
              </span>
            </div>

            <!-- Sub details: Total Shares, Cycle Anchor Day & Active Month -->
            <div class="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span class="font-mono text-slate-300 font-semibold">
                {{ chitti.Total_Shares || 20 }} Shares
              </span>
              <span class="text-slate-600">&bull;</span>
              <span class="text-slate-400 text-[11px]">
                Cycle M{{ activeCycleMonth }} of {{ totalMonths }} ({{ chitti.Cycle_Anchor_Day || '10th to 10th' }})
              </span>
              <span class="text-slate-600">&bull;</span>
              <span class="text-purple-400 font-mono text-[11px]">
                Undrawn: ₹{{ (chitti.Undrawn_Due || 5000).toLocaleString('en-IN') }} | Drawn: ₹{{ (chitti.Drawn_Due || 6000).toLocaleString('en-IN') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Commission Earned Row -->
        <div class="flex items-center justify-between gap-2 text-xs py-0.5">
          <span class="text-slate-400">Monthly Commission:</span>
          <span class="font-mono font-bold text-emerald-400">
            ₹{{ Number(chitti.Monthly_Commission || chitti.Commission_Amount || 4000).toLocaleString('en-IN') }} / mo
          </span>
        </div>

        <!-- Net Balance Row -->
        <div class="flex items-center justify-between gap-2 text-xs py-0.5">
          <span class="text-slate-400">Manager Net Balance:</span>
          <span
            class="font-mono font-bold text-sm"
            :class="chittiNetBalance >= 0 ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ chittiNetBalance >= 0 ? '+' : '' }}₹{{ Math.round(chittiNetBalance).toLocaleString('en-IN') }}
          </span>
        </div>

        <!-- Quick Action Triggers: Ledger, PDF, Spawn Month -->
        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            @click="isManagerLedgerOpen = true"
            class="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Personal Ledger</span>
          </button>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="$emit('spawn-next-month')"
              class="text-[11px] px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg transition-colors font-semibold flex items-center gap-1"
            >
              <span>Advance to M{{ activeCycleMonth + 1 }}</span>
            </button>

            <button
              type="button"
              @click="handleDownloadPdfStatement"
              class="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors font-semibold flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Modals -->
    <StatementModal
      v-if="isStatementOpen && selectedStatementShare"
      :is-open="isStatementOpen"
      :chitti="chitti"
      :share="selectedStatementShare"
      :statement="shareStatementData"
      :current-month="activeCycleMonth"
      :preloaded-data="preloadedShareStatement"
      @close="isStatementOpen = false"
    />

    <MonthStatementModal
      v-if="isMonthStatementOpen"
      :is-open="isMonthStatementOpen"
      :chitti="chitti"
      :month="summaryMonth"
      :summary-metrics="{
        month: summaryMonth,
        totalCollected: summaryMetrics.gross_pool,
        netPayout: summaryMetrics.net_payout
      }"
      :shares-list="mergedSharesList"
      :preloaded-data="preloadedMonthStatement"
      @close="isMonthStatementOpen = false"
    />

    <ManagerPersonalLedgerModal
      v-if="isManagerLedgerOpen"
      :is-open="isManagerLedgerOpen"
      :chitti="chitti"
      :active-month="activeCycleMonth"
      :ledger-data="managerLedgerData"
      @close="isManagerLedgerOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  calculateMonthMath,
  calculateMonthCardSummary,
  calculateMergedShares,
  calculatePocketCash,
  calculateShareStatementData,
  calculateMonthStatementData,
  calculateManagerPersonalLedger
} from '../../composables/chitti_math_engine';
import { triggerDownloadCirclePdf } from '../../utils/exportPdfStatement';
import ShareCard from '../ShareCard.vue';
import StatementModal from '../StatementModal.vue';
import MonthStatementModal from '../MonthStatementModal.vue';
import ManagerPersonalLedgerModal from '../ManagerPersonalLedgerModal.vue';

const props = defineProps({
  chitti: {
    type: Object,
    required: true
  },
  shares: {
    type: Array,
    default: () => []
  },
  transactions: {
    type: Array,
    default: () => []
  },
  scoreboard: {
    type: Object,
    default: null
  },
  poolData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits([
  'record-payment',
  'draw-updated',
  'record-adjustment',
  'spawn-next-month',
  'open-share-statement'
]);

// 3 Filter Tabs: 'all' | 'paid' | 'pending'
const activeFilterTab = ref('all');

// Toast notification
const toastMessage = ref('');
let toastTimeout = null;
const showToast = (msg) => {
  toastMessage.value = msg;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastMessage.value = '';
  }, 2500);
};

// Modals
const isStatementOpen = ref(false);
const isMonthStatementOpen = ref(false);
const isManagerLedgerOpen = ref(false);
const selectedStatementShare = ref(null);
const shareStatementData = ref([]);

// Active cycle month of the chitti group
const activeCycleMonth = computed(() => Number(props.chitti?.Current_Month || props.chitti?.Current_Active_Month || 1));
const totalMonths = computed(() => Number(props.chitti?.Total_Months || 20));

// Summary Month Stepper state (navigable 1..Total_Months)
const summaryMonth = ref(Number(props.chitti?.Current_Month || props.chitti?.Current_Active_Month || 1));

const prevSummaryMonth = () => {
  if (summaryMonth.value > 1) {
    summaryMonth.value--;
  }
};

const nextSummaryMonth = () => {
  if (summaryMonth.value < totalMonths.value) {
    summaryMonth.value++;
  }
};

// Summary metrics calculated strictly via domain math engine
const summaryMetrics = computed(() => {
  return calculateMonthMath(props.chitti, summaryMonth.value);
});

// Dynamic formatted header: Month number, Month Name (e.g. January), and Year
const formattedMonthHeader = computed(() => {
  const startYear = 2026;
  const startMonthIndex = 0; // January
  const totalOffset = startMonthIndex + (summaryMonth.value - 1);
  const currentYear = startYear + Math.floor(totalOffset / 12);
  const monthIdx = ((totalOffset % 12) + 12) % 12;
  const d = new Date(currentYear, monthIdx, 1);
  const monthName3 = d.toLocaleString('en-US', { month: 'short' });
  return `Month ${summaryMonth.value} • ${monthName3} ${currentYear}`;
});

// Merged Shares with current active cycle state
const mergedSharesList = computed(() => {
  return calculateMergedShares({
    chitti: props.chitti,
    month: activeCycleMonth.value,
    shares: props.shares,
    transactions: props.transactions
  });
});

// Month Card Data: calculated via domain math engine
const monthCardData = computed(() => {
  return calculateMonthCardSummary({
    chitti: props.chitti,
    summaryMonth: summaryMonth.value,
    activeCycleMonth: activeCycleMonth.value,
    shares: props.shares,
    transactions: props.transactions
  });
});

const paidCount = computed(() => monthCardData.value?.paidCount ?? 0);
const pendingCount = computed(() => monthCardData.value?.pendingCount ?? 0);

// Pocket cash and financial balances from domain math engine & backend scoreboard
const pocketCash = computed(() => {
  return calculatePocketCash({
    chitti: props.chitti,
    month: activeCycleMonth.value,
    transactions: props.transactions,
    shares: props.shares
  });
});

const totalLiveAdvance = computed(() => {
  if (props.scoreboard?.total_advance_reserve !== undefined) {
    return props.scoreboard.total_advance_reserve;
  }
  return pocketCash.value?.totalAdvanceReserve ?? 0;
});

const chittiNetBalance = computed(() => {
  if (props.scoreboard?.net_balance !== undefined) {
    return props.scoreboard.net_balance;
  }
  return pocketCash.value?.cashWithoutAdvances ?? 0;
});

// Filtered shares based on activeFilterTab
const filteredShares = computed(() => {
  if (activeFilterTab.value === 'paid') {
    return mergedSharesList.value.filter((i) => i.isPaid);
  }
  if (activeFilterTab.value === 'pending') {
    return mergedSharesList.value.filter((i) => !i.isPaid);
  }
  return mergedSharesList.value;
});

// Statements
const preloadedMonthStatement = computed(() => {
  return calculateMonthStatementData({
    chitti: props.chitti,
    month: summaryMonth.value,
    shares: props.shares,
    transactions: props.transactions
  });
});

const preloadedShareStatement = computed(() => {
  if (!selectedStatementShare.value) return null;
  return calculateShareStatementData({
    chitti: props.chitti,
    share: selectedStatementShare.value,
    statement: shareStatementData.value,
    currentMonth: activeCycleMonth.value
  });
});

const managerLedgerData = computed(() => {
  return calculateManagerPersonalLedger({
    chitti: props.chitti,
    activeMonth: activeCycleMonth.value,
    shares: props.shares,
    transactions: props.transactions
  });
});

// Actions
const handleRecordPayment = (payload) => {
  emit('record-payment', payload);
};

const handleDrawUpdated = (payload) => {
  emit('draw-updated', payload);
};

const openStatementModal = (shareId) => {
  const share = props.shares.find((s) => s.Share_ID === shareId);
  if (!share) return;
  selectedStatementShare.value = share;
  isStatementOpen.value = true;
};

const handleDownloadPdfStatement = () => {
  triggerDownloadCirclePdf(props.chitti, props.shares, props.transactions, activeCycleMonth.value);
};

const isTriggeringWebhook = ref(false);
const promptSendWebhook = async () => {
  isTriggeringWebhook.value = true;
  try {
    await fetch('/api/webhook/whatsapp-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chittiId: props.chitti?.Chitti_ID,
        cycleMonth: activeCycleMonth.value,
        timestamp: new Date().toISOString()
      })
    }).catch(() => null);

    showToast('✓ Reminders sent successfully');
  } finally {
    isTriggeringWebhook.value = false;
  }
};
</script>
