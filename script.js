// Constants
const startDate = new Date(2025, 4, 15); // May 15, 2025 (month is 0-based)
const maxHistoryDays = 10;

const diceColors = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];

// DOM elements
const diceContainer = document.getElementById('dice-container');
const targetContainer = document.getElementById('target-container');
const gameNumberContainer = document.getElementById('game-number');
const expressionInput = document.getElementById('expression');
const submitBtn = document.getElementById('submit-btn');
const backspaceBtn = document.getElementById('backspace');
const clearBtn = document.getElementById('clear');
const buttonsContainer = document.getElementById('buttons-container');
const resultContainer = document.getElementById('result-container');
const scoreContainer = document.getElementById('score');
const streakContainer = document.getElementById('streak');
const messageContainer = document.getElementById('message-container');
const historyBody = document.getElementById('history-body');

// Variables
let currentGameDate = null;
let currentGameNumber = null;
let dice = [];
let targetNumber = 0;
let expression = '';
let gameData = {}; // Loaded from localStorage
let streak = 0;
let submittedToday = false;

// Utility: format date as YYYY-MM-DD string
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// Calculate days since startDate (inclusive)
function getGameNumberFromDate(date) {
  const diff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

// Calculate date from game number
function getDateFromGameNumber(n) {
  let d = new Date(startDate);
  d.setDate(d.getDate() + n - 1);
  return d;
}

// Horse race dice color class by dice value 1-6
function getDiceClass(val) {
  return diceColors[val - 1];
}

// Generate random dice (5 dice, values 1-6)
function generateDice() {
  let arr = [];
  for (let i = 0; i < 5; i++) {
    arr.push(Math.floor(Math.random() * 6) + 1);
  }
  return arr;
}

// Generate target number for given dice using a simple hash based on dice + date string
function generateTarget(diceArr, dateStr) {
  // Simple stable hash for target between 10 and 99
  let seed = diceArr.reduce((a, b) => a + b, 0) + dateStr.split('-').join('');
  let target = 10 + (seed * 17) % 90;
  return target;
}

// Check if an expression uses each dice number exactly once (no concatenation)
function usesAllDiceOnce(expr, diceArr) {
  // Extract digits from expression ignoring other chars
  // Count each dice number used once exactly
  let counts = {};
  for (const d of diceArr) counts[d] = 0;

  // Parse tokens by digits (1-6)
  let tokens = expr.match(/[1-6]/g) || [];
  for (const t of tokens) {
    let num = parseInt(t, 10);
    if (!(num in counts)) return false;
    counts[num]++;
  }

  // Each dice must be used exactly once
  for (const d of diceArr) {
    if (counts[d] !== 1) return false;
  }
  return true;
}

// Evaluate expression safely
function safeEval(expr) {
  try {
    // Disallow invalid chars for safety
    if (/[^0-9+\-*/(). ]/.test(expr)) return null;

    // Eval is generally unsafe but here input is restricted
    let val = Function('"use strict";return (' + expr + ')')();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

// Load data from localStorage
function loadData() {
  let dataStr = localStorage.getItem('qu0xGameData');
  if (dataStr) {
    try {
      gameData = JSON.parse(dataStr);
    } catch {
      gameData = {};
    }
  } else {
    gameData = {};
  }

  streak = parseInt(localStorage.getItem('qu0xStreak') || '0', 10);
  if (isNaN(streak)) streak = 0;
}

// Save data to localStorage
function saveData() {
  localStorage.setItem('qu0xGameData', JSON.stringify(gameData));
  localStorage.setItem('qu0xStreak', streak.toString());
}

// Render dice visually
function renderDice() {
  diceContainer.innerHTML = '';
  dice.forEach((d) => {
    const die = document.createElement('div');
    die.className = 'die ' + getDiceClass(d);
    die.textContent = d;
    die.addEventListener('click', () => {
      expression += d.toString();
      updateExpression();
    });
    diceContainer.appendChild(die);
  });
}

// Update displayed expression
function updateExpression() {
  expressionInput.value = expression;
  resultContainer.textContent = '';
  scoreContainer.textContent = '';
  messageContainer.textContent = '';
}

// Update streak display
function updateStreak() {
  streakContainer.textContent = `Current Streak: ${streak}`;
}

// Update game info (number and target)
function updateGameInfo() {
  gameNumberContainer.textContent = `Game #${currentGameNumber}`;
  targetContainer.textContent = `Target: ${targetNumber}`;
}

// Check if submission is allowed today (no playing future dates)
function isTodayOrPast(date) {
  const today = new Date();
  today.setHours(0,0,0,0);
  return date <= today;
}

// Check if user has submitted a Qu0x today
function checkSubmittedToday() {
  const dateStr = formatDate(currentGameDate);
  if (gameData[dateStr]) {
    for (const attempt of gameData[dateStr]) {
      if (attempt.score === 0) return true;
    }
  }
  return false;
}

// On submit click
function onSubmit() {
  if (expression.trim() === '') {
    messageContainer.textContent = 'Please enter an expression.';
    return;
  }

  // Validate dice usage
  if (!usesAllDiceOnce(expression, dice)) {
    messageContainer.textContent = 'Expression must use each dice number exactly once.';
    return;
  }

  // Evaluate expression
  const val = safeEval(expression);
  if (val === null) {
    messageContainer.textContent = 'Invalid expression.';
    return;
  }

  const roundedVal = Math.round(val * 1000000) / 1000000; // round for display
  const score = Math.abs(roundedVal - targetNumber);

  // Prevent playing future games
  if (!isTodayOrPast(currentGameDate)) {
    messageContainer.textContent = 'Cannot play future games.';
    return;
  }

  // Prevent multiple submissions if already Qu0x today
  if (submittedToday) {
    messageContainer.textContent = 'You have already gotten a Qu0x today.';
    return;
  }

  // Store attempt
  const dateStr = formatDate(currentGameDate);
  if (!gameData[dateStr]) gameData[dateStr] = [];
  gameData[dateStr].push({
    expression: expression,
    result: roundedVal,
    score: score,
    timestamp: Date.now()
  });

  // Check if Qu0x (score 0)
  if (score === 0) {
    streak++;
    submittedToday = true;
    messageContainer.textContent = 'Qu0x! Streak increased by 1!';
  } else {
    messageContainer.textContent = 'Good try! Try for a Qu0x!';
  }

  saveData();
  updateStreak();
  updateHistory();
  expression = '';
  updateExpression();
}

// Backspace handler
function onBackspace() {
  expression = expression.slice(0, -1);
  updateExpression();
}

// Clear handler
function onClear() {
  expression = '';
  updateExpression();
}

// Initialize the game for today or last available date if future
function initializeGame() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < startDate) {
    // Before start, no games available
    messageContainer.textContent = 'Game will start on May 15, 2025.';
    submitBtn.disabled = true;
    return;
  }

  // If today is after start date
  let gameDate = today;
  let gameNum = getGameNumberFromDate(gameDate);
  
  // Cap gameNum to current day (no future)
  const maxGameNum = getGameNumberFromDate(today);
  if (gameNum > maxGameNum) {
    gameNum = maxGameNum;
    gameDate = getDateFromGameNumber(gameNum);
  }

  currentGameDate = gameDate;
  currentGameNumber = gameNum;

  // Generate dice and target deterministically by date
  dice = generateDiceForDate(gameDate);
  targetNumber = generateTarget(dice, formatDate(gameDate));

  updateGameInfo();
  renderDice();

  // Load streak and check submissions for today
  loadData();
  submittedToday = checkSubmittedToday();
  updateStreak();

  updateExpression();
  updateHistory();
}

// Generate dice for a date deterministically (stable)
function generateDiceForDate(date) {
  // Seed from date string to pick dice deterministically
  const dateStr = formatDate(date);
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed += dateStr.charCodeAt(i) * (i + 1);
  }
  // Using seed, generate 5 dice values 1-6
  let arr = [];
  for (let i = 0; i < 5; i++) {
    seed = (seed * 9301 + 49297) % 233280; // linear congruential generator
    let val = 1 + (seed % 6);
    arr.push(val);
  }
  return arr;
}

// Update the history table for last 10 days
function updateHistory() {
  historyBody.innerHTML = '';
  let dates = Object.keys(gameData)
    .sort()
    .reverse()
    .slice(0, maxHistoryDays);

  dates.forEach(dateStr => {
    let attempts = gameData[dateStr];
    let gameNum = getGameNumberFromDate(new Date(dateStr));

    attempts.forEach((attempt) => {
      const tr = document.createElement('tr');

      const dateTd = document.createElement('td');
      dateTd.textContent = dateStr;
      tr.appendChild(dateTd);

      const gameNumTd = document.createElement('td');
      gameNumTd.textContent = gameNum;
      tr.appendChild(gameNumTd);

      const exprTd = document.createElement('td');
      exprTd.textContent = attempt.expression;
      tr.appendChild(exprTd);

      const resultTd = document.createElement('td');
      resultTd.textContent = attempt.result;
      tr.appendChild(resultTd);

      const scoreTd = document.createElement('td');
      scoreTd.textContent = attempt.score.toFixed(6);
      tr.appendChild(scoreTd);

      historyBody.appendChild(tr);
    });
  });

  if (historyBody.children.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'No submissions yet.';
    tr.appendChild(td);
    historyBody.appendChild(tr);
  }
}

// Event listeners
submitBtn.addEventListener('click', onSubmit);
backspaceBtn.addEventListener('click', onBackspace);
clearBtn.addEventListener('click', onClear);
buttonsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('op')) {
    expression += e.target.textContent;
    updateExpression();
  }
});

// Initialize on page load
initializeGame();
