/**
 * Shared attachment type registry for the Engineering Analysis evidence files.
 *
 * Identification is extension-first with MIME as a secondary hint, because
 * engineering files (STEP, DWG, SLDPRT …) frequently arrive with an empty or
 * generic MIME type. Unknown extensions are accepted — they are stored and
 * downloadable, they simply get no in-app preview.
 */

/** Hard application limit for one attachment: 4 GiB. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024 * 1024;

/** Chunk size used for chunk-based IndexedDB storage. */
export const ATTACHMENT_CHUNK_SIZE = 8 * 1024 * 1024;

/** Above this size an in-app preview is refused (a Blob would exhaust memory). */
export const PREVIEW_SIZE_LIMIT = 200 * 1024 * 1024;

/** Largest file the memory-based Blob download fallback will attempt. */
export const BLOB_DOWNLOAD_LIMIT = 1024 * 1024 * 1024;

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff', 'ico', 'avif'];
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md', 'log'];
const SHEET_EXTENSIONS = ['xls', 'xlsx', 'csv', 'ods'];
const SLIDE_EXTENSIONS = ['ppt', 'pptx', 'odp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac'];
const CAD_EXTENSIONS = [
  'step', 'stp', 'iges', 'igs', 'stl', 'obj', 'dwg', 'dxf',
  'sldprt', 'sldasm', 'slddrw', 'glb', 'gltf', 'ply', '3mf', 'x_t', 'x_b', 'sat',
];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'];

const KIND_BY_EXTENSION = {};
for (const ext of IMAGE_EXTENSIONS) KIND_BY_EXTENSION[ext] = 'image';
for (const ext of DOCUMENT_EXTENSIONS) KIND_BY_EXTENSION[ext] = 'document';
for (const ext of SHEET_EXTENSIONS) KIND_BY_EXTENSION[ext] = 'spreadsheet';
for (const ext of SLIDE_EXTENSIONS) KIND_BY_EXTENSION[ext] = 'presentation';
for (const ext of VIDEO_EXTENSIONS) KIND_BY_EXTENSION[ext] = 'video';
for (const ext of AUDIO_EXTENSIONS) KIND_BY_EXTENSION[ext] = 'audio';
for (const ext of CAD_EXTENSIONS) KIND_BY_EXTENSION[ext] = 'cad';
for (const ext of ARCHIVE_EXTENSIONS) KIND_BY_EXTENSION[ext] = 'archive';

/** Short labels shown in the attachment list. */
export const KIND_LABEL = {
  image: 'Image',
  document: 'Document',
  spreadsheet: 'Spreadsheet',
  presentation: 'Presentation',
  video: 'Video',
  audio: 'Audio',
  cad: 'CAD',
  archive: 'Archive',
  other: 'File',
};

/** Extensions the browser itself can render safely inside a sandboxed media tag. */
const BROWSER_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif']);
const BROWSER_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogv', 'm4v']);
const BROWSER_AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac']);
const TEXT_EXTENSIONS = new Set(['txt', 'csv', 'log', 'md', 'json', 'xml', 'yml', 'yaml', 'ini', 'cfg', 'rtf']);

function splitExtension(name) {
  const clean = String(name || '').trim();
  const dot = clean.lastIndexOf('.');
  if (dot <= 0 || dot === clean.length - 1) return '';
  return clean.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function extensionOf(name) {
  return splitExtension(name);
}

/** Strip any path components and control characters before showing or saving a name. */
export function sanitizeFileName(name) {
  const base = String(name || '')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (base || 'attachment').slice(0, 180);
}

/**
 * Describe a picked file: extension, display label, coarse kind and the
 * preview mechanism the browser can actually offer.
 */
export function describeFile(name, mimeType = '') {
  const extension = splitExtension(name);
  const kind = KIND_BY_EXTENSION[extension] || (mimeType.startsWith('image/') ? 'image' : 'other');
  const label = extension ? extension.toUpperCase() : KIND_LABEL[kind];
  return {
    extension,
    kind,
    label,
    mimeType: mimeType || guessMimeType(extension),
    preview: previewKindFor(extension, kind),
  };
}

function previewKindFor(extension, kind) {
  if (BROWSER_IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (extension === 'pdf') return 'pdf';
  if (BROWSER_VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (BROWSER_AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (TEXT_EXTENSIONS.has(extension)) return 'text';
  if (kind === 'image') return 'none'; // e.g. TIFF — browser decoding is not reliable
  return 'none';
}

const MIME_BY_EXTENSION = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  json: 'application/json',
  xml: 'application/xml',
  zip: 'application/zip',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  step: 'model/step',
  stp: 'model/step',
  stl: 'model/stl',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
};

export function guessMimeType(extension) {
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream';
}

/** Human readable size: bytes → KB / MB / GB (binary units). */
export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(gb < 10 ? 2 : 1)} GB`;
}

/** Extension shown to users (upper case, or "FILE" when there is none). */
export function extensionLabel(name, extension) {
  const ext = splitExtension(name) || extension || '';
  return ext ? ext.toUpperCase() : 'FILE';
}
