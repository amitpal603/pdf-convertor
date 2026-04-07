const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const errorMiddleware = require('./middlewares/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const serviceRoutes = require('./routes/serviceRoutes');

const app = express();

// Standard Middleware
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'https://pdf-convertor-frontend.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
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
app.use('/api/services/', serviceRoutes);

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
