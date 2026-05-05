const express = require('express');
const router = express.Router();
const db = require('../db');

// جلب كل المنتجات
router.get('/', (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// إضافة منتج جديد
router.post('/', (req, res) => {
  const { name, sku, price, quantity } = req.body;
  db.run("INSERT INTO products (name, sku, price, quantity) VALUES (?, ?, ?, ?)",
    [name, sku, price, quantity || 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// تعديل منتج
router.put('/:id', (req, res) => {
  const { name, sku, price, quantity } = req.body;
  db.run("UPDATE products SET name=?, sku=?, price=?, quantity=? WHERE id=?",
    [name, sku, price, quantity, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    });
});

// حذف منتج
router.delete('/:id', (req, res) => {
  db.run("DELETE FROM products WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
