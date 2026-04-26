const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Service = require('../models/ServiceModel');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const services = [
    {
        title: 'Image to PDF',
        description: 'Convert multiple images into a single professional PDF document with high fidelity.',
        icon: 'FileStack',
        path: '/convert/image-to-pdf',
        status: 'Functional',
        category: 'Conversion',
        displayOrder: 1
    },
    {
        title: 'PDF to Image',
        description: 'Extract pages from your PDF documents and convert them into high-quality JPEG or PNG images.',
        icon: 'FileImage',
        path: '/convert/pdf-to-image',
        status: 'Functional',
        category: 'Conversion',
        displayOrder: 2
    },
    {
        title: 'Merge PDF',
        description: 'Combine multiple PDF files into one single organized document.',
        icon: 'Layout',
        path: '/merge',
        status: 'Coming Soon',
        category: 'Organization',
        displayOrder: 3
    },
    {
        title: 'Split PDF',
        description: 'Separate one PDF into multiple documents by page range or extract all pages.',
        icon: 'Columns',
        path: '/split',
        status: 'Coming Soon',
        category: 'Organization',
        displayOrder: 4
    }
];

const seedServices = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully.');

        // Clear existing services to avoid duplicates based on unique fields
        await Service.deleteMany({});
        console.log('Cleared existing services.');

        // Insert new services
        await Service.insertMany(services);
        console.log('Services seeded successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Error seeding services:', err);
        process.exit(1);
    }
};

seedServices();
