// Qu0x Game Script

const diceContainer = document.getElementById('dice-container');
const targetNumberSpan = document.getElementById('target-number');
const expressionDisplay = document.getElementById('expression-display');
const messageContainer = document.getElementById('message');
const resultContainer = document.getElementById('result-container');
const scoreDisplay = document.getElementById('score-display');
const historyBody = document.getElementById('history-body');
const streakDisplay = document.getElementById('streak-display');
const qu0xPopup = document.getElementById('qu0x-popup');

const backspaceButton = document.getElementById('btn-backspace');
const clearButton = document.getElementById('btn-clear');
const prevGameButton = document.getElementById('prev-game');
const nextGameButton = document.getElementById('next-game');

const operatorButtons = document.querySelectorAll('.op-btn');

const MAX_HISTORY = 5;
const START_DATE = new Date(2025, 4, 15); // May 15, 2025 (month 0-indexed)

let currentGameNum = 1;
let diceValues = [];
let usedDice = new Set();
let expression = '';
let targetNumber = 0;
let currentStreak = 0;
let perfectScoreToday = false;

const horseColors = {
  1: 'red',
  2: 'white',
  3: 'blue',
  4: 'red',
  5: 'white',
  6: 'blue',
};

function seededRandom(seed) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function generateGameData(gameNum) {
  const rand = seededRandom(gameNum * 1234567);

  const dice = [];
  while (dice.length < 5) {
    dice.push(Math.floor(rand() * 6) + 1);
  }

  const target = Math.floor(rand() * 100) + 1;

  return { dice, target };
}

function renderDice() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, i) => {
    const die = document.createElement('div');
    die.className = 'die ' + horseColors[val];
    die.textContent = val;
    if (usedDice.has(i)) {
      die.classList.add('used');
    }
    die.dataset.index = i;
    die.addEventListener('click', () => {
      if (!usedDice.has(i)) {
        appendDice(i);
      }
    });
    diceContainer.appendChild(die);
  });
}

function appendDice(index) {
  const val = diceValues[index];
  // Prevent appending dice if already used
  if (usedDice.has(index)) return;

  // Prevent concatenation of digits without operator (i.e. no "23")
  if (expression.length > 0) {
    const lastChar = expression[expression.length - 1];
    if (isDigit(lastChar)) {
      showMessage('Cannot concatenate dice numbers. Use an operator.');
      return;
    }
  }

  expression += val;
  usedDice.add(index);
  updateExpression();
  renderDice();
  evaluateExpression();
}

function isDigit(ch) {
  return /\d/.test(ch);
}

function appendOperator(op) {
  if (expression.length === 0 && (op !== '(')) {
    showMessage('Expression cannot start with this operator.');
    return;
  }
  const lastChar = expression[expression.length - 1];
  // Prevent two operators in a row, except closing bracket
  if ('+-*/^!'.includes(lastChar) && op !== '(' && op !== ')') {
    showMessage('Cannot have two operators in a row.');
    return;
  }
  // Special rules for factorial
  if (op === '!') {
    // factorial must follow a number or closing bracket
    if (!(isDigit(lastChar) || lastChar === ')')) {
      showMessage('Factorial must follow a number or closing parenthesis.');
      return;
    }
  }
  // Special rules for exponent
  if (op === '^') {
    // exponent must follow a number or closing bracket
    if (!(isDigit(lastChar) || lastChar === ')')) {
      showMessage('Exponent must follow a number or closing parenthesis.');
      return;
    }
  }
  // Prevent starting expression with a closing parenthesis
  if (op === ')' && expression.length === 0) {
    showMessage('Cannot start expression with closing parenthesis.');
    return;
  }
  expression += op;
  updateExpression();
  evaluateExpression();
}

function backspace() {
  if (expression.length === 0) return;

  // If last char was a digit, free that dice
  const lastChar = expression[expression.length - 1];

  if (isDigit(lastChar)) {
    // Find the last digit in expression and free the dice accordingly
    // But since digits are only appended as dice values, free the last used dice matching that value

    // Find which dice index to free:
    // We stored dice indices in usedDice, but we don't know order
    // So we must track the order of used dice to backspace properly
    // Instead, keep usedDice as Set and expression as string only
    // Workaround: we can rebuild usedDice from expression on backspace

    // So remove last char, then rebuild usedDice from expression
    expression = expression.slice(0, -1);
    rebuildUsedDiceFromExpression();
  } else {
    // Just remove operator or paren or factorial
    expression = expression.slice(0, -1);
  }
  updateExpression();
  renderDice();
  evaluateExpression();
}

function rebuildUsedDiceFromExpression() {
  usedDice.clear();
  // For each digit in expression, mark the corresponding dice as used (in order)
  // Since dice values can be repeated, we have to mark dice used in order of appearance
  let expr = expression;
  // count how many dice of each value are used
  let counts = {};
  for (let ch of expr) {
    if (isDigit(ch)) {
      counts[ch] = (counts[ch] || 0) + 1;
    }
  }

  // For each dice, mark as used if value appears and count not yet reached
  let usedCount = {};
  diceValues.forEach((val, i) => {
    let sVal = val.toString();
    if (counts[sVal]) {
      usedCount[sVal] = (usedCount[sVal] || 0);
      if (usedCount[sVal] < counts[sVal]) {
        usedDice.add(i);
        usedCount[sVal]++;
      }
    }
  });
}

function clearExpression() {
  expression = '';
  usedDice.clear();
  updateExpression();
  renderDice();
  evaluateExpression();
  clearMessage();
  clearResult();
}

function updateExpression() {
  expressionDisplay.textContent = expression || '...';
  clearMessage();
}

function showMessage(msg) {
  messageContainer.textContent = msg;
}

function clearMessage() {
  messageContainer.textContent = '';
}

function clearResult() {
  resultContainer.textContent = '';
  scoreDisplay.textContent = '';
}

function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0) return 1;
  let f = 1;
  for (let i = 1; i <= n; i++) f *= i;
  return f;
}

function safeEval(exp) {
  // Replace ^ with ** (exponentiation)
  let modExp = exp.replace(/\^/g, '**');

  // Replace factorial ! with function calls
  // This requires parsing but we'll use a regex to replace x! with factorial(x)
  // For simplicity, handle only integer numbers before !
  // Regex to find number! patterns:
  // e.g. 3!, (3+2)!, etc. We'll just do a limited approach: digit+!

  // We'll do iterative replacement for digits followed by !:
  // But (3+2)! or expressions factorial not supported to avoid complexity

  while (true) {
    const factMatch = modExp.match(/(\d+)!/);
    if (!factMatch) break;
    let num = parseInt(factMatch[1], 10);
    if (num > 20) return NaN; // limit to avoid huge factorials
    let factVal = factorial(num);
    modExp = modExp.replace(factMatch[0], factVal.toString());
  }

  // Disallow any characters except digits, +-*/().^ and spaces
  if (!/^[\d+\-*/().\s]+$/.test(modExp)) return NaN;

  try {
    let val = eval(modExp);
    if (typeof val !== 'number' || !isFinite(val)) return NaN;
    return val;
  } catch {
    return NaN;
  }
}

function evaluateExpression() {
  if (!expression || expression.length === 0) {
    clearResult();
    return;
  }
  let val = safeEval(expression);
  if (isNaN(val)) {
    resultContainer.textContent = 'Invalid Expression';
    scoreDisplay.textContent = '';
    return;
  }
  val = Math.round(val * 10000) / 10000; // round to 4 decimals

  resultContainer.textContent = `Result: ${val}`;

  let diff = Math.abs(targetNumber - val);
  scoreDisplay.textContent = `Score (abs difference): ${diff}`;

  // Check perfect score for Qu0x celebration
  if (diff === 0) {
    if (!perfectScoreToday) {
      currentStreak++;
      perfectScoreToday = true;
      streakDisplay.textContent = `Current Qu0x Streak: ${currentStreak}`;
      showQu0xPopup();
      saveResult(diff);
    }
  } else {
    perfectScoreToday = false;
  }
}

function showQu0xPopup() {
  qu0xPopup.style.display = 'block';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

function saveResult(score) {
  let archive = JSON.parse(localStorage.getItem('qu0xArchive') || '[]');
  let todayStr = getCurrentDateStr();
  archive.unshift({ date: todayStr, score: score, gameNum: currentGameNum });

  if (archive.length > MAX_HISTORY) archive.length = MAX_HISTORY;

  localStorage.setItem('qu0xArchive', JSON.stringify(archive));
  renderHistory();
}

function renderHistory() {
  let archive = JSON.parse(localStorage.getItem('qu0xArchive') || '[]');
  historyBody.innerHTML = '';
  archive.slice(0, MAX_HISTORY).forEach((entry) => {
    let tr = document.createElement('tr');
    let dateTd = document.createElement('td');
    let scoreTd = document.createElement('td');
    dateTd.textContent = entry.date;
    scoreTd.textContent = entry.score;
    tr.appendChild(dateTd);
    tr.appendChild(scoreTd);
    historyBody.appendChild(tr);
  });
}

function getCurrentDateStr() {
  let now = new Date();
  return now.toISOString().slice(0, 10);
}

function loadGame(gameNum) {
  clearExpression();
  currentGameNum = gameNum;

  // Calculate seed date offset from start date
  let dateOffset = gameNum - 1;

  // Generate dice and target for this game
  let { dice, target } = generateGameData(gameNum);
  diceValues = dice;
  targetNumber = target;

  targetNumberSpan.textContent = targetNumber;
  usedDice.clear();
  renderDice();
  updateExpression();
  clearResult();
  clearMessage();
}

function init() {
  loadGame(1);
  renderHistory();
  streakDisplay.textContent = `Current Qu0x Streak: ${currentStreak}`;
}

backspaceButton.addEventListener('click', backspace);
clearButton.addEventListener('click', clearExpression);
prevGameButton.addEventListener('click', () => {
  if (currentGameNum > 1) {
    loadGame(currentGameNum - 1);
  }
});
nextGameButton.addEventListener('click', () => {
  loadGame(currentGameNum + 1);
});

operatorButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    appendOperator(btn.textContent);
  });
});

init();
