const express = require('express');
const router = express.Router();
const { imageToPdf, downloadPdf, deletePdf, getImageToPdfHistory } = require('../controllers/pdfController');
const { convertPdfToImages, getConversionHistory, deleteConversion, downloadImage } = require('../controllers/pdfToImageController');
const upload = require('../middlewares/uploadMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// All PDF related routes start with /api/pdf/

// Image to PDF Conversion
router.post('/convert/image-to-pdf', authMiddleware, upload.array('images', 20), imageToPdf);
router.get('/image-to-pdf/history', authMiddleware, getImageToPdfHistory);

// PDF to Image Conversion
router.post('/convert/pdf-to-image', authMiddleware, upload.single('pdf'), convertPdfToImages);
router.get('/pdf-to-image/history', authMiddleware, getConversionHistory);
router.get('/pdf-to-image/download/:id/:pageNumber', authMiddleware, downloadImage);
router.delete('/pdf-to-image/delete/:id', authMiddleware, deleteConversion);

// Download PDF by ID
router.get('/download/:id', authMiddleware, downloadPdf);

// Delete PDF by ID
router.delete('/delete/:id', authMiddleware, deletePdf);

module.exports = router;
