<template>
  <div
    v-if="isOpen && chitti"
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
    @click.self="$emit('close')"
  >
    <!-- Simple White Page Type Month Statement Popup to Screenshot on Demand -->
    <div
      id="printable-month-statement"
      class="bg-white text-slate-900 rounded-xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300"
    >
      <!-- Top Action Bar -->
      <div class="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
        <span class="text-slate-600 font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Month {{ month }} &bull; {{ monthYearStr }} Statement &bull; Ready to Screenshot
        </span>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="copyMonthSummary"
            class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] transition-colors"
          >
            Copy Summary
          </button>
          <button
            type="button"
            @click="$emit('close')"
            class="text-slate-500 hover:text-slate-900 text-lg font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200"
          >
            &times;
          </button>
        </div>
      </div>

      <!-- Scrollable Printable Paper Sheet -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white font-sans">
        <!-- Letterhead Header -->
        <div class="border-b-2 border-slate-900 pb-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">ClearFlow Chit Fund Management</span>
              <h2 class="text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-tight">
                MONTH {{ month }} &bull; {{ monthYearStr }} CYCLE LEDGER
              </h2>
              <p class="text-xs text-slate-600 font-mono mt-0.5">
                Group: {{ chitti.Chitti_Name }} ({{ chitti.Chitti_ID }})
              </p>
            </div>

            <div class="text-right shrink-0 font-mono text-xs">
              <span class="inline-block px-2 py-0.5 bg-blue-900 text-white font-bold rounded">
                M{{ month }} &bull; {{ monthYearStr }}
              </span>
              <span class="block text-[10px] text-slate-500 mt-1">
                Anchor: {{ chitti.Cycle_Anchor_Day || '10th to 10th' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Month Financial Snapshot Grid (No Commission, Draw Amount Instead of Winner) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs font-mono">
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span class="text-[10px] font-sans text-slate-500 block uppercase font-semibold">Gross Pool Target</span>
            <strong class="text-slate-900 text-sm font-bold">₹{{ displayExpectedPool.toLocaleString('en-IN') }}</strong>
          </div>

          <div class="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            <span class="text-[10px] font-sans text-emerald-800 block uppercase font-semibold">Total Collected</span>
            <strong class="text-emerald-900 text-sm font-bold">₹{{ displayTotalCollected.toLocaleString('en-IN') }}</strong>
          </div>

          <div class="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            <span class="text-[10px] font-sans text-amber-800 block uppercase font-semibold">This Month Draw Amount</span>
            <strong class="text-amber-900 text-sm font-bold">₹{{ displayNetDrawAmount.toLocaleString('en-IN') }}</strong>
          </div>
        </div>

        <!-- Shares Breakdown Table for Month m -->
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <div class="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Share Rosters ({{ displayRows.length }} Shares)</span>
            <span class="font-mono text-[11px] text-slate-600">
              {{ displayPaidCount }} Paid &bull; {{ displayPendingCount }} Pending
            </span>
          </div>

          <table class="w-full text-left text-xs text-slate-800 font-mono">
            <thead class="bg-slate-50 text-slate-600 font-sans font-semibold border-b border-slate-200 text-[10px] uppercase">
              <tr>
                <th class="py-2 px-2.5">#</th>
                <th class="py-2 px-2.5">Member Name</th>
                <th class="py-2 px-2.5">Status</th>
                <th class="py-2 px-2.5 text-right">Due Rate</th>
                <th class="py-2 px-2.5 text-right">Paid</th>
                <th class="py-2 px-2.5 text-right">Pending</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr
                v-for="item in displayRows"
                :key="item.shareId"
                class="hover:bg-slate-50/80"
              >
                <td class="py-2 px-2.5 font-bold text-slate-500">
                  #{{ String(item.shareNumber).padStart(2, '0') }}
                </td>

                <td class="py-2 px-2.5 font-sans font-medium text-slate-900">
                  {{ item.memberName }}
                </td>

                <td class="py-2 px-2.5 font-sans text-[10px]">
                  <span
                    class="px-1.5 py-0.2 rounded font-medium"
                    :class="item.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ item.isPaid ? 'Paid' : 'Pending' }}
                  </span>
                </td>

                <td class="py-2 px-2.5 text-right font-medium">
                  ₹{{ item.due.toLocaleString('en-IN') }}
                </td>

                <td class="py-2 px-2.5 text-right font-bold text-emerald-700">
                  ₹{{ item.paid.toLocaleString('en-IN') }}
                </td>

                <td
                  class="py-2 px-2.5 text-right font-bold"
                  :class="item.pending > 0 ? 'text-red-700' : 'text-slate-400'"
                >
                  ₹{{ item.pending.toLocaleString('en-IN') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Watermark & Footer Note -->
        <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Official Month Statement &bull; ClearFlow Architecture</span>
          <span>Date: {{ currentDate }}</span>
        </div>
      </div>

      <!-- Modal Bottom Actions -->
      <div class="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <span class="text-xs text-slate-500">
          Tip: Take a screenshot to post to group
        </span>
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { calculateMonthStatementData } from '../composables/chitti_math_engine';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  chitti: { type: Object, default: () => ({}) },
  month: { type: Number, default: 1 },
  monthMetrics: { type: Object, default: () => ({}) },
  sharesList: { type: Array, default: () => [] },
  preloadedData: { type: Object, default: null }
});

defineEmits(['close']);

// Preloaded JSON statement from math engine or computed fallback
const monthSnippet = computed(() => {
  if (props.preloadedData) return props.preloadedData;
  return calculateMonthStatementData({
    chitti: props.chitti,
    month: props.month,
    shares: props.sharesList.map(item => item.share || item),
    transactions: []
  });
});

const displayExpectedPool = computed(() => {
  return monthSnippet.value?.expectedPool ?? Number(props.monthMetrics?.expectedCollection || 0);
});

const displayTotalCollected = computed(() => {
  return monthSnippet.value?.totalCollected ?? Number(props.monthMetrics?.totalCollected || 0);
});

const displayNetDrawAmount = computed(() => {
  return monthSnippet.value?.netDrawAmount ?? Number(props.monthMetrics?.netPayout || 0);
});

const displayPaidCount = computed(() => {
  if (monthSnippet.value?.paidCount !== undefined) return monthSnippet.value.paidCount;
  return props.sharesList.filter((i) => i.isPaid).length;
});

const displayPendingCount = computed(() => {
  if (monthSnippet.value?.pendingCount !== undefined) return monthSnippet.value.pendingCount;
  return props.sharesList.filter((i) => !i.isPaid).length;
});

const displayRows = computed(() => {
  if (monthSnippet.value?.rows) return monthSnippet.value.rows;
  return props.sharesList.map(item => ({
    shareId: item.share?.Share_ID || item.Share_ID,
    shareNumber: item.share?.Share_Number || item.Share_Number,
    memberName: item.share?.Member_Name || item.Member_Name,
    due: item.due || 0,
    paid: item.paid || 0,
    pending: item.pending || 0,
    isPaid: item.isPaid || false
  }));
});

const monthYearStr = computed(() => {
  if (monthSnippet.value?.monthYearStr) return monthSnippet.value.monthYearStr;
  const startYear = 2026;
  const startMonthIndex = 0;
  const totalOffset = startMonthIndex + (Number(props.month || 1) - 1);
  const year = startYear + Math.floor(totalOffset / 12);
  const mIdx = ((totalOffset % 12) + 12) % 12;
  const d = new Date(year, mIdx, 1);
  const m3 = d.toLocaleString('en-US', { month: 'short' });
  return `${m3} ${year}`;
});

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
});

const copyMonthSummary = () => {
  if (monthSnippet.value?.summaryText) {
    navigator.clipboard.writeText(monthSnippet.value.summaryText);
    alert('Month statement summary copied to clipboard!');
    return;
  }
  let text = `📄 *CLEARFLOW MONTH ${props.month} STATEMENT*\n`;
  text += `Group: ${props.chitti?.Chitti_Name} (${props.chitti?.Chitti_ID})\n\n`;
  text += `• Target Pool: ₹${displayExpectedPool.value.toLocaleString('en-IN')}\n`;
  text += `• Total Collected: ₹${displayTotalCollected.value.toLocaleString('en-IN')}\n`;
  text += `• This Month Draw Amount: ₹${displayNetDrawAmount.value.toLocaleString('en-IN')}\n`;
  text += `• Paid: ${displayPaidCount.value} / ${displayRows.value.length}\n`;
  text += `• Pending: ${displayPendingCount.value}\n`;
  navigator.clipboard.writeText(text);
  alert('Month statement summary copied to clipboard!');
};
</script>
