const diceContainer = document.getElementById('dice-container');
const targetNumberSpan = document.getElementById('target-number');
const expressionDiv = document.getElementById('expression');
const messageContainer = document.getElementById('message-container');
const scoreDisplay = document.getElementById('score');
const streakDisplay = document.getElementById('streak');
const shareLink = document.getElementById('share-link');
const historyBody = document.getElementById('history-body');
const qu0xPopup = document.getElementById('qu0x-popup');
const prevGameBtn = document.getElementById('prev-game-btn');
const nextGameBtn = document.getElementById('next-game-btn');
const backspaceBtn = document.getElementById('backspace-btn');
const clearBtn = document.getElementById('clear-btn');
const submitBtn = document.getElementById('submit-btn');
const gameNumberDiv = document.getElementById('game-number');
const dateDisplayDiv = document.getElementById('date-display');

const gameStartDate = '2023-05-15'; // Game #1
const today = new Date();
const todayStr = today.toISOString().slice(0,10);

let currentDate = todayStr;
let currentStreak = 0;
let archive = {};
let inputLocked = false;

let diceValues = [];
let usedDice = [];
let expression = '';
let target = 0;

// Map dice number to horse race colors
const diceColorMap = {
  1: 'red',
  2: 'white',
  3: 'blue',
  4: 'yellow',
  5: 'green',
  6: 'black',
};

function dateToNumber(dateStr) {
  // number of days since gameStartDate (for game number)
  const start = new Date(gameStartDate);
  const d = new Date(dateStr);
  const diff = Math.floor((d - start) / (1000 * 60 * 60 * 24));
  return diff + 1; // game 1 is May 15
}

function getDateNDaysBefore(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0,10);
}

function getDateNDaysAfter(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

function saveArchive() {
  localStorage.setItem('qu0x-archive', JSON.stringify(archive));
}

function loadArchive() {
  const arch = localStorage.getItem('qu0x-archive');
  if (arch) archive = JSON.parse(arch);
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
  inputLocked = false;
  updateDiceOpacity();
  messageContainer.textContent = '';
}

function updateDiceOpacity() {
  // Dice fade when used
  const diceEls = document.querySelectorAll('.die');
  diceEls.forEach((die, i) => {
    die.style.opacity = usedDice.includes(i) ? '0.3' : '1';
    die.style.pointerEvents = usedDice.includes(i) ? 'none' : 'auto';
  });
}

function rollDice(seed) {
  // Simple deterministic PRNG using seed to generate dice rolls
  // Returns array of 5 dice numbers (1-6)
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
  // Convert YYYY-MM-DD to number seed
  return dateStr.split('-').join('');
}

function generateTarget(seed, dice) {
  // Target: 1 to 100, deterministic using seed and dice sum
  // Use seed + sum to generate a number 1-100
  const diceSum = dice.reduce((a,b) => a + b, 0);
  let x = seed + diceSum;
  x = (x * 12345 + 67890) % 100;
  return x === 0 ? 100 : x;
}

function createDiceElements() {
  diceContainer.innerHTML = '';
  diceValues.forEach((val, i) => {
    const die = document.createElement('div');
    die.classList.add('die');
    die.classList.add(diceColorMap[val]);
    die.textContent = val;
    die.dataset.index = i;
    die.title = 'Click to use this die value';
    die.style.opacity = usedDice.includes(i) ? '0.3' : '1';
    die.style.pointerEvents = usedDice.includes(i) ? 'none' : 'auto';

    die.onclick = () => {
      if (inputLocked) return;
      if (usedDice.includes(i)) return;
      expression += val.toString();
      expressionDiv.textContent = expression;
      usedDice.push(i);
      die.style.opacity = '0.3';
      die.style.pointerEvents = 'none';
    };

    diceContainer.appendChild(die);
  });
}

function updateExpressionDisplay() {
  expressionDiv.textContent = expression;
}

function addOperator(op) {
  if (inputLocked) return;
  // Disallow consecutive operators except for ( and )
  if (expression === '' && (op === '+' || op === '-' || op === '*' || op === '/' || op === '^' || op === '!')) {
    messageContainer.textContent = 'Cannot start expression with operator.';
    return;
  }
  if (op === '!') {
    // factorial can only follow a number or closing parenthesis
    const lastChar = expression.slice(-1);
    if (!lastChar || (!/\d/.test(lastChar) && lastChar !== ')')) {
      messageContainer.textContent = 'Factorial must follow a number or closing parenthesis.';
      return;
    }
  }
  expression += op;
  updateExpressionDisplay();
  messageContainer.textContent = '';
}

function backspace() {
  if (inputLocked) return;
  if (expression.length === 0) return;

  const lastChar = expression.slice(-1);
  expression = expression.slice(0, -1);

  // If last char was a dice value, free that die
  if (/\d/.test(lastChar)) {
    // Find dice index of lastChar that is used
    // This is tricky since dice are identical numbers
    // We'll remove the most recently used die of that value
    for (let i = usedDice.length - 1; i >= 0; i--) {
      const dieIndex = usedDice[i];
      if (diceValues[dieIndex].toString() === lastChar) {
        usedDice.splice(i, 1);
        break;
      }
    }
  }

  updateExpressionDisplay();
  updateDiceOpacity();
  messageContainer.textContent = '';
}

function clearInput() {
  if (inputLocked) return;
  resetInput();
}

function factorial(n) {
  if (n < 0) return NaN;
  if (n > 20) return Infinity; // limit to prevent overflow
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

function evaluateExpression(expr) {
  // Custom evaluation supporting factorial and ^ (exponent)
  // Disallow eval for security, parse manually with Function

  // Replace ^ with ** for exponentiation
  let safeExpr = expr.replace(/\^/g, '**');

  // Replace factorial occurrences (number!) with factorial(number)
  // Use regex to find numbers followed by !
  // Support factorial after parentheses as well

  safeExpr = safeExpr.replace(/(\d+)!/g, (_, num) => {
    return `factorial(${num})`;
  });

  safeExpr = safeExpr.replace(/\(([^()]+)\)!/g, (_, inner) => {
    return `factorial((${inner}))`;
  });

  // Evaluate safely
  try {
    // eslint-disable-next-line no-new-func
    const func = new Function('factorial', `return ${safeExpr};`);
    const val = func(factorial);
    return val;
  } catch {
    return NaN;
  }
}

function submitAnswer() {
  if (inputLocked) return;
  if (expression === '') {
    messageContainer.textContent = 'Please enter an expression.';
    return;
  }
  // Check if all dice used exactly once
  if (usedDice.length !== diceValues.length) {
    messageContainer.textContent = `Use all 5 dice exactly once. Used ${usedDice.length} of 5.`;
    return;
  }

  const val = evaluateExpression(expression);
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    messageContainer.textContent = 'Invalid expression or result.';
    return;
  }

  const diff = Math.abs(val - target);
  const perfect = diff === 0;
  let score = diff;

  // Update streak
  if (perfect) currentStreak++;
  else currentStreak = 0;

  // Save archive for current date
  const gameNum = dateToNumber(currentDate);
  archive[currentDate] = { score, expression, val };

  saveArchive();
  saveStreak();

  messageContainer.textContent = perfect
    ? `Perfect! Your answer equals the target ${target}.`
    : `Your answer is ${val.toFixed(2)}, difference from target ${diff.toFixed(2)}.`;

  scoreDisplay.textContent = `Score: ${score.toFixed(2)}`;
  streakDisplay.textContent = `Current Streak: ${currentStreak}`;

  inputLocked = true;

  if (perfect) {
    showQu0xPopup();
  }

  updateShareLink();
  updateHistory();
}

function showQu0xPopup() {
  qu0xPopup.style.display = 'block';
  setTimeout(() => {
    qu0xPopup.style.display = 'none';
  }, 3000);
}

function updateShareLink() {
  // Share link with date and expression
  const baseUrl = location.origin + location.pathname;
  const params = new URLSearchParams();
  params.set('date', currentDate);
  if (archive[currentDate]) params.set('expr', archive[currentDate].expression);
  shareLink.href = `${baseUrl}?${params.toString()}`;
  shareLink.textContent = 'Share this game';
}

function updateHistory() {
  // Show last 5 games including current
  historyBody.innerHTML = '';
  const dates = Object.keys(archive).sort((a,b) => new Date(b) - new Date(a));
  const lastFive = dates.slice(0,5).sort((a,b) => new Date(a) - new Date(b));
  lastFive.forEach(date => {
    const data = archive[date];
    const tr = document.createElement('tr');

    const gameNum = dateToNumber(date);
    const tdNum = document.createElement('td');
    tdNum.textContent = gameNum;
    const tdDate = document.createElement('td');
    tdDate.textContent = date;
    const tdScore = document.createElement('td');
    tdScore.textContent = data.score.toFixed(2);

    tr.appendChild(tdNum);
    tr.appendChild(tdDate);
    tr.appendChild(tdScore);
    historyBody.appendChild(tr);
  });
}

function loadGame(dateStr) {
  currentDate = dateStr;

  // Prevent loading future dates
  if (new Date(currentDate) > new Date(todayStr)) {
    currentDate = todayStr;
  }

  // Prevent dates before gameStartDate
  if (new Date(currentDate) < new Date(gameStartDate)) {
    currentDate = gameStartDate;
  }

  const seedNum = parseInt(getSeedFromDate(currentDate), 10);
  diceValues = rollDice(seedNum);
  target = generateTarget(seedNum, diceValues);

  resetInput();
  createDiceElements();
  targetNumberSpan.textContent = target;

  // Show game number and date
  const gameNum = dateToNumber(currentDate);
  gameNumberDiv.textContent = `Game #${gameNum}`;
  dateDisplayDiv.textContent = currentDate;

  // Load archive answer if any
  if (archive[currentDate]) {
    const ans = archive[currentDate];
    expression = ans.expression;
    expressionDiv.textContent = expression;
    inputLocked = true;
    messageContainer.textContent = `You scored ${ans.score.toFixed(2)} on this game.`;
    scoreDisplay.textContent = `Score: ${ans.score.toFixed(2)}`;
  } else {
    scoreDisplay.textContent = '';
    messageContainer.textContent = '';
    inputLocked = false;
  }

  updateShareLink();
  updateHistory();
  updateDiceOpacity();
}

function init() {
  loadArchive();
  loadStreak();

  // Load date from URL param if exists
  const params = new URLSearchParams(window.location.search);
  const urlDate = params.get('date');
  if (urlDate) currentDate = urlDate;

  loadGame(currentDate);

  // Event listeners for operator buttons
  document.querySelectorAll('#buttons-container .op').forEach(btn => {
    btn.onclick = () => addOperator(btn.dataset.op);
  });

  backspaceBtn.onclick = backspace;
  clearBtn.onclick = clearInput;
  submitBtn.onclick = submitAnswer;

  prevGameBtn.onclick = () => {
    const prevDate = getDateNDaysBefore(currentDate, 1);
    loadGame(prevDate);
  };
  nextGameBtn.onclick = () => {
    const nextDate = getDateNDaysAfter(currentDate, 1);
    loadGame(nextDate);
  };
}

init();
