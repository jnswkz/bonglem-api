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

// Pre-save middleware to parse comma-separated imageUrl into images array
productSchema.pre("save", function(next) {
  if (this.imageUrl && this.imageUrl.includes(",")) {
    // Split comma-separated URLs and trim whitespace
    const urls = this.imageUrl.split(",").map(url => url.trim()).filter(url => url);
    if (urls.length > 0) {
      // First URL becomes the main imageUrl
      this.imageUrl = urls[0];
      // All URLs (including first) go into images array
      this.images = urls;
    }
  } else if (this.imageUrl && (!this.images || this.images.length === 0)) {
    // If single imageUrl and no images array, set images to contain the single URL
    this.images = [this.imageUrl];
  }
  next();
});

// Pre-findOneAndUpdate middleware to handle updates
productSchema.pre("findOneAndUpdate", function(next) {
  const update = this.getUpdate();
  if (update && update.imageUrl && update.imageUrl.includes(",")) {
    const urls = update.imageUrl.split(",").map(url => url.trim()).filter(url => url);
    if (urls.length > 0) {
      update.imageUrl = urls[0];
      update.images = urls;
    }
  } else if (update && update.imageUrl && !update.images) {
    update.images = [update.imageUrl];
  }
  next();
});

// Virtual for formatted price
productSchema.virtual("formattedPrice").get(function() {
  return this.price.toLocaleString("vi-VN");
});

// Ensure virtuals are included in JSON output
productSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
