/**
 * auth.js
 * Authentication and password management module.
 */
import { LS, API_URL } from './constants.js';
import { showMsg } from './utils.js';

/** Verifies current token session on server. */
export const checkAuth = async () => {
  const auth = localStorage.getItem(LS.AUTH);
  if (!auth) {
    document.getElementById('login-overlay').classList.remove('hidden');
    return false;
  }
  try {
    const res = await fetch(`${API_URL}?type=login`, { headers: { 'X-Auth': auth } });
    if (!res.ok) throw new Error('Invalid');
    return true;
  } catch (err) {
    document.getElementById('login-overlay').classList.remove('hidden');
    return false;
  }
};

/** Handles login form submission. */
export const handleLogin = async (onSuccess) => {
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-err');
  if (!pw) return;
  
  try {
    const res = await fetch(`${API_URL}?type=login`, { headers: { 'X-Auth': pw } });
    if (!res.ok) throw new Error('Invalid Password.');
    
    localStorage.setItem(LS.AUTH, pw);
    document.getElementById('login-overlay').classList.add('hidden');
    if (onSuccess) onSuccess();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
};

/** Handles administrative password updating. */
export const changePassword = async () => {
  const newPw = document.getElementById('set-new-pw').value;
  const msgEl = document.getElementById('set-pw-msg');
  const auth = localStorage.getItem(LS.AUTH);
  
  if (newPw.length < 4) { showMsg(msgEl, 'Min 4 characters.', 'error'); return; }
  
  try {
    const res = await fetch(`${API_URL}?type=change-password`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth': auth },
      body: JSON.stringify({ newPassword: newPw })
    });
    if (!res.ok) throw new Error('Failed to update.');
    localStorage.setItem(LS.AUTH, newPw);
    showMsg(msgEl, '✅ Password updated successfully!', 'ok');
    document.getElementById('set-new-pw').value = '';
  } catch (err) {
    showMsg(msgEl, err.message, 'error');
  }
};
