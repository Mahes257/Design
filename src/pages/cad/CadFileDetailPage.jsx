import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, FolderOpen, Layers, MonitorDown } from 'lucide-react';
import { Button, StatusBadge } from '../../components/common';
import RecordDetailsPage, {
  RecordNotFound,
  remainingFields,
} from '../../components/common/RecordDetails';
import { useCad } from '../../context/CadContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  assemblyLabel,
  cadStatusTone,
  canPreview,
  extensionOf,
  formatBytes,
  projectName,
} from '../../data/cadData';
import OpenInCadSoftwareButton, {
  downloadOriginalFile,
  resolveOriginalFile,
} from './OpenInCadSoftware';

/**
 * CAD file details — full-page record for one file ID from the CAD repository.
 * The record, its byte provenance, linked drawings and upload history are the
 * stored values for that file only.
 */
export default function CadFileDetailPage() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { files, drawings, localFiles, transmittals } = useCad();
  const { assemblies } = useMechanical();
  const { projects } = useProjects();

  const file = files.find((row) => row.id === fileId);
  const project = file?.projectId
    ? projects.find((row) => row.id === file.projectId) || null
    : null;
  const projectListPath = file?.projectId
    ? `/cad-management/project/${file.projectId}`
    : '/cad-management/project/unassigned';
  const backTo = file?.projectId ? projectListPath : '/cad-management/repository';
  const backLabel = file?.projectId ? 'Back to Project CAD Files' : 'Back to CAD Repository';

  if (!file) {
    return (
      <RecordNotFound
        icon={FolderOpen}
        title="CAD file not found"
        message={`No CAD file with ID ${fileId} exists in the current repository.`}
        backTo="/cad-management/repository"
        backLabel="Back to CAD Repository"
      />
    );
  }

  const localEntry = localFiles?.[file.id] || null;
  const original = resolveOriginalFile({
    fileName: file.fileName,
    assetPath: file.assetPath,
    localEntry,
  });
  const linkedDrawings = drawings.filter((drawing) => drawing.cadFileIds?.includes(file.id));
  const relatedTransfers = (transmittals || []).filter((row) => row.cadFileId === file.id);

  const used = [
    'id', 'fileName', 'fileType', 'originalExtension', 'category', 'size', 'revision',
    'versionNumber', 'sourceApplication', 'units', 'scale', 'coordinateReference',
    'designId', 'designRevision', 'conversionStatus', 'conversionFormat', 'uploadedBy',
    'uploadedAt', 'projectId', 'partNumber', 'partName', 'assemblyId', 'status',
    'previousFileId', 'supersededBy', 'bomRef', 'manufacturingRef', 'simulationRef',
    'changeRef', 'description', 'previewNote', 'uploadHistory', 'assetPath', 'localUrl',
  ];

  const sections = [
    {
      title: 'Parent Project',
      icon: FolderOpen,
      fields: [
        { label: 'Project Number', value: file.projectId || 'Unassigned' },
        { label: 'Project Name', value: project?.name || (file.projectId ? 'Project record unavailable' : 'No project linked') },
        { label: 'Customer', value: project?.customer || 'Not available' },
        { label: 'Project Status', value: project?.status || 'Not available' },
      ],
    },
    {
      title: 'File Identification',
      icon: FolderOpen,
      fields: [
        { label: 'File ID', value: file.id },
        { label: 'File Name', value: file.fileName },
        { label: 'File Type', value: file.fileType },
        { label: 'Original Extension', value: `.${file.originalExtension || extensionOf(file.fileName)}` },
        { label: 'Category', value: file.category },
        { label: 'File Size', value: formatBytes(file.size) },
        { label: 'Source Application', value: file.sourceApplication || 'Not recorded' },
        { label: 'Uploaded By', value: file.uploadedBy },
        { label: 'Uploaded Date', value: file.uploadedAt },
      ],
    },
    {
      title: 'Revision & Version Control',
      icon: FolderOpen,
      fields: [
        { label: 'Revision', value: `Rev ${file.revision}` },
        { label: 'Version Number', value: `v${file.versionNumber || 1}` },
        { label: 'Status', value: file.status },
        { label: 'Previous Version', value: file.previousFileId || 'Initial version' },
        { label: 'Superseded By', value: file.supersededBy || 'Current version' },
      ],
    },
    {
      title: 'Engineering References',
      icon: FolderOpen,
      fields: [
        { label: 'Project', value: file.projectId ? `${file.projectId} · ${projectName(projects, file.projectId)}` : 'Unassigned' },
        { label: 'Part', value: `${file.partNumber} · ${file.partName}` },
        {
          label: 'Parent Assembly',
          value: file.assemblyId ? assemblyLabel(assemblies, file.assemblyId) : 'Not linked',
        },
        {
          label: 'Design',
          value: file.designId
            ? `${file.designId} · Rev ${file.designRevision || '—'}`
            : 'Not linked',
        },
        { label: 'BOM Reference', value: file.bomRef || 'Not linked' },
        { label: 'Manufacturing Reference', value: file.manufacturingRef || 'Not linked' },
        { label: 'Simulation Reference', value: file.simulationRef || 'Not linked' },
        { label: 'Change Reference', value: file.changeRef || 'Not linked' },
      ],
    },
    {
      title: 'Units & Preview Capability',
      icon: Layers,
      fields: [
        { label: 'Units / Scale', value: `${file.units || 'mm'} · ${file.scale || '1:1'}` },
        { label: 'Coordinate Reference', value: file.coordinateReference || 'Not recorded' },
        { label: 'Conversion Status', value: file.conversionStatus || 'Not recorded' },
        { label: 'Preview / Conversion Format', value: file.conversionFormat || 'None' },
        { label: 'Preview', value: canPreview(file) ? 'Available in the CAD Viewer' : 'Unavailable for this format' },
        { label: 'Stored Bytes', value: original.available ? 'Available' : 'Metadata only' },
        { label: 'Description', value: file.description, wide: true },
        { label: 'Preview Note', value: file.previewNote, wide: true },
      ],
    },
  ];

  const extra = remainingFields(file, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: FolderOpen, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Drawing & CAD Management', to: '/cad-management' },
        { label: 'CAD File Repository', to: '/cad-management/repository' },
        ...(file.projectId ? [{ label: `Project ${file.projectId}`, to: projectListPath }] : []),
        { label: file.id },
      ]}
      icon={FolderOpen}
      title={file.fileName}
      subtitle={`${file.id} · ${file.category} · Rev ${file.revision}`}
      recordRef={file.id}
      status={<StatusBadge status={file.status} tone={cadStatusTone(file.status)} />}
      chips={
        <>
          <span className="chip">{file.fileType}</span>
          <span className="chip">{formatBytes(file.size)}</span>
          <span className="chip">v{file.versionNumber || 1}</span>
        </>
      }
      meta={[
        ['File ID', file.id],
        ['Project', file.projectId ? `${file.projectId} · ${projectName(projects, file.projectId)}` : 'Unassigned'],
        ['Part', `${file.partNumber} · ${file.partName}`],
        ['Uploaded By', file.uploadedBy],
        ['Uploaded', file.uploadedAt],
        ['Revision', `Rev ${file.revision}`],
      ]}
      backTo={backTo}
      backLabel={backLabel}
      actions={
        <>
          {canPreview(file) && (
            <Button
              variant="secondary"
              icon={Layers}
              onClick={() => navigate(`/cad-management/viewer?file=${file.id}`)}
            >
              Open in CAD Viewer
            </Button>
          )}
          <OpenInCadSoftwareButton
            fileName={file.fileName}
            assetPath={file.assetPath}
            localEntry={localEntry}
            recordRef={file.id}
          />
          {original.available && (
            <Button icon={Download} onClick={() => downloadOriginalFile(original)}>
              Download File
            </Button>
          )}
        </>
      }
      sections={sections}
      related={[
        {
          label: 'Project',
          value: file.projectId ? (
            <Link className="cell-link" to={projectListPath}>
              {file.projectId} · {projectName(projects, file.projectId)}
            </Link>
          ) : (
            <Link className="cell-link" to="/cad-management/project/unassigned">
              Unassigned
            </Link>
          ),
        },
        {
          label: 'Drawings Referencing This File',
          value:
            linkedDrawings.length > 0 ? (
              <span>
                {linkedDrawings.map((drawing, index) => (
                  <span key={drawing.id}>
                    {index > 0 ? ', ' : ''}
                    <Link className="cell-link" to={`/cad-management/drawings/${drawing.id}`}>
                      {drawing.drawingNumber}
                    </Link>
                  </span>
                ))}
              </span>
            ) : (
              'No drawing references this file'
            ),
        },
        {
          label: 'Transmittals',
          value: relatedTransfers.length > 0 ? relatedTransfers.map((row) => row.id).join(', ') : 'None',
        },
        {
          label: 'Design',
          value: file.designId ? (
            <Link className="cell-link" to={`/mechanical-design/design-register/${file.designId}`}>
              {file.designId}
            </Link>
          ) : (
            'Not linked'
          ),
        },
      ]}
      history={(file.uploadHistory || []).map((entry) => ({
        label: entry.action,
        detail: entry.description,
        by: entry.by,
        at: entry.at,
      }))}
      note="The CAD repository stores metadata for every file. Original bytes are only available when the file has a bundled source asset or was selected in this browser session."
    />
  );
}
