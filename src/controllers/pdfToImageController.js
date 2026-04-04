const pdf = require('pdf-poppler');
const path = require('path');
const fs = require('fs');
const { uploadOnCloudinary } = require('../utils/cloudinary');
const PdfToImage = require('../models/PdfToImageModel');

/**
 * PDF to Image Conversion Controller
 * 
 * Converts an uploaded PDF into individual images for each page.
 */
exports.convertPdfToImages = async (req, res, next) => {
    const tempFiles = []; // Track all temp files for cleanup
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
        }

        const outputFormat = req.body.outputFormat || 'jpeg';
        const tempDir = path.join(__dirname, '../../public/temp');
        const fileBaseName = path.basename(file.path, path.extname(file.path));
        
        // Track the original PDF for cleanup
        tempFiles.push(file.path);

        const opts = {
            format: outputFormat,
            out_dir: tempDir,
            out_prefix: fileBaseName,
            page: null // Convert all pages
        };

        // Create the initial database record
        const pdfToImageRecord = await PdfToImage.create({
            originalPdfName: file.originalname,
            originalPdfUrl: 'processing', // Placeholder
            outputFormat: outputFormat,
            status: 'processing',
            user: req.user._id
        });

        // Start conversion
        try {
            await pdf.convert(file.path, opts);
            
            // Find generated images in the temp directory
            const generatedFiles = fs.readdirSync(tempDir).filter(f => 
                f.startsWith(fileBaseName) && 
                (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')) &&
                f !== path.basename(file.path)
            );

            // Sort files to ensure page order (e.g., prefix-1.jpg, prefix-2.jpg)
            generatedFiles.sort((a, b) => {
                const numA = parseInt(a.match(/-(\d+)\./)?.[1] || 0);
                const numB = parseInt(b.match(/-(\d+)\./)?.[1] || 0);
                return numA - numB;
            });

            const imageUploadPromises = generatedFiles.map(async (fileName, index) => {
                const filePath = path.join(tempDir, fileName);
                tempFiles.push(filePath); // Track for cleanup

                const uploadResult = await uploadOnCloudinary(filePath, 'pdf_to_images');
                return {
                    pageNumber: index + 1,
                    imageUrl: uploadResult.secure_url
                };
            });

            const uploadedImages = await Promise.all(imageUploadPromises);

            // Update record with completion details
            pdfToImageRecord.images = uploadedImages;
            pdfToImageRecord.status = 'completed';
            pdfToImageRecord.totalProgress = 100;
            // Note: Since we don't have a public URL for the original PDF yet (it's in temp),
            // we might want to upload that too if needed, but the model originalPdfUrl 
            // usually refers to the source. For this tool, the source is the local temp file.
            // Let's just set it to the original filename for now or a dummy URL.
            pdfToImageRecord.originalPdfUrl = 'source_file_processed'; 
            await pdfToImageRecord.save();

            res.status(200).json({
                success: true,
                message: 'PDF converted to images successfully!',
                data: pdfToImageRecord
            });

        } catch (convErr) {
            pdfToImageRecord.status = 'failed';
            pdfToImageRecord.error = convErr.message;
            await pdfToImageRecord.save();
            throw convErr;
        }

    } catch (err) {
        next(err);
    } finally {
        // Cleanup all temporary files
        tempFiles.forEach(tempFile => {
            if (fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                } catch (unlinkErr) {
                    console.error(`Failed to delete temp file: ${tempFile}`, unlinkErr);
                }
            }
        });
    }
};

/**
 * Download a specific image page
 */
exports.downloadImage = async (req, res, next) => {
    try {
        const { id, pageNumber } = req.params;
        const record = await PdfToImage.findById(id);

        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        if (record.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const image = record.images.find(img => img.pageNumber === parseInt(pageNumber));

        if (!image) {
            return res.status(404).json({ success: false, message: 'Page not found' });
        }

        // Add 'fl_attachment' to the Cloudinary URL to force a download
        const downloadUrl = image.imageUrl.replace('/upload/', '/upload/fl_attachment/');

        res.status(200).json({
            success: true,
            downloadUrl
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get conversion history for a user
 */
exports.getConversionHistory = async (req, res, next) => {
    try {
        const history = await PdfToImage.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, history });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a conversion record
 */
exports.deleteConversion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const record = await PdfToImage.findById(id);

        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        if (record.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Optional: Delete images from Cloudinary if needed. 
        // For now, just delete from DB.
        await PdfToImage.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: 'Record deleted successfully' });
    } catch (err) {
        next(err);
    }
};
