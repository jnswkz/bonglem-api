const mongoose = require("mongoose");

const sessionItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    imageUrl: String,
  },
  { _id: false }
);

const paymentSessionSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    facebookLink: {
      type: String,
      trim: true,
    },
    items: {
      type: [sessionItemSchema],
      required: true,
      validate: {
        validator: function validateItems(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Payment session must have at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer"],
      default: "bank_transfer",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "cancelled", "expired", "failed"],
      default: "pending",
    },
    createdOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    orderCreatedAt: {
      type: Date,
      default: null,
    },
    payos: {
      orderCode: Number,
      paymentLinkId: String,
      checkoutUrl: String,
      qrCode: String,
      status: {
        type: String,
        enum: ["PENDING", "CANCELLED", "UNDERPAID", "PAID", "EXPIRED", "PROCESSING", "FAILED"],
        default: "PENDING",
      },
      expiredAt: Number,
      amountPaid: {
        type: Number,
        default: 0,
      },
      paidAt: Date,
      webhookReceivedAt: Date,
      lastWebhookCode: String,
      lastWebhookDesc: String,
    },
  },
  {
    timestamps: true,
  }
);

paymentSessionSchema.index({ "payos.orderCode": 1 }, { sparse: true });
paymentSessionSchema.index({ createdOrderId: 1 });
paymentSessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PaymentSession", paymentSessionSchema);
