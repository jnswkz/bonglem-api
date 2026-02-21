# Bonglem API Server

Backend API server that connects the Bonglem frontend and admin panel with MongoDB.

## Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string
```

3. Seed sample data (optional):
```bash
node src/seed.js
```

4. Start the server:
```bash
npm run dev    # Development with hot reload
npm start      # Production
```

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (admin) |
| PUT | `/api/products/:id` | Update product (admin) |
| DELETE | `/api/products/:id` | Delete product (admin) |

**Query Parameters for GET /api/products:**
- `category`: Filter by category (love, baby, special, other)
- `status`: Filter by status (active, draft, archived, all)
- `search`: Search in name/description

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List all orders (admin) |
| GET | `/api/orders/:id` | Get single order |
| POST | `/api/orders` | Create order (checkout) |
| PATCH | `/api/orders/:id` | Update order status (admin) |

**Create Order Body Example:**
```json
{
  "customerName": "Nguyễn Văn A",
  "customerPhone": "0901234567",
  "customerEmail": "email@example.com",
  "shippingAddress": "123 Đường ABC, Quận 1, TP.HCM",
  "items": [
    { "productId": "...", "quantity": 1 }
  ],
  "note": "Giao buổi sáng",
  "paymentMethod": "cod"
}
```

## Architecture

```
Frontend (bonglem)     API Server         Admin (Electron)
     |                    |                    |
     |   GET /products    |                    |
     |------------------->|                    |
     |   POST /orders     |                    |
     |------------------->|                    |
     |                    |   GET /orders      |
     |                    |<-------------------|
     |                    |   PATCH /orders    |
     |                    |<-------------------|
     |                    |   CRUD /products   |
     |                    |<-------------------|
```
