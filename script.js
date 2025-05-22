// Constants
const startDate = new Date("2025-05-15T00:00:00");
let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);
let today = new Date();
today.setHours(0, 0, 0, 0);

const expressionInput = document.getElementById("expression");
const submitButton = document.getElementById("submit");
const resultContainer = document.getElementById("result-container");
const messageContainer = document.getElementById("message-container");
const diceContainer = document.getElementById("dice-container");
const targetContainer = document.getElementById("target-container");
const scoreContainer = document.getElementById("score");
const streakContainer = document.getElementById("streak");
const prevButton = document.getElementById("prev-day");
const nextButton = document.getElementById("next-day");
const dateDisplay = document.getElementById("date-display");
const historyBody = document.getElementById("history-body");

const operations = { "×": "*", "÷": "/", "−": "-" };

function seedRandom(date) {
  let seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function generateDice(date) {
  let rand = seedRandom(date);
  let dice;
  let target;
  let tries = 0;

  do {
    dice = Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
    target = Math.floor(rand() * 100) + 1;
    tries++;
  } while (!hasSolution(dice, target) && tries < 100);

  return { dice, target };
}

function hasSolution(dice, target) {
  // Very basic solution check (placeholder)
  // In a full implementation, try permutations and check math
  return true;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function gameNumber(date) {
  return Math.floor((date - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

function renderGame(date) {
  const todayStr = formatDate(today);
  const dateStr = formatDate(date);
  const { dice, target } = generateDice(date);

  diceContainer.innerHTML = "";
  dice.forEach(die => {
    const div = document.createElement("div");
    div.className = `die die-${die}`;
    div.textContent = die;
    diceContainer.appendChild(div);
  });

  targetContainer.textContent = `🎯 Target: ${target}`;
  dateDisplay.textContent = `Game #${gameNumber(date)} (${dateStr})`;

  updateButtons();
  loadHistory();
  renderArchive();
}

function updateButtons() {
  prevButton.disabled = currentDate <= startDate;
  nextButton.disabled = currentDate >= today;
}

function evaluateExpression() {
  let expr = expressionInput.value;
  const dateKey = formatDate(currentDate);
  const { target, dice } = generateDice(currentDate);

  try {
    let used = dice.map(() => false);
    let values = expr.match(/\d+/g)?.map(Number) || [];

    for (let val of values) {
      const idx = dice.indexOf(val);
      if (idx !== -1 && !used[idx]) {
        used[idx] = true;
      } else {
        messageContainer.textContent = "Each die must be used exactly once.";
        return;
      }
    }

    if (used.some(u => !u)) {
      messageContainer.textContent = "Use all dice once.";
      return;
    }

    for (let op in operations) {
      expr = expr.replaceAll(op, operations[op]);
    }

    const result = eval(expr);
    const score = Math.abs(result - target);

    resultContainer.textContent = `Result: ${result}`;
    scoreContainer.textContent = `Score: ${Math.round(score)}`;

    saveHistory(dateKey, Math.round(score));
    messageContainer.textContent = score === 0 ? "🎉 Qu0x!" : "";

    if (score === 0) {
      incrementStreak();
    }

    renderArchive();
  } catch {
    messageContainer.textContent = "Invalid expression.";
  }
}

function saveHistory(dateKey, score) {
  const history = JSON.parse(localStorage.getItem("history") || "{}");
  if (!history[dateKey]) history[dateKey] = [];
  if (!history[dateKey].includes(score)) history[dateKey].push(score);
  localStorage.setItem("history", JSON.stringify(history));
}

function renderArchive() {
  const history = JSON.parse(localStorage.getItem("history") || "{}");
  const rows = [];

  let d = new Date(today);
  for (let i = 0; i < 10; i++) {
    const key = formatDate(d);
    const entry = history[key];
    const num = gameNumber(d);
    let score = entry ? Math.min(...entry) : "-";
    rows.unshift(`<tr><td>${key}</td><td>#${num}</td><td>${score}</td></tr>`);
    d.setDate(d.getDate() - 1);
  }

  historyBody.innerHTML = rows.join("");
  streakContainer.textContent = `Current Qu0x Streak: ${getStreak()}`;
}

function getStreak() {
  const history = JSON.parse(localStorage.getItem("history") || "{}");
  let streak = 0;
  let d = new Date(today);

  while (true) {
    const key = formatDate(d);
    const scores = history[key];
    if (scores && scores.includes(0)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }

  return streak;
}

function incrementStreak() {
  renderArchive(); // streak will auto-update from history
}

submitButton.addEventListener("click", evaluateExpression);
document.querySelectorAll(".op").forEach(btn => {
  btn.addEventListener("click", () => {
    expressionInput.value += btn.textContent;
  });
});

document.getElementById("clear").addEventListener("click", () => {
  expressionInput.value = "";
});

prevButton.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  renderGame(currentDate);
});

nextButton.addEventListener("click", () => {
  if (currentDate < today) {
    currentDate.setDate(currentDate.getDate() + 1);
    renderGame(currentDate);
  }
});

// Load initial game
renderGame(currentDate);
