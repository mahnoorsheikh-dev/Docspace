const jwt = require("jsonwebtoken");
const { User } = require("../database");

async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.docspace_token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Authentication required" });
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: "Authentication is not configured" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("+password_hash");
    if (!user) return res.status(401).json({ error: "Invalid or expired session" });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

module.exports = { authenticate };
