/**
 * app.js
 * Main entry point. Bootstraps the application and registers global event listeners.
 */
import { LS, API_URL, BRAND } from './constants.js?v=5';
import { dbg, uid, formatPeriodLabel, showMsg, gbp, generateNomenclature } from './utils.js?v=5';
import { lsGet, lsSet, loadFromFile, logAudit } from './api.js?v=5';
import { checkAuth, handleLogin, changePassword } from './auth.js?v=5';
import { initConfirmListeners, switchTab, openModal, closeModal, activeModalInvoice, renderStatusBadge, showConfirm } from './ui.js?v=5';
import { renderSurgeries, populateSurgeryDropdown, openSurgeryForm, closeSurgeryForm, saveSurgery, deleteSurgery, updateSurgeryFormFields, isSurgeryFormDirty } from './surgeries.js?v=5';
import { toggleInvoiceType, calcPercentTotals, calcRateTotals, refreshAllCalculations } from './invoice-calc.js?v=5';
import { buildInvoiceHtml, downloadPdf } from './invoice-doc.js?v=5';
import { addPercentRow, addRateRow, collectInvoiceData, clearInvoiceForm, generateNextInvoiceNumber, importLogsToInvoice, finaliseInvoice, loadDraft, saveDraft, isInvoiceFormDirty } from './invoice-state.js?v=5';
import { renderHistory, renderDrafts, clearHistory } from './history.js?v=5';
import { updateLogFieldVisibility, updateLogCalcPreview, saveLogEntry, clearLogForm, editLogEntry, renderLogTable, deleteLogEntry, populateLogDropdowns, isLogFormDirty } from './logs.js?v=5';
import { renderAuditLog, archivePastData, renderInsights, setInsightsView } from './insights.js?v=5';
import { populateBankDropdown, loadBankStatement } from './bank.js?v=5';

const initApp = async () => {
    document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
    document.querySelector('main').style.opacity = '0.6';

    await Promise.all([
        loadFromFile(LS.SURGERIES),
        loadFromFile(LS.INVOICES),
        loadFromFile(LS.LOGS),
        loadFromFile(LS.DRAFT),
        loadFromFile(LS.CONFIG),
        loadFromFile(LS.AUDIT),
        loadFromFile(LS.ARCHIVE),
    ]);

    let cfg = lsGet(LS.CONFIG);
    if (!cfg.senderEmail && !cfg.ccEmail) {
        cfg.baseUrl     = 'https://thepristineaesthetics.com/invoice-gen/';
        cfg.senderEmail = 'pristineaesthetics80@gmail.com';
        cfg.ccEmail     = 'swatijai.mishra@gmail.com';
        lsSet(LS.CONFIG, cfg); 
    }
    
    document.getElementById('set-base-url').value     = cfg.baseUrl     || '';
    document.getElementById('set-sender-email').value = cfg.senderEmail || '';
    document.getElementById('set-cc-email').value     = cfg.ccEmail     || '';
    document.getElementById('set-bank-payee').value   = cfg.bankPayee   || '';
    document.getElementById('set-bank-name').value    = cfg.bankName    || '';
    document.getElementById('set-bank-sort').value    = cfg.bankSort    || '';
    document.getElementById('set-bank-acc').value     = cfg.bankAcc     || '';
    
    document.querySelector('main').style.opacity = '1';
    document.querySelector('main').style.transition = 'opacity .3s';

    seedSurgeries();
    const invoices = lsGet(LS.INVOICES);
    document.getElementById('inv-number').value = generateNextInvoiceNumber();

    refreshUI();

    if (!lsGet(LS.ARCHIVE).length) {
       const dummySurgery = lsGet(LS.SURGERIES)[0] || { name: 'First Dental Grove Park', id: 'surg1' };
       const dummyInvs = [
         { id: 'arc1', number: 'PA-0001', date: '2024-09-15', period: 'Sep 2024', totalDue: 1500, totalEarning: 4285, surgery: dummySurgery, type: 'percent', status: 'finalised' },
         { id: 'arc2', number: 'PA-0002', date: '2024-12-10', period: 'Dec 2024', totalDue: 1200, totalEarning: 3428, surgery: dummySurgery, type: 'percent', status: 'finalised' },
         { id: 'arc3', number: 'PA-0003', date: '2025-02-20', period: 'Feb 2025', totalDue: 850, totalEarning: 2428, surgery: dummySurgery, type: 'percent', status: 'finalised' }
       ];
       lsSet(LS.ARCHIVE, [{
           id: 'FY-DUMMY', fy: '2024/2025', invCount: 3, logCount: 0, 
           data: { invoices: dummyInvs, logs: [] }, archivedAt: new Date().toISOString()
       }]);
    }

    const d = lsGet(LS.DRAFT, null);
    if (d && d.number && (d.rows?.length || d.sessions?.length)) {
      showConfirm('A saved draft was found. Load it back into the form?', () => {
          loadDraft(d);
          switchTab('create');
      });
    }

    addPercentRow();
    addRateRow();
    populateBankDropdown();
    dbg('App initialised (file-backed storage active)');
};

const refreshUI = () => {
    const surgeries = lsGet(LS.SURGERIES);
    renderSurgeries(s => {
        populateSurgeryDropdown('inv-surgery', s);
        populateSurgeryDropdown('log-surgery', s);
        populateSurgeryDropdown('log-filter-surgery', s);
        populateSurgeryDropdown('ins-surgery', s);
    });
    populateLogDropdowns(surgeries);
    renderHistory();
    renderLogTable();
    updateLogFieldVisibility();
    renderDrafts();
};

const seedSurgeries = () => {
    const existing = lsGet(LS.SURGERIES);
    if (existing.length > 0) return;
    const seeds = [
      { id: uid(), name: 'Warwick Lodge Dental', address: '44 Canterbury Rd, Herne Bay CT6 5DF', type: 'percent', sharePercent: 35, defaultCharge: 120 },
      { id: uid(), name: 'Highfield Dental', address: '81 Crofton Road, Orpington BR6 8HU', type: 'rate', defaultRate: 35, lunchBreak: 1.0 }
    ];
    lsSet(LS.SURGERIES, seeds);
};

// ── Global Listeners ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initConfirmListeners();
    checkAuth().then(ok => { if (ok) initApp(); });

    // Login
    document.getElementById('btn-login').onclick = () => handleLogin(initApp);
    document.getElementById('login-pw').onkeyup = e => { if (e.key === 'Enter') handleLogin(initApp); };

    // Tabs with Dirty Check
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            const currentTab = document.querySelector('.tab-btn.active')?.dataset.tab;
            const newTab = btn.dataset.tab;
            if (currentTab === newTab) return;

            let isDirty = false;
            if (currentTab === 'create')    isDirty = isInvoiceFormDirty();
            if (currentTab === 'log')       isDirty = isLogFormDirty();
            if (currentTab === 'surgeries') isDirty = isSurgeryFormDirty();
            if (currentTab === 'settings') {
                const cfg = lsGet(LS.CONFIG);
                isDirty = document.getElementById('set-base-url').value !== (cfg?.baseUrl || '');
            }

            const performSwitch = () => {
                switchTab(newTab, {
                    'create':   () => { clearInvoiceForm(); refreshAllCalculations(); },
                    'log':      () => { clearLogForm(); renderLogTable(); },
                    'history':  () => renderHistory(),
                    'insights': () => { renderInsights(); populateBankDropdown(); },
                    'audit':    () => renderAuditLog(),
                    'surgeries': () => { closeSurgeryForm(); renderSurgeries(); },
                    'settings': () => {
                        const cfg = lsGet(LS.CONFIG);
                        document.getElementById('set-base-url').value = cfg.baseUrl || '';
                        document.getElementById('set-sender-email').value = cfg.senderEmail || '';
                        document.getElementById('set-cc-email').value = cfg.ccEmail || '';
                        document.getElementById('set-bank-payee').value = cfg.bankPayee || '';
                        document.getElementById('set-bank-name').value = cfg.bankName || '';
                        document.getElementById('set-bank-sort').value = cfg.bankSort || '';
                        document.getElementById('set-bank-acc').value = cfg.bankAcc || '';
                    }
                });
            };

            if (isDirty) {
                showConfirm('Unsaved clinical changes?', () => {
                    performSwitch();
                }, 'Warning: Changing tabs will clear your current entries. Choose "Discard & Leave" to proceed or "Cancel" to finish your work.', 'Discard & Leave', 'danger');
            } else {
                performSwitch();
            }
        };
    });

    // Surgeries
    document.getElementById('btn-add-surgery').onclick = () => openSurgeryForm();
    document.getElementById('btn-save-surgery').onclick = () => saveSurgery(refreshUI);
    document.getElementById('btn-cancel-surgery').onclick = () => closeSurgeryForm();
    document.getElementById('sf-type').onchange = () => updateSurgeryFormFields();
    document.getElementById('surgery-list').onclick = e => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('btn-edit-surgery')) {
            const s = lsGet(LS.SURGERIES).find(x => x.id === id);
            openSurgeryForm(s);
        } else if (e.target.classList.contains('btn-del-surgery')) {
            deleteSurgery(id, refreshUI);
        }
    };

    // Invoice Form
    document.getElementById('inv-type').onchange = e => toggleInvoiceType(e.target.value);
    document.getElementById('inv-surgery').onchange = e => {
        const s = lsGet(LS.SURGERIES).find(x => x.id === e.target.value);
        if (s) {
            document.getElementById('inv-type').value = s.type || 'percent';
            toggleInvoiceType(s.type || 'percent');
            document.getElementById('sib-name').textContent = s.name;
            document.getElementById('sib-address').textContent = s.address;
            document.getElementById('sib-rate-info').textContent = s.type === 'percent' ? `${s.sharePercent}% Share` : `Rate: ${gbp(s.defaultRate)}/hr`;
            document.getElementById('sib-hint').textContent = s.type === 'percent' ? 'Commission deducted from total treatment charges.' : 'Based on actual clinical session hours.';
            document.getElementById('surgery-info-banner').classList.remove('hidden');
            
            // Recalculate everything for the new surgery
            refreshAllCalculations();
        } else {
            document.getElementById('surgery-info-banner').classList.add('hidden');
        }
    };
    document.getElementById('btn-add-row').onclick = () => addPercentRow();
    document.getElementById('btn-add-session').onclick = () => addRateRow();
    document.getElementById('btn-preview').onclick = () => {
        const inv = collectInvoiceData();
        if (inv) openModal(inv, buildInvoiceHtml(inv));
    };
    document.getElementById('btn-save-draft').onclick = () => saveDraft();
    document.getElementById('btn-clear').onclick = () => clearInvoiceForm();
    document.getElementById('btn-import-logs-percent').onclick = () => importLogsToInvoice('percent');
    document.getElementById('btn-import-logs-rate').onclick = () => importLogsToInvoice('rate');
    document.getElementById('inv-import-month').onchange = e => {
        if (e.target.value) document.getElementById('inv-period').value = formatPeriodLabel(e.target.value);
    };

    // Modal Actions
    document.getElementById('btn-close-modal').onclick = () => closeModal();
    
    const updateInvoiceStatus = (id, status) => {
        const list = lsGet(LS.INVOICES);
        const idx = list.findIndex(x => x.id === id);
        if (idx !== -1) {
            list[idx].status = status;
            lsSet(LS.INVOICES, list);
            renderHistory();
        }
    };

    // Modal Buttons (Download / Finalise)
    document.getElementById('btn-download-pdf').onclick = () => {
        const inv = activeModalInvoice || collectInvoiceData();
        if (!inv) return;
        downloadPdf(inv, updateInvoiceStatus);
    };

    document.getElementById('btn-finalise').onclick = () => {
        const inv = activeModalInvoice || collectInvoiceData();
        if (!inv) return;
        showConfirm('Finalise Clinical Record?', () => {
            finaliseInvoice(inv, refreshUI);
            closeModal();
        }, 'This will save the document to your official clinical history.', 'Yes, Finalise', 'info');
    };

    // History & Drafts
    document.getElementById('btn-clear-history').onclick = () => clearHistory(refreshUI);
    document.getElementById('history-list').onclick = e => {
        const id = e.target.dataset.id || e.target.closest('tr')?.dataset.id;
        if (!id) return;
        const inv = lsGet(LS.INVOICES).find(x => x.id === id);
        if (e.target.classList.contains('btn-hist-view')) {
            openModal(inv, buildInvoiceHtml(inv));
        } else if (e.target.classList.contains('btn-hist-email')) {
             const cfg = lsGet(LS.CONFIG);
             document.getElementById('email-from').value = cfg.senderEmail || '';
             document.getElementById('email-to').value = inv.surgery?.email || '';
             document.getElementById('email-cc').value = cfg.ccEmail || '';
             document.getElementById('email-modal').dataset.id = inv.id;
             document.getElementById('email-modal').classList.remove('hidden');
        } else if (e.target.classList.contains('btn-hist-paid')) {
             showConfirm('Mark as PAID?', () => {
                 updateInvoiceStatus(id, 'paid');
             }, 'Confirm that you have received full payment for this clinical session.', 'Mark Paid', 'info');
        } else if (e.target.classList.contains('btn-hist-del')) {
             showConfirm('Delete issued document?', () => {
                 const list = lsGet(LS.INVOICES).filter(x => x.id !== id);
                 lsSet(LS.INVOICES, list);
                 renderHistory();
             }, 'Warning: This will permanently remove this invoice from your history.', 'Yes, Delete', 'danger');
        }
    };
    document.getElementById('drafts-list').onclick = e => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('btn-draft-load')) {
            const d = lsGet(LS.DRAFT).find(x => x.id === id || x.number === id);
            loadDraft(d);
            switchTab('create');
        } else if (e.target.classList.contains('btn-draft-del')) {
            showConfirm('Discard draft?', () => {
                const list = lsGet(LS.DRAFT).filter(x => x.id !== id && x.number !== id);
                lsSet(LS.DRAFT, list);
                renderDrafts();
            }, 'Are you sure you want to remove this incomplete document?', 'Yes, Discard', 'danger');
        }
    };

    // Clinical Logs
    document.getElementById('log-surgery').onchange = () => {
        updateLogFieldVisibility();
        updateLogCalcPreview();
    };
    document.getElementById('log-patients').oninput = () => updateLogCalcPreview();
    document.getElementById('log-charge').oninput = () => updateLogCalcPreview();
    document.getElementById('log-start').oninput = () => updateLogCalcPreview();
    document.getElementById('log-end').oninput = () => updateLogCalcPreview();
    document.getElementById('log-lunch').oninput = () => updateLogCalcPreview();
    document.getElementById('log-rate').oninput = () => updateLogCalcPreview();
    document.getElementById('btn-save-log').onclick = () => saveLogEntry(refreshUI);
    document.getElementById('btn-cancel-log-edit').onclick = () => clearLogForm();
    document.getElementById('btn-apply-log-filter').onclick = () => renderLogTable();
    document.getElementById('btn-clear-log-filter').onclick = () => {
        document.getElementById('log-filter-surgery').value = '';
        document.getElementById('log-filter-month').value = '';
        renderLogTable();
    };
    document.getElementById('log-table-wrap').onclick = e => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('btn-edit-log')) editLogEntry(id);
        else if (e.target.classList.contains('btn-del-log')) deleteLogEntry(id, refreshUI);
    };

    // Insights Tabs — guard against elements not present in current view
    const insSurgery = document.getElementById('ins-surgery');
    const insFrom    = document.getElementById('ins-from');
    const insTo      = document.getElementById('ins-to');
    if (insSurgery) insSurgery.onchange = () => renderInsights();
    if (insFrom)    insFrom.onchange    = () => renderInsights();
    if (insTo)      insTo.onchange      = () => renderInsights();
    
    document.querySelectorAll('.ins-sub-tab').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.ins-sub-tab').forEach(b => {
                b.classList.remove('active', 'text-brand-700', 'border-brand-500');
                b.classList.add('text-slate-400', 'border-transparent');
            });
            btn.classList.add('active', 'text-brand-700', 'border-brand-500');
            btn.classList.remove('text-slate-400', 'border-transparent');
            
            const target = btn.dataset.target;
            // Auto-populate bank dropdown when switching to bank tab
            if (target === 'bank') populateBankDropdown();
            setInsightsView(target);
        };
    });

    // Bank Dropdown Always Ready for Integrated View
    document.getElementById('bank-file-selector').onchange = e => loadBankStatement(e.target.value);

    // Audit
    document.getElementById('btn-clear-audit').onclick = () => {
        showConfirm('Clear audit history?', () => {
            lsSet(LS.AUDIT, []);
            renderAuditLog();
        });
    };

    // Settings
    document.getElementById('btn-save-config').onclick = () => {
        const cfg = {
            baseUrl: document.getElementById('set-base-url').value.trim(),
            senderEmail: document.getElementById('set-sender-email').value.trim(),
            ccEmail: document.getElementById('set-cc-email').value.trim(),
            bankPayee: document.getElementById('set-bank-payee').value.trim(),
            bankName: document.getElementById('set-bank-name').value.trim(),
            bankSort: document.getElementById('set-bank-sort').value.trim(),
            bankAcc: document.getElementById('set-bank-acc').value.trim()
        };
        lsSet(LS.CONFIG, cfg);
        alert('Configuration saved!');
    };
    document.getElementById('btn-archive-fy').onclick = () => {
        const fy = document.getElementById('set-fy-year').value;
        if (!fy) return alert('Enter year');
        showConfirm(`Archive clinical data for FY ${fy}?`, () => archivePastData(fy, refreshUI));
    };
    document.getElementById('btn-change-pw').onclick = () => changePassword();

    // Email Modal
    document.getElementById('btn-email-gmail').onclick = () => {
        const id = document.getElementById('email-modal').dataset.id;
        const inv = lsGet(LS.INVOICES).find(x => x.id === id);
        const cfg = lsGet(LS.CONFIG);
        const subject = `Clinical Invoice ${inv.number} - ${inv.surgery?.name}`;
        const body    = `Dear ${inv.surgery?.name},\n\nPlease find the clinical invoice for ${inv.period} at the link below:\n\n${cfg.baseUrl || ''}data/pdfs/${generateNomenclature(inv)}\n\nBest regards,\n${BRAND.name}`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(document.getElementById('email-from').value)}&to=${encodeURIComponent(document.getElementById('email-to').value)}&cc=${encodeURIComponent(document.getElementById('email-cc').value)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');
        updateInvoiceStatus(id, 'emailed');
        document.getElementById('email-modal').classList.add('hidden');
    };
});
