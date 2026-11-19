/**
 * Central attachment storage for Engineering Analysis evidence files.
 *
 * Frontend-only, persistent storage built on IndexedDB:
 *   • `attachments` — one metadata row per file (never binary content)
 *   • `chunks`      — 8 MiB binary slices keyed by [attachmentId, index]
 *
 * Files are read with `File.slice()` and written chunk by chunk, so a 4 GiB
 * file is never materialised in JavaScript memory. A 32-bit FNV-1a rolling
 * checksum is stored per chunk and for the whole file, and every download
 * re-checks it before the file is handed to the user.
 */
import {
  ATTACHMENT_CHUNK_SIZE,
  BLOB_DOWNLOAD_LIMIT,
  MAX_ATTACHMENT_BYTES,
  describeFile,
  formatBytes,
  sanitizeFileName,
} from './attachmentTypes';

const DB_NAME = 'md-attachments-v1';
const DB_VERSION = 1;
const META_STORE = 'attachments';
const CHUNK_STORE = 'chunks';

export { ATTACHMENT_CHUNK_SIZE, MAX_ATTACHMENT_BYTES };

const FNV_OFFSET = 0x811c9dc5;

export class AttachmentError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'AttachmentError';
    this.code = code;
    this.cause = cause;
  }
}

const MESSAGES = {
  EMPTY_FILE: 'This file is empty (0 bytes), so there is nothing to store. Choose a file that contains data.',
  FILE_TOO_LARGE: `This file is larger than the ${formatBytes(MAX_ATTACHMENT_BYTES)} (4 GiB) individual attachment limit.`,
  QUOTA_EXCEEDED:
    'The browser storage quota is not large enough for this file. Free space on this device, remove other attachments, or choose a smaller file. The upload was not saved.',
  STORAGE_UNAVAILABLE:
    'This browser does not expose IndexedDB storage, so attachments cannot be persisted here.',
  NOT_FOUND: 'This attachment is no longer in local storage. It may have been removed in another tab.',
  INCOMPLETE: 'This attachment upload did not finish, so it cannot be opened or downloaded.',
  VERIFY_FAILED:
    'The stored copy failed its integrity check (size or checksum mismatch). The download was stopped rather than producing a corrupt file.',
  DOWNLOAD_UNSUPPORTED: `This browser cannot safely download a file of this size. Use a Chromium-based browser (Chrome or Edge) over HTTPS or localhost, which supports chunked saving through the File System Access API.`,
  CANCELLED: 'The download was cancelled.',
  ABORTED: 'The upload was cancelled. Partially stored data was removed.',
  DOWNLOAD_FAILED: 'The file could not be written to the chosen location. Nothing was saved to the analysis record.',
  UPLOAD_FAILED: 'The upload failed before it completed. Partially stored data was removed.',
};

export function attachmentErrorMessage(error) {
  if (!error) return MESSAGES.UPLOAD_FAILED;
  if (error instanceof AttachmentError && error.message) return error.message;
  if (error.name === 'QuotaExceededError' || error.code === 22) return MESSAGES.QUOTA_EXCEEDED;
  return error.message || MESSAGES.UPLOAD_FAILED;
}

function toAttachmentError(error) {
  if (error instanceof AttachmentError) return error;
  if (!error) return new AttachmentError('UPLOAD_FAILED', MESSAGES.UPLOAD_FAILED);
  if (error.name === 'QuotaExceededError' || error.code === 22) {
    return new AttachmentError('QUOTA_EXCEEDED', MESSAGES.QUOTA_EXCEEDED, error);
  }
  return new AttachmentError('UPLOAD_FAILED', error.message || MESSAGES.UPLOAD_FAILED, error);
}

/* ------------------------------------------------------------- checksums */

function hashBytes(bytes, seed = FNV_OFFSET) {
  let hash = seed >>> 0;
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function toHex(value) {
  return (value >>> 0).toString(16).padStart(8, '0');
}

/* ----------------------------------------------------------- IndexedDB */

let databasePromise = null;

export function openAttachmentDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new AttachmentError('STORAGE_UNAVAILABLE', MESSAGES.STORAGE_UNAVAILABLE));
      return;
    }
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(new AttachmentError('STORAGE_UNAVAILABLE', MESSAGES.STORAGE_UNAVAILABLE, error));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        const store = db.createObjectStore(META_STORE, { keyPath: 'attachmentId' });
        store.createIndex('analysisId', 'analysisId', { unique: false });
        store.createIndex('uploadStatus', 'uploadStatus', { unique: false });
      }
      if (!db.objectStoreNames.contains(CHUNK_STORE)) {
        const store = db.createObjectStore(CHUNK_STORE, { keyPath: ['attachmentId', 'index'] });
        store.createIndex('attachmentId', 'attachmentId', { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(new AttachmentError('STORAGE_UNAVAILABLE', MESSAGES.STORAGE_UNAVAILABLE, request.error));
    };
  });
  return databasePromise;
}

async function readTransaction(storeNames, run) {
  const db = await openAttachmentDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let request;
    try {
      transaction = db.transaction(storeNames, 'readonly');
      request = run(transaction);
    } catch (error) {
      reject(toAttachmentError(error));
      return;
    }
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(toAttachmentError(transaction.error));
    transaction.onabort = () =>
      reject(toAttachmentError(transaction.error || new AttachmentError('UPLOAD_FAILED', MESSAGES.UPLOAD_FAILED)));
  });
}

async function writeTransaction(storeNames, run) {
  const db = await openAttachmentDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let outcome;
    try {
      transaction = db.transaction(storeNames, 'readwrite');
      outcome = run(transaction);
    } catch (error) {
      try {
        transaction?.abort();
      } catch {
        // transaction already finished
      }
      reject(toAttachmentError(error));
      return;
    }
    transaction.oncomplete = () => resolve(outcome);
    transaction.onerror = () => reject(toAttachmentError(transaction.error));
    transaction.onabort = () =>
      reject(toAttachmentError(transaction.error || new AttachmentError('UPLOAD_FAILED', MESSAGES.UPLOAD_FAILED)));
  });
}

function newAttachmentId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `att-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function nowStamp() {
  return new Date().toISOString();
}

/* ------------------------------------------------------------ metadata */

export async function saveAttachment(metadata) {
  if (!metadata?.attachmentId) {
    throw new AttachmentError('UPLOAD_FAILED', 'Attachment metadata is missing its identifier.');
  }
  const row = { ...metadata, updatedAt: nowStamp() };
  await writeTransaction(META_STORE, (transaction) => transaction.objectStore(META_STORE).put(row));
  return row;
}

export async function getAttachmentMetadata(attachmentId) {
  if (!attachmentId) return null;
  const row = await readTransaction(META_STORE, (transaction) =>
    transaction.objectStore(META_STORE).get(attachmentId),
  );
  return row || null;
}

/** Alias kept for the documented storage API. */
export const getAttachment = getAttachmentMetadata;

export async function getAttachmentsByRecord(analysisId) {
  if (!analysisId) return [];
  const rows = await readTransaction(META_STORE, (transaction) =>
    transaction.objectStore(META_STORE).index('analysisId').getAll(analysisId),
  );
  return (rows || []).sort((left, right) => String(left.uploadedAt).localeCompare(String(right.uploadedAt)));
}

export async function getAllAttachments() {
  const rows = await readTransaction(META_STORE, (transaction) =>
    transaction.objectStore(META_STORE).getAll(),
  );
  return rows || [];
}

/* -------------------------------------------------------------- chunks */

export async function saveAttachmentChunk(attachmentId, index, blob, checksum) {
  if (!attachmentId || !Number.isInteger(index) || !(blob instanceof Blob)) {
    throw new AttachmentError('UPLOAD_FAILED', 'Invalid attachment chunk.');
  }
  const row = { attachmentId, index, blob, size: blob.size, checksum: checksum || '' };
  await writeTransaction(CHUNK_STORE, (transaction) => transaction.objectStore(CHUNK_STORE).put(row));
  return { attachmentId, index, size: row.size, checksum: row.checksum };
}

export async function getAttachmentChunks(attachmentId) {
  if (!attachmentId) return [];
  const db = await openAttachmentDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let cursorRequest;
    try {
      transaction = db.transaction(CHUNK_STORE, 'readonly');
      const index = transaction.objectStore(CHUNK_STORE).index('attachmentId');
      const rows = [];
      cursorRequest = index.openCursor(IDBKeyRange.only(attachmentId));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          rows.push(cursor.value);
          cursor.continue();
        }
      };
      transaction.oncomplete = () => resolve(rows);
    } catch (error) {
      reject(toAttachmentError(error));
      return;
    }
    transaction.onerror = () => reject(toAttachmentError(transaction.error));
    transaction.onabort = () =>
      reject(toAttachmentError(transaction.error || new AttachmentError('UPLOAD_FAILED', MESSAGES.UPLOAD_FAILED)));
  });
}

async function countChunks(attachmentId) {
  return readTransaction(CHUNK_STORE, (transaction) =>
    transaction.objectStore(CHUNK_STORE).index('attachmentId').count(IDBKeyRange.only(attachmentId)),
  );
}

/** Rebuild the original bytes in order and check the stored size. */
export async function getAttachmentBlob(attachmentId, options = {}) {
  const metadata = await getAttachmentMetadata(attachmentId);
  if (!metadata) throw new AttachmentError('NOT_FOUND', MESSAGES.NOT_FOUND);
  if (!metadata.isComplete) throw new AttachmentError('INCOMPLETE', MESSAGES.INCOMPLETE);
  const chunks = await getAttachmentChunks(attachmentId);
  if (chunks.length !== metadata.totalChunks) {
    throw new AttachmentError('INCOMPLETE', MESSAGES.INCOMPLETE);
  }
  let hash = FNV_OFFSET;
  let total = 0;
  for (const chunk of chunks) {
    if (options.verify !== false) {
      const bytes = new Uint8Array(await chunk.blob.arrayBuffer());
      if (chunk.checksum && toHex(hashBytes(bytes)) !== chunk.checksum) {
        throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
      }
      hash = hashBytes(bytes, hash);
    }
    total += chunk.size;
  }
  if (total !== metadata.fileSize) {
    throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
  }
  if (options.verify !== false && metadata.checksum && toHex(hash) !== metadata.checksum) {
    throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
  }
  return new Blob(
    chunks.map((chunk) => chunk.blob),
    { type: metadata.mimeType || 'application/octet-stream' },
  );
}

/* ------------------------------------------------------- upload lifecycle */

function assertFileAllowed(file) {
  if (!file) throw new AttachmentError('EMPTY_FILE', MESSAGES.EMPTY_FILE);
  if (!file.size) throw new AttachmentError('EMPTY_FILE', MESSAGES.EMPTY_FILE);
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentError(
      'FILE_TOO_LARGE',
      `"${sanitizeFileName(file.name)}" is ${formatBytes(file.size)}. The maximum size for one attachment is ${formatBytes(MAX_ATTACHMENT_BYTES)} (4 GiB).`,
    );
  }
}

/** Finish an upload only after every chunk is present and the bytes add up. */
export async function markAttachmentComplete(attachmentId, patch = {}) {
  const metadata = await getAttachmentMetadata(attachmentId);
  if (!metadata) throw new AttachmentError('NOT_FOUND', MESSAGES.NOT_FOUND);
  const chunks = await getAttachmentChunks(attachmentId);
  const storedBytes = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  if (
    chunks.length !== metadata.totalChunks ||
    storedBytes !== metadata.fileSize ||
    chunks.some((chunk, index) => chunk.index !== index)
  ) {
    await deleteAttachment(attachmentId);
    throw new AttachmentError('INCOMPLETE', MESSAGES.INCOMPLETE);
  }
  return saveAttachment({
    ...metadata,
    ...patch,
    completedChunks: chunks.length,
    isComplete: true,
    uploadStatus: 'complete',
    completedAt: nowStamp(),
    lastError: '',
  });
}

/**
 * Store one file: create metadata in an `uploading` state, write every chunk,
 * then flip to `complete`. Any failure deletes both metadata and chunks so an
 * interrupted upload never looks successful and never leaves orphans.
 */
export async function uploadAttachment({ analysisId, file, uploadedBy, onProgress, signal }) {
  assertFileAllowed(file);
  if (!analysisId) throw new AttachmentError('UPLOAD_FAILED', 'An analysis reference is required.');

  const originalFileName = sanitizeFileName(file.name);
  const info = describeFile(originalFileName, file.type || '');
  const chunkSize = ATTACHMENT_CHUNK_SIZE;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  const estimate = await estimateAttachmentStorage();
  if (
    estimate.supported &&
    estimate.available != null &&
    file.size + chunkSize > estimate.available
  ) {
    throw new AttachmentError(
      'QUOTA_EXCEEDED',
      `${originalFileName} needs ${formatBytes(file.size)}, but only ${formatBytes(estimate.available)} of browser storage is available on this device. Free space and try again — nothing was stored.`,
    );
  }

  const attachmentId = newAttachmentId();
  let metadata = {
    attachmentId,
    analysisId,
    originalFileName,
    fileName: originalFileName,
    extension: info.extension,
    mimeType: info.mimeType,
    fileSize: file.size,
    fileType: file.type || '',
    storageKey: attachmentId,
    chunkSize,
    totalChunks,
    completedChunks: 0,
    checksum: '',
    uploadStatus: 'uploading',
    isComplete: false,
    storage: 'indexeddb',
    uploadedBy: uploadedBy || '',
    uploadedAt: nowStamp(),
    lastError: '',
  };

  await saveAttachment(metadata);

  try {
    let hash = FNV_OFFSET;
    for (let index = 0; index < totalChunks; index += 1) {
      if (signal?.aborted) throw new AttachmentError('ABORTED', MESSAGES.ABORTED);
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const blob = file.slice(start, end);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const chunkHash = hashBytes(bytes);
      hash = hashBytes(bytes, hash);
      await saveAttachmentChunk(attachmentId, index, blob, toHex(chunkHash));
      metadata = await saveAttachment({
        ...metadata,
        completedChunks: index + 1,
        checksum: toHex(hash),
      });
      onProgress?.({
        completedChunks: index + 1,
        totalChunks,
        uploadedBytes: end,
        fileSize: file.size,
      });
    }

    const complete = await markAttachmentComplete(attachmentId, { checksum: toHex(hash) });
    return complete;
  } catch (error) {
    try {
      await deleteAttachment(attachmentId);
    } catch {
      // best effort: cleanupIncompleteUploads removes anything left behind
    }
    if (error instanceof AttachmentError) throw error;
    if (error?.name === 'QuotaExceededError' || error?.code === 22) {
      throw new AttachmentError('QUOTA_EXCEEDED', MESSAGES.QUOTA_EXCEEDED, error);
    }
    if (error?.name === 'AbortError') throw new AttachmentError('ABORTED', MESSAGES.ABORTED, error);
    throw new AttachmentError('UPLOAD_FAILED', attachmentErrorMessage(error), error);
  }
}

/* ------------------------------------------------------------ integrity */

export async function verifyAttachmentIntegrity(attachmentId, { deep = false } = {}) {
  const metadata = await getAttachmentMetadata(attachmentId);
  if (!metadata) return { ok: false, reason: 'not-found' };
  if (!metadata.isComplete) return { ok: false, reason: 'incomplete' };
  const chunks = await getAttachmentChunks(attachmentId);
  const storedBytes = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  if (chunks.length !== metadata.totalChunks) return { ok: false, reason: 'chunk-count' };
  if (storedBytes !== metadata.fileSize) return { ok: false, reason: 'size-mismatch' };
  if (chunks.some((chunk, index) => chunk.index !== index)) {
    return { ok: false, reason: 'chunk-order' };
  }
  if (!deep) return { ok: true, reason: 'ok', chunks: chunks.length, bytes: storedBytes };

  let hash = FNV_OFFSET;
  for (const chunk of chunks) {
    const bytes = new Uint8Array(await chunk.blob.arrayBuffer());
    if (chunk.checksum && toHex(hashBytes(bytes)) !== chunk.checksum) {
      return { ok: false, reason: 'chunk-checksum', chunk: chunk.index };
    }
    hash = hashBytes(bytes, hash);
  }
  if (metadata.checksum && toHex(hash) !== metadata.checksum) {
    return { ok: false, reason: 'file-checksum' };
  }
  return { ok: true, reason: 'ok', chunks: chunks.length, bytes: storedBytes };
}

/* -------------------------------------------------------------- deletes */

export async function deleteAttachment(attachmentId) {
  if (!attachmentId) return;
  await writeTransaction([META_STORE, CHUNK_STORE], (transaction) => {
    transaction.objectStore(META_STORE).delete(attachmentId);
    const chunkStore = transaction.objectStore(CHUNK_STORE);
    const index = chunkStore.index('attachmentId');
    const request = index.openKeyCursor(IDBKeyRange.only(attachmentId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        chunkStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  });
}

/** Remove every attachment that belongs to one analysis record only. */
export async function deleteAttachmentsByRecord(analysisId) {
  if (!analysisId) return 0;
  const rows = await getAttachmentsByRecord(analysisId);
  for (const row of rows) {
    await deleteAttachment(row.attachmentId);
  }
  return rows.length;
}

/** Remove unfinished uploads (and chunk ranges with no metadata) from storage. */
export async function cleanupIncompleteUploads() {
  const rows = await getAllAttachments();
  const known = new Set(rows.map((row) => row.attachmentId));
  let removed = 0;
  for (const row of rows) {
    if (!row.isComplete || row.uploadStatus !== 'complete') {
      await deleteAttachment(row.attachmentId);
      known.delete(row.attachmentId);
      removed += 1;
    }
  }
  removed += await cleanupOrphanedChunks(known);
  return removed;
}

/**
 * Remove attachments that no analysis record references any more, plus any
 * unfinished upload left by a closed tab. Called once when the analysis store
 * loads, so abandoning an unsaved form never leaves hidden binaries behind.
 */
export async function cleanupOrphanedAttachments(analyses) {
  const referenced = new Set();
  const analysisIds = new Set();
  for (const analysis of analyses || []) {
    if (!analysis?.id) continue;
    analysisIds.add(analysis.id);
    for (const file of analysis.attachments || []) {
      if (file?.attachmentId) referenced.add(file.attachmentId);
    }
  }

  const rows = await getAllAttachments();
  let removed = 0;
  for (const row of rows) {
    const orphaned =
      !row.isComplete ||
      row.uploadStatus !== 'complete' ||
      !referenced.has(row.attachmentId) ||
      !analysisIds.has(row.analysisId);
    if (orphaned) {
      await deleteAttachment(row.attachmentId);
      removed += 1;
    }
  }
  removed += await cleanupOrphanedChunks(referenced);
  return removed;
}

async function cleanupOrphanedChunks(knownIds) {
  const db = await openAttachmentDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = db.transaction(CHUNK_STORE, 'readwrite');
      const store = transaction.objectStore(CHUNK_STORE);
      let removed = 0;
      const request = store.index('attachmentId').openKeyCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (!knownIds.has(cursor.key)) {
          store.delete(cursor.primaryKey);
          removed += 1;
        }
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(removed);
    } catch (error) {
      reject(toAttachmentError(error));
      return;
    }
    transaction.onerror = () => reject(toAttachmentError(transaction.error));
    transaction.onabort = () =>
      reject(toAttachmentError(transaction.error || new AttachmentError('UPLOAD_FAILED', MESSAGES.UPLOAD_FAILED)));
  });
}

/* ---------------------------------------------------------------- usage */

export async function getAttachmentStorageUsage(analysisId) {
  const rows = analysisId ? await getAttachmentsByRecord(analysisId) : await getAllAttachments();
  const complete = rows.filter((row) => row.isComplete);
  return {
    count: complete.length,
    totalBytes: complete.reduce((sum, row) => sum + (row.fileSize || 0), 0),
    incomplete: rows.length - complete.length,
  };
}

export async function estimateAttachmentStorage() {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : null;
  if (!storage || typeof storage.estimate !== 'function') {
    return { supported: false, usage: null, quota: null, available: null, persisted: null };
  }
  try {
    const result = await storage.estimate();
    const usage = Number.isFinite(result?.usage) ? result.usage : 0;
    const quota = Number.isFinite(result?.quota) ? result.quota : 0;
    let persisted = null;
    if (typeof storage.persisted === 'function') {
      try {
        persisted = await storage.persisted();
      } catch {
        persisted = null;
      }
    }
    return {
      supported: true,
      usage,
      quota,
      available: quota > 0 ? Math.max(0, quota - usage) : null,
      persisted,
    };
  } catch {
    return { supported: false, usage: null, quota: null, available: null, persisted: null };
  }
}

export async function requestPersistentStorage() {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : null;
  if (!storage || typeof storage.persist !== 'function') return 'unsupported';
  try {
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return 'already';
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/* ------------------------------------------------------------- download */

function suggestedType(metadata) {
  if (!metadata.extension) return [];
  return [
    {
      description: `${metadata.extension.toUpperCase()} file`,
      accept: { [metadata.mimeType || 'application/octet-stream']: [`.${metadata.extension}`] },
    },
  ];
}

async function writeWithFileSystemAccess(metadata, chunks, onProgress) {
  let handle;
  try {
    handle = await window.showSaveFilePicker({
      suggestedName: metadata.originalFileName,
      types: suggestedType(metadata),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new AttachmentError('CANCELLED', MESSAGES.CANCELLED, error);
    throw new AttachmentError('DOWNLOAD_FAILED', MESSAGES.DOWNLOAD_FAILED, error);
  }
  const writable = await handle.createWritable();
  let hash = FNV_OFFSET;
  let written = 0;
  try {
    for (const chunk of chunks) {
      const bytes = new Uint8Array(await chunk.blob.arrayBuffer());
      if (chunk.checksum && toHex(hashBytes(bytes)) !== chunk.checksum) {
        throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
      }
      hash = hashBytes(bytes, hash);
      await writable.write(chunk.blob);
      written += chunk.size;
      onProgress?.({ writtenBytes: written, fileSize: metadata.fileSize });
    }
    if (written !== metadata.fileSize) {
      throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
    }
    if (metadata.checksum && toHex(hash) !== metadata.checksum) {
      throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
    }
    await writable.close();
    return { method: 'file-system-access', fileName: metadata.originalFileName, bytesWritten: written };
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // the writing stream may already be closed
    }
    throw error instanceof AttachmentError ? error : toAttachmentError(error);
  }
}

async function writeWithBlobUrl(metadata, chunks, onProgress) {
  if (metadata.fileSize > BLOB_DOWNLOAD_LIMIT) {
    throw new AttachmentError('DOWNLOAD_UNSUPPORTED', MESSAGES.DOWNLOAD_UNSUPPORTED);
  }
  const parts = [];
  let hash = FNV_OFFSET;
  let total = 0;
  for (const chunk of chunks) {
    const bytes = new Uint8Array(await chunk.blob.arrayBuffer());
    if (chunk.checksum && toHex(hashBytes(bytes)) !== chunk.checksum) {
      throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
    }
    hash = hashBytes(bytes, hash);
    parts.push(chunk.blob);
    total += chunk.size;
    onProgress?.({ writtenBytes: total, fileSize: metadata.fileSize });
  }
  if (total !== metadata.fileSize) {
    throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
  }
  if (metadata.checksum && toHex(hash) !== metadata.checksum) {
    throw new AttachmentError('VERIFY_FAILED', MESSAGES.VERIFY_FAILED);
  }
  const blob = new Blob(parts, { type: metadata.mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = metadata.originalFileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { method: 'blob-url', fileName: metadata.originalFileName, bytesWritten: total };
}

/**
 * Download the original binary content under its original filename.
 * Uses the File System Access API where available (chunked streaming write),
 * otherwise a Blob URL for files the browser can hold in memory.
 */
export async function downloadAttachment(attachmentOrId, { onProgress } = {}) {
  const metadata =
    typeof attachmentOrId === 'string'
      ? await getAttachmentMetadata(attachmentOrId)
      : attachmentOrId;
  if (!metadata?.attachmentId) throw new AttachmentError('NOT_FOUND', MESSAGES.NOT_FOUND);
  if (!metadata.isComplete) throw new AttachmentError('INCOMPLETE', MESSAGES.INCOMPLETE);

  const chunks = await getAttachmentChunks(metadata.attachmentId);
  if (chunks.length !== metadata.totalChunks) {
    throw new AttachmentError('INCOMPLETE', MESSAGES.INCOMPLETE);
  }

  const canPick =
    typeof window !== 'undefined' &&
    typeof window.showSaveFilePicker === 'function' &&
    window.isSecureContext !== false;

  if (canPick) return writeWithFileSystemAccess(metadata, chunks, onProgress);
  return writeWithBlobUrl(metadata, chunks, onProgress);
}

export const ATTACHMENT_DB_NAME = DB_NAME;
export const ATTACHMENT_STORES = { metadata: META_STORE, chunks: CHUNK_STORE };
