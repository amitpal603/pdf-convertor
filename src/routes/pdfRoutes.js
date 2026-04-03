const express = require('express');
const router = express.Router();
const { imageToPdf, downloadPdf, deletePdf } = require('../controllers/pdfController');
const upload = require('../middlewares/uploadMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// All PDF related routes start with /api/pdf/
// Multi-part image upload (handles field named 'images')
router.post('/convert/image-to-pdf', authMiddleware, upload.array('images', 20), imageToPdf);

// Download PDF by ID
router.get('/download/:id', authMiddleware, downloadPdf);

// Delete PDF by ID
router.delete('/delete/:id', authMiddleware, deletePdf);

module.exports = router;
