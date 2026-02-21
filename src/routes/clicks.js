const express = require("express");
const mongoose = require("mongoose");
const ProductClick = require("../models/ProductClick");
const Product = require("../models/Product");

const router = express.Router();

// POST /api/clicks/:productId - Track a product click/view
router.post("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Upsert: increment click count or create new record
    const click = await ProductClick.findOneAndUpdate(
      { productId: productId },
      {
        $inc: { clickCount: 1 },
        $set: { lastClickedAt: new Date() }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      success: true,
      productId: productId,
      clickCount: click.clickCount,
      lastClickedAt: click.lastClickedAt
    });
  } catch (error) {
    console.error("Error tracking click:", error);
    res.status(500).json({ message: "Failed to track click" });
  }
});

// GET /api/clicks/:productId - Get click count for a product
router.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const click = await ProductClick.findOne({ productId: productId });
    
    res.json({
      productId: productId,
      clickCount: click ? click.clickCount : 0,
      lastClickedAt: click ? click.lastClickedAt : null
    });
  } catch (error) {
    console.error("Error fetching click count:", error);
    res.status(500).json({ message: "Failed to fetch click count" });
  }
});

// GET /api/clicks - Get all click statistics (admin)
router.get("/", async (req, res) => {
  try {
    const { sort = "clickCount", order = "desc", limit = 50 } = req.query;

    const sortOrder = order === "asc" ? 1 : -1;
    const sortField = sort === "recent" ? "lastClickedAt" : "clickCount";

    const clicks = await ProductClick.find()
      .sort({ [sortField]: sortOrder })
      .limit(parseInt(limit))
      .populate("productId", "name nameEn imageUrl price");

    // Calculate total views
    const totalResult = await ProductClick.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$clickCount" } } }
    ]);
    const totalViews = totalResult.length > 0 ? totalResult[0].totalViews : 0;

    res.json({
      totalViews,
      productCount: clicks.length,
      clicks: clicks.map(c => ({
        productId: c.productId?._id || c.productId,
        product: c.productId,
        clickCount: c.clickCount,
        lastClickedAt: c.lastClickedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching click stats:", error);
    res.status(500).json({ message: "Failed to fetch click statistics" });
  }
});

module.exports = router;
