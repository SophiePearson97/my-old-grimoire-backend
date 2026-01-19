const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashed,
    });

    return res.status(201).json({ message: "User created" });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.status(200).json({
      userId: user._id.toString(),
      token,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};