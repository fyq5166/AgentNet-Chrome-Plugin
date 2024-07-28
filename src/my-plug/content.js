// web console here

console.log('Content script loaded.');

// Listen for click events on the document
document.addEventListener('click', function(event) {
  // fetch element info
  var element = event.target;
  // info format, you may fetch desired info
  var elementInfo = {
    tag: element.tagName,
    id: element.id,
    class: element.className,
    text: element.innerText
  };

  console.log('Clicked element:', elementInfo);

  if (chrome.runtime && chrome.runtime.sendMessage) {
    console.log('Sending message to background script');
    // send message to and receive response from background script
    chrome.runtime.sendMessage({type: "click", data: elementInfo}, function(response) {
      console.log('Response from background:', response);
    });
  } else {
    console.error('chrome.runtime or chrome.runtime.sendMessage is not available.');
  }
});
