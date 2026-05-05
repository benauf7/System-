const express = require('express');
const router = express.Router();
const db = require('../db');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

// إنشاء فاتورة جديدة (مع تحديث المخزون)
router.post('/', (req, res) => {
  const { customer_id, items } = req.body; // items: [{product_id, quantity}]
  if (!items || !items.length) return res.status(400).json({ error: 'لا توجد أصناف' });

  const invoiceNumber = 'INV-' + Date.now();

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // إدراج الفاتورة
    db.run("INSERT INTO invoices (invoice_number, customer_id, total) VALUES (?, ?, 0)",
      [invoiceNumber, customer_id || null],
      function(err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: err.message });
        }
        const invoiceId = this.lastID;
        let totalAmount = 0;
        let processed = 0;

        items.forEach(item => {
          db.get("SELECT price, quantity FROM products WHERE id = ?", [item.product_id], (err, product) => {
            if (err || !product) {
              db.run("ROLLBACK");
              return res.status(400).json({ error: `منتج غير موجود: ${item.product_id}` });
            }
            if (product.quantity < item.quantity) {
              db.run("ROLLBACK");
              return res.status(400).json({ error: `كمية غير متوفرة للمنتج ${item.product_id}` });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            db.run("INSERT INTO invoice_items (invoice_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
              [invoiceId, item.product_id, item.quantity, product.price]);

            db.run("UPDATE products SET quantity = quantity - ? WHERE id = ?",
              [item.quantity, item.product_id]);

            processed++;
            if (processed === items.length) {
              db.run("UPDATE invoices SET total = ? WHERE id = ?", [totalAmount, invoiceId], (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: err.message });
                }
                db.run("COMMIT");
                res.json({ invoiceId, invoiceNumber, total: totalAmount });
              });
            }
          });
        });
      });
  });
});

// جلب كل الفواتير (مع بيانات العميل)
router.get('/', (req, res) => {
  db.all(`
    SELECT invoices.*, customers.name as customer_name 
    FROM invoices 
    LEFT JOIN customers ON invoices.customer_id = customers.id
    ORDER BY invoices.date DESC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// تفاصيل فاتورة مع الأصناف
router.get('/:id', (req, res) => {
  const invoiceId = req.params.id;
  db.get("SELECT * FROM invoices WHERE id = ?", [invoiceId], (err, invoice) => {
    if (err || !invoice) return res.status(404).json({ error: 'فاتورة غير موجودة' });
    db.all("SELECT invoice_items.*, products.name as product_name FROM invoice_items JOIN products ON invoice_items.product_id = products.id WHERE invoice_id = ?", [invoiceId], (err, items) => {
      res.json({ invoice, items });
    });
  });
});

// تصدير فاتورة PDF
router.get('/export/pdf/:id', (req, res) => {
  const invoiceId = req.params.id;
  db.get("SELECT * FROM invoices WHERE id = ?", [invoiceId], (err, invoice) => {
    if (err || !invoice) return res.status(404).send('فاتورة غير موجودة');
    db.all("SELECT invoice_items.*, products.name as product_name FROM invoice_items JOIN products ON invoice_items.product_id = products.id WHERE invoice_id = ?", [invoiceId], (err, items) => {
      const doc = new PDFDocument();
      const filePath = path.join(__dirname, '../exports', `invoice_${invoiceId}.pdf`);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(20).text(`فاتورة رقم: ${invoice.invoice_number}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`التاريخ: ${invoice.date}`);
      doc.text(`الإجمالي: ${invoice.total} جنيهاً`);
      doc.moveDown();
      doc.text('الأصناف:');
      items.forEach(item => {
        doc.text(`- ${item.product_name} : ${item.quantity} × ${item.price} = ${item.quantity * item.price}`);
      });
      doc.end();

      stream.on('finish', () => {
        res.download(filePath, `invoice_${invoiceId}.pdf`, () => {
          fs.unlinkSync(filePath); // حذف الملف بعد التحميل
        });
      });
    });
  });
});

// تصدير فاتورة CSV
router.get('/export/csv/:id', (req, res) => {
  const invoiceId = req.params.id;
  db.get("SELECT * FROM invoices WHERE id = ?", [invoiceId], (err, invoice) => {
    if (err || !invoice) return res.status(404).send('فاتورة غير موجودة');
    db.all("SELECT invoice_items.*, products.name as product_name FROM invoice_items JOIN products ON invoice_items.product_id = products.id WHERE invoice_id = ?", [invoiceId], (err, items) => {
      const data = items.map(item => ({
        product: item.product_name,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      }));
      const parser = new Parser({ fields: ['product', 'quantity', 'price', 'total'] });
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`invoice_${invoiceId}.csv`);
      res.send(csv);
    });
  });
});

module.exports = router;
