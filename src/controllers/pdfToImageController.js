const path = require('path');
const fs = require('fs');
const { uploadOnCloudinary } = require('../utils/cloudinary');
const PdfToImage = require('../models/PdfToImageModel');
const { cache } = require('../config/redis');

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
            user: req.user?._id || null
        });

        // Start conversion
        try {
            const pdf = require('pdf-poppler');
            console.log(`Starting PDF to Image conversion for: ${file.path}`);
            
            const options = {
                format: outputFormat === 'png' ? 'png' : 'jpeg',
                out_dir: tempDir,
                out_prefix: fileBaseName,
                page: null // Convert all pages
            };

            // pdf-poppler returns a promise
            await pdf.convert(file.path, options);
            console.log(`pdf-poppler finished conversion in: ${tempDir}`);
            
            // Find all generated images in the temp directory
            const filesInTemp = fs.readdirSync(tempDir);
            console.log(`Files found in temp: ${filesInTemp.length}`);
            const generatedImages = filesInTemp
                .filter(fileName => fileName.startsWith(fileBaseName) && fileName !== path.basename(file.path))
                .sort((a, b) => {
                    // Sort by page number (e.g., file-1.jpg, file-2.jpg)
                    const numA = parseInt(a.match(/-(\d+)\./)?.[1] || 0);
                    const numB = parseInt(b.match(/-(\d+)\./)?.[1] || 0);
                    return numA - numB;
                });

            const images = [];
            for (let i = 0; i < generatedImages.length; i++) {
                const fileName = generatedImages[i];
                const filePath = path.join(tempDir, fileName);
                tempFiles.push(filePath);

                const uploadResult = await uploadOnCloudinary(filePath, 'pdf_to_images');
                if (uploadResult) {
                    images.push({
                        pageNumber: i + 1,
                        imageUrl: uploadResult.secure_url
                    });
                }
            }

            if (images.length === 0) {
                throw new Error('Conversion failed: No images were generated. Ensure Poppler is correctly installed on the server.');
            }

            // Update record with completion details
            pdfToImageRecord.images = images;
            pdfToImageRecord.status = 'completed';
            pdfToImageRecord.totalProgress = 100;
            pdfToImageRecord.originalPdfUrl = 'source_file_processed'; 
            await pdfToImageRecord.save();

            // Clear history cache for the user on successful conversion
            if (req.user) {
                await cache.del(`history:${req.user._id}:pdfToImage`);
            }

            return res.status(200).json({
                success: true,
                message: 'PDF converted to images successfully!',
                data: pdfToImageRecord
            });

        } catch (convErr) {
            console.error('Conversion Error:', convErr);
            pdfToImageRecord.status = 'failed';
            pdfToImageRecord.error = convErr.message;
            await pdfToImageRecord.save();
            // Clear history cache
            if (req.user) {
                await cache.del(`history:${req.user._id}:pdfToImage`);
            }
            
            return res.status(500).json({
                success: false,
                message: convErr.message || 'Image conversion failed'
            });
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

        if (record.user && (!req.user || record.user.toString() !== req.user._id.toString())) {
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
        if (!req.user) {
            return res.status(200).json({ success: true, history: [] });
        }
        const cacheKey = `history:${req.user._id}:pdfToImage`;

        // 1. Try to get from cache
        const cachedHistory = await cache.get(cacheKey);
        if (cachedHistory) {
            return res.status(200).json({ 
                success: true, 
                history: cachedHistory,
                source: 'cache'
            });
        }

        // 2. If not in cache, fetch from database
        const history = await PdfToImage.find({ user: req.user?._id }).sort({ createdAt: -1 });

        // 3. Store in cache (TTL: 1 hour)
        await cache.set(cacheKey, history, 3600);

        res.status(200).json({ 
            success: true, 
            history,
            source: 'database'
        });
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

        if (record.user && (!req.user || record.user.toString() !== req.user._id.toString())) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Optional: Delete images from Cloudinary if needed. 
        // For now, just delete from DB.
        await PdfToImage.findByIdAndDelete(id);

        // Clear history cache
        if (req.user) {
            await cache.del(`history:${req.user._id}:pdfToImage`);
        }

        res.status(200).json({ success: true, message: 'Record deleted successfully' });
    } catch (err) {
        next(err);
    }
};
