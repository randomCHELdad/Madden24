const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
app.use(bodyParser.json());

// WebSocket server URL
const wsUrl = 'wss://maddenws.onrender.com';

// Create a WebSocket connection to the server
const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
    console.log('Connected to WebSocket server');
});

ws.on('close', function close() {
    console.log('Disconnected from WebSocket server');
});

// Handle WebSocket errors
ws.on('error', function error(error) {
    console.error('WebSocket error:', error);
});

// Route to receive POST requests from the companion app
app.post('/madden-stats', async (req, res) => {
    const data = req.body;

    // Process the received data
    // Your code to process data goes here

    try {
        // Extract file paths from the received data
        const filePaths = data.filePaths;

        // Use WebSocket to send the data to connected clients
        ws.send(JSON.stringify(data));

        // Send a success response
        res.status(200).send('Data received and forwarded to WebSocket server');
    } catch (error) {
        // Handle errors
        console.error('Error forwarding data to WebSocket server:', error);
        res.status(500).send('Internal server error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server is running on port ${PORT}`);
});
