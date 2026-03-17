require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const clickRoutes = require("./routes/clicks");
const { hasPayOSConfig, confirmWebhookUrl } = require("./services/payosService");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bonglem";

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/clicks", clickRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);

      if (hasPayOSConfig() && process.env.PAYOS_WEBHOOK_URL) {
        confirmWebhookUrl()
          .then((result) => {
            console.log(`payOS webhook confirmed: ${result.webhookUrl}`);
          })
          .catch((error) => {
            console.error("payOS webhook confirmation failed:", error.message);
          });
      }
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
