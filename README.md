# ShopSphere - Multi-Vendor E-Commerce Marketplace

> **Tagline**: *One Marketplace. Endless Possibilities.*

ShopSphere is a production-quality, full-stack MERN (MongoDB, Express, React, Node.js) multi-vendor e-commerce marketplace platform. Designed specifically as an advanced database architecture demonstration, ShopSphere integrates multi-vendor order routing, role-based access control (Customer, Vendor, Admin), and deep native MongoDB features including **ACID Transactions**, **Full-Text Search Indexing**, **Compound Indexing**, **TTL Session Auto-Purging**, and **Pipeline Aggregations**.

---

## 🌟 Key Application Features

### 🛍️ Customer Role
- **Multi-Vendor Single Checkout**: Combine products from multiple independent sellers into a single cart and checkout seamlessly.
- **Full-Text Product Discovery**: Server-side text search powered by MongoDB Text Indexes.
- **Multi-Dimensional Filters**: Filter products simultaneously by Category, Vendor Store, Price Range, Minimum Rating, and Stock Status.
- **Wishlist & Cart**: Persistent authenticated carts with guest cart session automatic sync upon login.
- **Order Tracking**: Detailed item-level order history and tracking timeline (`Processing` → `Shipped` → `Delivered`).
- **Verified Product Reviews**: Write ratings and comments enforced by verified purchase checks in MongoDB.

### 🏬 Seller / Vendor Role
- **Public Vendor Storefront**: Customizable store banner, logo, rating badge, description, and vendor catalog (`/store/:slug`).
- **Vendor-Scoped Management**: Vendors strictly manage only their own products, inventory, and order items.
- **Item-Level Status Updates**: Vendors independently update the status of order items belonging to their store.
- **Native Aggregation Analytics**: Visual charts powered by MongoDB Aggregations showing Monthly Revenue and Best-Selling Products.

### 🛡️ Administrator Role
- **Marketplace Master Control**: Oversight of all platform users, vendors, products, and categories.
- **Vendor Approval Workflow**: Approve or reject new vendor store applications.
- **Access Control**: Block or restore customer and seller user accounts.
- **Category Manager**: Create, edit, and delete marketplace product categories.
- **Platform Analytics**: Gross GMV revenue trends, top revenue-generating vendors, and category distribution.

---

## 🚀 Advanced MongoDB Features Showcase (Viva Ready)

### 1. 🛡️ ACID Multi-Document Transactions
Located in `server/controllers/checkoutController.js`:
- During checkout, `mongoose.startSession()` and `session.startTransaction()` are invoked.
- Verifies product availability and stock in real time.
- Uses authoritative database pricing (never frontend prices).
- Atomically decrements product stock and increments `soldCount`.
- Creates the multi-vendor `Order` document and clears the user's cart.
- If any product fails or has insufficient stock, `await session.abortTransaction()` is called, guaranteeing zero partial order states.

```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 1. Fetch products & verify stock
  // 2. Deduct inventory: product.stock -= item.quantity
  // 3. Create Order document with vendor items
  // 4. Clear Cart
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
}
```

### 2. 🔍 Text Search Index
Located in `server/models/Product.js` and queried in `server/controllers/productController.js`:
- Implements full-text search across product names and descriptions with custom field weights.

```javascript
// Product Schema Index
ProductSchema.index({ name: 'text', description: 'text' }, { weights: { name: 10, description: 5 } });

// Query Execution
const products = await Product.find({ $text: { $search: query } });
```

### 3. ⚡ Compound Indexing
Located in `server/models/Product.js`:
- Optimizes complex compound queries filtering by category and sorting by price or fetching latest vendor items.

```javascript
// Compound Index 1: Accelerates Category + Price filtering
ProductSchema.index({ category: 1, price: 1 });

// Compound Index 2: Accelerates Vendor Dashboard product sorting
ProductSchema.index({ vendor: 1, createdAt: -1 });
```

### 4. ⏳ TTL (Time-To-Live) Indexing
Located in `server/models/GuestCart.js`:
- Native MongoDB automatic index purging temporary guest cart sessions after 24 hours (86,400 seconds) without manual JavaScript timers.

```javascript
GuestCartSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
```

### 5. 📊 Aggregation Framework Pipelines
Located in `server/controllers/analyticsController.js`:
- Real-time server-side database aggregations ($match, $unwind, $group, $sort, $limit, $project) for dashboards.

```javascript
// Vendor Monthly Sales Pipeline Example
const monthlyRevenue = await Order.aggregate([
  { $unwind: '$items' },
  { $match: { 'items.vendor': vendorId, 'items.status': { $ne: 'Cancelled' } } },
  {
    $group: {
      _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
      revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      totalUnitsSold: { $sum: '$items.quantity' }
    }
  },
  { $sort: { '_id.year': 1, '_id.month': 1 } }
]);
```

---

## 🔑 Pre-Seeded Viva Demo Accounts

The database seed script (`server/seed.js`) automatically populates the system with realistic data and demo credentials for testing:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@shopsphere.com` | `adminpassword123` | Master control panel & platform analytics |
| **Vendor 1** | `nexus@vendors.com` | `vendorpassword123` | Nexus Tech Lab (Electronics & Laptops) |
| **Vendor 2** | `urban@vendors.com` | `vendorpassword123` | Urban Luxe Couture (Apparel & Leather) |
| **Customer** | `alex@gmail.com` | `password123` | Alex Johnson (Pre-configured address & sample orders) |

*Note: You can also use the **"Viva Demo Switcher"** button in the header bar for instant 1-click role switching during viva presentations!*

---

## ⚙️ Quick Start Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB running locally at `mongodb://127.0.0.1:27017/shopsphere` or a MongoDB Atlas URI.

### 1. Backend Setup & Seeding

```bash
# Navigate to server folder
cd server

# Install backend dependencies
npm install

# Run database seed script (Populates Admin, Vendors, Categories, Products & Orders)
npm install

# Start Express Backend server (Runs on port 5000)
npm run dev
```

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to client folder
cd client

# Install frontend dependencies
npm install

# Start Vite Development server (Runs on port 3000)
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 📡 REST API Endpoint Documentation

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register customer account |
| `POST` | `/api/auth/register-vendor` | Public | Register seller account & store profile |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT |
| `GET` | `/api/products` | Public | Search, filter, & sort products (Text/Compound Index) |
| `GET` | `/api/products/:id` | Public | Get single product & vendor details |
| `POST` | `/api/products` | Vendor / Admin | Create new product listing |
| `PUT` | `/api/products/:id` | Vendor / Admin | Update product details |
| `DELETE` | `/api/products/:id` | Vendor / Admin | Delete product listing |
| `GET` | `/api/cart` | Public / Guest | Retrieve cart (User or Guest TTL) |
| `POST` | `/api/cart/add` | Public / Guest | Add product to cart |
| `POST` | `/api/checkout` | Customer | Process multi-vendor order via ACID Transaction |
| `GET` | `/api/orders/my-orders` | Customer | Get customer order history & timeline |
| `GET` | `/api/vendors/orders` | Vendor | Get order items belonging to vendor |
| `PUT` | `/api/vendors/orders/:id/items/:itemId/status` | Vendor | Update order item status |
| `GET` | `/api/analytics/vendor` | Vendor | Native MongoDB Aggregation analytics for vendor |
| `GET` | `/api/analytics/admin` | Admin | Global marketplace aggregation analytics |
| `GET` | `/api/admin/vendors` | Admin | List vendor applications |
| `PUT` | `/api/admin/vendors/:id/status` | Admin | Approve or reject vendor store |

---

## 📁 Repository Directory Structure

```text
ShopSphere/
├── server/
│   ├── config/          # Database connection
│   ├── controllers/     # API Business logic & transactions
│   ├── middleware/      # Auth & Role authorization
│   ├── models/          # Mongoose Schemas (Text, Compound, TTL Indexes)
│   ├── routes/          # Express REST API Routes
│   ├── utils/           # JWT helper utilities
│   ├── seed.js          # Database seed script
│   └── server.js        # Server entry point
└── client/
    ├── src/
    │   ├── components/  # Navbar, Footer, ProductCard, FilterSidebar, SearchBar
    │   ├── context/     # AuthContext, CartContext, WishlistContext
    │   ├── pages/       # Home, Catalog, ProductDetail, Cart, Checkout, Dashboards
    │   ├── services/    # Axios API client
    │   ├── App.jsx      # Main router & Toast alerts
    │   └── main.jsx     # React entry point
    ├── index.html
    └── vite.config.js
```

---

## 📄 License
This project is created for educational database showcase purposes.
