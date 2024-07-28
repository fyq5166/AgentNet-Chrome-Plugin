const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
// Increase the limit to 10mb to handle large data
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Process data received from background 
app.post('/log', (req, res) => {
  const logData = req.body;
  console.log('Received data:', logData);
  res.status(200).send('Data received');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
