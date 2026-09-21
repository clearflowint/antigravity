<template>
  <div
    v-if="isOpen && share"
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
    @click.self="$emit('close')"
  >
    <!-- Simple White Page Type Popup to Screenshot on Demand -->
    <div
      id="printable-share-statement"
      class="bg-white text-slate-900 rounded-xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300"
    >
      <!-- Top Action Bar (Non-printed / controls) -->
      <div class="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
        <span class="text-slate-600 font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Official Share Statement &bull; Ready to Screenshot
        </span>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="copyStatementToClipboard"
            class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] transition-colors flex items-center gap-1"
          >
            <span>Copy Summary</span>
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
                MEMBER CHITTI STATEMENT
              </h2>
              <p class="text-xs text-slate-600 font-mono mt-0.5">
                Group: {{ chitti?.Chitti_Name || chitti?.Chitti_ID || 'Chitti Circle' }} ({{ chitti?.Chitti_ID || '' }})
              </p>
            </div>

            <!-- Share ID & Status Stamp -->
            <div class="text-right shrink-0">
              <span class="inline-block px-2 py-0.5 bg-slate-900 text-white text-xs font-mono font-bold rounded">
                Share #{{ String(share.Share_Number).padStart(2, '0') }}
              </span>
              <span
                class="block text-[10px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded border text-center font-mono"
                :class="share.Draw_Status === 'Drawn' ? 'bg-purple-50 text-purple-800 border-purple-300' : 'bg-amber-50 text-amber-800 border-amber-300'"
              >
                {{ share.Draw_Status === 'Drawn' ? `Drawn (Month ${share.Month_Drawn || '—'})` : 'Undrawn' }}
              </span>
            </div>
          </div>

          <!-- Member Details Row -->
          <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
            <div>
              <span class="text-[10px] text-slate-500 font-sans block uppercase">Member Name</span>
              <strong class="text-slate-900 font-sans text-sm">{{ share.Member_Name }}</strong>
            </div>
            <div>
              <span class="text-[10px] text-slate-500 font-sans block uppercase">Phone Number</span>
              <strong class="text-slate-900">{{ share.Phone || share.Phone_Number || '—' }}</strong>
            </div>
            <div class="col-span-2 sm:col-span-1">
              <span class="text-[10px] text-slate-500 font-sans block uppercase">Share ID</span>
              <strong class="text-slate-900 text-xs">{{ share.Share_ID }}</strong>
            </div>
          </div>
        </div>

        <!-- Financial Balance Summary Boxes -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
          <div class="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span class="text-[10px] font-sans text-slate-500 block uppercase font-semibold">Total Due</span>
            <strong class="text-slate-900 text-sm font-bold">₹{{ displayTotalDue.toLocaleString('en-IN') }}</strong>
          </div>

          <div class="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
            <span class="text-[10px] font-sans text-emerald-800 block uppercase font-semibold">Total Paid</span>
            <strong class="text-emerald-900 text-sm font-bold">₹{{ displayTotalPaid.toLocaleString('en-IN') }}</strong>
          </div>

          <div
            class="p-2 rounded-lg border"
            :class="displayOutstanding > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-700'"
          >
            <span class="text-[10px] font-sans block uppercase font-semibold" :class="displayOutstanding > 0 ? 'text-red-800' : 'text-slate-500'">
              Pending Dues
            </span>
            <strong class="text-sm font-bold">₹{{ displayOutstanding.toLocaleString('en-IN') }}</strong>
          </div>

          <div class="bg-blue-50 p-2 rounded-lg border border-blue-200">
            <span class="text-[10px] font-sans text-blue-800 block uppercase font-semibold">Advance Credit</span>
            <strong class="text-blue-900 text-sm font-bold">
              ₹{{ displayAdvanceCredit.toLocaleString('en-IN') }}
            </strong>
          </div>
        </div>

        <!-- Ledger Statement Table -->
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <table class="w-full text-left text-xs text-slate-800 font-mono">
            <thead class="bg-slate-100 text-slate-700 font-sans font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th class="py-2 px-2.5">Month</th>
                <th class="py-2 px-2.5">Status</th>
                <th class="py-2 px-2.5 text-right">Due Rate</th>
                <th class="py-2 px-2.5 text-right">Paid</th>
                <th class="py-2 px-2.5 text-right">Pending</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr
                v-for="txn in displayRecords"
                :key="txn.monthNumber"
                :class="txn.monthNumber === currentMonth ? 'bg-blue-50/70 font-semibold' : ''"
              >
                <td class="py-2 px-2.5">
                  <div class="flex items-center gap-1">
                    <span class="font-bold">M{{ txn.monthNumber }}</span>
                    <span v-if="txn.monthNumber === currentMonth" class="text-[9px] bg-blue-600 text-white px-1 py-0.2 rounded font-sans">
                      Active
                    </span>
                  </div>
                </td>

                <td class="py-2 px-2.5 font-sans text-[11px]">
                  <span
                    class="inline-block px-1.5 py-0.2 rounded font-medium text-[10px]"
                    :class="{
                      'bg-emerald-100 text-emerald-900': txn.paymentStatus === 'Paid' || txn.paymentStatus === 'Verified',
                      'bg-amber-100 text-amber-900': txn.paymentStatus === 'Partial',
                      'bg-red-100 text-red-900': txn.paymentStatus === 'Pending'
                    }"
                  >
                    {{ (txn.paymentStatus === 'Verified' || txn.paymentStatus === 'Paid') ? 'Paid' : txn.paymentStatus }}
                  </span>
                </td>

                <td class="py-2 px-2.5 text-right font-medium">
                  ₹{{ Number(txn.amountDue || 0).toLocaleString('en-IN') }}
                </td>

                <td class="py-2 px-2.5 text-right font-bold text-emerald-700">
                  ₹{{ Number(txn.amountPaid || 0).toLocaleString('en-IN') }}
                </td>

                <td
                  class="py-2 px-2.5 text-right font-bold"
                  :class="Number(txn.pendingDues || 0) > 0 ? 'text-red-700' : 'text-slate-400'"
                >
                  ₹{{ Number(txn.pendingDues || 0).toLocaleString('en-IN') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Screenshot Watermark & Footer Note -->
        <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Official Statement &bull; ClearFlow Architecture</span>
          <span>Anchor: {{ chitti?.Cycle_Anchor_Day || '10th' }}</span>
        </div>
      </div>

      <!-- Modal Bottom Actions -->
      <div class="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <span class="text-xs text-slate-500">
          Tip: Take a screenshot to share
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
import { calculateShareStatementData } from '../composables/chitti_math_engine';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  share: {
    type: Object,
    default: null
  },
  chitti: {
    type: Object,
    default: () => ({})
  },
  statement: {
    type: Array,
    default: () => []
  },
  currentMonth: {
    type: Number,
    default: 1
  },
  preloadedData: {
    type: Object,
    default: null
  }
});

defineEmits(['close']);

// Preloaded JSON statement from math engine or computed fallback
const statementSnippet = computed(() => {
  if (props.preloadedData) return props.preloadedData;
  return calculateShareStatementData({
    chitti: props.chitti,
    share: props.share,
    statement: props.statement,
    currentMonth: props.currentMonth
  });
});

const displayTotalDue = computed(() => statementSnippet.value?.totalDue ?? 0);
const displayTotalPaid = computed(() => statementSnippet.value?.totalPaid ?? 0);
const displayOutstanding = computed(() => statementSnippet.value?.outstandingBalance ?? 0);
const displayAdvanceCredit = computed(() => statementSnippet.value?.advanceCredit ?? 0);
const displayRecords = computed(() => statementSnippet.value?.records ?? []);

const copyStatementToClipboard = () => {
  if (statementSnippet.value?.summaryText) {
    navigator.clipboard.writeText(statementSnippet.value.summaryText);
    alert('Statement summary copied to clipboard!');
    return;
  }
  if (!props.share) return;
  let text = `📄 *CLEARFLOW CHITTI STATEMENT*\n`;
  text += `Member: ${props.share.Member_Name} (#${props.share.Share_Number})\n`;
  text += `Share ID: ${props.share.Share_ID}\n`;
  text += `Group: ${props.chitti?.Chitti_Name || props.chitti?.Chitti_ID || ''}\n`;
  text += `Draw Status: ${props.share.Draw_Status}\n\n`;
  text += `• Total Due: ₹${displayTotalDue.value.toLocaleString('en-IN')}\n`;
  text += `• Total Paid: ₹${displayTotalPaid.value.toLocaleString('en-IN')}\n`;
  text += `• Pending Dues: ₹${displayOutstanding.value.toLocaleString('en-IN')}\n`;
  text += `• Advance Credit: ₹${displayAdvanceCredit.value.toLocaleString('en-IN')}\n\n`;
  text += `Cycle Month: M${props.currentMonth}\n`;
  navigator.clipboard.writeText(text);
  alert('Statement summary copied to clipboard!');
};
</script>
