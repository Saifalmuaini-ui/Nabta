/**
 * Real photographs for demonstrating the capture flow on a machine with no
 * camera, or no plant to hand.
 *
 * These replace the procedurally drawn canvas plant for anything a person or a
 * vision model will actually look at. The drawn one is still in samplePhoto.ts
 * as a last resort, but it was never convincing to a human and a real model
 * reads it as what it is, a drawing, which made it useless for demonstrating
 * verification.
 *
 * The capture-* files are the project owner's own phone photographs. They are
 * the best demo input available because they look like what a grower actually
 * submits: slightly soft, mixed indoor lighting, imperfect framing. Stock
 * photography is too clean to be a fair test.
 */

export interface SamplePhoto {
  src: string;
  /** What the flow is meant to show when this one is used. */
  note: string;
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  { src: "/photos/capture-01.jpg", note: "Potted dracaena, indoor" },
  { src: "/photos/capture-02.jpg", note: "The same plant, closer" },
  { src: "/photos/capture-04.jpg", note: "Planter bed, several plants" },
  { src: "/photos/crop-tomato-balcony.jpg", note: "Tomato in a pot, balcony" },
  { src: "/photos/act-harvest.jpg", note: "Picked produce" },
  { src: "/photos/diag-leaf-spots.jpg", note: "Leaf showing damage" },
];

/**
 * Loads a sample and returns it as a data URL, because the rest of the capture
 * pipeline works in data URLs and stores them in localStorage.
 *
 * Downscales on the way through for the same reason real captures are
 * downscaled: a full size frame is wasted tokens on the way to the model and
 * wasted quota in storage.
 */
export async function loadSamplePhoto(
  src: string,
  maxEdge = 900,
): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Could not load ${src}`);
  const blob = await res.blob();

  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.72);
}

/** Picks one at random so repeated demos do not show the same plant. */
export function randomSample(): SamplePhoto {
  return SAMPLE_PHOTOS[Math.floor(Math.random() * SAMPLE_PHOTOS.length)];
}
