body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center;
  padding: 20px;
  background-color: #f9f9f9;
  color: #333;
}

h1 {
  font-size: 2.5em;
  margin-bottom: 0.2em;
}

.rules {
  font-size: 1em;
  max-width: 600px;
  margin: 0 auto 1em;
}

.dice-row {
  display: flex;
  justify-content: center;
  margin: 10px 0;
}

.die {
  font-size: 2em;
  font-weight: bold;
  background: linear-gradient(45deg, #ffd700, #ffec8b);
  border: 2px solid #aaa;
  border-radius: 10px;
  width: 50px;
  height: 50px;
  margin: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
}

#target-container {
  font-size: 1.5em;
  margin: 10px;
}

#input-container input {
  font-size: 1.2em;
  padding: 5px;
  width: 300px;
}

#input-container button {
  font-size: 1.2em;
  margin-left: 10px;
  padding: 5px 15px;
}

#buttons-container {
  margin: 10px;
}

#buttons-container .op {
  font-size: 1.2em;
  margin: 3px;
  padding: 5px 10px;
}

#result-container {
  font-size: 1.2em;
  margin: 10px;
}

#message-container {
  font-size: 1.2em;
  font-weight: bold;
  margin: 10px;
}

#score, #streak {
  font-size: 1.2em;
  margin: 10px;
}

#history {
  margin: 20px auto;
  border-collapse: collapse;
  width: 90%;
  max-width: 600px;
}

#history th, #history td {
  border: 1px solid #ccc;
  padding: 8px 12px;
}

#history th {
  background-color: #eee;
}
