const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { uploadOnCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const Pdf = require('../models/PdfModel');

/**
 * Image-to-PDF Conversion Controller
 * 
 * Supports single or multiple image uploads and converts them into a single PDF.
 */
exports.imageToPdf = async (req, res, next) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'Please upload at least one image' });
        }

        // Initialize PDF Document
        const doc = new PDFDocument({ margin: 20 });
        const tempPdfPath = path.join(__dirname, `../../public/temp/generated-${Date.now()}.pdf`);
        const stream = fs.createWriteStream(tempPdfPath);
        doc.pipe(stream);

        // Process each image
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Add a new page for each image (except the first one, which has a default page)
            if (i > 0) doc.addPage();

            // Fit the image to the PDF page dimensions (minus margins)
            doc.image(file.path, {
                fit: [doc.page.width - 40, doc.page.height - 40],
                align: 'center',
                valign: 'center'
            });

            // Cleanup the original image from the temporary storage
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }

        doc.end();

        // Wait for the PDF stream to finish
        stream.on('finish', async () => {
            try {
                // Upload the generated PDF to Cloudinary
                const uploadResult = await uploadOnCloudinary(tempPdfPath, 'generated_pdfs');
                
                if (!uploadResult) {
                    return res.status(500).json({ success: false, message: 'Failed to upload PDF to storage' });
                }

                // Save record in the database
                const pdfRecord = await Pdf.create({
                    originalName: files.length === 1 ? files[0].originalname : 'Multi-Image PDF',
                    convertedName: uploadResult.original_filename,
                    fileUrl: uploadResult.secure_url,
                    publicId: uploadResult.public_id, // Store Cloudinary ID
                    conversionType: 'image-to-pdf',
                    status: 'completed',
                    user: req.user._id,
                    metadata: {
                        fileSize: uploadResult.bytes,
                        pageCount: files.length
                    }
                });

                res.status(201).json({
                    success: true,
                    message: 'PDF generated successfully!',
                    pdf: pdfRecord
                });

            } catch (err) {
                // Remove temp PDF if it exists
                if (fs.existsSync(tempPdfPath)) {
                  fs.unlinkSync(tempPdfPath);
                }
                next(err);
            }
        });

        stream.on('error', (err) => {
          if (fs.existsSync(tempPdfPath)) {
            fs.unlinkSync(tempPdfPath);
          }
          next(err);
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Download PDF Controller
 * 
 * Fetches the PDF record and provides the secure Cloudinary download link.
 */
exports.downloadPdf = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pdf = await Pdf.findById(id);

        if (!pdf) {
            return res.status(404).json({ success: false, message: 'PDF document not found' });
        }

        // Only allow the owner of the PDF to download it
        if (pdf.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to download this PDF' });
        }

        // Add 'fl_attachment' to the Cloudinary URL to force a download
        const downloadUrl = pdf.fileUrl.replace('/upload/', '/upload/fl_attachment/');

        res.status(200).json({
            success: true,
            downloadUrl
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete PDF Controller
 * 
 * Removes the record from MongoDB and the file from Cloudinary.
 */
exports.deletePdf = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pdf = await Pdf.findById(id);

        if (!pdf) {
            return res.status(404).json({ success: false, message: 'PDF document not found' });
        }

        // Check ownership
        if (pdf.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this PDF' });
        }

        // Delete from Cloudinary
        if (pdf.publicId) {
            await deleteFromCloudinary(pdf.publicId);
        }

        // Delete from Database
        await Pdf.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'PDF deleted successfully'
        });
    } catch (err) {
        next(err);
    }
};
