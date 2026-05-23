const STORAGE_KEY = "finance-dashboard-v1";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const state = loadState();

const els = {
  activeMonth: document.querySelector("#activeMonth"),
  savedTotal: document.querySelector("#savedTotal"),
  incomeTotal: document.querySelector("#incomeTotal"),
  expenseTotal: document.querySelector("#expenseTotal"),
  balanceTotal: document.querySelector("#balanceTotal"),
  futureTotal: document.querySelector("#futureTotal"),
  breakdown: document.querySelector("#breakdown"),
  monthItems: document.querySelector("#monthItems"),
  futureMonths: document.querySelector("#futureMonths"),
  resetIncomeBtn: document.querySelector("#resetIncomeBtn"),
  incomeForm: document.querySelector("#incomeForm"),
  fixedForm: document.querySelector("#fixedForm"),
  installmentForm: document.querySelector("#installmentForm"),
  cashForm: document.querySelector("#cashForm"),
};

initialize();

function initialize() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  els.activeMonth.value = state.activeMonth || currentMonth;
  els.fixedForm.elements.startMonth.value = els.activeMonth.value;
  els.installmentForm.elements.startMonth.value = els.activeMonth.value;
  els.cashForm.elements.month.value = els.activeMonth.value;
  els.incomeForm.elements.savedTotal.value = state.savedTotal || "";
  els.incomeForm.elements.salary.value = state.incomes[els.activeMonth.value]?.salary || "";
  els.incomeForm.elements.extra.value = state.incomes[els.activeMonth.value]?.extra || "";

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  els.activeMonth.addEventListener("change", () => {
    state.activeMonth = els.activeMonth.value;
    syncIncomeForm();
    saveAndRender();
  });

  els.incomeForm.addEventListener("submit", saveIncome);
  els.resetIncomeBtn.addEventListener("click", resetIncome);
  els.fixedForm.addEventListener("submit", addFixed);
  els.installmentForm.addEventListener("submit", addInstallment);
  els.cashForm.addEventListener("submit", addCash);

  render();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }

  const month = new Date().toISOString().slice(0, 7);
  return {
    activeMonth: month,
    savedTotal: 0,
    incomes: {
      [month]: { salary: 0, extra: 0 },
    },
    fixed: [
    ],
    installments: [],
    cash: [],
  };
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".form").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });
}

function syncIncomeForm() {
  const values = state.incomes[els.activeMonth.value] || { salary: 0, extra: 0 };
  els.incomeForm.elements.savedTotal.value = state.savedTotal || "";
  els.incomeForm.elements.salary.value = values.salary || "";
  els.incomeForm.elements.extra.value = values.extra || "";
  els.fixedForm.elements.startMonth.value = els.activeMonth.value;
  els.installmentForm.elements.startMonth.value = els.activeMonth.value;
  els.cashForm.elements.month.value = els.activeMonth.value;
}

function saveIncome(event) {
  event.preventDefault();
  const salary = toMoney(els.incomeForm.elements.salary.value);
  const extra = toMoney(els.incomeForm.elements.extra.value);

  state.savedTotal = toMoney(els.incomeForm.elements.savedTotal.value) + salary;
  state.incomes[els.activeMonth.value] = {
    salary: (state.incomes[els.activeMonth.value]?.salary || 0) + salary,
    extra,
  };
  els.incomeForm.elements.savedTotal.value = state.savedTotal || "";
  els.incomeForm.elements.salary.value = "";
  saveAndRender();
}

function resetIncome() {
  state.savedTotal = 0;
  state.incomes[els.activeMonth.value] = { salary: 0, extra: 0 };
  els.incomeForm.elements.savedTotal.value = "";
  els.incomeForm.elements.salary.value = "";
  els.incomeForm.elements.extra.value = "";
  saveAndRender();
}

function addFixed(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.fixed.push({
    id: crypto.randomUUID(),
    name: form.elements.name.value.trim(),
    amount: toMoney(form.elements.amount.value),
    startMonth: form.elements.startMonth.value,
  });
  form.reset();
  form.elements.startMonth.value = els.activeMonth.value;
  saveAndRender();
}

function addInstallment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.installments.push({
    id: crypto.randomUUID(),
    name: form.elements.name.value.trim(),
    total: toMoney(form.elements.total.value),
    installments: Number(form.elements.installments.value),
    startMonth: form.elements.startMonth.value,
  });
  form.reset();
  form.elements.startMonth.value = els.activeMonth.value;
  saveAndRender();
}

function addCash(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.cash.push({
    id: crypto.randomUUID(),
    name: form.elements.name.value.trim(),
    amount: toMoney(form.elements.amount.value),
    month: form.elements.month.value,
  });
  form.reset();
  form.elements.month.value = els.activeMonth.value;
  saveAndRender();
}

function render() {
  const month = els.activeMonth.value;
  const income = state.incomes[month] || { salary: 0, extra: 0 };
  const entries = income.salary + income.extra;
  const monthItems = getMonthItems(month);
  const expenses = sum(monthItems.map((item) => item.amount));
  const futureProjection = getFutureProjection(month);
  const futureTotal = sum(futureProjection.map((item) => item.total));

  els.savedTotal.textContent = currency.format(state.savedTotal || 0);
  els.incomeTotal.textContent = currency.format(entries);
  els.expenseTotal.textContent = currency.format(expenses);
  els.balanceTotal.textContent = currency.format((state.savedTotal || 0) + income.extra - expenses);
  els.futureTotal.textContent = currency.format(futureTotal);

  renderBreakdown(monthItems);
  renderMonthItems(monthItems);
  renderFutureMonths(futureProjection);
}

function getMonthItems(month) {
  const fixed = state.fixed
    .filter((item) => item.startMonth <= month)
    .map((item) => ({ ...item, type: "Conta fixa", source: "fixed" }));

  const installments = state.installments
    .map((item) => installmentForMonth(item, month))
    .filter(Boolean);

  const cash = state.cash
    .filter((item) => item.month === month)
    .map((item) => ({ ...item, type: "A vista", source: "cash" }));

  return [...fixed, ...installments, ...cash].sort((a, b) => a.name.localeCompare(b.name));
}

function installmentForMonth(item, month) {
  const index = monthDiff(item.startMonth, month);
  if (index < 0 || index >= item.installments) return null;
  return {
    id: item.id,
    name: item.name,
    amount: item.total / item.installments,
    type: `Parcela ${index + 1}/${item.installments}`,
    source: "installments",
  };
}

function getFutureProjection(activeMonth) {
  const months = [];
  for (let index = 1; index <= 12; index += 1) {
    const month = addMonths(activeMonth, index);
    const items = getMonthItems(month).filter((item) => item.source !== "cash");
    months.push({
      month,
      total: sum(items.map((item) => item.amount)),
      items,
    });
  }
  return months.filter((item) => item.total > 0);
}

function renderBreakdown(items) {
  const groups = [
    { label: "Contas fixas", total: sum(items.filter((item) => item.source === "fixed").map((item) => item.amount)) },
    { label: "Cartao parcelado", total: sum(items.filter((item) => item.source === "installments").map((item) => item.amount)) },
    { label: "Compras a vista", total: sum(items.filter((item) => item.source === "cash").map((item) => item.amount)) },
  ];
  const max = Math.max(...groups.map((item) => item.total), 1);

  els.breakdown.innerHTML = groups
    .map(
      (group) => `
        <div class="bar">
          <div class="bar-label">
            <span>${group.label}</span>
            <strong>${currency.format(group.total)}</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width: ${(group.total / max) * 100}%"></div></div>
        </div>
      `,
    )
    .join("");
}

function renderMonthItems(items) {
  if (!items.length) {
    els.monthItems.innerHTML = `<div class="empty">Nenhum gasto cadastrado para este mes.</div>`;
    return;
  }

  els.monthItems.innerHTML = items.map(renderItemRow).join("");
  els.monthItems.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => removeItem(button.dataset.source, button.dataset.delete));
  });
}

function renderFutureMonths(months) {
  if (!months.length) {
    els.futureMonths.innerHTML = `<div class="empty">Sem compromissos futuros cadastrados.</div>`;
    return;
  }

  els.futureMonths.innerHTML = months
    .map(
      (month) => `
        <div class="future-month">
          <button class="future-toggle" type="button" aria-expanded="false">
            <span class="row-title">
              <strong>${formatMonth(month.month)}</strong>
              <span>${month.items.length} compromisso(s) previsto(s)</span>
            </span>
            <span class="amount">${currency.format(month.total)}</span>
            <span class="chevron" aria-hidden="true">›</span>
          </button>
          <div class="future-details">
            ${month.items.map(renderFutureDetail).join("")}
          </div>
        </div>
      `,
    )
    .join("");

  els.futureMonths.querySelectorAll(".future-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const month = button.closest(".future-month");
      const isOpen = month.classList.toggle("open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });
}

function renderFutureDetail(item) {
  return `
    <div class="future-detail">
      <span class="row-title">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${item.type}</span>
      </span>
      <span class="amount">${currency.format(item.amount)}</span>
    </div>
  `;
}

function renderItemRow(item) {
  return `
    <div class="row">
      <div class="row-title">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${item.type}</span>
      </div>
      <div class="item-actions">
        <span class="amount">${currency.format(item.amount)}</span>
        <button class="delete-btn" data-delete="${item.id}" data-source="${item.source}" type="button" aria-label="Remover ${escapeHtml(item.name)}">x</button>
      </div>
    </div>
  `;
}

function removeItem(source, id) {
  const key = source === "installments" ? "installments" : source;
  state[key] = state[key].filter((item) => item.id !== id);
  saveAndRender();
}

function toMoney(value) {
  return Number(value || 0);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function monthDiff(start, end) {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

function addMonths(month, amount) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + amount, 1);
  return date.toISOString().slice(0, 7);
}

function formatMonth(month) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, monthIndex - 1, 1),
  );
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}
