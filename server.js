const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "Madden24" directory
app.use(express.static(path.join(__dirname, 'Madden24')));

app.use(bodyParser.json());

// Array to store received data
let receivedData = [];

// POST endpoint to receive data from the companion app
app.post('/madden24', (req, res) => {
    const data = req.body;

    // Process the received data as needed
    console.log('New data received:', data);

    // Store the received data
    receivedData.push(data);

    // Broadcast updated data to all connected clients
    io.emit('updatedData', receivedData);

    // Send a response
    res.status(200).send('Data received successfully');
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('A client connected');

    // Send initial data to client
    socket.emit('initialData', receivedData);

    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
