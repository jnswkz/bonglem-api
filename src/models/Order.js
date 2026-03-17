const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  imageUrl: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    match: [/.+@.+\..+/, "Invalid email format"],
    trim: true
  },
  facebookLink: {
    type: String,
    trim: true
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: "Order must have at least one item"
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },

  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "shipping", "completed", "cancelled"],
    default: "pending"
  },
  note: {
    type: String,
    default: ""
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "bank_transfer"],
    default: "cod"
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "pending", "paid", "cancelled", "expired", "failed"],
    default: "unpaid"
  },
  customerConfirmationEmailSentAt: {
    type: Date,
    default: null
  },
  payos: {
    orderCode: Number,
    paymentLinkId: String,
    checkoutUrl: String,
    qrCode: String,
    status: {
      type: String,
      enum: ["PENDING", "CANCELLED", "UNDERPAID", "PAID", "EXPIRED", "PROCESSING", "FAILED"],
      default: null
    },
    expiredAt: Number,
    amountPaid: {
      type: Number,
      default: 0
    },
    paidAt: Date,
    webhookReceivedAt: Date,
    lastWebhookCode: String,
    lastWebhookDesc: String
  }
}, {
  timestamps: true
});

// Index for faster queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ "payos.orderCode": 1 }, { sparse: true });

module.exports = mongoose.model("Order", orderSchema);
