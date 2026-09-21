/**
 * exportPdfStatement.js
 * 
 * Standalone PDF export utility decoupled from HomeView.vue.
 * Generates an isolated, printable full circle ledger window/document
 * for 1-click download/print as PDF without bloating main view components.
 */

export function triggerDownloadCirclePdf(chitti, shares = [], transactions = [], currentMonth = 1) {
  const totalMonths = Number(chitti?.Total_Months || 20);
  const totalShares = shares.length || Number(chitti?.Total_Shares || 20);
  const undrawnDue = Number(chitti?.Undrawn_Due || 5000);
  const drawnDue = Number(chitti?.Drawn_Due || 6000);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download/print the Full Circle Statement PDF.');
    return;
  }

  const rowsHtml = shares.map((s, idx) => {
    const isDrawn = s.Draw_Status === 'Drawn';
    const txn = transactions.find(t => t.Share_ID === s.Share_ID);
    const due = txn?.Amount_Due !== undefined ? Number(txn.Amount_Due) : (isDrawn ? drawnDue : undrawnDue);
    const paid = Number(txn?.Amount_Paid || 0);
    const pending = txn?.Pending_Dues !== undefined ? Number(txn.Pending_Dues) : Math.max(0, due - paid);
    const advance = Number(s.Advance_Credit || 0);
    const status = (pending === 0 && paid > 0) ? 'Paid' : (pending > 0 ? 'Pending' : 'Active');

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; font-family: monospace; font-weight: bold;">#${String(s.Share_Number || idx + 1).padStart(2, '0')}</td>
        <td style="padding: 8px; font-weight: 600;">${s.Member_Name}</td>
        <td style="padding: 8px; font-family: monospace; font-size: 11px;">${s.Share_ID}</td>
        <td style="padding: 8px; font-size: 11px;">${isDrawn ? `<span style="color:#7c3aed;font-weight:bold;">Drawn (M${s.Month_Drawn || '—'})</span>` : `<span style="color:#b45309;font-weight:bold;">Undrawn</span>`}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace;">₹${due.toLocaleString('en-IN')}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; color: #15803d; font-weight: bold;">₹${paid.toLocaleString('en-IN')}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; color: ${pending > 0 ? '#b91c1c; font-weight: bold;' : '#64748b;'}">₹${pending.toLocaleString('en-IN')}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; color: #1d4ed8; font-weight: bold;">₹${advance.toLocaleString('en-IN')}</td>
        <td style="padding: 8px; text-align: center; font-size: 11px; font-weight: bold; color: ${status === 'Paid' ? '#15803d' : '#b91c1c'};">${status}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>ClearFlow_${chitti?.Chitti_ID || 'Circle'}_Full_Statement</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; }
          .subtitle { color: #64748b; font-size: 12px; margin: 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .summary-val { font-size: 14px; font-weight: bold; font-family: monospace; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; color: #1e40af;">Full Circle Statement PDF Ready</span>
          <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <h1 class="title">CLEARFLOW CHIT FUND STATEMENT</h1>
            <p class="subtitle">Group: <strong>${chitti?.Chitti_Name || ''}</strong> (${chitti?.Chitti_ID || ''}) &bull; Anchor: ${chitti?.Cycle_Anchor_Day || '10th'}</p>
          </div>
          <div style="text-align: right; font-family: monospace;">
            <div style="font-weight: bold; font-size: 13px;">Cycle Month: M${currentMonth} of ${totalMonths}</div>
            <div style="color: #64748b; font-size: 11px;">Total Shares: ${totalShares}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Shares</div>
            <div class="summary-val">${totalShares}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Undrawn Due</div>
            <div class="summary-val">₹${undrawnDue.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Drawn Due</div>
            <div class="summary-val">₹${drawnDue.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Anchor Day</div>
            <div class="summary-val">${chitti?.Cycle_Anchor_Day || '10th'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Member Name</th>
              <th>Share ID</th>
              <th>Status</th>
              <th style="text-align: right;">Amount Due</th>
              <th style="text-align: right;">Amount Paid</th>
              <th style="text-align: right;">Pending</th>
              <th style="text-align: right;">Advance</th>
              <th style="text-align: center;">Payment</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Official Statement &bull; ClearFlow Automations</span>
          <span>Generated: ${new Date().toLocaleDateString('en-IN')}</span>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Page refresh as requested to prevent holding report generation state in UI
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}
