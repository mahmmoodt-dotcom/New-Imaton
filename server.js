
/**
 * IMATION IRAQ - UNIFIED PRODUCTION SERVER
 * Handles both the API and serves the Frontend UI.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
// Use the port provided by the hosting environment or default to 5000
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. SERVE STATIC FILES (Deployment Ready)
// This allows the server to serve your index.html, index.tsx, etc.
app.use(express.static(__dirname));

// Initial DB state if file doesn't exist
const initialData = {
  categories: [],
  products: [],
  orders: [],
  settings: {
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Imation_logo.svg/1024px-Imation_logo.svg.png",
    heroImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200",
    aboutImage: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800",
    aboutText: { en: "Quality tech since 2010.", ar: "جودة منذ ٢٠١٠", ku: "کوالێتی لە ٢٠١٠وە" },
    phone1: "07700000000",
    phone2: "07500000000",
    instagram: "#",
    facebook: "#",
    tiktok: "#",
    googleMapsUrl: "https://maps.google.com"
  },
  auth: { isLoggedIn: false }
};

const readDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return initialData;
  }
};

const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// API Endpoints
app.get('/api/settings', (req, res) => res.json(readDB().settings));
app.post('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = req.body;
  writeDB(db);
  res.status(200).json(db.settings);
});

app.get('/api/products', (req, res) => res.json(readDB().products));
app.post('/api/products', (req, res) => {
  const db = readDB();
  db.products = req.body;
  writeDB(db);
  res.status(200).json(db.products);
});

app.get('/api/categories', (req, res) => res.json(readDB().categories));
app.post('/api/categories', (req, res) => {
  const db = readDB();
  db.categories = req.body;
  writeDB(db);
  res.status(200).json(db.categories);
});

app.get('/api/orders', (req, res) => res.json(readDB().orders));
app.post('/api/orders', (req, res) => {
  const db = readDB();
  db.orders = req.body;
  writeDB(db);
  res.status(200).json(db.orders);
});

app.get('/api/auth', (req, res) => res.json(readDB().auth));
app.post('/api/auth', (req, res) => {
  const db = readDB();
  db.auth = req.body;
  writeDB(db);
  res.status(200).json(db.auth);
});

// Conceptual Image Upload (To be replaced with Cloudinary for 4K images)
app.post('/api/upload', (req, res) => {
  res.status(200).json({ url: req.body.image });
});

// 2. CATCH-ALL ROUTE (For React Router)
// This ensures that refreshing the page on /shop or /admin doesn't give a 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  🚀 IMATION IRAQ IS LIVE
  -----------------------
  Local:   http://localhost:${PORT}
  Network: http://0.0.0.0:${PORT}
  
  Press Ctrl+C to stop the server.
  `);
});
