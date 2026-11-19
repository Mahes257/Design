import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { formatBytes } from '../../services/attachmentTypes';
import { attachmentErrorMessage, deleteAttachment } from '../../services/attachmentStorage';
import {
  AttachmentNotice,
  AttachmentPreviewDialog,
  AttachmentRow,
  useAnalysisAttachmentRows,
  useAttachmentDownload,
} from './attachmentUi';

/**
 * Read-only attachment list used by the analysis detail, report, review,
 * register modal and validation-report evidence tab. It resolves the stored
 * binaries from IndexedDB and offers preview/download for real files only.
 */
export default function AttachmentList({
  analysis,
  editable = false,
  onRemove,
  emptyMessage = 'No evidence attached to this analysis.',
  showSummary = true,
}) {
  const { rows, loading } = useAnalysisAttachmentRows(analysis);
  const { downloadState, download } = useAttachmentDownload();
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState(null);

  const totalBytes = rows.reduce((sum, row) => sum + (row.stored ? row.size : 0), 0);
  const storedCount = rows.filter((row) => row.stored).length;
  const metadataOnly = rows.length - storedCount;

  const removeRow = async (row) => {
    setNotice(null);
    try {
      if (row.attachmentId) await deleteAttachment(row.attachmentId);
      onRemove?.(row);
      setNotice({ tone: 'success', message: `${row.name} removed from this analysis and from local storage.` });
    } catch (error) {
      setNotice({ tone: 'error', message: attachmentErrorMessage(error) });
    }
  };

  return (
    <div className="att-list-block">
      <AttachmentNotice
        tone="error"
        message={downloadState.error || (notice?.tone === 'error' ? notice.message : '')}
        onDismiss={() => setNotice(null)}
      />
      <AttachmentNotice
        tone="success"
        message={notice?.tone === 'success' ? notice.message : downloadState.message}
        onDismiss={() => setNotice(null)}
      />

      {showSummary && rows.length > 0 && (
        <p className="att-summary">
          <span>
            {rows.length} attachment{rows.length === 1 ? '' : 's'}
          </span>
          <span>{formatBytes(totalBytes)} stored</span>
          {metadataOnly > 0 && (
            <span className="att-summary-warn">
              {metadataOnly} metadata-only record{metadataOnly === 1 ? '' : 's'}
            </span>
          )}
        </p>
      )}

      {loading ? (
        <p className="att-empty">Loading stored attachments…</p>
      ) : rows.length === 0 ? (
        <p className="att-empty">
          <Paperclip aria-hidden="true" /> {emptyMessage}
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
              onRemove={editable && onRemove ? removeRow : undefined}
            />
          ))}
        </ul>
      )}

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
