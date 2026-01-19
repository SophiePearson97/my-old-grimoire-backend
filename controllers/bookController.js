const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Book = require("../models/Book");

/* ---------- helpers ---------- */

const cleanId = (id) => String(id).replace(/["\\]/g, "").trim();

const buildImageUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/images/${filename}`;

const saveOptimizedImage = async (req) => {
  if (!req.file) return null;

  const safeBase = req.file.originalname
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");

  const filename = `${safeBase}-${Date.now()}.webp`;
  const outPath = path.join(__dirname, "..", "images", filename);

  await sharp(req.file.buffer)
    .resize({ width: 900, withoutEnlargement: true })
    .toFormat("webp", { quality: 80 })
    .toFile(outPath);

  return filename;
};

const deleteImageFromUrl = (imageUrl) => {
  if (!imageUrl) return;
  const filename = imageUrl.split("/images/")[1];
  if (!filename) return;
  fs.unlink(path.join(__dirname, "..", "images", filename), () => {});
};

/* ---------- controllers ---------- */

// GET /api/books
exports.getAll = async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/books/:id
exports.getOne = async (req, res) => {
  try {
    const bookId = cleanId(req.params.id);
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.status(200).json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/books/bestrating
exports.getBestRating = async (req, res) => {
  try {
    const books = await Book.find().sort({ averageRating: -1 }).limit(3);
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/books
exports.create = async (req, res) => {
  try {
    const bookData = JSON.parse(req.body.book);
    const filename = await saveOptimizedImage(req);

    bookData.userId = req.auth.userId;

    const book = new Book({
      ...bookData,
      imageUrl: buildImageUrl(req, filename),
      ratings: [],
      averageRating: 0,
    });

    await book.save();
    res.status(201).json({ message: "Book saved successfully!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/books/:id
exports.update = async (req, res) => {
  try {
    const bookId = cleanId(req.params.id);
    const book = await Book.findById(bookId);

    if (!book || book.userId !== req.auth.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    let updatedData = req.body;

    if (req.file) {
      deleteImageFromUrl(book.imageUrl);
      const filename = await saveOptimizedImage(req);
      updatedData = JSON.parse(req.body.book);
      updatedData.imageUrl = buildImageUrl(req, filename);
    }

    delete updatedData.userId;
    delete updatedData.ratings;
    delete updatedData.averageRating;

    await Book.updateOne({ _id: bookId }, updatedData);
    res.status(200).json({ message: "Book updated successfully!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/books/:id
exports.remove = async (req, res) => {
  try {
    const bookId = cleanId(req.params.id);
    const book = await Book.findById(bookId);

    if (!book || book.userId !== req.auth.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    deleteImageFromUrl(book.imageUrl);
    await Book.deleteOne({ _id: bookId });

    res.status(200).json({ message: "Book deleted successfully!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/books/:id/rating
exports.rate = async (req, res) => {
  try {
    const bookId = cleanId(req.params.id);
    const userId = req.auth.userId;
    const grade = Number(req.body.rating);

    if (Number.isNaN(grade) || grade < 0 || grade > 5) {
      return res.status(400).json({ error: "Rating must be between 0 and 5" });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });

    const alreadyRated = book.ratings.some((r) => r.userId === userId);
    if (alreadyRated) {
      return res.status(400).json({ error: "User already rated this book" });
    }

    book.ratings.push({ userId, grade });

    const sum = book.ratings.reduce((acc, r) => acc + r.grade, 0);
    book.averageRating = Math.round((sum / book.ratings.length) * 10) / 10;

    await book.save();
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};