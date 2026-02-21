const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameEn: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ["active", "draft", "archived"],
    default: "active"
  },
  imageUrl: {
    type: String,
    default: ""
  },
  images: [{
    type: String
  }],
  description: {
    type: String,
    default: ""
  },
  descriptionEn: {
    type: String,
    default: ""
  },
  category: {
    type: String,
    enum: ["love", "baby", "special", "other"],
    default: "other"
  }
}, {
  timestamps: true
});

// Virtual for formatted price
productSchema.virtual("formattedPrice").get(function() {
  return this.price.toLocaleString("vi-VN");
});

// Ensure virtuals are included in JSON output
productSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
