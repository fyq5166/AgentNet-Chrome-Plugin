// terminal here
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// permit cross-site requests
app.use(cors());
app.use(express.json());

app.post('/log', (req, res) => {
  // data here
  const logData = req.body;
  console.log('Received data:', logData);
  res.status(200).send('Data received');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
