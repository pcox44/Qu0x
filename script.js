// Qu0x Game Script

// Constants for horse race colors (dice 1-6)
const diceColors = {
  1: { bg: '#ff0000', fg: 'white' },     // Red 1
  2: { bg: '#ffffff', fg: 'black' },     // White 2
  3: { bg: '#0000ff', fg: 'white' },     // Blue 3
  4: { bg: '#ffa500', fg: 'black' },     // Orange 4
  5: { bg: '#008000', fg: 'white' },     // Green 5
  6: { bg: '#000000', fg: 'yellow' }     // Black 6 with yellow number
};

// Starting date (May 15, 2025)
const startDate = new Date(2025, 4, 15); // Months 0-based, so 4 = May

// Max days back for archive display
const maxArchiveDays = 5;

// Game state
let currentDate = new Date();  // Will be adjusted to startDate or later
let currentGameIndex = 0;      // Days since startDate

let dice = [];
let target = 0;
let usedDiceIndices = new Set();
let expression = '';
let inputLocked = false;

let currentScore = null;
let currentStreak = 0;

let archive = {};  // dateStr -> {score, expression}

const diceContainer = document.getElementById('dice-container');
const targetContainer = document.getElementById('target-container');
const expressionContainer = document.getElementById('expression-container');
const messageContainer = document.getElementById('message-container');
const scoreContainer = document.getElementById('score');
const streakContainer = document.getElementById('streak');
const historyBody = document.querySelector('#history tbody');
const gameDateDisplay = document.getElementById('game-date');

const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const submitBtn = document.getElementById('submit');
const clearBtn = document.getElementById('clear');
const backspaceBtn = document.getElementById('backspace');
const buttonsContainer = document.getElementById('buttons-container');
const qu0xPopup = document.getElementById('qu0x-popup');

const opButtons = Array.from(document.querySelectorAll('.op'));

function padZero(num) {
  return num < 10 ? '0' + num : num;
}

// Format date as yyyy-mm-dd
function formatDate(date) {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

// Clamp date to startDate or later
function clampDate(d) {
  return d < startDate ? new Date(startDate.getTime()) : d;
}

// Calculate days difference from startDate
function daysSinceStart(d) {
  const diffMs = d.setHours(0,0,0,0) - startDate.setHours(0,0,0,0);
  return Math.floor(diffMs / (1000*60*60*24));
}
// Load saved archive and streak from localStorage
function loadArchive() {
  const archiveStr = localStorage.getItem('qu0x-archive');
  if (archiveStr) {
    try {
      archive = JSON.parse(archiveStr);
    } catch {
      archive = {};
    }
  } else {
    archive = {};
  }
}

function saveArchive() {
  localStorage.setItem('qu0x-archive', JSON.stringify(archive));
}

function loadStreak() {
  const streak = localStorage.getItem('qu0x-streak');
  currentStreak = streak ? parseInt(streak) : 0;
  updateStreakDisplay();
}

function saveStreak() {
  localStorage.setItem('qu0x-streak', currentStreak);
}

function updateStreakDisplay() {
  streakContainer.textContent = `Current Qu0x Streak: ${currentStreak}`;
}

function updateScoreDisplay(score) {
  if (score === 0) {
    scoreContainer.textContent = `Score: Qu0x! 🎉`;
  } else {
    scoreContainer.textContent = `Score: ${score}`;
  }
}

function clearMessage() {
  messageContainer.textContent = '';
}

function showMessage(msg) {
  messageContainer.textContent = msg;
}

// Generate horse race style dice display, clickable, fades out on use
function renderDice() {
  diceContainer.innerHTML = '';
  dice.forEach((num, idx) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.textContent = num;
    const color = diceColors[num];
    die.style.backgroundColor = color.bg;
    die.style.color = color.fg;
    die.style.opacity = usedDiceIndices.has(idx) ? 0.3 : 1;
    die.style.cursor = usedDiceIndices.has(idx) ? 'default' : 'pointer';
    die.addEventListener('click', () => {
      if (inputLocked) return;
      if (usedDiceIndices.has(idx)) return;
      usedDiceIndices.add(idx);
      fadeOutDie(die);
      appendToExpression(num.toString());
    });
    diceContainer.appendChild(die);
  });
}

function fadeOutDie(die) {
  die.style.transition = 'opacity 0.5s ease';
  die.style.opacity = '0.3';
}

// Append text to expression display
function appendToExpression(text) {
  expression += text;
  renderExpression();
}

function renderExpression() {
  expressionContainer.textContent = expression;
}

// Clear expression and reset dice usage
function clearExpression() {
  expression = '';
  usedDiceIndices.clear();
  renderExpression();
  renderDice();
  clearMessage();
}

// Remove last appended character (and re-enable die if it was a dice number)
function backspaceExpression() {
  if (inputLocked) return;
  if (!expression) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  if ('123456'.includes(lastChar)) {
    // Find the first used die matching this number (in usedDiceIndices)
    for (const idx of usedDiceIndices) {
      if (dice[idx].toString() === lastChar) {
        usedDiceIndices.delete(idx);
        break;
      }
    }
  }
  renderExpression();
  renderDice();
  clearMessage();
}
// Evaluate expression safely with factorial and exponentiation support
function evaluateExpression(expr) {
  // Replace ^ with ** for JS exponentiation
  expr = expr.replace(/\^/g, '**');

  // Replace factorial ! with calls to factorial function
  expr = expr.replace(/(\d+)!/g, (match, n) => {
    const num = parseInt(n);
    if (num < 0 || !Number.isInteger(num)) {
      throw new Error('Factorial only defined for non-negative integers');
    }
    return factorial(num);
  });

  // Disallow letters or other dangerous characters
  if (/[^0-9+\-*/().eE*]/.test(expr)) {
    throw new Error('Invalid characters in expression');
  }

  // eslint-disable-next-line no-eval
  return eval(expr);
}

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function checkSolution() {
  if (!expression) {
    showMessage('Please enter an expression.');
    return;
  }
  let val;
  try {
    val = evaluateExpression(expression);
  } catch (e) {
    showMessage('Error evaluating expression.');
    return;
  }
  if (typeof val !== 'number' || isNaN(val)) {
    showMessage('Invalid result.');
    return;
  }
  const score = Math.abs(val - target);
  updateScoreDisplay(score);

  if (score === 0) {
    // Perfect score: Qu0x!
    showMessage('Qu0x! You solved it perfectly!');
    if (!archive[currentDate] || archive[currentDate].score > 0) {
      archive[currentDate] = { score: 0 };
      saveArchive();
      currentStreak++;
      saveStreak();
      updateStreakDisplay();
    }
    inputLocked = true;
    renderDice();
    renderExpression();
    showQu0xAnimation();
  } else {
    showMessage(`Difference from target: ${score}`);
  }
}

function showQu0xAnimation() {
  qu0xPopup.style.display = 'flex';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

function generateSharingLink() {
  const baseUrl = window.location.href.split('?')[0];
  const params = new URLSearchParams();
  params.set('date', currentDate);
  if (expression) {
    params.set('expr', expression);
  }
  return `${baseUrl}?${params.toString()}`;
}

function updateSharingLink() {
  const link = generateSharingLink();
  shareLink.href = link;
  shareLink.textContent = 'Share this game';
}

// Navigate to previous game
function goToPreviousGame() {
  const prevDate = getDateNDaysBefore(currentDate, 1);
  if (prevDate < gameStartDate) return;
  loadGameDate(prevDate);
}

// Navigate to next game
function goToNextGame() {
  const nextDate = getDateNDaysAfter(currentDate, 1);
  if (nextDate > today) return;
  loadGameDate(nextDate);
}

prevGameBtn.addEventListener('click', () => {
  if (inputLocked) return;
  goToPreviousGame();
});

nextGameBtn.addEventListener('click', () => {
  if (inputLocked) return;
  goToNextGame();
});

clearBtn.addEventListener('click', () => {
  if (inputLocked) return;
  clearExpression();
});

backspaceBtn.addEventListener('click', () => {
  if (inputLocked) return;
  backspaceExpression();
});

submitBtn.addEventListener('click', () => {
  if (inputLocked) return;
  checkSolution();
});

document.addEventListener('DOMContentLoaded', () => {
  loadArchive();
  loadStreak();

  // Load date from URL param if valid, else today
  const urlDate = new URLSearchParams(window.location.search).get('date');
  if (urlDate && urlDate >= gameStartDate && urlDate <= today) {
    currentDate = urlDate;
  }
  loadGameDate(currentDate);
});
