const today = new Date();
const startDate = new Date("2025-05-15");
const msPerDay = 86400000;

let currentGameIndex = Math.floor((today - startDate) / msPerDay);
if (currentGameIndex < 0) currentGameIndex = 0;

function getSeededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getDiceForGame(index) {
  const dice = [];
  let used = {};
  for (let i = 0; i < 5; i++) {
    let val;
    do {
      val = Math.floor(getSeededRandom(index * 10 + i + 1) * 6) + 1;
    } while (Object.keys(used).filter(x => x == val).length >= 5);
    dice.push(val);
    used[val] = (used[val] || 0) + 1;
  }
  return dice;
}

function getTarget(index) {
  return Math.floor(getSeededRandom(index + 999) * 100) + 1;
}

let dice, target, usedIndices = [], gameData = {};

function updateDateDisplay(index) {
  const d = new Date(startDate.getTime() + index * msPerDay);
  document.getElementById("today-date").innerText = `Date: ${d.toLocaleDateString()}`;
  document.getElementById("game-number").innerText = `Game #${index + 1}`;
}

function renderDice() {
  const container = document.getElementById("dice-container");
  container.innerHTML = "";
  dice.forEach((val, i) => {
    const die = document.createElement("div");
    die.className = `die d${val}`;
    die.innerText = val;
    if (usedIndices.includes(i)) die.classList.add("used");
    die.onclick = () => {
      if (!usedIndices.includes(i)) {
        document.getElementById("expression").value += val;
        usedIndices.push(i);
        renderDice();
      }
    };
    container.appendChild(die);
  });
}

function renderTarget() {
  document.getElementById("target-container").innerText = `Target: ${target}`;
}

function updateGame(index) {
  dice = getDiceForGame(index);
  target = getTarget(index);
  usedIndices = [];
  document.getElementById("expression").value = "";
  document.getElementById("expression-result").innerText = "";
  document.getElementById("message-container").innerText = "";
  renderDice();
  renderTarget();
  updateDateDisplay(index);
  updateStreak();
  if (isQu0xLocked(index)) lockGame();
}

function isQu0xLocked(index) {
  const history = JSON.parse(localStorage.getItem("qu0x-history") || "{}");
  return history[index]?.score === 0;
}

function lockGame() {
  const exprInput = document.getElementById("expression");
  exprInput.value = "Qu0x achieved!";
  document.querySelectorAll("button").forEach(b => b.disabled = true);
  document.getElementById("prev-day").disabled = false;
  document.getElementById("next-day").disabled = false;
}

function unlockGame() {
  document.querySelectorAll("button").forEach(b => b.disabled = false);
}

document.getElementById("submit").onclick = () => {
  let expr = document.getElementById("expression").value;
  if (usedIndices.length !== 5) {
    alert("Use all 5 dice exactly once!");
    return;
  }

  try {
    let safeExpr = expr.replace(/[^-()\d/*+.!^]/g, "");
    if (/[!]{2,}/.test(safeExpr)) throw "Invalid factorial";
    if (!/^[\d()+\-*/^!.]+$/.test(safeExpr)) throw "Invalid chars";
    const val = math.evaluate(safeExpr);
    const result = Math.round(val * 10000) / 10000;
    document.getElementById("expression-result").innerText = `= ${result}`;
    const score = Math.abs(result - target);

    const history = JSON.parse(localStorage.getItem("qu0x-history") || "{}");
    if (!history[currentGameIndex] || score < history[currentGameIndex].score) {
      history[currentGameIndex] = { score };
      localStorage.setItem("qu0x-history", JSON.stringify(history));
    }

    if (score === 0) {
      document.getElementById("message-container").innerHTML = '<span id="qu0x-animation">Qu0x!</span>';
      updateStreak(true);
      lockGame();
    } else {
      document.getElementById("message-container").innerText = `Score: ${score}`;
    }

    updateHistory();
  } catch (err) {
    document.getElementById("message-container").innerText = "Invalid expression!";
  }
};

document.getElementById("backspace").onclick = () => {
  const expr = document.getElementById("expression").value;
  const newExpr = expr.slice(0, -1);
  document.getElementById("expression").value = newExpr;
  usedIndices = [];

  // Recalculate used dice
  dice.forEach((val, i) => {
    const re = new RegExp(val.toString(), 'g');
    const match = newExpr.match(re);
    if (match && match.length >= 1 && usedIndices.filter(x => dice[x] == val).length < match.length) {
      usedIndices.push(i);
    }
  });
  renderDice();
};

document.getElementById("clear").onclick = () => {
  document.getElementById("expression").value = "";
  usedIndices = [];
  renderDice();
};

document.querySelectorAll(".op").forEach(btn => {
  btn.onclick = () => {
    document.getElementById("expression").value += btn.dataset.value;
  };
});

document.getElementById("prev-day").onclick = () => {
  if (currentGameIndex > 0) {
    currentGameIndex--;
    unlockGame();
    updateGame(currentGameIndex);
  }
};

document.getElementById("next-day").onclick = () => {
  const maxIndex = Math.floor((new Date() - startDate) / msPerDay);
  if (currentGameIndex < maxIndex) {
    currentGameIndex++;
    unlockGame();
    updateGame(currentGameIndex);
  }
};

function updateStreak(added = false) {
  let streak = 0;
  const history = JSON.parse(localStorage.getItem("qu0x-history") || "{}");
  const todayIndex = Math.floor((new Date() - startDate) / msPerDay);
  for (let i = todayIndex; i >= 0; i--) {
    if (history[i] && history[i].score === 0) {
      streak++;
    } else {
      break;
    }
  }
  document.getElementById("streak").innerText = `Current Qu0x Streak: ${streak}`;
}

function updateHistory() {
  const body = document.getElementById("history-body");
  body.innerHTML = "";
  const history = JSON.parse(localStorage.getItem("qu0x-history") || "{}");
  const keys = Object.keys(history).sort((a, b) => b - a).slice(0, 5);
  keys.forEach(k => {
    const d = new Date(startDate.getTime() + Number(k) * msPerDay);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${d.toLocaleDateString()}</td><td>${Number(k) + 1}</td><td>${history[k].score}</td>`;
    body.appendChild(tr);
  });
}

window.onload = () => {
  updateGame(currentGameIndex);
  updateHistory();
};
