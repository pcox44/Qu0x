// Constants
const diceColors = ['red', 'blue', 'green', 'orange', 'purple', 'yellow'];
const diceColorMap = {
  1: 'red',
  2: 'blue',
  3: 'green',
  4: 'orange',
  5: 'purple',
  6: 'yellow'
};

const diceContainer = document.getElementById('dice-container');
const expressionDiv = document.getElementById('expression');
const targetNumberSpan = document.getElementById('target-number');
const messageContainer = document.getElementById('message-container');
const scoreDisplay = document.getElementById('score-display');
const historyBody = document.getElementById('history-body');
const streakDisplay = document.getElementById('streak-display');
const prevGameBtn = document.getElementById('prev-game');
const nextGameBtn = document.getElementById('next-game');

const backspaceBtn = document.getElementById('backspace');
const clearBtn = document.getElementById('clear');
const submitBtn = document.getElementById('submit');

const qu0xPopup = document.getElementById('qu0x-popup');

const gameNumberDiv = document.getElementById('game-number');
const dateDisplayDiv = document.getElementById('date-display');

const gameStartDate = "2025-05-15";

let currentDate = gameStartDate;

let diceValues = [];
let usedDice = [];
let expression = '';
let target = 0;

let archive = {};
let currentStreak = 0;

// Utility functions

function dateToNumber(dateStr) {
  // Converts YYYY-MM-DD to a number: YYYYMMDD for easy sorting and storage
  return parseInt(dateStr.replace(/-/g, ''), 10);
}

function numberToDate(num) {
  // Converts number YYYYMMDD back to date string YYYY-MM-DD
  const s = num.toString();
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
}

function getSeedFromDate(dateStr) {
  // Simple deterministic seed based on date string numbers sum
  const sum = dateStr.split('-').reduce((a,v) => a + parseInt(v,10), 0);
  return sum;
}

function rollDice(seed) {
  // Generate 5 dice values using seed - deterministic
  // Using simple LCG for deterministic random numbers
  let x = seed * 9301 + 49297;
  let dice = [];
  for(let i=0; i<5; i++) {
    x = (x * 9301 + 49297) % 233280;
    let val = (x % 6) + 1;
    dice.push(val);
  }
  return dice;
}

function generateTarget(dice) {
  let sum = dice.reduce((a,b)=>a+b,0);
  let targetBase = (sum * 7 + 13) % 96 + 5;
  return targetBase;
}

function renderDice() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val,i) => {
    const die = document.createElement('div');
    die.classList.add('die', diceColorMap[val]);
    die.textContent = val;
    die.dataset.index = i;
    die.title = "Click to use this die";
    if (usedDice.includes(i)) {
      die.classList.add('used');
    }
    die.addEventListener('click', () => {
      if (usedDice.includes(i)) return;
      expression += val;
      usedDice.push(i);
      expressionDiv.textContent = expression;
      updateDiceOpacity();
    });
    diceContainer.appendChild(die);
  });
}

function updateDiceOpacity() {
  document.querySelectorAll('.die').forEach(die => {
    const idx = parseInt(die.dataset.index,10);
    if (usedDice.includes(idx)) {
      die.classList.add('used');
    } else {
      die.classList.remove('used');
    }
  });
}

function updateGameInfo() {
  const gameNum = dateToNumber(currentDate);
  gameNumberDiv.textContent = `Game #${gameNum}`;
  const dateObj = new Date(currentDate);
  dateDisplayDiv.textContent = dateObj.toDateString();
}

function evaluateExpression(expr) {
  try {
    let exp = expr.replace(/\^/g, '**');

    exp = exp.replace(/(\d+)!/g, (match, p1) => {
      let num = parseInt(p1,10);
      if(num < 0 || num > 20) throw "Factorial out of range";
      return factorial(num);
    });

    if (/[^0-9+\-*/(). ]/.test(exp)) throw "Invalid characters";

    const val = Function('"use strict";return (' + exp + ')')();
    if (typeof val !== "number" || isNaN(val) || !isFinite(val)) throw "Invalid calculation";
    return val;
  } catch (e) {
    return null;
  }
}

function factorial(n) {
  if(n === 0 || n === 1) return 1;
  let res = 1;
  for(let i=2; i<=n; i++) res *= i;
  return res;
}

function computeScore(val) {
  if(val === null) return null;
  return Math.abs(target - val);
}

function showQu0xAnimation() {
  qu0xPopup.style.display = 'block';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

function updateHistoryTable() {
  historyBody.innerHTML = '';
  const keys = Object.keys(archive).map(k => parseInt(k,10)).sort((a,b)=>b-a).slice(0,5);
  keys.forEach(gameNum => {
    const entry = archive[gameNum];
    const tr = document.createElement('tr');
    const dateTd = document.createElement('td');
    dateTd.textContent = numberToDate(gameNum);
    const gameNumTd = document.createElement('td');
    gameNumTd.textContent = gameNum;
    const scoreTd = document.createElement('td');
    scoreTd.textContent = entry.score === 0 ? '0 (Qu0x!)' : entry.score;
    tr.appendChild(gameNumTd);
    tr.appendChild(dateTd);
    tr.appendChild(scoreTd);
    historyBody.appendChild(tr);
  });
}

function saveArchive() {
  localStorage.setItem('dailyDiceArchive', JSON.stringify(archive));
  localStorage.setItem('dailyDiceStreak', currentStreak);
}

function loadArchive() {
  const data = localStorage.getItem('dailyDiceArchive');
  const streak = localStorage.getItem('dailyDiceStreak');
  archive = data ? JSON.parse(data) : {};
  currentStreak = streak ? parseInt(streak,10) : 0;
}

function resetGame() {
  expression = '';
  expressionDiv.textContent = expression;
  usedDice = [];
  messageContainer.textContent = '';
  scoreDisplay.textContent = '';
  renderDice();
  updateDiceOpacity();
  updateGameInfo();
  updateHistoryTable();
  streakDisplay.textContent = `Current Streak: ${currentStreak}`;
}

function initializeGame(dateStr) {
  currentDate = dateStr;
  const seed = getSeedFromDate(currentDate);
  diceValues = rollDice(seed);
  target = generateTarget(diceValues);
  targetNumberSpan.textContent = target;
  resetGame();
}

function canUseDieIndex(numStr) {
  return diceValues.includes(parseInt(numStr,10));
}

function backspaceExpression() {
  if(expression.length === 0) return;
  // We need to remove last character or last die usage if it is a die number.
  // We also must manage usedDice accordingly.
  // The only digits that come from dice are from 1 to 6.
  // We remove last char, then recalc usedDice.

  expression = expression.slice(0, -1);
  recalcUsedDice();
  expressionDiv.textContent = expression;
  updateDiceOpacity();
}

function clearExpression() {
  expression = '';
  usedDice = [];
  expressionDiv.textContent = expression;
  updateDiceOpacity();
}

function recalcUsedDice() {
  // Clear usedDice and check which dice values appear in expression.
  usedDice = [];
  // We'll track usage of dice values in order and mark used dice once matched.
  let expr = expression;
  for(let i=0; i < diceValues.length; i++) {
    let dieValStr = diceValues[i].toString();
    if(expr.includes(dieValStr)) {
      // Find first occurrence of dieValStr in expr, remove it, and mark die used
      let idx = expr.indexOf(dieValStr);
      if(idx !== -1) {
        usedDice.push(i);
        expr = expr.slice(0, idx) + expr.slice(idx+1);
      }
    }
  }
}

function checkPerfectScore(score) {
  return score === 0;
}

function canSubmit() {
  return expression.length > 0;
}

function disableButtons(flag) {
  backspaceBtn.disabled = flag;
  clearBtn.disabled = flag;
  submitBtn.disabled = flag;
  document.querySelectorAll('.op').forEach(b => b.disabled = flag);
  document.querySelectorAll('.die').forEach(d => d.style.pointerEvents = flag ? 'none' : 'auto');
}

function addInput(char) {
  // char can be number from dice, or operator or factorial or exponent
  // For dice numbers: only allow if dice not used.
  if(/[1-6]/.test(char)) {
    // Check if any dice of that value unused:
    const val = parseInt(char,10);
    let foundIdx = -1;
    for(let i=0; i < diceValues.length; i++) {
      if(diceValues[i] === val && !usedDice.includes(i)) {
        foundIdx = i;
        break;
      }
    }
    if(foundIdx === -1) {
      messageContainer.textContent = `No unused die with value ${char} left!`;
      return;
    }
    expression += char;
    usedDice.push(foundIdx);
    expressionDiv.textContent = expression;
    updateDiceOpacity();
    messageContainer.textContent = '';
  } else {
    // Operators, factorial, exponent allowed anytime
    expression += char;
    expressionDiv.textContent = expression;
    messageContainer.textContent = '';
  }
}

function onSubmit() {
  if(!canSubmit()) {
    messageContainer.textContent = 'Expression is empty!';
    return;
  }
  const val = evaluateExpression(expression);
  if(val === null) {
    messageContainer.textContent = 'Invalid expression!';
    return;
  }
  const score = computeScore(val);
  if(score === null) {
    messageContainer.textContent = 'Invalid result!';
    return;
  }

  // Save to archive if no previous or better score
  const gameNum = dateToNumber(currentDate);
  if(!archive[gameNum] || archive[gameNum].score > score) {
    archive[gameNum] = { score: score, expression: expression };
  }

  scoreDisplay.textContent = `Your score: ${score}`;
  updateHistoryTable();

  if(score === 0) {
    messageContainer.textContent = 'Perfect! You got a Qu0x!';
    showQu0xAnimation();
    // Increase streak
    if(currentStreak < 0) currentStreak = 0;
    currentStreak++;
    streakDisplay.textContent = `Current Streak: ${currentStreak}`;
    saveArchive();
    disableButtons(true);
  } else {
    messageContainer.textContent = `Score is ${score}. Try again to get a Qu0x!`;
    saveArchive();
  }
}

// Button event listeners
backspaceBtn.addEventListener('click', () => {
  backspaceExpression();
});

clearBtn.addEventListener('click', () => {
  clearExpression();
});

submitBtn.addEventListener('click', () => {
  onSubmit();
});

document.querySelectorAll('.op').forEach(button => {
  button.addEventListener('click', () => {
    addInput(button.dataset.op);
  });
});

document.addEventListener('keydown', e => {
  if(document.activeElement === expressionDiv) {
    if(e.key === "Backspace") {
      backspaceExpression();
      e.preventDefault();
    }
    if(e.key === "Enter") {
      onSubmit();
      e.preventDefault();
    }
    if(/^[0-9+\-*/^()!]$/.test(e.key)) {
      if(/[1-6]/.test(e.key)) {
        addInput(e.key);
      } else if ('+-*/^()!'.includes(e.key)) {
        addInput(e.key);
      }
      e.preventDefault();
    }
  }
});

// Navigation buttons
prevGameBtn.addEventListener('click', () => {
  const currentNum = dateToNumber(currentDate);
  const prevNum = decrementDateNumber(currentNum);
  if(prevNum >= dateToNumber(gameStartDate)) {
    currentDate = numberToDate(prevNum);
    initializeGame(currentDate);
    disableButtons(false);
  }
});

nextGameBtn.addEventListener('click', () => {
  const currentNum = dateToNumber(currentDate);
  const nextNum = incrementDateNumber(currentNum);
  if(nextNum <= dateToNumber(getTodayDateString())) {
    currentDate = numberToDate(nextNum);
    initializeGame(currentDate);
    disableButtons(false);
  }
});

// Helpers to increment/decrement dates (YYYYMMDD numbers)
function incrementDateNumber(num) {
  let date = new Date(numberToDate(num));
  date.setDate(date.getDate()+1);
  return dateToNumber(date.toISOString().slice(0,10));
}

function decrementDateNumber(num) {
  let date = new Date(numberToDate(num));
  date.setDate(date.getDate()-1);
  return dateToNumber(date.toISOString().slice(0,10));
}

function getTodayDateString() {
  const today = new Date();
  const iso = today.toISOString();
  return iso.slice(0,10);
}

function loadGame() {
  loadArchive();
  initializeGame(currentDate);
  if(archive[dateToNumber(currentDate)] && archive[dateToNumber(currentDate)].score === 0) {
    disableButtons(true);
  } else {
    disableButtons(false);
  }
}

// Initialize
loadGame();
