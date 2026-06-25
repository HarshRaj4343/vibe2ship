'use client';

/**
 * Resize + compress an image File entirely in the browser and return a JPEG
 * data URL. This lets us store the photo inline on the Firestore issue document
 * (issue.imageUrl) instead of Firebase Storage, which now requires the paid
 * Blaze plan.
 *
 * Firestore docs are capped at ~1 MiB; an 800px JPEG at q0.6 is typically
 * 50–150 KB, well within budget alongside the rest of the document.
 *
 * Note: the full-resolution original is still sent to Gemini for analysis —
 * only the stored/displayed copy is compressed.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 800,
  quality = 0.6,
): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  const out = canvas.toDataURL('image/jpeg', quality);

  // Guard against the 1 MiB Firestore document limit (base64 inflates ~33%).
  if (out.length > 950_000) {
    // Retry once at a smaller size / lower quality.
    return compressImageToDataUrl(file, 640, 0.5);
  }
  return out;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = src;
  });
}
