<template>
  <div
    :id="`share-card-${share.Share_ID}`"
    class="bg-slate-900/90 border rounded-xl p-2.5 sm:p-3 transition-all shadow-sm space-y-2 hover:border-slate-700"
    :class="cardBorderClass"
  >
    <!-- Top Row: Member Name (Dominant) with Small Share ID underneath -->
    <div class="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-800/80">
      <div class="min-w-0 flex-1">
        <!-- Member Name prominently + Distinct Draw Status Pill (Different from Money Green) -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <h4 class="font-bold text-slate-100 text-sm leading-tight truncate">
            {{ share.Member_Name }}
          </h4>
          <!-- Distinct Drawn (Violet) vs Undrawn (Amber/Warm) Colors - 15% bigger -->
          <span
            class="text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 leading-tight font-sans tracking-wide"
            :class="isDrawn
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'"
          >
            {{ isDrawn ? 'Drawn' : 'Undrawn' }}
          </span>
        </div>

        <!-- Small under the name: Share Number, Draw details & Change toggle in normal text -->
        <div class="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 flex-wrap">
          <span class="font-mono text-slate-300 font-semibold">
            #{{ String(share.Share_Number).padStart(2, '0') }}
          </span>
          <span class="text-slate-600">&bull;</span>
          <!-- If Drawn, show drawn month and payout with bigger text without saying Got -->
          <span v-if="isDrawn && (share.Won_Cycle_Month || share.Month_Drawn)" class="text-purple-300 font-mono text-xs font-bold">
            M{{ share.Won_Cycle_Month || share.Month_Drawn }} &bull; ₹{{ (share.Prize_Amount_Received || drawnPayoutAmount).toLocaleString('en-IN') }}
          </span>
          <span v-else class="text-slate-400 text-[11px]">
            Undrawn
          </span>
          <span class="text-slate-600">&bull;</span>
          <button
            type="button"
            @click="toggleEditDraw"
            class="text-[11px] text-blue-400 hover:text-blue-300 underline decoration-dotted transition-colors"
          >
            Change Status
          </button>
        </div>
      </div>

      <!-- One-Click ShareID Full Statement View (Clean White Popup) -->
      <button
        type="button"
        @click="$emit('statement', share.Share_ID)"
        class="text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 shrink-0 mt-0.5"
        title="View Full Member Statement"
      >
        <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <span>Statement</span>
      </button>
    </div>

    <!-- Inline Draw Status Editor (collapsible when 'Change Status' is clicked) -->
    <div
      v-if="showDrawEditor"
      class="bg-slate-950 p-2 rounded-lg border border-slate-700 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150"
    >
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-slate-400 text-[10px] font-bold uppercase">Status:</span>
        <select
          v-model="editDrawStatus"
          class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
        >
          <option value="Undrawn">Undrawn</option>
          <option value="Drawn">Drawn</option>
        </select>

        <div v-if="editDrawStatus === 'Drawn'" class="flex items-center gap-1">
          <span class="text-slate-400 text-[10px]">Drawn in:</span>
          <select
            v-model.number="editDrawMonth"
            class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 font-mono"
          >
            <option v-for="m in availableDrawMonths" :key="m" :value="m">
              Month {{ m }} &bull; {{ getMonthYearStr(m) }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="saveDrawStatus"
          class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-2 py-0.5 rounded transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          @click="showDrawEditor = false"
          class="text-slate-400 hover:text-slate-200 text-[10px] px-1.5 py-0.5 rounded"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Middle Row: Financial Calculations with Strict Color Rules -->
    <!-- Pending Red | Advance Blue | Pending 0 same present color -->
    <div class="flex items-center justify-between gap-2 text-xs py-0.5">
      <div class="flex items-baseline gap-1.5">
        <!-- If pending > 0: Show ONLY Pending Amount in RED -->
        <template v-if="pendingDues > 0">
          <span class="text-slate-400 text-xs">Pending:</span>
          <span class="text-sm sm:text-base font-bold text-red-500 font-mono tracking-tight">
            ₹{{ pendingDues.toLocaleString('en-IN') }}
          </span>
        </template>

        <!-- Else if advance > 0: Show ONLY Advance Amount in BLUE -->
        <template v-else-if="advanceCredit > 0">
          <span class="text-slate-400 text-xs">Advance:</span>
          <span class="text-sm sm:text-base font-bold text-blue-400 font-mono tracking-tight">
            ₹{{ advanceCredit.toLocaleString('en-IN') }}
          </span>
        </template>

        <!-- Else (no pending, no advance): Show pending 0 in same present slate color -->
        <template v-else>
          <span class="text-slate-400 text-xs">Pending:</span>
          <span class="text-xs font-semibold text-slate-400 font-mono">
            ₹0
          </span>
        </template>
      </div>

      <!-- Right status tag: Paid (Green) / Advance (Blue) / Due (Red) -->
      <span
        v-if="pendingDues === 0"
        class="text-[10px] font-mono px-2 py-0.5 rounded-full"
        :class="advanceCredit > 0 ? 'text-blue-400 bg-blue-500/15 border border-blue-500/20 font-medium' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'"
      >
        {{ advanceCredit > 0 ? 'Advance Buffer' : '✓ Paid' }}
      </span>
      <span
        v-else
        class="text-[10px] font-mono font-bold text-red-400 bg-red-500/15 border border-red-500/20 px-2 py-0.5 rounded-full"
      >
        ⚠ Due
      </span>
    </div>

    <!-- Bottom Row: Clean Amount Field (No incremental/decremental controls) with Dropdown option Credit/Debit -->
    <div class="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/60">
      <div class="flex items-center gap-1.5 flex-1 min-w-0">
        <!-- Dropdown Credit/Debit (Default + Credit) -->
        <select
          v-model="entryType"
          class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-blue-500 shrink-0"
        >
          <option value="Credit">+ Credit</option>
          <option value="Debit">- Debit</option>
        </select>

        <!-- Amount input field: Clean direct entry with NO incremental or decremental spinners/arrows -->
        <div class="relative flex-1 max-w-[170px]">
          <input
            type="number"
            v-model.number="enteredAmount"
            :placeholder="pendingDues > 0 ? `₹${pendingDues}` : '₹ Amount'"
            @keyup.enter="promptRecordPayment"
            min="1"
            class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 leading-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      <!-- Record Button (Asks for confirmation in popup before recording) -->
      <button
        type="button"
        @click="promptRecordPayment"
        :disabled="!enteredAmount || enteredAmount <= 0 || isSubmitting"
        class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0"
        :class="entryType === 'Credit'
          ? 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:hover:bg-blue-600 shadow-sm'
          : 'bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:hover:bg-rose-600 shadow-sm'"
      >
        <span v-if="!isSubmitting">{{ entryType === 'Credit' ? '+ Record' : '- Record' }}</span>
        <span v-else class="text-[10px]">...</span>
      </button>
    </div>

    <!-- Confirmation Popup for Recording Payment -->
    <div
      v-if="showRecordConfirmModal"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      @click.self="showRecordConfirmModal = false"
    >
      <div class="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5 max-w-sm w-full space-y-3.5 shadow-2xl text-left">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
              :class="entryType === 'Credit' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'"
            >
              {{ entryType === 'Credit' ? '+' : '-' }}
            </div>
            <h3 class="font-bold text-slate-100 text-sm">Confirm Record</h3>
          </div>
          <button
            type="button"
            @click="showRecordConfirmModal = false"
            class="text-slate-400 hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div class="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Member:</span>
            <span class="font-bold text-slate-200">{{ share.Member_Name }} (#{{ String(share.Share_Number).padStart(2, '0') }})</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Month:</span>
            <span class="font-mono text-slate-300">Month {{ monthNumber }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Type:</span>
            <span
              class="font-bold px-1.5 py-0.5 rounded text-[10px]"
              :class="entryType === 'Credit' ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'"
            >
              {{ entryType === 'Credit' ? '+ Credit' : '- Debit' }}
            </span>
          </div>
          <div class="flex justify-between items-center pt-1.5 border-t border-slate-800">
            <span class="text-slate-300 font-medium">Amount:</span>
            <span
              class="font-mono font-bold text-base"
              :class="entryType === 'Credit' ? 'text-blue-400' : 'text-rose-400'"
            >
              ₹{{ Number(enteredAmount).toLocaleString('en-IN') }}
            </span>
          </div>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed">
          Are you sure you want to record this {{ entryType.toLowerCase() }} of <strong class="text-slate-100">₹{{ Number(enteredAmount).toLocaleString('en-IN') }}</strong>?
        </p>

        <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            @click="showRecordConfirmModal = false"
            class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmAndRecordPayment"
            :disabled="isSubmitting"
            class="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
            :class="entryType === 'Credit' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'"
          >
            Confirm &amp; Record
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { calculateMonthMath, normalizeChittiParams } from '../composables/chitti_math_engine';

const props = defineProps({
  share: { type: Object, required: true },
  transaction: { type: Object, default: null },
  chitti: { type: Object, default: () => ({}) },
  month: { type: Number, default: 1 }
});

const emit = defineEmits(['record-payment', 'draw-updated', 'statement']);

const isDrawn = computed(() => props.share?.Draw_Status === 'Drawn');
const monthNumber = computed(() => props.month || props.transaction?.Month_Number || 1);
const totalMonths = computed(() => Number(props.chitti?.Total_Months || 20));

// Financial calculations strictly driven by math engine normalization
const calculatedDue = computed(() => {
  if (props.transaction?.Amount_Due !== undefined) {
    return Number(props.transaction.Amount_Due);
  }
  const norm = normalizeChittiParams(props.chitti);
  return isDrawn.value ? norm.D_drawn : norm.D_undrawn;
});

const amountPaid = computed(() => Number(props.transaction?.Amount_Paid || 0));

const pendingDues = computed(() => {
  if (props.transaction?.Pending_Dues !== undefined) {
    return Number(props.transaction.Pending_Dues);
  }
  return Math.max(0, calculatedDue.value - amountPaid.value);
});

const advanceCredit = computed(() => Number(props.share?.Advance_Credit || 0));

const isPaid = computed(() => {
  return props.transaction?.Payment_Status === 'Paid' || props.transaction?.Payment_Status === 'Verified' || (amountPaid.value >= calculatedDue.value && calculatedDue.value > 0);
});

const isPartial = computed(() => {
  return !isPaid.value && amountPaid.value > 0;
});

const cardBorderClass = computed(() => {
  if (isPaid.value) return 'border-emerald-500/30';
  if (pendingDues.value > 0) return 'border-red-500/20';
  return 'border-slate-800';
});

// Dynamic draw amount when drawn in Month M_d: W(M_d) = P(M_d) - C
const drawnPayoutAmount = computed(() => {
  if (!isDrawn.value || !props.share?.Month_Drawn) return 0;
  const drawnM = Number(props.share.Month_Drawn);
  const mathResult = calculateMonthMath(props.chitti, drawnM);
  return mathResult.net_payout;
});

// Amount entry state
const entryType = ref('Credit');
const enteredAmount = ref(null);
const isSubmitting = ref(false);
const showRecordConfirmModal = ref(false);

const promptRecordPayment = () => {
  if (!enteredAmount.value || enteredAmount.value <= 0) return;
  showRecordConfirmModal.value = true;
};

const confirmAndRecordPayment = () => {
  if (!enteredAmount.value || enteredAmount.value <= 0) return;
  isSubmitting.value = true;
  try {
    emit('record-payment', {
      shareId: props.share.Share_ID,
      monthNumber: monthNumber.value,
      amount: Number(enteredAmount.value),
      entryType: entryType.value,
      paymentMode: 'UPI'
    });
    enteredAmount.value = null;
    showRecordConfirmModal.value = false;
  } finally {
    isSubmitting.value = false;
  }
};

// Inline Draw Status Editing
const showDrawEditor = ref(false);
const editDrawStatus = ref('Undrawn');
const editDrawMonth = ref(1);

// Current official cycle month: future months must not be selectable until cycle passes officially
const currentOfficialMonth = computed(() => {
  return Number(props.chitti?.Current_Month || props.month || 1);
});

const getMonthYearStr = (m) => {
  const startYear = 2026;
  const startMonthIndex = 0; // Jan is index 0
  const totalOffset = startMonthIndex + (Number(m) - 1);
  const year = startYear + Math.floor(totalOffset / 12);
  const mIdx = ((totalOffset % 12) + 12) % 12;
  const d = new Date(year, mIdx, 1);
  const m3 = d.toLocaleString('en-US', { month: 'short' });
  return `${m3}${year}`;
};

// Available Draw Months: strictly up to the current official cycle month (plus currently assigned month if already set)
const availableDrawMonths = computed(() => {
  const officialMax = currentOfficialMonth.value;
  const existingDrawnMonth = Number(props.share?.Month_Drawn || 0);
  const maxMonth = Math.min(totalMonths.value, Math.max(officialMax, existingDrawnMonth));
  const list = [];
  for (let m = 1; m <= maxMonth; m++) {
    list.push(m);
  }
  return list.length > 0 ? list : [1];
});

const toggleEditDraw = () => {
  editDrawStatus.value = props.share.Draw_Status || 'Undrawn';
  const initialMonth = Number(props.share.Month_Drawn || currentOfficialMonth.value);
  editDrawMonth.value = availableDrawMonths.value.includes(initialMonth)
    ? initialMonth
    : (availableDrawMonths.value[availableDrawMonths.value.length - 1] || 1);
  showDrawEditor.value = !showDrawEditor.value;
};

const saveDrawStatus = () => {
  const isNowDrawn = editDrawStatus.value === 'Drawn';
  emit('draw-updated', {
    shareId: props.share.Share_ID,
    isDrawn: isNowDrawn,
    winningMonth: isNowDrawn ? Number(editDrawMonth.value) : null
  });
  showDrawEditor.value = false;
};

watch(
  () => props.share,
  (newShare) => {
    if (newShare) {
      editDrawStatus.value = newShare.Draw_Status || 'Undrawn';
      const initialMonth = Number(newShare.Month_Drawn || currentOfficialMonth.value);
      editDrawMonth.value = availableDrawMonths.value.includes(initialMonth)
        ? initialMonth
        : (availableDrawMonths.value[availableDrawMonths.value.length - 1] || 1);
    }
  },
  { immediate: true, deep: true }
);
</script>
