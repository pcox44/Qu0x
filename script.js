const colors = {
  1: { background: 'red', color: 'white' },
  2: { background: 'white', color: 'black' },
  3: { background: 'blue', color: 'white' },
  4: { background: 'yellow', color: 'black' },
  5: { background: 'green', color: 'white' },
  6: { background: 'black', color: 'yellow' },
};

let dice = [], target = 0, expression = '', usedDice = [];
let gameNumber = 1;
let todayGameNumber = calculateGameNumber(new Date());
let totalQu0x = JSON.parse(localStorage.getItem('totalQu0x') || '0');
let archive = JSON.parse(localStorage.getItem('archive') || '[]');

function calculateGameNumber(date) {
  return Math.floor((date - new Date('2025-05-15')) / (1000 * 60 * 60 * 24)) + 1;
}

function getDateFromGameNumber(n) {
  let d = new Date('2025-05-15');
  d.setDate(d.getDate() + (n - 1));
  return d.toISOString().split('T')[0];
}

function seedRandom(seed) {
  return Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000);
}

function seededRandomDice(seed) {
  let dice = [];
  for (let i = 0; i < 5; i++) {
    seed += i;
    dice.push(Math.floor(seedRandom(seed) * 6) + 1);
  }
  return dice;
}

function seededTarget(seed) {
  return Math.floor(seedRandom(seed + 100) * 100) + 1;
}

function loadGame(n) {
  gameNumber = n;
  const date = getDateFromGameNumber(n);
  const seed = parseInt(date.replace(/-/g, ''));
  dice = seededRandomDice(seed);
  target = seededTarget(seed);
  usedDice = [];
  expression = '';
  updateDisplay();
}

function updateDisplay() {
  const container = document.getElementById('dice-container');
  container.innerHTML = '';
  dice.forEach((val, i) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.innerText = val;
    die.style.backgroundColor = colors[val].background;
    die.style.color = colors[val].color;
    die.style.opacity = usedDice.includes(i) ? 0.3 : 1;
    die.onclick = () => {
      if (!usedDice.includes(i)) {
        usedDice.push(i);
        expression += val;
        updateDisplay();
        updateExpressionDisplay();
      }
    };
    container.appendChild(die);
  });

  document.getElementById('target-box').innerText = `Target: ${target}`;
  document.getElementById('expression-box').value = expression;
  document.getElementById('game-number').innerText = `Game #${gameNumber}`;
  document.getElementById('date-display').innerText = getDateFromGameNumber(gameNumber);
  document.getElementById('total-qu0x').innerText = `Total Qu0x: ${totalQu0x}`;

  const archiveBox = document.getElementById('archive');
  archiveBox.innerHTML = '<h3>Last 5 Results</h3>';
  archive.slice(-5).forEach(entry => {
    const div = document.createElement('div');
    div.innerText = `#${entry.game} → ${entry.score}`;
    archiveBox.appendChild(div);
  });
}

function updateExpressionDisplay() {
  try {
    const val = eval(expression.replace(/(\d+)!/g, (_, n) => {
      let f = 1;
      for (let i = 1; i <= +n; i++) f *= i;
      return f;
    }));
    document.getElementById('expression-output').innerText = isNaN(val) ? '' : val;
  } catch {
    document.getElementById('expression-output').innerText = '';
  }
}

function clearExpression() {
  expression = '';
  usedDice = [];
  updateDisplay();
  updateExpressionDisplay();
}

function backspace() {
  if (expression.length > 0) {
    const last = expression[expression.length - 1];
    expression = expression.slice(0, -1);
    if (!isNaN(last)) {
      for (let i = usedDice.length - 1; i >= 0; i--) {
        if (dice[usedDice[i]] == last) {
          usedDice.splice(i, 1);
          break;
        }
      }
    }
    updateDisplay();
    updateExpressionDisplay();
  }
}

function submit() {
  if (usedDice.length !== 5) return alert('Use all 5 dice exactly once!');
  try {
    const result = eval(expression.replace(/(\d+)!/g, (_, n) => {
      let f = 1;
      for (let i = 1; i <= +n; i++) f *= i;
      return f;
    }));
    const score = Math.abs(target - result);
    archive = archive.filter(e => e.game !== gameNumber);
    archive.push({ game: gameNumber, score });
    localStorage.setItem('archive', JSON.stringify(archive));
    if (score === 0) {
      totalQu0x++;
      localStorage.setItem('totalQu0x', JSON.stringify(totalQu0x));
      showQu0x();
    }
    updateDisplay();
  } catch {
    alert('Invalid expression');
  }
}

function showQu0x() {
  const el = document.createElement('div');
  el.className = 'qu0x-popup';
  el.innerText = 'Qu0x!';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function nextGame() {
  if (gameNumber < todayGameNumber) loadGame(gameNumber + 1);
}

function prevGame() {
  if (gameNumber > 1) loadGame(gameNumber - 1);
}

window.onload = () => {
  loadGame(todayGameNumber);
  document.getElementById('submit').onclick = submit;
  document.getElementById('clear').onclick = clearExpression;
  document.getElementById('backspace').onclick = backspace;
  document.getElementById('prev').onclick = prevGame;
  document.getElementById('next').onclick = nextGame;
  document.querySelectorAll('.btn').forEach(btn => {
    btn.onclick = () => {
      expression += btn.innerText === '−' ? '-' : btn.innerText;
      updateExpressionDisplay();
      document.getElementById('expression-box').value = expression;
    };
  });
};
