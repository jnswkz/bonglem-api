"""
Script to seed products into MongoDB from the provided data.
Run: python scripts/seed_products.py
"""
from pymongo import MongoClient
from datetime import datetime

# MongoDB connection
MONGODB_URI = "mongodb+srv://jns:rWdB1lxN2ju9jalK@bonglem.lb42adn.mongodb.net/bonglem"

# Product data (parsed from the provided table)
# Columns: ID, Name, flags (6 booleans), rating/count, imageUrl, ..., description
products_data = [
    {
        "name": "Khoai lang",
        "nameEn": "Sweet Potato Chips",
        "sku": "SNACK-001",
        "price": 35000,
        "stock": 50,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-mcx0z6dxw0q5d4@resize_w450_nl.webp",
        "description": "Khoai lang sấy giòn thơm ngon",
        "descriptionEn": "Crispy dried sweet potato chips",
        "category": "other"
    },
    {
        "name": "Nui sấy",
        "nameEn": "Dried Pasta Snack",
        "sku": "SNACK-002",
        "price": 25000,
        "stock": 40,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-7qukw-lhutbqdde85d0f.webp",
        "description": "Nui sấy giòn rụm",
        "descriptionEn": "Crispy dried pasta snack",
        "category": "other"
    },
    {
        "name": "Sweet fish biscuits",
        "nameEn": "Sweet Fish Biscuits",
        "sku": "SNACK-003",
        "price": 30000,
        "stock": 35,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/64eca12853342087ff49ffb1feeb650c.webp",
        "description": "Bánh quy hình cá ngọt ngào",
        "descriptionEn": "Sweet fish-shaped biscuits",
        "category": "other"
    },
    {
        "name": "Kẹo Milo",
        "nameEn": "Milo Candy",
        "sku": "SNACK-004",
        "price": 20000,
        "stock": 60,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lx1ylcp68qfv13.webp",
        "description": "Kẹo Milo thơm ngon",
        "descriptionEn": "Delicious Milo candy",
        "category": "other"
    },
    {
        "name": "Big Babol",
        "nameEn": "Big Babol Gum",
        "sku": "SNACK-005",
        "price": 15000,
        "stock": 80,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/db952d83521dcef589c41bbcec6b6375.webp",
        "description": "Kẹo cao su Big Babol",
        "descriptionEn": "Big Babol bubble gum",
        "category": "other"
    },
    {
        "name": "Noodle (Miu Miu)",
        "nameEn": "Miu Miu Noodle Snack",
        "sku": "SNACK-006",
        "price": 10000,
        "stock": 100,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/sg-11134201-824jd-me8uxv6ocgsge3.webp",
        "description": "Mì Miu Miu ăn liền",
        "descriptionEn": "Miu Miu instant noodle snack",
        "category": "other"
    },
    {
        "name": "Vitamin C",
        "nameEn": "Vitamin C Candy",
        "sku": "SNACK-007",
        "price": 25000,
        "stock": 70,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lkze4unmoogb34.webp",
        "description": "Kẹo Vitamin C bổ sung sức khỏe",
        "descriptionEn": "Vitamin C candy for health",
        "category": "other"
    },
    {
        "name": "Kẹo cao su tha thu",
        "nameEn": "Tha Thu Chewing Gum",
        "sku": "SNACK-008",
        "price": 18000,
        "stock": 55,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-7qukw-lgbqz6bveiqy78.webp",
        "description": "Kẹo cao su tha thu hương trái cây",
        "descriptionEn": "Tha Thu fruit flavored chewing gum",
        "category": "other"
    },
    {
        "name": "Mít sấy",
        "nameEn": "Dried Jackfruit",
        "sku": "SNACK-009",
        "price": 45000,
        "stock": 30,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lx0z7hwr2eor95.webp",
        "description": "Mít sấy giòn tự nhiên",
        "descriptionEn": "Natural crispy dried jackfruit",
        "category": "other"
    },
    {
        "name": "Sữa chua sấy",
        "nameEn": "Dried Yogurt Bites",
        "sku": "SNACK-010",
        "price": 40000,
        "stock": 45,
        "status": "active",
        "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lqezlzp8q0qfcf.webp",
        "description": "Sữa chua sấy thơm ngon bổ dưỡng",
        "descriptionEn": "Delicious and nutritious dried yogurt bites",
        "category": "other"
    }
]


def seed_products():
    """Insert products into MongoDB"""
    client = MongoClient(MONGODB_URI)
    db = client.get_database()
    products_collection = db["products"]

    # Clear existing products (optional - comment out if you want to keep existing)
    result = products_collection.delete_many({})
    print(f"Cleared {result.deleted_count} existing products")

    # Add timestamps
    now = datetime.utcnow()
    for product in products_data:
        product["createdAt"] = now
        product["updatedAt"] = now

    # Insert products
    result = products_collection.insert_many(products_data)
    print(f"Inserted {len(result.inserted_ids)} products:")
    
    for product in products_data:
        print(f"  - {product['name']} ({product['sku']}): {product['price']:,}đ")

    client.close()
    print("\nDone! Products are now in MongoDB.")


if __name__ == "__main__":
    seed_products()
