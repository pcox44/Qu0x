const startDate = new Date('2025-05-15');
let currentDate = new Date();
let today = new Date();
today.setHours(0,0,0,0);
if (currentDate > today) currentDate = today;

const usedDice = [];
let expression = "";
let diceValues = [];
let target = 0;
let gameNumber = 0;
let hasQu0x = false;
let locked = false;

function seedRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getGameNumberFromDate(date) {
  return Math.floor((date - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

function getDateFromGameNumber(num) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + num - 1);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function generateDice(seed) {
  const values = [];
  for (let i = 0; i < 5; i++) {
    seed += i;
    let rand = seedRandom(seed);
    values.push(Math.floor(rand * 6) + 1);
  }
  return values;
}

function generateTarget(seed) {
  return Math.floor(seedRandom(seed + 99) * 100) + 1;
}

function displayDice() {
  const container = document.getElementById('dice-container');
  container.innerHTML = "";
  diceValues.forEach((val, i) => {
    const die = document.createElement("div");
    die.className = `die die-${val}`;
    die.textContent = val;
    die.dataset.index = i;
    if (usedDice.includes(i)) die.classList.add("used");
    die.onclick = () => {
      if (locked) return;
      usedDice.push(i);
      expression += val;
      updateExpression();
      displayDice();
    };
    container.appendChild(die);
  });
}

function updateExpression() {
  document.getElementById("expression").textContent = expression;
}

function showTarget() {
  document.getElementById("target-container").textContent = `Target: ${target}`;
}

function showDateAndGame() {
  const d = formatDate(currentDate);
  document.getElementById("date-container").textContent = d;
  gameNumber = getGameNumberFromDate(currentDate);
  document.getElementById("game-number").textContent = `Game #${gameNumber}`;
}

function resetGame() {
  expression = "";
  usedDice.length = 0;
  const seed = gameNumber;
  diceValues = generateDice(seed);
  target = generateTarget(seed);
  hasQu0x = localStorage.getItem(`qu0x-${gameNumber}`) === "1";
  locked = hasQu0x;
  updateExpression();
  displayDice();
  showTarget();
  showDateAndGame();
  document.getElementById("result-container").textContent = "";
  document.getElementById("message-container").textContent = "";
  document.getElementById("score").textContent = "";
}

function validateExpression(expr) {
  const replaced = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  try {
    const result = math.evaluate(replaced);
    if (!Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

function usedAllDice(expr) {
  const numsUsed = diceValues.map((v, i) => usedDice.includes(i));
  return numsUsed.every(u => u);
}

function showHistory() {
  const tbody = document.getElementById("history-body");
  tbody.innerHTML = "";
  for (let i = gameNumber - 1; i >= Math.max(1, gameNumber - 5); i--) {
    const date = formatDate(getDateFromGameNumber(i));
    const score = localStorage.getItem(`score-${i}`);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${date}</td><td>${i}</td><td>${score ?? '-'}</td>`;
    tbody.appendChild(tr);
  }
}

function updateStreak() {
  let streak = 0;
  let day = getGameNumberFromDate(today);
  while (localStorage.getItem(`qu0x-${day}`) === "1") {
    streak++;
    day--;
  }
  document.getElementById("streak").textContent = `Current Qu0x Streak: ${streak}`;
}

document.getElementById("buttons-container").addEventListener("click", e => {
  if (!e.target.classList.contains("num") || locked) return;
  const val = e.target.textContent;
  if (val) {
    expression += val === "−" ? "-" : val;
    updateExpression();
  }
});

document.getElementById("submit").onclick = () => {
  if (locked) return;

  const result = validateExpression(expression);
  document.getElementById("result-container").textContent = result !== null ? `= ${result}` : "";

  if (result === null || !usedAllDice(expression)) {
    document.getElementById("message-container").textContent = "Invalid expression or not all dice used.";
    return;
  }

  const score = Math.abs(result - target);
  document.getElementById("score").textContent = `Score: ${score}`;
  localStorage.setItem(`score-${gameNumber}`, score);

  if (score === 0) {
    document.getElementById("message-container").textContent = "Qu0x!";
    localStorage.setItem(`qu0x-${gameNumber}`, "1");
    locked = true;
  } else {
    document.getElementById("message-container").textContent = "Nice try!";
  }

  updateStreak();
  showHistory();
};

document.getElementById("clear").onclick = () => {
  expression = "";
  usedDice.length = 0;
  updateExpression();
  displayDice();
};

document.getElementById("backspace").onclick = () => {
  if (expression.length > 0) {
    const last = expression[expression.length - 1];
    expression = expression.slice(0, -1);
    if (!isNaN(last)) {
      const idx = usedDice.pop();
    }
    updateExpression();
    displayDice();
  }
};

document.getElementById("prev-btn").onclick = () => {
  const prev = new Date(currentDate);
  prev.setDate(prev.getDate() - 1);
  if (prev >= startDate) {
    currentDate = prev;
    resetGame();
    showHistory();
    updateStreak();
  }
};

document.getElementById("next-btn").onclick = () => {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + 1);
  if (next <= today) {
    currentDate = next;
    resetGame();
    showHistory();
    updateStreak();
  }
};

// Load current game
resetGame();
showHistory();
updateStreak();
