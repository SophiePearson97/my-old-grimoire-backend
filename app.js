require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const connectDb = require("./config/db");
const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");

const app = express();

// ✅ Allow requests from your React app
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// ✅ IMPORTANT: Allow images to be loaded cross-origin (3000 -> 4000)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(morgan("dev"));
app.use(express.json());

// ✅ Serve images folder publicly
app.use(
  "/images",
  express.static(path.join(__dirname, "images"))
);

// ✅ Connect DB
connectDb();

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

// ✅ Health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "API running" });
});

module.exports = app;