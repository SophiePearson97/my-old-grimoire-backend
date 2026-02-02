const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Book = require("../models/Book");

/* ================= HELPERS ================= */

const cleanId = (id) =>
  decodeURIComponent(String(id || ""))
    .replace(/%22/g, "")
    .replace(/["\\]/g, "")
    .trim();

const buildImageUrl = (req, filename) => {
  const baseUrl =
    process.env.BACKEND_URL ||
    `${req.protocol}://localhost:${process.env.PORT || 4000}`;
  return `${baseUrl}/images/${filename}`;
};

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

// Pull initial rating from whatever the frontend sends
const extractInitialRating = (bookData) => {
  if (!bookData) return null;

  // most common keys across versions
  const raw =
    bookData.rating ??
    bookData.grade ??
    bookData.note ??
    bookData.averageRating ??
    null;

  // sometimes ratings is a number or an array
  if (raw === null && bookData.ratings !== undefined) {
    if (typeof bookData.ratings === "number") return bookData.ratings;
    if (Array.isArray(bookData.ratings) && bookData.ratings[0]) {
      const first = bookData.ratings[0];
      return first.grade ?? first.rating ?? first.note ?? null;
    }
  }

  return raw;
};

const sanitizeBookData = (bookData) => {
  // remove things frontend might send that should not be stored directly
  delete bookData.userId; // always force from token
  delete bookData.rating;
  delete bookData.grade;
  delete bookData.note;
  delete bookData.averageRating;
  delete bookData.ratings;
  return bookData;
};

/* ================= CONTROLLERS ================= */

// GET /api/books
exports.getAll = async (req, res) => {
  try {
    const books = await Book.find();
    return res.status(200).json(books);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/books/:id
exports.getOne = async (req, res) => {
  try {
    const bookId = cleanId(req.params.id);
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });
    return res.status(200).json(book);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// GET /api/books/bestrating
exports.getBestRating = async (req, res) => {
  try {
    const books = await Book.find().sort({ averageRating: -1 }).limit(3);
    return res.status(200).json(books);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/books (multipart form-data: book + image)
exports.create = async (req, res) => {
  try {
    const bookData = JSON.parse(req.body.book);
    const filename = await saveOptimizedImage(req);

    if (!filename) {
      return res.status(400).json({ error: "Image is required" });
    }

    const userId = req.auth.userId;

    // ✅ grab rating from any possible frontend key
    const initialRaw = extractInitialRating(bookData);
    const initialRating = initialRaw === null ? null : Number(initialRaw);

    let ratings = [];
    let averageRating = 0;

    if (
      initialRating !== null &&
      !Number.isNaN(initialRating) &&
      initialRating >= 0 &&
      initialRating <= 5
    ) {
      ratings = [{ userId, grade: initialRating }];
      averageRating = initialRating;
    }

    // ✅ clean fields + force userId
    sanitizeBookData(bookData);
    bookData.userId = userId;

    const book = new Book({
      ...bookData,
      imageUrl: buildImageUrl(req, filename),
      ratings,
      averageRating,
    });

    await book.save();
    return res.status(201).json({ message: "Book saved successfully!" });
  } catch (err) {
    return res.status(400).json({ error: err.message });
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
    delete updatedData.rating;
    delete updatedData.grade;
    delete updatedData.note;

    await Book.updateOne({ _id: bookId }, updatedData);
    return res.status(200).json({ message: "Book updated successfully!" });
  } catch (err) {
    return res.status(400).json({ error: err.message });
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

    return res.status(200).json({ message: "Book deleted successfully!" });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// POST /api/books/:id/rating
exports.rate = async (req, res) => {
  try {
    const bookId = cleanId(req.params.id);
    const userId = req.auth.userId;

    // accept rating under rating OR grade (frontends vary)
    const raw = req.body?.rating ?? req.body?.grade;
    const grade = Number(raw);

    if (raw === undefined || raw === null || raw === "") {
      return res.status(400).json({ error: "Missing rating" });
    }
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
    return res.status(200).json(book);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};