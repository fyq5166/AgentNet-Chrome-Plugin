console.log('Content script loaded.');

let lastHtml = '';
let lastUrl = '';

// Function to send information to the server
const sendInfo = (type, data, callback) => {
  // console.log(`Preparing to send ${type} data...`);
  fetch('http://localhost:3000/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type, data })
  })
  .then(response => response.text())
  .then(data => {
    // console.log(`Data sent to server (${type}):`, data);
    if (callback) {
      callback({ status: 'success', data: data });
    }
  })
  .catch(error => {
    console.error(`Error sending ${type} data:`, error);
    if (callback) {
      callback({ status: 'error', message: error.message });
    }
  });
};

// Function to check and send page info if HTML or URL changed
const checkAndSendPageInfo = () => {
  const currentHtml = document.body.innerHTML;
  const currentUrl = window.location.href;

  if (currentUrl !== lastUrl || currentHtml !== lastHtml) {
    // console.log('URL or HTML changed');
    lastHtml = currentHtml;
    lastUrl = currentUrl;

    const pageInfo = {
      html: currentHtml,
      url: currentUrl
    };

    // console.log('Page info:', pageInfo);

    chrome.runtime.sendMessage({ type: "pageInfo", data: pageInfo }, function (response) {
      // console.log('Page info sent to background:', response);
    });
  }
};

// Initial check to send page info as observation space
checkAndSendPageInfo();

// Timer to continuously monitor URL changes (per second)
setInterval(() => {
  checkAndSendPageInfo();
}, 1000);

// Listen for click events
document.addEventListener('click', function (event) {
  const element = event.target;
  const elementInfo = {
    tag: element.tagName,
    id: element.id,
    class: element.className,
    text: element.innerText,
  };
  // console.log('Clicked element:', elementInfo);

  // Send click event to background
  chrome.runtime.sendMessage({ type: "click", data: elementInfo }, function (response) {
    // console.log('Click event sent to background:', response);
  });

  // Check and send page info after a click
  checkAndSendPageInfo();
});
