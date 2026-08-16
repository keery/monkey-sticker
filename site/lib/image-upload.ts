// Préparation d'image côté client avant envoi à une Server Action (éditeur de
// design admin + éditeur de variantes de couleur). API navigateur uniquement
// (Image, canvas, FileReader) : à n'importer que depuis un composant client.

export function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/** Les rasters trop grands sont redimensionnés (≤ maxDim px sur le plus grand
 * côté) et ré-encodés en WebP (compact, transparence préservée) — évite la
 * limite de taille de la Server Action et garde le storefront léger. Les SVG
 * (vecteur) passent tels quels. Renvoie le fichier (éventuellement réduit) + son
 * data-URL d'aperçu. */
export async function prepareUpload(
  file: File,
  maxDim = 2000,
): Promise<{ file: File; dataUrl: string }> {
  if (file.type === "image/svg+xml") return { file, dataUrl: await readDataUrl(file) };

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("image illisible"));
      i.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    // déjà petite (dimensions + octets) → on garde l'original tel quel
    if (scale === 1 && file.size <= 1_500_000) return { file, dataUrl: await readDataUrl(file) };

    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, dataUrl: await readDataUrl(file) };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, cw, ch);

    const blob =
      (await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.9))) ??
      (await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png")));
    if (!blob) return { file, dataUrl: await readDataUrl(file) };

    const ext = blob.type === "image/png" ? "png" : "webp";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const prepared = new File([blob], `${base}.${ext}`, { type: blob.type || "image/webp" });
    return { file: prepared, dataUrl: await readDataUrl(blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
