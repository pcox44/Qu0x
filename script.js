"use strict";

// CONSTANTS
const START_DATE = new Date(2025, 4, 15); // May 15, 2025 (month 0-indexed)
const MS_PER_DAY = 86400000;
const MAX_ARCHIVE_DAYS = 5;

// Horse race colors for dice 1-6
const DICE_COLORS = {
  1: "red",
  2: "white",
  3: "blue",
  4: "yellow",
  5: "green",
  6: "black",
};

const OPERATORS = ["+", "-", "*", "/", "^", "!"];

let currentGameNum = 1;
let diceValues = [];
let targetNumber = 0;
let expression = "";
let usedDiceIndices = new Set();
let currentScore = null;
let currentStreak = 0;
let submissionLocked = false;

const gameNumSpan = document.getElementById("game-num");
const dateDisplay = document.getElementById("date-display");
const diceContainer = document.getElementById("dice-container");
const targetSpan = document.getElementById("target-number");
const exprInput = document.getElementById("expression-input");
const messageContainer = document.getElementById("message-container");
const scoreDisplay = document.getElementById("score-display");
const streakDisplay = document.getElementById("streak-display");
const historyTbody = document.querySelector("#history tbody");
const btnClear = document.getElementById("btn-clear");
const btnBackspace = document.getElementById("btn-backspace");
const btnSubmit = document.getElementById("btn-submit");
const btnPrev = document.getElementById("btn-prev-game");
const btnNext = document.getElementById("btn-next-game");
const btnOpenParen = document.getElementById("btn-open-paren");
const btnCloseParen = document.getElementById("btn-close-paren");
const opButtons = document.querySelectorAll(".op-btn");
const qu0xPopup = document.getElementById("qu0x-popup");

// Utilities
function getDateFromGameNum(gameNum) {
  return new Date(START_DATE.getTime() + (gameNum - 1) * MS_PER_DAY);
}
function formatDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Generate deterministic dice values & target for a game number
function generateGameData(gameNum) {
  // Simple seeded pseudo-random using sine, stable per gameNum
  function pseudoRandom(seed) {
    return Math.abs(Math.sin(seed) * 10000) % 1;
  }
  // Dice values 1-6 (5 dice)
  let dice = [];
  let usedDiceVals = new Set();
  let seedBase = gameNum * 13.37;
  while (dice.length < 5) {
    let val = 1 + Math.floor(pseudoRandom(seedBase + dice.length) * 6);
    if (!usedDiceVals.has(val)) {
      usedDiceVals.add(val);
      dice.push(val);
    }
  }
  // Target between 20 and 99 (inclusive)
  let target = 20 + Math.floor(pseudoRandom(seedBase + 10) * 80);
  return { dice, target };
}

// LocalStorage keys & helpers
function lsKey(gameNum) {
  return `qu0x_game_${gameNum}`;
}
function lsStreakKey() {
  return "qu0x_streak";
}

function saveGameResult(gameNum, score, expr) {
  let data = { score, expr, timestamp: Date.now() };
  localStorage.setItem(lsKey(gameNum), JSON.stringify(data));
}
function getGameResult(gameNum) {
  let raw = localStorage.getItem(lsKey(gameNum));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStreak(streak) {
  localStorage.setItem(lsStreakKey(), String(streak));
}
function getStreak() {
  let s = localStorage.getItem(lsStreakKey());
  return s ? parseInt(s, 10) : 0;
}

// UI Updates
function updateGameInfo() {
  gameNumSpan.textContent = currentGameNum;
  let d = getDateFromGameNum(currentGameNum);
  dateDisplay.textContent = formatDate(d);
}
function updateDiceButtons() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, i) => {
    let die = document.createElement("div");
    die.classList.add("die", DICE_COLORS[val]);
    if (usedDiceIndices.has(i)) die.classList.add("used");
    die.textContent = val;
    die.dataset.index = i;
    if (!submissionLocked && !usedDiceIndices.has(i)) {
      die.style.cursor = "pointer";
      die.addEventListener("click", onDiceClick);
    } else {
      die.style.cursor = "default";
    }
    diceContainer.appendChild(die);
  });
}
function updateTarget() {
  targetSpan.textContent = targetNumber;
}
function updateExpressionInput() {
  exprInput.value = expression;
}
function updateScoreDisplay() {
  if (currentScore === null) {
    scoreDisplay.textContent = "N/A";
  } else {
    scoreDisplay.textContent = currentScore;
  }
}
function updateStreakDisplay() {
  streakDisplay.textContent = currentStreak;
}

function updateHistoryTable() {
  historyTbody.innerHTML = "";
  // Show last MAX_ARCHIVE_DAYS games up to currentGameNum
  for (let n = currentGameNum; n > currentGameNum - MAX_ARCHIVE_DAYS && n > 0; n--) {
    let result = getGameResult(n);
    let tr = document.createElement("tr");
    let d = getDateFromGameNum(n);
    let dateStr = formatDate(d);

    let scoreCell = document.createElement("td");
    let resultCell = document.createElement("td");
    if (result) {
      scoreCell.textContent = result.score;
      resultCell.textContent = result.score === 0 ? "Qu0x!" : "Played";
    } else {
      scoreCell.textContent = "-";
      resultCell.textContent = n < currentGameNum ? "Missed" : "Not played";
    }

    tr.appendChild(createCell(n));
    tr.appendChild(createCell(dateStr));
    tr.appendChild(scoreCell);
    tr.appendChild(resultCell);

    historyTbody.appendChild(tr);
  }
}
function createCell(text) {
  let td = document.createElement("td");
  td.textContent = text;
  return td;
}

// Expression parsing & validation helpers
// To prevent concatenation, rules:
// - Cannot place two numbers consecutively without operator in between
// - Factorial applies only after a number or closing paren
// - Exponentiation applies after number or closing paren
// We'll just validate on input construction here

// State machine flags
function canAddNumber() {
  if (expression.length === 0) return true;
  let last = expression.slice(-1);
  if (last === ")" || OPERATORS.includes(last) || last === "(") {
    return true;
  }
  return false; // prevent number after number (concat)
}
function canAddOperator() {
  if (expression.length === 0) return false;
  let last = expression.slice(-1);
  if (OPERATORS.includes(last) || last === "(") return false;
  return true;
}
function canAddFactorial() {
  if (expression.length === 0) return false;
  let last = expression.slice(-1);
  if (last.match(/[0-9)]/)) return true;
  return false;
}
function canAddOpenParen() {
  if (expression.length === 0) return true;
  let last = expression.slice(-1);
  if (OPERATORS.includes(last) || last === "(") return true;
  return false;
}
function canAddCloseParen() {
  if (expression.length === 0) return false;
  // count open and close parens
  let openCount = (expression.match(/\(/g) || []).length;
  let closeCount = (expression.match(/\)/g) || []).length;
  if (openCount <= closeCount) return false;
  let last = expression.slice(-1);
  if (OPERATORS.includes(last) || last === "(") return false;
  return true;
}

// Dice click handler
function onDiceClick(e) {
  if (submissionLocked) return;
  const idx = parseInt(e.currentTarget.dataset.index);
  if (usedDiceIndices.has(idx)) return;

  // Must have operator or expression empty before adding number
  if (!canAddNumber()) {
    showMessage("You must add an operator before selecting another number.");
    return;
  }

  expression += diceValues[idx];
  usedDiceIndices.add(idx);
  updateExpressionInput();
  updateDiceButtons();
  clearMessage();
}

// Operator button handler
function onOperatorClick(e) {
  if (submissionLocked) return;
  const op = e.currentTarget.dataset.op;

  if (op === "!") {
    if (!canAddFactorial()) {
      showMessage("Factorial can only be added after a number or closing parenthesis.");
      return;
    }
    expression += "!";
    updateExpressionInput();
    clearMessage();
    return;
  }

  if (op === "^") {
    if (!canAddOperator()) {
      showMessage("Exponentiation can only be added after a number or closing parenthesis.");
      return;
    }
    expression += "^";
    updateExpressionInput();
    clearMessage();
    return;
  }

  // + - * /
  if (!canAddOperator()) {
    showMessage("Operator cannot follow another operator or open parenthesis.");
    return;
  }

  expression += op;
  updateExpressionInput();
  clearMessage();
}

// Parentheses buttons
function onOpenParenClick() {
  if (submissionLocked) return;
  if (!canAddOpenParen()) {
    showMessage("Cannot add '(' here.");
    return;
  }
  expression += "(";
  updateExpressionInput();
  clearMessage();
}
function onCloseParenClick() {
  if (submissionLocked) return;
  if (!canAddCloseParen()) {
    showMessage("Cannot add ')' here.");
    return;
  }
  expression += ")";
  updateExpressionInput();
  clearMessage();
}

// Clear and Backspace handlers
function onClear() {
  if (submissionLocked) return;
  expression = "";
  usedDiceIndices.clear();
  updateExpressionInput();
  updateDiceButtons();
  clearMessage();
}
function onBackspace() {
  if (submissionLocked) return;
  if (expression.length === 0) return;

  let lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // If lastChar was a digit, find which dice it corresponded to and remove from usedDiceIndices
  // Since dice can repeat digits, remove the last matching dice index used in order
  if (lastChar.match(/[1-6]/)) {
    // Find last used dice index with that value in expression order
    let idxToRemove = null;
    // We'll track dice usage in expression order (we need to store usage in array for exact ordering, 
    // but currently we only have usedDiceIndices as a Set - so we must store usage order to handle this correctly)
    // We'll maintain a separate array usageOrder to store dice indices as they get added.

    if (usageOrder.length > 0) {
      for (let i = usageOrder.length - 1; i >= 0; i--) {
        let idx = usageOrder[i];
        if (diceValues[idx] == lastChar) {
          idxToRemove = idx;
          usageOrder.splice(i, 1);
          break;
        }
      }
    }
    if (idxToRemove !== null) {
      usedDiceIndices.delete(idxToRemove);
    }
  }
  updateExpressionInput();
  updateDiceButtons();
  clearMessage();
}

// Submission handler
function onSubmit() {
  if (submissionLocked) return;
  // Validate expression:
  if (expression.length === 0) {
    showMessage("Expression is empty.");
    return;
  }
  // Must use all dice
  if (usedDiceIndices.size !== diceValues.length) {
    showMessage(`You must use all ${diceValues.length} dice values exactly once.`);
    return;
  }
  // Expression must be valid JS math expression after replacing ^ with ** and factorial evaluated
  // Evaluate expression carefully
  try {
    // Replace ^ with **
    let exprEval = expression.replace(/\^/g, "**");
    // Evaluate factorials:
    exprEval = exprEval.replace(/(\d+)!/g, (match, n) => {
      n = parseInt(n);
      if (n > 10) throw "Factorial too large";
      return factorial(n);
    });
    let val = eval(exprEval);
    if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
      throw "Invalid calculation";
    }
    currentScore = Math.abs(val - targetNumber);
  } catch (err) {
    showMessage("Invalid expression or calculation error.");
    return;
  }
  submissionLocked = true;
  saveGameResult(currentGameNum, currentScore, expression);
  if (currentScore === 0) {
    showMessage("Perfect! You got Qu0x!");
    showQu0xAnimation();
    currentStreak++;
    saveStreak(currentStreak);
  } else {
    showMessage(`Your score: ${currentScore}`);
    if (currentStreak > 0) {
      currentStreak = 0;
      saveStreak(currentStreak);
    }
  }
  updateScoreDisplay();
  updateStreakDisplay();
  updateHistoryTable();
  disableInput();
}

// Factorial helper
function factorial(n) {
  if (n < 0) throw "Negative factorial";
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Disable input after submission
function disableInput() {
  submissionLocked = true;
  // Disable dice and operators visually
  updateDiceButtons();
  opButtons.forEach(btn => btn.disabled = true);
  btnOpenParen.disabled = true;
  btnCloseParen.disabled = true;
  btnClear.disabled = true;
  btnBackspace.disabled = true;
  btnSubmit.disabled = true;
}

// Enable input for new game
function enableInput() {
  submissionLocked = false;
  opButtons.forEach(btn => btn.disabled = false);
  btnOpenParen.disabled = false;
  btnCloseParen.disabled = false;
  btnClear.disabled = false;
  btnBackspace.disabled = false;
  btnSubmit.disabled = false;
}

// Show message
function showMessage(msg) {
  messageContainer.textContent = msg;
}
// Clear message
function clearMessage() {
  messageContainer.textContent = "";
}

// Show Qu0x animation
function showQu0xAnimation() {
  qu0xPopup.style.display = "block";
  setTimeout(() => {
    qu0xPopup.style.display = "none";
  }, 3000);
}

// Navigate between games
function loadGame(gameNum) {
  if (gameNum < 1) return;
  currentGameNum = gameNum;
  let gameData = generateGameData(gameNum);
  diceValues = gameData.dice;
  targetNumber = gameData.target;
  expression = "";
  usedDiceIndices.clear();
  usageOrder = [];
  currentScore = null;
  submissionLocked = false;

  updateGameInfo();
  updateDiceButtons();
  updateTarget();
  updateExpressionInput();
  updateScoreDisplay();
  updateStreakDisplay();
  updateHistoryTable();
  clearMessage();

  // Check if already played
  let result = getGameResult(gameNum);
  if (result) {
    expression = result.expr;
    currentScore = result.score;
    submissionLocked = true;
    updateExpressionInput();
    updateScoreDisplay();
    showMessage(result.score === 0 ? "Perfect! You got Qu0x!" : `Your score: ${result.score}`);
    disableInput();
  } else {
    enableInput();
  }
}

btnClear.addEventListener("click", onClear);
btnBackspace.addEventListener("click", onBackspace);
btnSubmit.addEventListener("click", onSubmit);
btnPrev.addEventListener("click", () => {
  loadGame(currentGameNum - 1);
});
btnNext.addEventListener("click", () => {
  loadGame(currentGameNum + 1);
});
btnOpenParen.addEventListener("click", onOpenParenClick);
btnCloseParen.addEventListener("click", onCloseParenClick);
opButtons.forEach(btn => btn.addEventListener("click", onOperatorClick));

let usageOrder = []; // tracks dice index usage order for backspace handling

// Modified onDiceClick to track usage order
function onDiceClick(e) {
  if (submissionLocked) return;
  const idx = parseInt(e.currentTarget.dataset.index);
  if (usedDiceIndices.has(idx)) return;

  if (!canAddNumber()) {
    showMessage("You must add an operator before selecting another number.");
    return;
  }

  expression += diceValues[idx];
  usedDiceIndices.add(idx);
  usageOrder.push(idx);
  updateExpressionInput();
  updateDiceButtons();
  clearMessage();
}

loadGame(currentGameNum);

---

The above code implements the key requested features:  
- Five dice with distinct colors  
- Use each dice value exactly once  
- Factorial and exponentiation operators with input validation  
- Expression input read-only, built from button clicks and dice selections  
- Score calculation and display  
- Qu0x animation on perfect match  
- Local storage save/load  
- Navigation between games  
- Limited archive (5 games shown)  
- Backspace and Clear buttons with correct dice usage tracking

If you want, I can help you integrate this code into your project or add the shareable link generation next. Would you like me to help with that?
