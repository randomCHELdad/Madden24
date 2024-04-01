const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(bodyParser.json());

// Directory where HTML pages will be saved
const publicDirectory = 'C:/Users/Rich/Documents/OutsideahBoston/Website/Public';

// Array to store player statistics
let playerStats = [];

// Array to store team statistics
let teamStats = [];

app.post('/madden24', (req, res) => {
    const data = req.body;

    // Determine the type of data sent (player stats, team stats, etc.)
    if (data.type === 'playerStats') {
        // Extract player statistics from the data
        const { playerName, passingYards, receivingYards, rushingYards } = data;

        // Create an object to represent player statistics
        const playerStat = {
            playerName,
            passingYards: parseInt(passingYards),
            receivingYards: parseInt(receivingYards),
            rushingYards: parseInt(rushingYards)
        };

        // Add player statistics to the array
        playerStats.push(playerStat);
    } else if (data.type === 'teamStats') {
        // Extract team statistics from the data
        const { teamName, wins, losses, pointsFor, pointsAgainst } = data;

        // Create an object to represent team statistics
        const teamStat = {
            teamName,
            wins: parseInt(wins),
            losses: parseInt(losses),
            pointsFor: parseInt(pointsFor),
            pointsAgainst: parseInt(pointsAgainst)
        };

        // Add team statistics to the array
        teamStats.push(teamStat);
    }

    // Generate HTML pages
    generateHTMLPages();

    // Send a response
    res.status(200).send('Data received successfully');
});

function generateHTMLPages() {
    // Generate player stats HTML page
    const playerStatsContent = generateStatsHTML(playerStats, 'Player Stats');
    fs.writeFileSync(path.join(publicDirectory, 'playerStats.html'), playerStatsContent);

    // Generate team stats HTML page
    const teamStatsContent = generateStatsHTML(teamStats, 'Team Stats');
    fs.writeFileSync(path.join(publicDirectory, 'teamStats.html'), teamStatsContent);
}

function generateStatsHTML(stats, title) {
    let content = `<html><head><title>${title}</title></head><body><h1>${title}</h1><ul>`;
    stats.forEach(stat => {
        content += `<li>${JSON.stringify(stat)}</li>`;
    });
    content += '</ul></body></html>';
    return content;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
