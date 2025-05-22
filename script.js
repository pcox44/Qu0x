const startDate = new Date("2025-05-16T00:00:00Z");
let currentDate = new Date();

const targetEl = document.getElementById("target");
const diceContainer = document.getElementById("dice-container");
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("live-result");
const scoreEl = document.getElementById("score-display");
const streakEl = document.getElementById("streak-display");
const archiveEl = document.getElementById("archive");
const resultsTableBody = document.querySelector("#results-table tbody");
const gameLabel = document.getElementById("game-label");

let expression = "";
let usedDice = [];
let dice = [];

function seedRNG(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  };
}

function getGameId(date) {
  return Math.floor((date - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

function getDateKey(date) {
  return date.toISOString().split("T")[0];
}

function getGameData(date) {
  const dateKey = getDateKey(date);
  const rng = seedRNG(dateKey);
  dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  const target = Math.floor(rng() * 100) + 1;
  return { dice, target };
}

function renderDice() {
  diceContainer.innerHTML = "";
  dice.forEach((val, i) => {
    const btn = document.createElement("div");
    btn.className = `die die-${val}` + (usedDice.includes(i) ? " used" : "");
    btn.textContent = val;
    btn.onclick = () => {
      if (!usedDice.includes(i)) {
        expression += val;
        usedDice.push(i);
        updateDisplay();
      }
    };
    diceContainer.appendChild(btn);
  });
}

function addOp(op) {
  expression += op;
  updateDisplay();
}

function backspace() {
  expression = expression.slice(0, -1);
  usedDice = [];
  dice.forEach((val, i) => {
    if (expression.includes(val.toString())) usedDice.push(i);
  });
  updateDisplay();
}

function clearExpression() {
  expression = "";
  usedDice = [];
  updateDisplay();
}

function evaluate(expr) {
  try {
    if (/[^0-9+\-*/(). ]/.test(expr)) throw "Invalid chars";
    if (/\d{2,}/.test(expr)) throw "Multi-digit numbers disallowed";
    const result = Function('"use strict";return (' + expr + ')')();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function submitExpression() {
  const val = evaluate(expression);
  const key = getDateKey(currentDate);
  const { target } = getGameData(currentDate);
  if (val === null) {
    resultEl.textContent = "Invalid expression";
    return;
  }
  const score = Math.abs(target - val);
  const results = JSON.parse(localStorage.getItem("results") || "{}");
  if (!results[key]) results[key] = [];
  if (!results[key].some(r => r.expr === expression)) {
    results[key].push({ expr: expression, val, score });
    localStorage.setItem("results", JSON.stringify(results));
  }
  updateDisplay();
}

function updateDisplay() {
  renderDice();
  expressionEl.textContent = expression;
  const val = evaluate(expression);
  resultEl.textContent = val !== null ? `= ${val}` : "";
  updateResultsTable();
  updateArchive();
  updateStreak();
}

function updateResultsTable() {
  const key = getDateKey(currentDate);
  const { target } = getGameData(currentDate);
  const results = JSON.parse(localStorage.getItem("results") || "{}")[key] || [];
  resultsTableBody.innerHTML = results
    .map((r, i) => `<tr><td>${i + 1}</td><td>${r.expr}</td><td>${r.val}</td><td>${r.score}</td></tr>`)
    .join("");
  const bestScore = results.reduce((min, r) => Math.min(min, r.score), 999);
  scoreEl.textContent = `🎯 Best Score Today: ${bestScore}`;
}

function updateArchive() {
  const results = JSON.parse(localStorage.getItem("results") || "{}");
  archiveEl.innerHTML = "";
  const todayKey = getDateKey(new Date());
  for (let d = new Date(startDate), n = 1; d <= new Date(); d.setDate(d.getDate() + 1), n++) {
    const key = getDateKey(d);
    const dayResults = results[key] || [];
    const best = dayResults.reduce((min, r) => Math.min(min, r.score), Infinity);
    const perfects = dayResults.filter(r => r.score === 0).length;
    const div = document.createElement("div");
    div.className = "archive-entry" + (perfects > 0 ? " perfect" : "");
    div.textContent = `Game #${n} (${key}) — ${perfects} Perfect Solution${perfects === 1 ? "" : "s"}, Best Score: ${isFinite(best) ? best : "N/A"}`;
    archiveEl.appendChild(div);
  }
}

function updateStreak() {
  const results = JSON.parse(localStorage.getItem("results") || "{}");
  let streak = 0;
  for (let d = new Date(); d >= startDate; d.setDate(d.getDate() - 1)) {
    const key = getDateKey(d);
    const rs = results[key] || [];
    if (rs.some(r => r.score === 0)) streak++;
    else break;
  }
  streakEl.textContent = `🔥 Perfect Streak: ${streak} day${streak !== 1 ? "s" : ""}`;
}

function loadGame() {
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (currentDate > maxDate) currentDate = maxDate;
  const { target } = getGameData(currentDate);
  targetEl.textContent = target;
  gameLabel.textContent = `Game #${getGameId(currentDate)} (${getDateKey(currentDate)})`;
  clearExpression();
  updateDisplay();
}

function previousDay() {
  currentDate.setDate(currentDate.getDate() - 1);
  loadGame();
}

function nextDay() {
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (currentDate < maxDate) {
    currentDate.setDate(currentDate.getDate() + 1);
    loadGame();
  }
}

loadGame();
