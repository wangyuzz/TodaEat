// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../vendor/runtime.js";
var MAX_FILE_SIZE = 20 * 1024 * 1024,
  MAX_IMAGE_DIMENSION = 1600,
  JPEG_QUALITY = 0.82,
  MIN_COMPRESS_SIZE = 1024 * 1024;
function formatSize(e) {
  return !Number.isFinite(e) || e <= 0
    ? `0 MB`
    : `${(e / 1024 / 1024).toFixed(e >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
}
function oversizedFileMessage(e) {
  return `${e.name} 是 ${formatSize(e.size)}，图片不能超过 20MB`;
}
function splitUploadFiles(t) {
  return {
    uploadable: t.filter((t) => t.size <= MAX_FILE_SIZE),
    oversized: t.filter((t) => t.size > MAX_FILE_SIZE),
  };
}
function canCompress(e) {
  return [`image/jpeg`, `image/png`, `image/webp`].includes(e.type)
    ? true
    : /\.(jpe?g|png|webp)$/i.test(e.name);
}
function loadImage(e) {
  return new Promise((t, n) => {
    let r = new Image();
    ((r.onload = () => t(r)),
      (r.onerror = () => n(Error(`图片无法读取`))),
      (r.decoding = `async`),
      (r.src = e));
  });
}
function canvasBlob(e, t, n) {
  return new Promise((r, i) => {
    e.toBlob(
      (e) => {
        e ? r(e) : i(Error(`图片压缩失败`));
      },
      t,
      n,
    );
  });
}
async function compressImage(e) {
  let i = {
    file: e,
    originalSize: e.size,
    finalSize: e.size,
    compressed: false,
  };
  if (!canCompress(e) || e.size < MIN_COMPRESS_SIZE) return i;
  let a = URL.createObjectURL(e);
  try {
    let r = await loadImage(a),
      o = r.naturalWidth || r.width,
      s = r.naturalHeight || r.height;
    if (!o || !s) return i;
    let u = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(o, s)),
      d = Math.max(1, Math.round(o * u)),
      f = Math.max(1, Math.round(s * u)),
      p = document.createElement(`canvas`);
    ((p.width = d), (p.height = f));
    let m = p.getContext(`2d`);
    if (!m) return i;
    ((m.fillStyle = `#fff`),
      m.fillRect(0, 0, d, f),
      (m.imageSmoothingEnabled = true),
      (m.imageSmoothingQuality = `medium`),
      m.drawImage(r, 0, 0, d, f));
    let h = await canvasBlob(p, `image/jpeg`, JPEG_QUALITY);
    if (h.size >= e.size) return i;
    let g = e.name.replace(/\.[^.]+$/, ``) || `image`,
      _ = new File([h], `${g}.jpg`, {
        type: `image/jpeg`,
        lastModified: e.lastModified,
      });
    return {
      file: _,
      originalSize: e.size,
      finalSize: _.size,
      compressed: true,
    };
  } catch (e) {
    return i;
  } finally {
    URL.revokeObjectURL(a);
  }
}
export { splitUploadFiles as i, oversizedFileMessage as n, compressImage as r, formatSize as t };
