const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
    console.log('WebSocket client connected');

    ws.on('message', function incoming(message) {
        console.log('Received message:', message);

        try {
            const data = JSON.parse(message);
            // Here you can process the received data as needed
            console.log('Data:', data);
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
});
