const INTERESTING_TAGS = [
  "input",
  "textarea",
  "button",
  "select",
  "label",
  "a",
  "img",
];

//todo why unused?
function isVisible(element: HTMLElement) {
  // Returns true if `element` is visible in the viewport, false otherwise.
  const rect = element.getBoundingClientRect();
  const isNonZeroArea = rect.width > 0 && rect.height > 0;
  const isNonTrivialArea = rect.width > 3 && rect.height > 3; // element should be at least 3x3 pixels (filter out 1x1 icons)
  const isNotHidden =
    getComputedStyle(element).display !== "none" &&
    getComputedStyle(element).visibility === "visible";
  const isInViewport =
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
    rect.left < (window.innerWidth || document.documentElement.clientWidth);
  const isAriaHidden = element.getAttribute("aria-hidden") === "true";
  return (
    isNonZeroArea &&
    isNonTrivialArea &&
    isNotHidden &&
    isInViewport &&
    !isAriaHidden
  );
}

//todo consider replacing this homemade version with npm get-xpath or with the shadow-root/same-origin-iframe-piercing version from OSU NLP Group's extension
function getXPath(element: HTMLElement|null) {
  // Returns an XPath for an element which describes its hierarchical location in the DOM.
  if (element && element.id) {
    //Scott- I'm concerned about this because my team at OSU found that, in practice, some sites give elements
    // id's that are unique within the page but have a dynamically-generated random suffix of letters and/or numbers
    // which might make the id unreliable for identifying the element in the future.
    return "//*[@id='" + element.id + "']";
  } else {
    let segments = [];
    while (element && element.nodeType === 1) {
      let siblingIndex = 1;
      for (
        let sibling = element.previousSibling;
        sibling;
        sibling = sibling.previousSibling
      ) {
        if (sibling.nodeType === 1 && 'tagName' in sibling && sibling.tagName === element.tagName)
          siblingIndex++;
      }
      let tagName = element.tagName.toLowerCase();
      let segment =
        tagName +
        (element.previousElementSibling || element.nextElementSibling
          ? "[" + siblingIndex + "]"
          : "");
      segments.unshift(segment);
      element = element.parentNode instanceof HTMLElement ? element.parentNode : null;
    }
    return segments.length ? "/" + segments.join("/") : null;
  }
}

function getParents(element: HTMLElement|null) {
  // Get list of parent elements for `element`.
  let parents = [];
  while (element) {
    parents.unshift(element.tagName + (element.id ? "#" + element.id : ""));
    element = element.parentElement;
  }
  return parents;
}

function getElementByXPath(xpath: string): Node|null {
  // Returns the unique element matching the `xpath` expression.
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return result.singleNodeValue;
}

type ElementData = {
  element: HTMLElement,
  xpath: string|null,
  x: number,
  y: number,
  height: number,
  width: number,
  text: string,
  tag: string,
  role: string|null,
  type: string|null,
  label: string|null,
}

function getAllMatchingElements(querySelector: string, searchRoot: ShadowRoot|Document = document): ElementData[] {
  // Given a `querySelector`, returns a list of objects describing the elements matched by document.querySelectorAll(querySelector).

  const elementsDataSegments: Array<Array<ElementData>> = [];

  const possibleShadowRootHosts = Array.from(searchRoot.querySelectorAll("*"));
  const shadowRootsOfChildren = possibleShadowRootHosts.map(elem => elem.shadowRoot).filter(Boolean) as ShadowRoot[];

  shadowRootsOfChildren.forEach((shadowRoot) => {
    const shadowRootElements = getAllMatchingElements(querySelector, shadowRoot);
    elementsDataSegments.push(shadowRootElements);
  });

  const elementsData: ElementData[] = [];
  searchRoot.querySelectorAll(querySelector).forEach((element) => {
    // if (isVisible(element)) {
    if (!(element instanceof HTMLElement)) { return; }
    const rect = element.getBoundingClientRect();
    const xpath = getXPath(element);
    const parents = getParents(element);

    elementsData.push({
      // Element ID
      element: element,
      xpath: xpath,
      // Position
      x: rect.x,
      y: rect.y,
      height: rect.height,
      width: rect.width,
      // Attributes
      text: element.innerText,
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      type: element.getAttribute("type"),
      label: element.getAttribute("aria-label"),
    });
    // }
  });
  let allElementsData = elementsData;
  if (elementsDataSegments) {
    elementsDataSegments.push(elementsData);
    allElementsData = elementsDataSegments.flat();
  }
  return allElementsData;
}

/**
 * Helper functions for drawing bounding boxes
 */

// Add bounding box style
const style = document.createElement("style");
style.textContent = `
.llm-agent-box {
border: 1px solid #e00fdf !important;
}
`;
document.head.appendChild(style);

// Draw boxes around each element
function drawBoundingBoxes(elementsData: ElementData[]) {
  var BreakException = {};
  elementsData.forEach((data) => {
    if (!data.xpath) { return; }
    try {
      const element = getElementByXPath(data.xpath);
      if (element && element instanceof HTMLElement) {
        element.classList.add("llm-agent-box");
      } else {
      }
    } catch {
      console.log(data);
      throw BreakException;
    }
  });
}

// Remove bounding boxes
function removeBoundingBoxes() {
  document.querySelectorAll(".llm-agent-box").forEach((element) => {
    element.classList.remove("llm-agent-box");
  });
}

type Box = {
  x: number,
  y: number,
  width: number,
  height: number
}

// Define a bounding box as { x: 0, y: 0, width: 0, height: 0 }
function intersectionArea(boxA: Box, boxB: Box) {
  const xOverlap = Math.max(
    0,
    Math.min(boxA.x + boxA.width, boxB.x + boxB.width) -
    Math.max(boxA.x, boxB.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(boxA.y + boxA.height, boxB.y + boxB.height) -
    Math.max(boxA.y, boxB.y)
  );
  return xOverlap * yOverlap;
}

function boxArea(box: Box) {
  return box.width * box.height;
}

function overlapRatio(boxA: Box, boxB: Box) {
  // Calculate the overlap ratio between two bounding boxes (boxA and boxB)
  const intersection = intersectionArea(boxA, boxB);
  const union = boxArea(boxA) + boxArea(boxB) - intersection;
  return intersection / union;
}
/**
 * Helper functions for drawing labels on bounding boxes
 */
function onLabelMouseOverShowBoundingBox(labelElement: HTMLElement) {
  // When a label is moused over, show its corresponding bounding box
  // @ts-ignore TS7015 -- I (while converting existing code to Typescript) don't know if a simple getAttribute() call would be equivalent, so I can't get around this
  const xpath = labelElement.attributes["elementsData-xpath"];
  if (typeof xpath !== "string") {
    console.warn("an element's `elementsData-xpath` value was not of type string");
    return;
  }
  const element = getElementByXPath(xpath);
  if (element && element instanceof HTMLElement) {
    element.classList.add("llm-agent-box");
  }
}
function onLabelMouseOutHideBoundingBox(labelElement: HTMLElement) {
  // When a label is moused out, hide its corresponding bounding box
  // @ts-ignore TS7015 -- I (while converting existing code to Typescript) don't know if a simple getAttribute() call would be equivalent, so I can't get around this
  const xpath = labelElement.attributes["elementsData-xpath"];
  const element = getElementByXPath(xpath);
  if (element && element instanceof HTMLElement) {
    element.classList.remove("llm-agent-box");
  }
}
function addLabels(elementsData: ElementData[]) {
  // Given a list of elements with bounding boxes, add a label above each element on the webpage to visualize labels.
  elementsData.forEach((data, idx) => {
    if (!data.xpath) { return; }
    // Get the element using XPath
    const element = getElementByXPath(data.xpath);
    if (element) {
      // Create a new div for the label
      let labelDiv = document.createElement("div");

      // Set the content and style
      labelDiv.innerText = `${data.label} (${data.type}) | ${truncate(
        data.text,
        10
      )}`;
      labelDiv.style.position = "absolute";
      labelDiv.style.left = data.x + "px";
      labelDiv.style.top = data.y - 9 + "px";
      labelDiv.style.height = "9px";
      labelDiv.style.backgroundColor = "rgba(255, 255, 255, 0.7)"; // semi-transparent white background
      labelDiv.style.border = "1px solid black";
      labelDiv.style.padding = "2px";
      labelDiv.style.fontSize = "8px";
      labelDiv.style.zIndex = "10000";
      labelDiv.classList.add("llm-agent-box-label");
      // @ts-ignore TS7015 -- I (converting existing code to typescript) don't know if there's a way to do this that avoids the "implicit any" complaints from using a string to access the NamedNodeMap
      labelDiv.attributes["elementsData-xpath"] = data.xpath;
      // @ts-ignore TS7015 -- see previous ts-ignore comment's explanation
      labelDiv.attributes["elementsData-idx"] = idx;

      // Add event listener for hovering over the label
      labelDiv.addEventListener("mouseover", () =>
        onLabelMouseOverShowBoundingBox(labelDiv)
      );
      labelDiv.addEventListener("mouseout", () =>
        onLabelMouseOutHideBoundingBox(labelDiv)
      );

      // Append the label div to the body (or to the specific element if you prefer)
      document.body.appendChild(labelDiv);
    }
  });
}
function removeLabels() {
  document
    .querySelectorAll(".llm-agent-box-label")
    .forEach((element) => element.remove());
}

function generateJSONState(elementsData: ElementData[]) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight;

  // Given a list of elements, generate a JSON string representing the state of the page.
  const filteredElementsData = elementsData
    .filter((data) => {
      // Ignore things off screen
      if (data.x < 0 || data.y < 0 || data.x + data.width > viewportWidth || data.y + data.height > viewportHeight) {
        return false;
      }
      // Ignore things with no text, label, etc. that aren't interesting tags
      if (!INTERESTING_TAGS.includes(data.tag)) {
        if (
          data.label === null &&
          data.role === null &&
          (data.text === "" || data.text === null)
        ) {
          return false;
        }
      }
      return true;
    })
    .map((data) => {
      return {
        x: Math.round(data.x),
        y: Math.round(data.y),
        height: Math.round(data.height),
        width: Math.round(data.width),
        normX: data.x / viewportWidth,
        normY: data.y / viewportHeight,
        normHeight: data.height / viewportHeight,
        normWidth: data.width / viewportWidth,
        // Attributes
        text: data.text,
        label: data.label,
        role: data.role,
        type: data.type,
        tag: data.tag,
        xpath: data.xpath,
      };
    });
  return JSON.stringify(filteredElementsData);
}
function truncate(text: string, n: number) {
  return text.length > n ? text.substr(0, n - 1) + "…" : text;
}

function filterOutNonAccessibleElements(elementsData: ElementData[]) {
  // Filter out elements that are not accessible
  return elementsData.filter((data) => {
    // Valid if has at least one of...
    const hasRoleAttribute = data.element.getAttribute("role") !== null;
    const hasAriaAttribute =
      Array.from(data.element.attributes).filter((e) =>
        e.name.startsWith("aria-")
      ).length > 0;
    const hasDataAttribute =
      data.element.getAttribute("data-view-component") !== null;
    const isInteractableElement = INTERESTING_TAGS.includes(
      data.element.tagName.toLowerCase()
    );
    const isLink =
      data.element.tagName.toLowerCase() === "a" &&
      data.element.getAttribute("href") !== null;
    const isTextBlock =
      ["span", "p"].includes(data.element.tagName.toLowerCase()) &&
      data.element.innerText.length > 0;
    return (
      hasRoleAttribute ||
      hasAriaAttribute ||
      hasDataAttribute ||
      isInteractableElement ||
      isLink ||
      isTextBlock
    );
  });
}

function filterOutOverlappingBoxes(elementsData: ElementData[], threshold: number) {
  // `elementsData` must be a list of dicts with keys: x,y,height,width
  const toRemove = new Set();

  for (let i = 0; i < elementsData.length; i++) {
    if (toRemove.has(i)) continue;

    for (let j = i + 1; j < elementsData.length; j++) {
      if (toRemove.has(j)) continue;

      if (overlapRatio(elementsData[i], elementsData[j]) > threshold) {
        // Decide which box to remove.
        // Preferences:
        //  1. Keep element with aria-label
        const ariaLabelI = elementsData[i].label;
        const ariaLabelJ = elementsData[j].label;
        if (ariaLabelI !== null && ariaLabelJ === null) {
          toRemove.add(j);
        } else if (ariaLabelI === null && ariaLabelJ !== null) {
          toRemove.add(i);
          break; // No need to continue this inner loop since i is marked for removal
        } else {
          //  2. Keep smaller element
          const areaI = boxArea(elementsData[i]);
          const areaJ = boxArea(elementsData[j]);
          if (areaI >= areaJ) {
            toRemove.add(i);
            break; // No need to continue this inner loop since i is marked for removal
          } else {
            toRemove.add(j);
          }
        }
      }
    }
  }

  return elementsData.filter((_, index) => !toRemove.has(index));
}

////////////////////////
// Everything above should be copied from `chrome_extension/html_to_state.js`
////////////////////////

export function getWebpageState(): string {
  const allElements = getAllMatchingElements("body *");
  // const accessibilityElements = filterOutNonAccessibleElements(allElements);
  // const filteredElements = filterOutOverlappingBoxes(
  //   accessibilityElements,
  //   0.5
  // );
  const json = generateJSONState(allElements);
  return json;
}