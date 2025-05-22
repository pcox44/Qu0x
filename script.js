const startDate = new Date('2025-05-15');
const today = new Date();
today.setHours(0, 0, 0, 0);
let currentDate = new Date(today);
let gameData = JSON.parse(localStorage.getItem("qu0xGame") || "{}");
let currentExpression = [];

function getGameNumber(date) {
  return Math.floor((date - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getSeededDice(date) {
  const seed = getGameNumber(date);
  const dice = [];
  let s = seed;
  while (dice.length < 5) {
    const r = Math.floor(seededRandom(s++) * 6) + 1;
    dice.push(r);
  }
  return dice;
}

function getSeededTarget(date) {
  const seed = getGameNumber(date) + 999;
  return Math.floor(seededRandom(seed) * 100) + 1;
}

function renderGame(date) {
  document.getElementById("date-display").textContent = `Date: ${date.toDateString()}`;
  const gameNumber = getGameNumber(date);
  const target = getSeededTarget(date);
  const dice = getSeededDice(date);
  const diceContainer = document.getElementById("dice-container");
  const targetElem = document.getElementById("target-number");

  diceContainer.innerHTML = "";
  dice.forEach((value, idx) => {
    const die = document.createElement("div");
    die.className = `die die-${value}`;
    die.textContent = value;
    die.dataset.value = value;
    die.dataset.index = idx;
    die.addEventListener("click", () => useDie(value, idx));
    diceContainer.appendChild(die);
  });

  targetElem.textContent = target;
  currentExpression = [];
  updateExpressionDisplay();

  if (gameData[gameNumber]?.qu0xAchieved) {
    currentExpression = gameData[gameNumber].expression;
    updateExpressionDisplay(true);
    disableInput();
  }
}

function useDie(value, index) {
  if (document.querySelector(`.die[data-index="${index}"]`).classList.contains("used")) return;
  currentExpression.push({ type: "number", value, index });
  document.querySelector(`.die[data-index="${index}"]`).classList.add("used");
  updateExpressionDisplay();
}

function updateExpressionDisplay(isLocked = false) {
  const exprDisplay = document.getElementById("expression-display");
  const exprValue = document.getElementById("expression-value");

  exprDisplay.textContent = currentExpression.map(x => x.value).join(" ");
  try {
    const exprStr = currentExpression.map(x => x.value).join(" ");
    const evalResult = math.evaluate(exprStr);
    exprValue.textContent = `= ${evalResult}`;
  } catch {
    exprValue.textContent = "";
  }

  if (isLocked) {
    document.getElementById("submit").disabled = true;
    document.querySelectorAll(".die").forEach(d => d.classList.add("used"));
  }
}

document.querySelectorAll(".op-button").forEach(btn => {
  btn.addEventListener("click", () => {
    currentExpression.push({ type: "operator", value: btn.dataset.value });
    updateExpressionDisplay();
  });
});

document.getElementById("backspace").addEventListener("click", () => {
  const last = currentExpression.pop();
  if (last?.type === "number") {
    document.querySelector(`.die[data-index="${last.index}"]`)?.classList.remove("used");
  }
  updateExpressionDisplay();
});

document.getElementById("clear").addEventListener("click", () => {
  currentExpression = [];
  document.querySelectorAll(".die").forEach(d => d.classList.remove("used"));
  updateExpressionDisplay();
});

document.getElementById("submit").addEventListener("click", () => {
  const gameNumber = getGameNumber(currentDate);
  const target = getSeededTarget(currentDate);
  const exprStr = currentExpression.map(x => x.value).join(" ");

  try {
    const result = math.evaluate(exprStr);
    if (Math.abs(result - target) < 1e-9) {
      document.getElementById("message-box").textContent = "Qu0x!";
      document.getElementById("qu0x-animation").style.display = "block";
      setTimeout(() => {
        document.getElementById("qu0x-animation").style.display = "none";
      }, 3000);

      gameData[gameNumber] = { expression: currentExpression, qu0xAchieved: true };
      localStorage.setItem("qu0xGame", JSON.stringify(gameData));
      updateExpressionDisplay(true);
      updateHistory();
    } else {
      document.getElementById("message-box").textContent = `Try again! Result: ${result}`;
    }
  } catch {
    document.getElementById("message-box").textContent = "Invalid expression.";
  }
});

function updateHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "";

  const entries = Object.entries(gameData)
    .filter(([, val]) => val.qu0xAchieved)
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5);

  entries.forEach(([num, data]) => {
    const li = document.createElement("li");
    li.textContent = `Game #${num}: ${data.expression.map(x => x.value).join(" ")}`;
    list.appendChild(li);
  });
}

document.getElementById("prev-day").addEventListener("click", () => {
  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() - 1);
  if (newDate >= startDate) {
    currentDate = newDate;
    renderGame(currentDate);
  }
});

document.getElementById("next-day").addEventListener("click", () => {
  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() + 1);
  if (newDate <= today) {
    currentDate = newDate;
    renderGame(currentDate);
  }
});

window.onload = () => {
  renderGame(currentDate);
  updateHistory();
};
