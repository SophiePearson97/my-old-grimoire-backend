const mongoose = require("mongoose");

module.exports = async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Missing MONGODB_URI in .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
};