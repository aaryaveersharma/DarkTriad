import { StoredPhoto } from '@/lib/types';

function encodeCanvasOptimal(canvas: HTMLCanvasElement, quality: number): string {
  const webpUrl = canvas.toDataURL('image/webp', quality);
  if (webpUrl.startsWith('data:image/webp')) {
    return webpUrl;
  }
  return canvas.toDataURL('image/jpeg', quality);
}

export function extractMimeTypeFromDataUrl(
  dataUrl: string,
  fallback = 'image/jpeg',
): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/i);
  return match?.[1] || fallback;
}

/**
 * Compresses an uploaded File or Blob into a crisp StoredPhoto (720px max edge, WebP when supported).
 * Preserves sharp facial details while keeping local storage and upload footprint compact.
 */
export function compressFileToStoredPhoto(
  file: File,
  maxDim = 720,
  quality = 0.84,
): Promise<StoredPhoto> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(
        1,
        maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
      );
      const width = Math.max(1, Math.round((img.naturalWidth || 720) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || 960) * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image.'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      resolve({
        dataUrl: encodeCanvasOptimal(canvas, quality),
        width,
        height,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          'Unsupported or unreadable image format. Please choose a JPEG, PNG, or WebP photo.',
        ),
      );
    };
    img.src = objectUrl;
  });
}

/**
 * Re-compresses a dataUrl purely for API transmission (validation, analysis, or chat)
 * using WebP at target dimensions so detail stays crisp while byte size & token usage drop sharply.
 */
export function compressDataUrlForApi(
  dataUrl: string,
  maxDim: number,
  quality: number,
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || maxDim;
      const naturalH = img.naturalHeight || maxDim;
      const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
      const width = Math.max(1, Math.round(naturalW * scale));
      const height = Math.max(1, Math.round(naturalH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          dataUrl,
          mimeType: extractMimeTypeFromDataUrl(dataUrl),
        });
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      const out = encodeCanvasOptimal(canvas, quality);
      resolve({
        dataUrl: out,
        mimeType: extractMimeTypeFromDataUrl(out),
      });
    };
    img.onerror = () => {
      resolve({
        dataUrl,
        mimeType: extractMimeTypeFromDataUrl(dataUrl),
      });
    };
    img.src = dataUrl;
  });
}

export function compressCanvasFrame(
  video: HTMLVideoElement,
  maxDim = 720,
  quality = 0.84,
): StoredPhoto | null {
  const rawW = video.videoWidth || 960;
  const rawH = video.videoHeight || 720;
  const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
  const width = Math.max(1, Math.round(rawW * scale));
  const height = Math.max(1, Math.round(rawH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);

  return {
    dataUrl: encodeCanvasOptimal(canvas, quality),
    width,
    height,
  };
}
