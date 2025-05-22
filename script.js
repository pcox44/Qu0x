const startDate = new Date("2025-05-15");
let today = new Date();
today.setHours(0, 0, 0, 0);

let currentGameOffset = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
let usedDice = [];
let expression = "";
let gameData = {};
let streak = parseInt(localStorage.getItem("qu0xStreak") || "0");

const diceContainer = document.getElementById("dice-container");
const targetDiv = document.getElementById("target-number");
const gameNumDiv = document.getElementById("game-number");
const expressionDiv = document.getElementById("expression");
const messageDiv = document.getElementById("message");
const streakDiv = document.getElementById("streak");
const historyTable = document.querySelector("#history tbody");

function seedRandom(dayOffset) {
  const seed = dayOffset + 12345;
  return () => {
    const x = Math.sin(seed + dayOffset++) * 10000;
    return x - Math.floor(x);
  };
}

function generateGame(dayOffset) {
  const rng = seedRandom(dayOffset);
  let dice, target, found;

  do {
    dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
    target = Math.floor(rng() * 100) + 1;
    found = true; // Placeholder; you can implement a real solution checker
  } while (!found);

  return { dice, target };
}

function loadGame(offset) {
  currentGameOffset = offset;
  const date = new Date(startDate.getTime());
  date.setDate(startDate.getDate() + offset);
  const dateStr = date.toISOString().slice(0, 10);

  gameData = generateGame(offset);
  expression = "";
  usedDice = [];

  gameNumDiv.textContent = `Game #${offset + 1} (${dateStr})`;
  targetDiv.textContent = `Target: ${gameData.target}`;
  expressionDiv.textContent = "";
  messageDiv.textContent = "";

  diceContainer.innerHTML = "";
  gameData.dice.forEach((val, i) => {
    const die = document.createElement("div");
    die.className = "die";
    die.dataset.index = i;
    die.dataset.value = val;
    die.textContent = val;
    die.addEventListener("click", () => useDie(i));
    diceContainer.appendChild(die);
  });

  updateStreak();
  updateHistory();
}

function useDie(index) {
  const die = diceContainer.children[index];
  if (die.classList.contains("faded")) return;

  expression += die.dataset.value;
  usedDice.push(index);
  die.classList.add("faded");
  expressionDiv.textContent = expression;
}

function updateStreak() {
  streakDiv.textContent = `Current Qu0x Streak: ${streak}`;
}

function updateHistory() {
  historyTable.innerHTML = "";
  for (let i = Math.max(0, currentGameOffset - 4); i <= currentGameOffset; i++) {
    const gameDate = new Date(startDate.getTime());
    gameDate.setDate(startDate.getDate() + i);
    const dateStr = gameDate.toISOString().slice(0, 10);
    const score = localStorage.getItem(`qu0xScore-${i}`) || "-";
    const row = `<tr><td>${i + 1}</td><td>${dateStr}</td><td>${score}</td></tr>`;
    historyTable.innerHTML += row;
  }
}

document.querySelectorAll(".op").forEach(btn =>
  btn.addEventListener("click", () => {
    expression += btn.textContent;
    expressionDiv.textContent = expression;
  })
);

document.getElementById("clear").onclick = () => {
  expression = "";
  usedDice = [];
  expressionDiv.textContent = "";
  [...diceContainer.children].forEach(d => d.classList.remove("faded"));
};

document.getElementById("backspace").onclick = () => {
  const last = expression.slice(-1);
  expression = expression.slice(0, -1);
  expressionDiv.textContent = expression;

  if (!isNaN(last)) {
    for (let i = usedDice.length - 1; i >= 0; i--) {
      const idx = usedDice[i];
      if (diceContainer.children[idx].textContent === last) {
        usedDice.splice(i, 1);
        diceContainer.children[idx].classList.remove("faded");
        break;
      }
    }
  }
};

document.getElementById("submit").onclick = () => {
  try {
    const val = eval(expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '**'));
    const score = Math.abs(val - gameData.target);
    messageDiv.textContent = score === 0 ? "Qu0x!" : `Score: ${score}`;
    localStorage.setItem(`qu0xScore-${currentGameOffset}`, score);

    if (score === 0) {
      streak++;
      localStorage.setItem("qu0xStreak", streak);
    }

    updateStreak();
    updateHistory();
  } catch {
    messageDiv.textContent = "Invalid expression";
  }
};

document.getElementById("prev-day").onclick = () => {
  if (currentGameOffset > 0) loadGame(currentGameOffset - 1);
};

document.getElementById("next-day").onclick = () => {
  const todayOffset = Math.floor((new Date().setHours(0, 0, 0, 0) - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (currentGameOffset < todayOffset) loadGame(currentGameOffset + 1);
};

loadGame(currentGameOffset);
