// script.js

// --- CONSTANTS ---
const START_DATE = new Date(2025, 4, 15); // May 15, 2025 (month is 0-based)
const MAX_HISTORY = 5;

// Horse race dice colors by number:
const horseColors = {
  1: 'red',
  2: 'white',
  3: 'blue',
  4: 'yellow',
  5: 'green',
  6: 'black',
};

// --- STATE ---
let currentGameNum = 1;
let currentStreak = 0;
let diceValues = [];
let targetNumber = 0;
let usedDice = new Set();
let expression = '';
let perfectScoreToday = false;

const diceContainer = document.getElementById('dice-container');
const targetNumberSpan = document.getElementById('target-number');
const expressionDisplay = document.getElementById('expression-display');
const resultContainer = document.getElementById('result-container');
const messageContainer = document.getElementById('message-container');
const scoreDisplay = document.getElementById('score');
const streakDisplay = document.getElementById('streak');
const prevGameBtn = document.getElementById('prev-game');
const nextGameBtn = document.getElementById('next-game');
const gameNumberDiv = document.getElementById('game-number');
const dateDisplay = document.getElementById('date-display');
const historyBody = document.querySelector('#history tbody');
const clearBtn = document.getElementById('clear-btn');
const backspaceBtn = document.getElementById('backspace-btn');
const qu0xPopup = document.getElementById('qu0x-popup');

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDateByGameNumber(n) {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + n - 1);
  return d;
}

function getTodayGameNumber() {
  const now = new Date();
  const diffMs = now.setHours(0,0,0,0) - START_DATE.getTime();
  if(diffMs < 0) return 1;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

// For demo, this generates deterministic dice & target based on game number.
// Replace this with your puzzle generation that guarantees a solution.
function generatePuzzle(gameNum) {
  // Just example - deterministic but different per game
  // Use PRNG or a simple formula to get dice & target

  // Example dice numbers (1-6)
  let seed = gameNum * 1234567;
  function randInt(min, max) {
    seed = (seed * 9301 + 49297) % 233280;
    return min + (seed % (max - min + 1));
  }

  let dice = [];
  while (dice.length < 5) {
    let val = randInt(1, 6);
    dice.push(val);
  }

  // Example target between 1 and 100:
  let target = randInt(1, 100);

  return { dice, target };
}

function renderDice() {
  diceContainer.innerHTML = '';
  for(let i=0; i<diceValues.length; i++) {
    const val = diceValues[i];
    const used = usedDice.has(i);
    const die = document.createElement('div');
    die.className = `die ${horseColors[val] || 'black'}`;
    die.textContent = val;
    if (used) die.classList.add('used');
    die.dataset.index = i;
    die.title = used ? 'Already used' : 'Click to use this die';
    die.addEventListener('click', () => {
      if (used) return;
      appendToExpression(val.toString(), i);
    });
    diceContainer.appendChild(die);
  }
}

function appendToExpression(char, diceIndex = null) {
  // Operators and parentheses allowed always
  // Numbers must be dice numbers used only once
  
  // Check if char is number, operator or parenthesis
  const isNumber = /^\d+$/.test(char);
  const isOperator = /^[+\-*/^!]$/.test(char);
  const isParen = /^[()]$/.test(char);

  // Check rules: after a number must be operator or ), after operator must be number or ( or !
  // We'll allow ! anywhere but must be after a number

  if (isNumber) {
    // Only add if diceIndex not used
    if (diceIndex === null || usedDice.has(diceIndex)) {
      messageContainer.textContent = 'This dice value is already used or invalid.';
      return;
    }
    // Prevent two numbers concatenated without operator (disallow adding number if last char is number)
    if (expression.length > 0) {
      const lastChar = expression.slice(-1);
      if (/\d/.test(lastChar)) {
        messageContainer.textContent = 'Please add an operator before next number.';
        return;
      }
    }
    expression += char;
    usedDice.add(diceIndex);
    messageContainer.textContent = '';
  }
  else if (isOperator || isParen) {
    if (char === '!') {
      // ! must come after a number
      if (expression.length === 0 || !/\d/.test(expression.slice(-1))) {
        messageContainer.textContent = 'Factorial (!) must follow a number.';
        return;
      }
      expression += char;
      messageContainer.textContent = '';
    } else {
      // Other operators and parentheses
      // Basic check: expression not empty for operator, allow ( anytime, allow ) only if matching
      if (isOperator && char !== '!') {
        if (expression.length === 0) {
          messageContainer.textContent = 'Expression cannot start with operator except "("';
          return;
        }
        const lastChar = expression.slice(-1);
        if (/[\+\-\*\/\^\!\(]/.test(lastChar)) {
          messageContainer.textContent = 'Cannot have two operators in a row.';
          return;
        }
        expression += char;
        messageContainer.textContent = '';
      } else if (char === '(') {
        // Always allow
        expression += char;
        messageContainer.textContent = '';
      } else if (char === ')') {
        // Allow only if parentheses count matches
        let openCount = (expression.match(/\(/g) || []).length;
        let closeCount = (expression.match(/\)/g) || []).length;
        if (openCount <= closeCount) {
          messageContainer.textContent = 'No matching "(" for this ")".';
          return;
        }
        const lastChar = expression.slice(-1);
        if (/[\+\-\*\/\^\!\(]/.test(lastChar)) {
          messageContainer.textContent = 'Cannot close parenthesis after operator.';
          return;
        }
        expression += char;
        messageContainer.textContent = '';
      }
    }
  } else {
    messageContainer.textContent = 'Invalid input.';
    return;
  }
  updateExpressionDisplay();
  renderDice();
  evaluateExpression();
}

function updateExpressionDisplay() {
  expressionDisplay.textContent = expression || '...';
}

function clearExpression() {
  expression = '';
  usedDice.clear();
  messageContainer.textContent = '';
  updateExpressionDisplay();
  renderDice();
  updateScore(0);
}

function backspaceExpression() {
  if (expression.length === 0) return;
  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);
  if (/\d/.test(lastChar)) {
    // Find which dice index this number was
    // To keep it simple, re-check dice usage by comparing expression numbers
    recalcUsedDice();
  } else if (lastChar === '!') {
    // factorial removed, no dice usage change
  } else if (lastChar === '(' || lastChar === ')') {
    // no dice usage change
  } else {
    // operator removed, no dice usage change
  }
  messageContainer.textContent = '';
  updateExpressionDisplay();
  renderDice();
  evaluateExpression();
}

function recalcUsedDice() {
  usedDice.clear();
  // For each dice value, if found in expression as a single digit not adjacent to another digit, mark used
  // Because concatenation disallowed, each number digit in expression corresponds to exactly one dice value

  // We check the expression for numbers and map them to dice values used

  // Map dice values to indices for multiple same values
  let valueIndices = {};
  for (let i=0; i<diceValues.length; i++) {
    const val = diceValues[i];
    if (!valueIndices[val]) valueIndices[val] = [];
    valueIndices[val].push(i);
  }

  // Now parse expression left to right for digits (numbers are single digits only)
  for (let i=0; i<expression.length; i++) {
    const ch = expression[i];
    if (/\d/.test(ch)) {
      // Find unused index in valueIndices[ch]
      if (valueIndices[ch] && valueIndices[ch].length > 0) {
        const idx = valueIndices[ch].shift();
        usedDice.add(idx);
      }
    }
  }
}

function evaluateExpression() {
  if (expression.length === 0) {
    updateScore(0);
    resultContainer.textContent = '';
    return;
  }
  // Validate parentheses count
  let openCount = (expression.match(/\(/g) || []).length;
  let closeCount = (expression.match(/\)/g) || []).length;
  if (openCount !== closeCount) {
    resultContainer.textContent = 'Mismatched parentheses';
    updateScore(0);
    return;
  }
  // Replace factorial (!) with function calls
  try {
    let expToEval = expression.replace(/(\d+)!/g, 'factorial($1)');
    // Replace ^ with ** for exponentiation (JS)
    expToEval = expToEval.replace(/\^/g, '**');
    // Evaluate safely
    let val = eval(expToEval);
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      resultContainer.textContent = 'Invalid result';
      updateScore(0);
      return;
    }
    const score = Math.abs(val - targetNumber);
    updateScore(score);
    resultContainer.textContent = `Result = ${val.toFixed(4)} (target ${targetNumber})`;
    if (score === 0) {
      showQu0xPopup();
      if (!perfectScoreToday) {
        currentStreak++;
        perfectScoreToday = true;
        saveStreak();
      }
      streakDisplay.textContent = `Current Qu0x Streak: ${currentStreak}`;
      messageContainer.textContent = 'Qu0x! Perfect score!';
    } else {
      messageContainer.textContent = '';
      perfectScoreToday = false;
    }
  } catch(e) {
    resultContainer.textContent = 'Error evaluating expression';
    updateScore(0);
  }
}

function factorial(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 0) throw 'Factorial only for nonnegative integers';
  if (n > 170) throw 'Number too large'; // prevent overflow
  let f = 1;
  for(let i=2; i<=n; i++) f *= i;
  return f;
}

function updateScore(score) {
  scoreDisplay.textContent = `Score: ${score.toFixed(4)}`;
  saveGameResult(score);
}

function saveGameResult(score) {
  const key = `qu0x-game-${currentGameNum}`;
  const dateStr = formatDate(getDateByGameNumber(currentGameNum));
  localStorage.setItem(key, JSON.stringify({ score, date: dateStr }));
  updateHistoryTable();
}

function saveStreak() {
  localStorage.setItem('qu0x-current-streak', currentStreak);
}

function loadStreak() {
  let stored = localStorage.getItem('qu0x-current-streak');
  if (stored) currentStreak = Number(stored);
  else currentStreak = 0;
  streakDisplay.textContent = `Current Qu0x Streak: ${currentStreak}`;
}

function updateHistoryTable() {
  historyBody.innerHTML = '';
  for (let i = currentGameNum - MAX_HISTORY + 1; i <= currentGameNum; i++) {
    if (i < 1) continue;
    const key = `qu0x-game-${i}`;
    const item = localStorage.getItem(key);
    if (!item) continue;
    const data = JSON.parse(item);
    const tr = document.createElement('tr');
    const tdDate = document.createElement('td');
    const tdScore = document.createElement('td');
    tdDate.textContent = data.date;
    tdScore.textContent = data.score.toFixed(4);
    tr.appendChild(tdDate);
    tr.appendChild(tdScore);
    historyBody.appendChild(tr);
  }
}

function showQu0xPopup() {
  qu0xPopup.style.display = 'block';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

function getDateByGameNumber(gameNum) {
  // Starting date: Jan 1, 2025
  const baseDate = new Date(2025, 0, 1);
  let date = new Date(baseDate);
  date.setDate(baseDate.getDate() + (gameNum - 1));
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function loadGame(gameNum) {
  currentGameNum = gameNum;
  const gameData = generateGameData(gameNum);
  diceValues = gameData.dice;
  targetNumber = gameData.target;
  expression = '';
  usedDice.clear();
  messageContainer.textContent = '';
  updateExpressionDisplay();
  renderDice();
  resultContainer.textContent = '';
  updateScore(0);
  updateHistoryTable();
}

function init() {
  loadStreak();
  loadGame(currentGameNum);

  backspaceButton.addEventListener('click', backspaceExpression);
  clearButton.addEventListener('click', clearExpression);

  prevGameButton.addEventListener('click', () => {
    if (currentGameNum > 1) loadGame(currentGameNum - 1);
  });

  nextGameButton.addEventListener('click', () => {
    loadGame(currentGameNum + 1);
  });
}

init();
</script>

</body>
</html>
