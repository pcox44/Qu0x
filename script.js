(() => {
  'use strict';

  // Config
  const START_DATE = new Date(2025, 4, 15); // May is month 4 zero-based
  const MS_PER_DAY = 86400000;
  const HISTORY_LIMIT = 5;

  // Horse race colors mapping
  const diceColors = {
    1: 'red',
    2: 'white',
    3: 'blue',
    4: 'yellow',
    5: 'green',
    6: 'black'
  };

  // Elements
  const diceContainer = document.getElementById('dice-container');
  const targetContainer = document.getElementById('target-container');
  const expressionDisplay = document.getElementById('expression-display');
  const buttonsContainer = document.getElementById('buttons-container');
  const submitBtn = document.getElementById('submit-btn');
  const resultContainer = document.getElementById('result-container');
  const streakContainer = document.getElementById('streak-container');
  const gameNumberDisplay = document.getElementById('game-number');
  const dateDisplay = document.getElementById('date-display');
  const prevGameBtn = document.getElementById('prev-game-btn');
  const nextGameBtn = document.getElementById('next-game-btn');
  const historyBody = document.getElementById('history-body');
  const backspaceBtn = document.getElementById('backspace-btn');
  const clearBtn = document.getElementById('clear-btn');

  // State
  let currentGameIndex = 0; // 0 means today's game
  let diceValues = [];
  let usedDice = [];
  let expression = '';
  let lastCharWasOperator = true; // To prevent concat
  let gameData = {}; // Stores history & streak etc

  // Utility functions
  function dateToString(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatDateReadable(date) {
    return date.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }

  // Compute game number from date
  function getGameNumber(date) {
    const diff = Math.floor((date - START_DATE) / MS_PER_DAY);
    return diff + 1;
  }

  // Compute date from game number (1-based)
  function getDateFromGameNumber(n) {
    const d = new Date(START_DATE.getTime() + (n -1)*MS_PER_DAY);
    return d;
  }

  // Seeded RNG - Mulberry32
  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  }

  // Generate dice roll for a game number (deterministic)
  function generateDice(gameNum) {
    const rng = mulberry32(gameNum);
    let dice = [];
    for (let i=0; i<5; i++) {
      dice.push(1 + Math.floor(rng() * 6));
    }
    return dice;
  }

  // Generate target number (1 to 100) deterministically from game number
  function generateTarget(gameNum) {
    const rng = mulberry32(gameNum + 1000);
    return 1 + Math.floor(rng() * 100);
  }

  // Render dice with colors and clickability
  function renderDice() {
    diceContainer.innerHTML = '';
    for (let i=0; i < diceValues.length; i++) {
      const val = diceValues[i];
      const die = document.createElement('div');
      die.classList.add('die');
      die.classList.add(diceColors[val]);
      if (usedDice.includes(i)) die.classList.add('used');
      die.textContent = val;
      if (!usedDice.includes(i)) {
        die.style.cursor = 'pointer';
        die.addEventListener('click', () => {
          addDiceToExpression(i);
        });
      }
      diceContainer.appendChild(die);
    }
  }

  // Add dice number to expression, ensure no concat without operator
  function addDiceToExpression(diceIndex) {
    if (usedDice.includes(diceIndex)) return;
    // Prevent concatenation by forcing operator after each number
    if (!lastCharWasOperator) return; // must have operator before adding new number
    expression += diceValues[diceIndex];
    usedDice.push(diceIndex);
    lastCharWasOperator = false;
    updateExpressionDisplay();
    renderDice();
  }

  // Add operator or parenthesis to expression
  function addOperator(op) {
    if (op === '(') {
      // '(' can follow operator or '(' or be start
      if (!lastCharWasOperator && expression.length > 0) return;
      expression += op;
      lastCharWasOperator = true;
    } else if (op === ')') {
      // ')' can only follow number or '!' or ')'
      if (expression.length === 0) return;
      const lastChar = expression[expression.length - 1];
      if ("0123456789!".includes(lastChar) || lastChar === ')') {
        expression += op;
        lastCharWasOperator = false;
      }
    } else if (op === '!') {
      // '!' can only follow number or ')'
      if (expression.length === 0) return;
      const lastChar = expression[expression.length - 1];
      if ("0123456789)".includes(lastChar)) {
        expression += op;
        lastCharWasOperator = false; // factorial is postfix, so still number-ish
      }
    } else {
      // + - * / ^
      if (!lastCharWasOperator) {
        expression += op;
        lastCharWasOperator = true;
      }
    }
    updateExpressionDisplay();
  }

  // Remove last char or last dice from expression
  function backspace() {
    if (expression.length === 0) return;
    const lastChar = expression.slice(-1);
    expression = expression.slice(0, -1);

    // If lastChar was dice number, free it up
    if ("123456".includes(lastChar)) {
      // find last dice with this value that is used and remove it from usedDice
      for (let i = usedDice.length - 1; i >= 0; i--) {
        if (diceValues[usedDice[i]] == Number(lastChar)) {
          usedDice.splice(i,1);
          break;
        }
      }
      lastCharWasOperator = true; // after removing a number, must be operator
    } else if (lastChar === '!') {
      lastCharWasOperator = false; // factorial is postfix operator, so number still
    } else if (lastChar === ')') {
      lastCharWasOperator = false;
    } else if (lastChar === '(') {
      lastCharWasOperator = true;
    } else {
      // operator
      // Check previous char for operator or number
      if (expression.length === 0) {
        lastCharWasOperator = true;
      } else {
        const prevChar = expression.slice(-1);
        lastCharWasOperator = !("0123456789!)".includes(prevChar));
      }
    }
    updateExpressionDisplay();
    renderDice();
  }

  // Clear entire expression & reset used dice
  function clearExpression() {
    expression = '';
    usedDice = [];
    lastCharWasOperator = true;
    updateExpressionDisplay();
    renderDice();
  }

  // Update expression display text
  function updateExpressionDisplay() {
    expressionDisplay.textContent = expression;
  }

  // Evaluate expression safely with factorial and ^ support
  function evaluateExpression(expr) {
    // Replace ^ with ** for JS exponentiation
    expr = expr.replace(/\^/g, '**');

    // Replace factorial with function calls
    expr = expr.replace(/(\d+)!/g, 'factorial($1)');

    // Safety: allow only digits, operators, parentheses, factorial calls
    if (!/^[0-9+\-*/().*! \^]+$/.test(expr)) {
      throw new Error('Invalid characters in expression');
    }

    // eslint-disable-next-line no-new-func
    const func = new Function('factorial', `return ${expr};`);

    function factorial(n) {
      n = Number(n);
      if (n % 1 !== 0 || n < 0 || n > 20) throw new Error('Invalid factorial argument');
      let f = 1;
      for (let i=2; i<=n; i++) f *= i;
      return f;
    }

    return func(factorial);
  }

  // Check if all dice used exactly once
  function allDiceUsed() {
    return usedDice.length === diceValues.length;
  }

  // Calculate difference score
  function calculateScore(val, target) {
    return Math.abs(val - target);
  }

  // Load game data from localStorage
  function loadGameData() {
    const data = localStorage.getItem('qu0xGameData');
    if (data) {
      try {
        gameData = JSON.parse(data);
      } catch {
        gameData = {};
      }
    } else {
      gameData = {};
    }
    if (!gameData.history) gameData.history = {};
    if (!gameData.streak) gameData.streak = 0;
  }

  // Save game data to localStorage
  function saveGameData() {
    localStorage.setItem('qu0xGameData', JSON.stringify(gameData));
  }

  // Render current game UI
  function renderGame() {
    // Calculate game number and date
    const today = new Date();
    const gameDate = getDateFromGameNumber(currentGameIndex + 1);
    const gameNum = getGameNumber(gameDate);

    gameNumberDisplay.textContent = `Game #${gameNum}`;
    dateDisplay.textContent = formatDateReadable(gameDate);

    diceValues = generateDice(gameNum);
    usedDice = [];
    expression = '';
    lastCharWasOperator = true;
    updateExpressionDisplay();

    renderDice();

    const target = generateTarget(gameNum);
    targetContainer.textContent = `Target Number: ${target}`;

    resultContainer.textContent = '';

    renderHistory();

    // Update nav button state: can't go before 1 or after today
    prevGameBtn.disabled = (currentGameIndex <= 0);
    const maxGameIndex = getGameNumber(today) - 1;
    nextGameBtn.disabled = (currentGameIndex >= maxGameIndex);
  }

  // Render last 5 days history table
  function renderHistory() {
    historyBody.innerHTML = '';

    // Sort keys descending by game number (date)
    const keys = Object.keys(gameData.history)
      .map(k => parseInt(k))
      .filter(n => !isNaN(n))
      .sort((a,b) => b - a)
      .slice(0,5);

    keys.forEach(gameNum => {
      const record = gameData.history[gameNum];
      const tr = document.createElement('tr');
      const dateStr = formatDateReadable(getDateFromGameNumber(gameNum));
      const diceStr = record.dice.join(', ');
      const exprStr = record.expression;
      const scoreStr = record.score;

      tr.innerHTML = `<td>${gameNum}</td><td>${dateStr}</td><td>${diceStr}</td><td>${exprStr}</td><td>${scoreStr}</td>`;
      historyBody.appendChild(tr);
    });
  }

  // Submit the current expression and compute result & score
  function submitExpression() {
    if (!allDiceUsed()) {
      resultContainer.textContent = 'Use all dice exactly once!';
      return;
    }
    let val;
    try {
      val = evaluateExpression(expression);
    } catch(e) {
      resultContainer.textContent = 'Invalid expression';
      return;
    }
    if (typeof val !== 'number' || !isFinite(val)) {
      resultContainer.textContent = 'Invalid result';
      return;
    }

    const target = generateTarget(getGameNumber(getDateFromGameNumber(currentGameIndex + 1)));
    const score = calculateScore(val, target);

    resultContainer.textContent = `Result: ${val.toFixed(4)} | Target: ${target} | Score: ${score}`;

    // Update streak and history
    const gameNum = getGameNumber(getDateFromGameNumber(currentGameIndex + 1));
    if (!gameData.history) gameData.history = {};
    gameData.history[gameNum] = {
      dice: diceValues,
      expression: expression,
      score: score
    };

    // Update streak: increment if score is 0, else reset
    if (score === 0) {
      gameData.streak = (gameData.streak || 0) + 1;
      showQu0xAnimation();
    } else {
      gameData.streak = 0;
    }

    saveGameData();
    renderHistory();
  }

  // Show a big "Qu0x!" pop-up animation for 3 seconds
  function showQu0xAnimation() {
    const popup = document.createElement('div');
    popup.textContent = 'Qu0x!';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.fontSize = '100px';
    popup.style.fontWeight = 'bold';
    popup.style.color = 'gold';
    popup.style.textShadow = '2px 2px 8px black';
    popup.style.zIndex = '10000';
    popup.style.animation = 'qu0x-pop 3s ease forwards';

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 3000);
  }

  // Handle button clicks
  function setupButtons() {
    // Number dice buttons handled by renderDice and event listeners

    // Operator buttons
    document.querySelectorAll('.operator-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        addOperator(btn.textContent);
      });
    });

    backspaceBtn.addEventListener('click', () => {
      backspace();
    });

    clearBtn.addEventListener('click', () => {
      clearExpression();
    });

    submitBtn.addEventListener('click', () => {
      submitExpression();
    });

    prevGameBtn.addEventListener('click', () => {
      if (currentGameIndex > 0) {
        currentGameIndex--;
        renderGame();
      }
    });

    nextGameBtn.addEventListener('click', () => {
      const maxGameIndex = getGameNumber(new Date()) - 1;
      if (currentGameIndex < maxGameIndex) {
        currentGameIndex++;
        renderGame();
      }
    });
  }

  // Initialize game
  function init() {
    loadGameData();
    setupButtons();
    renderGame();
  }

  init();

})();

/* CSS for animation */
/* Add this CSS somewhere in your stylesheet or inside <style> tags */
/*
@keyframes qu0x-pop {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1) opacity: 0; }
}
*/

</script>
</body>
</html>
