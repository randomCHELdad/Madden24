const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// GitHub repository details
const owner = 'randomCHELdad';
const repo = 'Madden24';
const filePath = 'path/to/your/file.json'; // Path where you want to create/update the file
const commitMessage = 'Update data';

app.post('/madden-stats', async (req, res) => {
    const data = req.body;

    // Process the received data
    // Your code to process data goes here

    try {
        // Use the GitHub API to create/update the file
        const response = await createOrUpdateFile(data);

        // Send a success response
        res.status(200).send('Data received and file updated successfully');
    } catch (error) {
        // Handle errors
        console.error('Error updating file:', error);
        res.status(500).send('Internal server error');
    }
});

// Function to create or update a file in the GitHub repository
async function createOrUpdateFile(data) {
    const githubToken = 'YOUR_GITHUB_ACCESS_TOKEN';

    // Prepare data to be written to the file
    const content = Buffer.from(JSON.stringify(data)).toString('base64');

    // Make a request to the GitHub API to create/update the file
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const headers = {
        Authorization: `token ${github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}`,
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
