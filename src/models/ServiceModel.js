const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please provide a description']
    },
    icon: {
        type: String, // lucide-react icon name or similar
        required: [true, 'Please provide an icon name']
    },
    path: {
        type: String,
        required: [true, 'Please provide a target path'],
        unique: true
    },
    status: {
        type: String,
        enum: ['Functional', 'Coming Soon'],
        default: 'Functional'
    },
    category: {
        type: String,
        enum: ['Conversion', 'Editing', 'Security', 'Organization', 'Other'],
        default: 'Conversion'
    },
    displayOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Service', serviceSchema);
