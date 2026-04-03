/**
 * api.js
 * Persistence layer handling LocalStorage and server sync.
 */
import { LS, FILE_TYPE, API_URL } from './constants.js';
import { dbg, uid, gbp } from './utils.js';

/** Get item from LocalStorage with safer parsing. */
export const lsGet = (key, def = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === '[]' || raw === 'null') {
      if (def !== null) return def;
      return (key === LS.CONFIG) ? {} : [];
    }
    let val = JSON.parse(raw);
    if (key === LS.CONFIG && (val === null || Array.isArray(val) || typeof val !== 'object')) {
        val = {};
    }
    return val || (key === LS.CONFIG ? {} : []);
  } catch { return (key === LS.CONFIG) ? {} : []; }
};

/** Set item and trigger server sync. */
export const lsSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { dbg('lsSet error', e); }
  syncToFile(key, val);
};

/** Mirror LocalStorage to server-side JSON. */
export const syncToFile = async (key, val) => {
  const type = FILE_TYPE[key];
  if (!type) return;
  const auth = localStorage.getItem(LS.AUTH);
  try {
    const res = await fetch(`${API_URL}?type=${type}`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth': auth || '' },
      body   : JSON.stringify(val),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    dbg(`Synced "${type}" to file.`);
  } catch (err) {
    dbg(`syncToFile failed for "${type}":`, err.message);
  }
};

/** Fetch from server-side JSON and update LocalStorage. */
export const loadFromFile = async key => {
  const type = FILE_TYPE[key];
  if (!type) return lsGet(key);
  const auth = localStorage.getItem(LS.AUTH);
  try {
    const res  = await fetch(`${API_URL}?type=${type}`, {
      headers: { 'X-Auth': auth || '' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Conflict Resolution: Only overwrite if data is non-empty or if key is not CONFIG
    if (key === LS.CONFIG) {
        const local = lsGet(LS.CONFIG);
        if (Object.keys(data).length === 0 && Object.keys(local).length > 0) {
            dbg(`loadFromFile for "${type}": Server is empty, keeping local data.`);
            return local;
        }
    }
    
    localStorage.setItem(key, JSON.stringify(data));
    dbg(`Loaded "${type}" from file.`);
    return data;
  } catch (err) {
    dbg(`loadFromFile failed for "${type}", falling back to localStorage:`, err.message);
    return lsGet(key);
  }
};

/** Clinical Audit Logging. */
export const logAudit = (action, data = null, details = '') => {
  const logs = lsGet(LS.AUDIT);
  let invNum  = '—';
  let surgery = '—';
  let finalDetails = details;

  if (action === 'DATA_ARCHIVED' && data) {
    invNum = `FY ${data.fy}`;
    surgery = 'System';
    finalDetails = `Archived ${data.invCount} invoices and ${data.logCount} logs.`;
  } else if (data && data.number) {
    invNum = data.number;
    surgery = data.surgery?.name || '—';
    if (!finalDetails) finalDetails = `Type: ${data.type} | Total: ${gbp(data.totalDue)}`;
  } else if (typeof data === 'string') {
    finalDetails = data;
  }

  const entry = {
    id: uid(),
    ts: new Date().toISOString(),
    action,
    invNum,
    surgery,
    details: finalDetails
  };
  logs.unshift(entry);
  lsSet(LS.AUDIT, logs.slice(0, 300));
};
