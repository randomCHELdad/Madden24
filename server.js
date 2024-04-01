const { Octokit } = require('@octokit/rest');

// Create an instance of Octokit with authentication using the token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Access token from environment variable
});

// Example function to create or update a file in a GitHub repository
async function createOrUpdateFile(owner, repo, path, content) {
  try {
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: 'Add data', // Commit message
      content: Buffer.from(content).toString('base64'), // Content encoded in base64
    });

    console.log('File created/updated:', response.data);
  } catch (error) {
    console.error('Error creating/updating file:', error);
  }
}

// Example usage
const owner = 'randomCHELdad';
const repo = 'Madden24';
const path = 'Madden24/blob/main/package.json';
const content = JSON.stringify({ key: 'value' });

createOrUpdateFile(owner, repo, path, content);
