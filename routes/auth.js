const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");

router.post("/signup", authCtrl.signup);
router.post("/login", authCtrl.login);

router.post("/register", authCtrl.signup);

module.exports = router;