# CatatDuit

Personal finance tracker for Indonesian users. Built with vanilla JS, no backend, no login — data stays on your device.

**Demo:** [app-catatduit.vercel.app](https://app-catatduit.vercel.app)

---

## What it does

- Track income, expenses, and savings across multiple wallets (BCA, GoPay, DANA, etc.)
- Monthly dashboard with cashflow and free cash estimate
- Budget per category, savings goals, bill reminders
- Financial Health Score based on your actual data
- Export/import CSV for backup
- Works offline, installable as PWA

---

## Stack

Vanilla JS · localStorage · Chart.js · Lucide Icons · PWA

No framework. No build step. No server.

---

## Run locally

```bash
git clone https://github.com/chandragumelar/catatduit.git
cd catatduit
npx serve .
```

---

## Privacy

Everything is stored in your browser's localStorage. Nothing is sent anywhere. Clearing your browser cache will delete your data — export regularly.
