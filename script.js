(() => {
  // Constants for dice colors by index
  const diceColors = ['red', 'blue', 'green', 'orange', 'purple'];

  // Elements
  const diceContainer = document.getElementById('dice-container');
  const expressionContainer = document.getElementById('expression-container');
  const resultContainer = document.getElementById('result');
  const historyBody = document.getElementById('history-body');

  const submitBtn = document.getElementById('submit-btn');
  const backspaceBtn = document.getElementById('backspace-btn');
  const clearBtn = document.getElementById('clear-btn');
  const prevGameBtn = document.getElementById('prev-game-btn');
  const nextGameBtn = document.getElementById('next-game-btn');

  // Operator buttons
  const operators = ['+', '-', '*', '/', '(', ')', '!', '^'];
  const operatorButtons = {};
  operators.forEach(op => {
    operatorButtons[op] = document.getElementById(`operator-${op === '^' ? 'pow' : op}`);
  });

  // Game state
  let currentGameIndex = getGameNumber(new Date()) - 1; // zero-based index for today
  let diceValues = [];
  let usedDiceIndices = new Set();
  let expression = '';

  // Local storage key
  const STORAGE_KEY = 'daily-dice-game-data';

  // Load saved game data
  let gameData = { streak: 0, history: {} };

  function saveGameData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
  }

  function loadGameData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        gameData = JSON.parse(data);
      } catch {
        gameData = { streak: 0, history: {} };
      }
    }
  }

  // Helper: Get game number from date (days since 2025-01-01)
  function getGameNumber(date) {
    const start = new Date(2025, 0, 1); // Jan 1, 2025
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // Helper: format date to readable string
  function formatDateReadable(date) {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Helper: get Date from game number
  function getDateFromGameNumber(gameNum) {
    const start = new Date(2025, 0, 1);
    const date = new Date(start.getTime());
    date.setDate(start.getDate() + gameNum);
    return date;
  }

  // Generate dice values seeded by game number
  function generateDice(gameNum) {
    const values = [];
    let seed = gameNum + 12345;
    for (let i = 0; i < 5; i++) {
      // Simple seeded RNG: linear congruential generator
      seed = (seed * 9301 + 49297) % 233280;
      let val = 1 + (seed % 6);
      values.push(val);
    }
    return values;
  }

  // Generate target number seeded by game number
  function generateTarget(gameNum) {
    let seed = gameNum + 54321;
    seed = (seed * 69069 + 1) % 100;
    return 1 + seed; // target 1 to 100
  }

  // Render dice buttons
  function renderDice() {
    diceContainer.innerHTML = '';
    diceValues.forEach((val, i) => {
      const btn = document.createElement('button');
      btn.className = 'dice ' + diceColors[i];
      btn.textContent = val;
      btn.disabled = usedDiceIndices.has(i);
      if (usedDiceIndices.has(i)) btn.classList.add('used');
      btn.addEventListener('click', () => {
        if (!btn.disabled) {
          addDice(i);
        }
      });
      diceContainer.appendChild(btn);
    });
  }

  // Add dice value to expression
  function addDice(index) {
    if (usedDiceIndices.has(index)) return;
    // Add dice value to expression only if last token is not a number (to avoid concatenation)
    // But since input is click only, just append number
    if (expression.length > 0) {
      const lastChar = expression.slice(-1);
      if (/\d/.test(lastChar)) {
        // Cannot concatenate numbers; need operator first
        resultContainer.textContent = 'Insert operator before next number';
        return;
      }
    }
    expression += diceValues[index];
    usedDiceIndices.add(index);
    updateExpression();
    renderDice();
    resultContainer.textContent = '';
  }

  // Add operator to expression
  function addOperator(op) {
    if (expression.length === 0 && (op !== '(')) {
      // Can't start expression with these operators (except '(')
      if (op === '!' || op === '^' || op === ')') {
        resultContainer.textContent = 'Expression cannot start with ' + op;
        return;
      }
    }
    // Prevent two operators in a row except for '(' and ')'
    const lastChar = expression.slice(-1);
    if (lastChar) {
      if ('+-*/^('.includes(op) && '+-*/^('.includes(lastChar)) {
        resultContainer.textContent = 'Cannot have two operators in a row';
        return;
      }
      if (op === '!' && !/\d/.test(lastChar)) {
        resultContainer.textContent = 'Factorial must follow a number';
        return;
      }
    }
    expression += op;
    updateExpression();
    resultContainer.textContent = '';
  }

  // Update expression display
  function updateExpression() {
    expressionContainer.textContent = expression;
  }

  // Backspace function
  function backspace() {
    if (expression.length === 0) return;

    const lastChar = expression.slice(-1);
    expression = expression.slice(0, -1);

    // If lastChar was a digit, remove that dice usage
    if (/\d/.test(lastChar)) {
      // Find the dice index that matches this digit and is used most recently
      // Since numbers can't be concatenated, digits correspond to dice used
      // We'll remove the last used dice that matches this digit
      let foundIndex = null;
      [...usedDiceIndices].reverse().some(idx => {
        if (diceValues[idx].toString() === lastChar) {
          foundIndex = idx;
          return true;
        }
        return false;
      });
      if (foundIndex !== null) usedDiceIndices.delete(foundIndex);
    }
    updateExpression();
    renderDice();
    resultContainer.textContent = '';
  }

  // Clear expression and dice usage
  function clearExpression() {
    expression = '';
    usedDiceIndices.clear();
    updateExpression();
    renderDice();
    resultContainer.textContent = '';
  }

  // Check if all dice are used exactly once
  function allDiceUsed() {
    return usedDiceIndices.size === diceValues.length;
  }

  // Evaluate expression safely, supporting factorial and exponentiation
  function evaluateExpression(expr) {
    // Replace '^' with '**'
    let e = expr.replace(/\^/g, '**');

    // Replace factorials: use a function to replace n! with fact(n)
    e = e.replace(/(\d+)!/g, (match, n) => {
      return `fact(${n})`;
    });

    // Factorial function defined here
    function fact(n) {
      n = Number(n);
      if (!Number.isInteger(n) || n < 0) throw new Error('Factorial only defined for non-negative integers');
      if (n > 20) throw new Error('Factorial input too large');
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    }

    // Use Function constructor to evaluate safely
    // eslint-disable-next-line no-new-func
    const fn = new Function('fact', `return ${e};`);
    return fn(fact);
  }

  // Calculate score = abs(result - target)
  function calculateScore(result, target) {
    return Math.abs(result - target);
  }

  // Render the whole game for current index
  function renderGame() {
    diceValues = generateDice(currentGameIndex);
    clearExpression();

    renderDice();

    const dateStr = formatDateReadable(getDateFromGameNumber(currentGameIndex));
    document.getElementById('game-date').textContent = dateStr;

    const target = generateTarget(currentGameIndex);
    document.getElementById('target-number').textContent = target;

    renderHistory();
  }

  // Render last 5 game results in history table
  function renderHistory() {
    historyBody.innerHTML = '';
    // Sort keys descending and get last 5
    const keys = Object.keys(gameData.history)
      .map(k => Number(k))
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

  // Submit current expression
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

    const target = generateTarget(currentGameIndex);
    const score = calculateScore(val, target);

    resultContainer.textContent = `Result: ${val.toFixed(4)} | Target: ${target} | Score: ${score}`;

    // Save to history
    gameData.history[currentGameIndex] = {
      dice: diceValues,
      expression: expression,
      score: score
    };

    // Update streak
    if (score === 0) {
      gameData.streak = (gameData.streak || 0) + 1;
      showQu0xAnimation();
    } else {
      gameData.streak = 0;
    }

    saveGameData();
    renderHistory();
  }

  // Show "Qu0x!" animation for 3 seconds
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

  // Setup event listeners
  function setupButtons() {
    // Dice handled during renderDice

    // Operator buttons
    Object.entries(operatorButtons).forEach(([op, btn]) => {
      btn.addEventListener('click', () => {
        addOperator(op === 'pow' ? '^' : op);
      });
    });

    backspaceBtn.addEventListener('click', backspace);
    clearBtn.addEventListener('click', clearExpression);
    submitBtn.addEventListener('click', submitExpression);

    prevGameBtn.addEventListener('click', () => {
      if (currentGameIndex > 0) {
        currentGameIndex--;
        renderGame();
      }
    });

    nextGameBtn.addEventListener('click', () => {
      const maxGameIndex = getGameNumber(new Date());
      if (currentGameIndex < maxGameIndex) {
        currentGameIndex++;
        renderGame();
      }
    });
  }

  function init() {
    loadGameData();
    setupButtons();
    renderGame();
  }

  init();
})();
