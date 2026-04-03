/**
 * history.js
 * Document history and draft browser management.
 */
import { LS } from './constants.js';
import { lsGet, lsSet, logAudit } from './api.js';
import { escHtml, gbp } from './utils.js';
import { renderStatusBadge, showConfirm, openModal } from './ui.js';
import { buildInvoiceHtml } from './invoice-doc.js';

/** Rendering historical records to screen. */
export const renderHistory = (callbacks = {}) => {
  const invs = lsGet(LS.INVOICES);
  const list = document.getElementById('history-list');
  if (!list) return;

  if (!invs.length) {
    list.innerHTML = '<p class="p-8 text-center text-slate-400 text-sm">No clinical documents issued yet.</p>';
    return;
  }

  const rows = invs.map(inv => `
    <tr class="hist-row border-b border-slate-100 transition-colors cursor-pointer group" data-id="${inv.id}">
      <td class="px-6 py-4 font-bold text-brand-700 text-sm">${escHtml(inv.number)}</td>
      <td class="px-6 py-4 text-xs font-medium text-slate-500">${new Date(inv.date).toLocaleDateString('en-GB')}</td>
      <td class="px-6 py-4">
        <p class="text-xs font-bold text-slate-700 leading-tight">${escHtml(inv.surgery?.name || '—')}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">${escHtml(inv.period || 'N/A')}</p>
      </td>
      <td class="px-6 py-4 font-mono font-bold text-brand-700 text-sm">${gbp(inv.totalDue)}</td>
      <td class="px-6 py-4 text-center">${renderStatusBadge(inv.status)}</td>
      <td class="px-6 py-4 text-right">
        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="btn-hist-view text-brand-500 hover:text-brand-700 p-1" data-id="${inv.id}" title="View Document">👁</button>
          <button class="btn-hist-email text-brand-500 hover:text-brand-700 p-1" data-id="${inv.id}" title="Email Surgery">✉</button>
          ${inv.status !== 'paid' ? `<button class="btn-hist-paid text-indigo-500 hover:text-indigo-700 p-1 font-bold" data-id="${inv.id}" title="Mark as Paid">💰</button>` : ''}
          <button class="btn-hist-del text-slate-300 hover:text-red-500 p-1 font-bold" data-id="${inv.id}" title="Delete Record">×</button>
        </div>
      </td>
    </tr>`).join('');

  list.innerHTML = `
    <table class="w-full text-left">
      <thead class="bg-brand-50">
        <tr>
          <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-black text-brand-700">Ref #</th>
          <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-black text-brand-700">Date</th>
          <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-black text-brand-700">Surgery</th>
          <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-black text-brand-700">Amount</th>
          <th class="px-6 py-3 text-center text-[10px] uppercase tracking-widest font-black text-brand-700">Status</th>
          <th class="px-6 py-3"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
    
  if (callbacks.onRender) callbacks.onRender(list);
};

/** Logic for clearing absolute history. */
export const clearHistory = (onRefresh) => {
  showConfirm('Permanently clear all historical records?', () => {
    lsSet(LS.INVOICES, []);
    logAudit('HISTORY_CLEARED', 'All clinical records purged.');
    renderHistory(onRefresh);
  });
};

/** Visualizing unsaved drafts for recovery. */
export const renderDrafts = (callbacks = {}) => {
  const drafts = lsGet(LS.DRAFT).filter(d => d.status === 'draft');
  const list = document.getElementById('drafts-list');
  if (!list) return;

  if (!drafts.length) {
    list.innerHTML = '<p class="p-8 text-center text-slate-400 text-sm italic">No open drafts found.</p>';
    return;
  }

  const rows = drafts.map(d => `
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <div class="flex items-center gap-4">
        <span class="p-2 bg-brand-50 text-brand-500 rounded-lg text-lg">📁</span>
        <div>
           <p class="text-sm font-bold text-slate-700">${escHtml(d.number || 'Unnamed Draft')}</p>
           <p class="text-[10px] text-slate-400">${escHtml(d.surgery?.name || 'Incomplete')} · ${d.period || 'No Date'}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
         <span class="text-xs font-mono font-bold text-brand-500">${gbp(d.totalDue)}</span>
         <button class="btn-draft-load bg-brand-700 hover:bg-brand-600 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition" data-id="${d.id || d.number}">Recover</button>
         <button class="btn-draft-del text-slate-300 hover:text-red-500 transition-colors font-bold text-lg px-2" data-id="${d.id || d.number}">×</button>
      </div>
    </div>`).join('');

  list.innerHTML = rows;
  if (callbacks.onRender) callbacks.onRender(list);
};
