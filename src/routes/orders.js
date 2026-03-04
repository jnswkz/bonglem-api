const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendOrderConfirmationEmail, sendAdminNotificationEmail } = require("../services/emailService");

const router = express.Router();

// GET /api/orders - List all orders (admin)
router.get("/", async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;
    
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));
    
    const total = await Order.countDocuments(filter);
    
    res.json({
      items: orders,
      total,
      hasMore: Number(skip) + orders.length < total
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id - Get single order
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// POST /api/orders - Create new order (from frontend checkout)
router.post("/", async (req, res) => {
  try {
    const { 
      customerName, 
      customerPhone, 
      customerEmail,
      facebookLink, 
      items, 
      note,
      paymentMethod = "cod"
    } = req.body;
    
    // Validate required fields
    if (!customerName || !customerPhone) {
      return res.status(400).json({ 
        message: "Missing required fields: customerName, customerPhone" 
      });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }
    
    // Validate products exist and calculate totals
    const orderItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.productId}` });
      }
      
      if (product.status !== "active") {
        return res.status(400).json({ message: `Product not available: ${product.name}` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }
      
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        imageUrl: product.imageUrl
      });
      
      // Reduce stock
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.quantity }
      });
    }
    
    const total = subtotal;
    
    const order = new Order({
      customerName,
      customerPhone,
      customerEmail,
      facebookLink,
      items: orderItems,
      subtotal,
      total,
      note,
      paymentMethod,
      status: "pending"
    });
    
    await order.save();
    
    // Send confirmation emails (blocking - required for serverless)
    try {
      await Promise.race([
        sendOrderConfirmationEmail(order),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 8000))
      ]);
      console.log("Customer email sent successfully");
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
    }
    
    try {
      await Promise.race([
        sendAdminNotificationEmail(order),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Admin email timeout')), 8000))
      ]);
      console.log("Admin email sent successfully");
    } catch (emailErr) {
      console.error("Admin email send error:", emailErr.message);
    }
    
    res.status(201).json({
      message: "Order created successfully",
      orderId: order._id,
      order
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/orders/:id - Update order status (admin)
router.patch("/:id", async (req, res) => {
  try {
    const { status, note } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (note !== undefined) updateData.note = note;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // If order is cancelled, restore stock
    if (status === "cancelled") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
      }
    }
    
    res.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/orders/:id - Delete order (admin)
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Restore stock for non-cancelled orders
    if (order.status !== "cancelled") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
      }
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

module.exports = router;
