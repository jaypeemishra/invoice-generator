/**
 * invoice-doc.js
 * Document generation (HTML/PDF) and naming.
 */
import { BRAND, API_URL, LS } from './constants.js?v=5';
import { gbp, generateNomenclature } from './utils.js?v=5';
import { logAudit, lsGet } from './api.js?v=5';
import { showConfirm } from './ui.js?v=5';

const fmt = d => d ? new Date(d).toLocaleDateString('en-GB') : '—';

/** Build professional clinical HTML for document output. */
export const buildInvoiceHtml = inv => {
  let tableHtml = '';
  
  if (inv.type === 'percent') {
    const rows = inv.rows.map(r => `
      <tr><td>${fmt(r.date)}</td><td>${r.patients}</td><td>${gbp(r.charge)}</td><td>${gbp(r.earning)}</td><td style="color:#023433;font-weight:700;">${gbp(r.due)}</td></tr>`).join('');
    tableHtml = `
      <table>
        <thead><tr><th>Date</th><th>Patients</th><th>Charge</th><th>Earning</th><th>Due (${inv.sharePercent}%)</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="background:#f9f5f3;font-weight:700;"><td colspan="3">TOTAL</td><td>${gbp(inv.totalEarning)}</td><td style="color:#D9A5A0;font-size:16px;">${gbp(inv.totalDue)}</td></tr></tfoot>
      </table>`;
  } else {
    const rows = inv.sessions.map(s => `
      <tr><td>${fmt(s.date)}</td><td>${s.start} - ${s.end} (${s.lunch || 0}h bk)</td><td style="font-weight:700;">${s.hours.toFixed(2)}h Net</td><td>${gbp(s.rate)}/hr</td><td style="color:#023433;font-weight:700;">${gbp(s.amount)}</td></tr>`).join('');
    tableHtml = `
      <table>
        <thead><tr><th>Date</th><th>Session (Break)</th><th>Net Hours</th><th>Rate</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="background:#f9f5f3;font-weight:700;"><td colspan="2">TOTAL</td><td style="color:#023433;">${inv.totalHours.toFixed(2)} hrs</td><td></td><td style="color:#D9A5A0;font-size:16px;">${gbp(inv.totalDue)}</td></tr></tfoot>
      </table>`;
  }

  const tableStyles = `
    <style>
      #invoice-pdf-root table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
      #invoice-pdf-root th { background-color: #023433; color: white; padding: 12px 15px; text-align: left; text-transform: uppercase; letter-spacing: 1px; font-size: 9px; }
      #invoice-pdf-root td { padding: 12px 15px; border-bottom: 1px solid #f0e9e7; vertical-align: top; }
      #invoice-pdf-root tr:nth-child(even) { background-color: #fcfaf9; }
      #invoice-pdf-root tfoot td { border-top: 2px solid #D9A5A0; padding-top: 15px; font-weight: bold; }
    </style>`;

  return `
    ${tableStyles}
    <div id="invoice-pdf-root" style="width:720px;padding:40px;background:#fff;font-family:Inter,sans-serif;color:#111;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #D9A5A0;padding-bottom:15px;margin-bottom:30px;">
        <div style="display:flex;align-items:center;gap:15px;">
          ${BRAND.logoSvg}
          <div>
            <h1 style="font-family:'Playfair Display',serif;font-size:26px;color:#023433;margin:0;letter-spacing:1px;line-height:1;">PRISTINE</h1>
            <p style="font-size:9px;text-transform:uppercase;color:#D9A5A0;letter-spacing:3px;margin:2px 0 0;">Aesthetics</p>
          </div>
        </div>
        <div style="text-align:right;">
          <h2 style="font-family:'Playfair Display',serif;font-size:22px;color:#023433;margin:0;letter-spacing:1px;">INVOICE</h2>
          <p style="font-size:12px;color:#666;margin:4px 0;">#${inv.number} | ${fmt(inv.date)}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:30px;">
        <div>
          <h4 style="font-size:10px;text-transform:uppercase;color:#D9A5A0;margin-bottom:6px;letter-spacing:1px;">From</h4>
          <p style="font-weight:700;color:#023433;font-size:14px;margin:0;">${BRAND.name}</p>
          <p style="font-size:11px;color:#555;margin:2px 0;">${BRAND.address}</p>
          <p style="font-size:10px;text-transform:uppercase;color:#D9A5A0;margin-top:4px;font-weight:700;">${lsGet(LS.CONFIG).senderEmail || ''}</p>
          <p style="font-size:9px;color:#888;margin:2px 0;">${BRAND.ref}</p>
        </div>
        <div style="text-align:right;">
          <h4 style="font-size:10px;text-transform:uppercase;color:#D9A5A0;margin-bottom:6px;letter-spacing:1px;">Invoice To</h4>
          <p style="font-weight:700;color:#023433;font-size:14px;margin:0;">${inv.surgery.name}</p>
          <p style="font-size:11px;color:#555;margin:2px 0;">${inv.surgery.address}</p>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0e9e7;">
            <p style="font-size:9px;text-transform:uppercase;color:#D9A5A0;margin-bottom:2px;letter-spacing:1px;">Billing Period</p>
            <p style="font-size:12px;color:#023433;font-weight:700;margin:0;">${inv.period || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div style="margin-bottom:30px;">${tableHtml}</div>
      <div style="background:#fdfaf9;border:1px solid #f2e1df;border-radius:12px;padding:15px 25px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center;">
         <div>
           <h4 style="font-size:10px;text-transform:uppercase;color:#D9A5A0;margin-bottom:5px;letter-spacing:1px;">BACS Details</h4>
           <p style="font-size:12px;color:#023433;margin:2px 0;"><strong>${lsGet(LS.CONFIG).bankPayee || BRAND.payee}</strong></p>
           <p style="font-size:11px;color:#555;margin:0;">${lsGet(LS.CONFIG).bankName || BRAND.bank} · Sort: ${lsGet(LS.CONFIG).bankSort || BRAND.sortCode} · Acc: ${lsGet(LS.CONFIG).bankAcc || BRAND.account}</p>
         </div>
         <div style="text-align:right;">
           <h4 style="font-size:10px;text-transform:uppercase;color:#D9A5A0;margin-bottom:5px;letter-spacing:1px;">Total Due</h4>
           <p style="font-family:'Playfair Display',serif;font-size:28px;color:#023433;margin:0;font-weight:700;">${gbp(inv.totalDue)}</p>
         </div>
      </div>
      ${inv.notes ? `<div style="font-style:italic;font-size:11px;color:#777;border-left:3px solid #D9A5A0;padding-left:15px;margin-top:20px;">Notes: ${inv.notes}</div>` : ''}
    </div>`;
};

/** Interactive PDF generation trigger. */
export const downloadPdf = async (inv, btnEl, onStatusUpdate) => {
  if (typeof html2pdf === 'undefined') {
    alert('PDF Generator not available. Please wait a moment while it loads.');
    return;
  }

  const btn = btnEl || document.getElementById('btn-download-pdf');
  const oldText = btn ? btn.textContent : 'Download PDF';
  if (btn) { btn.textContent = '⏳ Downloading...'; btn.disabled = true; }

  try {
    const root = document.getElementById('invoice-pdf-root');
    if (!root) throw new Error('Preview document not found.');

    const filename = generateNomenclature(inv);
    const opt = {
      margin: 0, 
      filename: filename, 
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, logging: false, width: 720 },
      jsPDF: { unit: 'px', format: [720, 1018], orientation: 'portrait' }
    };

    await html2pdf().from(root).set(opt).save();
    logAudit('PDF_DOWNLOADED', inv);

    // Promote status fromised to issued on download
    if (inv.status === 'finalised' || !inv.status) {
        if (onStatusUpdate) onStatusUpdate(inv.id, 'issued');
    }

    const auth = localStorage.getItem(LS.AUTH);
    html2pdf().from(root).set(opt).outputPdf('blob').then(blob => {
      fetch(`${API_URL}?type=upload-pdf&name=${filename}`, {
         method: 'POST',
         headers: { 'X-Auth': auth || '' },
         body: blob
      }).catch(() => {});
    });

  } catch (err) {
    console.error('[PDF ERROR]', err);
    alert('PDF generation failed. Please refresh and try again.');
  } finally {
    if (btn) { btn.textContent = oldText; btn.disabled = false; }
  }
};
