const startDate = new Date("2025-05-15");
const today = new Date();
today.setHours(0, 0, 0, 0);
const msPerDay = 86400000;
const gameNumber = Math.floor((today - startDate) / msPerDay) + 1;
const seed = gameNumber;

const expressionDisplay = document.getElementById("expression");
const diceRow = document.getElementById("dice-row");
const message = document.getElementById("message");
const scoreDisplay = document.getElementById("score");
const streakDisplay = document.getElementById("streak");
const historyBody = document.getElementById("history-body");
const targetDisplay = document.getElementById("target-number");
const gameNumDisplay = document.getElementById("game-number");

let expression = [];
let dice = [];
let used = [];
let currentStreak = parseInt(localStorage.getItem("qu0xStreak") || "0");
let history = JSON.parse(localStorage.getItem("qu0xHistory") || "[]");

function rng(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateDice(seed) {
  const result = [];
  for (let i = 0; i < 5; i++) {
    seed += 1;
    result.push(1 + Math.floor(rng(seed) * 6));
  }
  return result;
}

function generateTarget(seed) {
  return 10 + Math.floor(rng(seed + 100) * 90);
}

function updateDiceDisplay() {
  diceRow.innerHTML = "";
  dice.forEach((num, i) => {
    const die = document.createElement("div");
    die.className = `die die${num} ${used[i] ? "used" : ""}`;
    die.textContent = num;
    die.onclick = () => {
      if (!used[i]) {
        expression.push(num.toString());
        used[i] = true;
        updateDisplay();
      }
    };
    diceRow.appendChild(die);
  });
}

function updateDisplay() {
  expressionDisplay.textContent = expression.join(" ");
  updateDiceDisplay();
}

function resetGame() {
  expression = [];
  used = [false, false, false, false, false];
  updateDisplay();
  message.textContent = "";
  scoreDisplay.textContent = "";
}

function evaluate(expr) {
  try {
    const numCount = expression.filter(x => /^[1-6]$/.test(x)).length;
    if (numCount !== 5) throw "You must use all five dice.";

    let safeExpr = expression.join(" ")
      .replace(/\^/g, "**")
      .replace(/(\d+)!/g, (_, n) => {
        if (parseInt(n) !== +n || n < 0) throw "Invalid factorial";
        let f = 1;
        for (let i = 2; i <= n; i++) f *= i;
        return f;
      });

    let val = Function(`return (${safeExpr})`)();
    if (!isFinite(val)) throw "Invalid";
    return val;
  } catch (e) {
    return null;
  }
}

function submit() {
  const val = evaluate(expression);
  if (val === null) {
    message.textContent = "Invalid expression. You must use all five dice.";
    return;
  }

  const score = Math.abs(val - target);
  message.textContent = score === 0 ? "🎉 Qu0x! 🎉" : `You scored ${score}`;
  scoreDisplay.textContent = `Your score: ${score}`;
  
  if (score === 0 && !history.some(h => h.game === gameNumber)) {
    currentStreak++;
    localStorage.setItem("qu0xStreak", currentStreak);
  }

  if (!history.some(h => h.game === gameNumber)) {
    history.push({ game: gameNumber, date: today.toISOString().split("T")[0], score });
    if (history.length > 5) history.shift();
    localStorage.setItem("qu0xHistory", JSON.stringify(history));
  }

  streakDisplay.textContent = `Current Qu0x Streak: ${currentStreak}`;
  loadHistory();
}

function loadHistory() {
  historyBody.innerHTML = "";
  history.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${entry.game}</td><td>${entry.date}</td><td>${entry.score}</td>`;
    historyBody.appendChild(row);
  });
}

document.querySelectorAll(".op").forEach(btn => {
  btn.onclick = () => {
    expression.push(btn.dataset.val);
    updateDisplay();
  };
});

document.getElementById("clear").onclick = resetGame;

document.getElementById("backspace").onclick = () => {
  const popped = expression.pop();
  const dieIndex = dice.findIndex((num, i) => num.toString() === popped && used[i]);
  if (dieIndex !== -1) used[dieIndex] = false;
  updateDisplay();
};

document.getElementById("submit").onclick = submit;

const diceSeed = seed;
dice = generateDice(diceSeed);
target = generateTarget(diceSeed);

gameNumDisplay.textContent = `Game #${gameNumber}`;
targetDisplay.textContent = `Target: ${target}`;
resetGame();
loadHistory();
