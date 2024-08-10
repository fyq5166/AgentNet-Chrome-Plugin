// The script listen for messages from content
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // Listen for click messages
  if (message.type === "click") {
    // console.log('Received click event:', message.data);
    sendResponse({ status: 'success', data: 'Click event recorded' });

    // Send click data to server
    fetch('http://localhost:5328/api/browser/append_element', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'click', data: message.data })
    })
    .then(response => response.text())
    .then(data => {
      console.log('Click data sent to server:', data);
    })
    .catch(error => {
      console.error('Error sending click data:', error);
    });

  } 
  // Listen for page info messages
  else if (message.type === "pageInfo") {
    // console.log('Received page info:', message.data);

    // Send page info to server
    fetch('http://localhost:5328/api/browser/append_html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'pageInfo', data: message.data })
    })
    .then(response => response.text())
    .then(data => {
      console.log('Page info sent to server:', data);
    })
    .catch(error => {
      console.error('Error sending page info:', error);
    });

    sendResponse({ status: 'success', data: message.data });
  }
  return true; // Required to keep the sendResponse callback valid
});