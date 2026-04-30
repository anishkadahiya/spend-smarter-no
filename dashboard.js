// ═══════════════════════════════════════════════
//  dashboard.js  —  Dashboard page logic
//  Requires: shared.js loaded first
// ═══════════════════════════════════════════════

let selCatName = 'Food';
let donutC = null, barC = null;

// ── INIT ───────────────────────────────────────
document.getElementById('f-date').valueAsDate = new Date();
if (obBudget) document.getElementById('ob-input').value = obBudget;
render();

// ── CATEGORY SELECT ───────────────────────────
function selCat(el) {
  document.querySelectorAll('#cat-chips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  selCatName = el.dataset.cat;
}

// ── ADD EXPENSE ───────────────────────────────
function addExpense() {
  const desc = document.getElementById('f-desc').value.trim();
  const amt  = parseFloat(document.getElementById('f-amt').value);
  const date = document.getElementById('f-date').value;
  if (!desc || isNaN(amt) || amt <= 0 || !date) { toast('Please fill all fields!'); return; }

  expenses.unshift({ id: Date.now(), cat: selCatName, desc, amt, date });
  save();
  render();

  document.getElementById('f-desc').value = '';
  document.getElementById('f-amt').value  = '';
  toast('Expense added ✓');
  checkAlert();
}

// ── BUDGET ALERT ─────────────────────────────
function checkAlert() {
  if (!obBudget) return;
  const total = expenses.reduce((s,e) => s + e.amt, 0);
  const pct   = (total / obBudget) * 100;
  if (pct >= 100)      toast('⚠️ Monthly budget exceeded!');
  else if (pct >= 80)  toast(`⚡ Budget at ${pct.toFixed(0)}% — slow down!`);
}

function deleteExp(id) { expenses = expenses.filter(e => e.id !== id); save(); render(); }
function clearAll()    {
  if (!expenses.length) return;
  if (!confirm('Clear all expenses?')) return;
  expenses = []; save(); render(); toast('Cleared!');
}

// Called by shared.js setOB after budget is set
function onBudgetSet() { render(); }

// ── MAIN RENDER ───────────────────────────────
function render() {
  const { total, pct, top, avg, cats } = analyse(expenses, obBudget);

  document.getElementById('s-total').textContent = fmtN(total, true);
  document.getElementById('s-avg').textContent   = fmtN(avg, true);
  document.getElementById('s-top').textContent   = top ? ICONS[top] + ' ' + top : '—';

  renderBudgetBar();
  renderCatGrid(cats);
  renderExpList();
  renderCharts(cats);
}

// ── CATEGORY GRID ─────────────────────────────
function renderCatGrid(cats) {
  document.getElementById('cat-grid').innerHTML = CATS.map(cat => {
    const c = CLR[cat], spent = cats[cat] || 0;
    return `<div class="cat-card" style="background:${LIGHT[c]};" onclick="filterCat('${cat}')">
      <div class="cc-icon">${ICONS[cat]}</div>
      <div class="cc-name">${cat}</div>
      <div class="cc-amt" style="color:${HEX[c]};">₹${fmtN(spent)}</div>
    </div>`;
  }).join('');
}

// ── EXPENSE LIST ──────────────────────────────
function renderExpList(list) {
  list = list || expenses.slice(0, 12);
  const el = document.getElementById('exp-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><span>💸</span>No expenses yet — add your first above!</div>`;
    return;
  }
  el.innerHTML = list.map(e => {
    const c = CLR[e.cat], hex = HEX[c] || '#ccc', lt = LIGHT[c] || '#f5f5f5';
    return `<div class="exp-item">
      <div class="ei-icon" style="background:${lt};">${ICONS[e.cat]}</div>
      <div class="ei-info">
        <div class="ei-name">${e.desc}</div>
        <div class="ei-meta">${e.cat} · ${fmtDate(e.date)}</div>
      </div>
      <div class="ei-amt" style="color:${hex};">₹${fmtN(e.amt)}</div>
      <button class="ei-del" onclick="deleteExp(${e.id})">✕</button>
    </div>`;
  }).join('');
}

function filterCat(cat) { renderExpList(expenses.filter(e => e.cat === cat)); }

// ── CHARTS ────────────────────────────────────
function renderCharts(cats) {
  const keys = Object.keys(cats), vals = Object.values(cats);
  const clrs = keys.map(k => HEX[CLR[k]] || '#ccc');

  // Donut chart
  const dCtx = document.getElementById('donut-chart').getContext('2d');
  if (donutC) donutC.destroy();
  donutC = new Chart(dCtx, {
    type: 'doughnut',
    data: {
      labels: keys.length ? keys : ['No data'],
      datasets: [{ data: keys.length ? vals : [1], backgroundColor: keys.length ? clrs : ['#eceae4'], borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { color: '#44445a', font: { size: 10, family: 'DM Sans', weight: '600' }, boxWidth: 10, padding: 8 } } },
      animation: { duration: 700 }
    }
  });

  // Bar chart (7-day) with red daily-limit line
  const days = [], dayVals = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en', { weekday: 'short' }));
    dayVals.push(expenses.filter(e => e.date === d.toISOString().slice(0, 10)).reduce((s,e) => s + e.amt, 0));
  }

  const budgetLinePlugin = {
    id: 'budgetLine',
    afterDraw(chart) {
      if (!obBudget) return;
      const dailyBudget = obBudget / 30;
      const { ctx, chartArea: { top, bottom, left, right }, scales: { y } } = chart;
      const yPos = y.getPixelForValue(dailyBudget);
      if (yPos < top || yPos > bottom) return;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth   = 1.8;
      ctx.moveTo(left,  yPos);
      ctx.lineTo(right, yPos);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px DM Sans, sans-serif';
      ctx.fillText('Daily limit', right - 54, yPos - 4);
      ctx.restore();
    }
  };

  const bCtx = document.getElementById('bar-chart').getContext('2d');
  if (barC) barC.destroy();
  barC = new Chart(bCtx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        data: dayVals,
        backgroundColor: dayVals.map(v => v > 0 ? 'rgba(240,113,103,0.7)' : 'rgba(236,234,228,0.5)'),
        borderColor:      dayVals.map(v => v > 0 ? '#f07167' : '#eceae4'),
        borderWidth: 1.5, borderRadius: 7
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9090a8', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#9090a8', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' },
             suggestedMax: Math.max(...dayVals, obBudget ? obBudget / 7 : 0, 1) * 1.2 }
      },
      animation: { duration: 600 }
    },
    plugins: [budgetLinePlugin]
  });
}
