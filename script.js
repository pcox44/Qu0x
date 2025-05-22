// Qu0x Game JS

const startDate = new Date('2025-05-15');
let currentGameDate;
let currentGameNumber;
let dice = [];
let targetNumber;
let expression = '';
let gameData = {};
let streak = 0;
let submittedToday = false;

const diceContainer = document.getElementById('dice');
const expressionInput = document.getElementById('expression');
const targetContainer = document.getElementById('target');
const resultContainer = document.getElementById('result');
const messageContainer = document.getElementById('message');
const submitBtn = document.getElementById('submit');
const streakContainer = document.getElementById('streak');
const gameNumberContainer = document.getElementById('gameNumber');
const historyBody = document.getElementById('historyBody');
const buttonsContainer = document.getElementById('buttons');
const backspaceBtn = document.getElementById('backspace');
const clearBtn = document.getElementById('clear');
const prevBtn = document.getElementById('prevGame');
const nextBtn = document.getElementById('nextGame');

const maxHistoryDays = 10;

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getGameNumberFromDate(date) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((date - startDate) / oneDay) + 1;
}

function getDateFromGameNumber(num) {
  const oneDay = 24 * 60 * 60 * 1000;
  return new Date(startDate.getTime() + (num - 1) * oneDay);
}

function getDiceClass(val) {
  return [null, 'red', 'white', 'blue', 'yellow', 'green', 'black'][val];
}

function usesAllDiceOnce(expr, diceArr) {
  let counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
  let tokens = expr.match(/[1-6]/g) || [];
  for (const t of tokens) {
    let num = parseInt(t, 10);
    if (!(num in counts)) return false;
    counts[num]++;
  }
  for (const d of diceArr) {
    if (counts[d] !== 1) return false;
  }
  return true;
}

function safeEval(expr) {
  try {
    if (/[^0-9+\-*/(). ]/.test(expr)) return null;
    let val = Function('"use strict";return (' + expr + ')')();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

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

function saveData() {
  localStorage.setItem('qu0xGameData', JSON.stringify(gameData));
  localStorage.setItem('qu0xStreak', streak.toString());
}

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

function updateExpression() {
  expressionInput.value = expression;
  resultContainer.textContent = '';
  messageContainer.textContent = '';
}

function updateStreak() {
  streakContainer.textContent = `Current Qu0x Streak: ${streak}`;
}

function updateGameInfo() {
  gameNumberContainer.textContent = `Game #${currentGameNumber}`;
  targetContainer.textContent = `Target: ${targetNumber}`;
}

function isTodayOrPast(date) {
  const today = new Date();
  today.setHours(0,0,0,0);
  return date <= today;
}

function checkSubmittedToday() {
  const dateStr = formatDate(currentGameDate);
  if (gameData[dateStr]) {
    for (const attempt of gameData[dateStr]) {
      if (attempt.score === 0) return true;
    }
  }
  return false;
}

function onSubmit() {
  if (expression.trim() === '') {
    messageContainer.textContent = 'Please enter an expression.';
    return;
  }
  if (!usesAllDiceOnce(expression, dice)) {
    messageContainer.textContent = 'Expression must use each dice number exactly once.';
    return;
  }
  const val = safeEval(expression);
  if (val === null) {
    messageContainer.textContent = 'Invalid expression.';
    return;
  }
  const roundedVal = Math.round(val * 1000000) / 1000000;
  const score = Math.abs(roundedVal - targetNumber);
  if (!isTodayOrPast(currentGameDate)) {
    messageContainer.textContent = 'Cannot play future games.';
    return;
  }
  if (submittedToday) {
    messageContainer.textContent = 'You have already gotten a Qu0x today.';
    return;
  }
  const dateStr = formatDate(currentGameDate);
  if (!gameData[dateStr]) gameData[dateStr] = [];
  gameData[dateStr].push({
    expression: expression,
    result: roundedVal,
    score: score,
    timestamp: Date.now()
  });
  if (score === 0) {
    streak++;
    submittedToday = true;
    messageContainer.textContent = 'Qu0x!';
  } else {
    messageContainer.textContent = 'Good try! Try for a Qu0x!';
  }
  saveData();
  updateStreak();
  updateHistory();
  expression = '';
  updateExpression();
}

function onBackspace() {
  expression = expression.slice(0, -1);
  updateExpression();
}

function onClear() {
  expression = '';
  updateExpression();
}

function initializeGame() {
  let gameNum = currentGameNumber || getGameNumberFromDate(new Date());
  if (gameNum < 1) gameNum = 1;
  const maxGameNum = getGameNumberFromDate(new Date());
  if (gameNum > maxGameNum) gameNum = maxGameNum;

  currentGameNumber = gameNum;
  currentGameDate = getDateFromGameNumber(gameNum);
  dice = generateDiceForDate(currentGameDate);
  targetNumber = generateTarget(dice, formatDate(currentGameDate));

  loadData();
  submittedToday = checkSubmittedToday();
  updateStreak();
  updateGameInfo();
  renderDice();
  updateExpression();
  updateHistory();
}

function generateDiceForDate(date) {
  const dateStr = formatDate(date);
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed += dateStr.charCodeAt(i) * (i + 1);
  }
  let arr = [];
  for (let i = 0; i < 5; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    let val = 1 + (seed % 6);
    arr.push(val);
  }
  return arr;
}

function updateHistory() {
  historyBody.innerHTML = '';
  let dates = Object.keys(gameData).sort().reverse().slice(0, maxHistoryDays);
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
      scoreTd.textContent = attempt.score === 0 ? '0' : attempt.score.toFixed(2);
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

prevBtn.addEventListener('click', () => {
  currentGameNumber--;
  initializeGame();
});

nextBtn.addEventListener('click', () => {
  currentGameNumber++;
  initializeGame();
});

submitBtn.addEventListener('click', onSubmit);
backspaceBtn.addEventListener('click', onBackspace);
clearBtn.addEventListener('click', onClear);
buttonsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('op')) {
    expression += e.target.textContent;
    updateExpression();
  }
});

initializeGame();
