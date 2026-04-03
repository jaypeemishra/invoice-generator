/** Generic UI orchestration: tabs, modals, and confirmations. */

/** Global state for confirmation callbacks and active documents. */
let confirmCallback = null;
export let activeModalInvoice = null;

/** Show a professional confirmation dialog. */
export const showConfirm = (msg, onConfirm, sub = 'This action will update your clinical records.', btn = 'Yes, Proceed', type = 'info') => {
  const el = document.getElementById('confirm-msg');
  if (el) el.textContent = msg;
  
  const subEl = document.getElementById('confirm-subtext');
  if (subEl) subEl.textContent = sub;
  
  const btnEl = document.getElementById('btn-confirm-yes');
  if (btnEl) {
      btnEl.textContent = btn;
      btnEl.classList.toggle('bg-red-600', type === 'danger');
      btnEl.classList.toggle('bg-brand-700', type !== 'danger');
  }

  const iconEl = document.getElementById('confirm-icon');
  if (iconEl) {
      iconEl.textContent = type === 'danger' ? '⚠️' : '💬';
      iconEl.classList.toggle('bg-red-50', type === 'danger');
      iconEl.classList.toggle('text-red-500', type === 'danger');
      iconEl.classList.toggle('bg-blue-50', type !== 'danger');
      iconEl.classList.toggle('text-blue-500', type !== 'danger');
  }

  confirmCallback = onConfirm;
  document.getElementById('confirm-modal').classList.remove('hidden');
};

/** Initialize Confirmation listener. */
export const initConfirmListeners = () => {
  document.getElementById('btn-confirm-yes').onclick = () => {
    if (confirmCallback) confirmCallback();
    document.getElementById('confirm-modal').classList.add('hidden');
  };
  document.getElementById('btn-confirm-cancel').onclick = () => {
    document.getElementById('confirm-modal').classList.add('hidden');
  };
};

/** Central tab logic. Refreshes corresponding modules on entry. */
export const switchTab = (tabId, refreshCallbacks = {}) => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('hidden', p.id !== `tab-${tabId}`));
  
  // Refresh content via callbacks map
  if (refreshCallbacks[tabId]) refreshCallbacks[tabId]();
  
  if (tabId === 'create') {
    // Scroll to top for data entry
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

/** Opens the primary preview modal and restores interaction. */
export const openModal = (invData, htmlContent) => {
  activeModalInvoice = invData; // Store the actual data object
  const modal = document.getElementById('modal-overlay');
  const preview = document.getElementById('invoice-preview');
  if (modal && preview) {
    preview.innerHTML = htmlContent;
    modal.classList.remove('hidden');
    modal.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';
  }
};

/** Closes the primary preview modal. */
export const closeModal = () => {
  activeModalInvoice = null;
  const modal = document.getElementById('modal-overlay');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.pointerEvents = 'none';
  }
  document.body.style.overflow = '';
};

/** Renders a standard clinical status badge for document history. */
export const renderStatusBadge = status => {
  const map = {
    'draft':     'bg-slate-50 text-slate-400 border border-slate-100',
    'finalised': 'bg-blue-300/10 text-brand-700 border border-brand-200/40',
    'issued':    'bg-brand-50 text-brand-500 border border-brand-100',
    'emailed':   'bg-green-50 text-green-600 border border-green-100',
    'sent':      'bg-green-50 text-green-600 border border-green-100',
    'paid':      'bg-indigo-50 text-indigo-600 border border-indigo-100'
  };
  const cls = map[status] || 'bg-slate-100 text-slate-400';
  const label = (status || 'finalised').toUpperCase();
  return `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${cls}">${label}</span>`;
};
