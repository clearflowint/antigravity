<template>
  <div id="onboarding-view" class="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <!-- Header -->
    <div class="border-b border-slate-800 pb-4 flex items-center justify-between">
      <div>
        <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">Universal Onboarding Wizard</span>
        <h1 class="text-2xl font-bold text-slate-100 mt-1">Start a Dynamic Chit Group</h1>
        <p class="text-xs text-slate-400 mt-0.5">
          Enter your circle parameters. All values start blank — our math engine computes the exact pool and payouts.
        </p>
      </div>
      <router-link
        to="/home"
        class="text-xs text-slate-400 hover:text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
      >
        &larr; Back to Groups
      </router-link>
    </div>

    <!-- Step Progress Bar -->
    <div class="grid grid-cols-4 gap-2 text-xs">
      <div
        v-for="(st, idx) in steps"
        :key="idx"
        class="p-2.5 rounded-xl border text-center transition-colors"
        :class="currentStep === idx + 1
          ? 'bg-blue-600/15 border-blue-500 text-blue-300 font-bold'
          : (currentStep > idx + 1 ? 'bg-slate-900 border-slate-700 text-emerald-400 font-medium' : 'bg-slate-950 border-slate-800 text-slate-500')"
      >
        <span class="block text-[10px] uppercase">Step {{ idx + 1 }}</span>
        <span class="truncate block text-xs">{{ st }}</span>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="validationError"
      class="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3.5 text-xs text-rose-300 flex items-center gap-2"
    >
      <svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>{{ validationError }}</span>
    </div>

    <!-- STEP 1: Group Identity & Template -->
    <div v-if="currentStep === 1" class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in">
      <h2 class="text-sm font-bold text-slate-200 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        Step 1: Group Identity &amp; Rule Template
      </h2>

      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Chitti Group Name <span class="text-rose-400">*</span>
          </label>
          <input
            v-model="form.Chitti_Name"
            type="text"
            required
            placeholder="Enter group name (e.g. Swarna Chitti 2026)"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-semibold text-slate-300">
              Chitti ID (6-Digit Unique Code) <span class="text-rose-400">*</span>
            </label>
            <button
              type="button"
              @click="regenerateChittiId"
              class="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-medium"
              title="Generate fresh non-reusable 6-digit code"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>Re-roll 6-Digit ID</span>
            </button>
          </div>
          <div class="relative">
            <input
              v-model="form.Chitti_ID"
              type="text"
              required
              maxlength="6"
              placeholder="e.g. 582914"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-blue-300 font-mono focus:outline-none focus:border-blue-500 tracking-wider"
            />
            <span class="absolute right-3 top-2.5 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              6-Digit Unique
            </span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Guaranteed unique across all managers &amp; chitti groups.</span>
            <span class="text-emerald-400 font-mono">NocoDB Non-Reusable</span>
          </p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Rule Template <span class="text-rose-400">*</span>
          </label>
          <select
            v-model="form.Rule_Template"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="Incremental Model V1">Incremental Model V1 (Dynamic Winner Payout)</option>
            <option value="Fixed Pool Model">Fixed Pool Model</option>
            <option value="Standard Auction Model">Standard Auction Model</option>
          </select>
          <p class="text-[11px] text-slate-400 mt-1">
            Incremental Model dynamically calculates monthly collection and winner payouts based on drawn vs undrawn members.
          </p>
        </div>
      </div>

      <div class="pt-3 flex justify-end">
        <button
          type="button"
          @click="goToStep(2)"
          class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
        >
          Next: Enter Financial Parameters &rarr;
        </button>
      </div>
    </div>

    <!-- STEP 2: Mandatory Financial Parameters (NOTHING PRE-SELECTED) -->
    <div v-else-if="currentStep === 2" class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in">
      <div>
        <h2 class="text-sm font-bold text-slate-200 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Step 2: Financial Parameters (Enter Any Custom Amounts)
        </h2>
        <p class="text-xs text-slate-400 mt-0.5">
          Enter your specific numbers. Nothing is preselected — our math engine calculates everything dynamically.
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Total Members / Shares (S) <span class="text-rose-400">*</span>
          </label>
          <input
            v-model.number="form.Total_Members"
            type="number"
            min="2"
            max="100"
            required
            placeholder="e.g. 20"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Total Months / Duration (M) <span class="text-rose-400">*</span>
          </label>
          <input
            v-model.number="form.Total_Months"
            type="number"
            min="2"
            max="100"
            required
            placeholder="e.g. 20"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Undrawn Member Due (₹ / month) <span class="text-rose-400">*</span>
          </label>
          <input
            v-model.number="form.Undrawn_Due"
            type="number"
            min="100"
            required
            placeholder="e.g. 5000"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
          <span class="text-[10px] text-blue-400">Monthly installment paid by saver members</span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Drawn Member Due (₹ / month) <span class="text-rose-400">*</span>
          </label>
          <input
            v-model.number="form.Drawn_Due"
            type="number"
            min="100"
            required
            placeholder="e.g. 6000"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
          <span class="text-[10px] text-emerald-400">Monthly installment paid after drawing prize</span>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Manager Monthly Commission (C) (₹) <span class="text-rose-400">*</span>
          </label>
          <input
            v-model.number="form.Monthly_Commission"
            type="number"
            min="0"
            required
            placeholder="e.g. 4000 (enter 0 if no commission)"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
          <span class="text-[10px] text-slate-400">Fixed foreman fee retained per cycle</span>
        </div>
      </div>

      <div class="pt-3 flex items-center justify-between">
        <button
          type="button"
          @click="currentStep = 1"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
        >
          &larr; Back
        </button>
        <button
          type="button"
          @click="goToStep(3)"
          class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
        >
          Next: Cycle Anchor &rarr;
        </button>
      </div>
    </div>

    <!-- STEP 3: Cycle Calendar Anchor -->
    <div v-else-if="currentStep === 3" class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in">
      <h2 class="text-sm font-bold text-slate-200 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        Step 3: Cycle Calendar Anchor
      </h2>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Circle Start Month &bull; Year <span class="text-rose-400">*</span>
          </label>
          <input
            v-model="form.Start_Month_Year"
            type="month"
            required
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            Fixed Cycle Anchor Day <span class="text-rose-400">*</span>
          </label>
          <select
            v-model="form.Cycle_Anchor_Day"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="" disabled selected>Select cycle anchor day...</option>
            <option value="1st to 1st">1st to 1st of every month</option>
            <option value="5th to 5th">5th to 5th of every month</option>
            <option value="10th to 10th">10th to 10th of every month</option>
            <option value="15th to 15th">15th to 15th of every month</option>
            <option value="20th to 20th">20th to 20th of every month</option>
            <option value="25th to 25th">25th to 25th of every month</option>
          </select>
          <p class="text-[11px] text-slate-400 mt-1">
            All cycle statements and reminders automatically synchronize around this anchor day.
          </p>
        </div>
      </div>

      <div class="pt-3 flex items-center justify-between">
        <button
          type="button"
          @click="currentStep = 2"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
        >
          &larr; Back
        </button>
        <button
          type="button"
          @click="goToStep(4)"
          class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
        >
          Next: Member Roster &rarr;
        </button>
      </div>
    </div>

    <!-- STEP 4: Member Roster Addition -->
    <div v-else-if="currentStep === 4" class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 class="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Step 4: Member Roster ({{ rosterMembers.length }} Members)
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Share #01 is conventionally the Foreman/Manager share. Every share receives a globally unique 6-digit code.
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Fast Bulk Import Button -->
          <button
            type="button"
            @click="openBulkPasteModal"
            class="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span>📋 Fast WhatsApp/Excel Paste</span>
          </button>
          <!-- Regenerate 6-Digit Share IDs -->
          <button
            type="button"
            @click="regenerateAllShareIds"
            class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Generate fresh non-reusable 6-digit codes for all shares"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>🔄 Fresh 6-Digit IDs</span>
          </button>
        </div>
      </div>

      <!-- Quick NocoDB Info Banner -->
      <div class="bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Non-Reusable 6-Digit Codes prevent data corruption across all chitti tables in NocoDB.
        </span>
        <span class="font-mono text-emerald-400 text-[10px]">Multi-Tenant Safe</span>
      </div>

      <!-- Scrollable Roster Table -->
      <div class="max-h-80 overflow-y-auto border border-slate-800 rounded-xl">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
            <tr>
              <th class="py-2 px-3">#</th>
              <th class="py-2 px-3">Share ID (6 Digits)</th>
              <th class="py-2 px-3">Member Full Name</th>
              <th class="py-2 px-3">Phone Number</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 font-mono">
            <tr v-for="(m, idx) in rosterMembers" :key="idx" class="hover:bg-slate-800/30">
              <td class="py-2 px-3 text-slate-400 font-bold">#{{ String(idx + 1).padStart(2, '0') }}</td>
              <td class="py-1.5 px-3">
                <input
                  v-model="m.Share_ID"
                  type="text"
                  required
                  maxlength="6"
                  class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-blue-300 font-mono tracking-wider w-24 text-center focus:outline-none focus:border-blue-500"
                />
              </td>
              <td class="py-1.5 px-3 font-sans">
                <input
                  v-model="m.Member_Name"
                  type="text"
                  required
                  :placeholder="idx === 0 ? 'Foreman / Manager Name' : `Member ${idx + 1} Name`"
                  class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 w-full focus:outline-none focus:border-blue-500"
                />
              </td>
              <td class="py-1.5 px-3">
                <input
                  v-model="m.Phone_Number"
                  type="text"
                  required
                  :placeholder="`+91 98${idx}00 00000`"
                  class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 w-36 focus:outline-none focus:border-blue-500"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pt-3 flex items-center justify-between">
        <button
          type="button"
          @click="currentStep = 3"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
        >
          &larr; Back
        </button>
        <button
          type="button"
          @click="handleProvisionCircle"
          class="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>Provision &amp; Launch Circle</span>
        </button>
      </div>
    </div>

    <!-- FAST BULK PASTE MODAL -->
    <div
      v-if="showBulkPasteModal"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      @click.self="showBulkPasteModal = false"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h3 class="text-sm font-bold text-slate-100">Fast Bulk Member Import</h3>
          </div>
          <button
            type="button"
            @click="showBulkPasteModal = false"
            class="text-slate-400 hover:text-slate-200 text-xs"
          >
            ✕
          </button>
        </div>

        <p class="text-xs text-slate-400 leading-relaxed">
          Copy-paste member rows directly from <strong>WhatsApp or Excel</strong>. The parser automatically extracts member names and phone numbers, mapping them to non-reusable 6-digit Share IDs.
        </p>

        <div class="space-y-1">
          <textarea
            v-model="bulkPasteInput"
            rows="6"
            placeholder="Paste raw text here. Example:
Ramesh Gupta 9845123456
Sunita Rao +91 98452 34567
Priya Patel - 9845345678"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
          ></textarea>
          <span class="text-[10px] text-slate-500">One member per line. Format can be: Name Phone or Phone Name.</span>
        </div>

        <div class="flex items-center justify-between pt-2">
          <button
            type="button"
            @click="showBulkPasteModal = false"
            class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="applyBulkPaste"
            class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            Parse &amp; Populate Roster &rarr;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useManagerWorkspace } from '../composables/useManagerWorkspace';
import { generateUnique6DigitId, generateShareIds } from '../utils/idGenerator';

const router = useRouter();
const { addGroup } = useManagerWorkspace();

const currentStep = ref(1);
const steps = ['Identity & Template', 'Financial Params', 'Calendar Anchor', 'Member Roster'];
const validationError = ref('');

// Fast Bulk Member Paste Modal state
const showBulkPasteModal = ref(false);
const bulkPasteInput = ref('');

// Completely blank initial form - zero pre-selected amounts with non-reusable 6-digit Chitti ID
const form = reactive({
  Chitti_Name: '',
  Chitti_ID: generateUnique6DigitId(),
  Rule_Template: 'Incremental Model V1',
  Total_Members: null,
  Total_Months: null,
  Undrawn_Due: null,
  Drawn_Due: null,
  Monthly_Commission: null,
  Start_Month_Year: '',
  Cycle_Anchor_Day: ''
});

const rosterMembers = ref([]);

const regenerateChittiId = () => {
  form.Chitti_ID = generateUnique6DigitId();
};

const syncRosterSlots = () => {
  const S = Number(form.Total_Members);
  if (!S || S < 1) {
    rosterMembers.value = [];
    return;
  }

  const currentLen = rosterMembers.value.length;
  if (currentLen < S) {
    for (let i = currentLen; i < S; i++) {
      rosterMembers.value.push({
        Share_ID: generateUnique6DigitId(),
        Member_Name: i === 0 ? 'Foreman Manager' : '',
        Phone_Number: ''
      });
    }
  } else if (currentLen > S) {
    rosterMembers.value = rosterMembers.value.slice(0, S);
  }
};

watch(() => form.Total_Members, syncRosterSlots);

const regenerateAllShareIds = () => {
  rosterMembers.value.forEach((m) => {
    m.Share_ID = generateUnique6DigitId();
  });
};

const openBulkPasteModal = () => {
  bulkPasteInput.value = '';
  showBulkPasteModal.value = true;
};

const applyBulkPaste = () => {
  if (!bulkPasteInput.value.trim()) {
    showBulkPasteModal.value = false;
    return;
  }

  const lines = bulkPasteInput.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    showBulkPasteModal.value = false;
    return;
  }

  // If user pasted more lines than currently configured Total_Members, expand members count
  if (lines.length > (Number(form.Total_Members) || 0)) {
    form.Total_Members = lines.length;
    syncRosterSlots();
  }

  lines.forEach((line, idx) => {
    if (idx >= rosterMembers.value.length) return;

    // Regex to match phone number (sequence of 10-12 digits, possibly with +91 or spaces)
    const phoneMatch = line.match(/(?:\+?91[\s-]?)?[6789]\d{9}/);
    let extractedPhone = '';
    let extractedName = line;

    if (phoneMatch) {
      extractedPhone = phoneMatch[0].trim();
      extractedName = line.replace(extractedPhone, '').replace(/[-–,;]/g, '').trim();
    }

    if (!extractedName && idx === 0) {
      extractedName = 'Foreman Manager';
    }

    if (extractedName) {
      rosterMembers.value[idx].Member_Name = extractedName;
    }
    if (extractedPhone) {
      rosterMembers.value[idx].Phone_Number = extractedPhone;
    }
    if (!rosterMembers.value[idx].Share_ID) {
      rosterMembers.value[idx].Share_ID = generateUnique6DigitId();
    }
  });

  showBulkPasteModal.value = false;
};

const goToStep = (step) => {
  validationError.value = '';

  if (step === 2) {
    if (!form.Chitti_Name.trim()) {
      validationError.value = 'Please enter a valid Chitti Group Name.';
      return;
    }
    if (!form.Chitti_ID || !String(form.Chitti_ID).trim()) {
      form.Chitti_ID = generateUnique6DigitId();
    }
  }

  if (step === 3) {
    if (!form.Total_Members || form.Total_Members < 2) {
      validationError.value = 'Please enter Total Members (at least 2).';
      return;
    }
    if (!form.Total_Months || form.Total_Months < 2) {
      validationError.value = 'Please enter Total Months duration (at least 2).';
      return;
    }
    if (!form.Undrawn_Due || form.Undrawn_Due <= 0) {
      validationError.value = 'Please enter the monthly installment for Undrawn Members.';
      return;
    }
    if (!form.Drawn_Due || form.Drawn_Due <= 0) {
      validationError.value = 'Please enter the monthly installment for Drawn Members.';
      return;
    }
    if (Number(form.Drawn_Due) < Number(form.Undrawn_Due)) {
      validationError.value = 'Drawn Due cannot be less than Undrawn Due in Incremental Model.';
      return;
    }
    if (form.Monthly_Commission === null || form.Monthly_Commission === '' || Number(form.Monthly_Commission) < 0) {
      validationError.value = 'Please enter manager monthly commission (enter 0 if none).';
      return;
    }
  }

  if (step === 4) {
    if (!form.Start_Month_Year) {
      validationError.value = 'Please select the Circle Start Month & Year.';
      return;
    }
    if (!form.Cycle_Anchor_Day) {
      validationError.value = 'Please choose a Fixed Cycle Anchor Day.';
      return;
    }
    syncRosterSlots();
  }

  currentStep.value = step;
};

const isProvisioning = ref(false);

const handleProvisionCircle = async () => {
  validationError.value = '';

  // Validate roster names and ensure 6-digit unique Share IDs
  const filledMembers = rosterMembers.value.map((m, idx) => ({
    Share_ID: String(m.Share_ID || generateUnique6DigitId()).trim(),
    Member_Name: m.Member_Name.trim() || (idx === 0 ? 'Foreman Manager' : `Member ${idx + 1}`),
    Phone_Number: m.Phone_Number.trim() || `+91 98000 ${String(idx + 1).padStart(5, '0')}`
  }));

  // Verify Share ID uniqueness
  const seenShareIds = new Set();
  for (const m of filledMembers) {
    if (seenShareIds.has(m.Share_ID)) {
      validationError.value = `Duplicate Share ID detected: ${m.Share_ID}. Please re-roll 6-digit IDs.`;
      return;
    }
    seenShareIds.add(m.Share_ID);
  }

  isProvisioning.value = true;
  try {
    const targetChittiId = String(form.Chitti_ID || generateUnique6DigitId()).trim();
    const created = await addGroup({
      Chitti_ID: targetChittiId,
      Chitti_Name: form.Chitti_Name,
      Rule_Template: form.Rule_Template,
      Total_Members: Number(form.Total_Members),
      Total_Months: Number(form.Total_Months),
      Monthly_Commission: Number(form.Monthly_Commission),
      Undrawn_Due: Number(form.Undrawn_Due),
      Drawn_Due: Number(form.Drawn_Due),
      Cycle_Anchor_Day: form.Cycle_Anchor_Day,
      Start_Date: `${form.Start_Month_Year}-01`,
      members: filledMembers
    });

    const finalId = created?.Chitti_ID || targetChittiId;
    router.push(`/groups/${finalId}`);
  } catch (err) {
    validationError.value = err.message || 'Failed to provision new Chitti Group';
  } finally {
    isProvisioning.value = false;
  }
};
</script>
