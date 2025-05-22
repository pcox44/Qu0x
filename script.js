const startDate = new Date("2025-05-15");
let today = new Date();
today.setHours(0, 0, 0, 0);

let gameDate = new Date(today);
let usedDice = [];
let dice = [];
let target = 0;
let expression = "";
let savedData = JSON.parse(localStorage.getItem("qu0xData") || "{}");

function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function currentGameNumber(date = gameDate) {
  return daysBetween(startDate, date) + 1;
}

function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function generateGameData(date) {
  const gameNum = currentGameNumber(date);
  const rng = seedRandom(gameNum);
  const diceRolls = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  const targetNum = Math.floor(rng() * 100) + 1;
  return { dice: diceRolls, target: targetNum };
}

function updateGameDisplay() {
  const gameNum = currentGameNumber();
  document.getElementById("game-date").innerText = gameDate.toDateString();
  document.getElementById("game-number").innerText = `Game #${gameNum}`;
  const gameData = generateGameData(gameDate);
  dice = gameData.dice;
  target = gameData.target;
  usedDice = [];
  expression = "";
  document.getElementById("expression").value = "";
  document.getElementById("feedback").innerText = "";
  document.getElementById("expression-result").innerText = "";
  renderDice();
  document.getElementById("target-number").innerText = target;
}

function renderDice() {
  const container = document.getElementById("dice-container");
  container.innerHTML = "";
  dice.forEach((val, idx) => {
    const die = document.createElement("div");
    die.innerText = val;
    die.className = `die die${val}` + (usedDice.includes(idx) ? " used" : "");
    die.onclick = () => useDie(idx);
    container.appendChild(die);
  });
}

function useDie(index) {
  if (usedDice.includes(index)) return;
  expression += dice[index];
  usedDice.push(index);
  updateDisplay();
}

function appendOperator(op) {
  expression += op;
  updateDisplay();
}

function backspace() {
  expression = expression.slice(0, -1);
  recalculateUsedDice();
  updateDisplay();
}

function clearExpression() {
  expression = "";
  usedDice = [];
  updateDisplay();
}

function recalculateUsedDice() {
  usedDice = [];
  let exp = expression;
  dice.forEach((val, idx) => {
    const count = (exp.match(new RegExp(val, "g")) || []).length;
    const used = usedDice.filter(i => dice[i] === val).length;
    if (count > used) usedDice.push(idx);
  });
}

function updateDisplay() {
  document.getElementById("expression").value = expression;
  renderDice();
  try {
    const val = evaluateExpression(expression);
    document.getElementById("expression-result").innerText =
      Number.isFinite(val) ? `= ${val}` : "";
  } catch {
    document.getElementById("expression-result").innerText = "";
  }
}

function evaluateExpression(expr) {
  if (expr.includes("!")) {
    expr = expr.replace(/(\d+|\))!/g, (_, match) => {
      let val = eval(match);
      if (val < 0 || val % 1 !== 0) throw "Invalid factorial";
      return factorial(val);
    });
  }
  return Function(`"use strict"; return (${expr})`)();
}

function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function submitExpression() {
  try {
    const val = evaluateExpression(expression);
    const used = new Set();
    const nums = expression.match(/\d+/g) || [];
    for (let n of nums) {
      let matched = false;
      for (let i = 0; i < dice.length; i++) {
        if (!used.has(i) && dice[i] === parseInt(n)) {
          used.add(i);
          matched = true;
          break;
        }
      }
      if (!matched) throw "Invalid dice use";
    }
    if (used.size !== 5) throw "Use all 5 dice";

    const score = Math.abs(val - target);
    const gameKey = gameDate.toDateString();

    if (!savedData[gameKey]) {
      savedData[gameKey] = { expression, score };
      if (score === 0) {
        document.getElementById("qu0x-animation").style.display = "block";
        setTimeout(() => {
          document.getElementById("qu0x-animation").style.display = "none";
        }, 3000);
      }
      localStorage.setItem("qu0xData", JSON.stringify(savedData));
      updateArchive();
    }

    document.getElementById("feedback").innerText =
      score === 0 ? "Qu0x!" : `Score: ${score}`;
  } catch (e) {
    document.getElementById("feedback").innerText = "Invalid expression";
  }
}

function previousGame() {
  gameDate.setDate(gameDate.getDate() - 1);
  if (gameDate < startDate) gameDate = new Date(startDate);
  updateGameDisplay();
}

function nextGame() {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  gameDate.setDate(gameDate.getDate() + 1);
  if (gameDate >= tomorrow) gameDate = new Date(today);
  updateGameDisplay();
}

function updateArchive() {
  const keys = Object.keys(savedData)
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, 5);
  const list = document.getElementById("archive-list");
  list.innerHTML = "";
  keys.forEach(k => {
    const li = document.createElement("li");
    const d = new Date(k);
    const gameNum = currentGameNumber(d);
    li.innerText = `Game #${gameNum} (${d.toDateString()}): ${
      savedData[k].score === 0 ? "Qu0x!" : `Score ${savedData[k].score}`
    }`;
    list.appendChild(li);
  });

  const total = Object.values(savedData).filter(x => x.score === 0).length;
  document.getElementById("total-qu0x").innerText = total;
}

window.onload = () => {
  updateGameDisplay();
  updateArchive();
};
