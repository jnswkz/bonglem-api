const mongoose = require("mongoose");

const productClickSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    unique: true
  },
  clickCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastClickedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for sorting by popularity
productClickSchema.index({ clickCount: -1 });

// Index for recent views
productClickSchema.index({ lastClickedAt: -1 });

module.exports = mongoose.model("ProductClick", productClickSchema);
