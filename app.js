import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";


/* --------------------------------
   PDF.js worker
-------------------------------- */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


/* --------------------------------
   Elements
-------------------------------- */

const pdfInput = document.getElementById("pdfInput");

const uploadBtn = document.getElementById("uploadBtn");
const welcomeUpload = document.getElementById("welcomeUpload");

const welcome = document.getElementById("welcome");
const editor = document.getElementById("editor");

const pdfContainer =
  document.getElementById("pdfContainer");

const prevPage =
  document.getElementById("prevPage");

const nextPage =
  document.getElementById("nextPage");

const pageInfo =
  document.getElementById("pageInfo");

const zoomOut =
  document.getElementById("zoomOut");

const zoomIn =
  document.getElementById("zoomIn");

const fitPage =
  document.getElementById("fitPage");

const zoomInfo =
  document.getElementById("zoomInfo");


/* --------------------------------
   State
-------------------------------- */

let pdfDocument = null;

let currentPage = 1;

let zoom = 1;

// Today's date stamp, stored per PDF page.
// Format: DD/MM/YYYY
const todayStamp = document.getElementById("todayStamp");
const pageStamps = new Map();
let renderVersion = 0;


/* --------------------------------
   Upload buttons
-------------------------------- */

uploadBtn.addEventListener("click", () => {
  pdfInput.click();
});

welcomeUpload.addEventListener("click", () => {
  pdfInput.click();
});


/* --------------------------------
   PDF selection
-------------------------------- */

pdfInput.addEventListener("change", async (event) => {

  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (file.type !== "application/pdf") {

    alert("Please select a PDF file.");

    pdfInput.value = "";

    return;
  }

  try {

    const arrayBuffer =
      await file.arrayBuffer();

    pdfDocument =
      await pdfjsLib.getDocument({
        data: arrayBuffer
      }).promise;

    currentPage = 1;
    zoom = 1;
    pageStamps.clear();

    welcome.classList.add("hidden");

    editor.classList.remove("hidden");

    await renderPage();

  } catch (error) {

    console.error(error);

    alert(
      "The PDF could not be opened."
    );

  }

});


/* --------------------------------
   Today stamp
-------------------------------- */

function getTodayStampText() {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());

  return `${day}/${month}/${year}`;
}

if (todayStamp) {
  todayStamp.addEventListener("click", async () => {
    if (!pdfDocument) return;

    const existing = pageStamps.get(currentPage);

    pageStamps.set(currentPage, {
      text: existing?.text || getTodayStampText(),
      x: existing?.x ?? 30,
      y: existing?.y ?? 30
    });

    await renderPage();
  });
}

function addStampOverlay(container) {
  const stamp = pageStamps.get(currentPage);

  if (!stamp) return;

  const stampEl = document.createElement("div");
  stampEl.className = "today-stamp";
  stampEl.textContent = stamp.text;

  stampEl.style.left = `${stamp.x * zoom}px`;
  stampEl.style.top = `${stamp.y * zoom}px`;

  let dragging = false;
  let startClientX = 0;
  let startClientY = 0;
  let startX = stamp.x;
  let startY = stamp.y;

  stampEl.addEventListener("pointerdown", (event) => {
    dragging = true;
    startClientX = event.clientX;
    startClientY = event.clientY;
    startX = stamp.x;
    startY = stamp.y;

    try {
      stampEl.setPointerCapture(event.pointerId);
    } catch (_) {}

    event.preventDefault();
    event.stopPropagation();
  });

  stampEl.addEventListener("pointermove", (event) => {
    if (!dragging) return;

    stamp.x = Math.max(
      0,
      startX + (event.clientX - startClientX) / zoom
    );

    stamp.y = Math.max(
      0,
      startY + (event.clientY - startClientY) / zoom
    );

    stampEl.style.left = `${stamp.x * zoom}px`;
    stampEl.style.top = `${stamp.y * zoom}px`;
  });

  const stopDragging = (event) => {
    if (!dragging) return;

    dragging = false;

    try {
      if (event?.pointerId !== undefined) {
        stampEl.releasePointerCapture(event.pointerId);
      }
    } catch (_) {}
  };

  stampEl.addEventListener("pointerup", stopDragging);
  stampEl.addEventListener("pointercancel", stopDragging);

  container.appendChild(stampEl);
}


/* --------------------------------
   Render page
-------------------------------- */

async function renderPage() {
  if (!pdfDocument) return;

  const thisRender = ++renderVersion;
  const pageNumber = currentPage;
  const page = await pdfDocument.getPage(pageNumber);

  const viewport = page.getViewport({ scale: zoom });

  const canvas = document.createElement("canvas");
  canvas.className = "pdf-page";

  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("Could not create the PDF canvas.");
  }

  const deviceScale = Math.min(
    window.devicePixelRatio || 1,
    2
  );

  canvas.width = Math.floor(viewport.width * deviceScale);
  canvas.height = Math.floor(viewport.height * deviceScale);

  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const renderContext = {
    canvasContext: context,
    viewport,
    transform: deviceScale !== 1
      ? [deviceScale, 0, 0, deviceScale, 0, 0]
      : undefined
  };

  await page.render(renderContext).promise;

  if (
    thisRender !== renderVersion ||
    pageNumber !== currentPage ||
    !pdfDocument
  ) {
    return;
  }

  const pageWrapper = document.createElement("div");
  pageWrapper.className = "pdf-page-wrapper";
  pageWrapper.style.width = `${viewport.width}px`;
  pageWrapper.style.height = `${viewport.height}px`;

  pageWrapper.appendChild(canvas);
  addStampOverlay(pageWrapper);

  pdfContainer.replaceChildren(pageWrapper);

  updateControls();
}


/* --------------------------------
   Page controls
-------------------------------- */

prevPage.addEventListener("click", async () => {

  if (!pdfDocument) {
    return;
  }

  if (currentPage <= 1) {
    return;
  }

  currentPage--;

  await renderPage();

});


nextPage.addEventListener("click", async () => {

  if (!pdfDocument) {
    return;
  }

  if (currentPage >= pdfDocument.numPages) {
    return;
  }

  currentPage++;

  await renderPage();

});


/* --------------------------------
   Zoom
-------------------------------- */

zoomIn.addEventListener("click", async () => {

  if (!pdfDocument) {
    return;
  }

  zoom = Math.min(
    zoom + 0.1,
    3
  );

  await renderPage();

});


zoomOut.addEventListener("click", async () => {

  if (!pdfDocument) {
    return;
  }

  zoom = Math.max(
    zoom - 0.1,
    0.5
  );

  await renderPage();

});


/* --------------------------------
   Fit page
-------------------------------- */

fitPage.addEventListener("click", async () => {

  if (!pdfDocument) {
    return;
  }

  const page =
    await pdfDocument.getPage(currentPage);

  const unscaled =
    page.getViewport({
      scale: 1
    });


  const area =
    document.getElementById("pdfArea");


  const availableWidth =
    area.clientWidth - 40;


  zoom =
    Math.min(
      availableWidth / unscaled.width,
      2
    );


  await renderPage();

});


/* --------------------------------
   Controls
-------------------------------- */

function updateControls() {

  pageInfo.textContent =
    `Page ${currentPage} / ${pdfDocument.numPages}`;

  zoomInfo.textContent =
    `${Math.round(zoom * 100)}%`;


  prevPage.disabled =
    currentPage <= 1;

  nextPage.disabled =
    currentPage >= pdfDocument.numPages;

}


/* --------------------------------
   Keyboard shortcuts
-------------------------------- */

document.addEventListener("keydown", async (event) => {

  if (!pdfDocument) {
    return;
  }

  /*
    Don't intercept keyboard
    while typing into an input.
  */

  const tag =
    document.activeElement?.tagName;

  if (
    tag === "INPUT" ||
    tag === "TEXTAREA"
  ) {
    return;
  }


  if (event.key === "ArrowLeft") {

    if (currentPage > 1) {

      currentPage--;

      await renderPage();

    }

  }


  if (event.key === "ArrowRight") {

    if (
      currentPage <
      pdfDocument.numPages
    ) {

      currentPage++;

      await renderPage();

    }

  }

});


/* --------------------------------
   Window resize
-------------------------------- */

let resizeTimer = null;

window.addEventListener("resize", () => {
  if (!pdfDocument) return;

  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    renderPage().catch((error) => {
      console.error("PDF re-render failed:", error);
    });
  }, 120);
});
