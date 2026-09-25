const pdfjsLib = window.pdfjsLib;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const pdfInput = document.getElementById("pdfInput");
const welcome = document.getElementById("welcome");
const editor = document.getElementById("editor");
const pdfContainer = document.getElementById("pdfContainer");

const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageNumber = document.getElementById("pageNumber");
const pageCount = document.getElementById("pageCount");

const zoomOut = document.getElementById("zoomOut");
const zoomIn = document.getElementById("zoomIn");
const fitPage = document.getElementById("fitPage");
const todayStamp = document.getElementById("todayStamp");

let pdfDocument = null;
let currentPage = 1;
let zoom = 1;

const pageStamps = new Map();
let renderVersion = 0;


/* --------------------------------
   Load PDF
-------------------------------- */

pdfInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  if (file.type !== "application/pdf") {
    alert("Please select a PDF file.");
    pdfInput.value = "";
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();

    pdfDocument = await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;

    currentPage = 1;
    zoom = 1;
    pageStamps.clear();

    welcome.classList.add("hidden");
    editor.classList.remove("hidden");

    pageCount.textContent = pdfDocument.numPages;

    await renderPage();
  } catch (error) {
    console.error("Failed to load PDF:", error);
    alert("Unable to open this PDF.");
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
    if (!pdfDocument) {
      return;
    }

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

  if (!stamp) {
    return;
  }

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
    if (!dragging) {
      return;
    }

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
    if (!dragging) {
      return;
    }

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
  if (!pdfDocument) {
    return;
  }

  const thisRender = ++renderVersion;
  const pageNumberValue = currentPage;

  const page = await pdfDocument.getPage(pageNumberValue);

  const viewport = page.getViewport({
    scale: zoom
  });

  const canvas = document.createElement("canvas");

  canvas.className = "pdf-page";

  const context = canvas.getContext("2d", {
    alpha: false
  });

  if (!context) {
    throw new Error("Could not create the PDF canvas.");
  }

  const deviceScale = Math.min(
    window.devicePixelRatio || 1,
    2
  );

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
    viewport,
    transform: deviceScale !== 1
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

  await page.render(renderContext).promise;

  if (
    thisRender !== renderVersion ||
    pageNumberValue !== currentPage ||
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

  pdfContainer.replaceChildren(pageWrapper);

  updateControls();
}


/* --------------------------------
   Page controls
-------------------------------- */

function updateControls() {
  if (!pdfDocument) {
    return;
  }

  pageNumber.textContent = currentPage;

  pageCount.textContent =
    pdfDocument.numPages;

  prevPage.disabled =
    currentPage <= 1;

  nextPage.disabled =
    currentPage >= pdfDocument.numPages;
}

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

zoomOut.addEventListener("click", async () => {
  if (!pdfDocument) {
    return;
  }

  zoom = Math.max(
    0.5,
    zoom - 0.1
  );

  await renderPage();
});

zoomIn.addEventListener("click", async () => {
  if (!pdfDocument) {
    return;
  }

  zoom = Math.min(
    3,
    zoom + 0.1
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
    pdfContainer;

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
   Keyboard navigation
-------------------------------- */

document.addEventListener("keydown", async (event) => {
  if (!pdfDocument) {
    return;
  }

  if (event.key === "ArrowLeft") {
    if (currentPage > 1) {
      currentPage--;
      await renderPage();
    }
  }

  if (event.key === "ArrowRight") {
    if (currentPage < pdfDocument.numPages) {
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
  if (!pdfDocument) {
    return;
  }

  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    renderPage().catch((error) => {
      console.error(
        "PDF re-render failed:",
        error
      );
    });
  }, 120);
});
