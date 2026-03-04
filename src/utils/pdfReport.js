// src/utils/pdfReport.js — A4 PDF Report Engine
// Uses expo-print → HTML → PDF (printable A4 sheets)

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { toBase64 } from './compress';

// A4 at 96dpi ≈ 794 × 1123 px

const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN = 32;

// Layout configs for 4 / 6 / 8 per sheet
const LAYOUTS = {
  4: { cols: 2, rows: 2 },
  6: { cols: 2, rows: 3 },
  8: { cols: 2, rows: 4 },
};

function cellDimensions(perPage) {
  const { cols, rows } = LAYOUTS[perPage];
  const gap = 12;
  const usableW = PAGE_W - MARGIN * 2 - gap * (cols - 1);
  const headerH = 70;
  const footerH = 30;
  const usableH = PAGE_H - MARGIN * 2 - headerH - footerH - gap * (rows - 1);
  return {
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

async function buildPageHTML(photos, pageIndex, totalPages, projectName, folderName, perPage, showLocation, showWatermark, wmText) {
  const { cols, cellW, cellH, gap, headerH } = cellDimensions(perPage);
  const usableW = PAGE_W - MARGIN * 2;

  // Build photo grid HTML
  let gridHTML = '';
  let row = 0, col = 0;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const left = MARGIN + col * (cellW + gap);
    const top = MARGIN + headerH + row * (cellH + gap);

    // Get base64 for this photo
    let imgSrc = '';
    try {
      imgSrc = await toBase64(photo.uri);
    } catch {
      imgSrc = '';
    }

    // Parse GPS from filename e.g. SS_1709_51.50745_-0.12775.jpg
    let gpsText = '';
    if (showLocation) {
      const parts = photo.name.replace('.jpg', '').split('_');
      if (parts.length >= 4) {
        const lat = parseFloat(parts[2]);
        const lng = parseFloat(parts[3]);
        if (!isNaN(lat) && !isNaN(lng)) {
          gpsText = `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
        }
      }
    }

    // Photo number from filename timestamp
    const photoNum = (pageIndex - 1) * perPage + i + 1;

    gridHTML += `
      <div style="
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${cellW}px;
        height: ${cellH}px;
        background: #0C1220;
        border: 0.5px solid rgba(37,99,235,0.3);
        border-radius: 4px;
        overflow: hidden;
      ">
        ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;display:block;" />` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#455368;font-size:10px;">No image</div>`}

        <!-- Photo number badge -->
        <div style="
          position:absolute; top:5px; left:5px;
          background:rgba(6,8,15,0.75);
          color:#3B82F6; font-size:8px;
          padding:2px 5px; border-radius:3px;
          font-family:monospace; letter-spacing:0.5px;
        ">#${photoNum}</div>

        ${showWatermark && wmText ? `
        <!-- Watermark -->
        <div style="
          position:absolute; bottom:20px; right:4px; left:4px;
          text-align:center;
          color:rgba(255,255,255,0.45); font-size:7px;
          font-family:monospace; letter-spacing:0.5px;
          text-shadow:0 1px 2px rgba(0,0,0,0.8);
        ">${wmText}</div>` : ''}

        ${gpsText ? `
        <!-- GPS -->
        <div style="
          position:absolute; bottom:4px; left:4px; right:4px;
          background:rgba(6,8,15,0.80);
          color:#22D3EE; font-size:6.5px;
          padding:2px 4px; border-radius:2px;
          font-family:monospace; letter-spacing:0.3px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        ">📍 ${gpsText}</div>` : ''}
      </div>
    `;

    col++;
    if (col >= cols) { col = 0; row++; }
  }

  return `
    <div style="
      position: relative;
      width: ${PAGE_W}px;
      height: ${PAGE_H}px;
      background: #06080F;
      page-break-after: always;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      box-sizing: border-box;
      overflow: hidden;
    ">
      <!-- Blue accent top bar -->
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#2563EB,#22D3EE);"></div>

      <!-- Header -->
      <div style="
        position: absolute;
        top: 3px;
        left: ${MARGIN}px;
        right: ${MARGIN}px;
        height: ${headerH - 6}px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        border-bottom: 0.5px solid rgba(37,99,235,0.25);
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="color:#F0F4FF;font-size:13px;font-weight:700;letter-spacing:0.5px;">${projectName}</div>
            <div style="color:#3B82F6;font-size:9px;letter-spacing:1px;margin-top:2px;">📁 ${folderName}</div>
          </div>
          <div style="text-align:right;">
            <div style="color:#8FA3BF;font-size:8px;letter-spacing:1px;text-transform:uppercase;">SurveySnap Pro</div>
            <div style="color:#455368;font-size:7.5px;margin-top:2px;">${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</div>
          </div>
        </div>
      </div>

      <!-- Photo Grid -->
      ${gridHTML}

      <!-- Footer -->
      <div style="
        position: absolute;
        bottom: ${MARGIN - 12}px;
        left: ${MARGIN}px;
        right: ${MARGIN}px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 0.5px solid rgba(37,99,235,0.15);
        padding-top: 6px;
      ">
        <div style="color:#455368;font-size:7px;letter-spacing:0.5px;">
          ${perPage} photos/sheet · A4 · Printable
        </div>
        <div style="color:#455368;font-size:7px;letter-spacing:1px;">
          Page ${pageIndex} of ${totalPages}
        </div>
      </div>

      <!-- Bottom accent -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,#22D3EE,#2563EB);opacity:0.5;"></div>
    </div>
  `;
}

export async function generatePDF({
  photos,
  projectName,
  folderName,
  perPage = 6,
  showLocation = true,
  showWatermark = false,
  wmText = '',
}) {
  const pages = chunkArray(photos, perPage);
  const totalPages = pages.length;

  let pagesHTML = '';
  for (let i = 0; i < pages.length; i++) {
    const pageHTML = await buildPageHTML(
      pages[i], i + 1, totalPages,
      projectName, folderName,
      perPage, showLocation, showWatermark, wmText
    );
    pagesHTML += pageHTML;
  }

  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=${PAGE_W}" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #06080F; width: ${PAGE_W}px; }
        @media print {
          body { width: ${PAGE_W}px; }
          div { page-break-inside: avoid; }
        }
        @page {
          size: A4 portrait;
          margin: 0;
        }
      </style>
    </head>
    <body>${pagesHTML}</body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({
    html: fullHTML,
    width: PAGE_W,
    height: PAGE_H,
    base64: false,
  });

  return uri; // .pdf file path
}

export async function sharePDF(pdfUri, projectName) {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing not available');
  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: `${projectName} — SurveySnap Pro Report`,
    UTI: 'com.adobe.pdf',
  });
}
