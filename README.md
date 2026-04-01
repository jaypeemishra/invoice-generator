# Pristine Aesthetics – Clinical Invoice Workstation

A professional document management system for dental hygienists, optimized for clinical documentation and surgery billing.

## ✨ Features
*   **Dual-Tier History:** Separate 'Finalised' records from 'Saved Drafts'.
*   **Surgery Pricing Engine:** Automated hourly and percentage-based fee calculations.
*   **High-Resolution Branding:** Champagne and Obsidian themed templates with SVG branding.
*   **Multi-Draft Logic:** Resume multiple pending documents with one click.
*   **Audit Tracking:** Status badges for Draft, Finalised, and Sent documents.
*   **Dynamic Filing:** Professional PDF nomenclature: `Invoice_[Num]_[Surgery]_[Date].pdf`.

## 🚀 Deployment Guide (Hostinger/VPS)
1.  Upload `index.html` and `api.php` to your web root (e.g., `public_html/`).
2.  Create a `data/` directory with `755` permissions.
3.  Set your Production URL in the **Settings > Core App Settings** tab.
4.  Default Password: `pristine123` (Change this immediately upon login).

## 🗄 Architecture
*   **Frontend:** HTML5 / Tailwind CSS / Vanilla JS.
*   **PDF Engine:** html2pdf.js (CDN).
*   **Backend:** Secure PHP Persistence API (`api.php`).
*   **Storage:** Local JSON filesystem sync (`data/*.json`).

## 🔐 Security
*   **GDPR Ready:** No medical data is committed to the repository; local JSON files are excluded by `.gitignore`.
*   **X-Auth Protection:** All write operations require a hashed password handshake.

---
© 2026 Pristine Aesthetics Ltd - Ready for Clinical Deployment.
