require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./src/app');

// Start Server
const startServer = async () => {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📡 Health Check: http://localhost:${PORT}/`);
    });
};

startServer();
