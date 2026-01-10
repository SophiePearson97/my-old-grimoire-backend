require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDb = require("./config/db");
const authRoutes = require("./routes/auth");

const path = require("path");
const bookRoutes = require("./routes/books");


const app = express();

connectDb();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/api/books", bookRoutes);

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.status(200).json({ message: "API running" }));

module.exports = app;