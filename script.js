const diceRow = document.getElementById("dice-row");
const expressionDisplay = document.getElementById("expression-display");
const messageContainer = document.getElementById("message-container");
const targetNumberSpan = document.getElementById("target-number");
const scoreSpan = document.getElementById("score");
const streakSpan = document.getElementById("streak");
const gameNumberSpan = document.getElementById("game-number");
const gameDateSpan = document.getElementById("game-date");
const historyBody = document.getElementById("history-body");
const animation = document.getElementById("qu0x-animation");
const todayDateSpan = document.getElementById("today-date");

const START_DATE = new Date("2025-05-15");
let currentOffset = Math.floor((new Date() - START_DATE) / (1000 * 60 * 60 * 24));

const horseColors = {
  1: "red",
  2: "white",
  3: "blue",
  4: "yellow",
  5: "green",
  6: "black"
};

function getSeededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function generateGame(dateStr) {
  const seed = parseInt(dateStr.replace(/-/g, ""));
  const dice = [];
  for (let i = 0; i < 5; i++) {
    dice.push(Math.floor(getSeededRandom(seed + i * 47) * 6) + 1);
  }
  const target = Math.floor(getSeededRandom(seed + 999) * 100) + 1;
  return { dice, target };
}

function loadGame(offset) {
  const gameDate = new Date(START_DATE);
  gameDate.setDate(gameDate.getDate() + offset);
  const dateStr = formatDate(gameDate);
  const gameNum = offset + 1;

  const { dice, target } = generateGame(dateStr);

  gameNumberSpan.textContent = `Game #${gameNum}`;
  gameDateSpan.textContent = `Date: ${dateStr}`;
  todayDateSpan.textContent = `Today: ${formatDate(new Date())}`;
  targetNumberSpan.textContent = target;
  expressionDisplay.textContent = "";
  scoreSpan.textContent = "Score: --";
  messageContainer.textContent = "";

  diceRow.innerHTML = "";
  dice.forEach((val) => {
    const die = document.createElement("div");
    die.className = "die";
    die.dataset.value = val;
    die.textContent = val;
    die.style.backgroundColor = horseColors[val];
    if ([1, 3, 5].includes(val)) die.style.color = "white";
    if ([2].includes(val)) {
      die.style.backgroundColor = "white";
      die.style.color = "black";
    }
    die.addEventListener("click", () => addDieToExpression(die));
    diceRow.appendChild(die);
  });

  updateStreakDisplay();
  updateHistory();
}

function addDieToExpression(die) {
  if (die.classList.contains("used")) return;
  expressionDisplay.textContent += die.textContent;
  die.classList.add("used");
}

document.querySelectorAll(".op").forEach(button => {
  button.addEventListener("click", () => {
    expressionDisplay.textContent += button.textContent;
  });
});

document.getElementById("backspace").addEventListener("click", () => {
  const text = expressionDisplay.textContent;
  if (text.length === 0) return;
  const last = text[text.length - 1];
  expressionDisplay.textContent = text.slice(0, -1);

  if (!isNaN(last)) {
    const dice = Array.from(diceRow.children);
    for (const die of dice) {
      if (die.textContent === last && die.classList.contains("used")) {
        die.classList.remove("used");
        break;
      }
    }
  }
});

document.getElementById("clear").addEventListener("click", () => {
  expressionDisplay.textContent = "";
  Array.from(diceRow.children).forEach(die => die.classList.remove("used"));
});

document.getElementById("submit").addEventListener("click", () => {
  const expr = expressionDisplay.textContent;
  const used = Array.from(diceRow.children).filter(d => d.classList.contains("used"));
  if (used.length !== 5) {
    messageContainer.textContent = "Use all 5 dice!";
    return;
  }

  try {
    const FACTORIAL = n => {
      if (!Number.isInteger(n) || n < 0) throw "Invalid factorial";
      return n === 0 ? 1 : n * FACTORIAL(n - 1);
    };

    const cleaned = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**").replace(/(\d+)!/g, (_, n) => FACTORIAL(+n));
    const value = eval(cleaned);
    const target = parseInt(targetNumberSpan.textContent);
    const score = Math.abs(value - target);
    scoreSpan.textContent = `Score: ${score}`;
    if (score === 0) {
      messageContainer.textContent = "Qu0x!";
      animation.style.display = "block";
      setTimeout(() => (animation.style.display = "none"), 3000);
      incrementStreak();
    } else {
      messageContainer.textContent = `You were off by ${score}`;
      resetStreak();
    }

    saveHistory(formatDate(new Date(START_DATE.getTime() + currentOffset * 86400000)), score);
  } catch (e) {
    messageContainer.textContent = "Invalid expression!";
  }
});

function incrementStreak() {
  let streak = parseInt(localStorage.getItem("qu0xStreak") || "0");
  streak++;
  localStorage.setItem("qu0xStreak", streak);
  updateStreakDisplay();
}

function resetStreak() {
  localStorage.setItem("qu0xStreak", "0");
  updateStreakDisplay();
}

function updateStreakDisplay() {
  const streak = localStorage.getItem("qu0xStreak") || "0";
  streakSpan.textContent = `Current Qu0x Streak: ${streak}`;
}

function saveHistory(dateStr, score) {
  const history = JSON.parse(localStorage.getItem("qu0xHistory") || "{}");
  history[dateStr] = score;
  localStorage.setItem("qu0xHistory", JSON.stringify(history));
  updateHistory();
}

function updateHistory() {
  const history = JSON.parse(localStorage.getItem("qu0xHistory") || "{}");
  historyBody.innerHTML = "";
  Object.entries(history).slice(-5).forEach(([date, score]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${date}</td><td>${gameNumberFromDate(date)}</td><td>${score}</td>`;
    historyBody.appendChild(tr);
  });
}

function gameNumberFromDate(dateStr) {
  const date = new Date(dateStr);
  return Math.floor((date - START_DATE) / (1000 * 60 * 60 * 24)) + 1;
}

document.getElementById("prev-day").addEventListener("click", () => {
  if (currentOffset > 0) {
    currentOffset--;
    loadGame(currentOffset);
  }
});

document.getElementById("next-day").addEventListener("click", () => {
  const todayOffset = Math.floor((new Date() - START_DATE) / (1000 * 60 * 60 * 24));
  if (currentOffset < todayOffset) {
    currentOffset++;
    loadGame(currentOffset);
  }
});

loadGame(currentOffset);
