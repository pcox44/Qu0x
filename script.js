// Daily Dice Game JS

// Constants
const baseDate = new Date(2025, 4, 15); // May 15, 2025 (month is 0-indexed)
const totalGames = 365 * 10; // roughly 10 years of games

// Elements
const dateDiv = document.getElementById('dateDiv');
const gameNumSpan = document.getElementById('gameNumSpan');
const targetNumSpan = document.getElementById('targetNumSpan');
const diceRow = document.getElementById('diceRow');
const exprInput = document.getElementById('exprInput');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const prevGameBtn = document.getElementById('prevGameBtn');
const nextGameBtn = document.getElementById('nextGameBtn');
const streakSpan = document.getElementById('streakSpan');
const messageContainer = document.getElementById('messageContainer');
const historyBody = document.getElementById('historyBody');
const backspaceBtn = document.getElementById('backspaceBtn');
const clearBtn = document.getElementById('clearBtn');
const opButtons = document.querySelectorAll('.opBtn');
const scoreSpan = document.getElementById('scoreSpan');

const diceColors = {
  1: 'red',
  2: 'white',
  3: 'blue',
  4: 'red',
  5: 'white',
  6: 'blue',
};

let currentGameIndex = 0;
let currentGame = null;
let currentDice = [];
let usedDiceIndices = [];
let streak = 0;
let lastScore = null;
let history = JSON.parse(localStorage.getItem('ddgHistory')) || [];

// Utility Functions

function dateToGameNum(date) {
  const diffMs = date - baseDate;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function gameNumToDate(num) {
  let d = new Date(baseDate);
  d.setDate(baseDate.getDate() + (num - 1));
  return d;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
}

function generateDice(gameNum) {
  // Use a seeded random based on gameNum to generate dice values 1-6
  const seed = xmur3('ddg' + gameNum);
  const rand = sfc32(seed(), seed(), seed(), seed());
  let dice = [];
  for (let i=0; i<5; i++) {
    // Generate number 1-6
    dice.push(1 + Math.floor(rand()*6));
  }
  return dice;
}

// Seeded PRNG helpers
function xmur3(str) {
  for(var i=0, h=1779033703 ^ str.length; i<str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
      h = (h << 13) | (h >>> 19);
  return function() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
  }
}

function sfc32(a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
    let t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

function generateTarget(dice) {
  // Target between 1 and 100 (inclusive)
  // Use sum of dice * random fraction between 1 and ~3
  const sum = dice.reduce((a,b)=>a+b,0);
  const randFactor = 1 + Math.random()*2; // 1 to 3
  return Math.max(1, Math.min(100, Math.round(sum * randFactor)));
}

// UI Functions

function renderDice() {
  diceRow.innerHTML = '';
  currentDice.forEach((val, i) => {
    const die = document.createElement('div');
    die.textContent = val;
    die.classList.add('die', diceColors[val]);
    if (usedDiceIndices.includes(i)) {
      die.classList.add('used');
    }
    die.dataset.index = i;
    die.title = 'Click to add this number';
    die.addEventListener('click', () => {
      if (usedDiceIndices.includes(i)) return;
      addToExpression(val.toString(), i);
    });
    diceRow.appendChild(die);
  });
}

function updateUI() {
  dateDiv.textContent = currentGame.dateStr;
  gameNumSpan.textContent = currentGame.gameNum;
  targetNumSpan.textContent = currentGame.target;
  scoreSpan.textContent = lastScore === null ? 'N/A' : lastScore;
  streakSpan.textContent = streak;
  renderDice();
}

function showMessage(msg, color = '#b33') {
  messageContainer.textContent = msg;
  messageContainer.style.color = color;
  setTimeout(() => {
    if (messageContainer.textContent === msg) {
      messageContainer.textContent = '';
    }
  }, 3000);
}

function addToExpression(val, diceIndex = null) {
  // Only allow concatenation if operator was last char (no concat numbers)
  const expr = exprInput.value;
  const lastChar = expr.slice(-1);
  if (diceIndex !== null) {
    // If last char is a digit, can't add a new digit without operator
    if (/\d/.test(lastChar)) {
      showMessage('Must add an operator before another number');
      return;
    }
    // Mark dice as used
    usedDiceIndices.push(diceIndex);
  }
  exprInput.value += val;
  updateDiceUsage();
}

function updateDiceUsage() {
  renderDice();
}

function canAddOperator() {
  const expr = exprInput.value;
  if (expr.length === 0) return false;
  const lastChar = expr.slice(-1);
  return /[\d)!]/.test(lastChar);
}

function canAddNumber() {
  const expr = exprInput.value;
  if (expr.length === 0) return true;
  const lastChar = expr.slice(-1);
  return /[+\-*/^()]/.test(lastChar);
}

function addOperator(op) {
  if (!canAddOperator()) {
    showMessage('Cannot add operator here');
    return;
  }
  exprInput.value += op;
}

function addParen(paren) {
  const expr = exprInput.value;
  if (paren === '(') {
    // can add '(' at start or after operator or '('
    if (expr.length === 0 || /[+\-*/^(\[]$/.test(expr)) {
      exprInput.value += paren;
    } else {
      showMessage("Can't add '(' here");
    }
  } else if (paren === ')') {
    // can add ')' only if there's unmatched '('
    const openCount = (expr.match(/\(/g) || []).length;
    const closeCount = (expr.match(/\)/g) || []).length;
    if (openCount > closeCount && /[\d)!]$/.test(expr)) {
      exprInput.value += paren;
    } else {
      showMessage("Can't add ')' here");
    }
  }
}

function addFactorial() {
  const expr = exprInput.value;
  if (expr.length === 0) {
    showMessage("Can't add factorial here");
    return;
  }
  const lastChar = expr.slice(-1);
  if (/[\d)]/.test(lastChar)) {
    exprInput.value += '!';
  } else {
    showMessage("Factorial must follow a number or ')'");
  }
}

function backspace() {
  const expr = exprInput.value;
  if (expr.length === 0) return;
  // Remove last char
  const lastChar = expr.slice(-1);
  exprInput.value = expr.slice(0, -1);

  // If last char was a digit, find which dice it corresponds to and mark it unused
  if (/\d/.test(lastChar)) {
    // Remove last used dice index
    usedDiceIndices.pop();
  }
  updateDiceUsage();
}

function clearExpression() {
  exprInput.value = '';
  usedDiceIndices = [];
  updateDiceUsage();
}

function resetExpression() {
  clearExpression();
  showMessage('');
}

function isValidExpression(expr) {
  if (expr.length === 0) {
    showMessage('Expression cannot be empty');
    return false;
  }

  // Check if all dice used exactly once
  if (usedDiceIndices.length !== currentDice.length) {
    showMessage('Use all dice values exactly once');
    return false;
  }

  // Check no concat numbers (no two digits together without operator)
  if (/\d{2,}/.test(expr)) {
    showMessage('No concatenation of digits allowed');
    return false;
  }

  // Check parentheses balanced
  let balance = 0;
  for (let ch of expr) {
    if (ch === '(') balance++;
    else if (ch === ')') balance--;
    if (balance < 0) break;
  }
  if (balance !== 0) {
    showMessage('Parentheses are not balanced');
    return false;
  }

  // Must end with number or ')', not operator
  if (!/[\d)]$/.test(expr)) {
    showMessage('Expression cannot end with operator');
    return false;
  }

  return true;
}

// Evaluate expression safely with factorial and exponentiation

function factorial(n) {
  if (n < 0) throw new Error('Factorial of negative number');
  if (n > 20) throw new Error('Factorial too large');
  if (n === 0 || n === 1) return 1;
  let f = 1;
  for (let i=2; i<=n; i++) f *= i;
  return f;
}

function evaluateExpression(expr) {
  // Replace factorials with function calls
  // Replace ^ with **
  // We'll parse the expression safely by replacing operators and using Function constructor

  // Validate characters (digits, operators, parentheses only)
  if (!/^[-+*/^!()\d\s]+$/.test(expr)) {
    throw new Error('Invalid characters in expression');
  }

  // Replace ^ with **
  let safeExpr = expr.replace(/\^/g, '**');

  // Replace factorial: find numbers or parenthesis followed by !
  // We'll replace with a function call fac(...)
  // Use regex to find these patterns repeatedly
  while (true) {
    const match = safeExpr.match(/(\d+|\([^()]+\))!/);
    if (!match) break;
    const sub = match[1];
    safeExpr = safeExpr.replace(match[0], `fac(${sub})`);
  }

  // Now define fac in the evaluation context
  // Use new Function to evaluate safely
  const func = new Function('fac', `return ${safeExpr};`);
  return func(factorial);
}

// Submit answer

function submitAnswer() {
  const expr = exprInput.value.trim();
  if (!isValidExpression(expr)) return;

  let value;
  try {
    value = evaluateExpression(expr);
  } catch(e) {
    showMessage('Error evaluating expression: ' + e.message);
    return;
  }

  // Check if value is a number
  if (typeof value !== 'number' || isNaN(value)) {
    showMessage('Expression did not evaluate to a number');
    return;
  }

  // Check for integers only (or allow decimals?)
  // For now allow decimals

  // Calculate score
  const diff = Math.abs(value - currentGame.target);

  // Update streak and archive
  lastScore = diff;
  if (diff === 0) {
    streak++;
    showMessage('Perfect! 🎉', '#4a4');
    showQu0x();
  } else {
    streak = 0;
    showMessage(`Score: ${diff}`);
  }

  saveProgress(diff);

  // Add to archive
  archive.unshift({date: currentGame.dateStr, dice: [...currentDice], target: currentGame.target, expression: expr, score: diff});
  if (archive.length > 5) archive.pop();
  renderArchive();

  // Clear expression and used dice
  clearExpression();
}

function saveProgress(score) {
  const data = {
    lastDate: currentGame.dateStr,
    lastScore: score,
    streak: streak,
    archive: archive,
  };
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function loadProgress() {
  const data = localStorage.getItem(storageKey);
  if (!data) return null;
  try {
    const obj = JSON.parse(data);
    if (obj.lastDate) {
      lastScore = obj.lastScore || null;
      streak = obj.streak || 0;
      archive = obj.archive || [];
      return obj.lastDate;
    }
  } catch(e) {
    return null;
  }
  return null;
}

function renderArchive() {
  archiveDiv.innerHTML = '';
  archive.forEach(item => {
    const div = document.createElement('div');
    div.className = 'archive-item';
    div.textContent = `${item.date} | Dice: ${item.dice.join(', ')} | Target: ${item.target} | Expr: ${item.expression} | Score: ${item.score}`;
    archiveDiv.appendChild(div);
  });
}

function showQu0x() {
  qu0xDiv.style.display = 'block';
  setTimeout(() => {
    qu0xDiv.style.display = 'none';
  }, 3000);
}

// Initialize

function initGame() {
  // Load last progress if any
  const lastDateStr = loadProgress();

  // Set current date to today in Eastern time
  let now = new Date();
  let offset = now.getTimezoneOffset(); // in minutes
  let estOffset = 5 * 60; // EST is UTC-5
  now = new Date(now.getTime() + (offset + estOffset) * 60000);

  // If lastDateStr exists, parse it
  let dateForGame;
  if (lastDateStr) {
    dateForGame = new Date(lastDateStr);
  } else {
    dateForGame = now;
  }

  const gameNum = dateToGameNum(dateForGame);

  currentDice = generateDice(gameNum);
  const target = generateTarget(currentDice);

  currentGame = {
    dateStr: formatDate(dateForGame),
    gameNum: gameNum,
    dice: currentDice,
    target: target,
  };

  usedDiceIndices = [];
  updateUI();
  clearExpression();
  renderArchive();
}

window.onload = () => {
  initGame();

  document.getElementById('btn-submit').addEventListener('click', submitAnswer);
  document.getElementById('btn-clear').addEventListener('click', clearExpression);
  document.getElementById('btn-backspace').addEventListener('click', backspace);

  // Operator buttons
  ['+', '-', '*', '/', '^'].forEach(op => {
    document.getElementById('btn-op-' + op).addEventListener('click', () => addOperator(op));
  });

  // Parentheses
  document.getElementById('btn-paren-open').addEventListener('click', () => addParen('('));
  document.getElementById('btn-paren-close').addEventListener('click', () => addParen(')'));

  // Factorial
  document.getElementById('btn-factorial').addEventListener('click', addFactorial);
};

})();  
</script>

</body>
</html>
