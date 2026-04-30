// ═══════════════════════════════════════════════
//  budget.js  —  Budget page logic
//  Requires: shared.js loaded first
// ═══════════════════════════════════════════════

let budgetDonutC = null;

// ── INIT ───────────────────────────────────────
if (obBudget) document.getElementById('ob-input').value = obBudget;
renderBudgetPage();

// Called by shared.js setOB after budget is updated
function onBudgetSet() { renderBudgetPage(); }

// ── FULL BUDGET PAGE RENDER ───────────────────
function renderBudgetPage() {
  renderBudgetBar();
  renderSummaryCards();
  renderCategoryGrid();
  renderBudgetDonut();
}

// ── SUMMARY CARDS (top strip) ─────────────────
function renderSummaryCards() {
  const { total } = analyse(expenses, obBudget);
  const remaining = obBudget ? Math.max(0, obBudget - total) : null;

  document.getElementById('b-total').textContent   = fmtN(total, true);
  document.getElementById('b-budget').textContent  = obBudget ? fmtN(obBudget, true) : 'Not set';
  document.getElementById('b-remaining').textContent = remaining !== null ? fmtN(remaining, true) : '—';

  // Days left in current month
  const now      = new Date();
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();
  document.getElementById('b-days').textContent = daysLeft + ' days';
}

// ── CATEGORY BREAKDOWN GRID ───────────────────
function renderCategoryGrid() {
  const { total: grandTotal } = analyse(expenses, obBudget);

  document.getElementById('budget-grid').innerHTML = CATS.map(cat => {
    const spent  = spentThisMonth(cat);
    const c      = CLR[cat];
    const lt     = LIGHT[c] || '#f5f5f5';
    const pct    = grandTotal ? Math.min(100, (spent / grandTotal) * 100) : 0;

    // Badge colour
    let badgeCls = 'ok';
    if (pct >= 40) badgeCls = 'over';
    else if (pct >= 25) badgeCls = 'warn';

    return `<div class="budget-card">
      <div class="bc-top">
        <div class="bc-icon" style="background:${lt};">${ICONS[cat]}</div>
        <div class="bc-name">${cat}</div>
        <span class="bc-badge ${badgeCls}">${pct.toFixed(0)}%</span>
      </div>
      <div class="bc-bar-hdr">
        <span>₹${fmtN(spent)} this month</span>
        <span>${pct.toFixed(0)}% of total</span>
      </div>
      <div class="bc-bar-bg">
        <div class="bc-bar-fill" style="width:${pct}%; background:${HEX[c]};"></div>
      </div>
    </div>`;
  }).join('');
}

// ── SPENDING DISTRIBUTION DONUT ───────────────
function renderBudgetDonut() {
  const { cats } = analyse(expenses, obBudget);
  const keys = Object.keys(cats), vals = Object.values(cats);
  const clrs = keys.map(k => HEX[CLR[k]] || '#ccc');

  const ctx = document.getElementById('budget-donut').getContext('2d');
  if (budgetDonutC) budgetDonutC.destroy();

  budgetDonutC = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: keys.length ? keys : ['No data'],
      datasets: [{
        data: keys.length ? vals : [1],
        backgroundColor: keys.length ? clrs : ['#eceae4'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#44445a', font: { size: 11, family: 'DM Sans', weight: '600' }, boxWidth: 12, padding: 10 }
        }
      },
      animation: { duration: 700 }
    }
  });
}
