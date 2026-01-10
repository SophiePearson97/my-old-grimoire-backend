const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Book = require("../models/Book");

const parseMaybeJson = (val) => {
  if (!val) return null;
  if (typeof val === "object") return val;
  return JSON.parse(val);
};

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
  try {
    const filename = imageUrl.split("/images/")[1];
    if (!filename) return;
    fs.unlink(path.join(__dirname, "..", "images", filename), () => {});
  } catch (_) {}
};

// GET /api/books
exports.getAll = async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json(error);
  }
};

// GET /api/books/:id
exports.getOne = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    res.status(200).json(book);
  } catch (error) {
    res.status(400).json(error);
  }
};

// GET /api/books/bestrating
exports.getBestRating = async (req, res) => {
  try {
    const top3 = await Book.find().sort({ averageRating: -1 }).limit(3);
    res.status(200).json(top3);
  } catch (error) {
    res.status(500).json(error);
  }
};

// POST /api/books  (multipart: book + image)
exports.create = async (req, res) => {
  try {
    const bookData = parseMaybeJson(req.body.book);
    const filename = await saveOptimizedImage(req);

    if (!bookData || !filename) {
      return res.status(400).json(new Error("Bad request"));
    }

    // never trust frontend userId: force from token
    bookData.userId = req.auth.userId;

    const book = new Book({
      ...bookData,
      imageUrl: buildImageUrl(req, filename),
      ratings: [],
      averageRating: 0,
    });

    await book.save();
    res.status(201).json({ message: "Book saved successfully!" });
  } catch (error) {
    res.status(400).json(error);
  }
};

// PUT /api/books/:id (JSON OR multipart book+image)
exports.update = async (req, res) => {
  try {
    const existing = await Book.findById(req.params.id);

    // owner-only
    if (!existing || existing.userId !== req.auth.userId) {
      return res.status(403).json(new Error("unauthorized request."));
    }

    const incoming = req.file ? parseMaybeJson(req.body.book) : req.body;

    let imageUrl = existing.imageUrl;
    if (req.file) {
      deleteImageFromUrl(existing.imageUrl);
      const filename = await saveOptimizedImage(req);
      imageUrl = buildImageUrl(req, filename);
    }

    // don’t allow editing ratings via PUT
    delete incoming.ratings;
    delete incoming.averageRating;
    delete incoming.userId;

    await Book.updateOne(
      { _id: req.params.id },
      { ...incoming, imageUrl, userId: req.auth.userId }
    );

    res.status(200).json({ message: "Book updated successfully!" });
  } catch (error) {
    res.status(400).json(error);
  }
};

// DELETE /api/books/:id
exports.remove = async (req, res) => {
  try {
    const existing = await Book.findById(req.params.id);

    if (!existing || existing.userId !== req.auth.userId) {
      return res.status(403).json(new Error("unauthorized request."));
    }

    deleteImageFromUrl(existing.imageUrl);
    await Book.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: "Book deleted successfully!" });
  } catch (error) {
    res.status(400).json(error);
  }
};

// POST /api/books/:id/rating
exports.rate = async (req, res) => {
  try {
    const { userId, rating } = req.body;

    if (typeof rating !== "number" || rating < 0 || rating > 5) {
      return res.status(400).json(new Error("Rating must be between 0 and 5"));
    }

    const book = await Book.findById(req.params.id);

    // cannot rate twice
    const already = book.ratings.some((r) => r.userId === userId);
    if (already) {
      return res.status(400).json(new Error("It is not possible to edit a rating."));
    }

    book.ratings.push({ userId, grade: rating });

    // update averageRating
    const sum = book.ratings.reduce((acc, r) => acc + r.grade, 0);
    book.averageRating = sum / book.ratings.length;

    await book.save();
    res.status(200).json(book);
  } catch (error) {
    res.status(400).json(error);
  }
};