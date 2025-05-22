const diceContainer = document.getElementById('dice');
const targetContainer = document.getElementById('target');
const expressionContainer = document.getElementById('expression');
const resultContainer = document.getElementById('result');
const messageContainer = document.getElementById('message');
const gameNumberContainer = document.getElementById('game-number');
const streakContainer = document.getElementById('streak');
const historyTable = document.getElementById('history-body');
const operators = ['+', '-', '×', '÷', '^', '!', '(', ')'];

let expressionTokens = [];
let usedDice = [];
let gameEnded = false;

const horseColors = {
  1: { background: 'red', color: 'white' },
  2: { background: 'white', color: 'black' },
  3: { background: 'blue', color: 'white' },
  4: { background: 'yellow', color: 'black' },
  5: { background: 'green', color: 'white' },
  6: { background: 'black', color: 'yellow' }
};

// Game Logic
function getTodayGameNumber() {
  const start = new Date('2025-05-15T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 1;
}

function getGameDate(gameNum) {
  const start = new Date('2025-05-15T00:00:00');
  const date = new Date(start);
  date.setDate(start.getDate() + gameNum - 1);
  return date;
}

function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededShuffle(seed, array) {
  let result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seedRandom(seed + i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateGameData(gameNumber) {
  let seed = gameNumber;
  while (true) {
    const dice = [];
    for (let i = 0; i < 5; i++) {
      dice.push(1 + Math.floor(seedRandom(seed + i) * 6));
    }
    const maxTarget = 100;
    for (let t = 0; t < 1000; t++) {
      const target = 1 + Math.floor(seedRandom(seed + 100 + t) * maxTarget);
      if (isSolvable(dice, target)) {
        return { dice, target };
      }
    }
    seed++; // Try a new seed if unsolvable
  }
}

// Expression Evaluation
function evaluateExpression(tokens) {
  try {
    let expr = tokens.join('')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/(\d+)!/g, (_, n) => {
        if (n < 0 || n % 1 !== 0) throw 'Invalid factorial';
        let f = 1;
        for (let i = 1; i <= n; i++) f *= i;
        return f;
      });
    let result = Function('"use strict";return (' + expr + ')')();
    return Math.round(result);
  } catch {
    return null;
  }
}

function isSolvable(dice, target) {
  const ops = ['+', '-', '*', '/', '^'];
  const perms = permuteDice(dice);
  for (const p of perms) {
    const opCombos = generateOpCombos(p.length - 1, ops);
    for (const opset of opCombos) {
      const expr = [];
      for (let i = 0; i < p.length; i++) {
        expr.push(p[i]);
        if (i < opset.length) expr.push(opset[i]);
      }
      const res = evaluateExpression(expr.map(e => {
        if (e === '*') return '×';
        if (e === '/') return '÷';
        return e;
      }));
      if (res === target) return true;
    }
  }
  return false;
}

function permuteDice(arr) {
  if (arr.length === 0) return [[]];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of permuteDice(rest)) {
      result.push([arr[i]].concat(perm));
    }
  }
  return result;
}

function generateOpCombos(length, ops) {
  if (length === 0) return [[]];
  const result = [];
  const rest = generateOpCombos(length - 1, ops);
  for (const op of ops) {
    for (const r of rest) {
      result.push([op, ...r]);
    }
  }
  return result;
}

// Rendering
function renderGame(gameNumber) {
  const todayGame = getTodayGameNumber();
  if (gameNumber > todayGame) {
    alert("This game is not available yet.");
    return;
  }

  gameEnded = false;
  expressionTokens = [];
  usedDice = [];
  const gameData = generateGameData(gameNumber);
  const { dice, target } = gameData;

  gameNumberContainer.textContent = `Game #${gameNumber}`;
  targetContainer.textContent = `Target: ${target}`;
  diceContainer.innerHTML = '';
  expressionContainer.textContent = '';
  resultContainer.textContent = '';
  messageContainer.textContent = '';

  dice.forEach((value, i) => {
    const die = document.createElement('div');
    die.classList.add('die');
    die.textContent = value;
    die.style.backgroundColor = horseColors[value].background;
    die.style.color = horseColors[value].color;
    die.addEventListener('click', () => {
      if (!die.classList.contains('used') && !gameEnded) {
        expressionTokens.push(value.toString());
        die.classList.add('used');
        updateExpressionDisplay();
      }
    });
    diceContainer.appendChild(die);
  });

  updateStreak();
  updateHistory();
}

function updateExpressionDisplay() {
  expressionContainer.textContent = expressionTokens.join(' ');
}

function updateStreak() {
  const streak = Number(localStorage.getItem('qu0xStreak') || 0);
  streakContainer.textContent = `Current Qu0x Streak: ${streak}`;
}

function updateHistory() {
  const history = JSON.parse(localStorage.getItem('qu0xHistory') || '[]');
  historyTable.innerHTML = '';
  const last5 = history.slice(-5).reverse();
  for (const h of last5) {
    const tr = document.createElement('tr');
    const d = new Date(h.date);
    tr.innerHTML = `<td>${d.toDateString()}</td><td>${h.score}</td>`;
    historyTable.appendChild(tr);
  }
}

document.querySelectorAll('.op').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!gameEnded) {
      expressionTokens.push(btn.textContent);
      updateExpressionDisplay();
    }
  });
});

document.getElementById('backspace').addEventListener('click', () => {
  if (expressionTokens.length > 0) {
    const last = expressionTokens.pop();
    if (!isNaN(last)) {
      const dice = document.querySelectorAll('.die');
      for (let die of dice) {
        if (die.textContent == last && die.classList.contains('used')) {
          die.classList.remove('used');
          break;
        }
      }
    }
    updateExpressionDisplay();
  }
});

document.getElementById('clear').addEventListener('click', () => {
  expressionTokens = [];
  document.querySelectorAll('.die').forEach(die => die.classList.remove('used'));
  updateExpressionDisplay();
});

document.getElementById('submit').addEventListener('click', () => {
  const gameNumber = Number(gameNumberContainer.textContent.split('#')[1]);
  const { target } = generateGameData(gameNumber);
  const result = evaluateExpression(expressionTokens);
  resultContainer.textContent = `Your result: ${result}`;
  if (result === target) {
    messageContainer.textContent = 'Qu0x!';
    messageContainer.style.fontSize = '2em';
    messageContainer.style.color = 'green';
    gameEnded = true;

    let streak = Number(localStorage.getItem('qu0xStreak') || 0);
    streak++;
    localStorage.setItem('qu0xStreak', streak);
    updateStreak();

    const history = JSON.parse(localStorage.getItem('qu0xHistory') || '[]');
    history.push({ date: new Date(), score: 0 });
    localStorage.setItem('qu0xHistory', JSON.stringify(history));
    updateHistory();
  } else {
    messageContainer.textContent = `Off by ${Math.abs(target - result)}`;
    messageContainer.style.color = 'red';

    const history = JSON.parse(localStorage.getItem('qu0xHistory') || '[]');
    history.push({ date: new Date(), score: Math.abs(target - result) });
    localStorage.setItem('qu0xHistory', JSON.stringify(history));
    localStorage.setItem('qu0xStreak', 0); // reset streak
    updateStreak();
    updateHistory();
  }
});

let currentGame = getTodayGameNumber();
document.getElementById('prev').addEventListener('click', () => {
  if (currentGame > 1) renderGame(--currentGame);
});
document.getElementById('next').addEventListener('click', () => {
  if (currentGame < getTodayGameNumber()) renderGame(++currentGame);
});

// Initial Game
renderGame(currentGame);
