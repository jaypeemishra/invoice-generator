/**
 * surgeries.js
 * Domain logic for managing clinical practice profiles (Surgeries).
 */
import { LS } from './constants.js?v=4';
import { lsGet, lsSet } from './api.js?v=4';
import { uid, escHtml } from './utils.js?v=4';
import { showConfirm } from './ui.js?v=4';

let editingSurgeryId = null;

/** Populates the main list of clinical practices. */
export const renderSurgeries = (onRefresh) => {
  const surgeries = lsGet(LS.SURGERIES);
  const list      = document.getElementById('surgery-list');
  const noMsg     = document.getElementById('no-surgeries-msg');
  if (!list) return;

  noMsg.classList.toggle('hidden', surgeries.length > 0);
  list.querySelectorAll('.surgery-card').forEach(c => c.remove());
  
  surgeries.forEach(s => {
    const card = document.createElement('div');
    card.className = 'surgery-card glass rounded-xl p-5 flex flex-col gap-2 transition-all hover:translate-y-[-2px]';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="font-semibold text-brand-700 text-sm">${escHtml(s.name)}</p>
          <p class="text-xs text-slate-500">${escHtml(s.address)}</p>
          <p class="text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-bold">
            ${s.type === 'percent' ? `Type A – ${s.sharePercent || 35}% Share` : `Type B – Hourly Rate`}
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-2">
        <button class="btn-edit-surgery text-xs bg-brand-700 hover:bg-brand-600 px-3 py-1.5 rounded-lg text-white transition shadow-sm" data-id="${s.id}">Edit</button>
        <button class="btn-del-surgery text-xs bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700 px-3 py-1.5 rounded-lg transition" data-id="${s.id}">Delete</button>
      </div>`;
    list.appendChild(card);
  });
  if (onRefresh) onRefresh(surgeries);
};

/** Populate a dropdown selector with active surgeries. */
export const populateSurgeryDropdown = (selId, surgeries) => {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Choose Surgery --</option>';
  surgeries.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    sel.appendChild(opt);
  });
  if (cur) sel.value = cur;
};

/** Toggle visibility of surgery form fields based on billing type. */
export const updateSurgeryFormFields = () => {
  const type = document.getElementById('sf-type').value;
  document.getElementById('sf-group-percent').classList.toggle('hidden', type !== 'percent');
  document.getElementById('sf-group-rate').classList.toggle('hidden', type !== 'rate');
};

/** Opens the surgery entry form. */
export const openSurgeryForm = (surgery = null) => {
  editingSurgeryId = surgery ? surgery.id : null;
  document.getElementById('surgery-form-title').textContent = surgery ? 'Edit Surgery' : 'New Surgery';
  document.getElementById('sf-name').value            = surgery?.name           || '';
  document.getElementById('sf-address').value         = surgery?.address        || '';
  document.getElementById('sf-contact').value         = surgery?.contact        || '';
  document.getElementById('sf-email').value           = surgery?.email          || '';
  document.getElementById('sf-type').value            = surgery?.type           || 'percent';
  document.getElementById('sf-default-charge').value  = surgery?.defaultCharge  ?? '';
  document.getElementById('sf-share-percent').value   = surgery?.sharePercent   ?? '35';
  document.getElementById('sf-default-rate').value    = surgery?.defaultRate    ?? '';
  document.getElementById('sf-lunch-break').value     = surgery?.lunchBreak     ?? '1.0';
  document.getElementById('sf-default-start').value   = surgery?.defaultStart   || '09:00';
  document.getElementById('sf-default-end').value     = surgery?.defaultEnd     || '17:00';
  updateSurgeryFormFields();
  document.getElementById('surgery-form-wrap').classList.remove('hidden');
};

/** Close the surgery entry form. */
export const closeSurgeryForm = () => {
  document.getElementById('surgery-form-wrap').classList.add('hidden');
  editingSurgeryId = null;
};

/** Persists a surgical practice to storage. */
export const saveSurgery = (onSave) => {
  const name    = document.getElementById('sf-name').value.trim();
  const address = document.getElementById('sf-address').value.trim();
  const type    = document.getElementById('sf-type').value;
  if (!name || !address) return;
  
  const payload = { 
    name, 
    address, 
    type,
    contact: document.getElementById('sf-contact').value.trim(),
    email: document.getElementById('sf-email').value.trim(),
    defaultCharge: parseFloat(document.getElementById('sf-default-charge').value) || null,
    sharePercent: parseFloat(document.getElementById('sf-share-percent').value) || 35,
    defaultRate: parseFloat(document.getElementById('sf-default-rate').value) || null,
    lunchBreak: parseFloat(document.getElementById('sf-lunch-break').value) || 0,
    defaultStart: document.getElementById('sf-default-start').value || '09:00',
    defaultEnd: document.getElementById('sf-default-end').value || '17:00'
  };
  
  const surgeries = lsGet(LS.SURGERIES);
  if (editingSurgeryId) {
    const idx = surgeries.findIndex(s => s.id === editingSurgeryId);
    if (idx > -1) surgeries[idx] = { ...surgeries[idx], ...payload };
  } else {
    surgeries.push({ id: uid(), ...payload });
  }
  lsSet(LS.SURGERIES, surgeries);
  closeSurgeryForm();
  renderSurgeries(onSave);
};

export const deleteSurgery = (id, onSave) => {
  showConfirm('Delete clinical practice?', () => {
    const surgeries = lsGet(LS.SURGERIES).filter(s => s.id !== id);
    lsSet(LS.SURGERIES, surgeries);
    renderSurgeries(onSave);
  }, 'Warning: This will permanently remove this surgery and its configurations.', 'Yes, Delete', 'danger');
};

/** Check for unsaved surgery edits. */
export const isSurgeryFormDirty = () => {
  const name = document.getElementById('sf-name').value.trim();
  const address = document.getElementById('sf-address').value.trim();
  const wrap = document.getElementById('surgery-form-wrap');
  return wrap && !wrap.classList.contains('hidden') && (name || address);
};
