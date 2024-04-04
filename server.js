const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
app.use(bodyParser.json());

// Create a connection pool to the MySQL database
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'pdb1054.awardspace.net',
  user: '4461638_wpress05438709',
  password: process.env.DB_PASSWORD,
  database: '4461638_wpress05438709'
});

// Endpoint to handle incoming stats data from the companion app
app.post('/madden-stats', (req, res) => {
  const data = req.body;

  // Insert the received stats data into the MySQL database
  const query = 'INSERT INTO stats_table (stat_name, stat_value) VALUES ?';
  const values = Object.entries(data).map(([statName, statValue]) => [statName, statValue]);

  pool.query(query, [values], (error, results, fields) => {
    if (error) {
      console.error('Error inserting data into MySQL:', error);
      res.status(500).send('Internal server error');
      return;
    }

    console.log('Stats data inserted into MySQL:', results.affectedRows);
    res.status(200).send('Stats data inserted successfully');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
