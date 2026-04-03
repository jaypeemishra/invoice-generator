/**
 * insights.js
 * Financial reporting, data archiving, and audit log management.
 */
import { LS, BRAND } from './constants.js';
import { lsGet, lsSet, logAudit } from './api.js';
import { gbp, escHtml } from './utils.js';
import { showConfirm } from './ui.js';
import { renderBankInsights } from './bank.js';

let insightsView = 'fy';

/** Aggregates data for the current clinical financial year (UK: Apr 6 - Apr 5). */
const getFYRange = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: `${year}-04-01`, // Simplified to 1st for ease
    end:   `${year + 1}-03-31`,
    label: `FY ${year}/${(year + 1).toString().slice(-2)}`
  };
};

/** Render the current FY dashboard. */
export const renderInsights = () => {
    // Sync UI tab visibility
    document.querySelectorAll('.ins-view').forEach(v => v.classList.add('hidden'));
    const activeView = document.getElementById(`ins-view-${insightsView}`);
    if (activeView) activeView.classList.remove('hidden');

    if (insightsView === 'fy') renderFY();
    else if (insightsView === 'archive') renderArchiveList();
    else if (insightsView === 'bank') renderBankInsights();
};

const renderFY = () => {
    const range = getFYRange();
    const allInvoices = lsGet(LS.INVOICES);
    const data = allInvoices.filter(i => i.date >= range.start && i.date <= range.end);

    const totalNet     = data.reduce((a, b) => a + (b.totalDue || 0), 0);
    const totalPaid    = data.filter(i => i.status === 'paid').reduce((a, b) => a + (b.totalDue || 0), 0);
    const totalPending = totalNet - totalPaid;
    const totalGross   = data.reduce((a, b) => a + (b.totalEarning || 0), 0);
    
    // Efficiency: Total Net / Total Hours (if rate based)
    const rateInvs = data.filter(i => i.type === 'rate');
    const totalHrs = rateInvs.reduce((a, b) => a + (b.totalHours || 0), 0);
    const avgYield = totalHrs > 0 ? (rateInvs.reduce((a, b) => a + (b.totalDue || 0), 0) / totalHrs) : 0;

    document.getElementById('fy-total-net').textContent   = gbp(totalNet);
    document.getElementById('fy-total-paid').textContent  = gbp(totalPaid);
    document.getElementById('fy-total-pending').textContent = gbp(totalPending);
    document.getElementById('fy-total-gross').textContent = gbp(totalGross);
    document.getElementById('fy-avg-yield').textContent   = gbp(avgYield);

    const wrap = document.getElementById('fy-table-wrap');
    if (!data.length) {
        wrap.innerHTML = `<p class="p-20 text-center text-slate-400 text-xs italic">No activity recorded for ${range.label} yet.</p>`;
        return;
    }

    const rows = data.sort((a,b) => b.date.localeCompare(a.date)).map(i => `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors text-[11px]">
            <td class="px-8 py-4 font-black text-brand-700 underline decoration-brand-200">${escHtml(i.number)}</td>
            <td class="px-8 py-4 font-bold text-slate-500">${new Date(i.date).toLocaleDateString('en-GB')}</td>
            <td class="px-8 py-4 text-slate-700 font-semibold">${escHtml(i.surgery?.name)}</td>
            <td class="px-8 py-4 uppercase font-black text-[9px] tracking-widest text-slate-300">${i.type === 'percent' ? 'Commission' : 'Hourly Rate'}</td>
            <td class="px-8 py-4 font-black text-brand-900 text-xs">${gbp(i.totalDue)}</td>
        </tr>`).join('');

    wrap.innerHTML = `
        <table class="w-full text-left bg-white">
            <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                <tr><th class="px-8 py-4">REF #</th><th class="px-8 py-4">DATE</th><th class="px-8 py-4">SURGERY</th><th class="px-8 py-4">TYPE</th><th class="px-8 py-4 text-right">NET DUE</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
};

const renderArchiveList = () => {
    const archives = lsGet(LS.ARCHIVE);
    const wrap = document.getElementById('archive-list');
    
    if (!archives.length) {
        wrap.innerHTML = '<p class="col-span-full p-20 text-center text-slate-400 text-xs italic">No archived financial years found.</p>';
        return;
    }

    wrap.innerHTML = archives.map(a => `
        <div class="glass p-6 rounded-3xl border-2 border-slate-50 hover:border-brand-500 transition-all group">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-black text-brand-700 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-widest">${a.fy}</span>
                <span class="text-[9px] text-slate-300 font-bold">${new Date(a.archivedAt).toLocaleDateString()}</span>
            </div>
            <h4 class="text-xl font-black text-brand-900 mb-6">Financial Year Record</h4>
            <div class="space-y-3 mb-6">
                <div class="flex justify-between text-[10px] font-bold">
                    <span class="text-slate-400 uppercase">Documents</span>
                    <span class="text-brand-700">${a.invCount} Records</span>
                </div>
                <div class="flex justify-between text-[10px] font-bold">
                    <span class="text-slate-400 uppercase">Total Yield</span>
                    <span class="text-brand-900">${gbp((a.data?.invoices || []).reduce((acc, i) => acc + (i.totalDue || 0), 0))}</span>
                </div>
            </div>
            <button class="w-full py-3 bg-brand-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl group-hover:bg-brand-900 transition-all opacity-0 group-hover:opacity-100">Export FY Report</button>
        </div>
    `).join('');
};

export const setInsightsView = (view) => {
    insightsView = view;
    renderInsights();
};

/** Visual audit trail for clinical operations. */
export const renderAuditLog = () => {
  const audit = lsGet(LS.AUDIT);
  const wrap = document.getElementById('audit-table-wrap');
  if (!wrap) return;

  if (!audit.length) {
    wrap.innerHTML = '<p class="p-8 text-slate-400 text-sm">No audit logs recorded.</p>';
    return;
  }

  const rows = audit.map(a => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td class="px-4 py-3 text-[10px] font-mono text-slate-400">${new Date(a.ts).toLocaleString('en-GB', { hour12: false }).replace(',', '')}</td>
      <td class="px-4 py-3 text-[10px] font-black uppercase text-brand-700 tracking-tighter">${escHtml(a.action)}</td>
      <td class="px-4 py-3 text-xs font-bold text-slate-700">${escHtml(a.invNum)}</td>
      <td class="px-4 py-3 text-xs text-slate-500">${escHtml(a.surgery)}</td>
      <td class="px-4 py-3 text-[10px] text-slate-400 max-w-xs truncate">${escHtml(a.details)}</td>
    </tr>`).join('');

  wrap.innerHTML = `
    <table class="w-full text-left">
      <thead class="bg-brand-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <tr><th class="px-4 py-3">Timestamp</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">Reference</th><th class="px-4 py-3">Surgery</th><th class="px-4 py-3">Details</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

/** Purges live clinical data for a given Financial Year (FY). */
export const archivePastData = async (fy, onDone) => {
  const year      = parseInt(fy);
  const invoices  = lsGet(LS.INVOICES);
  const logs      = lsGet(LS.LOGS);
  const archive   = lsGet(LS.ARCHIVE);
  
  // Isolate data for archiving (Apr - Mar)
  const matchedInvs = invoices.filter(i => {
    const d = new Date(i.date);
    return (d.getFullYear() === year && d.getMonth() >= 3) || (d.getFullYear() === (year+1) && d.getMonth() < 3);
  });
  
  if (!matchedInvs.length) {
    alert(`No records found for FY ${year}/${year+1}.`);
    return;
  }
  
  const snapshot = {
    id: `FY-${year}-${Date.now()}`,
    fy: `${year}/${year+1}`,
    invCount: matchedInvs.length,
    data: { invoices: matchedInvs },
    archivedAt: new Date().toISOString()
  };
  
  archive.unshift(snapshot);
  lsSet(LS.ARCHIVE, archive);
  
  // Purge live data
  lsSet(LS.INVOICES, invoices.filter(i => !matchedInvs.includes(i)));
  
  logAudit('DATA_ARCHIVED', snapshot);
  alert(`FY ${year}/${year+1} archived successfully!`);
  if (onDone) onDone();
};
