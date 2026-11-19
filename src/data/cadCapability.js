/**
 * Module 06 / Module 10 CAD format capability registry.
 *
 * Every format is classified by what this frontend build can genuinely do with
 * it. "Direct Rendering" means an actual parser/loader runs in the browser and
 * the geometry/drawing is rendered. "Converted Rendering" means a converted
 * preview has been attached to the record and is rendered instead of the
 * original. "Requires External Conversion" means no browser-side parser exists
 * in this build and the original is stored/downloadable only.
 *
 * No format is listed as direct merely because its extension is accepted.
 */
function extensionOf(name = '') {
  const value = String(name);
  const index = value.lastIndexOf('.');
  return index >= 0 ? value.slice(index + 1).toLowerCase() : '';
}

export const CAPABILITY_STATUS = {
  direct: { key: 'direct', label: 'Direct Rendering', tone: 'emerald' },
  converted: { key: 'converted', label: 'Converted Rendering', tone: 'blue' },
  external: { key: 'external', label: 'Requires External Conversion', tone: 'amber' },
  unsupported: { key: 'unsupported', label: 'Unsupported', tone: 'red' },
};

const DIRECT_3D = 'Three.js mesh loader (bundled)';
const OCCT = 'OpenCascade WASM tessellation (occt-import-js)';

function record({ mode, status, label, reason, kind = 'none', renderer = '' }) {
  return {
    mode,
    status,
    kind,
    label,
    reason,
    renderer,
    supported: status === 'direct' || status === 'converted',
    tested: false,
  };
}

const EXTERNAL_NATIVE = (name, extra = '') =>
  record({
    mode: 'none',
    status: 'external',
    kind: '3d',
    label: `${name} · external conversion required`,
    reason: `Browsers have no parser for ${name} geometry. Preserve the original and attach a converted GLB/glTF or STEP preview, generated in ${name} or by an external converter.${extra ? ` ${extra}` : ''}`,
    renderer: 'No browser parser bundled',
  });

const EXTERNAL_2D = (name) =>
  record({
    mode: 'none',
    status: 'external',
    kind: '2d',
    label: `${name} · external conversion required`,
    reason: `${name} needs a licensed CAD engine/converter. Attach a converted PDF, SVG or DXF preview alongside the original.`,
    renderer: 'No browser parser bundled',
  });

const FORMATS = {
  /* --- neutral 3D exchange formats --------------------------------------- */
  step: record({
    mode: '3d-step',
    status: 'direct',
    kind: '3d',
    label: 'STEP · OpenCascade WASM',
    reason: 'STEP is tessellated in the browser by OpenCascade (occt-import-js) and rendered with Three.js.',
    renderer: OCCT,
  }),
  stp: record({
    mode: '3d-step',
    status: 'direct',
    kind: '3d',
    label: 'STEP · OpenCascade WASM',
    reason: 'STEP is tessellated in the browser by OpenCascade (occt-import-js) and rendered with Three.js.',
    renderer: OCCT,
  }),
  iges: record({
    mode: '3d-iges',
    status: 'direct',
    kind: '3d',
    label: 'IGES · OpenCascade WASM',
    reason: 'IGES is tessellated in the browser by OpenCascade (occt-import-js) and rendered with Three.js.',
    renderer: OCCT,
  }),
  igs: record({
    mode: '3d-iges',
    status: 'direct',
    kind: '3d',
    label: 'IGES · OpenCascade WASM',
    reason: 'IGES is tessellated in the browser by OpenCascade (occt-import-js) and rendered with Three.js.',
    renderer: OCCT,
  }),
  brep: record({
    mode: '3d-brep',
    status: 'direct',
    kind: '3d',
    label: 'BREP · OpenCascade WASM',
    reason: 'OpenCascade BREP is tessellated in the browser by occt-import-js.',
    renderer: OCCT,
  }),
  stl: record({
    mode: '3d',
    status: 'direct',
    kind: '3d',
    label: 'STL · Three.js',
    reason: 'Three.js parses the mesh directly in the browser.',
    renderer: DIRECT_3D,
  }),
  obj: record({
    mode: '3d',
    status: 'direct',
    kind: '3d',
    label: 'OBJ · Three.js',
    reason: 'Three.js parses the OBJ mesh directly in the browser.',
    renderer: DIRECT_3D,
  }),
  gltf: record({
    mode: '3d',
    status: 'direct',
    kind: '3d',
    label: 'glTF · Three.js',
    reason: 'Three.js GLTFLoader renders the scene graph, meshes and component names.',
    renderer: DIRECT_3D,
  }),
  glb: record({
    mode: '3d',
    status: 'direct',
    kind: '3d',
    label: 'GLB · Three.js',
    reason: 'Three.js GLTFLoader renders the binary glTF scene graph.',
    renderer: DIRECT_3D,
  }),
  ply: record({
    mode: '3d',
    status: 'direct',
    kind: '3d',
    label: 'PLY · Three.js',
    reason: 'Three.js PLYLoader parses the mesh in the browser.',
    renderer: DIRECT_3D,
  }),
  fbx: record({
    mode: 'none',
    status: 'unsupported',
    kind: '3d',
    label: 'FBX · not verified',
    reason: 'The bundled FBX loader failed on the available test sample, so FBX is not claimed as supported. Store and download only.',
    renderer: null,
  }),
  '3mf': record({
    mode: '3d-3mf',
    status: 'direct',
    kind: '3d',
    label: '3MF · Three.js',
    reason: 'Three.js 3MFLoader parses the 3MF package and renders its build items.',
    renderer: DIRECT_3D,
  }),
  x_t: EXTERNAL_NATIVE('Parasolid'),
  x_b: EXTERNAL_NATIVE('Parasolid'),
  sat: EXTERNAL_NATIVE('ACIS'),
  sab: EXTERNAL_NATIVE('ACIS'),
  jt: EXTERNAL_NATIVE('JT'),

  /* --- native mechanical CAD ------------------------------------------- */
  sldprt: EXTERNAL_NATIVE('SolidWorks part'),
  sldasm: EXTERNAL_NATIVE('SolidWorks assembly'),
  slddrw: record({
    mode: 'none',
    status: 'external',
    kind: '2d',
    label: 'SolidWorks drawing · external conversion required',
    reason:
      'SolidWorks drawing files cannot be parsed by a browser library. Export a PDF or DXF from SolidWorks and attach it as the preview.',
    renderer: 'No browser parser bundled',
  }),
  catpart: EXTERNAL_NATIVE('CATIA part'),
  catproduct: EXTERNAL_NATIVE('CATIA product'),
  catdrawing: EXTERNAL_2D('CATIA drawing'),
  prt: EXTERNAL_NATIVE('Creo / Siemens NX part', 'Creo and NX share the .prt extension.'),
  asm: EXTERNAL_NATIVE('Creo assembly'),
  ipt: EXTERNAL_NATIVE('Inventor part'),
  iam: EXTERNAL_NATIVE('Inventor assembly'),
  idw: EXTERNAL_2D('Inventor drawing'),
  ipn: EXTERNAL_NATIVE('Inventor presentation'),
  f3d: EXTERNAL_NATIVE('Fusion 360 design'),
  f3z: EXTERNAL_NATIVE('Fusion 360 archive'),

  /* --- 2D drawings and documents --------------------------------------- */
  dxf: record({
    mode: '2d-dxf',
    status: 'direct',
    kind: '2d',
    label: 'DXF · parsed vector',
    reason: 'DXF entities are parsed in the browser and rendered as SVG geometry with zoom/pan.',
    renderer: 'dxf-parser (MIT) + SVG',
  }),
  dwg: EXTERNAL_2D('DWG'),
  dgn: EXTERNAL_2D('DGN'),
  pdf: record({
    mode: '2d-pdf',
    status: 'direct',
    kind: '2d',
    label: 'PDF · browser PDF engine',
    reason: 'The browser PDF engine displays pages; page navigation and zoom are handled by that engine.',
    renderer: 'Browser PDF engine',
  }),
  svg: record({
    mode: '2d-svg',
    status: 'direct',
    kind: '2d',
    label: 'SVG · interactive vector',
    reason: 'SVG is parsed and rendered as vectors with zoom, pan and layer visibility.',
    renderer: 'SVG DOM',
  }),
  png: record({
    mode: '2d-image',
    status: 'direct',
    kind: '2d',
    label: 'PNG · browser image',
    reason: 'The browser decodes the image; zoom and pan are available in the viewer.',
    renderer: 'Browser image decoder',
  }),
  jpg: record({
    mode: '2d-image',
    status: 'direct',
    kind: '2d',
    label: 'JPG · browser image',
    reason: 'The browser decodes the image; zoom and pan are available in the viewer.',
    renderer: 'Browser image decoder',
  }),
  jpeg: record({
    mode: '2d-image',
    status: 'direct',
    kind: '2d',
    label: 'JPEG · browser image',
    reason: 'The browser decodes the image; zoom and pan are available in the viewer.',
    renderer: 'Browser image decoder',
  }),
  webp: record({
    mode: '2d-image',
    status: 'direct',
    kind: '2d',
    label: 'WEBP · browser image',
    reason: 'The browser decodes the image; zoom and pan are available in the viewer.',
    renderer: 'Browser image decoder',
  }),
  bmp: record({
    mode: '2d-image',
    status: 'direct',
    kind: '2d',
    label: 'BMP · browser image',
    reason: 'The browser decodes the image; zoom and pan are available in the viewer.',
    renderer: 'Browser image decoder',
  }),
  gif: record({
    mode: '2d-image',
    status: 'direct',
    kind: '2d',
    label: 'GIF · browser image',
    reason: 'The browser decodes the image; zoom and pan are available in the viewer.',
    renderer: 'Browser image decoder',
  }),

  /* --- general documents ------------------------------------------------ */
  xlsx: EXTERNAL_2D('Spreadsheet'),
  xls: EXTERNAL_2D('Spreadsheet'),
  docx: EXTERNAL_2D('Word document'),
  doc: EXTERNAL_2D('Word document'),
  zip: EXTERNAL_2D('Archive'),
};

const VERIFIED_FORMATS = new Set(['step', 'stp', 'iges', 'igs', 'brep', 'stl', 'obj', 'gltf', 'glb', 'ply', '3mf', 'dxf', 'pdf', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif']);
Object.entries(FORMATS).forEach(([ext, capability]) => {
  capability.tested = VERIFIED_FORMATS.has(ext);
});

const UNKNOWN = record({
  mode: 'none',
  status: 'unsupported',
  kind: 'none',
  label: 'Unknown format',
  reason: 'No verified browser-side renderer is available for this file type in this build.',
  renderer: '',
});

/** Capability for a file name or extension. */
export function cadCapability(fileName = '') {
  const ext = String(fileName).includes('.') ? extensionOf(fileName) : String(fileName).toLowerCase();
  return FORMATS[ext] || UNKNOWN;
}

export function isRenderable(fileName) {
  return cadCapability(fileName).supported;
}

export function isThreeD(fileName) {
  return cadCapability(fileName).kind === '3d';
}

/** Formats offered in the upload picker, grouped for the UI. */
export const ACCEPTED_CAD_EXTENSIONS = Object.keys(FORMATS)
  .map((ext) => `.${ext}`)
  .join(',');

/** Human-readable registry rows for the capability panel. */
export const CAPABILITY_GROUPS = [
  {
    key: 'neutral3d',
    title: 'Neutral 3D exchange formats',
    formats: ['step', 'stp', 'iges', 'igs', 'stl', 'obj', 'gltf', 'glb', 'ply', 'fbx', '3mf', 'x_t', 'x_b', 'sat', 'sab', 'jt'],
  },
  {
    key: 'native3d',
    title: 'Native mechanical CAD',
    formats: ['sldprt', 'sldasm', 'catpart', 'catproduct', 'prt', 'asm', 'ipt', 'iam', 'ipn', 'f3d', 'f3z'],
  },
  {
    key: 'drawings',
    title: '2D drawings and documents',
    formats: ['dxf', 'dwg', 'dgn', 'pdf', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'slddrw', 'catdrawing', 'idw'],
  },
];

export function capabilityRows() {
  return CAPABILITY_GROUPS.map((group) => ({
    ...group,
    rows: group.formats.map((ext) => ({ ext: ext.toUpperCase(), ...cadCapability(`file.${ext}`) })),
  }));
}
