// ═══════════════════════════════════════════════
//  shared.js  —  constants, storage & helpers
//  Used by both dashboard.js and budget.js
// ═══════════════════════════════════════════════

const CATS  = ['Food','Travel','Shopping','Bills','Health','Fun','Education','Other'];
const ICONS = {Food:'🍜',Travel:'🚌',Shopping:'🛒',Bills:'💡',Health:'💊',Fun:'🎮',Education:'📚',Other:'📦'};
const CLR   = {Food:'coral',Travel:'sky',Shopping:'peach',Bills:'lav',Health:'sage',Fun:'rose',Education:'mint',Other:'amber'};
const HEX   = {coral:'#f07167',sky:'#5aacdc',peach:'#f4a261',lav:'#9b89e8',sage:'#52b788',rose:'#e07da0',mint:'#43c6ac',amber:'#e6a817'};
const LIGHT = {coral:'#fde8e6',sky:'#e3f2fb',peach:'#fef0e3',lav:'#ede9fb',sage:'#e3f5ec',rose:'#fbe9f0',mint:'#e1f7f3',amber:'#fdf3d8'};

// ── STATE (loaded from localStorage) ──────────
let expenses = JSON.parse(localStorage.getItem('ss4_exp') || '[]');
let obBudget = parseFloat(localStorage.getItem('ss4_ob')  || '0');

// ── PERSIST ────────────────────────────────────
function save() {
  localStorage.setItem('ss4_exp', JSON.stringify(expenses));
  localStorage.setItem('ss4_ob',  obBudget);
}

// ── ANALYSIS ENGINE (mirrors Python algorithm) ─
function analyse(exps, budget) {
  const total = exps.reduce((s,e) => s + e.amt, 0);
  const pct   = budget ? (total / budget) * 100 : 0;
  const cats  = {};
  exps.forEach(e => { cats[e.cat] = (cats[e.cat] || 0) + e.amt; });
  const top   = Object.keys(cats).sort((a,b) => cats[b] - cats[a])[0] || null;
  const dates = [...new Set(exps.map(e => e.date))];
  const avg   = dates.length ? total / dates.length : 0;
  return { total, pct, top, avg, cats };
}

// C linked-list style traversal — monthly spend per category
function spentThisMonth(cat) {
  const now = new Date();
  return expenses.filter(e => {
    if (e.cat !== cat) return false;
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s,e) => s + e.amt, 0);
}

// ── FORMATTERS ────────────────────────────────
function fmtN(n, currency = false) {
  const p = currency ? '₹' : '';
  if (n >= 1000) return p + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return p + Math.round(n).toLocaleString('en-IN');
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

// ── DARK / LIGHT MODE TOGGLE ─────────────────
(function initTheme() {
  const saved = localStorage.getItem('ss4_theme') || 'light';
  applyTheme(saved);
})();

function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('ss4_theme', mode);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = mode === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const saved = localStorage.getItem('ss4_theme') || 'light';
    btn.textContent = saved === 'dark' ? '☀️' : '🌙';
    btn.addEventListener('click', toggleTheme);
  }
});

// ── TOAST ────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── BUDGET BAR (shared between both pages) ────
function renderBudgetBar() {
  const { total, pct } = analyse(expenses, obBudget);
  const p2  = Math.min(pct, 100);
  const bar = document.getElementById('ob-bar');
  if (!bar) return;

  bar.style.width = p2 + '%';
  bar.className   = 'bar-fill' + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');

  document.getElementById('ob-pct').textContent  = obBudget ? pct.toFixed(0) + '%' : '—';
  document.getElementById('ob-used').textContent = '₹' + fmtN(total) + ' spent' + (obBudget ? ' of ₹' + fmtN(obBudget) : '');
  document.getElementById('ob-left').textContent = obBudget ? '₹' + fmtN(Math.max(0, obBudget - total)) + ' remaining' : 'Set a budget above';
  document.getElementById('ob-status').innerHTML = obBudget
    ? (pct >= 100
        ? '<span style="color:#ef4444;font-weight:700;font-size:.75rem;">OVER BUDGET</span>'
        : pct >= 80
          ? '<span style="color:var(--amber);font-weight:700;font-size:.75rem;">NEAR LIMIT</span>'
          : '<span style="color:var(--sage);font-weight:700;font-size:.75rem;">ON TRACK ✓</span>')
    : '';

  const limitLine = document.getElementById('budget-limit-line');
  if (limitLine) {
    if (obBudget && total > 0) {
      limitLine.classList.remove('hidden');
      limitLine.style.left = '100%';
    } else {
      limitLine.classList.add('hidden');
    }
  }
}

// ── SET OVERALL BUDGET (shared handler) ───────
function setOB() {
  const v = parseFloat(document.getElementById('ob-input').value);
  if (isNaN(v) || v < 0) { toast('Enter a valid amount'); return; }
  obBudget = v;
  save();
  renderBudgetBar();
  if (typeof onBudgetSet === 'function') onBudgetSet();
  toast('Monthly budget set ✓');
}
