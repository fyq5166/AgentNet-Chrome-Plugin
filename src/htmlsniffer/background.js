async function getActiveTab() {
  let currTab = undefined;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) {
    console.warn("No active tab found");
  } else if (!tabs[0].id) {
    console.warn("Active tab has no ID");
  } else if (tabs[0].url?.startsWith('chrome://')) {
      console.warn('Active tab is a chrome:// URL: ' + tabs[0].url);
  } else {
    currTab = tabs[0];
  }
  return currTab;
}

async function getActiveTabAxTree() {
    const currTab = await getActiveTab();
    if (!currTab) {
        return undefined;
    }
    const target = { tabId: currTab.id };
    const requiredVersion = "1.3";

    await chrome.debugger.attach(target, requiredVersion);

    const axTree = await chrome.debugger.sendCommand(target, "Accessibility.getFullAXTree", {});
    //console.info('Accessibility tree:', JSON.stringify(axTree));

    await chrome.debugger.detach(target);

    return axTree;
}

async function sendDataBatchToLocalBackend(dataBatch, batchType, backendEndpoint) {
  let axTree = undefined;
  try {
    axTree = await getActiveTabAxTree();
  } catch (error) {
    console.error('Error getting active tab accessibility tree:', error);
  }
  const backendResp = await fetch(`http://localhost:5328/api/browser/${backendEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: batchType, data: dataBatch, pageAxTree: axTree })
  });
  const respMsg = await backendResp.text();
  console.info(`${batchType} Data batch sent to backend: ${respMsg}`);
}

// The script listen for messages from content
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // Listen for click messages
  if (message.type === "click") {
    // console.log('Received click event:', message.data);
    sendResponse({ status: 'success', data: 'Click event recorded' });

    sendDataBatchToLocalBackend(message.data, 'click', 'append_element')
        .catch(error => console.error('Error sending click data:', error));
  } 
  // Listen for page info messages
  else if (message.type === "pageInfo") {
    // console.log('Received page info:', message.data);

    sendDataBatchToLocalBackend(message.data, 'pageInfo', 'append_html')
        .catch(error => console.error('Error sending page info data:', error));

    //todo can we please consider not transmitting the large html data back to the content script?
    sendResponse({ status: 'success', data: message.data });
  }
  return true; // Required to keep the sendResponse callback valid
});