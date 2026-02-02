const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const upload = require("../middleware/multer");
const bookCtrl = require("../controllers/bookController");

// PUBLIC routes (no auth)
router.get("/", bookCtrl.getAll);
router.get("/:id", bookCtrl.getOne);

// Recommendations endpoint(s) (public)
router.get("/bestrating", bookCtrl.getBestRating);
router.get("/best-rated", bookCtrl.getBestRating);

// PROTECTED routes (auth required)
router.post("/", auth, upload, bookCtrl.create);
router.put("/:id", auth, upload, bookCtrl.update);
router.delete("/:id", auth, bookCtrl.remove);
router.post("/:id/rating", auth, bookCtrl.rate);

module.exports = router;