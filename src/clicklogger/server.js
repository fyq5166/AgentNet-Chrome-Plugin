const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const logFilePath = path.join(__dirname, 'logData.json');

app.use(cors());
// Increase the limit to 10mb to handle large data
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const readLogFile = () => {
    try {
        const data = fs.readFileSync(logFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeLogFile = (data) => {
    fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2), 'utf8');
};

// Process data received from background 
app.post('/log', (req, res) => {
    const logData = req.body;
    // console.log('Received data:', logData);
  
    const currentLog = readLogFile();
  
    currentLog.push(logData);
    writeLogFile(currentLog); 
    res.status(200).send('Data received and logged');
});

app.listen(port, () => {
    // console.log(`Server running at http://localhost:${port}`);
});
