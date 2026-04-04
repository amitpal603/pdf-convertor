const { createCanvas } = require('@napi-rs/canvas');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
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
        
        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const fileBaseName = path.basename(file.path, path.extname(file.path));
        
        // Track the original PDF for cleanup
        tempFiles.push(file.path);

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
            // Load PDF document
            const data = fs.readFileSync(file.path);
            const loadingTask = pdfjs.getDocument({
                data,
                nativeImageDecoderSupport: 'none',
                disableFontFace: true // Often safer in Node.js environments
            });
            const pdfDoc = await loadingTask.promise;
            
            const numPages = pdfDoc.numPages;
            const images = [];

            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // High quality scale
                
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise;

                // Encode to buffer (jpeg or png)
                const format = outputFormat === 'png' ? 'png' : 'jpeg';
                const imageBuffer = await canvas.encode(format);
                
                const fileName = `${fileBaseName}-${i}.${format === 'jpeg' ? 'jpg' : 'png'}`;
                const filePath = path.join(tempDir, fileName);
                
                fs.writeFileSync(filePath, imageBuffer);
                tempFiles.push(filePath);

                const uploadResult = await uploadOnCloudinary(filePath, 'pdf_to_images');
                images.push({
                    pageNumber: i,
                    imageUrl: uploadResult.secure_url
                });
            }

            // Update record with completion details
            pdfToImageRecord.images = images;
            pdfToImageRecord.status = 'completed';
            pdfToImageRecord.totalProgress = 100;
            pdfToImageRecord.originalPdfUrl = 'source_file_processed'; 
            await pdfToImageRecord.save();

            res.status(200).json({
                success: true,
                message: 'PDF converted to images successfully!',
                data: pdfToImageRecord
            });

        } catch (convErr) {
            console.error('Conversion Error:', convErr);
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
