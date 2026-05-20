const MAX_THUMBNAIL_WIDTH = 400;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

function assertBrowser(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("generateThumbnailBlob can only run in the browser.");
  }
}

function scaleDimensions(
  width: number,
  height: number,
  maxWidth: number
): { width: number; height: number } {
  if (width <= maxWidth) {
    return { width, height };
  }
  const scale = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.round(height * scale),
  };
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not decode image."));
      img.src = objectUrl;
    });
    return createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function encodeThumbnailBlob(
  canvas: HTMLCanvasElement
): Promise<Blob> {
  const webp = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (webp) return webp;

  const jpeg = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  if (jpeg) return jpeg;

  throw new Error("Failed to encode thumbnail.");
}

/**
 * Builds a compressed thumbnail from an image file without modifying the source.
 * Redraws via canvas so EXIF/metadata is not carried into the output.
 */
export async function generateThumbnailBlob(file: File): Promise<Blob> {
  assertBrowser();

  if (!file.type.startsWith("image/")) {
    throw new Error("Thumbnail generation requires an image file.");
  }

  const bitmap = await loadImageBitmap(file);

  try {
    const { width, height } = scaleDimensions(
      bitmap.width,
      bitmap.height,
      MAX_THUMBNAIL_WIDTH
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas 2D context.");
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    return encodeThumbnailBlob(canvas);
  } finally {
    bitmap.close();
  }
}
