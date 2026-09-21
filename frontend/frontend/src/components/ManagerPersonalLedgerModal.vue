<template>
  <div
    v-if="isOpen"
    id="manager-personal-ledger-modal"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    @click.self="emit('close')"
  >
    <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs">
            FM
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Manager Personal Ledger</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                {{ ledger?.chittiId }}
              </span>
            </h3>
            <p class="text-[11px] text-slate-400">
              Foreman commission, personal share dues, and net pocket ledger
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center text-sm transition-colors"
        >
          &times;
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-5 overflow-y-auto space-y-4 text-xs">
        <!-- 1. Foreman Commission Ledger -->
        <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-blue-400"></span>
              Foreman Commission Ledger
            </span>
            <span class="text-[10px] text-slate-400 font-mono">
              Cycle M{{ ledger?.activeMonth }}/{{ ledger?.totalMonths }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 font-mono">
            <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-400 font-sans block">Monthly Commission</span>
              <strong class="text-sm font-bold text-blue-400">
                ₹{{ (ledger?.commission?.monthlyRate || 0).toLocaleString('en-IN') }}
              </strong>
              <span class="text-[9px] text-slate-500 block font-sans">Retained per cycle</span>
            </div>

            <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-400 font-sans block">Earned To Date</span>
              <strong class="text-sm font-bold text-emerald-400">
                ₹{{ (ledger?.commission?.earnedToDate || 0).toLocaleString('en-IN') }}
              </strong>
              <span class="text-[9px] text-slate-500 block font-sans">M{{ ledger?.activeMonth }} cumulative</span>
            </div>
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
            <span>Total Contract Commission:</span>
            <span class="text-slate-200 font-bold">₹{{ (ledger?.commission?.totalContract || 0).toLocaleString('en-IN') }}</span>
          </div>
        </div>

        <!-- 2. Manager Personal Share (Share S01 / Foreman Share) -->
        <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-purple-400"></span>
              Manager Personal Share (Foreman Share)
            </span>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              {{ ledger?.managerShare?.shareId || 'S01' }}
            </span>
          </div>

          <div v-if="ledger?.managerShare" class="space-y-2">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400">Registered Name:</span>
              <span class="text-slate-200 font-semibold">{{ ledger?.managerShare?.memberName }}</span>
            </div>

            <div class="grid grid-cols-3 gap-2 font-mono">
              <div class="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                <span class="text-[9px] text-slate-400 font-sans block">Month Due</span>
                <strong class="text-xs text-slate-200 font-bold">
                  ₹{{ (ledger?.managerShare?.due || 0).toLocaleString('en-IN') }}
                </strong>
              </div>

              <div class="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                <span class="text-[9px] text-slate-400 font-sans block">Paid</span>
                <strong class="text-xs text-emerald-400 font-bold">
                  ₹{{ (ledger?.managerShare?.paid || 0).toLocaleString('en-IN') }}
                </strong>
              </div>

              <div class="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                <span class="text-[9px] text-slate-400 font-sans block">Pending Due</span>
                <strong
                  class="text-xs font-bold"
                  :class="(ledger?.managerShare?.pending || 0) > 0 ? 'text-rose-400' : 'text-slate-400'"
                >
                  ₹{{ (ledger?.managerShare?.pending || 0).toLocaleString('en-IN') }}
                </strong>
              </div>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
              <span>Advance Credit Held:</span>
              <span class="text-blue-400 font-bold">₹{{ (ledger?.managerShare?.advance || 0).toLocaleString('en-IN') }}</span>
            </div>
          </div>
          <div v-else class="text-slate-500 text-center py-2">
            No manager share found in circle roster.
          </div>
        </div>

        <!-- 3. Pocket Cash / Handheld Balance Ledger -->
        <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2 font-mono">
          <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span class="font-bold text-slate-200 text-xs font-sans flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              Net Pocket Cash in Hand (Cycle M{{ ledger?.activeMonth }})
            </span>
            <span
              class="text-[10px] font-bold px-1.5 py-0.5 rounded"
              :class="ledger?.pocketLedger?.isSurplus ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'"
            >
              {{ ledger?.pocketLedger?.isSurplus ? 'Surplus' : 'Deficit' }}
            </span>
          </div>

          <div class="space-y-1.5 text-[11px]">
            <div class="flex items-center justify-between text-slate-400">
              <span>Total Member Collections Received:</span>
              <span class="text-slate-200">₹{{ (ledger?.pocketLedger?.monthCollected || 0).toLocaleString('en-IN') }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>Winner Prize Payout Disbursed:</span>
              <span class="text-purple-300">- ₹{{ (ledger?.pocketLedger?.monthDrawPayout || 0).toLocaleString('en-IN') }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>Foreman Commission Retained:</span>
              <span class="text-blue-400">- ₹{{ (ledger?.commission?.monthlyRate || 0).toLocaleString('en-IN') }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>Member Advance Reserves:</span>
              <span class="text-emerald-400">+ ₹{{ (ledger?.pocketLedger?.totalAdvancesHeld || 0).toLocaleString('en-IN') }}</span>
            </div>
            <div class="flex items-center justify-between pt-1.5 border-t border-slate-800 text-xs font-bold">
              <span class="text-slate-200">Net Handheld Cash Balance:</span>
              <span :class="ledger?.pocketLedger?.isSurplus ? 'text-emerald-400' : 'text-rose-400'">
                {{ ledger?.pocketLedger?.isSurplus ? '+' : '' }}₹{{ (ledger?.pocketLedger?.netPocketBalance || 0).toLocaleString('en-IN') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
        >
          Close Ledger
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  ledger: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);
</script>
