// Browser-side helper: shrink a photo before it is sent with an answer, so a
// phone camera picture (several MB) becomes a ~200-400 KB JPEG.

export interface AttachedImage {
  mime: "image/jpeg";
  /** base64 without the data: prefix */
  data: string;
  /** data URL for the thumbnail */
  preview: string;
}

const MAX_SIDE = 1400;

export async function shrinkImage(file: File): Promise<AttachedImage> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser can't open that image. Use a JPEG, PNG or WebP photo.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't process images.");
  ctx.fillStyle = "#fff"; // transparent PNGs (screenshots of notes) would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const preview = canvas.toDataURL("image/jpeg", 0.82);
  return { mime: "image/jpeg", data: preview.slice(preview.indexOf(",") + 1), preview };
}
