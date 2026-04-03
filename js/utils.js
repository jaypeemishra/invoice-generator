/**
 * utils.js
 * Pure utility functions and clinical helpers.
 */
import { DEBUG } from './constants.js';

export const dbg = (...args) => DEBUG && console.debug('[InvGen]', ...args);

/** Show a temporary message to the user. */
export const showMsg = (el, text, type = 'info') => {
  if (!el) return;
  el.textContent = text;
  el.className = `text-xs mt-1 ${type === 'error' ? 'text-red-400' : 'text-green-400'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3500);
};

/** Format as GBP with thousands separator */
export const gbp = n => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(parseFloat(n || 0));

/** Generate Unique ID */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** HTML Escape */
export const escHtml = str => (str ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/**
 * Generate a professional nomenclature for clinical documents:
 */
export const generateNomenclature = inv => {
  const prefix = 'Invoice';
  const num    = (inv.number || '0000').replace(/[^a-z0-9-]/gi, '_');
  const surg   = (inv.surgery?.name || 'Pristine').replace(/[^a-z0-9]/gi, '_').slice(0, 20);
  const period = (inv.period || 'Period').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
  
  const dateObj = inv.date ? new Date(inv.date) : new Date();
  const months  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const dd      = String(dateObj.getDate()).padStart(2, '0');
  const mmm     = months[dateObj.getMonth()];
  const yyyy    = dateObj.getFullYear();
  
  return `${prefix}_${num}_${surg}_${period}_${dd}-${mmm}-${yyyy}.pdf`;
};

/** Format Month-Year string (YYYY-MM) as a label. */
export const formatPeriodLabel = monthStr => {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  const date = new Date(y, parseInt(m)-1);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[date.getMonth()]} ${y}`;
};

/** Calculate net decimal hours from time range. */
export const timeToHours = (start, end, lunch = 0) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = (eh * 60 + em) - (sh * 60 + sm);
  const diffHours = total > 0 ? (total / 60) : 0;
  const net = diffHours - parseFloat(lunch || 0);
  return net > 0 ? net : 0;
};
