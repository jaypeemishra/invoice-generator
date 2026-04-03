/**
 * invoice-calc.js
 * Calculation engine for clinical billings.
 */
import { lsGet } from './api.js';
import { LS } from './constants.js';
import { gbp, timeToHours } from './utils.js?v=5';

/** Sanitizes a currency string for mathematical calculation. */
const cleanNum = str => parseFloat(str.replace(/[^0-9.]/g, '')) || 0;

/** Toggles between Type A (%) and Type B (Hourly) UI. */
export const toggleInvoiceType = type => {
  document.getElementById('section-percent').classList.toggle('hidden', type !== 'percent');
  document.getElementById('section-rate').classList.toggle('hidden', type !== 'rate');
};

/** Calculates summary totals for Type A percentage rows. */
export const calcPercentTotals = () => {
  let totE = 0, totD = 0;
  document.querySelectorAll('#percent-rows tr').forEach(tr => {
    totE += cleanNum(tr.querySelector('.p-row-earning').textContent);
    totD += cleanNum(tr.querySelector('.p-row-due').textContent);
  });
  document.getElementById('total-earning').textContent = gbp(totE);
  document.getElementById('total-due').textContent    = gbp(totD);
};

/** Calculates decimal earnings for a single Type A row. */
export const calcPercentRow = tr => {
  const sId = document.getElementById('inv-surgery').value;
  const s = lsGet(LS.SURGERIES).find(x => x.id === sId);
  const share = (s?.sharePercent ?? 35) / 100;
  
  const pts = parseFloat(tr.querySelector('.p-row-pts').value) || 0;
  const charge = parseFloat(tr.querySelector('.p-row-charge').value) || 0;
  const earning = pts * charge;
  
  tr.querySelector('.p-row-earning').textContent = gbp(earning);
  tr.querySelector('.p-row-due').textContent     = gbp(earning * share);
};

/** Re-calculates all rows in the current view (useful when practice/rate changes globally). */
export const refreshAllCalculations = () => {
    document.querySelectorAll('#percent-rows tr').forEach(tr => calcPercentRow(tr));
    document.querySelectorAll('#rate-rows tr').forEach(tr => calcRateRow(tr));
    calcPercentTotals();
    calcRateTotals();
};

/** Calculates summary totals for Type B hourly rows. */
export const calcRateTotals = () => {
  let totH = 0, totA = 0;
  document.querySelectorAll('#rate-rows tr').forEach(tr => {
    totH += parseFloat(tr.querySelector('.r-row-hours').textContent) || 0;
    totA += cleanNum(tr.querySelector('.r-row-amount').textContent);
  });
  document.getElementById('total-hours').textContent       = `${totH.toFixed(2)} hrs`;
  document.getElementById('total-rate-amount').textContent = gbp(totA);
};

/** Calculates temporal and financial values for a single Type B row. */
export const calcRateRow = tr => {
  const start = tr.querySelector('.r-row-start').value;
  const end   = tr.querySelector('.r-row-end').value;
  const lunch = parseFloat(tr.querySelector('.r-row-lunch').value) || 0;
  const rate  = parseFloat(tr.querySelector('.r-row-rate').value)  || 0;
  const hours = timeToHours(start, end, lunch);
  tr.querySelector('.r-row-hours').textContent  = `${hours.toFixed(2)} hrs`;
  tr.querySelector('.r-row-amount').textContent = gbp(hours * rate);
};
