#!/usr/bin/env node

/**
 * SMARTArt Database Web Application Startup Script
 * This script initializes and starts the Express server
 */

const express = require('express');
const path = require('path');

// Create Express application
const app = express();

// Configuration
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Basic route
app.get('/', (req, res) => {
    res.send(`
        <h1>SMARTArt Database Web Application</h1>
        <p>Server is running successfully!</p>
        <p>Time: ${new Date().toLocaleString()}</p>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log('🚀 SMARTArt Database Web Server Started');
    console.log(`📍 Server running at: http://${HOST}:${PORT}`);
    console.log(`🕒 Started at: ${new Date().toLocaleString()}`);
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminated');
    process.exit(0);
});
