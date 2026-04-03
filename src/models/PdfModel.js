const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  convertedName: {
    type: String,
  },
  fileUrl: {
    type: String, // Path or URL of the generated PDF
  },
  publicId: {
    type: String, // Cloudinary identifier for management
  },
  conversionType: {
    type: String,
    enum: [
      'image-to-pdf',
      'text-to-pdf',
      'docx-to-pdf',
      'html-to-pdf'
    ],
    required: true,
  },
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
  metadata: {
    fileSize: Number,
    pageCount: Number,
  }
}, {
  timestamps: true
});

const Pdf = mongoose.model('Pdf', pdfSchema);

module.exports = Pdf;
