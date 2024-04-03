const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// GitHub repository details
const owner = 'YOUR_GITHUB_USERNAME';
const repo = 'YOUR_GITHUB_REPOSITORY';
const commitMessage = 'Update data';

app.post('/madden-stats', async (req, res) => {
    const data = req.body;

    try {
        // Create or update JSON files in the stats directory
        await createOrUpdateStatsFiles(data);

        // Send a success response
        res.status(200).send('Data received and files updated successfully');
    } catch (error) {
        // Handle errors
        console.error('Error updating files:', error);
        res.status(500).send('Internal server error');
    }
});

// Function to create or update JSON files in the stats directory of the GitHub repository
async function createOrUpdateStatsFiles(data) {
    const githubToken = 'YOUR_GITHUB_ACCESS_TOKEN';

    // Prepare data to be written to the files
    const content = JSON.stringify(data);

    // Make a request to the GitHub API to create/update the files
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/stats`;
    const headers = {
        Authorization: `token ${githubToken}`,
        'Content-Type': 'application/json'
    };
    const body = {
        message: commitMessage,
        content: Buffer.from(content).toString('base64') // Encode content to base64
    };

    const response = await axios.put(url, body, { headers });
    return response.data;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
