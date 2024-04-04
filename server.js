const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const json2csv = require('json2csv').parse;

const app = express();
app.use(bodyParser.json());

// API endpoint to receive data from the companion app
app.post('/madden-stats', (req, res) => {
    const data = req.body;

    // Generate JSON file
    const jsonFileName = `data_${Date.now()}.json`;
    fs.writeFileSync(jsonFileName, JSON.stringify(data));

    // Generate CSV file
    const csvFileName = `data_${Date.now()}.csv`;
    const csvData = json2csv(data);
    fs.writeFileSync(csvFileName, csvData);

    res.status(200).send('Data received and files generated successfully');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
