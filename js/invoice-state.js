/**
 * invoice-state.js
 * Form state, draft restoration, and finalisation handling.
 */
import { LS } from './constants.js?v=5';
import { lsGet, lsSet, logAudit } from './api.js?v=5';
import { uid, gbp, timeToHours, showMsg, formatPeriodLabel } from './utils.js?v=5';
import { calcPercentRow, calcPercentTotals, calcRateRow, calcRateTotals, toggleInvoiceType } from './invoice-calc.js?v=5';
import { buildInvoiceHtml } from './invoice-doc.js?v=5';

let currentInvoiceId = null;

/** Populate a Type A row. */
export const addPercentRow = (date = '', patients = '', charge = null) => {
  const tbody = document.getElementById('percent-rows');
  if (!tbody) return;
  
  const sId = document.getElementById('inv-surgery').value;
  const s   = lsGet(LS.SURGERIES).find(x => x.id === sId);
  const rCharge = charge ?? s?.defaultCharge ?? 0;

  const tr = document.createElement('tr');
  tr.className = 'border-b border-slate-700/40';
  tr.innerHTML = `
    <td class="px-3 py-2"><input type="date" class="p-row-date border border-slate-200 rounded px-2 py-1 text-xs w-32" value="${date}" /></td>
    <td class="px-3 py-2"><input type="number" class="p-row-pts border border-slate-200 rounded px-2 py-1 text-xs w-20" value="${patients}" placeholder="0" /></td>
    <td class="px-3 py-2"><input type="number" step="0.01" class="p-row-charge border border-slate-200 rounded px-2 py-1 text-xs w-24" value="${rCharge}" placeholder="0.00" /></td>
    <td class="px-3 py-2 p-row-earning text-slate-500 text-xs font-mono">£0.00</td>
    <td class="px-3 py-2 p-row-due text-brand-700 text-xs font-mono font-bold">£0.00</td>
    <td class="px-3 py-2"><button class="btn-del-row text-slate-300 hover:text-red-500 transition-colors font-bold text-lg px-2">×</button></td>`;
  tbody.appendChild(tr);
  tr.querySelector('.btn-del-row').addEventListener('click', () => { tr.remove(); calcPercentTotals(); });
  tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { calcPercentRow(tr); calcPercentTotals(); }));
  
  calcPercentRow(tr); 
  calcPercentTotals();
};

/** Populate a Type B row. */
export const addRateRow = (date = '', start = null, end = null, rate = null, lunch = null) => {
  const tbody = document.getElementById('rate-rows');
  if (!tbody) return;
  
  const sId = document.getElementById('inv-surgery').value;
  const s   = lsGet(LS.SURGERIES).find(x => x.id === sId);
  
  const rStart = start || s?.defaultStart || '09:00';
  const rEnd   = end   || s?.defaultEnd   || '17:00';
  const rRate  = rate  ?? s?.defaultRate  ?? 0;
  const rLunch = lunch ?? s?.lunchBreak   ?? 1.0;

  const tr = document.createElement('tr');
  tr.className = 'border-b border-slate-700/40';
  tr.innerHTML = `
    <td class="px-3 py-2"><input type="date" class="r-row-date border border-slate-200 rounded px-2 py-1 text-xs w-32" value="${date}" /></td>
    <td class="px-3 py-2"><input type="time" class="r-row-start border border-slate-200 rounded px-2 py-1 text-xs w-24" value="${rStart}" /></td>
    <td class="px-3 py-2"><input type="time" class="r-row-end border border-slate-200 rounded px-2 py-1 text-xs w-24" value="${rEnd}" /></td>
    <td class="px-3 py-2"><input type="number" step="0.5" class="r-row-lunch border border-slate-200 rounded px-2 py-1 text-xs w-16" value="${rLunch}" /></td>
    <td class="px-3 py-2 r-row-hours text-slate-500 text-xs font-mono">0.00 hrs</td>
    <td class="px-3 py-2"><input type="number" step="0.01" class="r-row-rate border border-slate-200 rounded px-2 py-1 text-xs w-20" value="${rRate}" placeholder="0.00" /></td>
    <td class="px-3 py-2 r-row-amount text-brand-700 text-xs font-mono font-bold">£0.00</td>
    <td class="px-3 py-2"><button class="btn-del-session text-slate-300 hover:text-red-500 transition-colors font-bold text-lg px-2">×</button></td>`;
  tbody.appendChild(tr);
  tr.querySelector('.btn-del-session').addEventListener('click', () => { tr.remove(); calcRateTotals(); });
  tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { calcRateRow(tr); calcRateTotals(); }));
  
  // Initial calculation
  calcRateRow(tr);
  calcRateTotals();
};

/** Collect all form inputs into a structured clinical document object. */
export const collectInvoiceData = () => {
  const surgId = document.getElementById('inv-surgery').value;
  if (!surgId) { alert('Please select a surgery.'); return null; }
  const num = document.getElementById('inv-number').value.trim();
  if (!num) { alert('Invoice number is required.'); return null; }
  
  const surgery = lsGet(LS.SURGERIES).find(s => s.id === surgId);
  const type = document.getElementById('inv-type').value;
  
  const inv = {
    id: currentInvoiceId || uid(), 
    number: num, 
    date: document.getElementById('inv-date').value,
    billingMonth: document.getElementById('inv-import-month').value || '',
    period: document.getElementById('inv-period').value.trim(),
    surgery, type, notes: document.getElementById('inv-notes').value.trim(),
    status: 'finalised', createdAt: new Date().toISOString()
  };

  if (type === 'percent') {
    const share = (surgery?.sharePercent || 35);
    const rows = [];
    document.querySelectorAll('#percent-rows tr').forEach(tr => {
      const pts = parseFloat(tr.querySelector('.p-row-pts').value);
      const charge = parseFloat(tr.querySelector('.p-row-charge').value);
      if (pts || charge) {
        rows.push({
          date: tr.querySelector('.p-row-date').value,
          patients: pts || 0, charge: charge || 0,
          earning: (pts || 0) * (charge || 0), due: (pts || 0) * (charge || 0) * (share/100)
        });
      }
    });
    if (!rows.length) { alert('Add at least one row with data.'); return null; }
    inv.rows = rows; inv.sharePercent = share;
    inv.totalEarning = rows.reduce((a, b) => a + b.earning, 0);
    inv.totalDue = rows.reduce((a, b) => a + b.due, 0);
  } else {
    const sessions = [];
    document.querySelectorAll('#rate-rows tr').forEach(tr => {
      const r = parseFloat(tr.querySelector('.r-row-rate').value);
      if (r) {
        const start = tr.querySelector('.r-row-start').value, end = tr.querySelector('.r-row-end').value;
        const lunch = parseFloat(tr.querySelector('.r-row-lunch').value) || 0;
        const hrs = timeToHours(start, end, lunch);
        sessions.push({ date: tr.querySelector('.r-row-date').value, start, end, lunch, hours: hrs, rate: r, amount: hrs * r });
      }
    });
    if (!sessions.length) { alert('Add at least one session.'); return null; }
    inv.sessions = sessions;
    inv.totalHours = sessions.reduce((a, b) => a + b.hours, 0);
    inv.totalDue = sessions.reduce((a, b) => a + b.amount, 0);
  }
  return inv;
};

/** Transfers an invoice document back into the edit form. */
export const loadDraft = inv => {
  currentInvoiceId = inv.id;
  document.getElementById('inv-number').value = inv.number || '';
  document.getElementById('inv-date').value   = inv.date   || '';
  document.getElementById('inv-period').value = inv.period || '';
  document.getElementById('inv-notes').value  = inv.notes  || '';
  document.getElementById('inv-surgery').value = inv.surgery?.id || '';
  document.getElementById('inv-type').value = inv.type || 'percent';
  toggleInvoiceType(inv.type);
  document.getElementById('percent-rows').innerHTML = '';
  document.getElementById('rate-rows').innerHTML    = '';
  if (inv.type === 'percent' && inv.rows) {
    inv.rows.forEach(r => addPercentRow(r.date, r.patients, r.charge));
  } else if (inv.type === 'rate' && inv.sessions) {
    inv.sessions.forEach(s => addRateRow(s.date, s.start, s.end, s.rate, s.lunch));
  }
};

/** Generates a procedural invoice number based on history count. */
export const generateNextInvoiceNumber = () => {
  const invs   = lsGet(LS.INVOICES);
  const drafts = lsGet(LS.DRAFT);
  const all    = [
    ...invs.map(i => parseInt(i.number?.replace('PA-','') || 0)),
    ...drafts.map(d => parseInt(d.number?.replace('PA-','') || 0))
  ];
  const max = all.length ? Math.max(...all) : 0;
  return `PA-${String(max + 1).padStart(4, '0')}`;
};

/** Full form reset for fresh clinical data entry. */
export const clearInvoiceForm = () => {
  currentInvoiceId = null;
  document.getElementById('inv-surgery').value = '';
  document.getElementById('inv-period').value = '';
  document.getElementById('inv-notes').value = '';
  const pRows = document.getElementById('percent-rows');
  const rRows = document.getElementById('rate-rows');
  if (pRows) pRows.innerHTML = '';
  if (rRows) rRows.innerHTML = '';
  document.getElementById('surgery-info-banner').classList.add('hidden');
  document.getElementById('inv-number').value = generateNextInvoiceNumber();
  calcPercentTotals(); 
  calcRateTotals();
};

/** Dirty check for unsaved work. */
export const isInvoiceFormDirty = () => {
    const surg = document.getElementById('inv-surgery').value;
    const note = document.getElementById('inv-notes').value.trim();
    const pRows = document.querySelectorAll('#percent-rows tr').length;
    const rRows = document.querySelectorAll('#rate-rows tr').length;
    return !!(surg || note || pRows || rRows);
};

/** Saves core clinical data for future invoicing. */
export const importLogsToInvoice = (type) => {
  const surgId = document.getElementById('inv-surgery').value;
  if (!surgId) { alert('Please select a surgery first.'); return; }
  const importMonth = document.getElementById('inv-import-month').value;
  let logs = lsGet(LS.LOGS).filter(l => l.surgeryId === surgId && l.type === type);
  if (importMonth) {
    logs = logs.filter(l => l.date && l.date.startsWith(importMonth));
    document.getElementById('inv-period').value = formatPeriodLabel(importMonth);
  }
  if (!logs.length) { alert('No matching logs found.'); return; }
  if (type === 'percent') {
    document.getElementById('percent-rows').innerHTML = '';
    logs.forEach(l => addPercentRow(l.date, l.patients, l.charge));
    calcPercentTotals();
  } else {
    document.getElementById('rate-rows').innerHTML = '';
    logs.forEach(l => addRateRow(l.date, l.start, l.end, l.rate, l.lunch));
    calcRateTotals();
  }
};

/** Persistence for finalized documents. */
export const finaliseInvoice = (inv, onDone) => {
  const list = lsGet(LS.INVOICES);
  const idx = list.findIndex(x => x.id === inv.id);
  if (idx !== -1) list[idx] = inv;
  else list.unshift(inv);
  lsSet(LS.INVOICES, list);
  const drafts = lsGet(LS.DRAFT).filter(d => d.id !== inv.id && d.number !== inv.number);
  lsSet(LS.DRAFT, drafts);
  logAudit('INVOICE_FINALISED', inv);
  clearInvoiceForm();
  if (onDone) onDone();
};

/** Logic for saving incomplete documents as drafts. */
export const saveDraft = () => {
  const inv = collectInvoiceData();
  if (!inv) return;
  inv.status = 'draft';
  inv.id = inv.id || uid();
  const drafts = lsGet(LS.DRAFT);
  const idx = drafts.findIndex(d => d.id === inv.id || d.number === inv.number);
  if (idx !== -1) drafts[idx] = inv;
  else drafts.unshift(inv);
  lsSet(LS.DRAFT, drafts);
  logAudit('DRAFT_SAVED', inv);
  showMsg(document.getElementById('create-msg'), '✅ Draft saved!', 'ok');
};
