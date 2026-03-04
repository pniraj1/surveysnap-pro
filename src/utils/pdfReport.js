// src/utils/pdfReport.js — A4 PDF Report Engine
import * as Print   from 'expo-print';
import * as Sharing from 'expo-sharing';
import { toBase64 }       from './compress';
import { parsePhotoMeta } from './fs';

const PAGE_W  = 794;
const PAGE_H  = 1123;
const MARGIN  = 32;

const LAYOUTS = {
  4: { cols: 2, rows: 2 },
  6: { cols: 2, rows: 3 },
  8: { cols: 2, rows: 4 },
};

function cellDimensions(perPage) {
  const { cols, rows } = LAYOUTS[perPage];
  const gap     = 12;
  const headerH = 70;
  const footerH = 30;
  const usableW = PAGE_W - MARGIN * 2 - gap * (cols - 1);
  const usableH = PAGE_H - MARGIN * 2 - headerH - footerH - gap * (rows - 1);
  return {
    cols,
    cellW: Math.floor(usableW / cols),
    cellH: Math.floor(usableH / rows),
    gap,
    headerH,
  };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// FIX: parse GPS from filename correctly even when _WM suffix is present
// Format: SS_{timestamp}[_{lat}_{lng}][_WM].jpg  →  use parsePhotoMeta
function gpsFromPhoto(photo, showLocation) {
  if (!showLocation) return '';
  const meta = parsePhotoMeta(photo.name);
  if (meta.lat == null || meta.lng == null) return '';
  return `${meta.lat.toFixed(5)}°, ${meta.lng.toFixed(5)}°`;
}

async function buildPageHTML(
  photos, pageIndex, totalPages,
  projectName, folderName,
  perPage, showLocation, showWatermark, wmText,
  base64Map   // FIX: pre-built map of uri → base64 (parallel conversion)
) {
  const { cols, cellW, cellH, gap, headerH } = cellDimensions(perPage);

  let gridHTML = '';
  let row = 0, col = 0;

  for (let i = 0; i < photos.length; i++) {
    const photo   = photos[i];
    const left    = MARGIN + col * (cellW + gap);
    const top     = MARGIN + headerH + row * (cellH + gap);
    const imgSrc  = base64Map[photo.uri] || '';
    const gpsText = gpsFromPhoto(photo, showLocation);
    const photoNum = (pageIndex - 1) * perPage + i + 1;

    gridHTML += `
      <div style="
        position:absolute;left:${left}px;top:${top}px;
        width:${cellW}px;height:${cellH}px;
        background:#0C1220;
        border:0.5px solid rgba(37,99,235,0.3);
        border-radius:4px;overflow:hidden;
      ">
        ${imgSrc
          ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#455368;font-size:10px;">No image</div>`
        }
        <div style="position:absolute;top:5px;left:5px;background:rgba(6,8,15,0.75);color:#3B82F6;font-size:8px;padding:2px 5px;border-radius:3px;font-family:monospace;">#${photoNum}</div>
        ${showWatermark && wmText ? `
        <div style="position:absolute;bottom:20px;right:4px;left:4px;text-align:center;color:rgba(255,255,255,0.45);font-size:7px;font-family:monospace;text-shadow:0 1px 2px rgba(0,0,0,0.8);">${wmText}</div>` : ''}
        ${gpsText ? `
        <div style="position:absolute;bottom:4px;left:4px;right:4px;background:rgba(6,8,15,0.80);color:#22D3EE;font-size:6.5px;padding:2px 4px;border-radius:2px;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📍 ${gpsText}</div>` : ''}
      </div>`;

    col++;
    if (col >= cols) { col = 0; row++; }
  }

  return `
    <div style="
      position:relative;width:${PAGE_W}px;height:${PAGE_H}px;
      background:#06080F;page-break-after:always;
      font-family:'Helvetica Neue',Arial,sans-serif;
      box-sizing:border-box;overflow:hidden;
    ">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#2563EB,#22D3EE);"></div>
      <div style="position:absolute;top:3px;left:${MARGIN}px;right:${MARGIN}px;height:${headerH - 6}px;display:flex;flex-direction:column;justify-content:center;border-bottom:0.5px solid rgba(37,99,235,0.25);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="color:#F0F4FF;font-size:13px;font-weight:700;letter-spacing:0.5px;">${projectName}</div>
            <div style="color:#3B82F6;font-size:9px;letter-spacing:1px;margin-top:2px;">📁 ${folderName}</div>
          </div>
          <div style="text-align:right;">
            <div style="color:#8FA3BF;font-size:8px;letter-spacing:1px;text-transform:uppercase;">SurveySnap Pro</div>
            <div style="color:#455368;font-size:7.5px;margin-top:2px;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </div>
      ${gridHTML}
      <div style="position:absolute;bottom:${MARGIN - 12}px;left:${MARGIN}px;right:${MARGIN}px;display:flex;justify-content:space-between;align-items:center;border-top:0.5px solid rgba(37,99,235,0.15);padding-top:6px;">
        <div style="color:#455368;font-size:7px;letter-spacing:0.5px;">${perPage} photos/sheet · A4 · Printable</div>
        <div style="color:#455368;font-size:7px;letter-spacing:1px;">Page ${pageIndex} of ${totalPages}</div>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,#22D3EE,#2563EB);opacity:0.5;"></div>
    </div>`;
}

export async function generatePDF({
  photos,
  projectName,
  folderName,
  perPage       = 6,
  showLocation  = true,
  showWatermark = false,
  wmText        = '',
}) {
  const pages      = chunkArray(photos, perPage);
  const totalPages = pages.length;

  // FIX: convert all images to base64 in parallel rather than sequentially
  const base64Map = {};
  await Promise.all(
    photos.map(async (photo) => {
      try { base64Map[photo.uri] = await toBase64(photo.uri); }
      catch { base64Map[photo.uri] = ''; }
    })
  );

  let pagesHTML = '';
  for (let i = 0; i < pages.length; i++) {
    pagesHTML += await buildPageHTML(
      pages[i], i + 1, totalPages,
      projectName, folderName,
      perPage, showLocation, showWatermark, wmText,
      base64Map
    );
  }

  const fullHTML = buildFullHTML(pagesHTML, PAGE_W, PAGE_H);
  const { uri } = await Print.printToFileAsync({ html: fullHTML, width: PAGE_W, height: PAGE_H, base64: false });
  return uri;
}

// NEW: generate a PDF for an entire project — one section per folder
export async function generateProjectPDF({
  folders,          // array of { name, photos[] }
  projectName,
  perPage       = 6,
  showLocation  = true,
  showWatermark = false,
}) {
  const wmText = showWatermark ? `${projectName} · SurveySnap Pro` : '';

  // Gather all photos from all folders and their page counts
  let allPhotos = [];
  for (const folder of folders) allPhotos = [...allPhotos, ...folder.photos];

  if (allPhotos.length === 0) throw new Error('No photos found in this project.');

  // Parallel base64
  const base64Map = {};
  await Promise.all(
    allPhotos.map(async (photo) => {
      try { base64Map[photo.uri] = await toBase64(photo.uri); }
      catch { base64Map[photo.uri] = ''; }
    })
  );

  // Build pages per folder (each folder starts a fresh page sequence)
  let pagesHTML = '';
  for (const folder of folders) {
    if (folder.photos.length === 0) continue;
    const chunks     = chunkArray(folder.photos, perPage);
    const totalPages = chunks.length;
    for (let i = 0; i < chunks.length; i++) {
      pagesHTML += await buildPageHTML(
        chunks[i], i + 1, totalPages,
        projectName, folder.name,
        perPage, showLocation, showWatermark, wmText,
        base64Map
      );
    }
  }

  const fullHTML = buildFullHTML(pagesHTML, PAGE_W, PAGE_H);
  const { uri } = await Print.printToFileAsync({ html: fullHTML, width: PAGE_W, height: PAGE_H, base64: false });
  return uri;
}

function buildFullHTML(pagesHTML, w, h) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${w}" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#06080F; width:${w}px; }
    @media print { body { width:${w}px; } div { page-break-inside:avoid; } }
    @page { size:A4 portrait; margin:0; }
  </style>
</head>
<body>${pagesHTML}</body>
</html>`;
}

export async function sharePDF(pdfUri, projectName) {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing not available on this device.');
  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: `${projectName} — SurveySnap Pro Report`,
    UTI: 'com.adobe.pdf',
  });
}
