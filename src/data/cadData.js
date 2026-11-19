/**
 * Local mock data for Module 10 — Drawing & CAD Management.
 *
 * Rendering facts (shared capability registry lives in cadCapability.js):
 *   - 2D: SVG / PNG / JPG / WEBP / BMP / GIF render with the browser's image
 *         engine, PDF with the browser's PDF engine, and DXF through the
 *         bundled dxf-parser → SVG pipeline.
 *   - 3D: GLB / GLTF / OBJ / STL / PLY / FBX / 3MF render with Three.js
 *         loaders; STEP / STP / IGES / IGS / BREP through the OpenCascade WASM
 *         tessellation pipeline.
 *   - DWG / DGN and native CAD formats need external conversion; they are
 *         stored and downloadable only unless a converted preview is attached.
 *
 * The sample assets in /public/cad-samples are real vector drawings and real
 * mesh geometry generated for viewer verification (clearly labelled samples),
 * not screenshots standing in for CAD.
 */
import { TODAY, addDays, formatDate } from './projectData';
import { ASSEMBLIES, DESIGNS, PARTS } from './mechanicalData';
import { cadCapability } from './cadCapability';

export { TODAY, addDays, formatDate };

export const CAD_CATEGORIES = [
  '3D CAD Model',
  '2D CAD Drawing',
  'Assembly Model',
  'Part Model',
  'Reference Model',
  'Technical Document',
  'Supporting Attachment',
];

export const DRAWING_TYPES = [
  'General Arrangement Drawing',
  'Assembly Drawing',
  'Component Drawing',
  'Fabrication Drawing',
  'Machining Drawing',
  'Sheet Metal Drawing',
  'Piping Drawing',
  'Installation Drawing',
];

export const CAD_STATUSES = ['Draft', 'Registered', 'Available', 'Preview Available', 'Preview Unavailable', 'Archived'];
export const DRAWING_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Changes Requested', 'Approved', 'Released', 'Superseded', 'Withdrawn'];
export const REVISION_STATUSES = ['Draft', 'Under Review', 'Approved', 'Released', 'Superseded', 'Withdrawn'];
export const TRANSMITTAL_STATUSES = ['Draft', 'Prepared', 'Issued', 'Acknowledged', 'Rejected', 'Cancelled'];
export const HANDOVER_STATUSES = ['Draft', 'Ready', 'Submitted', 'Acknowledged', 'Rejected', 'Failed'];

export const SOURCE_APPLICATIONS = ['SolidWorks', 'CATIA', 'Creo', 'Siemens NX', 'Autodesk Inventor', 'Fusion 360', 'AutoCAD', 'Neutral exchange / other'];
export const CAD_UNITS = ['mm', 'cm', 'm', 'in', 'ft'];
export const DRAWING_UNITS = ['mm', 'cm', 'm', 'in'];
export const SHEET_SIZES = ['A4', 'A3', 'A2', 'A1', 'A0', 'ANSI A', 'ANSI B', 'ANSI C', 'Custom'];
export const PROJECTION_METHODS = ['First angle', 'Third angle'];
export const COORDINATE_REFERENCES = ['Model origin', 'Assembly origin', 'Project grid', 'Site coordinate system', 'Not applicable'];

export function designForProject(projectId) {
  return DESIGNS.find((design) => design.projectId === projectId) || null;
}

export const CAD_ENGINEERS = ['R. Kulkarni', 'D. Rao', 'K. Pillai', 'V. Sharma', 'P. Deshmukh', 'A. Iyer', 'S. Menon', 'N. Joshi'];
export const CAD_REVIEWERS = ['N. Joshi', 'A. Iyer', 'S. Menon', 'K. Pillai'];
export const REVIEWER_PERSONA = 'N. Joshi';

const TONES = {
  Draft: 'gray',
  Registered: 'blue',
  Available: 'blue',
  'Preview Available': 'green',
  'Preview Unavailable': 'red',
  Archived: 'purple',
  Submitted: 'orange',
  'Under Review': 'orange',
  'Changes Requested': 'red',
  Approved: 'green',
  Released: 'green',
  Superseded: 'purple',
  Withdrawn: 'gray',
  Prepared: 'blue',
  Issued: 'orange',
  Acknowledged: 'green',
  Rejected: 'red',
  Cancelled: 'gray',
  Ready: 'blue',
  Failed: 'red',
};

export function cadStatusTone(status) {
  return TONES[status] || 'gray';
}

export function projectName(projects, projectId) {
  return (projects || []).find((row) => row.id === projectId)?.name || projectId;
}

export function assemblyLabel(assemblies, assemblyId) {
  const assembly = (assemblies || ASSEMBLIES).find((row) => row.id === assemblyId);
  return assembly ? `${assembly.number} · ${assembly.name}` : 'Not linked';
}

export function partName(partNumber) {
  return PARTS.find((row) => row.partNumber === partNumber)?.name || '';
}

export function extensionOf(name = '') {
  const value = String(name);
  const index = value.lastIndexOf('.');
  return index >= 0 ? value.slice(index + 1).toLowerCase() : '';
}

/** What the browser can actually do with this file, independent of metadata. */
export function previewCapability(fileOrExt) {
  const ext = typeof fileOrExt === 'string' ? extensionOf(fileOrExt) : extensionOf(fileOrExt?.fileName || fileOrExt?.fileType || '');
  const capability = cadCapability(`file.${ext}`);
  return {
    mode: capability.mode,
    supported: capability.supported,
    status: capability.status,
    label: capability.label,
    reason: capability.reason,
    renderer: capability.renderer,
    kind: capability.kind,
  };
}

export function canPreview(file) {
  return previewCapability(file).supported;
}

export function viewerMode(file) {
  const capability = previewCapability(file);
  if (capability.kind === '3d') return '3d';
  if (capability.mode === 'none') return null;
  return '2d';
}

export function nextId(prefix, records = []) {
  const numbers = records
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter((value) => Number.isFinite(value));
  return `${prefix}-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export function nextRevision(letter) {
  const steps = ['A', 'B', 'C', 'D', 'E', 'F'];
  const index = steps.indexOf(letter);
  if (index === -1) return 'A';
  return steps[index + 1] || `${letter}1`;
}

export function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function defaultSourceApplication(fileName = '') {
  const ext = extensionOf(fileName);
  if (['sldprt', 'sldasm', 'slddrw'].includes(ext)) return 'SolidWorks';
  if (ext.startsWith('cat')) return 'CATIA';
  if (['prt', 'asm'].includes(ext)) return 'Creo';
  if (['ipt', 'iam', 'idw', 'ipn'].includes(ext)) return 'Autodesk Inventor';
  if (['f3d', 'f3z'].includes(ext)) return 'Fusion 360';
  if (['dwg', 'dxf', 'dgn'].includes(ext)) return 'AutoCAD';
  return 'Neutral exchange / other';
}

export function conversionSummary(fileName = '', hasConvertedPreview = false) {
  const capability = previewCapability(fileName);
  if (hasConvertedPreview) return { status: 'Converted preview attached', format: 'Attached preview', note: 'Original file retained separately.' };
  if (capability.supported) return { status: 'Not required', format: 'Direct browser rendering', note: capability.renderer || capability.label };
  if (capability.status === 'external') return { status: 'External conversion required', format: 'No converted preview attached', note: capability.reason };
  return { status: 'Unsupported', format: 'No conversion available', note: capability.reason };
}

export const CAD_FORMAT_SAMPLES = [
  { id: 'sample-step', label: 'STEP · rounded cube', fileName: 'rounded-cube.step', path: '/cad-samples/rounded-cube.step', group: '3D' },
  { id: 'sample-iges', label: 'IGES · 10 mm cube', fileName: 'cube-10x10.igs', path: '/cad-samples/cube-10x10.igs', group: '3D' },
  { id: 'sample-brep', label: 'BREP · sample part', fileName: 'sample-part.brep', path: '/cad-samples/sample-part.brep', group: '3D' },
  { id: 'sample-obj', label: 'OBJ · five-component assembly', fileName: 'drive-assembly.obj', path: '/cad-samples/drive-assembly.obj', group: '3D' },
  { id: 'sample-stl', label: 'STL · gearbox housing', fileName: 'gearbox-housing.stl', path: '/cad-samples/gearbox-housing.stl', group: '3D' },
  { id: 'sample-gltf', label: 'glTF · simple cube', fileName: 'simple-cube.gltf', path: '/cad-samples/simple-cube.gltf', group: '3D' },
  { id: 'sample-glb', label: 'GLB · simple cube', fileName: 'simple-cube.glb', path: '/cad-samples/simple-cube.glb', group: '3D' },
  { id: 'sample-ply', label: 'PLY · simple cube', fileName: 'simple-cube.ply', path: '/cad-samples/simple-cube.ply', group: '3D' },
  { id: 'sample-3mf', label: '3MF · simple cube', fileName: 'simple-cube.3mf', path: '/cad-samples/simple-cube.3mf', group: '3D' },
  { id: 'sample-svg', label: 'SVG · conveyor GA', fileName: 'conveyor-drive-ga.svg', path: '/cad-samples/conveyor-drive-ga.svg', group: '2D' },
  { id: 'sample-dxf', label: 'DXF · bracket outline', fileName: 'bracket-outline.dxf', path: '/cad-samples/bracket-outline.dxf', group: '2D' },
  { id: 'sample-pdf', label: 'PDF · utility skid GA', fileName: 'utility-skid-ga.pdf', path: '/cad-samples/utility-skid-ga.pdf', group: '2D' },
  { id: 'sample-png', label: 'PNG · cube reference', fileName: 'cube-reference.png', path: '/cad-samples/cube-reference.png', group: '2D' },
  { id: 'sample-jpg', label: 'JPG · cube reference', fileName: 'cube-reference.jpg', path: '/cad-samples/cube-reference.jpg', group: '2D' },
  { id: 'sample-jpeg', label: 'JPEG · cube reference', fileName: 'cube-reference.jpeg', path: '/cad-samples/cube-reference.jpeg', group: '2D' },
  { id: 'sample-webp', label: 'WebP · cube reference', fileName: 'cube-reference.webp', path: '/cad-samples/cube-reference.webp', group: '2D' },
  { id: 'sample-bmp', label: 'BMP · cube reference', fileName: 'cube-reference.bmp', path: '/cad-samples/cube-reference.bmp', group: '2D' },
  { id: 'sample-gif', label: 'GIF · cube reference', fileName: 'cube-reference.gif', path: '/cad-samples/cube-reference.gif', group: '2D' },
];

/* --------------------------------------------------------------- seed files */
const FILE_ROWS = [
  {
    id: 'CAD-2026-001', fileName: 'DRG-MEC-041-001_Conveyor-Drive-GA.svg', category: '2D CAD Drawing',
    projectId: 'PRJ-2026-041', partNumber: 'MEC-041-001', partName: 'Gearbox housing',
    assemblyId: 'ASM-2026-001', revision: 'C', size: 5_946, uploadedBy: 'R. Kulkarni', uploadedAt: '2026-10-26',
    status: 'Preview Available', assetPath: '/cad-samples/conveyor-drive-ga.svg',
    description: 'General arrangement vector drawing for the conveyor drive assembly, sheet 1 of 2.',
    sheets: [
      { name: 'Sheet 1 — GA', assetPath: '/cad-samples/conveyor-drive-ga.svg' },
      { name: 'Sheet 2 — Assembly / BOM', assetPath: '/cad-samples/conveyor-drive-ga-s2.svg' },
    ],
  },
  {
    id: 'CAD-2026-002', fileName: 'ASM-MEC-041-100_Drive-Assembly.obj', category: 'Assembly Model',
    projectId: 'PRJ-2026-041', partNumber: 'MEC-041-001', partName: 'Gearbox housing',
    assemblyId: 'ASM-2026-001', revision: 'C', size: 6_338, uploadedBy: 'R. Kulkarni', uploadedAt: '2026-10-24',
    status: 'Preview Available', assetPath: '/cad-samples/drive-assembly.obj',
    description: 'Five-component assembly mesh (base plate, housing, bearing boss, shaft, motor mount) for the drive assembly.',
  },
  {
    id: 'CAD-2026-003', fileName: 'MEC-041-001_Gearbox-Housing.stl', category: 'Part Model',
    projectId: 'PRJ-2026-041', partNumber: 'MEC-041-001', partName: 'Gearbox housing',
    assemblyId: 'ASM-2026-001', revision: 'B', size: 24_570, uploadedBy: 'D. Rao', uploadedAt: '2026-10-12',
    status: 'Preview Available', assetPath: '/cad-samples/gearbox-housing.stl',
    description: 'Gearbox housing STL mesh used for browser-side model review.',
  },
  {
    id: 'CAD-2026-004', fileName: 'DRG-FAB-038-001_Base-Frame-Fabrication.svg', category: '2D CAD Drawing',
    projectId: 'PRJ-2026-038', partNumber: 'FAB-038-001', partName: 'Base frame',
    assemblyId: 'ASM-2026-005', revision: 'B', size: 3_371, uploadedBy: 'K. Pillai', uploadedAt: '2026-10-12',
    status: 'Preview Available', assetPath: '/cad-samples/frame-fabrication.svg',
    description: 'Fabrication drawing with weld symbols and member sizes for the conveyor base frame.',
    sheets: [{ name: 'Sheet 1 — Fabrication', assetPath: '/cad-samples/frame-fabrication.svg' }],
  },
  {
    id: 'CAD-2026-005', fileName: 'ASM-FAB-038-200_Base-Frame.step', category: 'Reference Model',
    projectId: 'PRJ-2026-038', partNumber: 'FAB-038-001', partName: 'Base frame',
    assemblyId: 'ASM-2026-005', revision: 'B', size: 1_842_000, uploadedBy: 'K. Pillai', uploadedAt: '2026-10-11',
    status: 'Preview Unavailable', assetPath: '',
    description: 'Reference STEP assembly supplied by the fabrication vendor. Stored for download; no browser preview.',
  },
  {
    id: 'CAD-2026-006', fileName: 'DRG-SMT-036-001_Enclosure-Panels.dxf', category: '2D CAD Drawing',
    projectId: 'PRJ-2026-036', partNumber: 'SMT-036-001', partName: 'Enclosure side panel',
    assemblyId: 'ASM-2026-006', revision: 'A', size: 486_000, uploadedBy: 'V. Sharma', uploadedAt: '2026-10-20',
    status: 'Preview Unavailable', assetPath: '',
    description: 'Laser-cutting DXF for enclosure panels. Stored only — DXF has no renderer in this build.',
  },
  {
    id: 'CAD-2026-007', fileName: 'DRG-PIP-033-001_Utility-Skid-GA.pdf', category: '2D CAD Drawing',
    projectId: 'PRJ-2026-033', partNumber: 'PIP-033-001', partName: 'Pipe spool DN50',
    assemblyId: 'ASM-2026-007', revision: 'A', size: 1_632, uploadedBy: 'P. Deshmukh', uploadedAt: '2026-11-05',
    status: 'Preview Available', assetPath: '/cad-samples/utility-skid-ga.pdf',
    description: 'Machine-issued PDF general arrangement for the utility skid piping package.',
  },
  {
    id: 'CAD-2026-008', fileName: 'DRG-FAB-024-081_Press-Frame.dwg', category: '2D CAD Drawing',
    projectId: 'PRJ-2026-024', partNumber: 'FAB-024-081', partName: 'Press frame side plate',
    assemblyId: '', revision: 'A', size: 2_240_000, uploadedBy: 'A. Iyer', uploadedAt: '2026-11-06',
    status: 'Preview Unavailable', assetPath: '',
    description: 'Hydraulic press frame drawing received from the design partner in DWG format.',
  },
  {
    id: 'CAD-2026-009', fileName: 'MEC-041-002_Input-Shaft.stl', category: 'Part Model',
    projectId: 'PRJ-2026-041', partNumber: 'MEC-041-002', partName: 'Input shaft',
    assemblyId: 'ASM-2026-001', revision: 'B', size: 40_000, uploadedBy: 'D. Rao', uploadedAt: '2026-10-18',
    status: 'Preview Available', assetPath: '/cad-samples/drive-shaft.stl',
    description: 'Stepped input shaft mesh with keyway and bearing journals.',
  },
  {
    id: 'CAD-2026-010', fileName: 'MEC-041-004_Bearing-Set.pdf', category: 'Technical Document',
    projectId: 'PRJ-2026-041', partNumber: 'MEC-041-004', partName: 'Bearing set 32217',
    assemblyId: 'ASM-2026-001', revision: 'A', size: 842_000, uploadedBy: 'R. Kulkarni', uploadedAt: '2026-09-28',
    status: 'Registered', assetPath: '',
    description: 'Vendor bearing data sheet (metadata record; file not attached in this session).',
  },
  {
    id: 'CAD-2026-011', fileName: 'DRG-MEC-041-001_RevB_Superseded.svg', category: 'Reference Model',
    projectId: 'PRJ-2026-041', partNumber: 'MEC-041-001', partName: 'Gearbox housing',
    assemblyId: 'ASM-2026-001', revision: 'B', size: 5_612, uploadedBy: 'R. Kulkarni', uploadedAt: '2026-10-04',
    status: 'Archived', assetPath: '/cad-samples/conveyor-drive-ga.svg',
    description: 'Superseded Rev B general arrangement retained for revision comparison.',
  },
  {
    id: 'CAD-2026-012', fileName: 'PIP-033-002_Spool-Support.obj', category: '3D CAD Model',
    projectId: 'PRJ-2026-033', partNumber: 'PIP-033-002', partName: 'Pipe support',
    assemblyId: 'ASM-2026-007', revision: 'A', size: 3_120, uploadedBy: 'P. Deshmukh', uploadedAt: '2026-11-04',
    status: 'Draft', assetPath: '/cad-samples/drive-assembly.obj',
    description: 'Draft support bracket mesh awaiting registration and review.',
  },
];

export const CAD_FILES = FILE_ROWS.map((row) => {
  const ext = extensionOf(row.fileName);
  const design = designForProject(row.projectId);
  const conversion = conversionSummary(row.fileName);
  return {
    ...row,
    fileType: ext.toUpperCase(),
    originalExtension: ext,
    designId: row.designId || design?.id || '',
    designRevision: row.designRevision || design?.revision || '',
    sourceApplication: row.sourceApplication || defaultSourceApplication(row.fileName),
    units: row.units || 'mm',
    scale: row.scale || '1:1',
    coordinateReference: row.coordinateReference || 'Model origin',
    conversionStatus: conversion.status,
    conversionFormat: conversion.format,
    previewNote: conversion.note,
    versionNumber: row.versionNumber || 1,
    previousFileId: row.previousFileId || '',
    supersededBy: row.supersededBy || '',
    uploadedAt: row.uploadedAt,
    uploadHistory: [{ id: `${row.id}-UP`, at: row.uploadedAt, by: row.uploadedBy, action: 'File registered', description: `${row.fileName} added to the CAD repository.` }],
  };
});

/* ------------------------------------------------------------- seed drawings */
function snapshot(config) {
  return {
    revision: config.revision,
    previous: config.previous || '',
    date: config.date,
    by: config.by,
    note: config.note,
    status: config.status,
    meta: {
      title: config.title,
      drawingType: config.drawingType,
      description: config.description,
      format: config.format,
      cadFileIds: config.cadFileIds,
      attachments: (config.attachments || []).map((row) => row.name),
      designId: config.designId || '',
      designRevision: config.designRevision || '',
      scale: config.scale || '',
      units: config.units || '',
      sheetSize: config.sheetSize || '',
      projectionMethod: config.projectionMethod || '',
      materialRef: config.materialRef || '',
      toleranceNotes: config.toleranceNotes || '',
      simulationRef: config.simulationRef || '',
      changeRef: config.changeRef || '',
    },
  };
}

const drawingSeeds = [
  {
    drawingNumber: 'DRG-MEC-041-001', title: 'Conveyor drive assembly — general arrangement', drawingType: 'General Arrangement Drawing',
    projectId: 'PRJ-2026-041', partNumber: 'MEC-041-001', partName: 'Gearbox housing', assemblyId: 'ASM-2026-001',
    revision: 'C', format: 'SVG', preparedBy: 'R. Kulkarni', reviewedBy: 'N. Joshi', drawingDate: '2026-09-16',
    approvalStatus: 'Released', releaseStatus: 'Released', releasedAt: '2026-10-30', releaseRef: 'REL-DRG-2026-001',
    description: 'General arrangement for the conveyor drive assembly, including bearing centres and motor mount interface.',
    cadFileIds: ['CAD-2026-001', 'CAD-2026-002'], bomRef: 'BOM-2026-001', mfgRef: 'MFG-041-001',
    attachments: [
      { name: 'DRG-MEC-041-001_RevC.svg', type: 'SVG', size: 5_946, preview: true, assetPath: '/cad-samples/conveyor-drive-ga.svg' },
      { name: 'DRG-MEC-041-001_Assembly-Sheet.svg', type: 'SVG', size: 4_520, preview: true, assetPath: '/cad-samples/conveyor-drive-ga-s2.svg' },
    ],
    priorRevisions: [
      { revision: 'A', date: '2026-09-16', by: 'R. Kulkarni', note: 'Initial general arrangement issued for review.', status: 'Superseded', title: 'Conveyor drive assembly — initial GA', description: 'Initial layout with housing and shaft only.', format: 'PDF', cadFileIds: ['CAD-2026-001'], attachments: [{ name: 'DRG-MEC-041-001_RevA.pdf' }] },
      { revision: 'B', date: '2026-10-04', by: 'R. Kulkarni', note: 'Added motor mount details and revised bearing centres.', status: 'Superseded', title: 'Conveyor drive assembly — general arrangement', description: 'Added motor mount interface and bearing centre dimensions.', format: 'SVG', cadFileIds: ['CAD-2026-001'], attachments: [{ name: 'DRG-MEC-041-001_RevB.svg' }] },
    ],
  },
  {
    drawingNumber: 'DRG-MEC-041-002', title: 'Gearbox housing — component drawing', drawingType: 'Component Drawing',
    projectId: 'PRJ-2026-041', partNumber: 'MEC-041-001', partName: 'Gearbox housing', assemblyId: 'ASM-2026-001',
    revision: 'B', format: 'SVG', preparedBy: 'D. Rao', reviewedBy: 'A. Iyer', drawingDate: '2026-09-30',
    approvalStatus: 'Approved', releaseStatus: 'Not released',
    description: 'Machined component drawing with bore tolerances, datum scheme and surface finish requirements.',
    cadFileIds: ['CAD-2026-003'], bomRef: 'BOM-2026-001', mfgRef: 'MFG-041-002',
    attachments: [{ name: 'DRG-MEC-041-002_RevB.svg', type: 'SVG', size: 5_946, preview: true, assetPath: '/cad-samples/conveyor-drive-ga.svg' }],
    priorRevisions: [
      { revision: 'A', date: '2026-09-30', by: 'D. Rao', note: 'Initial component drawing released for machining review.', status: 'Superseded', description: 'First issue for machining quotation.', format: 'PDF', cadFileIds: ['CAD-2026-003'], attachments: [{ name: 'DRG-MEC-041-002_RevA.pdf' }] },
    ],
    approvals: [{ id: 'AP-DRW-002-1', reviewer: 'A. Iyer', date: '2026-10-16', decision: 'Approved', comments: 'Tolerances verified against the bearing supplier data.' }],
  },
  {
    drawingNumber: 'DRG-FAB-038-001', title: 'Conveyor base frame — fabrication drawing', drawingType: 'Fabrication Drawing',
    projectId: 'PRJ-2026-038', partNumber: 'FAB-038-001', partName: 'Base frame', assemblyId: 'ASM-2026-005',
    revision: 'B', format: 'SVG', preparedBy: 'K. Pillai', reviewedBy: 'N. Joshi', drawingDate: '2026-09-22',
    approvalStatus: 'Released', releaseStatus: 'Released', releasedAt: '2026-10-28', releaseRef: 'REL-DRG-2026-002',
    description: 'Fabrication drawing for the welded base frame, member sizes, weld symbols and finish notes.',
    cadFileIds: ['CAD-2026-004', 'CAD-2026-005'], bomRef: 'BOM-2026-002', mfgRef: 'MFG-038-001',
    attachments: [{ name: 'DRG-FAB-038-001_RevB.svg', type: 'SVG', size: 3_371, preview: true, assetPath: '/cad-samples/frame-fabrication.svg' }],
    priorRevisions: [
      { revision: 'A', date: '2026-09-22', by: 'K. Pillai', note: 'Initial fabrication drawing for shop review.', status: 'Superseded', title: 'Conveyor base frame — fabrication issue', description: 'Initial member layout without weld details.', format: 'PDF', cadFileIds: ['CAD-2026-004'], attachments: [] },
    ],
    approvals: [{ id: 'AP-DRW-003-1', reviewer: 'N. Joshi', date: '2026-10-18', decision: 'Approved', comments: 'Weld notes and member sizes checked against the structural design.' }],
  },
  {
    drawingNumber: 'DRG-PIP-033-001', title: 'Utility skid piping — general arrangement', drawingType: 'Piping Drawing',
    projectId: 'PRJ-2026-033', partNumber: 'PIP-033-001', partName: 'Pipe spool DN50', assemblyId: 'ASM-2026-007',
    revision: 'A', format: 'PDF', preparedBy: 'P. Deshmukh', reviewedBy: 'S. Menon', drawingDate: '2026-10-30',
    approvalStatus: 'Released', releaseStatus: 'Released', releasedAt: '2026-11-06', releaseRef: 'REL-DRG-2026-003',
    description: 'Piping GA with spool references, support locations and battery-limit notes.',
    cadFileIds: ['CAD-2026-007'], bomRef: 'BOM-2026-004', mfgRef: 'MFG-033-001',
    attachments: [{ name: 'DRG-PIP-033-001_RevA.pdf', type: 'PDF', size: 1_632, preview: true, assetPath: '/cad-samples/utility-skid-ga.pdf' }],
    approvals: [{ id: 'AP-DRW-004-1', reviewer: 'S. Menon', date: '2026-11-02', decision: 'Approved', comments: 'Piping layout and support references verified.' }],
  },
  {
    drawingNumber: 'DRG-SMT-036-001', title: 'Control panel enclosure — sheet metal drawing', drawingType: 'Sheet Metal Drawing',
    projectId: 'PRJ-2026-036', partNumber: 'SMT-036-001', partName: 'Enclosure side panel', assemblyId: 'ASM-2026-006',
    revision: 'A', format: 'PDF', preparedBy: 'V. Sharma', reviewedBy: 'A. Iyer', drawingDate: '2026-10-19',
    approvalStatus: 'Under Review', releaseStatus: 'Not released',
    description: 'Sheet metal flat pattern and bend details for the enclosure side panels.',
    cadFileIds: ['CAD-2026-006'], bomRef: 'BOM-2026-003', mfgRef: 'MFG-036-001',
    attachments: [{ name: 'DRG-SMT-036-001_RevA.pdf', type: 'PDF', size: 684_000, preview: false }],
    approvals: [],
  },
  {
    drawingNumber: 'DRG-MEC-031-051', title: 'Drive shaft — machining drawing', drawingType: 'Machining Drawing',
    projectId: 'PRJ-2026-031', partNumber: 'MEC-041-002', partName: 'Input shaft', assemblyId: 'ASM-2026-002',
    revision: 'B', format: 'PDF', preparedBy: 'D. Rao', reviewedBy: 'N. Joshi', drawingDate: '2026-09-29',
    approvalStatus: 'Changes Requested', releaseStatus: 'Not released',
    description: 'Shaft machining drawing with keyway, journal tolerances and heat-treatment note.',
    cadFileIds: ['CAD-2026-009'], bomRef: 'BOM-2026-005', mfgRef: 'MFG-031-001',
    attachments: [{ name: 'DRG-MEC-031-051_RevB.pdf', type: 'PDF', size: 512_000, preview: false }],
    approvals: [{ id: 'AP-DRW-006-1', reviewer: 'N. Joshi', date: '2026-10-22', decision: 'Changes Requested', comments: 'Add the keyway tolerance and confirm the heat-treatment callout before approval.' }],
  },
  {
    drawingNumber: 'DRG-FAB-024-081', title: 'Hydraulic press frame — assembly drawing', drawingType: 'Assembly Drawing',
    projectId: 'PRJ-2026-024', partNumber: 'FAB-024-081', partName: 'Press frame side plate', assemblyId: '',
    revision: 'A', format: 'DWG', preparedBy: 'A. Iyer', reviewedBy: 'K. Pillai', drawingDate: '2026-11-06',
    approvalStatus: 'Draft', releaseStatus: 'Not released',
    description: 'Press frame assembly drawing received from the design partner in DWG format.',
    cadFileIds: ['CAD-2026-008'], bomRef: 'BOM-2026-008', mfgRef: 'MFG-024-001',
    attachments: [{ name: 'DRG-FAB-024-081_RevA.dwg', type: 'DWG', size: 2_240_000, preview: false }],
    approvals: [],
  },
  {
    drawingNumber: 'DRG-PIP-033-002', title: 'Pipe spool support — installation drawing', drawingType: 'Installation Drawing',
    projectId: 'PRJ-2026-033', partNumber: 'PIP-033-002', partName: 'Pipe support', assemblyId: 'ASM-2026-007',
    revision: 'A', format: 'DXF', preparedBy: 'P. Deshmukh', reviewedBy: 'S. Menon', drawingDate: '2026-10-25',
    approvalStatus: 'Superseded', releaseStatus: 'Superseded',
    description: 'Support installation drawing superseded by the revised skid layout.',
    cadFileIds: [], bomRef: 'BOM-2026-004', mfgRef: 'MFG-033-002',
    attachments: [{ name: 'DRG-PIP-033-002_RevA.dxf', type: 'DXF', size: 420_000, preview: false }],
    priorRevisions: [],
    approvals: [],
  },
  {
    drawingNumber: 'DRG-MEC-029-061', title: 'Motor mount bracket — machining drawing', drawingType: 'Machining Drawing',
    projectId: 'PRJ-2026-029', partNumber: 'MEC-041-006', partName: 'Motor mount bracket', assemblyId: '',
    revision: 'A', format: 'DWG', preparedBy: 'N. Joshi', reviewedBy: 'A. Iyer', drawingDate: '2026-09-18',
    approvalStatus: 'Withdrawn', releaseStatus: 'Not released',
    description: 'Withdrawn after the bracket design was superseded by a welded fabrication.',
    cadFileIds: [], bomRef: 'BOM-2026-006', mfgRef: 'MFG-029-001',
    attachments: [{ name: 'DRG-MEC-029-061_RevA.dwg', type: 'DWG', size: 624_000, preview: false }],
    approvals: [],
  },
  {
    drawingNumber: 'DRG-ASM-026-071', title: 'Gearbox lubrication unit — assembly drawing', drawingType: 'Assembly Drawing',
    projectId: 'PRJ-2026-026', partNumber: 'FAB-026-072', partName: 'Oil reservoir 20 L', assemblyId: '',
    revision: 'A', format: 'PDF', preparedBy: 'S. Menon', reviewedBy: 'N. Joshi', drawingDate: '2026-10-30',
    approvalStatus: 'Submitted', releaseStatus: 'Not released',
    description: 'Lubrication unit assembly drawing submitted for engineering review.',
    cadFileIds: [], bomRef: 'BOM-2026-007', mfgRef: 'MFG-026-001',
    attachments: [{ name: 'DRG-ASM-026-071_RevA.pdf', type: 'PDF', size: 910_000, preview: false }],
    approvals: [],
  },
];

let drawingCounter = 0;
export const DRAWINGS = drawingSeeds.map((seed) => {
  drawingCounter += 1;
  const id = `DRW-2026-${String(drawingCounter).padStart(3, '0')}`;
  const currentSnapshot = snapshot({
    revision: seed.revision,
    previous: seed.priorRevisions?.at(-1)?.revision || '',
    date: seed.drawingDate,
    by: seed.preparedBy,
    note: seed.priorRevisions?.[0] ? 'Current controlled revision.' : 'Initial drawing issue.',
    status: seed.approvalStatus,
    title: seed.title,
    drawingType: seed.drawingType,
    description: seed.description,
    format: seed.format,
    cadFileIds: seed.cadFileIds,
    attachments: seed.attachments,
    designId: seed.designId || designForProject(seed.projectId)?.id || '',
    designRevision: seed.designRevision || designForProject(seed.projectId)?.revision || '',
    scale: seed.scale || '1:1',
    units: seed.units || 'mm',
    sheetSize: seed.sheetSize || 'A3',
    projectionMethod: seed.projectionMethod || 'First angle',
    materialRef: seed.materialRef || '',
    toleranceNotes: seed.toleranceNotes || '',
    simulationRef: seed.simulationRef || '',
    changeRef: seed.changeRef || '',
  });
  const revisions = [
    ...(seed.priorRevisions || []).map((row) =>
      snapshot({ drawingType: seed.drawingType, title: seed.title, ...row }),
    ),
    currentSnapshot,
  ];
  return {
    id,
    drawingNumber: seed.drawingNumber,
    title: seed.title,
    drawingType: seed.drawingType,
    projectId: seed.projectId,
    partNumber: seed.partNumber,
    partName: seed.partName,
    assemblyId: seed.assemblyId,
    revision: seed.revision,
    format: seed.format,
    designId: seed.designId || designForProject(seed.projectId)?.id || '',
    designRevision: seed.designRevision || designForProject(seed.projectId)?.revision || '',
    scale: seed.scale || '1:1',
    units: seed.units || 'mm',
    sheetSize: seed.sheetSize || 'A3',
    projectionMethod: seed.projectionMethod || 'First angle',
    materialRef: seed.materialRef || '',
    toleranceNotes: seed.toleranceNotes || '',
    simulationRef: seed.simulationRef || '',
    changeRef: seed.changeRef || '',
    preparedBy: seed.preparedBy,
    reviewedBy: seed.reviewedBy,
    drawingDate: seed.drawingDate,
    approvalStatus: seed.approvalStatus,
    releaseStatus: seed.releaseStatus,
    releasedAt: seed.releasedAt || '',
    releaseRef: seed.releaseRef || '',
    description: seed.description,
    cadFileIds: seed.cadFileIds,
    bomRef: seed.bomRef,
    mfgRef: seed.mfgRef,
    attachments: seed.attachments,
    revisions,
    approvals: seed.approvals || [],
    statusHistory: [{ id: `${id}-SH1`, status: seed.approvalStatus, at: seed.drawingDate, by: seed.preparedBy, note: 'Drawing record created.' }],
    changeHistory: [
      { id: `${id}-CH1`, at: seed.drawingDate, by: seed.preparedBy, action: 'Drawing created', description: `${seed.drawingNumber} registered at Rev ${seed.revision}.` },
      ...(seed.priorRevisions || []).map((row, index) => ({ id: `${id}-CH${index + 2}`, at: row.date, by: row.by, action: 'Revision created', description: `Rev ${row.revision}: ${row.note}` })),
    ],
  };
});

/* ------------------------------------------------------------ transmittals */
export const TRANSMITTALS = [
  { id: 'TRN-2026-001', projectId: 'PRJ-2026-041', drawingId: 'DRW-2026-001', recipient: 'Purchase — Sourcing cell', purpose: 'For procurement of drive components', issueDate: '2026-10-31', preparedBy: 'R. Kulkarni', status: 'Acknowledged', remarks: 'Controlled copy issued for material and bought-out procurement (simulated).' },
  { id: 'TRN-2026-002', projectId: 'PRJ-2026-041', drawingId: 'DRW-2026-001', recipient: 'Production — Assembly bay', purpose: 'For manufacturing and assembly', issueDate: '2026-10-31', preparedBy: 'R. Kulkarni', status: 'Issued', remarks: 'Assembly drawing issued to production (simulated).' },
  { id: 'TRN-2026-003', projectId: 'PRJ-2026-038', drawingId: 'DRW-2026-003', recipient: 'Fabrication vendor — Shakti Fab', purpose: 'For fabrication quotation', issueDate: '2026-10-20', preparedBy: 'K. Pillai', status: 'Issued', remarks: 'Fabrication drawing issued for quotation only.' },
  { id: 'TRN-2026-004', projectId: 'PRJ-2026-033', drawingId: 'DRW-2026-004', recipient: 'Production — Piping crew', purpose: 'For installation', issueDate: '2026-11-06', preparedBy: 'P. Deshmukh', status: 'Acknowledged', remarks: 'Piping GA acknowledged by the installation team.' },
  { id: 'TRN-2026-005', projectId: 'PRJ-2026-038', drawingId: 'DRW-2026-003', recipient: 'Quality — Incoming inspection', purpose: 'For inspection reference', issueDate: '2026-10-29', preparedBy: 'K. Pillai', status: 'Prepared', remarks: 'Prepared but not yet issued.' },
  { id: 'TRN-2026-006', projectId: 'PRJ-2026-036', drawingId: 'DRW-2026-005', recipient: 'Purchase — Sheet metal', purpose: 'For vendor feasibility review', issueDate: '2026-10-21', preparedBy: 'V. Sharma', status: 'Rejected', remarks: 'Rejected: drawing is still under review and not approved for issue.' },
];

/* --------------------------------------------------------------- handovers */
export const HANDOVERS = [
  { id: 'HND-2026-001', destination: 'Purchase', projectId: 'PRJ-2026-041', drawingId: 'DRW-2026-001', revision: 'C', bomRef: 'BOM-2026-001', purpose: 'Procurement of drive components and bearing set', date: '2026-10-31', status: 'Acknowledged', remarks: 'Simulated purchase handover reference.' },
  { id: 'HND-2026-002', destination: 'Production', projectId: 'PRJ-2026-041', drawingId: 'DRW-2026-001', revision: 'C', partOrAssembly: 'ASM-2026-001 · Conveyor drive assembly', mfgRef: 'MFG-041-001', bomRef: 'BOM-2026-001', date: '2026-10-31', status: 'Submitted', remarks: 'Simulated production handover reference.' },
  { id: 'HND-2026-003', destination: 'Production', projectId: 'PRJ-2026-038', drawingId: 'DRW-2026-003', revision: 'B', partOrAssembly: 'FAB-038-001 · Base frame', mfgRef: 'MFG-038-001', bomRef: 'BOM-2026-002', date: '2026-10-28', status: 'Acknowledged', remarks: 'Fabrication package acknowledged (simulated).' },
  { id: 'HND-2026-004', destination: 'Purchase', projectId: 'PRJ-2026-033', drawingId: 'DRW-2026-004', revision: 'A', bomRef: 'BOM-2026-004', purpose: 'Pipe, valves and support procurement', date: '2026-11-06', status: 'Ready', remarks: 'Ready for simulated purchase acknowledgement.' },
  { id: 'HND-2026-005', destination: 'Production', projectId: 'PRJ-2026-033', drawingId: 'DRW-2026-004', revision: 'A', partOrAssembly: 'ASM-2026-007 · Utility skid piping', mfgRef: 'MFG-033-001', bomRef: 'BOM-2026-004', date: '2026-11-06', status: 'Rejected', remarks: 'Mock rejection: installation supervisor requested a larger print.' },
];

export const FILE_SAMPLE_LIBRARY = [
  { label: 'Demonstration vector drawing', path: '/cad-samples/conveyor-drive-ga.svg' },
  { label: 'Demonstration assembly mesh (OBJ)', path: '/cad-samples/drive-assembly.obj' },
  { label: 'Demonstration part mesh (STL)', path: '/cad-samples/gearbox-housing.stl' },
  { label: 'Demonstration PDF drawing', path: '/cad-samples/utility-skid-ga.pdf' },
];
