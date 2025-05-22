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

let currentDice = [];
let usedDice = [];

function seedRandom(date) {
  let seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function generateDice(date) {
  const rand = seedRandom(date);
  const dice = Array.from({ length: 5 }, () => Math.floor(rand() * 6) + 1);
  const target = Math.floor(rand() * 100) + 1;
  return { dice, target };
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function gameNumber(date) {
  return Math.floor((date - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

function renderGame(date) {
  const { dice, target } = generateDice(date);
  currentDice = [...dice];
  usedDice = Array(5).fill(false);

  diceContainer.innerHTML = "";
  dice.forEach((die, i) => {
    const div = document.createElement("div");
    div.className = `die die-${die}`;
    div.textContent = die;
    div.addEventListener("click", () => {
      if (!usedDice[i]) {
        expressionInput.value += die;
        div.classList.add("used");
        usedDice[i] = true;
      }
    });
    diceContainer.appendChild(div);
  });

  targetContainer.textContent = `🎯 Target: ${target}`;
  dateDisplay.textContent = `Game #${gameNumber(date)} (${formatDate(date)})`;
  expressionInput.value = "";
  resultContainer.textContent = "";
  messageContainer.textContent = "";
  scoreContainer.textContent = "";

  updateButtons();
  renderArchive();
}

function updateButtons() {
  prevButton.disabled = currentDate <= startDate;
  nextButton.disabled = currentDate >= today;
}

function evaluateExpression() {
  const { target } = generateDice(currentDate);
  let expr = expressionInput.value;

  const usedNums = expr.match(/\d/g)?.map(Number) || [];
  const sortedUsed = [...usedNums].sort().join("");
  const sortedDice = [...currentDice].sort().join("");

  if (usedNums.length !== 5 || sortedUsed !== sortedDice) {
    messageContainer.textContent = "Use each die exactly once.";
    return;
  }

  try {
    expr = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    const result = eval(expr);
    const score = Math.round(Math.abs(result - target));

    resultContainer.textContent = `Result: ${result}`;
    scoreContainer.textContent = `Score: ${score}`;
    messageContainer.textContent = score === 0 ? "🎉 Qu0x!" : "";

    saveHistory(formatDate(currentDate), score);
    renderArchive();
  } catch {
    messageContainer.textContent = "Invalid expression.";
  }
}

function saveHistory(key, score) {
  const history = JSON.parse(localStorage.getItem("history") || "{}");
  if (!history[key]) history[key] = [];
  if (!history[key].includes(score)) history[key].push(score);
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

submitButton.addEventListener("click", evaluateExpression);
document.querySelectorAll(".op").forEach(btn => {
  btn.addEventListener("click", () => {
    expressionInput.value += btn.textContent;
  });
});
document.getElementById("clear").addEventListener("click", () => {
  expressionInput.value = "";
  [...diceContainer.children].forEach(div => div.classList.remove("used"));
  usedDice = Array(5).fill(false);
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

// Initial load
renderGame(currentDate);
