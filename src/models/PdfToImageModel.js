const mongoose = require('mongoose');

const pdfToImageSchema = new mongoose.Schema({
  originalPdfName: {
    type: String,
    required: true,
  },
  originalPdfUrl: {
    type: String, // URL of the PDF source file
    required: true,
  },
  outputFormat: {
    type: String,
    enum: ['jpeg', 'png', 'webp'],
    default: 'jpeg',
  },
  images: [{
    pageNumber: Number,
    imageUrl: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  error: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  totalProgress: { // Useful for multi-page conversions
    type: Number,
    default: 0,
  }
}, {
  timestamps: true
});

const PdfToImage = mongoose.model('PdfToImage', pdfToImageSchema);

module.exports = PdfToImage;
