// Constants and helpers for horse race colors by dice value
const horseColors = {
  1: 'red',
  2: 'white',
  3: 'blue',
  4: 'orange',
  5: 'green',
  6: 'black'
};

const startDate = new Date(2025, 4, 15); // May 15, 2025 (month 0-based)
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const maxHistoryLength = 5;

let currentGameIndex = 0; // zero-based for internal, but display game# as currentGameIndex + 1
let diceValues = [];
let targetNumber = 0;
let usedDiceIndices = [];
let expression = '';
let lastCharType = null; // "num", "op", "par", "fact"
let gameData = {}; // saved results {gameIndex: {score, expression, date}}
let currentScore = null;
let currentStreak = 0;
let qu0xAchievedToday = false;

const diceRow = document.getElementById('dice-row');
const targetSpan = document.getElementById('target-number');
const exprInput = document.getElementById('expression-input');
const messageContainer = document.getElementById('message-container');
const scoreSpan = document.getElementById('score');
const streakSpan = document.getElementById('streak');
const gameNumSpan = document.getElementById('game-num');
const dateDiv = document.getElementById('date');
const historyBody = document.getElementById('history-body');
const btnSubmit = document.getElementById('btn-submit');
const btnBackspace = document.getElementById('btn-backspace');
const btnClear = document.getElementById('btn-clear');
const btnPrevGame = document.getElementById('prev-game');
const btnNextGame = document.getElementById('next-game');
const btnNums = document.querySelectorAll('#buttons-container .btn-num');
const btnOps = document.querySelectorAll('#buttons-container .btn-op');

function getTodayGameIndex() {
  const now = new Date();
  // difference in days from startDate, floor, min 0
  const diff = Math.floor((now.setHours(0,0,0,0) - startDate.getTime()) / MS_PER_DAY);
  return diff < 0 ? 0 : diff;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
}

// Generate 5 dice values 1-6 randomly
function generateDice() {
  const dice = [];
  while(dice.length < 5) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice;
}

// Generate target number between 1 and 100
function generateTarget() {
  return Math.floor(Math.random() * 100) + 1;
}

// Reset game state for currentGameIndex
function loadGame(index) {
  currentGameIndex = index;

  // Set game number and date display
  gameNumSpan.textContent = currentGameIndex + 1;
  const gameDate = new Date(startDate.getTime() + currentGameIndex * MS_PER_DAY);
  dateDiv.textContent = formatDate(gameDate);

  // Load stored data or new game
  if (gameData[currentGameIndex]) {
    diceValues = gameData[currentGameIndex].dice;
    targetNumber = gameData[currentGameIndex].target;
    expression = gameData[currentGameIndex].expression || '';
    currentScore = gameData[currentGameIndex].score;
    qu0xAchievedToday = currentScore === 0;
  } else {
    diceValues = generateDice();
    targetNumber = generateTarget();
    expression = '';
    currentScore = null;
    qu0xAchievedToday = false;
    // Save new dice & target for this game
    gameData[currentGameIndex] = {dice: diceValues, target: targetNumber};
  }
  usedDiceIndices = [];

  updateDiceDisplay();
  updateExpressionInput();
  updateScore();
  updateStreak();
  updateHistory();
  messageContainer.textContent = '';
}

function updateDiceDisplay() {
  diceRow.innerHTML = '';
  diceValues.forEach((val, i) => {
    const die = document.createElement('div');
    die.classList.add('die');
    die.classList.add(horseColors[val]);
    die.textContent = val;
    if (usedDiceIndices.includes(i)) {
      die.classList.add('used');
    } else {
      die.classList.remove('used');
    }
    // clicking a die inserts its value if unused
    die.onclick = () => {
      if (usedDiceIndices.includes(i)) return;
      // Insert number only if allowed by concat rule
      if (lastCharType === 'num') {
        // disallow digit concatenation: must have operator after number
        messageContainer.textContent = 'Operator needed between numbers!';
        return;
      }
      expression += val.toString();
      usedDiceIndices.push(i);
      lastCharType = 'num';
      updateExpressionInput();
      updateDiceDisplay();
      messageContainer.textContent = '';
    };
    diceRow.appendChild(die);
  });
}

function updateExpressionInput() {
  exprInput.value = expression;
}

function updateScore() {
  scoreSpan.textContent = currentScore === null ? 'N/A' : currentScore;
}

function updateStreak() {
  streakSpan.textContent = currentStreak;
}

function updateHistory() {
  const keys = Object.keys(gameData).map(Number).sort((a,b)=>b-a);
  historyBody.innerHTML = '';
  keys.slice(0, maxHistoryLength).forEach(i => {
    const data = gameData[i];
    if (!data) return;
    const tr = document.createElement('tr');
    const date = new Date(startDate.getTime() + i * MS_PER_DAY);
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${formatDate(date)}</td>
      <td>${data.score === undefined || data.score === null ? 'N/A' : data.score}</td>
    `;
    historyBody.appendChild(tr);
  });
}

function updateMessage(msg, color='black') {
  messageContainer.textContent = msg;
  messageContainer.style.color = color;
}

function resetExpression() {
  expression = '';
  usedDiceIndices = [];
  lastCharType = null;
  updateExpressionInput();
  updateDiceDisplay();
  messageContainer.textContent = '';
}

function canInsertOperator() {
  // Operator can be inserted if last char was num, fact, or closing paren
  return lastCharType === 'num' || lastCharType === 'fact' || lastCharType === 'parClose';
}

function canInsertOpenParen() {
  // Allow always; user can add open parens anywhere
  return true;
}

function canInsertCloseParen() {
  // Close paren only if more open parens than close parens
  const openCount = (expression.match(/\(/g) || []).length;
  const closeCount = (expression.match(/\)/g) || []).length;
  // Also last char must not be operator or open paren (can't close right after operator or open paren)
  if (openCount <= closeCount) return false;
  if (lastCharType === 'op' || lastCharType === 'parOpen') return false;
  return true;
}

// Button handlers

btnNums.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.val;
    if (val === '(') {
      if (!canInsertOpenParen()) {
        updateMessage('Cannot insert "(" here', 'red');
        return;
      }
      expression += '(';
      lastCharType = 'parOpen';
      updateExpressionInput();
    } else if (val === ')') {
      if (!canInsertCloseParen()) {
        updateMessage('Cannot insert ")" here', 'red');
        return;
      }
      expression += ')';
      lastCharType = 'parClose';
      updateExpressionInput();
    }
    messageContainer.textContent = '';
  });
});

btnOps.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.val;
    if (val === '!') {
      // Factorial can be inserted only if last char is num or parClose
      if (lastCharType !== 'num' && lastCharType !== 'parClose') {
        updateMessage('Factorial must follow a number or closing parenthesis', 'red');
        return;
      }
      expression += '!';
      lastCharType = 'fact';
    } else {
      // Other operators +, -, *, /, ^
      if (!canInsertOperator()) {
        updateMessage('Operator must follow a number, factorial, or closing parenthesis', 'red');
        return;
      }
      expression += val;
      lastCharType = 'op';
    }
    messageContainer.textContent = '';
    updateExpressionInput();
  });
});

btnBackspace.onclick = () => {
  if (!expression) return;

  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // Fix lastCharType and usedDiceIndices accordingly
  // If last char was digit, remove last used dice index
  if (/\d/.test(lastChar)) {
    // Remove last used die index that matches the digit removed
    // Because dice might have repeated values, find last used die with this digit and remove
    for (let i = usedDiceIndices.length - 1; i >= 0; i--) {
      if (diceValues[usedDiceIndices[i]].toString() === lastChar) {
        usedDiceIndices.splice(i,1);
        break;
      }
    }
  }

  // Recalculate lastCharType by looking at new last char
  if (!expression) {
    lastCharType = null;
  } else {
    const c = expression.slice(-1);
    if (/\d/.test(c)) lastCharType = 'num';
    else if ('+-*/^'.includes(c)) lastCharType = 'op';
    else if (c === '!') lastCharType = 'fact';
    else if (c === '(') lastCharType = 'parOpen';
    else if (c === ')') lastCharType = 'parClose';
    else lastCharType = null;
  }
  updateExpressionInput();
  updateDiceDisplay();
  messageContainer.textContent = '';
};

btnClear.onclick = () => {
  resetExpression();
};

btnSubmit.onclick = () => {
  if (usedDiceIndices.length !== 5) {
    updateMessage('Use all five dice values exactly once.', 'red');
    return;
  }
  // Try to evaluate expression
  let val;
  try {
    val = evaluateExpression(expression);
  } catch(e) {
    updateMessage('Invalid expression.', 'red');
    return;
  }
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    updateMessage('Expression did not evaluate to a valid number.', 'red');
    return;
  }

  const diff = Math.abs(val - targetNumber);
  currentScore = diff;

  // Save data for current game
  const gameDate = new Date(startDate.getTime() + currentGameIndex * MS_PER_DAY);
  gameData[currentGameIndex].score = diff;
  gameData[currentGameIndex].expression = expression;
  gameData[currentGameIndex].date = gameDate.toISOString();

  // Update streak and Qu0x
  if (diff === 0) {
    if (!qu0xAchievedToday) {
      currentStreak++;
      qu0xAchievedToday = true;
      showQu0xAnimation();
    }
    updateMessage('Qu0x! Perfect score!', 'green');
  } else {
    updateMessage(`Score: ${diff}`, 'black');
    // Qu0x not achieved; no streak increment, no reset
  }

  updateScore();
  updateStreak();
  updateHistory();
};

// Navigation buttons

btnPrevGame.onclick = () => {
  if (currentGameIndex > 0) {
    loadGame(currentGameIndex - 1);
  }
};

btnNextGame.onclick = () => {
  if (currentGameIndex < totalGames -1) {
    loadGame(currentGameIndex + 1);
  }
};

// Evaluate expression with factorial and exponent support
function evaluateExpression(expr) {
  // Replace factorial ! with a call to factorial function
  // We'll do this by replacing n! with factorial(n)
  // Also support ^ operator for exponentiation
  // Use Function constructor to evaluate safely
  const factReplaced = expr.replace(/(\d+)!/g, 'factorial($1)');
  const safeExpr = factReplaced.replace(/\^/g, '**');
  const func = new Function('factorial', `return ${safeExpr};`);
  return func(factorial);
}

function factorial(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 0) throw new Error('Factorial only for non-negative integers');
  if (n === 0) return 1;
  let f = 1;
  for (let i=1; i<=n; i++) f *= i;
  return f;
}

// Qu0x animation popup
function showQu0xAnimation() {
  qu0xPopup.style.display = 'block';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

// On page load init
loadGame(0);
updateStreak();
updateHistory();

</script>
</body>
</html>
