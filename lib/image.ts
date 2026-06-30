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
/**
 * Extract a representative frame from a video file and return it as a
 * compressed JPEG data URL — the same shape `compressImageToDataUrl` produces.
 * We seek to 30 % of the duration (or 1 s, whichever is smaller) so we land on
 * an actual scene rather than a black leader frame.
 */
export function extractFrameFromVideo(
  file: File,
  maxDimension = 800,
  quality = 0.6,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(video.duration * 0.3, 1);
    };

    video.onseeked = () => {
      try {
        URL.revokeObjectURL(url);
        const scale = Math.min(
          1,
          maxDimension / Math.max(video.videoWidth || 640, video.videoHeight || 480),
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.round((video.videoWidth || 640) * scale);
        canvas.height = Math.round((video.videoHeight || 480) * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D unavailable')); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        let out = canvas.toDataURL('image/jpeg', quality);
        if (out.length > 950_000) {
          canvas.width = Math.round(canvas.width * 0.75);
          canvas.height = Math.round(canvas.height * 0.75);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          out = canvas.toDataURL('image/jpeg', 0.5);
        }
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video for frame extraction.'));
    };

    video.src = url;
  });
}

/**
 * Unified helper: compresses an image or extracts a frame from a video,
 * always returning a JPEG data URL suitable for Firestore + Gemini.
 */
export function mediaToImageDataUrl(file: File): Promise<string> {
  return file.type.startsWith('video/')
    ? extractFrameFromVideo(file)
    : compressImageToDataUrl(file);
}

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
