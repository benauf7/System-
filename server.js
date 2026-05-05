const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// التأكد من وجود مجلد exports
if (!fs.existsSync('./exports')) fs.mkdirSync('./exports');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// استيراد المسارات (routes)
const productRoutes = require('./routes/products');
const invoiceRoutes = require('./routes/invoices');
const reportRoutes = require('./routes/reports');

app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// جلب العملاء (بسيط)
app.get('/api/customers', (req, res) => {
  const db = require('./db');
  db.all("SELECT id, name FROM customers", (err, rows) => {
    res.json(rows);
  });
});
