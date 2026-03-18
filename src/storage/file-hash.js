// src/storage/file-hash.js
export async function computeFileHash(file) {
  const size = file.size;
  const chunkSize = 1024;

  let buffer;
  if (size <= chunkSize * 2) {
    buffer = await file.arrayBuffer();
  } else {
    const first = await file.slice(0, chunkSize).arrayBuffer();
    const last = await file.slice(size - chunkSize).arrayBuffer();
    const combined = new Uint8Array(chunkSize * 2 + 8);
    combined.set(new Uint8Array(first), 0);
    combined.set(new Uint8Array(last), chunkSize);
    const view = new DataView(combined.buffer);
    view.setFloat64(chunkSize * 2, size);
    buffer = combined.buffer;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
