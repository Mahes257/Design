import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, FileText, Layers, Pencil } from 'lucide-react';
import {
  Breadcrumb,
  Button,
  PageLayout,
  StatusBadge,
  ViewPageBanner,
} from '../../components/common';
import { useCad } from '../../context/CadContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  assemblyLabel,
  cadStatusTone,
  formatBytes,
  previewCapability,
  projectName,
} from '../../data/cadData';
import { Fact, FileTypeBadge } from './cadUi';

export default function DrawingDetailPage() {
  const { drawingId } = useParams();
  const navigate = useNavigate();
  const { drawings, files } = useCad();
  const { assemblies, designs } = useMechanical();
  const { projects } = useProjects();

  const drawing = useMemo(
    () =>
      drawings
        .map((row) => ({
          ...row,
          assemblyName: row.assemblyId ? assemblyLabel(assemblies, row.assemblyId) : 'Not linked',
          project: projectName(projects, row.projectId),
          relatedFiles: files.filter((file) => row.cadFileIds?.includes(file.id)),
          hasPreview: row.attachments?.some((attachment) => attachment.preview && attachment.assetPath),
        }))
        .find((row) => row.id === drawingId),
    [drawings, files, assemblies, projects, drawingId],
  );

  if (!drawing) return <Navigate to="/cad-management/drawings" replace />;
  const editable = ['Draft', 'Changes Requested'].includes(drawing.approvalStatus);

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={FileText}
        eyebrow={drawing.drawingNumber}
        title={drawing.title}
        subtitle={`Drawing ${drawing.drawingNumber} · Rev ${drawing.revision}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Drawing & CAD Management', to: '/cad-management' },
              { label: 'Drawing Management', to: '/cad-management/drawings' },
              { label: drawing.drawingNumber },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge
              status={drawing.approvalStatus}
              tone={cadStatusTone(drawing.approvalStatus)}
            />
            <span className="chip">Rev {drawing.revision}</span>
          </>
        }
        meta={[
          ['Drawing Type', drawing.drawingType],
          ['Project', `${drawing.projectId} · ${drawing.project}`],
          ['Part', drawing.partNumber],
          ['Assembly', drawing.assemblyName],
          ['Prepared By', drawing.preparedBy],
          ['Release Status', drawing.releaseStatus],
        ]}
        actions={
          <>
              <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/cad-management/drawings')}>
                Back to Drawing Register
              </Button>
              {drawing.hasPreview && (
                <Button variant="secondary" icon={Layers} onClick={() => navigate(`/cad-management/viewer?drawing=${drawing.id}`)}>
                  Open in Viewer
                </Button>
              )}
              {editable && (
                <Button icon={Pencil} onClick={() => navigate(`/cad-management/drawings/${drawing.id}/edit`)}>
                  Edit Drawing
                </Button>
              )}
          </>
        }
      />
      <div className="cad-details-layout">
        <section className="card cad-details-main">
          <div className="cad-card-head cad-card-head-pad">
            <div>
              <span className="cell-id">{drawing.id}</span>
              <h3>{drawing.drawingNumber}</h3>
              <p>{drawing.title}</p>
            </div>
            <div className="cad-details-badges">
              <StatusBadge status={drawing.approvalStatus} tone={cadStatusTone(drawing.approvalStatus)} />
              <StatusBadge status={drawing.releaseStatus} tone={cadStatusTone(drawing.releaseStatus)} />
            </div>
          </div>

          <div className="fact-grid fact-grid-pad">
            <Fact label="Drawing Number">{drawing.drawingNumber}</Fact>
            <Fact label="Drawing Title">{drawing.title}</Fact>
            <Fact label="Drawing Type">{drawing.drawingType}</Fact>
            <Fact label="Project">{drawing.projectId} · {drawing.project}</Fact>
            <Fact label="Mechanical Design">{drawing.designId ? `${drawing.designId} · ${designs.find((row) => row.id === drawing.designId)?.name || ''} · Rev ${drawing.designRevision || '—'}` : 'Not linked'}</Fact>
            <Fact label="Part Number">{drawing.partNumber}</Fact>
            <Fact label="Part Name">{drawing.partName}</Fact>
            <Fact label="Assembly">{drawing.assemblyName}</Fact>
            <Fact label="Revision">Rev {drawing.revision}</Fact>
            <Fact label="Format">{drawing.format}</Fact>
            <Fact label="Scale / Units">{`${drawing.scale || '1:1'} · ${drawing.units || 'mm'}`}</Fact>
            <Fact label="Sheet / Projection">{`${drawing.sheetSize || 'A3'} · ${drawing.projectionMethod || 'First angle'}`}</Fact>
            <Fact label="Material Reference">{drawing.materialRef || 'Not recorded'}</Fact>
            <Fact label="Prepared By">{drawing.preparedBy}</Fact>
            <Fact label="Reviewed By">{drawing.reviewedBy || 'Not assigned'}</Fact>
            <Fact label="Drawing Date">{drawing.drawingDate}</Fact>
            <Fact label="Release Date">{drawing.releasedAt || 'Not released'}</Fact>
            <Fact label="Release Reference">{drawing.releaseRef || 'Not recorded'}</Fact>
          </div>

          <div className="cad-detail-section cad-pad-x">
            <h4>Description</h4>
            <p>{drawing.description}</p>
            <h4>Tolerance / Specification Notes</h4>
            <p>{drawing.toleranceNotes || 'No tolerance or specification notes recorded.'}</p>
          </div>

          <div className="cad-detail-section cad-pad-x">
            <h4>Related CAD files</h4>
            {drawing.relatedFiles.length === 0 ? <p className="cell-muted">No CAD files linked.</p> : (
              <ul className="cad-detail-links">
                {drawing.relatedFiles.map((file) => (
                  <li key={file.id}>
                    <span>{file.fileName}</span>
                    <span className="cad-inline-actions">
                      {previewCapability(file.fileName).supported && (
                        <button type="button" className="link-button" onClick={() => navigate(`/cad-management/viewer?file=${file.id}`)}>
                          Preview
                        </button>
                      )}
                      <span className="cell-muted">{file.id} · Rev {file.revision}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cad-detail-section cad-pad-x">
            <h4>Related documents</h4>
            <div className="cad-detail-links">
              <span>BOM reference: <strong>{drawing.bomRef || 'Not linked'}</strong></span>
              <span>Manufacturing design reference: <strong>{drawing.mfgRef || 'Not linked'}</strong></span>
              <span>Simulation / validation reference: <strong>{drawing.simulationRef || 'Not linked'}</strong></span>
              <span>Engineering change reference: <strong>{drawing.changeRef || 'Not linked'}</strong></span>
            </div>
          </div>
        </section>

        <aside className="cad-details-side">
          <section className="card cad-side-card">
            <h4>Attachments</h4>
            {drawing.attachments.length === 0 ? <p className="cell-muted">No attachments.</p> : (
              <ul className="cad-attachment-list">
                {drawing.attachments.map((attachment) => (
                  <li key={attachment.name}>
                    <FileTypeBadge extension={attachment.type} />
                    <span>
                      <strong>{attachment.name}</strong>
                      <small>{formatBytes(attachment.size)} · {attachment.preview && attachment.assetPath ? 'preview available' : 'preview unavailable'}</small>
                    </span>
                    {attachment.preview && attachment.assetPath && (
                      <button type="button" className="link-button" onClick={() => navigate(`/cad-management/viewer?drawing=${drawing.id}`)}>
                        Open
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card cad-side-card">
            <h4>Revision history</h4>
            {(drawing.revisions || []).length === 0 ? <p className="cell-muted">No revisions recorded.</p> : (
              <ul className="cad-history">
                {drawing.revisions.map((entry) => (
                  <li key={entry.revision}>
                    <span className="cad-history-dot" aria-hidden="true" />
                    <div>
                      <strong>Rev {entry.revision} · {entry.status}</strong>
                      <span>{entry.date}{entry.previous ? ` · previous Rev ${entry.previous}` : ''}</span>
                      <p>{entry.note}{entry.changeReason ? ` — ${entry.changeReason}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card cad-side-card">
            <h4>Approval history</h4>
            {(drawing.approvals || []).length === 0 ? <p className="cell-muted">No review decisions recorded.</p> : (
              <ul className="cad-history">
                {drawing.approvals.map((entry) => (
                  <li key={entry.id}>
                    <span className="cad-history-dot" aria-hidden="true" />
                    <div><strong>{entry.decision}</strong><span>{entry.date} · {entry.reviewer}</span><p>{entry.comments}</p></div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card cad-side-card">
            <h4>Status history</h4>
            <ul className="cad-history">
              {(drawing.statusHistory || []).map((entry) => (
                <li key={entry.id}>
                  <span className="cad-history-dot" aria-hidden="true" />
                  <div><strong>{entry.status}</strong><span>{entry.at} · {entry.by}</span><p>{entry.note}</p></div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </PageLayout>
  );
}
