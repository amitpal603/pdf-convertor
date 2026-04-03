const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const errorMiddleware = require('./middlewares/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();

// Standard Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Adjust to your frontend URL
  credentials: true, // Required for cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth/', authRoutes);
app.use('/api/pdf/', pdfRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PDF Converter API is running',
  });
});

// Centralized Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
