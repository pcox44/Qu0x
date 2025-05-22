// script.js

const diceContainer = document.getElementById("dice-container");
const expressionInput = document.getElementById("expression-input");
const targetValue = document.getElementById("target-value");
const gameNumberDisplay = document.getElementById("game-number");
const messageContainer = document.getElementById("message-container");
const scoreDisplay = document.getElementById("score-display");
const streakDisplay = document.getElementById("streak-display");
const historyTableBody = document.querySelector("#history-table tbody");
const qu0xPopup = document.getElementById("qu0x-popup");

const btnClear = document.getElementById("btn-clear");
const btnBackspace = document.getElementById("btn-backspace");
const btnSubmit = document.getElementById("btn-submit");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnOpenParen = document.getElementById("btn-open-paren");
const btnCloseParen = document.getElementById("btn-close-paren");
const opButtons = document.querySelectorAll(".op-btn");

let expression = "";
let usedDiceIndices = new Set();
let usageOrder = [];
let diceValues = [];
let targetNumber = 0;
let currentScore = null;
let submissionLocked = false;
let currentGameNum = 1;
let currentStreak = 0;

const diceColors = ["red", "blue", "green", "yellow", "black", "white", "pink", "purple", "orange", "brown"];

function getGameDate(gameNum) {
  const startDate = new Date(2025, 4, 15); // May 15, 2025
  const gameDate = new Date(startDate);
  gameDate.setDate(startDate.getDate() + gameNum - 1);
  const today = new Date();
  if (gameDate > today) {
    return null;
  }
  return gameDate;
}

function generateGameData(gameNum) {
  const gameDate = getGameDate(gameNum);
  if (!gameDate) {
    return null;
  }
  const seed = gameDate.toDateString();
  const rng = mulberry32(hashCode(seed));
  const dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  const target = Math.floor(rng() * 100) + 10;
  return { dice, target };
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function updateGameInfo() {
  gameNumberDisplay.textContent = `Game #${currentGameNum}`;
}

function updateDiceButtons() {
  diceContainer.innerHTML = "";
  diceValues.forEach((val, idx) => {
    const btn = document.createElement("button");
    btn.classList.add("dice");
    btn.textContent = val;
    btn.dataset.index = idx;
    btn.disabled = submissionLocked || usedDiceIndices.has(idx);
    const color = diceColors[idx % diceColors.length];
    btn.classList.add(color);
    if (usedDiceIndices.has(idx)) {
      btn.classList.add("used");
    }
    btn.addEventListener("click", onDiceClick);
    diceContainer.appendChild(btn);
  });
}

function updateTarget() {
  targetValue.textContent = targetNumber;
}

function updateExpressionInput()
::contentReference[oaicite:43]{index=43}
 
