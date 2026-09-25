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
   Render page
-------------------------------- */

async function renderPage() {

  if (!pdfDocument) {
    return;
  }

  const page =
    await pdfDocument.getPage(currentPage);

  const viewport =
    page.getViewport({
      scale: zoom
    });


  pdfContainer.innerHTML = "";


  const canvas =
    document.createElement("canvas");

  canvas.className = "pdf-page";

  const context =
    canvas.getContext("2d");


  /*
    Improve rendering on
    high-density mobile screens.
  */

  const deviceScale =
    Math.min(window.devicePixelRatio || 1, 2);

  canvas.width =
    Math.floor(viewport.width * deviceScale);

  canvas.height =
    Math.floor(viewport.height * deviceScale);

  canvas.style.width =
    `${viewport.width}px`;

  canvas.style.height =
    `${viewport.height}px`;


  const renderContext = {

    canvasContext: context,

    viewport: viewport,

    transform: deviceScale !== 1
      ? [deviceScale, 0, 0, deviceScale, 0, 0]
      : null
  };


  await page.render(renderContext).promise;


  pdfContainer.appendChild(canvas);


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
