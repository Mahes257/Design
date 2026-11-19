import { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  FileText,
  MessageSquarePlus,
  PackageCheck,
  Pencil,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, Toolbar } from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useTransfers } from '../../context/TransfersContext';
import { destinationLabel, formatDate, projectName, sourceFor } from '../../data/transfersData';
import {
  AcknowledgementDialog,
  AttachmentDialog,
  CancelDialog,
  CommentDialog,
  CommentsPanel,
  DestinationBadges,
  DetailItem,
  HandoverDialog,
  Toast,
  TransferStatus,
  TransferTimeline,
  ValidationResults,
  formatBytes,
  useToast,
} from './transfersUi';

function SideCard({ title, side, destination, transfer, onHandover, onAcknowledge, icon: Icon }) {
  if (!transfer.destinations.includes(destination)) {
    return (
      <Card className="transfers-side-card is-excluded">
        <div className="transfers-side-head">
          <Icon aria-hidden="true" />
          <div>
            <strong>{title}</strong>
            <span>Not selected for this transfer.</span>
          </div>
        </div>
      </Card>
    );
  }
  const blocked = ['Draft', 'Cancelled', 'Failed'].includes(transfer.status);
  return (
    <Card className="transfers-side-card">
      <div className="transfers-side-head">
        <Icon aria-hidden="true" />
        <div>
          <strong>{title}</strong>
          <span>Independent destination handover</span>
        </div>
        <TransferStatus status={side?.status || 'Not Prepared'} />
      </div>
      <div className="transfers-side-body">
        {side?.handover ? (
          <>
            <DetailItem label="Handover reference">{side.handover.id}</DetailItem>
            <DetailItem label="Handover date">{formatDate(side.handover.date)}</DetailItem>
            <DetailItem label="Receiving owner">{side.handover.owner}</DetailItem>
            <DetailItem label="Prepared by">{side.handover.preparedBy}</DetailItem>
            <DetailItem label="Acknowledgement">
              {side.acknowledgement ? `${side.acknowledgement.status} · ${formatDate(side.acknowledgement.date)}` : 'Pending'}
            </DetailItem>
            <DetailItem label="Acknowledgement owner">{side.acknowledgement?.owner || '—'}</DetailItem>
            {side.acknowledgement?.comments && (
              <div className="transfers-side-comment">
                <span>Receiving note</span>
                <p>{side.acknowledgement.comments}</p>
              </div>
            )}
          </>
        ) : (
          <p className="transfers-side-missing">
            No {destination.toLowerCase()} handover has been recorded. Validate the transfer, then prepare the destination-specific handover.
          </p>
        )}
      </div>
      <div className="transfers-side-actions">
        {blocked ? (
          <span className="cell-muted">
            {transfer.status === 'Draft' ? 'Validate this draft before handover.' : 'This transfer is closed for handover.'}
          </span>
        ) : !side?.handover ? (
          <Button icon={PackageCheck} size="sm" onClick={() => onHandover(destination)}>
            Prepare Handover
          </Button>
        ) : (
          <Button icon={CheckCircle2} size="sm" variant="secondary" onClick={() => onAcknowledge(destination)}>
            Record Acknowledgement
          </Button>
        )}
        <Link className="btn-ghost" to={destination === 'Purchase' ? '/transfers/purchase' : '/transfers/production'}>
          Open workspace
        </Link>
      </div>
    </Card>
  );
}

export default function TransferDetailView({ transfer, embedded = false }) {
  const bomItemColumns = useTableColumnVisibility('transfers.detail#bom-items', [
    { key: 'part', label: 'Part' },
    { key: 'description', label: 'Description' },
    { key: 'qty', label: 'Qty' },
    { key: 'makeBuy', label: 'Make / Buy' },
    { key: 'material', label: 'Material' },
    { key: 'drawing', label: 'Drawing' },
  ]);
  const { validateTransfer, prepareHandover, acknowledgeTransfer, addComment, cancelTransfer } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const [handoverTarget, setHandoverTarget] = useState('');
  const [ackTarget, setAckTarget] = useState('');
  const [commentOpen, setCommentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);

  if (!transfer) return null;
  const source = sourceFor(transfer);
  const contents = transfer.contents || {};
  const canHandover = !['Draft', 'Cancelled', 'Failed'].includes(transfer.status);

  const validate = () => {
    const result = validateTransfer(transfer.id, { checkedBy: 'N. Joshi' });
    if (result.error) showToast(result.error, 'error');
    else if (result.blocking) showToast('Validation failed. Mandatory checks are blocking handover.', 'error');
    else showToast('Transfer validated. Mandatory checks passed.');
  };

  return (
    <div className="transfers-detail-view">
      {!embedded && (
        <Toolbar
          left={<span className="transfers-toolbar-label">Transfer actions</span>}
          right={
            <>
              <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={validate}>Validate Transfer</Button>
              <Button variant="ghost" size="sm" icon={MessageSquarePlus} onClick={() => setCommentOpen(true)}>Add Comment</Button>
              <Button variant="ghost" size="sm" icon={Ban} onClick={() => setCancelOpen(true)}>Cancel Transfer</Button>
            </>
          }
          count={`${transfer.id} · ${transfer.status}`}
        />
      )}

      <div className="transfers-detail-head">
        <div>
          <span className="transfers-kicker">Transfer record · exact revision control</span>
          <h2>{transfer.id}</h2>
          <p>
            {transfer.deliverableNumber} · Rev {transfer.revision} · {transfer.deliverableName}
          </p>
          <div className="approvals-inline-badges">
            <TransferStatus status={transfer.status} />
            <DestinationBadges destinations={transfer.destinations} />
            <span className="approvals-exact-rev">Rev {transfer.revision}</span>
          </div>
        </div>
        <div className="transfers-detail-actions">
          {transfer.status === 'Draft' && (
            <Link className="erp-btn-primary" to={`/transfers/${transfer.id}/edit`}><Pencil aria-hidden="true" /> Edit Draft</Link>
          )}
          {canHandover && <Button variant="secondary" icon={ShieldCheck} onClick={validate}>Validate</Button>}
          {canHandover && transfer.destinations.includes('Purchase') && !transfer.purchase?.handover && (
            <Button icon={ShoppingCart} onClick={() => setHandoverTarget('Purchase')}>Purchase Handover</Button>
          )}
          {canHandover && transfer.destinations.includes('Production') && !transfer.production?.handover && (
            <Button icon={Factory} onClick={() => setHandoverTarget('Production')}>Production Handover</Button>
          )}
        </div>
      </div>

      <div className="fact-grid transfers-detail-facts">
        <DetailItem label="Project">{`${transfer.projectId} · ${projectName(transfer.projectId)}`}</DetailItem>
        <DetailItem label="Deliverable type">{transfer.deliverableType}</DetailItem>
        <DetailItem label="Exact revision">Rev {transfer.revision}</DetailItem>
        <DetailItem label="Destination">{destinationLabel(transfer.destinations)}</DetailItem>
        <DetailItem label="Source review">{transfer.reviewId}</DetailItem>
        <DetailItem label="Source release">{transfer.releaseId}</DetailItem>
        <DetailItem label="Release date">{formatDate(transfer.releaseDate)}</DetailItem>
        <DetailItem label="Source module">{transfer.sourceModule}</DetailItem>
        <DetailItem label="Initiator">{transfer.initiatedBy}</DetailItem>
        <DetailItem label="Transfer date">{formatDate(transfer.transferDate)}</DetailItem>
        <DetailItem label="Priority">{transfer.priority}</DetailItem>
        <DetailItem label="Last updated">{formatDate(transfer.updatedAt || transfer.transferDate)}</DetailItem>
      </div>

      {transfer.cancellation && (
        <div className="approvals-note-block is-warning transfers-detail-alert">
          <Ban aria-hidden="true" />
          <p>
            <strong>Cancelled:</strong> {transfer.cancellation.reason} · Recorded by {transfer.cancellation.by} on {transfer.cancellation.at?.replace('T', ' ')}.
            The original source release and all history are retained.
          </p>
        </div>
      )}
      {transfer.failure && (
        <div className="approvals-note-block is-warning transfers-detail-alert">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>Failed handover:</strong> {transfer.failure.reason} · Recorded by {transfer.failure.by} on {transfer.failure.at?.replace('T', ' ')}.
          </p>
        </div>
      )}

      <div className="transfers-detail-grid">
        <div className="transfers-detail-main">
          <Card title="Transfer contents" subtitle="Prepared from the exact released revision">
            <div className="transfers-content-note">
              <span>Technical notes</span>
              <p>{contents.technicalNotes || transfer.notes}</p>
            </div>

            {contents.bomItems?.length > 0 && (
              <div className="transfers-detail-subtable">
                <div className="transfers-subhead">
                  <BoxesIcon />
                  <strong>BOM items ({contents.bomItems.length})</strong>
                </div>
                <ManageColumns {...bomItemColumns.managerProps} />
                <div className="table-wrap">
                  <table className="data-table transfers-compact-table" aria-label="Transfer BOM items">
                    <thead>
                      <tr>
                        {bomItemColumns.isVisible('part') && <th>Part</th>}
                        {bomItemColumns.isVisible('description') && <th>Description</th>}
                        {bomItemColumns.isVisible('qty') && <th>Qty</th>}
                        {bomItemColumns.isVisible('makeBuy') && <th>Make / Buy</th>}
                        {bomItemColumns.isVisible('material') && <th>Material</th>}
                        {bomItemColumns.isVisible('drawing') && <th>Drawing</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {contents.bomItems.map((item) => (
                        <tr key={item.id}>
                          {bomItemColumns.isVisible('part') && <td className="cell-id">{item.partNumber}</td>}
                          {bomItemColumns.isVisible('description') && <td>{item.description}</td>}
                          {bomItemColumns.isVisible('qty') && <td>{item.qty} {item.unit}</td>}
                          {bomItemColumns.isVisible('makeBuy') && <td><span className="approvals-stage-chip">{item.category}</span></td>}
                          {bomItemColumns.isVisible('material') && <td>{item.materialReference}</td>}
                          {bomItemColumns.isVisible('drawing') && <td>{item.drawingReference}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {contents.materialRequirements?.length > 0 && (
              <div className="transfers-content-lines">
                <strong>Material requirements</strong>
                {contents.materialRequirements.map((row) => (
                  <span key={row.id}>{row.materialCode} · {row.description} · {row.qty} {row.unit}</span>
                ))}
              </div>
            )}

            {contents.drawingReferences?.length > 0 && (
              <div className="transfers-content-lines">
                <strong>Drawing references</strong>
                {contents.drawingReferences.map((row) => <span key={row}>{row}</span>)}
              </div>
            )}

            {contents.manufacturingPackage && (
              <div className="transfers-content-lines">
                <strong>Manufacturing package</strong>
                <span>{contents.manufacturingPackage}</span>
              </div>
            )}

            <div className="transfers-attachments">
              <strong>Attachments</strong>
              {transfer.attachments?.length ? (
                transfer.attachments.map((row) => (
                  <button key={row.name} type="button" className="transfers-attachment" onClick={() => setAttachment(row)}>
                    <FileText aria-hidden="true" />
                    <span>{row.name}</span>
                    <small>{formatBytes(row.size)}</small>
                  </button>
                ))
              ) : (
                <span className="cell-muted">No attachments recorded.</span>
              )}
            </div>
          </Card>

          <Card title="Validation" subtitle="Common, Purchase and Production checks">
            <ValidationResults validation={transfer.validation} />
            {!embedded && (
              <div className="transfers-card-actions">
                <Button variant="secondary" size="sm" icon={ClipboardCheck} onClick={validate}>Run Validation</Button>
              </div>
            )}
          </Card>

          <div className="transfers-side-grid">
            <SideCard
              title="Purchase handover"
              side={transfer.purchase}
              destination="Purchase"
              transfer={transfer}
              onHandover={setHandoverTarget}
              onAcknowledge={setAckTarget}
              icon={ShoppingCart}
            />
            <SideCard
              title="Production handover"
              side={transfer.production}
              destination="Production"
              transfer={transfer}
              onHandover={setHandoverTarget}
              onAcknowledge={setAckTarget}
              icon={Factory}
            />
          </div>

          <Card title="Comments" subtitle="Comments do not replace acknowledgement">
            <CommentsPanel comments={transfer.comments} />
            <div className="transfers-card-actions">
              <Button variant="secondary" size="sm" icon={MessageSquarePlus} onClick={() => setCommentOpen(true)}>Add Comment</Button>
            </div>
          </Card>
        </div>

        <aside className="transfers-detail-aside">
          <Card title="Source release" subtitle="Locked references">
            <div className="transfers-source-lock">
              <ShieldCheck aria-hidden="true" />
              <p>Revisions are referenced exactly. A newer revision must be released by Module 10 and transferred separately.</p>
            </div>
            <div className="fact-grid">
              <DetailItem label="Deliverable">{source?.deliverableNumber || transfer.deliverableNumber}</DetailItem>
              <DetailItem label="Revision">Rev {source?.revision || transfer.revision}</DetailItem>
              <DetailItem label="Review">{transfer.reviewId}</DetailItem>
              <DetailItem label="Release">{transfer.releaseId}</DetailItem>
              <DetailItem label="Release owner">{source?.releaseOwner || 'Design Authority'}</DetailItem>
              <DetailItem label="Assembly / BOM">{source?.assembly || source?.bomNumber || '—'}</DetailItem>
            </div>
          </Card>

          <Card title="Activity history" subtitle="Chronological transfer record">
            <TransferTimeline history={transfer.history || []} />
          </Card>
        </aside>
      </div>

      <HandoverDialog
        open={Boolean(handoverTarget)}
        transfer={transfer}
        destination={handoverTarget}
        onClose={() => setHandoverTarget('')}
        onSubmit={(config) => {
          const result = prepareHandover(transfer.id, handoverTarget, config);
          if (!result.error) showToast(`${handoverTarget} handover recorded.`);
          return result;
        }}
      />
      <AcknowledgementDialog
        open={Boolean(ackTarget)}
        transfer={transfer}
        destination={ackTarget}
        onClose={() => setAckTarget('')}
        onSubmit={(config) => {
          const result = acknowledgeTransfer(transfer.id, ackTarget, config);
          if (!result.error) showToast(`${ackTarget} acknowledgement recorded locally.`);
          return result;
        }}
      />
      <CommentDialog
        open={commentOpen}
        transfer={transfer}
        onClose={() => setCommentOpen(false)}
        onSubmit={(config) => {
          const result = addComment(transfer.id, config);
          if (!result.error) showToast('Comment added.');
          return result;
        }}
      />
      <CancelDialog
        open={cancelOpen}
        transfer={transfer}
        onClose={() => setCancelOpen(false)}
        onSubmit={(config) => {
          const result = cancelTransfer(transfer.id, config);
          if (!result.error) showToast('Transfer cancelled; all history retained.');
          return result;
        }}
      />
      <AttachmentDialog attachment={attachment} onClose={() => setAttachment(null)} />
      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}

function BoxesIcon() {
  return <PackageCheck aria-hidden="true" className="transfers-subhead-icon" />;
}
