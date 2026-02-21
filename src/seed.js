/**
 * Seed script to populate initial product data
 * Run with: node src/seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bonglem";

const sampleProducts = [
  {
    name: "Set Yêu Thương Handmade",
    nameEn: "Handmade Love Set",
    sku: "LOVE-001",
    price: 350000,
    stock: 20,
    status: "active",
    imageUrl: "/images/products/love-set-1.jpg",
    description: "Bộ quà tặng handmade dành cho người yêu thương, bao gồm móc khóa len, thiệp chúc và hộp quà xinh xắn.",
    descriptionEn: "Handmade gift set for loved ones, includes yarn keychain, greeting card, and cute gift box.",
    category: "love"
  },
  {
    name: "Set Gấu Bông Mini",
    nameEn: "Mini Teddy Bear Set",
    sku: "LOVE-002",
    price: 280000,
    stock: 15,
    status: "active",
    imageUrl: "/images/products/teddy-mini.jpg",
    description: "Gấu bông mini handmade kèm hoa khô và thiệp - món quà hoàn hảo cho ngày đặc biệt.",
    descriptionEn: "Handmade mini teddy bear with dried flowers and card - perfect gift for special days.",
    category: "love"
  },
  {
    name: "Set Quà Cho Bé Trai",
    nameEn: "Baby Boy Gift Set",
    sku: "BABY-001",
    price: 420000,
    stock: 10,
    status: "active",
    imageUrl: "/images/products/baby-boy-set.jpg",
    description: "Bộ quà cho bé trai sơ sinh gồm yếm, mũ len và đồ chơi handmade an toàn.",
    descriptionEn: "Newborn baby boy gift set includes bib, yarn hat, and safe handmade toys.",
    category: "baby"
  },
  {
    name: "Set Quà Cho Bé Gái",
    nameEn: "Baby Girl Gift Set",
    sku: "BABY-002",
    price: 420000,
    stock: 12,
    status: "active",
    imageUrl: "/images/products/baby-girl-set.jpg",
    description: "Bộ quà cho bé gái sơ sinh gồm yếm, băng đô len và đồ chơi handmade xinh xắn.",
    descriptionEn: "Newborn baby girl gift set includes bib, yarn headband, and cute handmade toys.",
    category: "baby"
  },
  {
    name: "Set Đặc Biệt Premium",
    nameEn: "Premium Special Set",
    sku: "SPECIAL-001",
    price: 650000,
    stock: 8,
    status: "active",
    imageUrl: "/images/products/premium-set.jpg",
    description: "Bộ quà cao cấp với hộp gỗ, thiệp handmade, gấu bông và phụ kiện trang trí đặc biệt.",
    descriptionEn: "Premium gift set with wooden box, handmade card, teddy bear, and special decorative accessories.",
    category: "special"
  },
  {
    name: "Móc Khóa Len Thú Cưng",
    nameEn: "Pet Yarn Keychain",
    sku: "OTHER-001",
    price: 85000,
    stock: 50,
    status: "active",
    imageUrl: "/images/products/keychain-pet.jpg",
    description: "Móc khóa len hình thú cưng nhỏ xinh, làm quà tặng hoặc tự thưởng cho bản thân.",
    descriptionEn: "Cute pet-shaped yarn keychain, perfect as a gift or treat for yourself.",
    category: "other"
  },
  {
    name: "Thiệp Handmade 3D",
    nameEn: "3D Handmade Card",
    sku: "OTHER-002",
    price: 65000,
    stock: 30,
    status: "active",
    imageUrl: "/images/products/card-3d.jpg",
    description: "Thiệp 3D làm tay với nhiều mẫu thiết kế độc đáo cho mọi dịp.",
    descriptionEn: "Handmade 3D card with unique designs for all occasions.",
    category: "other"
  },
  {
    name: "Set Valentine Đặc Biệt",
    nameEn: "Special Valentine Set",
    sku: "SPECIAL-002",
    price: 550000,
    stock: 5,
    status: "active",
    imageUrl: "/images/products/valentine-set.jpg",
    description: "Bộ quà Valentine gồm gấu bông trái tim, hoa len và socola handmade.",
    descriptionEn: "Valentine gift set includes heart teddy, yarn flowers, and handmade chocolate.",
    category: "special"
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing products
    await Product.deleteMany({});
    console.log("Cleared existing products");

    // Insert sample products
    const inserted = await Product.insertMany(sampleProducts);
    console.log(`Inserted ${inserted.length} products`);

    // Log inserted products
    for (const product of inserted) {
      console.log(`  - ${product.name} (${product.sku}): ${product.price.toLocaleString()}đ`);
    }

    console.log("\nSeed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
