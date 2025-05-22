const startDate = new Date("2025-05-15");
const today = new Date();
const msPerDay = 1000 * 60 * 60 * 24;
let currentGame = Math.floor((today - startDate) / msPerDay) + 1;

const usedGames = JSON.parse(localStorage.getItem("qu0xGames") || "{}");
const totalQu0x = Object.values(usedGames).filter(g => g.score === 0).length;

document.getElementById("total-qu0x").textContent = `Total Qu0x: ${totalQu0x}`;

function loadGame(gameNum) {
  const gameDate = new Date(startDate.getTime() + (gameNum - 1) * msPerDay);
  if (gameDate > today || gameNum < 1) return;
  document.getElementById("game-date").textContent = gameDate.toDateString();
  const rng = mulberry32(gameNum);
  const dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  const target = Math.floor(rng() * 100) + 1;

  const container = document.getElementById("dice-container");
  container.innerHTML = "";
  dice.forEach((num, i) => {
    const div = document.createElement("div");
    div.className = `die d${num}`;
    div.textContent = num;
    div.dataset.index = i;
    div.dataset.value = num;
    container.appendChild(div);
  });

  document.getElementById("target-number").textContent = target;
  setupInput(dice, target, gameNum);
}

function setupInput(dice, target, gameNum) {
  let expression = "";
  const expressionDisplay = document.getElementById("expression-display");
  const expressionResult = document.getElementById("expression-result");
  const diceElems = document.querySelectorAll(".die");

  diceElems.forEach(d => d.addEventListener("click", () => {
    if (!d.classList.contains("used")) {
      expression += d.dataset.value;
      d.classList.add("used");
      updateDisplay();
    }
  }));

  document.querySelectorAll(".op").forEach(btn => {
    btn.onclick = () => {
      expression += btn.textContent.replace('×','*').replace('÷','/').replace('−','-');
      updateDisplay();
    };
  });

  document.getElementById("backspace").onclick = () => {
    expression = expression.slice(0, -1);
    updateDisplay();
  };

  document.getElementById("clear").onclick = () => {
    expression = "";
    diceElems.forEach(d => d.classList.remove("used"));
    updateDisplay();
  };

  function updateDisplay() {
    expressionDisplay.textContent = expression;
    try {
      const val = math.evaluate(expression);
      expressionResult.textContent = "= " + val;
    } catch {
      expressionResult.textContent = "";
    }
  }

  document.getElementById("submit").onclick = () => {
    const used = Array.from(diceElems).filter(d => d.classList.contains("used")).map(d => +d.dataset.value);
    if (used.length !== 5 || !dice.every(d => used.includes(d))) {
      document.getElementById("message").textContent = "Use all dice exactly once.";
      return;
    }

    try {
      const val = Math.round(math.evaluate(expression));
      const score = Math.abs(target - val);
      const saved = usedGames[gameNum] || {};

      if (score === 0 && !saved.locked) {
        document.getElementById("qu0x-animation").style.display = "block";
        setTimeout(() => document.getElementById("qu0x-animation").style.display = "none", 3000);
        usedGames[gameNum] = { score: 0, locked: true };
        localStorage.setItem("qu0xGames", JSON.stringify(usedGames));
        location.reload();
      } else if (!saved.locked) {
        usedGames[gameNum] = { score };
        localStorage.setItem("qu0xGames", JSON.stringify(usedGames));
        document.getElementById("message").textContent = `Score: ${score}`;
        updateArchive();
      } else {
        document.getElementById("message").textContent = "You've already gotten a Qu0x today!";
      }
    } catch {
      document.getElementById("message").textContent = "Invalid expression.";
    }
  };
}

function updateArchive() {
  const archive = document.querySelector("#archive tbody");
  archive.innerHTML = "";
  const entries = Object.entries(usedGames)
    .sort((a, b) => a[0] - b[0])
    .slice(-5);

  for (const [game, data] of entries) {
    const tr = document.createElement("tr");
    const date = new Date(startDate.getTime() + (game - 1) * msPerDay);
    tr.innerHTML = `<td>${date.toLocaleDateString()}</td><td>${data.score}</td>`;
    archive.appendChild(tr);
  }
}

document.getElementById("prev").onclick = () => loadGame(--currentGame);
document.getElementById("next").onclick = () => loadGame(++currentGame);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

loadGame(currentGame);
updateArchive();
