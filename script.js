// Qu0x game script.js

const startDate = new Date(2025, 4, 15); // May 15, 2025 (month 0-based)
const maxHistory = 5;

const diceColors = {
  1: "red",
  2: "white",
  3: "blue",
  4: "yellow",
  5: "green",
  6: "black",
};

let currentGameIndex = 0; // zero-based index from startDate
let dice = [];
let target = 0;
let expression = "";
let usedDiceIndices = new Set();
let qu0xAchieved = false;

const diceContainer = document.getElementById("dice-container");
const targetContainer = document.getElementById("target-container");
const expressionDisplay = document.getElementById("expression-display");
const resultContainer = document.getElementById("result-container");
const messageContainer = document.getElementById("message-container");
const scoreDisplay = document.getElementById("score");
const streakDisplay = document.getElementById("streak");
const historyBody = document.getElementById("history-body");
const prevBtn = document.getElementById("prev-game");
const nextBtn = document.getElementById("next-game");
const gameNumberSpan = document.getElementById("game-number");

const buttonsContainer = document.getElementById("buttons-container");

function getTodayGameIndex() {
  const now = new Date();
  // reset to midnight local time
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = todayMidnight - startDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function formatDate(date) {
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

function gameIndexToDate(index) {
  const d = new Date(startDate);
  d.setDate(startDate.getDate() + index);
  return d;
}

function generateSeededRandom(seed) {
  // simple seeded RNG using xorshift
  let x = seed % 2147483647;
  return function () {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x < 0 ? ~x + 1 : x) % 1e9 / 1e9;
  };
}

function generateDiceAndTarget(gameIndex) {
  const rng = generateSeededRandom(gameIndex + 1);

  let generatedDice, generatedTarget;
  // We'll keep trying until we find a target with a solution (use a simple method to guarantee)
  // For demo, just generate dice and a target that is sum of dice + some small random offset

  generatedDice = [];
  for (let i = 0; i < 5; i++) {
    // Dice values 1-6
    const val = Math.floor(rng() * 6) + 1;
    generatedDice.push(val);
  }
  // For target: sum dice + random between -10 and +10
  let sumDice = generatedDice.reduce((a, b) => a + b, 0);
  let offset = Math.floor(rng() * 21) - 10;
  generatedTarget = sumDice + offset;

  if (generatedTarget < 1) generatedTarget = sumDice; // ensure positive target

  return { dice: generatedDice, target: generatedTarget };
}

function renderDice() {
  diceContainer.innerHTML = "";
  dice.forEach((val, i) => {
    const die = document.createElement("div");
    die.classList.add("die");
    die.classList.add(diceColors[val]);
    die.textContent = val;
    if (usedDiceIndices.has(i)) {
      die.classList.add("used");
    }
    die.dataset.index = i;
    die.title = `Die value ${val}`;
    die.tabIndex = 0;
    die.addEventListener("click", () => {
      if (!usedDiceIndices.has(i)) {
        addNumberToExpression(val, i);
      }
    });
    diceContainer.appendChild(die);
  });
}

function addNumberToExpression(number, diceIndex) {
  if (usedDiceIndices.has(diceIndex)) return; // already used
  // Prevent concat without operator
  if (expression.length > 0) {
    const lastChar = expression[expression.length - 1];
    if ("0123456789".includes(lastChar)) {
      // If last char is number, must add operator first
      alert("Please add an operator before adding another number.");
      return;
    }
  }
  expression += number.toString();
  usedDiceIndices.add(diceIndex);
  renderExpression();
  renderDice();
  updateButtonsState();
}

function addOperatorToExpression(op) {
  if (expression.length === 0 && (op === "+" || op === "-" || op === "×" || op === "÷" || op === "^")) {
    alert("Expression cannot start with this operator.");
    return;
  }
  if (expression.length === 0 && op === "!") {
    alert("Expression cannot start with factorial.");
    return;
  }
  // prevent two operators in a row (except for () )
  const lastChar = expression[expression.length - 1];
  if ("+-×÷^!".includes(lastChar) && op !== "(" && op !== ")") {
    alert("Cannot enter two operators consecutively.");
    return;
  }
  expression += op;
  renderExpression();
  updateButtonsState();
}

function renderExpression() {
  expressionDisplay.textContent = expression;
}

function updateButtonsState() {
  // Disable operator buttons if needed (e.g., no multiple operators consecutively)
  const lastChar = expression.length > 0 ? expression[expression.length - 1] : null;
  document.querySelectorAll(".op-btn").forEach((btn) => {
    const op = btn.textContent;
    if (op === "(" || op === ")") {
      btn.disabled = false;
      return;
    }
    if (expression.length === 0) {
      btn.disabled = op !== "(";
      return;
    }
    if ("+-×÷^!".includes(lastChar) && op !== "(" && op !== ")") {
      btn.disabled = true;
    } else {
      btn.disabled = false;
    }
  });
}

function backspace() {
  if (expression.length === 0) return;
  const lastChar = expression[expression.length - 1];
  expression = expression.slice(0, -1);
  // If last char was a number from a die, unmark that die
  if ("123456".includes(lastChar)) {
    // find dice index for that value which was last added, remove from usedDiceIndices
    // But we must track dice index on adding, so let's track expression tokens with dice index
    // For simplicity, let's parse backwards and remove last used die that matches lastChar
    for (let i = 4; i >= 0; i--) {
      if (usedDiceIndices.has(i) && dice[i].toString() === lastChar) {
        usedDiceIndices.delete(i);
        break;
      }
    }
  }
  renderExpression();
  renderDice();
  updateButtonsState();
}

function clearExpression() {
  expression = "";
  usedDiceIndices.clear();
  renderExpression();
  renderDice();
  updateButtonsState();
  messageContainer.textContent = "";
  resultContainer.textContent = "";
}

function parseExpressionToJS(expr) {
  // convert operators to JS equivalents:
  // × -> *
  // ÷ -> /
  // ^ -> **
  // ! factorial handled manually
  let jsExpr = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\^/g, "**");

  // factorial parsing: replace n! with factorial(n)
  jsExpr = jsExpr.replace(/(\d+)!/g, "factorial($1)");

  return jsExpr;
}

function factorial(n) {
  if (n < 0 || n % 1 !== 0) {
    throw "Factorial only defined for non-negative integers.";
  }
  let f = 1;
  for (let i = 2; i <= n; i++) {
    f *= i;
  }
  return f;
}

function evaluateExpression(expr) {
  const jsExpr = parseExpressionToJS(expr);
  try {
    // eslint-disable-next-line no-new-func
    const f = new Function("factorial", `return ${jsExpr};`);
    const result = f(factorial);
    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      throw "Invalid result";
    }
    return result;
  } catch (e) {
    return null;
  }
}

function validateExpression() {
  // 1) All dice must be used exactly once
  if (usedDiceIndices.size !== 5) {
    alert("You must use all five dice exactly once.");
    return false;
  }

  // 2) No concatenation (two digits in a row)
  // This is guaranteed by code that forbids adding a number if last char was number

  // 3) Expression parse + evaluate
  const val = evaluateExpression(expression);
  if (val === null) {
    alert("Invalid expression.");
    return false;
  }
  return val;
}

function submitExpression() {
  if (expression.length === 0) {
    alert("Please enter an expression before submitting.");
    return;
  }
  const val = validateExpression();
  if (val === false) return;

  // Calculate score = absolute difference
  const score = Math.abs(val - target);
  resultContainer.textContent = `Result: ${val} | Score: ${score}`;

  // Update message and streak
  if (score === 0) {
    messageContainer.textContent = "Qu0x! Perfect score!";
    qu0xAchieved = true;
    incrementStreak();
  } else {
    messageContainer.textContent = "Try again!";
    qu0xAchieved = false;
    resetStreak();
  }

  saveGameResult(score);
  updateHistory();
}

function saveGameResult(score) {
  const gameKey = `qu0x-game-${currentGameIndex}`;
  const prevDataRaw = localStorage.getItem(gameKey);
  let prevData = prevDataRaw ? JSON.parse(prevDataRaw) : null;

  // Only save best score (lowest)
  if (!prevData || score < prevData.score) {
    localStorage.setItem(gameKey, JSON.stringify({ score, date: gameIndexToDate(currentGameIndex).toISOString() }));
  }
}

function loadGameResult(gameIndex) {
  const gameKey = `qu0x-game-${gameIndex}`;
  const dataRaw = localStorage.getItem(gameKey);
  return dataRaw ? JSON.parse(dataRaw) : null;
}

function updateHistory() {
  historyBody.innerHTML = "";
  const start = Math.max(0, currentGameIndex - maxHistory + 1);
  for (let i = start; i <= currentGameIndex; i++) {
    const data = loadGameResult(i);
    const dateStr = formatDate(gameIndexToDate(i));
    const score = data ? data.score : "-";
    const row = document.createElement("tr");
    const gameNumTd = document.createElement("td");
    gameNumTd.textContent = i + 1;
    const dateTd = document.createElement("td");
    dateTd.textContent = dateStr;
    const scoreTd = document.createElement("td");
    scoreTd.textContent = score;
    row.appendChild(gameNumTd);
    row.appendChild(dateTd);
    row.appendChild(scoreTd);
    historyBody.appendChild(row);
  }
}

function incrementStreak() {
  let streak = Number(localStorage.getItem("qu0x-streak") || "0");
  streak++;
  localStorage.setItem("qu0x-streak", streak.toString());
  updateStreakDisplay();
}

function resetStreak() {
  localStorage.setItem("qu0x-streak", "0");
  updateStreakDisplay();
}

function updateStreakDisplay() {
  const streak = Number(localStorage.getItem("qu0x-streak") || "0");
  streakDisplay.textContent = `Qu0x Streak: ${streak}`;
}

function updateScoreDisplay() {
  const data = loadGameResult(currentGameIndex);
  if (data) {
    resultContainer.textContent = `Best score: ${data.score}`;
  } else {
    resultContainer.textContent = "";
  }
}

function qu0xAnimation() {
  if (!qu0xAchieved) return;
  const animDiv = document.createElement("div");
  animDiv.classList.add("qu0x-animation");
  animDiv.textContent = "Qu0x!";
  document.body.appendChild(animDiv);
  setTimeout(() => {
    animDiv.remove();
  }, 3000);
}

// Initialization
function init() {
  const today = new Date();
  currentGameIndex = dateToGameIndex(today);
  const { dice: newDice, target: newTarget } = generateGame(currentGameIndex);
  dice = newDice;
  target = newTarget;
  usedDiceIndices.clear();
  expression = "";
  qu0xAchieved = false;

  renderDice();
  renderExpression();
  updateButtonsState();
  updateHistory();
  updateStreakDisplay();

  targetDisplay.textContent = `Target: ${target}`;
  resultContainer.textContent = "";
  messageContainer.textContent = "";

  qu0xButton.disabled = false;
  clearExpression();
}

init();

qu0xButton.addEventListener("click", () => {
  submitExpression();
  if (qu0xAchieved) qu0xAnimation();
});
backspaceButton.addEventListener("click", () => {
  backspace();
});
clearButton.addEventListener("click", () => {
  clearExpression();
});
shareButton.addEventListener("click", () => {
  // Generate share link with expression and dice values
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  params.set("expr", encodeURIComponent(expression));
  params.set("dice", dice.join(","));
  params.set("target", target);
  const shareUrl = `${baseUrl}?${params.toString()}`;
  prompt("Share this URL:", shareUrl);
});

// Operator buttons
document.querySelectorAll(".op-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    addOperatorToExpression(btn.textContent);
  });
});

function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const exprParam = urlParams.get("expr");
  const diceParam = urlParams.get("dice");
  const targetParam = urlParams.get("target");

  if (exprParam && diceParam && targetParam) {
    expression = decodeURIComponent(exprParam);
    dice = diceParam.split(",").map(Number);
    target = Number(targetParam);
    usedDiceIndices.clear();
    // Mark dice used by expression numbers:
    for (const ch of expression) {
      if ("123456".includes(ch)) {
        // Find dice index for ch not yet used
        for (let i = 0; i < dice.length; i++) {
          if (dice[i] === Number(ch) && !usedDiceIndices.has(i)) {
            usedDiceIndices.add(i);
            break;
          }
        }
      }
    }
    renderDice();
    renderExpression();
    targetDisplay.textContent = `Target: ${target}`;
    updateButtonsState();
    resultContainer.textContent = "";
    messageContainer.textContent = "";
  }
}

parseUrlParams();Here's a full-featured JavaScript implementation outline for your updated **Daily Dice Game** with all the requested features:

---

### Key Features included:
- Generate 5 dice values (1–6), colored
- Generate a target number near sum of dice ±10
- Expression input **only via clicking dice and operator buttons**
- Dice can only be used **once each** (no repeats)
- No concatenation of digits (one die per number, no multi-digit numbers)
- Supports operators: `+`, `-`, `×`, `÷`, `^` (exponentiation), and `!` (factorial)
- `!` only works on single numbers (no factorial of expressions)
- Buttons for Backspace and Clear
- Expression display is **uneditable text**, built from clicks only
- Submit expression to compute value, score = |value − target|
- Perfect score (0 difference) triggers a **Qu0x! animation** for 3 seconds
- Keeps and displays last 5 game results in a history table
- Saves best score per day in `localStorage`
- Tracks and displays a “Qu0x Streak” count in `localStorage`
- Shareable URL with pre-filled dice, target, and expression
- All state is keyed by date, so new game daily

---

### Core code snippets (assumes basic HTML structure with these elements):

```js
// Globals
let dice = [];
let target = 0;
let expression = "";
let usedDiceIndices = new Set();
let currentGameIndex = 0; // days since Epoch
let qu0xAchieved = false;
const maxHistory = 5;

// Helpers: Date indexing
function dateToGameIndex(date) {
  return Math.floor(date.getTime() / (1000 * 3600 * 24));
}
function gameIndexToDate(index) {
  return new Date(index * 86400000);
}
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// Generate game dice & target
function generateGame(gameIndex) {
  const seed = gameIndex;
  const rng = mulberry32(seed);
  let generatedDice = [];
  for (let i = 0; i < 5; i++) {
    generatedDice.push(Math.floor(rng() * 6) + 1);
  }
  const sumDice = generatedDice.reduce((a, b) => a + b, 0);
  let offset = Math.floor(rng() * 21) - 10; // -10 to +10
  let generatedTarget = sumDice + offset;
  if (generatedTarget < 1) generatedTarget = sumDice;
  return { dice: generatedDice, target: generatedTarget };
}

// PRNG for consistency
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Expression building functions (adding dice numbers and operators only by click)

// Parsing to JS expression string with factorial handling
function parseExpressionToJS(expr) {
  let jsExpr = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**");
  jsExpr = jsExpr.replace(/(\d+)!/g, "factorial($1)");
  return jsExpr;
}

// Factorial function
function factorial(n) {
  if (n < 0 || n % 1 !== 0) throw "Factorial only for non-negative integers";
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

// Evaluate expression safely
function evaluateExpression(expr) {
  const jsExpr = parseExpressionToJS(expr);
  try {
    const f = new Function("factorial", `return ${jsExpr};`);
    const result = f(factorial);
    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

// Validate expression (all dice used once, no invalid concat, etc.)
// and compute score
function validateExpression() {
  if (usedDiceIndices.size !== 5) {
    alert("You must use all five dice exactly once.");
    return false;
  }
  const val = evaluateExpression(expression);
  if (val === null) {
    alert("Invalid expression.");
    return false;
  }
  return val;
}

// Submit expression logic, update streak and history
function submitExpression() {
  if (expression.length === 0) {
    alert("Please enter an expression before submitting.");
    return;
  }
  const val = validateExpression();
  if (val === false) return;
  const score = Math.abs(val - target);
  // Display result and score
  // Show Qu0x animation on perfect score
  if (score === 0) {
    qu0xAchieved = true;
    incrementStreak();
    showQu0xAnimation();
  } else {
    qu0xAchieved = false;
    resetStreak();
  }
  saveGameResult(score);
  updateHistory();
}


