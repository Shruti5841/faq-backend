require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
const translate = require("@vitalets/google-translate-api");

const app = express();
const redis = new Redis({
  host: "redis", // Use the name of the service defined in docker-compose.yml
  port: 6379, // Default Redis port
});

const PORT = process.env.PORT || 8080; // Change 8000 to 8080
const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key";

app.use(cors());
app.use(bodyParser.json());

// Database connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/faq_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const FAQSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  translations: { type: Object, default: {} },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});

const FAQ = mongoose.model("FAQ", FAQSchema);

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access denied" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// Role-based access control
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Access restricted to admin users" });
  }
  next();
};

// API Routes
app.get("/api/faqs", async (req, res) => {
  const lang = req.query.lang || "en";
  const cacheKey = `faqs_${lang}`;

  const cachedData = await redis.get(cacheKey);
  if (cachedData) return res.json(JSON.parse(cachedData));

  const faqs = await FAQ.find();
  const translatedFaqs = await Promise.all(
    faqs.map(async (faq) => {
      const translatedQuestion =
        faq.translations[lang]?.question || faq.question;
      const translatedAnswer = faq.translations[lang]?.answer || faq.answer;
      return {
        id: faq._id,
        question: translatedQuestion,
        answer: translatedAnswer,
      };
    })
  );

  await redis.set(cacheKey, JSON.stringify(translatedFaqs), "EX", 3600); // Cache for 1 hour
  res.json(translatedFaqs);
});

app.post("/api/faqs", authenticateToken, authorizeAdmin, async (req, res) => {
  const { question, answer } = req.body;
  const translations = {};

  try {
    const translatedHi = await translate(question, { to: "hi" });
    const translatedBn = await translate(question, { to: "bn" });
    translations["hi"] = { question: translatedHi.text, answer };
    translations["bn"] = { question: translatedBn.text, answer };
  } catch (error) {
    console.error("Translation error:", error);
  }

  const faq = new FAQ({ question, answer, translations, role: "admin" });
  await faq.save();
  res.status(201).json(faq);
});

// JWT Authentication Routes
app.get("/api/login", (req, res) => {
  const { username, role } = req.body;
  const token = jwt.sign({ username, role }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token });
});

// Ensure server is properly closed
process.on("SIGINT", async () => {
  console.log("Closing Redis connection...");
  await redis.quit();
  process.exit(0);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
