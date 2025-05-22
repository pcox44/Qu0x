const START_DATE = new Date("2025-05-15T00:00:00");
let currentDate = new Date();
let gameOffset = Math.floor((currentDate - START_DATE) / (1000 * 60 * 60 * 24));
let expression = "";
let usedDice = [];
let gameData = {};
let streak = 0;

const diceContainer = document.getElementById("dice-container");
const targetNumberDiv = document.getElementById("target-number");
const gameNumberDiv = document.getElementById("game-number");
const expressionDiv = document.getElementById("expression");
const messageDiv = document.getElementById("message");
const resultDiv = document.getElementById("result");
const historyBody = document.getElementById("history-body");
const streakDiv = document.getElementById("streak");

document.getElementById("submit").onclick = submitExpression;
document.getElementById("clear").onclick = clearExpression;
document.getElementById("backspace").onclick = () => {
  expression = expression.trim().slice(0, -1);
  expressionDiv.textContent = expression;
};

document.getElementById("prev-game").onclick = () => {
  if (gameOffset > 0) {
    gameOffset--;
    initGame();
  }
};

document.getElementById("next-game").onclick = () => {
  const todayOffset = Math.floor((new Date() - START_DATE) / (1000 * 60 * 60 * 24));
  if (gameOffset < todayOffset) {
    gameOffset++;
    initGame();
  }
};

document.querySelectorAll(".op").forEach(button =>
  button.onclick = () => {
    expression += button.textContent;
    expressionDiv.textContent = expression;
  }
);

function rollDice(seed) {
  const rng = mulberry32(seed);
  const dice = [];
  while (dice.length < 5) {
    dice.push(Math.floor(rng() * 6) + 1);
  }
  return dice;
}

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateTarget(dice) {
  return 10 + Math.floor(Math.random() * 90);
}

function initGame() {
  const gameDate = new Date(START_DATE.getTime() + gameOffset * 86400000);
  const dateStr = gameDate.toISOString().split("T")[0];
  const gameNumber = gameOffset + 1;

  gameNumberDiv.textContent = `Game #${gameNumber} (${dateStr})`;
  expression = "";
  expressionDiv.textContent = "";
  usedDice = [];
  messageDiv.textContent = "";
  resultDiv.textContent = "";

  const seed = gameDate.getFullYear() * 10000 + (gameDate.getMonth() + 1) * 100 + gameDate.getDate();
  const dice = rollDice(seed);
  const target = Math.floor(mulberry32(seed)() * 100) + 1;

  diceContainer.innerHTML = "";
  dice.forEach((num, i) => {
    const die = document.createElement("div");
    die.className = "die";
    die.dataset.value = num;
    die.textContent = num;
    die.onclick = () => {
      if (!usedDice.includes(i)) {
        expression += num;
        usedDice.push(i);
        die.classList.add("used");
        expressionDiv.textContent = expression;
      }
    };
    diceContainer.appendChild(die);
  });

  targetNumberDiv.textContent = `🎯 Target: ${target}`;
  updateHistory();
  updateStreak();
}

function updateHistory() {
  historyBody.innerHTML = "";
  for (let i = Math.max(0, gameOffset - 4); i <= gameOffset; i++) {
    const d = new Date(START_DATE.getTime() + i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const score = localStorage.getItem("score_" + dateStr) ?? "-";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${dateStr}</td><td>${score}</td>`;
    historyBody.appendChild(tr);
  }
}

function updateStreak() {
  let s = 0;
  let d = new Date();
  while (true) {
    const dateStr = d.toISOString().split("T")[0];
    if (localStorage.getItem("score_" + dateStr) === "0") {
      s++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  streakDiv.textContent = `🔥 Current Qu0x Streak: ${s}`;
}

function clearExpression() {
  expression = "";
  usedDice = [];
  expressionDiv.textContent = "";
  document.querySelectorAll(".die").forEach(d => d.classList.remove("used"));
}

function submitExpression() {
  try {
    const result = math.evaluate(expression);
    const gameDate = new Date(START_DATE.getTime() + gameOffset * 86400000);
    const dateStr = gameDate.toISOString().split("T")[0];
    const target = parseInt(targetNumberDiv.textContent.match(/\d+/)[0]);
    const score = Math.abs(result - target);
    resultDiv.textContent = `Result: ${result}`;
    messageDiv.textContent = score === 0 ? "🎉 Qu0x!" : `Off by ${score}`;
    localStorage.setItem("score_" + dateStr, score.toString());
    if (score === 0) {
      document.getElementById("submit").disabled = true;
    }
    updateHistory();
    updateStreak();
  } catch {
    resultDiv.textContent = "Invalid expression.";
  }
}

initGame();
