import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Download,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Button, Modal } from '../common';
import {
  PREVIEW_SIZE_LIMIT,
  describeFile,
  extensionLabel,
  extensionOf,
  formatBytes,
  sanitizeFileName,
} from '../../services/attachmentTypes';
import {
  attachmentErrorMessage,
  downloadAttachment,
  getAttachmentBlob,
  getAttachmentsByRecord,
} from '../../services/attachmentStorage';

/* --------------------------------------------------------------- helpers */

const ICONS = {
  image: FileImage,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: FileText,
  video: FileVideo,
  audio: FileAudio,
  cad: Box,
  archive: FileArchive,
  other: File,
};

export function attachmentIcon(kind) {
  return ICONS[kind] || File;
}

export function formatUploadStamp(value) {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PREVIEW_NOT_AVAILABLE =
  'Preview is not available for this file type. You can download the original file.';

/**
 * Combine the references stored on the analysis record (localStorage) with the
 * metadata rows held in IndexedDB. A reference without stored binary content is
 * a legacy record and is shown as metadata only — never as a fake download.
 */
export function mergeAttachmentRows(recordAttachments, storedRows) {
  const byId = new Map((storedRows || []).map((row) => [row.attachmentId, row]));
  const seen = new Set();
  const rows = [];
  (recordAttachments || []).forEach((reference, referenceIndex) => {
    const id = reference?.attachmentId;
    if (id && seen.has(id)) return;
    if (id) seen.add(id);
    const stored = id ? byId.get(id) : null;
    const available = Boolean(stored && stored.isComplete && stored.uploadStatus === 'complete');
    const name = sanitizeFileName(reference?.name || stored?.originalFileName || 'attachment');
    const extension = reference?.extension || stored?.extension || extensionOf(name);
    const info = describeFile(name, reference?.mimeType || stored?.mimeType || '');
    rows.push({
      key: id || `legacy-${referenceIndex}-${name}`,
      referenceIndex,
      attachmentId: available ? id : '',
      name,
      extension,
      extensionLabel: extensionLabel(name, extension),
      kind: info.kind,
      size: Number(reference?.size ?? stored?.fileSize ?? 0),
      mimeType: reference?.mimeType || stored?.mimeType || info.mimeType,
      uploadedAt: reference?.uploadedAt || stored?.uploadedAt || '',
      uploadedBy: reference?.uploadedBy || stored?.uploadedBy || '',
      stored: available,
      metadataOnly: !available,
      preview: available ? info.preview : 'none',
      checksum: stored?.checksum || '',
      totalChunks: stored?.totalChunks || 0,
    });
  });
  return rows;
}

/** Load the stored metadata for one analysis and merge it with its references. */
export function useAnalysisAttachmentRows(analysis) {
  const [storedRows, setStoredRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(analysis?.id));
  const analysisId = analysis?.id;
  const references = analysis?.attachments;

  useEffect(() => {
    if (!analysisId) {
      setStoredRows([]);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    getAttachmentsByRecord(analysisId)
      .then((rows) => {
        if (!active) return;
        setStoredRows(rows);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setStoredRows([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [analysisId, references]);

  const rows = useMemo(() => mergeAttachmentRows(references, storedRows), [references, storedRows]);
  return { rows, loading };
}

/** Shared download action with per-file progress and error reporting. */
export function useAttachmentDownload() {
  const [state, setState] = useState({ key: '', percent: 0, error: '', message: '' });

  const download = async (row) => {
    if (!row?.attachmentId) return;
    setState({ key: row.key, percent: 0, error: '', message: '' });
    try {
      const result = await downloadAttachment(row.attachmentId, {
        onProgress: ({ writtenBytes, fileSize }) =>
          setState((previous) => ({
            ...previous,
            percent: fileSize ? Math.min(100, Math.round((writtenBytes / fileSize) * 100)) : 0,
          })),
      });
      setState({
        key: '',
        percent: 100,
        error: '',
        message: `${result.fileName} downloaded (${formatBytes(result.bytesWritten)}).`,
      });
    } catch (error) {
      if (error?.code === 'CANCELLED') {
        setState({ key: '', percent: 0, error: '', message: 'Download cancelled.' });
        return;
      }
      setState({ key: '', percent: 0, error: attachmentErrorMessage(error), message: '' });
    }
  };

  return { downloadState: state, download };
}

/* ---------------------------------------------------------------- pieces */

export function AttachmentNotice({ tone = 'error', message, onDismiss }) {
  if (!message) return null;
  return (
    <p className={`att-notice is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'error' ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="att-notice-close" aria-label="Dismiss message" onClick={onDismiss}>
          <X aria-hidden="true" />
        </button>
      )}
    </p>
  );
}

export function AttachmentRow({
  row,
  onPreview,
  onDownload,
  onRemove,
  downloading = false,
  downloadPercent = 0,
  uploadPercent = null,
  statusLabel,
  statusTone,
  onCancelUpload,
  onRetryUpload,
}) {
  const Icon = attachmentIcon(row.kind);
  return (
    <li className={`att-row${row.metadataOnly ? ' is-metadata-only' : ''}`}>
      <span className={`att-icon att-icon-${row.kind}`} aria-hidden="true">
        <Icon />
      </span>
      <div className="att-body">
        <div className="att-name-line">
          <span className="att-name" title={row.name}>
            {row.name}
          </span>
          <span className="att-ext">{row.extensionLabel}</span>
          {row.metadataOnly && (
            <span className="att-badge is-warn">Metadata Only – Original File Not Available</span>
          )}
          {statusLabel && <span className={`att-badge${statusTone ? ` is-${statusTone}` : ''}`}>{statusLabel}</span>}
        </div>
        <div className="att-meta">
          <span>{formatBytes(row.size)}</span>
          {row.uploadedAt && <span>{formatUploadStamp(row.uploadedAt)}</span>}
          {row.uploadedBy && <span>{row.uploadedBy}</span>}
          {row.stored && !statusLabel && <span className="att-status">Stored in this browser</span>}
        </div>
        {uploadPercent != null && (
          <div className="att-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploadPercent)}>
            <span style={{ width: `${Math.max(2, Math.round(uploadPercent))}%` }} />
          </div>
        )}
        {downloading && (
          <div className="att-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={downloadPercent}>
            <span style={{ width: `${Math.max(2, downloadPercent)}%` }} />
          </div>
        )}
      </div>
      <div className="att-actions">
        {onPreview && row.stored && (
          <button
            type="button"
            className="att-action"
            aria-label={`Preview ${row.name}`}
            title="Preview"
            onClick={() => onPreview(row)}
          >
            <Eye aria-hidden="true" />
          </button>
        )}
        {onDownload && row.stored && (
          <button
            type="button"
            className="att-action"
            aria-label={`Download ${row.name}`}
            title="Download original file"
            onClick={() => onDownload(row)}
            disabled={downloading}
          >
            {downloading ? <Loader2 className="att-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
          </button>
        )}
        {onCancelUpload && (
          <button
            type="button"
            className="att-action"
            aria-label={`Cancel upload of ${row.name}`}
            title="Cancel upload"
            onClick={onCancelUpload}
          >
            <X aria-hidden="true" />
          </button>
        )}
        {onRetryUpload && (
          <button
            type="button"
            className="att-action"
            aria-label={`Retry upload of ${row.name}`}
            title="Retry upload"
            onClick={onRetryUpload}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            className="att-action is-danger"
            aria-label={`Remove ${row.name}`}
            title="Remove attachment and its stored file"
            onClick={() => onRemove(row)}
          >
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

/* --------------------------------------------------------------- preview */

function PreviewBody({ attachment }) {
  const [state, setState] = useState({ status: 'loading', url: '', text: '', truncated: false, error: '' });
  const preview = attachment?.preview || 'none';
  const attachmentId = attachment?.attachmentId;

  useEffect(() => {
    if (!attachmentId) return undefined;
    if (preview === 'none') {
      setState({ status: 'unsupported', url: '', text: '', truncated: false, error: '' });
      return undefined;
    }
    if (attachment.size > PREVIEW_SIZE_LIMIT) {
      setState({
        status: 'too-large',
        url: '',
        text: '',
        truncated: false,
        error: `This file is ${formatBytes(attachment.size)}. In-browser preview is limited to ${formatBytes(
          PREVIEW_SIZE_LIMIT,
        )} to protect memory; download the original file instead.`,
      });
      return undefined;
    }

    let active = true;
    let objectUrl = '';
    setState({ status: 'loading', url: '', text: '', truncated: false, error: '' });

    getAttachmentBlob(attachmentId, { verify: false })
      .then(async (blob) => {
        if (!active) return;
        if (preview === 'text') {
          const slice = blob.slice(0, 256 * 1024);
          const text = await slice.text();
          if (!active) return;
          setState({ status: 'ready', url: '', text, truncated: blob.size > 256 * 1024, error: '' });
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', url: objectUrl, text: '', truncated: false, error: '' });
      })
      .catch((error) => {
        if (!active) return;
        setState({ status: 'error', url: '', text: '', truncated: false, error: attachmentErrorMessage(error) });
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId, attachment?.size, preview]);

  if (state.status === 'loading') {
    return (
      <p className="att-preview-state">
        <Loader2 className="att-spin" aria-hidden="true" /> Loading preview from local storage…
      </p>
    );
  }
  if (state.status === 'unsupported') {
    return <p className="att-preview-state">{PREVIEW_NOT_AVAILABLE}</p>;
  }
  if (state.status === 'too-large' || state.status === 'error') {
    return (
      <p className="att-preview-state is-error">
        <AlertTriangle aria-hidden="true" /> {state.error}
      </p>
    );
  }
  if (preview === 'text') {
    return (
      <div className="att-preview-text-wrap">
        <pre className="att-preview-text">{state.text}</pre>
        {state.truncated && (
          <p className="att-preview-note">Showing the first 256 KB of this text file. Download it for the full content.</p>
        )}
      </div>
    );
  }
  if (preview === 'image') {
    return (
      <div className="att-preview-media-wrap">
        <img className="att-preview-image" src={state.url} alt={`Preview of ${attachment.name}`} />
        <p className="att-preview-note">
          Untrusted content is rendered as an isolated image; scripts inside the file are not executed.
        </p>
      </div>
    );
  }
  if (preview === 'pdf') {
    return (
      <div className="att-preview-media-wrap">
        <iframe className="att-preview-frame" src={state.url} title={`PDF preview of ${attachment.name}`} />
        <p className="att-preview-note">
          Rendered by the browser's built-in PDF viewer. If nothing appears, download the original file.
        </p>
      </div>
    );
  }
  if (preview === 'video') {
    return (
      <div className="att-preview-media-wrap">
        <video className="att-preview-video" src={state.url} controls playsInline preload="metadata" />
        <p className="att-preview-note">
          Playback depends on the codecs this browser supports; an unsupported codec will not play here.
        </p>
      </div>
    );
  }
  if (preview === 'audio') {
    return (
      <div className="att-preview-media-wrap">
        <audio className="att-preview-audio" src={state.url} controls preload="metadata" />
        <p className="att-preview-note">Playback depends on the codecs this browser supports.</p>
      </div>
    );
  }
  return <p className="att-preview-state">{PREVIEW_NOT_AVAILABLE}</p>;
}

export function AttachmentPreviewDialog({ attachment, onClose, onDownload }) {
  const open = Boolean(attachment);
  const footer = attachment ? (
    <>
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
      {attachment.stored && (
        <Button icon={Download} onClick={() => onDownload?.(attachment)}>
          Download Original
        </Button>
      )}
    </>
  ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={attachment ? `Preview · ${attachment.name}` : 'Preview'}
      subtitle={
        attachment
          ? `${attachment.extensionLabel} · ${formatBytes(attachment.size)} · ${formatUploadStamp(attachment.uploadedAt)}`
          : undefined
      }
      maxWidth="max-w-4xl"
      footer={footer}
    >
      {attachment && <PreviewBody attachment={attachment} />}
    </Modal>
  );
}
