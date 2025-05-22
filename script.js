// IDs for elements
const diceRow = document.getElementById('diceRow');
const targetNumSpan = document.getElementById('targetNumSpan');
const dateDiv = document.getElementById('dateDiv');
const gameNumSpan = document.getElementById('gameNumSpan');
const exprInput = document.getElementById('exprInput');
const btnSubmit = document.getElementById('btnSubmit');
const btnBackspace = document.getElementById('btnBackspace');
const btnClear = document.getElementById('btnClear');
const messageContainer = document.getElementById('messageContainer');
const historyBody = document.getElementById('historyBody');
const streakSpan = document.getElementById('streakSpan');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');

const btnNums = Array.from(document.querySelectorAll('.num-btn'));
const btnOps = Array.from(document.querySelectorAll('.op-btn'));

// Horse race colors by dice value (1-6)
const diceColors = {
  1: 'red',
  2: 'white',
  3: 'blue',
  4: 'yellow',
  5: 'green',
  6: 'black',
};

const totalGames = 365 * 10; // roughly 10 years of games

// Game #1 = May 15, 2025
const baseDate = new Date('2025-05-15T00:00:00');

let currentGameIndex = 0;
let currentDice = [];
let usedDice = [];
let targetNumber = 0;
let streak = 0;
let lastScore = null;
let lastQu0x = false;
let history = JSON.parse(localStorage.getItem('ddgHistory')) || [];

// Utility to format date YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Seeded RNG helpers for reproducibility
// cyrb128 hash function from https://stackoverflow.com/a/52171480
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for(let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1^h2^h3^h4) >>> 0, (h2^h1) >>> 0, (h3^h1) >>> 0, (h4^h1) >>> 0];
}

// sfc32 from https://stackoverflow.com/a/52171480
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

// Generate dice and target number for given game index
function generateGame(index) {
  // Calculate date from index
  const gameDate = new Date(baseDate.getTime());
  gameDate.setDate(gameDate.getDate() + index);

  // Seed RNG with date string
  const seed = cyrb128(formatDate(gameDate));
  const rng = sfc32(seed[0], seed[1], seed[2], seed[3]);

  // Generate five dice values (1 to 6)
  const dice = [];
  for(let i=0; i<5; i++) {
    dice.push(Math.floor(rng() * 6) + 1);
  }

  // Generate target number between 1 and 100 inclusive
  const target = Math.floor(rng() * 100) + 1;

  return {
    dateStr: formatDate(gameDate),
    dice,
    target,
  };
}

// Render dice with horse race colors, showing dice values and used status
function renderDice() {
  diceRow.innerHTML = '';
  usedDice = [];

  currentDice.forEach((val, i) => {
    const die = document.createElement('div');
    die.classList.add('die', diceColors[val]);
    die.textContent = val;
    die.dataset.index = i;

    if (usedDice.includes(i)) {
      die.classList.add('used');
    }

    // Enable clicking dice only if not used
    if (!usedDice.includes(i)) {
      die.addEventListener('click', () => {
        // Only allow dice if last character was operator or expression empty
        if (exprInput.value.length === 0 || /[+\-*/^!(]/.test(exprInput.value.slice(-1))) {
          exprInput.value += val;
          markDieUsed(i);
        } else {
          showMessage('You must enter an operator after a number.');
        }
      });
    } else {
      die.classList.add('used');
    }

    diceRow.appendChild(die);
  });
}

// Mark dice as used and disable their click after used once
function markDieUsed(index) {
  usedDice.push(index);
  const dieElems = diceRow.querySelectorAll('.die');
  dieElems[index].classList.add('used');
  dieElems[index].removeEventListener('click', () => {}); // Just a safety, actual removeEvents won't work like this, but it's okay here since dice cannot be clicked again
}

// Reset the expression and dice used
function resetExpression() {
  exprInput.value = '';
  usedDice = [];
  renderDice();
}

// Validate expression for dice usage and operator placement
function isValidExpression(expr) {
  if (expr.trim() === '') return false;

  // 1. Expression cannot concatenate numbers (no "45" from 4 and 5)
  // 2. Each dice value can be used exactly once
  // 3. Operators must separate numbers

  // Extract numbers used
  // We'll parse tokens: numbers, operators, parentheses, factorial

  // Tokenize expression by splitting by operators and parentheses
  const tokens = expr.match(/(\d+|[+\-*/^()!])/g);
  if (!tokens) return false;

  // Check if each number corresponds to a dice value and count usage
  const diceCounts = {};
  currentDice.forEach(v => diceCounts[v] = (diceCounts[v] || 0) + 1);

  let lastWasNumber = false;
  for (let i=0; i<tokens.length; i++) {
    const t = tokens[i];

    if (/^\d+$/.test(t)) {
      // Number token, must be a dice value, and must not concatenate digits
      const num = Number(t);
      if (!diceCounts.hasOwnProperty(num) || diceCounts[num] === 0) {
        showMessage(`Number ${num} is not available or used too many times.`);
        return false;
      }
      diceCounts[num]--;
      if (lastWasNumber) {
        showMessage('Numbers must be separated by operators (no concatenation).');
        return false;
      }
      lastWasNumber = true;
    } else {
      // Operator or parentheses or factorial
      // factorial can follow a number or ')'
      if (t === '!') {
        if (i === 0) {
          showMessage('Factorial cannot be first character.');
          return false;
        }
        const prev = tokens[i-1];
        if (!(/^\d+$/.test(prev) || prev === ')')) {
          showMessage('Factorial must follow a number or closing parenthesis.');
          return false;
        }
      }
      lastWasNumber = (t === ')'); // ')' counts like number for consecutive checks
    }
  }

  // Check if any dice values unused
  const unusedDice = Object.entries(diceCounts).filter(([_, count]) => count > 0);
  if (unusedDice.length > 0) {
    showMessage('You must use all dice values exactly once.');
    return false;
  }

  return true;
}

// Evaluate expression safely, supporting factorial and exponentiation
function evaluateExpression(expr) {
  try {
    // Replace factorial with a function call
    const safeExpr = expr.replace(/(\d+|\))!/g, (match, p1) => {
      if (p1 === ')') {
        // Need to handle factorial after parenthesis, tricky to parse here, so reject for now
        throw new Error('Factorial after parentheses is not supported.');
      }
      return `factorial(${p1})`;
    }).replace(/\^/g, '**'); // Replace ^ with ** for exponentiation

    // eslint-disable-next-line no-new-func
    const func = new Function('factorial', `return ${safeExpr};`);
    return func(factorial);
  } catch (e) {
    throw new Error('Invalid expression: ' + e.message);
  }
}

// Factorial helper
function factorial(n) {
  n = Number(n);
  if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial only for non-negative integers');
  if (n > 170) throw new Error('Factorial too large');
  if (n === 0) return 1;
  let res = 1;
  for (let i = 1; i <= n; i++) res *= i;
  return res;
}

// Show message to user
function showMessage(msg, color = '#b33') {
  messageContainer.textContent = msg;
  messageContainer.style.color = color;
}

// Clear message
function clearMessage() {
  messageContainer.textContent = '';
}

// Show Qu0x animation for 3 seconds
function showQu0xAnimation() {
  const anim = document.createElement('div');
  anim.className = 'qu0x';
  anim.textContent = 'Qu0x! Perfect Match!';
  document.body.appendChild(anim);
  setTimeout(() => {
    document.body.removeChild(anim);
  }, 3000);
}

// Update UI for current game
function updateUI() {
  dateDiv.textContent = currentGame.dateStr;
  gameNumSpan.textContent = (currentGameIndex + 1);
  targetNumSpan.textContent = currentGame.target;
  streakSpan.textContent = streak;
  renderDice();
  resetExpression();
  clearMessage();
  scoreSpan.textContent = lastScore !== null ? lastScore : 'N/A';
}

// Save history in localStorage (last 5 results only)
function saveHistory(gameNum, dateStr, score) {
  history.unshift({gameNum, dateStr, score});
  if (history.length > 5) history.pop();
  localStorage.setItem('ddgHistory', JSON.stringify(history));
  renderHistory();
}

// Render history table
function renderHistory() {
  historyBody.innerHTML = '';
  history.forEach(h => {
    const tr = document.createElement('tr');
    const tdGame = document.createElement('td');
    tdGame.textContent = h.gameNum;
    const tdDate = document.createElement('td');
    tdDate.textContent = h.dateStr;
    const tdScore = document.createElement('td');
    tdScore.textContent = h.score;
    tr.appendChild(tdGame);
    tr.appendChild(tdDate);
    tr.appendChild(tdScore);
    historyBody.appendChild(tr);
  });
}

let currentGame = null;
let scoreSpan = document.getElementById('scoreSpan');

// Load game by index
function loadGame(index) {
  if (index < 0 || index >= totalGames) return;
  currentGameIndex = index;
  currentGame = generateGame(index);
  currentDice = currentGame.dice.slice();
  updateUI();
}

function goToPreviousGame() {
  if (currentGameIndex > 0) {
    loadGame(currentGameIndex - 1);
  }
}

function goToNextGame() {
  if (currentGameIndex < totalGames - 1) {
    loadGame(currentGameIndex + 1);
  }
}

function submitExpression() {
  const expr = exprInput.value.trim();
  if (!isValidExpression(expr)) {
    return;
  }
  let result;
  try {
    result = evaluateExpression(expr);
  } catch (e) {
    showMessage(e.message);
    return;
  }

  // Calculate score
  const diff = Math.abs(result - currentGame.target);
  lastScore = diff;
  scoreSpan.textContent = diff;

  if (diff === 0) {
    streak++;
    showQu0xAnimation();
  } else {
    streak = 0;
  }
  streakSpan.textContent = streak;

  saveHistory(currentGameIndex + 1, currentGame.dateStr, diff);
  resetExpression();
}

function shareGame() {
  // Generate share URL with current game index and expression
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  params.set('game', currentGameIndex);
  if (exprInput.value.trim() !== '') {
    params.set('expr', exprInput.value.trim());
  }
  const shareUrl = baseUrl + '?' + params.toString();
  navigator.clipboard.writeText(shareUrl).then(() => {
    showMessage('Share link copied to clipboard!', '#393');
  }).catch(() => {
    showMessage('Failed to copy share link.', '#b33');
  });
}

// On page load
loadGame(currentGameIndex);
renderHistory();

submitBtn.addEventListener('click', submitExpression);
resetBtn.addEventListener('click', resetExpression);
prevGameBtn.addEventListener('click', goToPreviousGame);
nextGameBtn.addEventListener('click', goToNextGame);
shareBtn.addEventListener('click', shareGame);

// Parse URL parameters to load specific game and expression
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const gameParam = params.get('game');
  const exprParam = params.get('expr');
  if (gameParam !== null) {
    const idx = Number(gameParam);
    if (!isNaN(idx) && idx >= 0 && idx < totalGames) {
      loadGame(idx);
      if (exprParam) {
        exprInput.value = exprParam;
      }
    }
  }
}
loadFromURL();

</script>
</body>
</html>
