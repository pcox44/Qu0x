const START_DATE = new Date("2025-05-15");
let today = new Date();
today.setHours(0, 0, 0, 0);
let currentDate = new Date(today);

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getGameNumber(date) {
  const diff = Math.floor((date - START_DATE) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

function getDateFromGameNumber(gameNumber) {
  const date = new Date(START_DATE);
  date.setDate(date.getDate() + gameNumber - 1);
  return date;
}

function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function getDiceValues(seed) {
  const rand = seedRandom(seed);
  const values = [];
  while (values.length < 5) {
    const val = Math.floor(rand() * 6) + 1;
    values.push(val);
  }
  return values;
}

function getTarget(seed, dice) {
  const rand = seedRandom(seed + 99);
  return Math.floor(rand() * 100) + 1;
}

function renderGame(date) {
  const dateStr = formatDate(date);
  const gameNumber = getGameNumber(date);
  const seed = gameNumber;
  const diceValues = getDiceValues(seed);
  const target = getTarget(seed, diceValues);

  document.getElementById("today-date").textContent = `Date: ${dateStr}`;
  document.getElementById("game-number").textContent = `Game #${gameNumber}`;
  document.getElementById("target-container").textContent = `Target: ${target}`;

  const diceContainer = document.getElementById("dice-container");
  diceContainer.innerHTML = "";

  diceValues.forEach((val, i) => {
    const div = document.createElement("div");
    div.textContent = val;
    div.className = `die d${val}`;
    div.dataset.value = val;
    div.dataset.index = i;
    div.addEventListener("click", () => {
      if (!div.classList.contains("used")) {
        document.getElementById("expression").value += val;
        div.classList.add("used");
        usedDice.push(i);
        updateExpressionResult();
      }
    });
    diceContainer.appendChild(div);
  });

  updateHistory();
  loadGame(dateStr);
  updateStreakDisplay();
}

let usedDice = [];

function clearExpression() {
  document.getElementById("expression").value = "";
  document.querySelectorAll(".die").forEach(die => die.classList.remove("used"));
  usedDice = [];
  updateExpressionResult();
}

function backspace() {
  const exp = document.getElementById("expression").value;
  if (exp.length > 0) {
    const last = exp.slice(-1);
    document.getElementById("expression").value = exp.slice(0, -1);

    if (!isNaN(last)) {
      const lastIndex = usedDice.pop();
      const die = document.querySelector(`.die[data-index="${lastIndex}"]`);
      if (die) die.classList.remove("used");
    }
    updateExpressionResult();
  }
}

function updateExpressionResult() {
  const expr = document.getElementById("expression").value;
  let result = "";
  try {
    result = math.evaluate(expr);
    if (!isFinite(result)) result = "Invalid";
  } catch {
    result = "Invalid";
  }
  document.getElementById("expression-result").textContent = `= ${result}`;
}

function submitAnswer() {
  const expr = document.getElementById("expression").value;
  const dateStr = formatDate(currentDate);
  const gameNumber = getGameNumber(currentDate);
  const seed = gameNumber;
  const diceValues = getDiceValues(seed);
  const target = getTarget(seed, diceValues);

  const usedNums = expr.match(/\d/g)?.map(Number) || [];

  if (usedNums.length !== 5 || !usedNums.every(n => diceValues.includes(n))) {
    document.getElementById("message-container").textContent = "You must use all 5 dice exactly once!";
    return;
  }

  const count = {};
  for (let d of diceValues) count[d] = (count[d] || 0) + 1;
  for (let d of usedNums) {
    if (!count[d]) {
      document.getElementById("message-container").textContent = "Invalid use of dice.";
      return;
    }
    count[d]--;
  }

  let result;
  try {
    result = math.evaluate(expr);
    if (!isFinite(result)) throw Error();
  } catch {
    document.getElementById("message-container").textContent = "Invalid expression.";
    return;
  }

  const score = Math.abs(result - target);

  let history = JSON.parse(localStorage.getItem("qu0xHistory") || "[]");
  const exists = history.find(h => h.date === dateStr && h.score === 0);
  if (exists) {
    document.getElementById("message-container").textContent = "Already got a Qu0x today!";
    return;
  }

  history = history.filter(h => h.date !== dateStr);
  history.push({ date: dateStr, game: gameNumber, score });
  localStorage.setItem("qu0xHistory", JSON.stringify(history));

  if (score === 0) {
    let streak = parseInt(localStorage.getItem("qu0xStreak") || "0");
    streak += 1;
    localStorage.setItem("qu0xStreak", streak.toString());
  }

  updateHistory();
  updateStreakDisplay();
  document.getElementById("message-container").textContent = score === 0 ? "Qu0x! Perfect match!" : `Score: ${score}`;
}

function updateHistory() {
  const history = JSON.parse(localStorage.getItem("qu0xHistory") || "[]")
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  const body = document.getElementById("history-body");
  body.innerHTML = "";
  history.forEach(h => {
    const row = `<tr><td>${h.date}</td><td>${h.game}</td><td>${h.score}</td></tr>`;
    body.innerHTML += row;
  });
}

function updateStreakDisplay() {
  const streak = localStorage.getItem("qu0xStreak") || "0";
  document.getElementById("streak").textContent = `Current Qu0x Streak: ${streak}`;
}

function loadGame(dateStr) {
  currentDate = new Date(dateStr);
  currentDate.setHours(0, 0, 0, 0);
  renderGame(currentDate);
}

document.querySelectorAll(".op").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("expression").value += btn.dataset.value;
    updateExpressionResult();
  });
});

document.getElementById("backspace").addEventListener("click", backspace);
document.getElementById("clear").addEventListener("click", clearExpression);
document.getElementById("submit").addEventListener("click", submitAnswer);
document.getElementById("prev-day").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  if (currentDate < START_DATE) currentDate = new Date(START_DATE);
  renderGame(currentDate);
});
document.getElementById("next-day").addEventListener("click", () => {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + 1);
  if (next <= today) {
    currentDate = next;
    renderGame(currentDate);
  }
});

window.onload = () => {
  renderGame(today);
};
