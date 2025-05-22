const colors = {
  1: { background: 'red', color: 'white' },
  2: { background: 'white', color: 'black' },
  3: { background: 'blue', color: 'white' },
  4: { background: 'yellow', color: 'black' },
  5: { background: 'green', color: 'white' },
  6: { background: 'black', color: 'yellow' },
};

let dice = [];
let target = 0;
let expression = '';
let usedDice = [];
let gameNumber = 1;
let todayGameNumber = calculateGameNumber(new Date());
let totalQu0x = JSON.parse(localStorage.getItem('totalQu0x') || '0');
let archive = JSON.parse(localStorage.getItem('archive') || '[]');

function calculateGameNumber(date) {
  const start = new Date('2025-05-15');
  return Math.floor((date - start) / (1000 * 60 * 60 * 24)) + 1;
}

function getDateFromGameNumber(n) {
  const start = new Date('2025-05-15');
  start.setDate(start.getDate() + (n - 1));
  return start.toISOString().split('T')[0];
}

function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededRandomDice(seed) {
  let values = [];
  for (let i = 0; i < 5; i++) {
    seed = seedRandom(seed + i);
    values.push(Math.floor(seed * 6) + 1);
  }
  return values;
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
  const diceContainer = document.getElementById('dice-container');
  diceContainer.innerHTML = '';
  dice.forEach((value, i) => {
    const die = document.createElement('div');
    die.className = 'die';
    die.innerText = value;
    die.style.backgroundColor = colors[value].background;
    die.style.color = colors[value].color;
    if (usedDice.includes(i)) die.style.opacity = 0.3;
    die.onclick = () => {
      if (!usedDice.includes(i)) {
        expression += value;
        usedDice.push(i);
        updateDisplay();
        updateExpressionDisplay();
      }
    };
    diceContainer.appendChild(die);
  });

  document.getElementById('expression-box').value = expression;
  document.getElementById('target-box').innerText = `Target: ${target}`;
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
  const output = document.getElementById('expression-output');
  try {
    if (expression.includes('!')) {
      const replaced = expression.replace(/(\d+)!/g, (_, n) => {
        if (n < 0 || n % 1 !== 0) throw 'Invalid factorial';
        let f = 1;
        for (let i = 1; i <= +n; i++) f *= i;
        return f;
      });
      output.innerText = eval(replaced);
    } else {
      output.innerText = eval(expression);
    }
  } catch {
    output.innerText = '';
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
  if (usedDice.length !== 5) {
    alert('Use all 5 dice!');
    return;
  }

  let val;
  try {
    let tempExpr = expression.replace(/(\d+)!/g, (_, n) => {
      if (n < 0 || n % 1 !== 0) throw 'Invalid factorial';
      let f = 1;
      for (let i = 1; i <= +n; i++) f *= i;
      return f;
    });
    val = eval(tempExpr);
  } catch {
    alert('Invalid expression');
    return;
  }

  const diff = Math.abs(target - val);
  archive = archive.filter(entry => entry.game !== gameNumber);
  archive.push({ game: gameNumber, score: diff });
  localStorage.setItem('archive', JSON.stringify(archive));

  if (diff === 0) {
    totalQu0x++;
    localStorage.setItem('totalQu0x', JSON.stringify(totalQu0x));
    showQu0x();
  }

  updateDisplay();
}

function showQu0x() {
  const q = document.createElement('div');
  q.innerText = 'Qu0x!';
  q.className = 'qu0x-popup';
  document.body.appendChild(q);
  setTimeout(() => q.remove(), 3000);
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
  document.getElementById('next').onclick = nextGame;
  document.getElementById('prev').onclick = prevGame;

  document.querySelectorAll('.btn').forEach(btn => {
    btn.onclick = () => {
      expression += btn.innerText;
      updateExpressionDisplay();
      document.getElementById('expression-box').value = expression;
    };
  });
};
