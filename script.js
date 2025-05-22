const startDate = new Date("2025-05-15");
let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);
let today = new Date();
today.setHours(0, 0, 0, 0);
let gameNum = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
const expressionBox = document.getElementById("expression-box");
let currentExpression = "";
let usedIndices = [];
let target = 0;
let dice = [];
let hasQu0x = false;

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getSeededRandom(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    hash ^= hash << 13;
    hash ^= hash >> 17;
    hash ^= hash << 5;
    return ((hash < 0 ? ~hash + 1 : hash) % 10000) / 10000;
  };
}

function generateGameData() {
  const dateStr = formatDate(currentDate);
  const rng = getSeededRandom(dateStr);
  let tempDice, valid = false;

  while (!valid) {
    tempDice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
    target = Math.floor(rng() * 100) + 1;
    valid = true; // Assume valid for now — you can implement validation
  }

  dice = tempDice;
}

function displayDice() {
  const container = document.getElementById("dice-container");
  container.innerHTML = "";
  dice.forEach((val, i) => {
    const div = document.createElement("div");
    div.className = "die";
    div.textContent = val;
    div.setAttribute("data-val", val);
    div.onclick = () => addToExpression(val, i);
    if (usedIndices.includes(i)) div.classList.add("used");
    container.appendChild(div);
  });
}

function addToExpression(val, index) {
  if (usedIndices.includes(index)) return;
  currentExpression += val;
  usedIndices.push(index);
  displayDice();
  updateExpressionBox();
}

function updateExpressionBox() {
  expressionBox.textContent = currentExpression;
}

function addOperator(op) {
  if (currentExpression.length === 0) return;
  const lastChar = currentExpression.slice(-1);
  if ("+-*/^".includes(lastChar)) return;
  currentExpression += op;
  updateExpressionBox();
}

function addParens(p) {
  currentExpression += p;
  updateExpressionBox();
}

function addFactorial() {
  if (currentExpression.length === 0) return;
  const lastChar = currentExpression.slice(-1);
  if (")0123456789".includes(lastChar)) {
    currentExpression += "!";
    updateExpressionBox();
  }
}

function backspace() {
  if (currentExpression.length === 0) return;
  const last = currentExpression.slice(-1);
  currentExpression = currentExpression.slice(0, -1);
  if (!isNaN(last)) {
    const idx = usedIndices.find(i => dice[i] == last);
    if (idx !== undefined) usedIndices = usedIndices.filter(i => i !== idx);
  }
  displayDice();
  updateExpressionBox();
}

function clearInput() {
  currentExpression = "";
  usedIndices = [];
  displayDice();
  updateExpressionBox();
}

function evalWithFactorial(expr) {
  if (/[^0-9+\-*/^().!]/.test(expr)) throw "Invalid chars";
  expr = expr.replace(/(\d+)!/g, (_, n) => {
    n = parseInt(n);
    if (n < 0 || n > 20) throw "Invalid factorial";
    return Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a * b, 1);
  });
  return Function('"use strict";return (' + expr.replace("^", "**") + ")")();
}

function submitExpression() {
  if (usedIndices.length !== 5) {
    alert("Use all five dice exactly once.");
    return;
  }
  try {
    const result = Math.round(evalWithFactorial(currentExpression));
    document.getElementById("result-container").textContent = `= ${result}`;
    const score = Math.abs(target - result);
    document.getElementById("score").textContent = `Score: ${score}`;
    if (score === 0) {
      showPopup();
      saveResult(0);
    } else {
      saveResult(score);
    }
  } catch {
    alert("Invalid expression.");
  }
}

function saveResult(score) {
  const dateStr = formatDate(currentDate);
  let data = JSON.parse(localStorage.getItem("qu0xHistory") || "{}");
  if (!data[dateStr] || (data[dateStr] !== 0 && score === 0)) {
    data[dateStr] = score;
    localStorage.setItem("qu0xHistory", JSON.stringify(data));
  }

  if (score === 0) {
    if (!hasQu0x) {
      let streak = parseInt(localStorage.getItem("qu0xStreak") || 0);
      let total = parseInt(localStorage.getItem("qu0xTotal") || 0);
      localStorage.setItem("qu0xStreak", streak + 1);
      localStorage.setItem("qu0xTotal", total + 1);
      hasQu0x = true;
    }
  }

  updateStats();
  loadGame(currentDate);
}

function updateStats() {
  const streak = localStorage.getItem("qu0xStreak") || 0;
  const total = localStorage.getItem("qu0xTotal") || 0;
  document.getElementById("streak").textContent = `Current Qu0x Streak: ${streak}`;
  document.getElementById("totalQu0x").textContent = `Total Qu0x: ${total}`;
}

function showPopup() {
  const popup = document.getElementById("animation");
  popup.style.display = "block";
  setTimeout(() => (popup.style.display = "none"), 3000);
}

function loadGame(date) {
  currentDate = new Date(date);
  const dateStr = formatDate(currentDate);
  document.getElementById("dateDisplay").textContent = `Game #${Math.floor((currentDate - startDate) / 86400000) + 1} — ${dateStr}`;
  generateGameData();
  displayDice();
  clearInput();
  updateStats();

  const history = JSON.parse(localStorage.getItem("qu0xHistory") || "{}");
  const entries = Object.entries(history).slice(-5);
  const tbody = document.querySelector("#history tbody");
  tbody.innerHTML = "";
  entries.forEach(([day, score]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${day}</td><td>${score}</td>`;
    tbody.appendChild(row);
  });

  if (history[dateStr] === 0) {
    hasQu0x = true;
  } else {
    hasQu0x = false;
  }
}

function previousGame() {
  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() - 1);
  if (newDate >= startDate) loadGame(newDate);
}

function nextGame() {
  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() + 1);
  if (newDate <= today) loadGame(newDate);
}

function buildButtons() {
  const ops = ["+", "-", "*", "/", "^"];
  const container = document.getElementById("buttons-container");
  ops.forEach(op => {
    const btn = document.createElement("button");
    btn.textContent = op;
    btn.onclick = () => addOperator(op);
    container.appendChild(btn);
  });

  ["(", ")"].forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.onclick = () => addParens(p);
    container.appendChild(btn);
  });

  const factBtn = document.createElement("button");
  factBtn.textContent = "!";
  factBtn.onclick = addFactorial;
  container.appendChild(factBtn);
}

buildButtons();
loadGame(currentDate);
