const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary
 * 
 * @param {string} localFilePath - Path to the local file
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<object>} upload result
 */
const uploadOnCloudinary = async (localFilePath, folder = 'pdf_converter') => {
  try {
    if (!localFilePath) return null;

    // Upload to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
      folder: folder,
    });

    // Remove local file after successful upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (err) {
    // Remove local file even if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error('Cloudinary Upload Failed:', err.message);
    return null;
  }
};

/**
 * Delete a file from Cloudinary
 * 
 * @param {string} publicId - The Cloudinary public ID of the file
 * @returns {Promise<object>} deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw' // PDF is considered raw, but 'auto' or 'image' may also apply
    });

    return result;
  } catch (err) {
    console.error('Cloudinary Deletion Failed:', err.message);
    return null;
  }
};

module.exports = {
  uploadOnCloudinary,
  deleteFromCloudinary,
};
