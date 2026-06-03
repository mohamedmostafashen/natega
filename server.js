const path = require("path");
const express = require("express");
const resultApi = require("./api/result");

const app = express();

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false }));

app.all("/api/result", resultApi);

app.use(express.static(path.join(__dirname, "public"), {
  index: "index.html",
  extensions: ["html"]
}));

app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Local server running: http://localhost:${port}`);
});
