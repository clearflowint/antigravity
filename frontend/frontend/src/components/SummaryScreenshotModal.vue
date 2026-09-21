<template>
  <div
    v-if="isOpen"
    id="summary-screenshot-modal"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
  >
    <div
      class="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
    >
      <!-- Modal Top Controls -->
      <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-200">
            WhatsApp Screenshot Card &bull; Month {{ month }}
          </h3>
        </div>
        <button
          type="button"
          @click="$emit('close')"
          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
        >
          &times;
        </button>
      </div>

      <!-- Scrollable Preview Area -->
      <div class="p-4 overflow-y-auto space-y-4">
        <!-- Visual Screenshot-Ready Card (High Contrast for Image Capture) -->
        <div
          id="whatsapp-summary-card"
          class="bg-slate-950 border-2 border-blue-500/40 rounded-xl p-5 text-slate-100 shadow-xl space-y-4 relative"
        >
          <!-- ClearFlow Header Bar -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-black text-xs text-white">
                CF
              </div>
              <div>
                <span class="text-[10px] uppercase font-mono tracking-widest text-blue-400 block font-bold">
                  ClearFlow Automations
                </span>
                <h2 class="text-base font-black text-white leading-none">
                  {{ chitti?.Chitti_Name || 'Chitti Circle' }}
                </h2>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Cycle Month {{ month }}/{{ chitti?.Total_Months || 20 }}
              </span>
              <span class="text-[9px] text-slate-400 block mt-0.5">
                Anchor: {{ chitti?.Cycle_Anchor_Day || '10th to 10th' }}
              </span>
            </div>
          </div>

          <!-- Key Financial Highlights Grid -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-400 block uppercase font-bold">Gross Pool Target</span>
              <strong class="text-emerald-400 font-mono text-sm">
                ₹{{ metrics.expectedCollection.toLocaleString('en-IN') }}
              </strong>
            </div>
            <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-400 block uppercase font-bold">Total Collected</span>
              <strong class="text-slate-100 font-mono text-sm">
                ₹{{ metrics.totalCollected.toLocaleString('en-IN') }} ({{ metrics.collectionRate }}%)
              </strong>
            </div>
            <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-400 block uppercase font-bold">Winner Net Payout W({{ month }})</span>
              <strong class="text-amber-400 font-mono text-sm">
                ₹{{ metrics.netPayout.toLocaleString('en-IN') }}
              </strong>
            </div>
            <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-400 block uppercase font-bold">Pending Dues Balance</span>
              <strong class="text-rose-400 font-mono text-sm">
                ₹{{ metrics.pendingCollection.toLocaleString('en-IN') }}
              </strong>
            </div>
          </div>

          <!-- Pending Shares List (If any) -->
          <div v-if="pendingShares.length > 0" class="space-y-1.5 pt-1">
            <span class="text-[11px] font-bold text-amber-300 block uppercase tracking-wider">
              Pending Member Installments ({{ pendingShares.length }}):
            </span>
            <div class="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 max-h-36 overflow-y-auto space-y-1 text-xs">
              <div
                v-for="s in pendingShares"
                :key="s.Share_ID"
                class="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0 font-mono text-[11px]"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-blue-400 font-bold">#{{ String(s.Share_Number).padStart(2, '0') }}</span>
                  <span class="text-slate-200 truncate max-w-[140px]">{{ s.Member_Name }}</span>
                </div>
                <span class="text-rose-400 font-bold">Due: ₹{{ (s.dueAmount || s.pendingAmount || 0).toLocaleString('en-IN') }}</span>
              </div>
            </div>
          </div>
          <div v-else class="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3 text-center text-xs text-emerald-300 font-bold">
            &check; 100% Complete Collection! All {{ chitti?.Total_Members || 20 }} Shares Verified for Month {{ month }}.
          </div>

          <!-- Confidentiality Footer -->
          <div class="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[9px] text-slate-400">
            <span>Confidential Chit Fund Ledger</span>
            <span class="font-mono uppercase font-bold text-blue-400">POWERED BY CLEARFLOW AUTOMATIONS</span>
          </div>
        </div>

        <!-- Copyable WhatsApp Text Box -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-300">
            Formatted WhatsApp Broadcast Text:
          </label>
          <textarea
            readonly
            :value="whatsAppMessageText"
            rows="5"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none"
          ></textarea>
        </div>
      </div>

      <!-- Footer Action Buttons -->
      <div class="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2">
        <button
          type="button"
          @click="copyText"
          class="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
        >
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
          </svg>
          <span>{{ copied ? 'Copied Text!' : 'Copy WhatsApp Text' }}</span>
        </button>

        <a
          :href="`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppMessageText)}`"
          target="_blank"
          rel="noopener noreferrer"
          class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.665-.699c.97.53 2.019.82 3.125.82 3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.761 0-3.411-.458-4.851-1.258l-5.149 1.35 1.375-5.02c-.896-1.503-1.375-3.238-1.375-5.072 0-5.514 4.486-10 10-10s10 4.486 10 10z"/>
          </svg>
          <span>Open in WhatsApp</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  chitti: { type: Object, default: () => ({}) },
  month: { type: Number, default: 1 },
  metrics: { type: Object, default: () => ({}) },
  shares: { type: Array, default: () => [] },
  transactions: { type: Array, default: () => [] }
});

defineEmits(['close']);

const copied = ref(false);

const pendingShares = computed(() => {
  const pendingTxns = props.transactions.filter(
    (t) => t.Payment_Status !== 'Verified' && t.Payment_Status !== 'Paid'
  );

  return pendingTxns.map((t) => {
    const s = props.shares.find((share) => share.Share_ID === t.Share_ID) || {};
    return {
      Share_ID: t.Share_ID,
      Share_Number: s.Share_Number || 0,
      Member_Name: s.Member_Name || 'Unknown',
      pendingAmount: Number(t.Pending_Dues || t.Amount_Due || 0)
    };
  });
});

const whatsAppMessageText = computed(() => {
  const cName = props.chitti?.Chitti_Name || 'ClearFlow Chit Circle';
  const m = props.month;
  const totalM = props.chitti?.Total_Months || 20;
  const anchor = props.chitti?.Cycle_Anchor_Day || '10th to 10th';
  const collected = (props.metrics.totalCollected || 0).toLocaleString('en-IN');
  const target = (props.metrics.expectedCollection || 0).toLocaleString('en-IN');
  const rate = props.metrics.collectionRate || 0;
  const payout = (props.metrics.netPayout || 0).toLocaleString('en-IN');
  const pending = (props.metrics.pendingCollection || 0).toLocaleString('en-IN');

  let text = `*CLEARFLOW AUTOMATIONS — CYCLE REPORT*\n`;
  text += `🏛 *Group:* ${cName}\n`;
  text += `📅 *Cycle Month:* ${m}/${totalM} (${anchor})\n`;
  text += `────────────────────\n`;
  text += `💰 *Gross Target:* ₹${target}\n`;
  text += `📥 *Collected:* ₹${collected} (${rate}%)\n`;
  text += `🏆 *Winner Bulk Payout:* ₹${payout}\n`;
  text += `⏳ *Pending Dues Balance:* ₹${pending}\n`;
  text += `────────────────────\n`;

  if (pendingShares.value.length > 0) {
    text += `⚠️ *Pending Installments (${pendingShares.value.length}):*\n`;
    pendingShares.value.forEach((ps) => {
      text += `• #${String(ps.Share_Number).padStart(2, '0')} ${ps.Member_Name}: ₹${ps.pendingAmount.toLocaleString('en-IN')}\n`;
    });
    text += `\n_Please clear your dues promptly via UPI/Bank transfer._\n`;
  } else {
    text += `🎉 *100% Collection Achieved for Month ${m}! Thank you all members.*\n`;
  }

  text += `────────────────────\n`;
  text += `_Confidential report powered by ClearFlow Automations_`;
  return text;
});

const copyText = async () => {
  try {
    await navigator.clipboard.writeText(whatsAppMessageText.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
};
</script>
