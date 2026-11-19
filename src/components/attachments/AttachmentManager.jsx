import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, HardDrive, Loader2, Paperclip, Upload } from 'lucide-react';
import { formatBytes } from '../../services/attachmentTypes';
import {
  MAX_ATTACHMENT_BYTES,
  attachmentErrorMessage,
  cleanupIncompleteUploads,
  deleteAttachment,
  estimateAttachmentStorage,
  requestPersistentStorage,
  uploadAttachment,
} from '../../services/attachmentStorage';
import {
  AttachmentNotice,
  AttachmentPreviewDialog,
  AttachmentRow,
  useAnalysisAttachmentRows,
  useAttachmentDownload,
} from './attachmentUi';

/**
 * Upload + manage the binary evidence files of one Engineering Analysis.
 *
 * Files are written to IndexedDB as chunks as soon as they are chosen, then the
 * analysis record keeps only stable attachment references. A file is shown as
 * stored only after every chunk and the completed metadata have been persisted.
 */
export default function AttachmentManager({ analysisId, value, onChange, uploadedBy, disabled = false }) {
  const { rows, loading } = useAnalysisAttachmentRows({ id: analysisId, attachments: value });
  const { downloadState, download } = useAttachmentDownload();
  const [uploads, setUploads] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [quota, setQuota] = useState({ supported: false, usage: null, quota: null, available: null, persisted: null });
  const [persistState, setPersistState] = useState('unsupported');
  const [notice, setNotice] = useState(null);
  const [preview, setPreview] = useState(null);
  const controllers = useRef(new Map());
  const mounted = useRef(true);

  const refreshQuota = async () => {
    const estimate = await estimateAttachmentStorage();
    if (mounted.current) setQuota(estimate);
  };

  useEffect(() => {
    mounted.current = true;
    let active = true;
    (async () => {
      const persistence = await requestPersistentStorage();
      if (active) setPersistState(persistence);
      await cleanupIncompleteUploads().catch(() => 0);
      if (active) await refreshQuota();
    })();
    return () => {
      active = false;
      mounted.current = false;
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
    };
  }, []);

  const duplicateOf = (file) => {
    const name = file.name.split(/[\\/]/).pop();
    const inRows = rows.some((row) => row.name === name && row.size === file.size);
    const inQueue = uploads.some((upload) => upload.name === name && upload.size === file.size);
    return inRows || inQueue;
  };

  const runUpload = async (file, key) => {
    const controller = new AbortController();
    controllers.current.set(key, controller);
    try {
      const metadata = await uploadAttachment({
        analysisId,
        file,
        uploadedBy,
        signal: controller.signal,
        onProgress: ({ uploadedBytes }) => {
          if (!mounted.current) return;
          setUploads((previous) =>
            previous.map((row) =>
              row.key === key ? { ...row, uploadedBytes, status: 'uploading' } : row,
            ),
          );
        },
      });
      const reference = {
        attachmentId: metadata.attachmentId,
        name: metadata.originalFileName,
        extension: metadata.extension,
        size: metadata.fileSize,
        mimeType: metadata.mimeType,
        type: metadata.extension ? metadata.extension.toUpperCase() : 'FILE',
        uploadedAt: metadata.uploadedAt,
        uploadedBy: metadata.uploadedBy,
        storage: 'indexeddb',
        isComplete: true,
      };
      onChange((previous) => [
        ...(previous || []).filter((row) => row.attachmentId !== reference.attachmentId),
        reference,
      ]);
      if (mounted.current) {
        setUploads((previous) => previous.filter((row) => row.key !== key));
        setNotice({
          tone: 'success',
          message: `${reference.name} (${formatBytes(reference.size)}) stored in this browser.`,
        });
      }
      await refreshQuota();
    } catch (error) {
      const message = attachmentErrorMessage(error);
      if (mounted.current) {
        setUploads((previous) =>
          previous.map((row) =>
            row.key === key
              ? {
                  ...row,
                  status: controller.signal.aborted ? 'cancelled' : 'error',
                  error: message,
                }
              : row,
          ),
        );
        setNotice({ tone: 'error', message });
      }
    } finally {
      controllers.current.delete(key);
    }
  };

  const handleFiles = async (fileList) => {
    if (disabled) return;
    const files = [...(fileList || [])];
    if (!files.length) return;
    setNotice(null);

    for (const file of files) {
      const key = `upload-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      if (!file.size) {
        setNotice({
          tone: 'error',
          message: `${file.name} is empty (0 bytes). Empty files are not stored as evidence.`,
        });
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setNotice({
          tone: 'error',
          message: `"${file.name}" is ${formatBytes(file.size)}. The maximum size for one attachment is 4 GB (4 GiB, ${MAX_ATTACHMENT_BYTES.toLocaleString()} bytes).`,
        });
        continue;
      }
      if (duplicateOf(file)) {
        setNotice({
          tone: 'error',
          message: `${file.name} (${formatBytes(file.size)}) is already attached to this analysis, so it was skipped.`,
        });
        continue;
      }

      const entry = {
        key,
        name: file.name,
        size: file.size,
        uploadedBytes: 0,
        status: 'uploading',
        error: '',
        file,
      };
      setUploads((previous) => [...previous, entry]);
      await runUpload(file, key);
    }
  };

  const cancelUpload = (key) => {
    controllers.current.get(key)?.abort();
  };

  const retryUpload = async (upload) => {
    setUploads((previous) => previous.filter((row) => row.key !== upload.key));
    setNotice(null);
    const key = `upload-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setUploads((previous) => [
      ...previous,
      { ...upload, key, uploadedBytes: 0, status: 'uploading', error: '' },
    ]);
    await runUpload(upload.file, key);
  };

  const dismissUpload = (key) => {
    setUploads((previous) => previous.filter((row) => row.key !== key));
  };

  const removeRow = async (row) => {
    setNotice(null);
    try {
      if (row.attachmentId) await deleteAttachment(row.attachmentId);
      onChange((previous) => {
        const list = previous || [];
        if (row.attachmentId) return list.filter((entry) => entry.attachmentId !== row.attachmentId);
        return list.filter((entry, index) => index !== row.referenceIndex);
      });
      setNotice({
        tone: 'success',
        message: row.attachmentId
          ? `${row.name} and its stored binary content were removed.`
          : `${row.name} metadata reference removed.`,
      });
      await refreshQuota();
    } catch (error) {
      setNotice({ tone: 'error', message: attachmentErrorMessage(error) });
    }
  };

  const activeUploads = uploads.filter((upload) => upload.status === 'uploading');
  const totalUploadBytes = activeUploads.reduce((sum, upload) => sum + upload.size, 0);
  const uploadedBytes = activeUploads.reduce((sum, upload) => sum + upload.uploadedBytes, 0);
  const overallPercent = totalUploadBytes ? Math.round((uploadedBytes / totalUploadBytes) * 100) : 0;
  const storedTotal = rows.reduce((sum, row) => sum + (row.stored ? row.size : 0), 0);

  const quotaText = !quota.supported
    ? 'This browser does not expose a storage estimate, so the available quota cannot be shown.'
    : quota.available == null
      ? 'Browser storage quota could not be estimated.'
      : `${formatBytes(quota.available)} of browser storage available`;

  return (
    <div className="att-manager">
      <div
        className={`att-dropzone${dragActive ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFiles(event.dataTransfer?.files);
        }}
      >
        <span className="att-dropzone-icon" aria-hidden="true">
          <Upload />
        </span>
        <div className="att-dropzone-text">
          <strong>Drag and drop evidence files here</strong>
          <span>
            Images, documents, spreadsheets, CAD files, archives, video and audio. Any extension is
            accepted — up to 4 GB (4 GiB) per file.
          </span>
        </div>
        <label className={`attachment-picker${disabled ? ' is-disabled' : ''}`}>
          <Upload aria-hidden="true" />
          <span>Choose Files</span>
          <input
            type="file"
            multiple
            disabled={disabled}
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      </div>

      <div className="att-limits">
        <span>
          <HardDrive aria-hidden="true" /> Maximum 4 GB (4 GiB) per file — {MAX_ATTACHMENT_BYTES.toLocaleString()} bytes
        </span>
        <span>{quotaText}</span>
        {persistState === 'denied' && (
          <span className="att-limits-warn">
            <AlertTriangle aria-hidden="true" /> Persistent storage was not granted; the browser may clear
            saved files when it frees space. Download important evidence regularly.
          </span>
        )}
        {persistState === 'granted' && (
          <span className="att-limits-ok">
            <CheckCircle2 aria-hidden="true" /> Persistent storage granted for this browser.
          </span>
        )}
      </div>

      <AttachmentNotice
        tone={notice?.tone || 'error'}
        message={notice?.message || ''}
        onDismiss={() => setNotice(null)}
      />
      <AttachmentNotice tone="error" message={downloadState.error} />
      <AttachmentNotice tone="success" message={downloadState.message} />

      {activeUploads.length > 0 && (
        <div className="att-overall">
          <div className="att-overall-head">
            <span>
              <Loader2 className="att-spin" aria-hidden="true" /> Uploading {activeUploads.length} file
              {activeUploads.length === 1 ? '' : 's'} — {formatBytes(uploadedBytes)} of{' '}
              {formatBytes(totalUploadBytes)}
            </span>
            <strong>{overallPercent}%</strong>
          </div>
          <div
            className="att-progress is-large"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallPercent}
          >
            <span style={{ width: `${Math.max(2, overallPercent)}%` }} />
          </div>
        </div>
      )}

      <p className="att-summary">
        <span>
          {rows.length} attachment{rows.length === 1 ? '' : 's'}
        </span>
        <span>{formatBytes(storedTotal)} stored in this browser</span>
        {rows.some((row) => row.metadataOnly) && (
          <span className="att-summary-warn">
            {rows.filter((row) => row.metadataOnly).length} legacy metadata-only record
            {rows.filter((row) => row.metadataOnly).length === 1 ? '' : 's'}
          </span>
        )}
      </p>

      {loading ? (
        <p className="att-empty">Checking stored attachments…</p>
      ) : rows.length === 0 && uploads.length === 0 ? (
        <p className="att-empty">
          <Paperclip aria-hidden="true" /> No evidence attached yet. Reviewers check that each claim is
          backed by a stored reference.
        </p>
      ) : (
        <ul className="att-rows">
          {rows.map((row) => (
            <AttachmentRow
              key={row.key}
              row={row}
              onPreview={row.stored ? setPreview : undefined}
              onDownload={row.stored ? download : undefined}
              downloading={downloadState.key === row.key}
              downloadPercent={downloadState.percent}
              onRemove={removeRow}
            />
          ))}
          {uploads.map((upload) => {
            const percent = upload.size ? Math.round((upload.uploadedBytes / upload.size) * 100) : 0;
            return (
              <AttachmentRow
                key={upload.key}
                row={{
                  key: upload.key,
                  name: upload.name,
                  extensionLabel: (upload.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 8),
                  kind: 'other',
                  size: upload.size,
                  uploadedAt: '',
                  uploadedBy,
                  stored: false,
                  metadataOnly: false,
                  preview: 'none',
                }}
                statusLabel={
                  upload.status === 'uploading'
                    ? `${percent}% · storing chunk by chunk`
                    : upload.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Upload failed'
                }
                statusTone={upload.status === 'error' ? 'warn' : upload.status === 'cancelled' ? 'warn' : 'info'}
                uploadPercent={upload.status === 'uploading' ? percent : null}
                onCancelUpload={upload.status === 'uploading' ? () => cancelUpload(upload.key) : undefined}
                onRetryUpload={upload.status === 'error' ? () => retryUpload(upload) : undefined}
                onRemove={() => dismissUpload(upload.key)}
              />
            );
          })}
        </ul>
      )}

      {uploads.some((upload) => upload.error) && (
        <ul className="att-upload-errors">
          {uploads
            .filter((upload) => upload.error)
            .map((upload) => (
              <li key={`error-${upload.key}`}>
                <AlertTriangle aria-hidden="true" />
                <span>
                  <strong>{upload.name}:</strong> {upload.error}
                </span>
              </li>
            ))}
        </ul>
      )}

      <p className="att-footnote">
        Files are stored in this browser's IndexedDB and survive a refresh, closing the browser and
        reopening it — subject to the browser retaining site data. Each file is read in chunks, so a
        large file is never loaded into memory at once. The analysis record stores only attachment
        references, never Base64 content.
      </p>

      <AttachmentPreviewDialog
        attachment={preview}
        onClose={() => setPreview(null)}
        onDownload={(row) => {
          setPreview(null);
          download(row);
        }}
      />
    </div>
  );
}
