const express = require('express');
const router = express.Router();
const { getAllServices, createService, deleteService } = require('../controllers/serviceController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Get all services (base data fetch)
router.get('/', getAllServices);

// Create and Delete (Admin only)
router.post('/', authMiddleware, adminMiddleware, createService);
router.delete('/:id', authMiddleware, adminMiddleware, deleteService);

module.exports = router;
