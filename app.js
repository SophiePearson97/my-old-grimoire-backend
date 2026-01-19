require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");

const app = express();

// Security + logging
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

// Parse JSON bodies
app.use(express.json());

// Serve images as static files
app.use("/images", express.static(path.join(__dirname, "images")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "API running" });
});

// Connect DB once when app loads
connectDB();

module.exports = app;