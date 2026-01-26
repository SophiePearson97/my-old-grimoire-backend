const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const upload = require("../middleware/multer");
const bookCtrl = require("../controllers/bookController");

// (no auth required)
router.get("/bestrating", bookCtrl.getBestRating);
router.get("/", bookCtrl.getAll);
router.get("/:id", bookCtrl.getOne);

// (auth required)
router.post("/", auth, upload, bookCtrl.create);
router.put("/:id", auth, upload, bookCtrl.update);
router.delete("/:id", auth, bookCtrl.remove);
router.post("/:id/rating", auth, bookCtrl.rate);

module.exports = router;