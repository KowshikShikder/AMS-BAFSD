// Browser-only helpers that turn ANY picked file (image or PDF, any size) into
// one or more files that are guaranteed to be under 200 KB:
//
//   - small image / small PDF (<= 200 KB)  -> kept exactly as it is
//   - large image                          -> resized + re-encoded as JPEG
//   - large PDF                            -> every page rendered to an image
//                                             (one JPEG per page, max 10 pages)
//
// The server still enforces the 200 KB limit; this just makes sure users never
// have to shrink files by hand.

export const MAX_BYTES = 200 * 1024;
const TARGET_BYTES = 190 * 1024; // safety margin under the hard limit
const MAX_PDF_PAGES = 10;

const PDFJS_SRC = "/vendor/pdfjs/pdf.min.js";
const PDFJS_WORKER = "/vendor/pdfjs/pdf.worker.min.js";

function baseName(name) {
  return String(name || "document").replace(/\.[^.]+$/, "") || "document";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Re-encode a drawable (canvas / bitmap) as JPEG, shrinking quality first and
// then dimensions, until it fits under the target size.
async function compressToJpeg(source, width, height) {
  const longest = Math.max(width, height);
  let scale = Math.min(1, 1800 / longest); // never upscale; cap at 1800px
  const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.28];

  for (let round = 0; round < 8; round++) {
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // JPEG has no transparency
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);

    for (const q of qualities) {
      const blob = await canvasToJpeg(canvas, q);
      if (blob && blob.size <= TARGET_BYTES) return blob;
    }
    scale *= 0.8;
    if (Math.min(width, height) * scale < 300) break;
  }
  throw new Error("Could not shrink this file under 200 KB");
}

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("This image format cannot be read"));
      img.src = url;
    });
  } finally {
    // revoke after decode; the <img> keeps its own decoded pixels
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

let pdfJsPromise = null;
function loadPdfJs() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return Promise.resolve(window.pdfjsLib);
  }
  if (!pdfJsPromise) {
    pdfJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDFJS_SRC;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      s.onerror = () => {
        pdfJsPromise = null;
        reject(new Error("PDF converter could not be loaded"));
      };
      document.head.appendChild(s);
    });
  }
  return pdfJsPromise;
}

async function pdfToImages(file) {
  const pdfjsLib = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const out = [];

  for (let n = 1; n <= pages; n++) {
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, Math.max(0.5, 1400 / base.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await compressToJpeg(canvas, canvas.width, canvas.height);
    out.push({ blob, page: n });
  }
  return { images: out, totalPages: pdf.numPages };
}

// Main entry. Returns an array of
//   { fileName, mimeType, dataBase64, size, note }
export async function prepareDocuments(file) {
  const type = file.type || "";
  const base = baseName(file.name);

  if (type === "application/pdf") {
    if (file.size <= MAX_BYTES) {
      return [
        {
          fileName: file.name,
          mimeType: "application/pdf",
          dataBase64: await blobToBase64(file),
          size: file.size,
          note: "kept as PDF",
        },
      ];
    }
    const { images, totalPages } = await pdfToImages(file);
    return Promise.all(
      images.map(async ({ blob, page }) => ({
        fileName: images.length > 1 ? `${base}-p${page}.jpg` : `${base}.jpg`,
        mimeType: "image/jpeg",
        dataBase64: await blobToBase64(blob),
        size: blob.size,
        note:
          totalPages > images.length
            ? `PDF converted to image (first ${images.length} of ${totalPages} pages)`
            : "PDF converted to image",
      }))
    );
  }

  if (type.startsWith("image/")) {
    const okType = ["image/jpeg", "image/png", "image/webp"].includes(type);
    if (okType && file.size <= MAX_BYTES) {
      return [
        {
          fileName: file.name,
          mimeType: type,
          dataBase64: await blobToBase64(file),
          size: file.size,
          note: "kept as is",
        },
      ];
    }
    const img = await loadImage(file);
    const blob = await compressToJpeg(img, img.naturalWidth, img.naturalHeight);
    return [
      {
        fileName: `${base}.jpg`,
        mimeType: "image/jpeg",
        dataBase64: await blobToBase64(blob),
        size: blob.size,
        note: `compressed from ${Math.round(file.size / 1024)} KB`,
      },
    ];
  }

  throw new Error("Only image or PDF files can be uploaded");
}
