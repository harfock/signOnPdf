import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

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
const pdfContainer = document.getElementById("pdfContainer");

const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

const zoomOut = document.getElementById("zoomOut");
const zoomIn = document.getElementById("zoomIn");
const fitPage = document.getElementById("fitPage");
const zoomInfo = document.getElementById("zoomInfo");

const todayStamp = document.getElementById("todayStamp");


/* --------------------------------
   State
-------------------------------- */

let pdfDocument = null;
let currentPage = 1;
let zoom = 1;
let renderVersion = 0;

const pageStamps = new Map();


/* --------------------------------
   Supported formats
-------------------------------- */

const SUPPORTED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif"
]);

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif"
]);

function getExtension(fileName) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isSupportedFile(file) {
  return SUPPORTED_EXTENSIONS.has(getExtension(file.name));
}


/* --------------------------------
   File picker
-------------------------------- */

function openFilePicker() {
  pdfInput.value = "";
  pdfInput.click();
}

uploadBtn.addEventListener("click", openFilePicker);
welcomeUpload.addEventListener("click", openFilePicker);

pdfInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  try {
    await openDocument(file);
  } catch (error) {
    console.error("Document opening failed:", error);
    alert(
      "This file could not be opened. " +
      "Please check that it is a valid PDF or supported image."
    );
  }
});


/* --------------------------------
   Open PDF or image
-------------------------------- */

async function openDocument(file) {
  if (!isSupportedFile(file)) {
    throw new Error(
      "Unsupported format. Supported: PDF, JPG, JPEG, PNG, WEBP, HEIC, HEIF."
    );
  }

  const extension = getExtension(file.name);

  let pdfBytes;

  if (extension === "pdf") {
    pdfBytes = new Uint8Array(await file.arrayBuffer());
  } else {
    pdfBytes = await imageFileToPdf(file);
  }

  // Validate/load the resulting PDF before changing the UI state.
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes
  });

  const newPdfDocument = await loadingTask.promise;

  pdfDocument = newPdfDocument;
  currentPage = 1;
  zoom = 1;
  pageStamps.clear();

  welcome.classList.add("hidden");
  editor.classList.remove("hidden");

  await renderPage();
}


/* --------------------------------
   Convert image to PDF
-------------------------------- */

async function imageFileToPdf(file) {
  let imageBlob = file;

  const extension = getExtension(file.name);

  if (extension === "heic" || extension === "heif") {
    if (typeof window.heic2any !== "function") {
      throw new Error("HEIC decoder is not available.");
    }

    imageBlob = await window.heic2any({
      blob: file,
      toType: "image/png"
    });

    // Some HEIC files can produce an array of blobs.
    if (Array.isArray(imageBlob)) {
      imageBlob = imageBlob[0];
    }
  }

  const imageUrl = URL.createObjectURL(imageBlob);

  try {
    const image = await loadImage(imageUrl);

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height) {
      throw new Error("Image has no usable dimensions.");
    }

    const orientation =
      width > height ? "landscape" : "portrait";

    const { jsPDF } = window.jspdf || {};

    if (!jsPDF) {
      throw new Error("jsPDF is not available.");
    }

    const pdf = new jsPDF({
      orientation,
      unit: "pt",
      format: [width, height],
      compress: true
    });

    const canvas = document.createElement("canvas");

    // Keep memory use reasonable for very large phone photos.
    const maxDimension = 3000;
    const scale = Math.min(
      1,
      maxDimension / Math.max(width, height)
    );

    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create image canvas.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // JPEG gives much smaller PDFs for photographs.
    // PNG remains lossless for PNG/WebP documents with transparency.
    const usePng =
      extension === "png" ||
      extension === "webp";

    const imageData = canvas.toDataURL(
      usePng ? "image/png" : "image/jpeg",
      usePng ? undefined : 0.92
    );

    const format = usePng ? "PNG" : "JPEG";

    pdf.addImage(
      imageData,
      format,
      0,
      0,
      width,
      height,
      undefined,
      "FAST"
    );

    return new Uint8Array(
      pdf.output("arraybuffer")
    );

  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(
      new Error("The image could not be decoded.")
    );

    image.src = url;
  });
}


/* --------------------------------
   Today stamp
-------------------------------- */

function getTodayStampText() {
  const now = new Date();

  const day =
    String(now.getDate()).padStart(2, "0");

  const month =
    String(now.getMonth() + 1).padStart(2, "0");

  const year =
    String(now.getFullYear());

  return `${day}/${month}/${year}`;
}

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

function addStampOverlay(container) {
  const stamp = pageStamps.get(currentPage);

  if (!stamp) return;

  const stampEl = document.createElement("div");

  stampEl.className = "today-stamp";
  stampEl.textContent = stamp.text;

  stampEl.style.left =
    `${stamp.x * zoom}px`;

  stampEl.style.top =
    `${stamp.y * zoom}px`;

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
      startX +
        (event.clientX - startClientX) / zoom
    );

    stamp.y = Math.max(
      0,
      startY +
        (event.clientY - startClientY) / zoom
    );

    stampEl.style.left =
      `${stamp.x * zoom}px`;

    stampEl.style.top =
      `${stamp.y * zoom}px`;
  });

  const stopDragging = (event) => {
    if (!dragging) return;

    dragging = false;

    try {
      if (event?.pointerId !== undefined) {
        stampEl.releasePointerCapture(
          event.pointerId
        );
      }
    } catch (_) {}
  };

  stampEl.addEventListener(
    "pointerup",
    stopDragging
  );

  stampEl.addEventListener(
    "pointercancel",
    stopDragging
  );

  container.appendChild(stampEl);
}


/* --------------------------------
   Render page
-------------------------------- */

async function renderPage() {
  if (!pdfDocument) return;

  const thisRender = ++renderVersion;
  const pageNumber = currentPage;

  const page =
    await pdfDocument.getPage(pageNumber);

  const viewport =
    page.getViewport({
      scale: zoom
    });

  const canvas =
    document.createElement("canvas");

  canvas.className = "pdf-page";

  const context =
    canvas.getContext("2d", {
      alpha: false
    });

  if (!context) {
    throw new Error(
      "Could not create PDF canvas."
    );
  }

  const deviceScale =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  canvas.width =
    Math.floor(
      viewport.width * deviceScale
    );

  canvas.height =
    Math.floor(
      viewport.height * deviceScale
    );

  canvas.style.width =
    `${viewport.width}px`;

  canvas.style.height =
    `${viewport.height}px`;

  const renderContext = {
    canvasContext: context,
    viewport,
    transform:
      deviceScale !== 1
        ? [
            deviceScale,
            0,
            0,
            deviceScale,
            0,
            0
          ]
        : undefined
  };

  await page.render(
    renderContext
  ).promise;

  if (
    thisRender !== renderVersion ||
    pageNumber !== currentPage ||
    !pdfDocument
  ) {
    return;
  }

  const pageWrapper =
    document.createElement("div");

  pageWrapper.className =
    "pdf-page-wrapper";

  pageWrapper.style.width =
    `${viewport.width}px`;

  pageWrapper.style.height =
    `${viewport.height}px`;

  pageWrapper.appendChild(canvas);

  addStampOverlay(pageWrapper);

  pdfContainer.replaceChildren(
    pageWrapper
  );

  updateControls();
}


/* --------------------------------
   Page controls
-------------------------------- */

prevPage.addEventListener("click", async () => {
  if (!pdfDocument || currentPage <= 1) {
    return;
  }

  currentPage--;

  await renderPage();
});

nextPage.addEventListener("click", async () => {
  if (
    !pdfDocument ||
    currentPage >= pdfDocument.numPages
  ) {
    return;
  }

  currentPage++;

  await renderPage();
});


/* --------------------------------
   Zoom
-------------------------------- */

zoomIn.addEventListener("click", async () => {
  if (!pdfDocument) return;

  zoom = Math.min(
    zoom + 0.1,
    3
  );

  await renderPage();
});

zoomOut.addEventListener("click", async () => {
  if (!pdfDocument) return;

  zoom = Math.max(
    zoom - 0.1,
    0.5
  );

  await renderPage();
});


/* --------------------------------
   Fit
-------------------------------- */

fitPage.addEventListener("click", async () => {
  if (!pdfDocument) return;

  const page =
    await pdfDocument.getPage(
      currentPage
    );

  const unscaled =
    page.getViewport({
      scale: 1
    });

  const area =
    document.getElementById(
      "pdfArea"
    );

  const availableWidth =
    Math.max(
      area.clientWidth - 40,
      100
    );

  const availableHeight =
    Math.max(
      area.clientHeight - 40,
      100
    );

  zoom = Math.min(
    availableWidth / unscaled.width,
    availableHeight / unscaled.height,
    2
  );

  zoom = Math.max(
    zoom,
    0.5
  );

  await renderPage();
});


/* --------------------------------
   Controls
-------------------------------- */

function updateControls() {
  if (!pdfDocument) return;

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
   Keyboard
-------------------------------- */

document.addEventListener(
  "keydown",
  async (event) => {
    if (!pdfDocument) return;

    const tag =
      document.activeElement?.tagName;

    if (
      tag === "INPUT" ||
      tag === "TEXTAREA"
    ) {
      return;
    }

    if (
      event.key === "ArrowLeft" &&
      currentPage > 1
    ) {
      currentPage--;
      await renderPage();
    }

    if (
      event.key === "ArrowRight" &&
      currentPage < pdfDocument.numPages
    ) {
      currentPage++;
      await renderPage();
    }
  }
);


/* --------------------------------
   Resize
-------------------------------- */

let resizeTimer = null;

window.addEventListener(
  "resize",
  () => {
    if (!pdfDocument) return;

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      renderPage().catch((error) => {
        console.error(
          "PDF re-render failed:",
          error
        );
      });
    }, 120);
  }
);
