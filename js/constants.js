/**
 * constants.js
 * Definitions for branding and persistent storage keys.
 */

export const BRAND = {
  name    : 'Pristine Aesthetics Ltd',
  address : '90 King Harolds Way, Bexleyheath, DA7 5QZ',
  ref     : 'Swati Mishra / Dental Hygienist / GDC Number 286837',
  bank    : 'Tide Bank',
  sortCode: '04-06-05',
  account : '14424579',
  payee   : 'Pristine Aesthetics Ltd',
  primary : '#023433',
  accent  : '#D9A5A0',
  logoSvg : `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#D9A5A0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 12l10 10 10-10L12 2z"></path>
                <path d="M12 6L6 12l6 6 6-6L12 6z"></path>
             </svg>`
};

export const LS = {
  SURGERIES : 'pa_surgeries',
  INVOICES  : 'pa_invoices',
  AUTH      : 'pa_auth',
  CONFIG    : 'pa_config',
  AUDIT     : 'pa_audit',
  ARCHIVE   : 'pa_archive',
  LOGS      : 'pa_logs',
  DRAFT     : 'pa_draft'
};

export const FILE_TYPE = {
  [LS.SURGERIES] : 'surgeries',
  [LS.INVOICES]  : 'invoices',
  [LS.LOGS]      : 'logs',
  [LS.DRAFT]     : 'draft',
  [LS.CONFIG]    : 'config',
  [LS.AUDIT]     : 'audit',
  [LS.ARCHIVE]   : 'archive'
};

export const API_URL = 'api.php';
export const DEBUG   = true;
