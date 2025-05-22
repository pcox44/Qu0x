const START_DATE = new Date("2025-05-15");
const diceRow = document.getElementById("dice-row");
const targetNumberSpan = document.getElementById("target-number");
const expressionDisplay = document.getElementById("expression-display");
const messageContainer = document.getElementById("message-container");
const scoreSpan = document.getElementById("score");
const streakSpan = document.getElementById("streak");
const animation = document.getElementById("animation");
const dateDisplay = document.getElementById("date-display");

let currentOffset = getTodayOffset();
let usedDice = [];

function getTodayOffset() {
  const now = new Date();
  const diffTime = now - START_DATE;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function seedRandom(seed) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function generateGameData(offset) {
  const seed = 1000 + offset;
  const rng = seedRandom(seed);
  const dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  const target = Math.floor(rng() * 100) + 1;
  return { dice, target };
}

function renderGame(offset) {
  const date = new Date(START_DATE);
  date.setDate(date.getDate() + offset);
  dateDisplay.textContent = `Game #${offset + 1} — ${formatDate(date)}`;

  const { dice, target } = generateGameData(offset);
  targetNumberSpan.textContent = target;
  diceRow.innerHTML = "";
  expressionDisplay.textContent = "";
  messageContainer.textContent = "";
  usedDice = [];

  dice.forEach(val => {
    const die = document.createElement("div");
    die.className = "die";
    die.dataset.value = val;
    die.textContent = val;
    die.addEventListener("click", () => {
      if (die.classList.contains("used")) return;
      die.classList.add("used");
      expressionDisplay.textContent += val;
      usedDice.push(die);
    });
    diceRow.appendChild(die);
  });

  updateHistory();
  updateStreak();
}

document.querySelectorAll(".op").forEach(button => {
  button.addEventListener("click", () => {
    expressionDisplay.textContent += button.textContent === "^" ? "^" :
                                      button.textContent === "×" ? "*" :
                                      button.textContent === "÷" ? "/" :
                                      button.textContent;
  });
});

document.getElementById("backspace").addEventListener("click", () => {
  const exp = expressionDisplay.textContent;
  if (exp.length > 0) {
    const removed = exp.slice(-1);
    expressionDisplay.textContent = exp.slice(0, -1);
    if (!isNaN(removed)) {
      const die = usedDice.pop();
      if (die) die.classList.remove("used");
    }
  }
});

document.getElementById("clear").addEventListener("click", () => {
  expressionDisplay.textContent = "";
  usedDice.forEach(d => d.classList.remove("used"));
  usedDice = [];
});

document.getElementById("submit").addEventListener("click", () => {
  const expr = expressionDisplay.textContent;
  if (usedDice.length !== 5) {
    messageContainer.textContent = "Use all 5 dice!";
    return;
  }

  try {
    const parsed = expr.replace(/\^/g, "**").replace(/(\([^\(\)]+\)|\d+)!/g, (m) => {
      const inner = m.slice(0, -1);
      const val = eval(inner);
      if (!Number.isInteger(val) || val < 0) throw "Invalid factorial";
      return Array.from({ length: val }, (_, i) => i + 1).reduce((a, b) => a * b, 1);
    });

    const result = eval(parsed);
    const target = parseInt(targetNumberSpan.textContent);
    const score = Math.abs(result - target);
    scoreSpan.textContent = `Score: ${score}`;

    const date = new Date(START_DATE);
    date.setDate(date.getDate() + currentOffset);
    saveHistory(formatDate(date), score);

    if (score === 0) {
      messageContainer.textContent = "Qu0x!";
      animation.style.display = "block";
      setTimeout(() => (animation.style.display = "none"), 3000);
      incrementStreak();
    } else {
      messageContainer.textContent = `You were off by ${score}`;
      resetStreak();
    }
  } catch {
    messageContainer.textContent = "Invalid expression!";
  }
});

document.getElementById("prev").addEventListener("click", () => {
  if (currentOffset > 0) {
    currentOffset--;
    renderGame(currentOffset);
  }
});

document.getElementById("next").addEventListener("click", () => {
  if (currentOffset < getTodayOffset()) {
    currentOffset++;
    renderGame(currentOffset);
  }
});

function saveHistory(date, score) {
  const history = JSON.parse(localStorage.getItem("qu0x-history") || "{}");
  history[date] = score;
  localStorage.setItem("qu0x-history", JSON.stringify(history));
  updateHistory();
}

function updateHistory() {
  const history = JSON.parse(localStorage.getItem("qu0x-history") || "{}");
  const body = document.getElementById("history-body");
  body.innerHTML = "";
  const dates = Object.keys(history).sort().slice(-5);
  dates.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d}</td><td>${history[d]}</td>`;
    body.appendChild(tr);
  });
}

function updateStreak() {
  const history = JSON.parse(localStorage.getItem("qu0x-history") || "{}");
  const dates = Object.keys(history).sort().reverse();
  let streak = 0;
  for (const date of dates) {
    if (parseInt(history[date]) === 0) {
      streak++;
    } else {
      break;
    }
  }
  streakSpan.textContent = `Current Qu0x Streak: ${streak}`;
}

function incrementStreak() {
  updateStreak();
}

function resetStreak() {
  updateStreak();
}

renderGame(currentOffset);
