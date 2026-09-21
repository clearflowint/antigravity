<template>
  <div id="draw-control-panel" class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
    <!-- Header: Current Draw Status & Countdown -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Live Reverse Auction
          </span>
          <span class="text-xs text-slate-400">Month {{ cycle?.month }} of {{ chit?.totalMonths }}</span>
        </div>
        <h2 class="text-xl font-bold text-slate-100">Draw & Auction Engine</h2>
        <p class="text-xs text-slate-400 mt-0.5">
          Eligible non-prized members submit reverse bids to claim the pool prize early.
        </p>
      </div>

      <!-- Quick Stats Pill -->
      <div class="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800/80 text-xs">
        <div>
          <span class="text-slate-400 block text-[10px]">Chit Pool Value</span>
          <span class="text-sm font-bold text-slate-100">₹{{ (chit?.chitValue || 200000).toLocaleString('en-IN') }}</span>
        </div>
        <div class="h-6 w-px bg-slate-800"></div>
        <div>
          <span class="text-slate-400 block text-[10px]">Foreman Fee (5%)</span>
          <span class="text-sm font-bold text-clearflow-blue">₹{{ ((chit?.chitValue || 200000) * 0.05).toLocaleString('en-IN') }}</span>
        </div>
      </div>
    </div>

    <!-- Math Simulation Card (Real-time recalculation as bid changes) -->
    <div class="bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl p-4 border border-slate-800 relative overflow-hidden">
      <div class="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
        <span>Leading Bid Math Distribution</span>
        <span class="text-emerald-400 font-mono text-[11px]">Formula: (Bid - 5% Fee) / 20 = Dividend</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
          <span class="text-[10px] text-slate-400 block mb-0.5">Highest Discount Bid</span>
          <span class="text-base font-bold text-purple-300">₹{{ currentLeadingBid.toLocaleString('en-IN') }}</span>
        </div>

        <div class="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
          <span class="text-[10px] text-slate-400 block mb-0.5">Prize to Winner</span>
          <span class="text-base font-bold text-emerald-400">₹{{ calculatedPrize.toLocaleString('en-IN') }}</span>
        </div>

        <div class="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
          <span class="text-[10px] text-slate-400 block mb-0.5">Total Dividend Pool</span>
          <span class="text-base font-bold text-blue-400">₹{{ calculatedDividendPool.toLocaleString('en-IN') }}</span>
        </div>

        <div class="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
          <span class="text-[10px] text-slate-400 block mb-0.5">Dividend per Member</span>
          <span class="text-base font-bold text-clearflow-surplus">₹{{ calculatedDividendPerShare.toLocaleString('en-IN') }}</span>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span class="text-slate-400">
          Net Monthly Installment for each member:
          <strong class="text-slate-200 ml-1">₹{{ (chit.grossInstallment - calculatedDividendPerShare).toLocaleString('en-IN') }}</strong>
          (Gross ₹{{ chit.grossInstallment.toLocaleString('en-IN') }} - Dividend ₹{{ calculatedDividendPerShare.toLocaleString('en-IN') }})
        </span>
      </div>
    </div>

    <!-- Two Column: Submit Bid (Left) & Active Live Bids (Right) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Bid Submission Form -->
      <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
            <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Submit Reverse Auction Bid
          </h3>
          <p class="text-xs text-slate-400 mb-4">
            Discount range permitted: ₹{{ minBid.toLocaleString('en-IN') }} to ₹{{ maxBid.toLocaleString('en-IN') }}
          </p>

          <div class="space-y-3">
            <!-- Share Picker -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Select Bidding Share</label>
              <select
                id="select-bidding-share"
                v-model="selectedShareId"
                class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-clearflow-blue"
              >
                <option
                  v-for="s in eligibleShares"
                  :key="s.id"
                  :value="s.id"
                >
                  Share #{{ String(s.id).padStart(2, '0') }} - {{ s.memberName }}
                </option>
              </select>
            </div>

            <!-- Bid Discount Amount -->
            <div>
              <div class="flex justify-between items-center text-xs mb-1">
                <label class="font-semibold text-slate-300">Discount Bid (₹)</label>
                <span class="text-purple-400 font-bold">Prize: ₹{{ (chit.chitValue - bidInput).toLocaleString('en-IN') }}</span>
              </div>
              <input
                id="input-bid-amount"
                v-model.number="bidInput"
                type="number"
                :min="minBid"
                :max="maxBid"
                step="1000"
                class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-purple-500"
              />
              <div class="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  v-for="preset in [25000, 30000, 35000, 40000]"
                  :key="preset"
                  @click="bidInput = preset"
                  class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                >
                  ₹{{ (preset / 1000) }}k
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            id="btn-submit-bid"
            @click="handleSubmitBid"
            :disabled="!selectedShareId || bidInput < minBid || bidInput > maxBid"
            class="w-full py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs shadow transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Place Bid of ₹{{ bidInput.toLocaleString('en-IN') }}
          </button>
        </div>
      </div>

      <!-- Live Bids Table & Finalize Action -->
      <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              Live Auction Bids ({{ activeBids.length }})
            </h3>
            <span class="text-[11px] text-slate-400">Ranked by highest discount</span>
          </div>

          <!-- Bids List -->
          <div class="space-y-2 max-h-52 overflow-y-auto pr-1">
            <div
              v-for="(bid, idx) in sortedBids"
              :key="bid.shareId"
              :class="idx === 0 ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-800 bg-slate-900/60'"
              class="p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all"
            >
              <div class="flex items-center gap-2">
                <span
                  :class="idx === 0 ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-300 font-medium'"
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                >
                  {{ idx + 1 }}
                </span>
                <div>
                  <span class="font-bold text-slate-200">Share #{{ String(bid.shareId).padStart(2, '0') }}</span>
                  <span class="text-slate-400 ml-1.5">({{ bid.memberName }})</span>
                </div>
              </div>

              <div class="text-right">
                <span class="font-mono font-bold text-slate-100 text-sm">₹{{ bid.bidDiscount.toLocaleString('en-IN') }}</span>
                <span class="text-[10px] text-slate-400 block">{{ bid.timestamp || 'Live' }}</span>
              </div>
            </div>

            <div v-if="sortedBids.length === 0" class="text-center py-6 text-slate-500 text-xs">
              No bids submitted yet for this cycle.
            </div>
          </div>
        </div>

        <!-- Manager Draw Finalization Action -->
        <div class="mt-4 pt-3 border-t border-slate-800 space-y-2">
          <div v-if="isManager" class="space-y-2">
            <button
              type="button"
              id="btn-finalize-draw"
              @click="handleFinalizeDraw"
              :disabled="sortedBids.length === 0"
              class="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Award Prize to Leading Bidder (Share #{{ sortedBids[0]?.shareId || '?' }})
            </button>
            <p class="text-[10px] text-slate-500 text-center">
              Manager privilege: Closes draw, allocates ₹{{ calculatedPrize.toLocaleString('en-IN') }} prize money, and advances to next cycle.
            </p>
          </div>
          <div v-else class="text-center p-2 rounded bg-slate-900 text-slate-400 text-xs">
            Draw will be concluded by Manager upon auction cutoff.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  chit: {
    type: Object,
    required: true
  },
  cycle: {
    type: Object,
    required: true
  },
  shares: {
    type: Array,
    required: true
  },
  activeBids: {
    type: Array,
    default: () => []
  },
  isManager: {
    type: Boolean,
    default: false
  },
  currentShareId: {
    type: String,
    default: '4'
  }
});

const emit = defineEmits(['submit-bid', 'finalize-draw']);

const minBid = computed(() => (props.chit?.chitValue || 200000) * 0.05);
const maxBid = computed(() => (props.chit?.chitValue || 200000) * (props.chit?.maxBidDiscountRate || 0.30));

const eligibleShares = computed(() => {
  return props.shares.filter((s) => !s.isPrized);
});

const selectedShareId = ref(props.currentShareId || '4');
const bidInput = ref(34000);

const sortedBids = computed(() => {
  return [...props.activeBids].sort((a, b) => b.bidDiscount - a.bidDiscount);
});

const currentLeadingBid = computed(() => {
  if (sortedBids.value.length > 0) {
    return sortedBids.value[0].bidDiscount;
  }
  return bidInput.value;
});

const commission = computed(() => {
  return (props.chit?.chitValue || 200000) * (props.chit?.foremanCommissionRate || 0.05);
});

const calculatedPrize = computed(() => {
  return (props.chit?.chitValue || 200000) - currentLeadingBid.value;
});

const calculatedDividendPool = computed(() => {
  return Math.max(0, currentLeadingBid.value - commission.value);
});

const calculatedDividendPerShare = computed(() => {
  return Math.round(calculatedDividendPool.value / 20);
});

const handleSubmitBid = () => {
  if (!selectedShareId.value) return;
  emit('submit-bid', {
    shareId: selectedShareId.value,
    bidDiscount: bidInput.value
  });
};

const handleFinalizeDraw = () => {
  if (sortedBids.value.length === 0) return;
  const winner = sortedBids.value[0];
  emit('finalize-draw', {
    month: props.cycle?.month || 5,
    winningShareId: winner.shareId,
    winningBidDiscount: winner.bidDiscount
  });
};
</script>
