const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'store.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // جدول المنتجات
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      price REAL NOT NULL,
      quantity INTEGER DEFAULT 0
    )
  `);

  // جدول العملاء (شركة/عميل)
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT
    )
  `);

  // جدول الفواتير
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      date TEXT DEFAULT CURRENT_DATE,
      total REAL DEFAULT 0,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
  `);

  // جدول بنود الفاتورة
  db.run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      price REAL,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // إضافة بعض البيانات التجريبية إذا كانت الجداول فارغة
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (row.count === 0) {
      db.run("INSERT INTO products (name, sku, price, quantity) VALUES ('هاتف ذكي', 'PH001', 2500, 50)");
      db.run("INSERT INTO products (name, sku, price, quantity) VALUES ('حاسوب محمول', 'LP002', 4500, 30)");
      db.run("INSERT INTO customers (name, phone) VALUES ('شركة الأمل', '123456789')");
    }
  });
});

module.exports = db;
