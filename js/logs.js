/**
 * logs.js
 * Domain logic for the daily clinical work diary.
 */
import { LS } from './constants.js?v=5';
import { lsGet, lsSet, logAudit } from './api.js?v=5';
import { uid, escHtml, gbp, timeToHours } from './utils.js?v=5';
import { showConfirm, renderStatusBadge } from './ui.js?v=5';
import { populateSurgeryDropdown } from './surgeries.js?v=5';

let editingLogId = null;

/** Toggle clinical field visibility based on work type. */
export const updateLogFieldVisibility = () => {
  const sId = document.getElementById('log-surgery').value;
  if (!sId) return;
  const s = lsGet(LS.SURGERIES).find(x => x.id === sId);
  const type = s?.type || 'percent';
  
  const isP = type === 'percent';
  document.getElementById('log-field-patients').classList.toggle('hidden', !isP);
  document.getElementById('log-field-charge').classList.toggle('hidden', !isP);
  document.getElementById('log-field-start').classList.toggle('hidden', isP);
  document.getElementById('log-field-end').classList.toggle('hidden', isP);
  document.getElementById('log-field-lunch').classList.toggle('hidden', isP);
  document.getElementById('log-field-rate').classList.toggle('hidden', isP);

  if (s) {
    if (isP) {
      document.getElementById('log-charge').value = s.defaultCharge || '';
    } else {
      document.getElementById('log-rate').value  = s.defaultRate || '';
      document.getElementById('log-lunch').value = s.lunchBreak  || '1.0';
      
      const startEl = document.getElementById('log-start');
      const endEl   = document.getElementById('log-end');
      
      if (startEl && endEl) {
          const rawS = (s.defaultStart || '').trim();
          const rawE = (s.defaultEnd || '').trim();
          startEl.value = rawS || '09:00';
          endEl.value   = rawE || '17:00';
      }
    }
  }
  updateLogCalcPreview();
};

/** Precise real-time calculation for clinical log entries. */
export const updateLogCalcPreview = () => {
  const sId = document.getElementById('log-surgery').value;
  const s = lsGet(LS.SURGERIES).find(x => x.id === sId);
  const type = s?.type || 'percent';
  const previewEl = document.getElementById('log-calc-preview');
  
  if (!s) { previewEl.classList.add('hidden'); return; }
  
  let val = 0;
  if (type === 'percent') {
    const pts = parseFloat(document.getElementById('log-patients').value) || 0;
    const chg = parseFloat(document.getElementById('log-charge').value) || 0;
    const share = (s.sharePercent || 35) / 100;
    val = pts * chg * share;
    previewEl.textContent = `📋 Estimated Earning: ${gbp(val)} (${s.sharePercent}%)`;
  } else {
    const start = document.getElementById('log-start').value;
    const end = document.getElementById('log-end').value;
    const lunch = parseFloat(document.getElementById('log-lunch').value) || 0;
    const rate = parseFloat(document.getElementById('log-rate').value) || 0;
    const hrs = timeToHours(start, end, lunch);
    val = hrs * rate;
    previewEl.textContent = `⏳ Estimated Earning: ${gbp(val)} (${hrs.toFixed(2)} hrs @ ${gbp(rate)})`;
  }
  previewEl.classList.remove('hidden');
};

/** Check for unsaved log changes. */
export const isLogFormDirty = () => {
    const surg = document.getElementById('log-surgery').value;
    const note = document.getElementById('log-notes').value.trim();
    const pts = document.getElementById('log-patients').value;
    const start = document.getElementById('log-start').value;
    return !!(surg || note || pts || start);
};

/** Persistence for clinical log entries. */
export const saveLogEntry = (onRefresh) => {
  const surgId = document.getElementById('log-surgery').value;
  const date = document.getElementById('log-date').value;
  if (!surgId || !date) return alert('Surgery and Date are required.');
  
  const s = lsGet(LS.SURGERIES).find(x => x.id === surgId);
  const type = s.type || 'percent';
  
  const entry = {
    id: editingLogId || uid(), 
    surgeryId: surgId, surgeryName: s.name, 
    date, type, notes: document.getElementById('log-notes').value.trim(),
    createdAt: new Date().toISOString()
  };
  
  if (type === 'percent') {
    entry.patients = parseFloat(document.getElementById('log-patients').value) || 0;
    entry.charge = parseFloat(document.getElementById('log-charge').value) || 0;
    entry.earning = entry.patients * entry.charge * (s.sharePercent / 100);
  } else {
    entry.start = document.getElementById('log-start').value;
    entry.end = document.getElementById('log-end').value;
    entry.lunch = parseFloat(document.getElementById('log-lunch').value) || 0;
    entry.rate = parseFloat(document.getElementById('log-rate').value) || 0;
    const hrs = timeToHours(entry.start, entry.end, entry.lunch);
    entry.earning = hrs * entry.rate;
  }
  
  const logs = lsGet(LS.LOGS);
  if (editingLogId) {
    const idx = logs.findIndex(l => l.id === editingLogId);
    if (idx !== -1) logs[idx] = entry;
  } else {
    logs.unshift(entry);
  }
  
  lsSet(LS.LOGS, logs);
  clearLogForm();
  renderLogTable(onRefresh);
};

export const clearLogForm = () => {
  editingLogId = null;
  document.getElementById('log-surgery').value = '';
  document.getElementById('log-patients').value = '';
  document.getElementById('log-charge').value = '';
  document.getElementById('log-notes').value = '';
  document.getElementById('log-start').value = '';
  document.getElementById('log-end').value = '';
  document.getElementById('log-lunch').value = '';
  document.getElementById('log-rate').value = '';
  document.getElementById('log-calc-preview').classList.add('hidden');
  document.getElementById('btn-cancel-log-edit').classList.add('hidden');
  document.getElementById('btn-save-log').textContent = '+ Save Entry';
  
  // Refresh the UI field visibility
  updateLogFieldVisibility();
};

/** Visualizing the clinical diary. */
export const renderLogTable = (onRefresh) => {
  const logs = lsGet(LS.LOGS);
  const wrap = document.getElementById('log-table-wrap');
  if (!wrap) return;

  if (!logs.length) {
    wrap.innerHTML = '<p class="text-slate-500 text-sm italic">No clinical log entries recorded yet.</p>';
    return;
  }

  // Filter logic (month/surgery)
  const fMonth = document.getElementById('log-filter-month').value;
  const fSurg  = document.getElementById('log-filter-surgery').value;
  
  let filtered = logs;
  if (fMonth) filtered = filtered.filter(l => l.date && l.date.startsWith(fMonth));
  if (fSurg)  filtered = filtered.filter(l => l.surgeryId === fSurg);

  const rows = filtered.map(l => {
    const sessionText = l.type === 'percent' ? `${l.patients} pts @ ${gbp(l.charge)}` : `${l.start} – ${l.end}`;
    const extraInfo   = l.type === 'percent' ? `${l.sharePercent || 35}% Share` : `${gbp(l.rate)}/hr (–${l.lunch}h bk)`;
    const netHrs      = l.type === 'rate' ? `${timeToHours(l.start, l.end, l.lunch).toFixed(2)} hrs` : '—';

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
        <td class="px-4 py-4">
          <div class="text-xs font-black text-slate-400 uppercase tracking-tighter">${new Date(l.date).toLocaleDateString('en-GB')}</div>
        </td>
        <td class="px-4 py-4">
          <div class="text-sm font-bold text-brand-900">${escHtml(l.surgeryName)}</div>
          <div class="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[200px]">${escHtml(l.notes || '—')}</div>
        </td>
        <td class="px-4 py-4 text-xs font-bold text-slate-600">${sessionText}</td>
        <td class="px-4 py-4 text-[10px] font-black text-slate-400 uppercase">${extraInfo}</td>
        <td class="px-4 py-4 text-xs font-mono font-bold text-slate-500">${netHrs}</td>
        <td class="px-4 py-4 font-mono font-black text-brand-700 text-sm">${gbp(l.earning)}</td>
        <td class="px-4 py-4 text-right">
          <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="btn-edit-log text-brand-500 hover:text-brand-700 p-1" data-id="${l.id}">✎</button>
            <button class="btn-del-log text-slate-300 hover:text-red-500 p-1 font-bold" data-id="${l.id}">×</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="w-full text-left">
      <thead class="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
        <tr>
          <th class="px-4 py-4">Date</th>
          <th class="px-4 py-4">Practice Info</th>
          <th class="px-4 py-4">Session</th>
          <th class="px-4 py-4">Rate & Config</th>
          <th class="px-4 py-4">Net Hours</th>
          <th class="px-4 py-4">Total Earned</th>
          <th class="px-4 py-4"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">${rows}</tbody>
    </table>`;
  if (onRefresh) onRefresh();
};

export const editLogEntry = (id) => {
  const l = lsGet(LS.LOGS).find(x => x.id === id);
  if (!l) return;
  editingLogId = l.id;
  document.getElementById('log-surgery').value = l.surgeryId;
  document.getElementById('log-date').value    = l.date;
  document.getElementById('log-notes').value   = l.notes || '';
  updateLogFieldVisibility();
  if (l.type === 'percent') {
    document.getElementById('log-patients').value = l.patients;
    document.getElementById('log-charge').value   = l.charge;
  } else {
    document.getElementById('log-start').value = l.start || document.getElementById('log-start').value;
    document.getElementById('log-end').value   = l.end   || document.getElementById('log-end').value;
    document.getElementById('log-lunch').value = l.lunch || document.getElementById('log-lunch').value;
    document.getElementById('log-rate').value  = l.rate  || document.getElementById('log-rate').value;
  }
  updateLogCalcPreview();
  document.getElementById('btn-save-log').textContent  = 'Update Entry';
  document.getElementById('btn-cancel-log-edit').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const deleteLogEntry = (id, onRefresh) => {
  showConfirm('Delete clinical log?', () => {
    const logs = lsGet(LS.LOGS).filter(l => l.id !== id);
    lsSet(LS.LOGS, logs);
    renderLogTable(onRefresh);
  }, 'Warning: This will permanently remove this shift from your work diary history.', 'Yes, Delete', 'danger');
};

export const populateLogDropdowns = (surgeries) => {
  populateSurgeryDropdown('log-surgery', surgeries);
  populateSurgeryDropdown('log-filter-surgery', surgeries);
};
