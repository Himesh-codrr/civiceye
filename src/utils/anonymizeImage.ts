/**
 * Anonymous image scrubber for the Food Hygiene form.
 *
 * Why this exists:
 *   Phones embed EXIF metadata into photos (GPS coords, camera serial,
 *   device make/model, timestamp, sometimes owner name). We must strip
 *   ALL of that before uploading, otherwise an "anonymous" submission
 *   can be de-anonymised by the photo's own metadata.
 *
 * Strategy:
 *   1. Read the selected File as a blob.
 *   2. Decode it into an <img> (bypasses EXIF as we never re-read it).
 *   3. Draw it onto a canvas (which drops ALL metadata — EXIF is not
 *      part of the canvas pixel stream), downscaling if needed.
 *   4. Re-encode as JPEG at a fixed quality and return as a data URL.
 *   Canvas → toDataURL / toBlob output contains zero metadata.
 *
 * Max dimension: 1600px on the long edge. JPEG quality 0.82.
 * Max files: 3. Max file size after scrub: ~250–500 KB per image.
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;
const MAX_FILES = 3;
const MAX_INPUT_BYTES = 12 * 1024 * 1024; // 12 MB per input file (phone photos)

export interface AnonImage {
  /** Scrubbed JPEG as a data URL ready for POST + email attachment. */
  dataUrl: string;
  /** Rough size in KB after scrubbing (for UI hints). */
  sizeKb: number;
  /** Width after downscaling. */
  width: number;
  /** Height after downscaling. */
  height: number;
}

export const ANON_IMAGE_LIMITS = {
  maxFiles: MAX_FILES,
  maxInputBytes: MAX_INPUT_BYTES,
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  let { naturalWidth: w, naturalHeight: h } = img;
  const long = Math.max(w, h);
  if (long > MAX_EDGE) {
    const scale = MAX_EDGE / long;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Image encoding failed')); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Data URL read failed'));
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

/**
 * Scrub one File (from <input type=file>) into a metadata-free JPEG
 * data URL suitable for anonymous upload.
 */
export async function anonymizeImage(file: File): Promise<AnonImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`Image too large (max ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)} MB before compression)`);
  }
  const img = await loadImage(file);
  const canvas = drawToCanvas(img);
  const dataUrl = await canvasToDataUrl(canvas);
  const sizeKb = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75 / 1024);
  return {
    dataUrl,
    sizeKb,
    width: canvas.width,
    height: canvas.height,
  };
}
