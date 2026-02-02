const multer = require("multer");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/pjpeg",
  "image/jfif",
];

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      return cb(
        new Error(
          `Invalid image type: ${file.mimetype}. Allowed: JPG, PNG, WEBP`
        )
      );
    }
    cb(null, true);
  },
}).single("image");