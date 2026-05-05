const express = require('express');
const router = express.Router();
const db = require('../db');

// إجمالي المبيعات لكل شهر (آخر 6 أشهر)
router.get('/sales-overview', (req, res) => {
  db.all(`
    SELECT strftime('%Y-%m', date) as month, SUM(total) as total_sales
    FROM invoices
    WHERE date >= date('now', '-6 months')
    GROUP BY month
    ORDER BY month
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// أفضل 5 منتجات مبيعاً
router.get('/top-products', (req, res) => {
  db.all(`
    SELECT products.name, SUM(invoice_items.quantity) as total_sold
    FROM invoice_items
    JOIN products ON invoice_items.product_id = products.id
    GROUP BY products.id
    ORDER BY total_sold DESC
    LIMIT 5
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// المنتجات منخفضة المخزون (أقل من 10 وحدات)
router.get('/low-stock', (req, res) => {
  db.all("SELECT * FROM products WHERE quantity < 10", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// إجمالي الإيرادات والأصناف المباعة
router.get('/summary', (req, res) => {
  db.get("SELECT COUNT(*) as invoice_count, SUM(total) as total_revenue FROM invoices", (err, row) => {
    res.json(row);
  });
});

module.exports = router;
