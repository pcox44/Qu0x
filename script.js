const startDate = new Date("2025-05-15");
let today = new Date();
today.setHours(0, 0, 0, 0);
let currentDate = new Date(today);
let gameData = {};

function getGameNumber(date) {
  return Math.floor((date - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

function getDateFromGameNumber(gameNum) {
  let d = new Date(startDate);
  d.setDate(startDate.getDate() + gameNum - 1);
  return d;
}

function getSeed(date) {
  return parseInt(date.toISOString().slice(0,10).replace(/-/g,''), 10);
}

function seededRandom(seed) {
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateGame(date) {
  const seed = getSeed(date);
  let dice = [];
  let seen = {};
  let s = seed;
  while (dice.length < 5) {
    let die = Math.floor(seededRandom(s) * 6) + 1;
    s++;
    if (!seen[dice.length]) {
      dice.push(die);
      seen[dice.length] = true;
    }
  }
  let target = Math.floor(seededRandom(s) * 100) + 1;
  return { dice, target };
}

function renderGame(date) {
  const gameNum = getGameNumber(date);
  const { dice, target } = generateGame(date);
  document.getElementById("date-display").textContent = `Game #${gameNum} — ${date.toDateString()}`;
  document.getElementById("target-number").textContent = target;
  document.getElementById("dice-container").innerHTML = "";
  dice.forEach((value, index) => {
    const die = document.createElement("div");
    die.textContent = value;
    die.className = `die die${value}`;
    die.onclick = () => appendNumber(value, index);
    die.dataset.index = index;
    document.getElementById("dice-container").appendChild(die);
  });

  let save = localStorage.getItem(`qu0x-${gameNum}`);
  if (save && JSON.parse(save).qu0x) {
    expression = JSON.parse(save).expression;
    document.getElementById("expression-display").textContent = expression;
    document.getElementById("result").textContent = "Qu0x achieved!";
    showValue();
    lockInput();
  } else {
    expression = "";
    usedDice = [];
    updateExpressionDisplay();
    enableInput();
  }

  updateArchive();
}

let expression = "";
let usedDice = [];

function appendNumber(value, index) {
  if (usedDice.includes(index)) return;
  expression += value;
  usedDice.push(index);
  document.querySelectorAll(".die")[index].classList.add("used");
  updateExpressionDisplay();
}

function appendSymbol(symbol) {
  expression += symbol;
  updateExpressionDisplay();
}

function backspace() {
  expression = expression.slice(0, -1);
  usedDice = []; // reset and recount
  document.querySelectorAll(".die").forEach(die => die.classList.remove("used"));
  expression.split("").forEach(ch => {
    let val = parseInt(ch);
    let idx = Array.from(document.querySelectorAll(".die")).findIndex(
      el => !el.classList.contains("used") && parseInt(el.textContent) === val
    );
    if (idx >= 0) {
      usedDice.push(idx);
      document.querySelectorAll(".die")[idx].classList.add("used");
    }
  });
  updateExpressionDisplay();
}

function clearExpression() {
  expression = "";
  usedDice = [];
  document.querySelectorAll(".die").forEach(die => die.classList.remove("used"));
  updateExpressionDisplay();
}

function updateExpressionDisplay() {
  document.getElementById("expression-display").textContent = expression;
  showValue();
}

function showValue() {
  try {
    if (expression.includes("//") || expression.includes("..")) throw Error();
    let val = math.evaluate(expression);
    document.getElementById("expression-value").textContent = "Value: " + val;
  } catch {
    document.getElementById("expression-value").textContent = "";
  }
}

function submitExpression() {
  try {
    let val = math.evaluate(expression);
    let target = parseInt(document.getElementById("target-number").textContent);
    let score = Math.abs(val - target);
    const gameNum = getGameNumber(currentDate);

    if (usedDice.length !== 5) {
      document.getElementById("result").textContent = "You must use all 5 dice!";
      return;
    }

    if (score === 0) {
      document.getElementById("result").textContent = "Qu0x!";
      document.getElementById("qu0x-animation").style.display = "block";
      setTimeout(() => document.getElementById("qu0x-animation").style.display = "none", 3000);
      localStorage.setItem(`qu0x-${gameNum}`, JSON.stringify({
        expression,
        qu0x: true
      }));
      lockInput();
    } else {
      document.getElementById("result").textContent = "Score: " + score;
    }

    updateArchive();
  } catch {
    document.getElementById("result").textContent = "Invalid expression!";
  }
}

function lockInput() {
  document.querySelectorAll("#buttons button").forEach(btn => btn.disabled = true);
  document.querySelectorAll(".die").forEach(d => d.onclick = null);
}

function enableInput() {
  document.querySelectorAll("#buttons button").forEach(btn => btn.disabled = false);
  document.querySelectorAll(".die").forEach((d, idx) => {
    d.onclick = () => appendNumber(parseInt(d.textContent), idx);
  });
}

function updateArchive() {
  const list = document.getElementById("archive-list");
  list.innerHTML = "";
  const todayNum = getGameNumber(new Date());
  for (let i = todayNum - 1; i >= Math.max(1, todayNum - 5); i--) {
    let save = localStorage.getItem(`qu0x-${i}`);
    if (save) {
      let date = getDateFromGameNumber(i);
      list.innerHTML += `<li>Game #${i} (${date.toDateString()}): Qu0x!</li>`;
    }
  }
}

function prevGame() {
  let prev = new Date(currentDate);
  prev.setDate(prev.getDate() - 1);
  if (prev < startDate) return;
  currentDate = prev;
  renderGame(currentDate);
}

function nextGame() {
  let next = new Date(currentDate);
  next.setDate(next.getDate() + 1);
  if (next > today) return;
  currentDate = next;
  renderGame(currentDate);
}

window.onload = () => {
  renderGame(currentDate);
};
