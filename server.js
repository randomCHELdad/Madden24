const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

// Endpoint to receive POST requests from the companion app
app.post('/madden-stats', (req, res) => {
    const data = req.body;

    // Send the received data to the client-side JavaScript page
    // You can also process the data here if needed before sending it
    res.json(data);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
