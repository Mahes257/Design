import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Box,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Monitor,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button, StatusBadge } from '../../components/common';
import { useCad } from '../../context/CadContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  CAD_FORMAT_SAMPLES,
  assemblyLabel,
  cadStatusTone,
  extensionOf,
  formatBytes,
  previewCapability,
  projectName,
  viewerMode,
} from '../../data/cadData';
import { useMechanical } from '../../context/MechanicalContext';
import Viewer2D from './viewer/Viewer2D';
import Viewer3D from './viewer/Viewer3D';
import OpenInCadSoftwareButton from './OpenInCadSoftware';
import { Toast, useToast } from './cadUi';

function drawingCapability(drawing) {
  const attachment = drawing.attachments?.find((row) => row.preview) || drawing.attachments?.[0];
  return previewCapability(attachment?.name || drawing.format || '');
}

function supportedSourcesForFile(file, localFile) {
  if (localFile?.url) return [{ name: file.fileName, url: localFile.url }];
  if (file.sheets?.length) {
    return file.sheets.map((sheet) => ({ name: sheet.name || 'Sheet', assetPath: sheet.assetPath, url: sheet.assetPath }));
  }
  if (file.assetPath) return [{ name: file.fileName, assetPath: file.assetPath, url: file.assetPath }];
  return [];
}

function supportedSourcesForDrawing(drawing) {
  return (drawing.attachments || [])
    .filter((row) => row.preview && row.assetPath)
    .map((row) => ({ name: row.name, assetPath: row.assetPath, url: row.assetPath }));
}

export default function CadViewerTab() {
  const { files, drawings, localFiles } = useCad();
  const { projects } = useProjects();
  const { assemblies } = useMechanical();
  const { toast, showToast, clearToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState(() => {
    const fileId = searchParams.get('file');
    const drawingId = searchParams.get('drawing');
    const sampleId = searchParams.get('sample');
    if (fileId && files.some((row) => row.id === fileId)) return { kind: 'file', id: fileId };
    if (drawingId && drawings.some((row) => row.id === drawingId)) return { kind: 'drawing', id: drawingId };
    if (sampleId && CAD_FORMAT_SAMPLES.some((row) => row.id === sampleId)) return { kind: 'sample', id: sampleId };
    const first = files.find((row) => previewCapability(row.fileName).supported);
    return first ? { kind: 'file', id: first.id } : { kind: 'drawing', id: drawings[0]?.id || '' };
  });

  const previewableFiles = useMemo(() => files.filter((row) => previewCapability(row.fileName).supported), [files]);
  const previewableDrawings = useMemo(() => drawings.filter((row) => drawingCapability(row).supported), [drawings]);

  const filteredFiles = previewableFiles.filter((row) =>
    !search.trim() || `${row.id} ${row.fileName} ${row.partName} ${row.partNumber}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const filteredDrawings = previewableDrawings.filter((row) =>
    !search.trim() || `${row.drawingNumber} ${row.title} ${row.partNumber}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const selectedFile = selection.kind === 'file' ? files.find((row) => row.id === selection.id) : null;
  const selectedDrawing = selection.kind === 'drawing' ? drawings.find((row) => row.id === selection.id) : null;
  const selectedSample = selection.kind === 'sample' ? CAD_FORMAT_SAMPLES.find((row) => row.id === selection.id) : null;
  const localFile = selectedFile ? localFiles[selectedFile.id] : null;
  // The exact selected source, used by "Open in CAD Software".
  const drawingAttachment = selectedDrawing?.attachments?.find((row) => row.assetPath);
  const launchTarget = selectedSample
    ? { fileName: selectedSample.fileName, assetPath: selectedSample.path, recordRef: selectedSample.id, localEntry: null }
    : selectedFile
      ? { fileName: selectedFile.fileName, assetPath: selectedFile.assetPath, recordRef: selectedFile.id, localEntry: localFile }
      : selectedDrawing
        ? {
            fileName:
              drawingAttachment?.name ||
              `${selectedDrawing.drawingNumber}.${(selectedDrawing.format || '').toLowerCase()}`,
            assetPath: drawingAttachment?.assetPath || '',
            recordRef: selectedDrawing.drawingNumber,
            localEntry: null,
          }
        : null;

  const capability = selectedSample
    ? previewCapability(selectedSample.fileName)
    : selectedFile
      ? previewCapability(selectedFile.fileName)
      : selectedDrawing
        ? drawingCapability(selectedDrawing)
        : { supported: false, mode: 'none', kind: 'none', label: 'No file', reason: 'Select a file to preview.' };
  const mode = capability.kind === '3d' ? '3d' : capability.mode !== 'none' ? '2d' : null;
  const sources = selectedSample
    ? [{ name: selectedSample.fileName, assetPath: selectedSample.path, url: selectedSample.path }]
    : selectedFile
      ? supportedSourcesForFile(selectedFile, localFile)
      : selectedDrawing
        ? supportedSourcesForDrawing(selectedDrawing)
        : [];
  const viewerFile = selectedSample
    ? { id: selectedSample.id, fileName: selectedSample.fileName, partName: selectedSample.label }
    : selectedFile || (selectedDrawing ? {
        id: selectedDrawing.id,
        fileName: selectedDrawing.attachments?.find((row) => row.preview)?.name || `${selectedDrawing.drawingNumber}.${selectedDrawing.format.toLowerCase()}`,
        partName: selectedDrawing.partName,
      } : null);

  useEffect(() => {
    const fileId = searchParams.get('file');
    const drawingId = searchParams.get('drawing');
    const sampleId = searchParams.get('sample');
    if (sampleId && sampleId !== selectedSample?.id) {
      if (CAD_FORMAT_SAMPLES.some((row) => row.id === sampleId)) setSelection({ kind: 'sample', id: sampleId });
    } else if (fileId && fileId !== selectedFile?.id) {
      if (files.some((row) => row.id === fileId)) setSelection({ kind: 'file', id: fileId });
    } else if (drawingId && drawingId !== selectedDrawing?.id) {
      if (drawings.some((row) => row.id === drawingId)) setSelection({ kind: 'drawing', id: drawingId });
    }
    // Only react to URL changes; selection writes the URL itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const select = (kind, id) => {
    setSelection({ kind, id });
    setSearchParams(kind === 'file' ? { file: id } : kind === 'sample' ? { sample: id } : { drawing: id }, { replace: true });
  };

  const switchMode = (nextMode) => {
    if (nextMode === '3d') {
      const match = previewableFiles.find((row) => viewerMode(row) === '3d');
      if (!match) {
        showToast('No 3D model is available in the repository. Upload an OBJ, STL, GLB or PLY file.', 'error');
        return;
      }
      select('file', match.id);
    } else {
      const match = previewableFiles.find((row) => viewerMode(row) === '2d') || previewableDrawings[0];
      if (!match) {
        showToast('No 2D drawing is available. Upload an SVG, PDF or image file.', 'error');
        return;
      }
      if (previewableFiles.includes(match)) select('file', match.id);
      else select('drawing', match.id);
    }
  };

  const currentRecord = selectedSample || selectedFile || selectedDrawing;
  const relatedCadFiles = selectedDrawing ? files.filter((row) => selectedDrawing.cadFileIds?.includes(row.id)) : [];
  // Source context handed to the shared Open in CAD Software dialog.
  const launchContext = selectedFile
    ? [
        { label: 'Project ID', value: selectedFile.projectId },
        { label: 'Part', value: `${selectedFile.partNumber} · ${selectedFile.partName}` },
        { label: 'Revision', value: selectedFile.revision ? `Rev ${selectedFile.revision}` : '' },
      ]
    : selectedDrawing
      ? [
          { label: 'Project ID', value: selectedDrawing.projectId },
          { label: 'Drawing', value: selectedDrawing.drawingNumber },
          { label: 'Revision', value: selectedDrawing.revision ? `Rev ${selectedDrawing.revision}` : '' },
        ]
      : selectedSample
        ? [{ label: 'Format sample', value: `${selectedSample.group} · test sample` }]
        : [];
  const launchSource = 'Drawing & CAD Management → CAD Viewer';

  const download = () => {
    const path = selectedSample?.path || selectedFile?.assetPath || selectedDrawing?.attachments?.find((row) => row.assetPath)?.assetPath || localFile?.url;
    if (!path) {
      showToast('No file bytes are attached to this record in the current session.', 'error');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.download = selectedSample?.fileName || selectedFile?.fileName || selectedDrawing?.attachments?.[0]?.name || 'drawing';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <>
      <div className="cad-viewer-layout">
        <aside className="cad-viewer-sources">
          <div className="cad-panel-head"><Layers aria-hidden="true" /><strong>Viewable files</strong></div>
          <div className="cad-source-search">
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files or drawings…" aria-label="Search viewable files" />
          </div>
          <div className="cad-source-group">
            <span className="cad-source-title">Format verification samples ({CAD_FORMAT_SAMPLES.length})</span>
            {CAD_FORMAT_SAMPLES.map((sample) => (
              <button key={sample.id} type="button" className={`cad-source-item${selectedSample?.id === sample.id ? ' is-active' : ''}`} onClick={() => select('sample', sample.id)}>
                {viewerMode(sample) === '3d' ? <Box aria-hidden="true" /> : <FileText aria-hidden="true" />}
                <span><strong>{sample.label}</strong><small>{sample.fileName} · test sample</small></span>
              </button>
            ))}
          </div>
          <div className="cad-source-group">
            <span className="cad-source-title">3D models ({filteredFiles.filter((row) => viewerMode(row) === '3d').length})</span>
            {filteredFiles.filter((row) => viewerMode(row) === '3d').map((row) => (
              <button key={row.id} type="button" className={`cad-source-item${selectedFile?.id === row.id ? ' is-active' : ''}`} onClick={() => select('file', row.id)}>
                <Box aria-hidden="true" />
                <span><strong>{row.fileName}</strong><small>{row.id} · Rev {row.revision}</small></span>
              </button>
            ))}
            {filteredFiles.filter((row) => viewerMode(row) === '3d').length === 0 && <p className="cell-muted cad-source-empty">No 3D meshes available.</p>}
          </div>
          <div className="cad-source-group">
            <span className="cad-source-title">2D drawings ({filteredFiles.filter((row) => viewerMode(row) === '2d').length + filteredDrawings.length})</span>
            {filteredFiles.filter((row) => viewerMode(row) === '2d').map((row) => (
              <button key={row.id} type="button" className={`cad-source-item${selectedFile?.id === row.id ? ' is-active' : ''}`} onClick={() => select('file', row.id)}>
                <FileText aria-hidden="true" />
                <span><strong>{row.fileName}</strong><small>{row.id} · {extensionOf(row.fileName).toUpperCase()}</small></span>
              </button>
            ))}
            {filteredDrawings.map((row) => (
              <button key={row.id} type="button" className={`cad-source-item${selectedDrawing?.id === row.id ? ' is-active' : ''}`} onClick={() => select('drawing', row.id)}>
                <FileText aria-hidden="true" />
                <span><strong>{row.drawingNumber}</strong><small>{row.title}</small></span>
              </button>
            ))}
            {filteredFiles.filter((row) => viewerMode(row) === '2d').length + filteredDrawings.length === 0 && <p className="cell-muted cad-source-empty">No 2D drawings available.</p>}
          </div>
          <p className="cad-source-note">Only formats with a verified browser renderer are listed. Unsupported files remain in the repository for metadata and download.</p>
        </aside>

        <div className="cad-viewer-main">
          <div className="cad-viewer-switcher">
            <div className="cad-mode-switch" role="group" aria-label="Viewer mode">
              <button type="button" className={mode === '2d' ? 'is-active' : ''} onClick={() => switchMode('2d')}><FileText aria-hidden="true" /> 2D Drawing</button>
              <button type="button" className={mode === '3d' ? 'is-active' : ''} onClick={() => switchMode('3d')}><Box aria-hidden="true" /> 3D Model</button>
            </div>
            <span className="cell-muted">{mode ? capability.label : 'No renderable file selected'}</span>
            {launchTarget && (
              <div className="cad-open-toolbar">
                <OpenInCadSoftwareButton
                  fileName={launchTarget.fileName}
                  assetPath={launchTarget.assetPath}
                  localEntry={launchTarget.localEntry}
                  recordRef={launchTarget.recordRef}
                  sourceModule={launchSource}
                  sourceRef={launchTarget.recordRef}
                  context={launchContext}
                />
              </div>
            )}
          </div>

          {!currentRecord && (
            <div className="cad-viewer-empty"><Monitor aria-hidden="true" /><strong>Select a file to view</strong><p>Choose a 2D drawing or 3D model from the list.</p></div>
          )}

          {currentRecord && !capability.supported && (
            <div className="cad-unsupported">
              <span className="cad-unsupported-icon"><AlertTriangle aria-hidden="true" /></span>
              <h3>Preview unavailable for {extensionOf(viewerFile?.fileName || '').toUpperCase() || 'this format'}</h3>
              <p>{capability.reason}</p>
              <div className="cad-unsupported-actions">
                <Button variant="secondary" icon={Download} onClick={download}>Download Original File</Button>
                <Link className="button button-ghost button-sm" to="/cad-management/repository">Back to repository</Link>
              </div>
            </div>
          )}

          {currentRecord && capability.supported && mode === '2d' && (
            <Viewer2D file={viewerFile} sources={sources} onNotify={showToast} />
          )}
          {currentRecord && capability.supported && mode === '3d' && (
            <Viewer3D file={viewerFile} source={sources[0]} onNotify={showToast} />
          )}
        </div>

        <aside className="cad-viewer-info">
          <div className="cad-panel-head"><ShieldCheck aria-hidden="true" /><strong>Information</strong></div>
          {selectedFile && (
            <>
              <div className="mech-aside-body cad-info-body">
                <div className="mech-aside-group"><span className="mech-aside-label">File</span><span>{selectedFile.fileName}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">File ID</span><span>{selectedFile.id}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Format</span><span>{extensionOf(selectedFile.fileName).toUpperCase()} · {formatBytes(selectedFile.size)}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Category</span><span>{selectedFile.category}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Project</span><span>{selectedFile.projectId} · {projectName(projects, selectedFile.projectId)}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Part</span><span>{selectedFile.partNumber} · {selectedFile.partName}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Revision</span><span>Rev {selectedFile.revision}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Status</span><StatusBadge status={selectedFile.status} tone={cadStatusTone(selectedFile.status)} /></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Rendering</span><span>{capability.label}</span></div>
              </div>
              <div className="cad-info-actions">
                <OpenInCadSoftwareButton
                  fileName={selectedFile.fileName}
                  assetPath={selectedFile.assetPath}
                  localEntry={localFile}
                  recordRef={selectedFile.id}
                  sourceModule={launchSource}
                  sourceRef={selectedFile.id}
                  context={launchContext}
                />
                <Button variant="secondary" size="sm" icon={Download} onClick={download}>Download</Button>
                <Link className="button button-ghost button-sm" to={`/cad-management/repository`}>Repository</Link>
              </div>
            </>
          )}
          {selectedSample && (
            <>
              <div className="mech-aside-body cad-info-body">
                <div className="mech-aside-group"><span className="mech-aside-label">Sample</span><span>{selectedSample.label}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">File</span><span>{selectedSample.fileName}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Format</span><span>{extensionOf(selectedSample.fileName).toUpperCase()}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Rendering</span><span>{capability.label}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Renderer</span><span>{capability.renderer || 'Browser engine'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Capability</span><span>Direct Rendering</span></div>
              </div>
              <div className="cad-info-actions">
                <OpenInCadSoftwareButton
                  fileName={selectedSample.fileName}
                  assetPath={selectedSample.path}
                  recordRef={selectedSample.id}
                  sourceModule={launchSource}
                  sourceRef={selectedSample.id}
                  context={launchContext}
                />
                <Button variant="secondary" size="sm" icon={Download} onClick={download}>Download sample</Button>
                <Link className="button button-ghost button-sm" to="/cad-management/repository">Repository</Link>
              </div>
            </>
          )}
          {selectedDrawing && (
            <>
              <div className="mech-aside-body cad-info-body">
                <div className="mech-aside-group"><span className="mech-aside-label">Drawing</span><span>{selectedDrawing.drawingNumber}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Title</span><span>{selectedDrawing.title}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Type</span><span>{selectedDrawing.drawingType}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Project</span><span>{selectedDrawing.projectId} · {projectName(projects, selectedDrawing.projectId)}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Part</span><span>{selectedDrawing.partNumber} · {selectedDrawing.partName}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Assembly</span><span>{assemblyLabel(assemblies, selectedDrawing.assemblyId)}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Revision</span><span>Rev {selectedDrawing.revision}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Approval</span><StatusBadge status={selectedDrawing.approvalStatus} tone={cadStatusTone(selectedDrawing.approvalStatus)} /></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Rendering</span><span>{capability.label}</span></div>
              </div>
              <div className="cad-info-actions">
                <OpenInCadSoftwareButton
                  fileName={launchTarget?.fileName}
                  assetPath={launchTarget?.assetPath}
                  recordRef={selectedDrawing.drawingNumber}
                  sourceModule={launchSource}
                  sourceRef={selectedDrawing.drawingNumber}
                  context={launchContext}
                />
                <Button variant="secondary" size="sm" icon={Download} onClick={download}>Download</Button>
                <Link className="button button-ghost button-sm" to="/cad-management/drawings">Drawing register</Link>
              </div>
            </>
          )}
          <div className="cad-info-tech">
            <strong>Verified rendering</strong>
            <p>2D: browser SVG/image engines, dxf-parser and the native PDF engine. 3D: Three.js mesh loaders plus OpenCascade WASM for STEP/IGES/BREP. No server conversion and no fake previews.</p>
            <p className="cell-muted">Browser-selected files stay in memory for this session. Refreshing the page clears temporary files and previews.</p>
            {selectedDrawing && relatedCadFiles.length > 0 && (
              <div className="cad-related">
                <strong>Related CAD files</strong>
                {relatedCadFiles.map((row) => (
                  <button key={row.id} type="button" className="link-button" onClick={() => select('file', row.id)}>
                    {row.id} · {row.fileName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
