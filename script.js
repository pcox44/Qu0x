const diceContainer = document.getElementById('dice-container');
const targetNumberSpan = document.getElementById('target-number');
const expressionDiv = document.getElementById('expression');
const messageContainer = document.getElementById('message');
const scoreDisplay = document.getElementById('score-display');
const streakDisplay = document.getElementById('streak-display');
const shareLink = document.getElementById('share-link');
const historyBody = document.getElementById('history-body');
const qu0xPopup = document.getElementById('qu0x-popup');
const gameNumberDiv = document.getElementById('game-number');
const dateDisplayDiv = document.getElementById('date-display');

const prevGameBtn = document.getElementById('prev-game');
const nextGameBtn = document.getElementById('next-game');
const backspaceBtn = document.getElementById('backspace');
const clearBtn = document.getElementById('clear');
const submitBtn = document.getElementById('submit');

const diceColorMap = {
  1: 'red',
  2: 'white',
  3: 'blue',
  4: 'yellow',
  5: 'green',
  6: 'black'
};

const gameStartDate = "2025-05-15"; // Updated start date
const today = new Date();
const todayStr = today.toISOString().slice(0, 10);

let currentDate = todayStr >= gameStartDate ? todayStr : gameStartDate;
let diceValues = [];
let target = 0;
let expression = '';
let usedDice = [];
let currentStreak = 0;
let archive = {};

function dateToNumber(dateStr) {
  // Number of days since gameStartDate
  const start = new Date(gameStartDate);
  const d = new Date(dateStr);
  const diffTime = d - start;
  return Math.floor(diffTime / (1000*60*60*24)) + 1; // +1 for day 1 as 1
}

function numberToDate(num) {
  const start = new Date(gameStartDate);
  start.setDate(start.getDate() + num - 1);
  return start.toISOString().slice(0, 10);
}

function getDateNDaysBefore(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function getDateNDaysAfter(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function saveArchive() {
  localStorage.setItem('qu0x-archive', JSON.stringify(archive));
}

function loadArchive() {
  const stored = localStorage.getItem('qu0x-archive');
  if (stored) archive = JSON.parse(stored);
  else archive = {};
}

function saveStreak() {
  localStorage.setItem('qu0x-streak', currentStreak);
}

function loadStreak() {
  const st = localStorage.getItem('qu0x-streak');
  if (st) currentStreak = parseInt(st,10);
  else currentStreak = 0;
}

function resetInput() {
  expression = '';
  usedDice = [];
  expressionDiv.textContent = expression;
  updateDiceOpacity();
  messageContainer.textContent = '';
}

function updateDiceOpacity() {
  const diceEls = document.querySelectorAll('.die');
  diceEls.forEach((die, i) => {
    die.style.opacity = usedDice.includes(i) ? '0.3' : '1';
    die.style.pointerEvents = usedDice.includes(i) ? 'none' : 'auto';
  });
}

function rollDice(seed) {
  let x = seed;
  const results = [];
  for (let i = 0; i < 5; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = Math.floor((x / 233280) * 6) + 1;
    results.push(r);
  }
  return results;
}

function getSeedFromDate(dateStr) {
  return parseInt(dateStr.split('-').join(''), 10);
}

function generateTarget(dice) {
  // Target between 5 and 100 for fun, deterministic on dice sum + some formula
  let sum = dice.reduce((a,b)=>a+b,0);
  let targetBase = (sum * 7 + 13) % 96 + 5; // between 5 and 100
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

function updateGameInfo() {
  const gameNum = dateToNumber(currentDate);
  gameNumberDiv.textContent = `Game #${gameNum}`;
  const dateObj = new Date(currentDate);
  dateDisplayDiv.textContent = dateObj.toDateString();
}

function evaluateExpression(expr) {
  try {
    // Replace ^ with **
    let exp = expr.replace(/\^/g, '**');

    // Factorial handling:
    // Replace n! with factorial(n) using a regex and function
    exp = exp.replace(/(\d+)!/g, (match, p1) => {
      let num = parseInt(p1,10);
      if(num < 0 || num > 20) throw "Factorial out of range";
      return factorial(num);
    });

    // Evaluate safely:
    // Only digits, + - * / ^ ( ) allowed now with factorial replaced
    if (/[^0-9+\-*/(). ]/.test(exp)) throw "Invalid characters";

    // Evaluate:
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
  // Show last 5 games sorted descending by game #
  const keys = Object.keys(archive).map(k => parseInt(k,10)).sort((a,b)=>b-a).slice(0,5);
  keys.forEach(gameNum => {
    const entry = archive[gameNum];
    const row = document.createElement('tr');
    const dateTd = document.createElement('td');
    const gameTd = document.createElement('td');
    const scoreTd = document.createElement('td');
    gameTd.textContent = gameNum;
    dateTd.textContent = numberToDate(gameNum);
    scoreTd.textContent = entry.score;
    row.appendChild(gameTd);
    row.appendChild(dateTd);
    row.appendChild(scoreTd);
    historyBody.appendChild(row);
  });
}

function generateShareLink() {
  const gameNum = dateToNumber(currentDate);
  const url = new URL(window.location.href);
  url.searchParams.set('game', gameNum);
  shareLink.href = url.toString();
  shareLink.textContent = 'Share this game';
}

function loadGame(dateStr) {
  currentDate = dateStr;
  const gameNum = dateToNumber(currentDate);

  const seed = getSeedFromDate(currentDate);
  diceValues = rollDice(seed);
  target = generateTarget(diceValues);

  expression = '';
  usedDice = [];

  renderDice();
  updateGameInfo();
  resetInput();

  targetNumberSpan.textContent = target;

  // Load score from archive if any
  if(archive[gameNum]) {
    scoreDisplay.textContent = `Best score: ${archive[gameNum].score}`;
  } else {
    scoreDisplay.textContent = '';
  }

  messageContainer.textContent = '';
  generateShareLink();
  updateHistoryTable();
  updateStreakDisplay();
}

function updateStreakDisplay() {
  streakDisplay.textContent = `Current Streak: ${currentStreak}`;
}

// Button handlers
document.querySelectorAll('.op').forEach(btn => {
  btn.addEventListener('click', () => {
    const op = btn.dataset.op;
    if (op === '!') {
      // Only allow if last char is digit and that digit is 0-9 for factorial
      if(expression.length === 0) return;
      const lastChar = expression[expression.length-1];
      if(/\d/.test(lastChar)) {
        expression += '!';
        expressionDiv.textContent = expression;
      }
    } else {
      // Just add operator
      expression += op;
      expressionDiv.textContent = expression;
    }
  });
});

backspaceBtn.addEventListener('click', () => {
  if(expression.length === 0) return;

  // If last char was a digit and part of a dice, remove dice usage if needed
  // We track usedDice by dice index, so undo last dice usage if last char is a dice number

  // Find last used dice in expression:
  // This is complex so let's just remove last char and if last char is a digit, remove last used dice in reverse order.

  const lastChar = expression[expression.length-1];
  expression = expression.slice(0,-1);
  expressionDiv.textContent = expression;

  if(/\d/.test(lastChar)) {
    // Try to remove the last used dice if any
    if(usedDice.length > 0) {
      usedDice.pop();
      updateDiceOpacity();
    }
  }
});

clearBtn.addEventListener('click', () => {
  resetInput();
});

submitBtn.addEventListener('click', () => {
  // Allow multiple attempts until perfect score
  if(expression.length === 0) {
    messageContainer.textContent = "Enter an expression first.";
    return;
  }
  const val = evaluateExpression(expression);
  if(val === null) {
    messageContainer.textContent = "Invalid expression.";
    return;
  }
  const score = computeScore(val);
  if(score === null) {
    messageContainer.textContent = "Error computing score.";
    return;
  }

  const gameNum = dateToNumber(currentDate);

  // Update archive if better score or first time
  if(!archive[gameNum] || score < archive[gameNum].score) {
    archive[gameNum] = {score: score, date: currentDate};
    saveArchive();
  }

  scoreDisplay.textContent = `Score: ${score}`;
  messageContainer.textContent = `Your expression = ${val}`;

  if(score === 0) {
    messageContainer.textContent = "Perfect! You got Qu0x! 🎉";
    currentStreak++;
    saveStreak();
    updateStreakDisplay();
    showQu0xAnimation();

    // Lock input only on perfect answer
    // Disable dice and operators
    disableInput();

  } else {
    messageContainer.textContent += " Try again!";
  }
});

function disableInput() {
  // Disable dice and operator buttons to lock input after Qu0x
  document.querySelectorAll('.die').forEach(d => d.style.pointerEvents = 'none');
  document.querySelectorAll('.op').forEach(b => b.disabled = true);
  backspaceBtn.disabled = true;
  clearBtn.disabled = true;
  submitBtn.disabled = true;
}

function enableInput() {
  document.querySelectorAll('.die').forEach(d => d.style.pointerEvents = 'auto');
  document.querySelectorAll('.op').forEach(b => b.disabled = false);
  backspaceBtn.disabled = false;
  clearBtn.disabled = false;
  submitBtn.disabled = false;
}

// Prev/Next game buttons
prevGameBtn.addEventListener('click', () => {
  const prevDate = getDateNDaysBefore(currentDate, 1);
  if(prevDate < gameStartDate) return;
  enableInput();
  loadGame(prevDate);
});

nextGameBtn.addEventListener('click', () => {
  const nextDate = getDateNDaysAfter(currentDate, 1);
  if(nextDate > todayStr) return;
  enableInput();
  loadGame(nextDate);
});

// On page load:
loadArchive();
loadStreak();

const params = new URLSearchParams(window.location.search);
const gameParam = params.get('game');
if(gameParam) {
  const dateFromParam = numberToDate(parseInt(gameParam,10));
  if(dateFromParam >= gameStartDate && dateFromParam <= todayStr) {
    loadGame(dateFromParam);
  } else {
    loadGame(currentDate);
  }
} else {
  loadGame(currentDate);
}
