// ===== UTILS.JS — Pure utility functions =====

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getCurrencySymbol() {
  try {
    const code = localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'IDR';
    const opt  = CURRENCY_OPTIONS.find(c => c.code === code);
    return opt ? opt.symbol : 'Rp';
  } catch { return 'Rp'; }
}

function formatRupiah(angka) {
  if (angka === null || angka === undefined || isNaN(angka)) {
    return getCurrencySymbol() + ' 0';
  }
  const n   = Number(angka);
  const sym = getCurrencySymbol();
  return (n < 0 ? '-' + sym + ' ' : sym + ' ') + Math.abs(n).toLocaleString('id-ID');
}

function parseNominal(str) {
  return Math.min(parseInt(String(str).replace(/\D/g, ''), 10) || 0, MAX_NOMINAL);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getRolling12Months() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
}

function getCurrentMonthYear() {
  const n = new Date();
  return { year: n.getFullYear(), month: n.getMonth() };
}

function isSameMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === year && d.getMonth() === month;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function destroyChart(key) {
  if (state.chartInstances[key]) {
    try { state.chartInstances[key].destroy(); } catch (e) {}
    delete state.chartInstances[key];
  }
}

function chartOptions(extraOpts = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Inter', size: 11 }, padding: 12, boxWidth: 12 },
      },
      tooltip: { callbacks: { label: ctx => ` ${formatRupiah(ctx.raw)}` } },
    },
    scales: {
      y: {
        ticks: {
          font: { family: 'Inter', size: 10 },
          callback: v => Math.abs(v) >= 1000000 ? `${v / 1000000}jt` : Math.abs(v) >= 1000 ? `${v / 1000}rb` : v,
        },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      x: {
        ticks: { font: { family: 'Inter', size: 10 } },
        grid: { display: false },
      },
    },
    ...extraOpts,
  };
}

function parseCSVLine(line) {
  const result = []; let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += c;
  }
  result.push(current.trim());
  return result;
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); showToast('Teks berhasil disalin 📋'); }
  catch (e) { showToast('Gagal salin. Screenshot saja ya.'); }
  document.body.removeChild(ta);
}

// ===== WORKER BRIDGE =====
// Lazy-init Web Worker untuk kalkulasi berat.
// Fallback ke main thread kalau Worker tidak tersedia.

const WorkerBridge = (() => {
  let _worker = null;
  let _pendingMap = {}; // id → { resolve, reject }
  let _idCounter = 0;
  let _workerFailed = false;

  function _getWorker() {
    if (_workerFailed) return null;
    if (_worker) return _worker;
    try {
      _worker = new Worker('js/calc.worker.js');
      _worker.onmessage = (e) => {
        const { id, ok, result, error } = e.data;
        const p = _pendingMap[id];
        if (!p) return;
        delete _pendingMap[id];
        ok ? p.resolve(result) : p.reject(new Error(error));
      };
      _worker.onerror = () => { _workerFailed = true; _worker = null; };
      return _worker;
    } catch {
      _workerFailed = true;
      return null;
    }
  }

  function run(type, payload) {
    const w = _getWorker();
    if (!w) return Promise.resolve(null); // caller falls back to sync
    return new Promise((resolve, reject) => {
      const id = ++_idCounter;
      _pendingMap[id] = { resolve, reject };
      w.postMessage({ id, type, payload });
    });
  }

  return { run };
})();
