import {getWebpageState} from "./webpage";

console.log("Content script loaded.");

let lastHtml = "";
let lastUrl = "";

// Function to check and send page info if HTML or URL changed
/**
 * Check and send page info if HTML or URL changed
 * @param clickTs ISO timestamp string of a click event that triggered this check for updated page info
 *                  usually null (for when this is triggered periodically rather than in response to a click)
 */
const checkAndSendPageInfo = (clickTs: string|null = null) => {
  const currentHtml = document.body.innerHTML;
  const currentPgTitle = document.title;
  const currentUrl = window.location.href;

  //todo query- should we also send page info if this is for a click event, even if the url/html are the same as before?
  if (currentUrl !== lastUrl || currentHtml !== lastHtml) {
    lastHtml = currentHtml;
    lastUrl = currentUrl;

    let pageInfoSnapshotStartTs = null;
    if (clickTs === null) {
      pageInfoSnapshotStartTs = new Date().toISOString();
    }

    const dom = getWebpageState();
    const pageInfo = {
      html: currentHtml,
      dom: dom,
      url: currentUrl,
      title: currentPgTitle
    };
    const pageInfoSnapshotEndTs = new Date().toISOString();
    chrome.runtime.sendMessage(
      {
        type: "pageInfo", clickTs: clickTs, pageInfoSnapshotStartTs: pageInfoSnapshotStartTs,
        pageInfoSnapshotEndTs: pageInfoSnapshotEndTs, data: pageInfo
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
document.addEventListener("click", function (event) {
  const clickTs = new Date().toISOString();

  const element = event.target;
  if (!(element instanceof HTMLElement)) {
    console.error(`the target of a click at time ${clickTs} wasn't an HTML element! `);
    return;
  }
  const elementInfo = {
    tag: element.tagName,
    id: element.id,
    class: element.className,
    text: element.innerText,
  };
  // Send click event to background
  chrome.runtime.sendMessage({ type: "click", clickTs: clickTs, data: elementInfo });

  // Check and send page info after a click
  checkAndSendPageInfo(clickTs);
});
