const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Invalid Authorization format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = { userId: decoded.userId };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};