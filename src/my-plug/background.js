// plugin console here (including messaging records)

// listen for messages sent from the browser extension

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "click") {
    console.log('Received click data:', message.data);
    
    // send message to port 3000
    fetch('http://localhost:3000/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message.data)
    })
    .then(response => response.text())
    .then(data => {
      console.log('Data sent to server:', data);
      // back to content.js
      sendResponse({status: 'success', data: data});
    })
    .catch(error => {
      console.error('Error sending data:', error);
      sendResponse({status: 'error', message: error.message});
    });

    return true; // Required to keep the sendResponse callback valid
  }
});
