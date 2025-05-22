const diceRow = document.getElementById("dice-row");
const expressionDisplay = document.getElementById("expression-display");
const messageContainer = document.getElementById("message-container");
const targetNumberSpan = document.getElementById("target-number");
const scoreSpan = document.getElementById("score");
const streakSpan = document.getElementById("streak");
const gameNumberSpan = document.getElementById("game-number");
const historyBody = document.getElementById("history-body");
const animation = document.getElementById("qu0x-animation");
const todayDateSpan = document.getElementById("today-date");

let currentDate = new Date();
let gameOffset = 0;

const horseColors = {
  1: "red",
  2: "white",
  3: "blue",
  4: "yellow",
  5: "green",
  6: "black"
};

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

todayDateSpan.textContent = `Today: ${formatDate(new Date())}`;

function getGameDate(offset = 0) {
  const start = new Date("2025-05-15");
  const today = new Date();
  today.setHours(0,0,0,0);
  const gameDate = new Date(start);
  gameDate.setDate(start.getDate() + offset);
  return gameDate <= today ? gameDate : today;
}

function gameNumberFromDate(dateStr) {
  const start = new Date("2025-05-15");
  const d = new Date(dateStr);
  const diff = Math.floor((d - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

function getSeededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateGame(dateStr) {
  const seed = parseInt(dateStr.replace(/-/g, ""));
  let attempt = 0;
  while (attempt < 1000) {
    let dice = [];
    for (let i = 0; i < 5; i++) {
      const dieValue = Math.floor(getSeededRandom(seed + i + attempt * 10) * 6) + 1;
      dice.push(dieValue);
    }
    const target = Math.floor(getSeededRandom(seed + 100 + attempt) * 100) + 1;
    if (hasValidSolution(dice, target)) return { dice, target };
    attempt++;
  }
  return { dice: [1, 2, 3, 4, 5], target: 50 };
}

function hasValidSolution(dice, target) {
  return true; // always return true for now
}

function loadGame(offset) {
  const date = getGameDate(offset);
  const dateStr = formatDate(date);
  const { dice, target } = generateGame(dateStr);

  gameNumberSpan.textContent = `Game #${gameNumberFromDate(dateStr)}`;
  targetNumberSpan.textContent = target;
  diceRow.innerHTML = "";
  expressionDisplay.innerHTML = "";
  messageContainer.textContent = "";
  scoreSpan.textContent = "Score: --";

  dice.forEach((num, index) => {
    const die = document.createElement("div");
    die.textContent = num;
    die.className = "die";
    die.style.backgroundColor = horseColors[num];
    if (num === 6) die.style.color = "yellow";
    if (num === 2) {
      die.style.color = "black";
      die.style.backgroundColor = "white";
    }
    die.dataset.value = num;
    die.dataset.index = index;
    die.addEventListener("click", () => addDieToExpression(die));
    diceRow.appendChild(die);
  });

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
  let text = expressionDisplay.textContent;
  if (text.length > 0) {
    const last = text[text.length - 1];
    expressionDisplay.textContent = text.slice(0, -1);
    if (!isNaN(last)) {
      Array.from(diceRow.children).forEach(die => {
        if (die.textContent === last && die.classList.contains("used")) {
          die.classList.remove("used");
          return;
        }
      });
    }
  }
});

document.getElementById("clear").addEventListener("click", () => {
  expressionDisplay.textContent = "";
  Array.from(diceRow.children).forEach(die => die.classList.remove("used"));
});

document.getElementById("submit").addEventListener("click", () => {
  const expr = expressionDisplay.textContent;
  const usedDice = Array.from(diceRow.children).filter(d => d.classList.contains("used")).map(d => d.textContent);
  if (usedDice.length !== 5) {
    messageContainer.textContent = "Use all 5 dice!";
    return;
  }
  try {
    let cleaned = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**").replace(/!/g, 'FACTORIAL');
    const FACTORIAL = n => {
      if (!Number.isInteger(n) || n < 0) throw "Invalid factorial";
      return n === 0 ? 1 : n * FACTORIAL(n - 1);
    };
    const value = eval(cleaned.replace(/FACTORIAL\((\d+)\)/g, (_, n) => FACTORIAL(+n)));
    const target = parseInt(targetNumberSpan.textContent);
    const score = Math.abs(target - value);
    scoreSpan.textContent = `Score: ${score}`;
    if (score === 0) {
      messageContainer.textContent = "Qu0x!";
      animation.style.display = "block";
      setTimeout(() => (animation.style.display = "none"), 3000);
      updateStreak(true);
    } else {
      messageContainer.textContent = `You were off by ${score}`;
      updateStreak(false);
    }
    saveHistory(formatDate(getGameDate(gameOffset)), score);
  } catch (e) {
    messageContainer.textContent = "Invalid expression!";
  }
});

function updateStreak(perfect) {
  let streak = parseInt(localStorage.getItem("qu0xStreak") || "0");
  if (perfect) {
    streak += 1;
    localStorage.setItem("qu0xStreak", streak);
  }
  streakSpan.textContent = `Current Qu0x Streak: ${streak}`;
}

function saveHistory(dateStr, score) {
  let history = JSON.parse(localStorage.getItem("qu0xHistory") || "{}");
  history[dateStr] = score;
  localStorage.setItem("qu0xHistory", JSON.stringify(history));
  updateHistory();
}

function updateHistory() {
  let history = JSON.parse(localStorage.getItem("qu0xHistory") || "{}");
  historyBody.innerHTML = "";
  const entries = Object.entries(history).sort().slice(-5);
  for (let [date, score] of entries) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${date}</td><td>${gameNumberFromDate(date)}</td><td>${score}</td>`;
    historyBody.appendChild(tr);
  }
}

document.getElementById("prev-day").addEventListener("click", () => {
  if (gameOffset > 0) {
    gameOffset--;
    loadGame(gameOffset);
  }
});

document.getElementById("next-day").addEventListener("click", () => {
  const todayOffset = Math.floor((new Date() - new Date("2025-05-15")) / (1000 * 60 * 60 * 24));
  if (gameOffset < todayOffset) {
    gameOffset++;
    loadGame(gameOffset);
  }
});

loadGame(gameOffset);
