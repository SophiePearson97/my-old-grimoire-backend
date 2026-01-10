const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const upload = require("../middleware/multer");
const bookCtrl = require("../controllers/bookController");

router.use(auth);

router.get("/", bookCtrl.getAll);
router.get("/bestrating", bookCtrl.getBestRating);
router.get("/:id", bookCtrl.getOne);

router.post("/", upload, bookCtrl.create);
router.put("/:id", upload, bookCtrl.update);
router.delete("/:id", bookCtrl.remove);

router.post("/:id/rating", bookCtrl.rate);

module.exports = router;