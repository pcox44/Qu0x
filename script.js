const START_DATE = new Date("2025-05-15");
const MS_PER_DAY = 86400000;
let currentGameNumber = getGameNumberFromDate(new Date());
let usedDice = [];
let expression = "";
let gameLocked = false;
let history = JSON.parse(localStorage.getItem("qu0xHistory") || "[]");
let totalQu0x = parseInt(localStorage.getItem("totalQu0x") || "0");

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("submit").addEventListener("click", submitExpression);
  document.getElementById("backspace").addEventListener("click", backspace);
  document.getElementById("clear").addEventListener("click", clearInput);
  document.getElementById("prev-game").addEventListener("click", () => loadGame(currentGameNumber - 1));
  document.getElementById("next-game").addEventListener("click", () => loadGame(currentGameNumber + 1));

  document.querySelectorAll(".op").forEach(btn =>
    btn.addEventListener("click", () => appendToExpression(btn.textContent))
  );

  loadGame(currentGameNumber);
  updateHistoryTable();
  updateTotalQu0x();
});

function getGameNumberFromDate(date) {
  return Math.floor((date - START_DATE) / MS_PER_DAY) + 1;
}

function getDateFromGameNumber(gameNum) {
  return new Date(START_DATE.getTime() + (gameNum - 1) * MS_PER_DAY);
}

function generateDice(gameNum) {
  const rng = mulberry32(gameNum);
  return Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
}

function generateTarget(gameNum) {
  const rng = mulberry32(gameNum * 999);
  return Math.floor(rng() * 100) + 1;
}

function loadGame(gameNum) {
  const todayGameNumber = getGameNumberFromDate(new Date());
  if (gameNum < 1 || gameNum > todayGameNumber) return;

  currentGameNumber = gameNum;
  usedDice = [];
  expression = "";
  gameLocked = localStorage.getItem(`qu0x-locked-${gameNum}`) === "true";

  const dice = generateDice(gameNum);
  const target = generateTarget(gameNum);

  document.getElementById("date-display").textContent = `${getDateFromGameNumber(gameNum).toDateString()} — Game #${gameNum}`;
  document.getElementById("target-number").textContent = target;
  document.getElementById("expression-box").textContent = "";
  document.getElementById("expression-value").textContent = "";
  document.getElementById("message-container").textContent = "";

  renderDice(dice);
  updateButtons();
}

function renderDice(dice) {
  const row = document.getElementById("dice-row");
  row.innerHTML = "";
  dice.forEach((val, i) => {
    const die = document.createElement("div");
    die.className = `die die-${val}`;
    die.textContent = val;
    die.dataset.index = i;
    if (usedDice.includes(i)) die.classList.add("used");
    die.onclick = () => {
      if (!usedDice.includes(i) && !gameLocked) {
        appendToExpression(val);
        usedDice.push(i);
        renderDice(dice);
      }
    };
    row.appendChild(die);
  });
}

function appendToExpression(char) {
  if (gameLocked) return;
  expression += char;
  document.getElementById("expression-box").textContent = expression;
  updateLiveValue();
}

function updateLiveValue() {
  const out = document.getElementById("expression-value");
  try {
    const val = evaluate(expression);
    if (!isNaN(val)) out.textContent = `= ${val.toFixed(2)}`;
    else out.textContent = "";
  } catch {
    out.textContent = "";
  }
}

function evaluate(expr) {
  const replaced = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/(\d+)!/g, (_, n) => factorial(parseInt(n)))
    .replace(/\^/g, "**");
  return Function(`"use strict"; return (${replaced})`)();
}

function factorial(n) {
  if (n < 0 || n > 12 || n !== Math.floor(n)) throw "Invalid factorial";
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function backspace() {
  if (gameLocked) return;
  const last = expression.slice(-1);
  expression = expression.slice(0, -1);
  document.getElementById("expression-box").textContent = expression;
  updateLiveValue();

  if (!isNaN(last)) {
    const dice = generateDice(currentGameNumber);
    const index = usedDice.findLast(i => dice[i] === parseInt(last));
    if (index !== undefined) usedDice.splice(usedDice.indexOf(index), 1);
    renderDice(dice);
  }
}

function clearInput() {
  if (gameLocked) return;
  expression = "";
  usedDice = [];
  document.getElementById("expression-box").textContent = "";
  document.getElementById("expression-value").textContent = "";
  renderDice(generateDice(currentGameNumber));
}

function submitExpression() {
  if (gameLocked) return;
  const target = generateTarget(currentGameNumber);
  try {
    const val = evaluate(expression);
    const score = Math.abs(target - Math.round(val));
    localStorage.setItem(`qu0x-${currentGameNumber}`, score);
    if (score === 0) {
      if (!localStorage.getItem(`qu0x-locked-${currentGameNumber}`)) {
        totalQu0x += 1;
        localStorage.setItem("totalQu0x", totalQu0x);
      }
      localStorage.setItem(`qu0x-locked-${currentGameNumber}`, "true");
      document.getElementById("message-container").textContent = "Qu0x!";
      showQu0xAnimation();
    } else {
      document.getElementById("message-container").textContent = `Score: ${score}`;
    }

    history.push({
      game: currentGameNumber,
      date: getDateFromGameNumber(currentGameNumber).toDateString(),
      score
    });
    history = history.slice(-5);
    localStorage.setItem("qu0xHistory", JSON.stringify(history));

    gameLocked = true;
    updateTotalQu0x();
    updateButtons();
    updateHistoryTable();
  } catch {
    document.getElementById("message-container").textContent = "Invalid expression.";
  }
}

function updateTotalQu0x() {
  document.getElementById("total-qu0x").textContent = `Total Qu0x: ${totalQu0x}`;
}

function updateButtons() {
  document.getElementById("submit").disabled = gameLocked;
}

function updateHistoryTable() {
  const tbody = document.querySelector("#history tbody");
  tbody.innerHTML = "";
  history.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${entry.game}</td><td>${entry.date}</td><td>${entry.score}</td>`;
    tbody.appendChild(row);
  });
}

function showQu0xAnimation() {
  const anim = document.getElementById("qu0x-animation");
  anim.style.display = "block";
  setTimeout(() => anim.style.display = "none", 3000);
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
