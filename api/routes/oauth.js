/**
 * OAuth Routes - Google Authentication
 */

const express = require("express");
const router = express.Router();
const passport = require("passport");

const OAUTH_ENABLED = process.env.OAUTH_ENABLED === "true";

// GET /api/oauth/status
router.get("/status", (req, res) => {
  if (!OAUTH_ENABLED) {
    return res.json({ enabled: false, message: "OAuth not enabled. Using server API keys." });
  }
  res.json({
    enabled: true,
    user: req.user || null,
    loggedIn: !!req.user,
    message: req.user ? `Logged in as ${req.user.email}` : "Not logged in"
  });
});

// GET /api/oauth/google/login
router.get("/google/login", (req, res, next) => {
  if (!OAUTH_ENABLED) {
    return res.status(403).json({ error: "OAuth not enabled" });
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })(req, res, next);
});

// GET /api/oauth/google/callback
router.get("/google/callback",
  (req, res, next) => {
    if (!OAUTH_ENABLED) return res.status(403).json({ error: "OAuth not enabled" });
    next();
  },
  passport.authenticate("google", { failureRedirect: "https://druygon.my.id/ai-learn/?auth=failed" }),
  (req, res) => {
    res.redirect("https://druygon.my.id/ai-learn/?auth=success");
  }
);

// GET /api/oauth/me
router.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ loggedIn: false, user: null });
  }
  res.json({ loggedIn: true, user: req.user });
});

// POST /api/oauth/logout
router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session && req.session.destroy(() => {});
    res.json({ success: true, message: "Logged out" });
  });
});

module.exports = router;
