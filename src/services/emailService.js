const nodemailer = require("nodemailer");

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send order confirmation email to customer
 * @param {Object} order - The order document
 * @returns {Promise<boolean>} - Whether email was sent successfully
 */
const sendOrderConfirmationEmail = async (order) => {
  // Skip if no email configured or customer has no email
  if (!process.env.SMTP_USER || !order.customerEmail) {
    console.log("Email not sent: Missing SMTP config or customer email");
    return false;
  }

  try {
    const transporter = createTransporter();

    // Format order items for email
    const itemsList = order.items
      .map(
        (item) =>
          `• ${item.name} x${item.quantity} - ${item.price.toLocaleString("vi-VN")}đ`
      )
      .join("\n");

    const emailContent = {
      from: `"Bông Lém" <${process.env.SMTP_USER}>`,
      to: order.customerEmail,
      subject: `Xác nhận đơn hàng #${order._id} - Bông Lém`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #5C4033; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F4A3B4, #FFB6C1); padding: 30px; text-align: center; border-radius: 16px 16px 0 0; }
            .header h1 { color: #fff; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .content { background: #FDFBF7; padding: 30px; border: 1px solid #E8E4DD; border-top: none; }
            .order-id { background: #FFF5F7; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
            .order-id strong { color: #F4A3B4; font-size: 18px; }
            .section { margin-bottom: 25px; }
            .section h3 { color: #5C4033; margin: 0 0 10px; font-size: 16px; border-bottom: 2px solid #F4A3B4; padding-bottom: 5px; }
            .items { background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #E8E4DD; }
            .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #E8E4DD; }
            .item:last-child { border-bottom: none; }
            .total { background: #F4A3B4; color: #fff; padding: 15px; border-radius: 8px; text-align: right; font-size: 18px; font-weight: bold; }
            .footer { background: #5C4033; color: #fff; padding: 20px; text-align: center; border-radius: 0 0 16px 16px; }
            .footer a { color: #F4A3B4; }
            .info-row { display: flex; margin-bottom: 8px; }
            .info-label { font-weight: 600; min-width: 120px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌸 Bông Lém 🌸</h1>
              <p style="color: #fff; margin: 10px 0 0;">Cảm ơn bạn đã đặt hàng!</p>
            </div>
            
            <div class="content">
              <div class="order-id">
                <p style="margin: 0;">Mã đơn hàng của bạn</p>
                <strong>#${order._id}</strong>
              </div>

              <div class="section">
                <h3>📋 Thông tin khách hàng</h3>
                <div class="info-row">
                  <span class="info-label">Họ tên:</span>
                  <span>${order.customerName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Số điện thoại:</span>
                  <span>${order.customerPhone}</span>
                </div>
                ${order.customerEmail ? `
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span>${order.customerEmail}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="info-label">Thanh toán:</span>
                  <span>${order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}</span>
                </div>
              </div>

              <div class="section">
                <h3>🛒 Chi tiết đơn hàng</h3>
                <div class="items">
                  ${order.items.map(item => `
                    <div class="item">
                      <span>${item.name} × ${item.quantity}</span>
                      <span>${(item.price * item.quantity).toLocaleString("vi-VN")}đ</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="total">
                Tổng cộng: ${order.total.toLocaleString("vi-VN")}đ
              </div>

              ${order.note ? `
              <div class="section" style="margin-top: 20px;">
                <h3>📝 Ghi chú</h3>
                <p style="margin: 0; background: #fff; padding: 10px; border-radius: 8px;">${order.note}</p>
              </div>
              ` : ''}

              <div style="margin-top: 25px; padding: 15px; background: #FFF5F7; border-radius: 8px; text-align: center;">
                <p style="margin: 0;">📍 <strong>Địa chỉ nhận hàng:</strong></p>
                <p style="margin: 5px 0 0;">Cơ sở B, 279 Nguyễn Tri Phương, Phường Điện Hồng, Quận 10, TP. Hồ Chí Minh</p>
              </div>

              <p style="margin-top: 20px; text-align: center; color: #888;">
                Chúng mình sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất! 💕
              </p>
            </div>

            <div class="footer">
              <p style="margin: 0;">Bông Lém - Những món quà nhỏ mang niềm vui to</p>
              <p style="margin: 10px 0 0;">
                <a href="https://bonglem.vercel.app">bonglem.vercel.app</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
BÔNG LÉM - XÁC NHẬN ĐƠN HÀNG
============================

Mã đơn hàng: #${order._id}

THÔNG TIN KHÁCH HÀNG:
- Họ tên: ${order.customerName}
- Số điện thoại: ${order.customerPhone}
${order.customerEmail ? `- Email: ${order.customerEmail}` : ''}
- Thanh toán: ${order.paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'}

CHI TIẾT ĐƠN HÀNG:
${itemsList}

TỔNG CỘNG: ${order.total.toLocaleString("vi-VN")}đ

${order.note ? `GHI CHÚ: ${order.note}` : ''}

ĐỊA CHỈ NHẬN HÀNG:
Cơ sở B, 279 Nguyễn Tri Phương, Phường Điện Hồng, Quận 10, TP. Hồ Chí Minh

Chúng mình sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất!

---
Bông Lém - Những món quà nhỏ mang niềm vui to
https://bonglem.vercel.app
      `.trim(),
    };

    await transporter.sendMail(emailContent);
    console.log(`Order confirmation email sent to ${order.customerEmail}`);
    return true;
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return false;
  }
};

/**
 * Send notification email to admin about new order
 * @param {Object} order - The order document
 * @returns {Promise<boolean>} - Whether email was sent successfully
 */
const sendAdminNotificationEmail = async (order) => {
  if (!process.env.SMTP_USER || !process.env.ADMIN_EMAIL) {
    return false;
  }

  try {
    const transporter = createTransporter();

    const itemsList = order.items
      .map((item) => `• ${item.name} x${item.quantity}`)
      .join("\n");

    await transporter.sendMail({
      from: `"Bông Lém System" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🔔 Đơn hàng mới #${order._id} - ${order.customerName}`,
      text: `
ĐƠN HÀNG MỚI!

Mã đơn: #${order._id}
Khách hàng: ${order.customerName}
SĐT: ${order.customerPhone}
Email: ${order.customerEmail || 'Không có'}
Facebook: ${order.facebookLink || 'Không có'}

Sản phẩm:
${itemsList}

Tổng: ${order.total.toLocaleString("vi-VN")}đ
Thanh toán: ${order.paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'}

${order.note ? `Ghi chú: ${order.note}` : ''}
      `.trim(),
    });

    console.log("Admin notification email sent");
    return true;
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    return false;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendAdminNotificationEmail,
};
