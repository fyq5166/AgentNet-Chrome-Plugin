console.log('Content script loaded.');

let lastHtml = '';
let lastUrl = '';


// Function to check and send page info if HTML or URL changed
const checkAndSendPageInfo = () => {
  const currentHtml = document.body.innerHTML;
  const currentUrl = window.location.href;

  if (currentUrl !== lastUrl || currentHtml !== lastHtml) {
    lastHtml = currentHtml;
    lastUrl = currentUrl;

    const pageInfo = {
      html: currentHtml,
      url: currentUrl
    };
    chrome.runtime.sendMessage({ type: "pageInfo", data: pageInfo });
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
  // Send click event to background
  chrome.runtime.sendMessage({ type: "click", data: elementInfo });

  // Check and send page info after a click
  checkAndSendPageInfo();
});
