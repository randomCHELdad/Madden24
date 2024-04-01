const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();

app.use(bodyParser.json());

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

    // Generate template files
    generateTemplateFiles();

    // Send a response
    res.status(200).send('Data received successfully');
});

function generateTemplateFiles() {
    // Generate or update playerStats.ejs file
    let playerStatsEjsContent = `<h1>Player Stats</h1>\n<ul>\n`;
    playerStats.forEach(stat => {
        playerStatsEjsContent += `<li>${stat.playerName}: ${stat.passingYards} passing yards, ${stat.receivingYards} receiving yards, ${stat.rushingYards} rushing yards</li>\n`;
    });
    playerStatsEjsContent += `</ul>\n`;
    fs.writeFileSync('views/playerStats.ejs', playerStatsEjsContent);

    // Generate or update teamStats.ejs file
    let teamStatsEjsContent = `<h1>Team Stats</h1>\n<ul>\n`;
    teamStats.forEach(stat => {
        teamStatsEjsContent += `<li>${stat.teamName}: ${stat.wins} wins, ${stat.losses} losses, ${stat.pointsFor} points for, ${stat.pointsAgainst} points against</li>\n`;
    });
    teamStatsEjsContent += `</ul>\n`;
    fs.writeFileSync('views/teamStats.ejs', teamStatsEjsContent);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
