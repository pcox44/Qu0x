document.addEventListener("DOMContentLoaded", () => {
  const diceContainer = document.getElementById("dice-container");
  const targetSpan = document.getElementById("target");
  const expressionDisplay = document.getElementById("expression-display");
  const submitBtn = document.getElementById("submit");
  const clearBtn = document.getElementById("clear");

  const dice = [1, 2, 3, 4, 5];
  const target = 42;

  let expression = "";
  let usedDice = [];

  dice.forEach(value => {
    const die = document.createElement("div");
    die.className = "die";
    die.setAttribute("data-value", value);
    die.textContent = value;
    die.addEventListener("click", () => {
      if (!usedDice.includes(value)) {
        expression += value;
        expressionDisplay.textContent = expression;
        usedDice.push(value);
        die.style.opacity = 0.5;
      }
    });
    diceContainer.appendChild(die);
  });

  targetSpan.textContent = target;

  submitBtn.addEventListener("click", () => {
    try {
      const result = eval(expression);
      alert("Result: " + result);
    } catch (e) {
      alert("Invalid expression.");
    }
  });

  clearBtn.addEventListener("click", () => {
    expression = "";
    usedDice = [];
    expressionDisplay.textContent = "";
    document.querySelectorAll(".die").forEach(die => die.style.opacity = 1);
  });
});
