const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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

        // Emit a WebSocket event with updated player stats
        io.emit('playerStatsUpdate', playerStats);
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

        // Emit a WebSocket event with updated team stats
        io.emit('teamStatsUpdate', teamStats);
    }

    // Send a response
    res.status(200).send('Data received successfully');
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
