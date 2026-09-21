<template>
  <div
    v-if="isOpen"
    id="payment-touch-drawer"
    class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
  >
    <!-- Slide-Up Drawer Container -->
    <div
      class="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto"
    >
      <!-- Top Pull Bar & Close -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border"
            :class="share?.Draw_Status === 'Drawn'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'"
          >
            #{{ String(share?.Share_Number || 0).padStart(2, '0') }}
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
              {{ share?.Member_Name }}
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                :class="share?.Draw_Status === 'Drawn' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'"
              >
                {{ share?.Draw_Status }}
              </span>
            </h3>
            <span class="text-[11px] text-slate-400 font-mono">{{ share?.Share_ID }} &bull; {{ share?.Phone }}</span>
          </div>
        </div>

        <button
          type="button"
          @click="$emit('close')"
          class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-base"
        >
          &times;
        </button>
      </div>

      <!-- Financial Snapshot Bar -->
      <div class="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
        <div>
          <span class="text-[10px] text-slate-400 block uppercase font-bold">Month {{ month }} Due</span>
          <strong class="text-slate-100 font-mono text-sm">₹{{ dueAmount.toLocaleString('en-IN') }}</strong>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 block uppercase font-bold">Already Paid</span>
          <strong class="text-emerald-400 font-mono text-sm">₹{{ alreadyPaid.toLocaleString('en-IN') }}</strong>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 block uppercase font-bold">Remaining Due</span>
          <strong class="text-rose-400 font-mono text-sm">₹{{ remainingDue.toLocaleString('en-IN') }}</strong>
        </div>
      </div>

      <!-- Advance Credit Balance Notice (If any) -->
      <div
        v-if="advanceCredit > 0"
        class="bg-blue-950/40 border border-blue-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs"
      >
        <span class="text-blue-300 font-medium">Held in Advance Credit Reserve:</span>
        <strong class="text-blue-400 font-mono font-bold">₹{{ advanceCredit.toLocaleString('en-IN') }}</strong>
      </div>

      <!-- Custom Amount Input Field (No incremental/decremental controls) -->
      <div class="space-y-1.5">
        <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Payment Amount (₹) <span class="text-rose-400">*</span>
        </label>
        <div class="relative">
          <span class="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold">₹</span>
          <input
            v-model.number="amount"
            type="number"
            min="1"
            placeholder="Enter payment amount"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-slate-100 font-mono text-base font-bold focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      <!-- SMART OVER/UNDER WARNING MODALS / BANNERS -->
      <div
        v-if="amount && amount > remainingDue"
        class="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-300 space-y-1 animate-in fade-in"
      >
        <div class="font-bold flex items-center gap-1.5">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Over-Payment Detected (+₹{{ (amount - remainingDue).toLocaleString('en-IN') }})</span>
        </div>
        <p class="text-[11px] text-slate-300">
          Month {{ month }} due of ₹{{ remainingDue.toLocaleString('en-IN') }} will be marked Verified. The excess <strong class="text-emerald-400">₹{{ (amount - remainingDue).toLocaleString('en-IN') }}</strong> will automatically deposit into Advance Credit Reserve for upcoming cycles!
        </p>
      </div>

      <div
        v-else-if="amount && amount < remainingDue"
        class="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3 text-xs text-amber-300 space-y-1 animate-in fade-in"
      >
        <div class="font-bold flex items-center gap-1.5">
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span>Partial Payment (-₹{{ (remainingDue - amount).toLocaleString('en-IN') }} Shortfall)</span>
        </div>
        <p class="text-[11px] text-slate-300">
          Recording ₹{{ amount.toLocaleString('en-IN') }}. A remaining balance of <strong class="text-amber-400">₹{{ (remainingDue - amount).toLocaleString('en-IN') }}</strong> will stay pending on this share for Month {{ month }}.
        </p>
      </div>

      <!-- Payment Mode & Reference -->
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label class="block text-[11px] text-slate-400 font-bold uppercase mb-1">Mode</label>
          <select
            v-model="paymentMode"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="UPI">UPI (GPay / PhonePe)</option>
            <option value="Cash">Cash (Hand-to-Hand)</option>
            <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] text-slate-400 font-bold uppercase mb-1">Reference Note</label>
          <input
            v-model="paymentRef"
            type="text"
            placeholder="Optional Txn/UTR ID"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
          />
        </div>
      </div>

      <!-- RIGHT-THUMB GUARDRAIL: Confirm Button disabled until digits entered -->
      <div class="pt-2">
        <button
          type="button"
          :disabled="!isValidAmount"
          @click="submitPayment"
          class="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
          :class="isValidAmount
            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-[0.98]'
            : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'"
        >
          <svg v-if="isValidAmount" class="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>
            {{ isValidAmount ? `Confirm Payment of ₹${amount.toLocaleString('en-IN')}` : 'Enter Amount to Enable Payment' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  share: { type: Object, default: null },
  transaction: { type: Object, default: null },
  chitti: { type: Object, default: null },
  month: { type: Number, default: 1 }
});

const emit = defineEmits(['close', 'confirmed']);

const amount = ref(null);
const paymentMode = ref('UPI');
const paymentRef = ref('');

const dueAmount = computed(() => {
  if (props.transaction?.Amount_Due !== undefined) {
    return Number(props.transaction.Amount_Due);
  }
  const isDrawn = props.share?.Draw_Status === 'Drawn';
  return isDrawn ? Number(props.chitti?.Drawn_Due || 6000) : Number(props.chitti?.Undrawn_Due || 5000);
});

const alreadyPaid = computed(() => Number(props.transaction?.Amount_Paid || 0));
const remainingDue = computed(() => Math.max(0, dueAmount.value - alreadyPaid.value));
const advanceCredit = computed(() => Number(props.share?.Advance_Credit || 0));

const undrawnDue = computed(() => Number(props.chitti?.Undrawn_Due || 5000));
const drawnDue = computed(() => Number(props.chitti?.Drawn_Due || 6000));

// Right-Thumb Guardrail: stays disabled by default, activates only when valid positive digits are entered
const isValidAmount = computed(() => {
  return typeof amount.value === 'number' && !isNaN(amount.value) && amount.value > 0;
});

const setAmount = (val) => {
  amount.value = Number(val);
};

// Reset form on open
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      amount.value = remainingDue.value > 0 ? remainingDue.value : null;
      paymentMode.value = 'UPI';
      paymentRef.value = '';
    }
  }
);

const submitPayment = () => {
  if (!isValidAmount.value || !props.share) return;

  emit('confirmed', {
    shareId: props.share.Share_ID,
    monthNumber: props.month,
    amount: amount.value,
    paymentMode: paymentMode.value,
    paymentRef: paymentRef.value,
    entryType: 'Credit'
  });

  emit('close');
};
</script>
