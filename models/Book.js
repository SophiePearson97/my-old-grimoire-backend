const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    grade: { type: Number, required: true, min: 0, max: 5 },
  },
  { _id: false }
);

const bookSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    year: { type: Number, required: true },
    genre: { type: String, required: true, trim: true },
    ratings: { type: [ratingSchema], default: [] },
    averageRating: { type: Number, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.model("Book", bookSchema);