const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
app.use(bodyParser.json());

// GitHub repository details
const owner = 'randomCHELdad';
const repo = 'Madden24';
const commitMessage = 'Update data';

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 }); // Choose a port for WebSocket server

wss.on('connection', function connection(ws) {
    console.log('WebSocket client connected');
});

app.post('/madden-stats', async (req, res) => {
    const data = req.body;

    // Process the received data
    // Your code to process data goes here

    try {
        // Extract file paths from the received data
        const filePaths = data.filePaths;

        // Use the GitHub API to create/update the files
        const promises = filePaths.map(filePath => createOrUpdateFile(data, filePath));
        await Promise.all(promises);

        // Send a success response
        res.status(200).send('Data received and files updated successfully');

        // Send updated data to WebSocket clients
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    } catch (error) {
        // Handle errors
        console.error('Error updating files:', error);
        res.status(500).send('Internal server error');
    }
});

// Function to create or update a file in the GitHub repository
async function createOrUpdateFile(data, filePath) {
    const githubToken = 'YOUR_GITHUB_ACCESS_TOKEN';

    // Prepare data to be written to the file
    const content = Buffer.from(JSON.stringify(data)).toString('base64');

    // Make a request to the GitHub API to create/update the file
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const headers = {
        Authorization: `token ${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}`,
        'Content-Type': 'application/json'
    };
    const body = {
        message: commitMessage,
        content: content
    };

    const response = await axios.put(url, body, { headers });
    return response.data;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
