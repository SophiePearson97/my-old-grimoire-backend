require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDb = require("./config/db");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

connectDb();

app.get("/", (req, res) => {
  res.status(200).json({ message: "API running" });
});

module.exports = app;