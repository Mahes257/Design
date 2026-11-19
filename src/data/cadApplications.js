import { extensionOf } from './cadData';

/**
 * CAD and 2D drawing applications, and which file formats each can read.
 *
 * Two separate concerns live here:
 *
 *  1. FORMATS — which applications can read each CAD / drawing extension, and
 *     whether the format is that application's own format (`native`), something
 *     it can `import`, or something it can only `view`. This is engineering
 *     reference data, not an installation claim.
 *  2. PROTOCOLS — the few vendors that publicly document a URL protocol handler
 *     a web page may use to hand a file to the installed program. Only
 *     documented handlers are listed. Nothing here is guessed or invented, and
 *     an unlisted scheme must never be added "because it probably exists".
 *
 * A browser cannot enumerate installed Windows applications, so nothing in this
 * file is ever used to report an application as installed. Installation status
 * comes only from the optional local CAD bridge (see src/data/cadLaunch.js).
 *
 * SolidWorks and eDrawings are deliberately separate entries: eDrawings is a
 * viewer published by Dassault Systèmes, not an alias for SolidWorks, and one is
 * never substituted for the other.
 */

/* --- documented vendor protocol handlers -------------------------------- */
const PROTOCOLS = {
  fusion360: {
    scheme: 'fusion360',
    vendor: 'Autodesk',
    documentation:
      'https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/OpeningFilesFromWebPage_UM.htm',
    summary:
      'Autodesk documents a Fusion protocol handler that opens a file when a web page links to it. The documented form is fusion360://host/?command=open&file=<encoded local path or remote URL>. It exists only when Fusion is installed and registers the handler.',
    // Documented to accept either a local path or a remote file URL.
    acceptsUrl: true,
    buildUrl: ({ fileUrl }) => `fusion360://host/?command=open&file=${encodeURIComponent(fileUrl)}`,
  },
};

/* --- application catalogue ---------------------------------------------- */
/**
 * `kind` only selects the card icon. `protocol` is present only where the vendor
 * documents a URL handler; every other application can only be started through
 * the optional local CAD bridge, which is the only mechanism that can report or
 * launch an installed Windows program.
 */
const APPLICATIONS = {
  autocad: { name: 'AutoCAD', publisher: 'Autodesk', discipline: '3D CAD + 2D drawing', kind: 'cad2d' },
  autocadlt: { name: 'AutoCAD LT', publisher: 'Autodesk', discipline: '2D drawing', kind: 'cad2d' },
  bricscad: { name: 'BricsCAD', publisher: 'Bricsys', discipline: '3D CAD + 2D drawing', kind: 'cad2d' },
  draftsight: { name: 'DraftSight', publisher: 'Dassault Systèmes', discipline: '2D drawing', kind: 'cad2d' },
  zwcad: { name: 'ZWCAD', publisher: 'ZWSOFT', discipline: '2D drawing', kind: 'cad2d' },
  librecad: { name: 'LibreCAD', publisher: 'Open source', discipline: '2D drawing', kind: 'cad2d' },
  qcad: { name: 'QCAD', publisher: 'RibbonSoft', discipline: '2D drawing', kind: 'cad2d' },
  microstation: { name: 'MicroStation', publisher: 'Bentley Systems', discipline: '3D CAD + 2D drawing', kind: 'cad3d' },

  solidworks: { name: 'SolidWorks', publisher: 'Dassault Systèmes', discipline: '3D CAD', kind: 'cad3d' },
  edrawings: {
    name: 'eDrawings',
    publisher: 'Dassault Systèmes',
    discipline: '3D CAD + 2D drawing viewer',
    kind: 'viewer',
  },
  inventor: { name: 'Autodesk Inventor', publisher: 'Autodesk', discipline: '3D CAD', kind: 'cad3d' },
  solidedge: { name: 'Solid Edge', publisher: 'Siemens', discipline: '3D CAD', kind: 'cad3d' },
  solidedge2d: { name: 'Solid Edge 2D Drafting', publisher: 'Siemens', discipline: '2D drawing', kind: 'cad2d' },
  catia: { name: 'CATIA', publisher: 'Dassault Systèmes', discipline: '3D CAD', kind: 'cad3d' },
  threeDexperience: { name: '3DEXPERIENCE', publisher: 'Dassault Systèmes', discipline: '3D CAD', kind: 'cad3d' },
  creo: { name: 'Creo Parametric', publisher: 'PTC', discipline: '3D CAD', kind: 'cad3d' },
  nx: { name: 'Siemens NX', publisher: 'Siemens', discipline: '3D CAD', kind: 'cad3d' },
  fusion: {
    name: 'Autodesk Fusion',
    publisher: 'Autodesk',
    discipline: '3D CAD + 2D drawing',
    kind: 'cad3d',
    protocol: 'fusion360',
  },
  freecad: { name: 'FreeCAD', publisher: 'Open source', discipline: '3D CAD + 2D drawing', kind: 'cad3d' },
  rhino: { name: 'Rhino', publisher: 'Robert McNeel & Associates', discipline: '3D CAD', kind: 'cad3d' },
  blender: { name: 'Blender', publisher: 'Blender Foundation', discipline: '3D mesh', kind: 'mesh' },
  meshlab: { name: 'MeshLab', publisher: 'CNR-ISTI', discipline: '3D mesh', kind: 'mesh' },
  '3dbuilder': { name: 'Microsoft 3D Builder', publisher: 'Microsoft', discipline: '3D mesh', kind: 'mesh' },

  inkscape: { name: 'Inkscape', publisher: 'Open source', discipline: '2D vector drawing', kind: 'vector' },
  illustrator: { name: 'Adobe Illustrator', publisher: 'Adobe', discipline: '2D vector drawing', kind: 'vector' },
  coreldraw: { name: 'CorelDRAW', publisher: 'Alludo', discipline: '2D vector drawing', kind: 'vector' },

  acrobat: { name: 'Adobe Acrobat', publisher: 'Adobe', discipline: 'PDF', kind: 'pdf' },
  bluebeam: { name: 'Bluebeam Revu', publisher: 'Bluebeam', discipline: 'PDF', kind: 'pdf' },
  foxit: { name: 'Foxit PDF Editor', publisher: 'Foxit', discipline: 'PDF', kind: 'pdf' },

  prusaslicer: { name: 'PrusaSlicer', publisher: 'Prusa Research', discipline: '3D printing', kind: 'mesh' },
  bambustudio: { name: 'Bambu Studio', publisher: 'Bambu Lab', discipline: '3D printing', kind: 'mesh' },
};

/* --- extension → applications ------------------------------------------- */
/**
 * Ordered pairs of [applicationId, role]. `native` is listed first so the UI can
 * present "opens this format natively" separately from "can import it".
 *
 * `view` is used for viewer applications whose documented purpose is reading
 * another system's file (eDrawings opens SOLIDWORKS, neutral and interchange
 * formats for review). It never means "writes this format".
 */
const FORMATS = {
  /* 2D CAD drawings */
  dwg: [
    ['autocad', 'native'],
    ['autocadlt', 'native'],
    ['bricscad', 'native'],
    ['draftsight', 'native'],
    ['zwcad', 'native'],
    ['edrawings', 'view'],
    ['solidworks', 'import'],
    ['fusion', 'import'],
    ['freecad', 'import'],
  ],
  dxf: [
    ['autocad', 'native'],
    ['autocadlt', 'native'],
    ['bricscad', 'native'],
    ['draftsight', 'native'],
    ['librecad', 'native'],
    ['qcad', 'native'],
    ['zwcad', 'native'],
    ['solidedge2d', 'native'],
    ['edrawings', 'view'],
    ['freecad', 'import'],
    ['solidworks', 'import'],
    ['inkscape', 'import'],
    ['illustrator', 'import'],
    ['coreldraw', 'import'],
  ],
  dgn: [
    ['microstation', 'native'],
    ['bricscad', 'import'],
    ['autocad', 'import'],
  ],

  /* 3D native CAD */
  sldprt: [
    ['solidworks', 'native'],
    ['edrawings', 'view'],
  ],
  sldasm: [
    ['solidworks', 'native'],
    ['edrawings', 'view'],
  ],
  slddrw: [
    ['solidworks', 'native'],
    ['edrawings', 'view'],
  ],
  eprt: [['edrawings', 'native']],
  easm: [['edrawings', 'native']],
  edrw: [['edrawings', 'native']],
  ipt: [
    ['inventor', 'native'],
    ['edrawings', 'view'],
    ['fusion', 'import'],
  ],
  iam: [
    ['inventor', 'native'],
    ['edrawings', 'view'],
    ['fusion', 'import'],
  ],
  idw: [['inventor', 'native']],
  catpart: [
    ['catia', 'native'],
    ['threeDexperience', 'native'],
    ['edrawings', 'view'],
  ],
  catproduct: [
    ['catia', 'native'],
    ['threeDexperience', 'native'],
    ['edrawings', 'view'],
  ],
  prt: [
    ['creo', 'native'],
    ['nx', 'native'],
    ['edrawings', 'view'],
  ],
  asm: [
    ['creo', 'native'],
    ['edrawings', 'view'],
  ],
  f3d: [['fusion', 'native']],

  /* neutral 3D exchange */
  step: [
    ['solidworks', 'import'],
    ['inventor', 'import'],
    ['solidedge', 'import'],
    ['catia', 'import'],
    ['fusion', 'import'],
    ['freecad', 'import'],
    ['creo', 'import'],
    ['nx', 'import'],
    ['rhino', 'import'],
    ['edrawings', 'view'],
  ],
  stp: [
    ['solidworks', 'import'],
    ['inventor', 'import'],
    ['solidedge', 'import'],
    ['catia', 'import'],
    ['fusion', 'import'],
    ['freecad', 'import'],
    ['creo', 'import'],
    ['nx', 'import'],
    ['rhino', 'import'],
    ['edrawings', 'view'],
  ],
  iges: [
    ['solidworks', 'import'],
    ['inventor', 'import'],
    ['solidedge', 'import'],
    ['catia', 'import'],
    ['fusion', 'import'],
    ['freecad', 'import'],
    ['creo', 'import'],
    ['nx', 'import'],
    ['rhino', 'import'],
    ['edrawings', 'view'],
  ],
  igs: [
    ['solidworks', 'import'],
    ['inventor', 'import'],
    ['solidedge', 'import'],
    ['catia', 'import'],
    ['fusion', 'import'],
    ['freecad', 'import'],
    ['creo', 'import'],
    ['nx', 'import'],
    ['rhino', 'import'],
    ['edrawings', 'view'],
  ],
  stl: [
    ['solidworks', 'import'],
    ['inventor', 'import'],
    ['fusion', 'import'],
    ['freecad', 'import'],
    ['catia', 'import'],
    ['blender', 'import'],
    ['rhino', 'import'],
    ['prusaslicer', 'import'],
    ['bambustudio', 'import'],
    ['3dbuilder', 'import'],
    ['edrawings', 'view'],
  ],
  obj: [
    ['fusion', 'import'],
    ['freecad', 'import'],
    ['blender', 'import'],
    ['rhino', 'import'],
    ['meshlab', 'import'],
    ['edrawings', 'view'],
  ],
  ply: [
    ['blender', 'import'],
    ['freecad', 'import'],
    ['meshlab', 'import'],
  ],
  '3mf': [
    ['prusaslicer', 'import'],
    ['bambustudio', 'import'],
    ['3dbuilder', 'import'],
    ['fusion', 'import'],
  ],
  gltf: [['blender', 'import']],
  glb: [['blender', 'import']],

  /* 2D vector drawings and documents */
  svg: [
    ['inkscape', 'native'],
    ['illustrator', 'native'],
    ['coreldraw', 'import'],
    ['freecad', 'import'],
    ['fusion', 'import'],
  ],
  ai: [
    ['illustrator', 'native'],
    ['coreldraw', 'import'],
    ['inkscape', 'import'],
  ],
  cdr: [
    ['coreldraw', 'native'],
    ['inkscape', 'import'],
  ],
  pdf: [
    ['acrobat', 'native'],
    ['bluebeam', 'native'],
    ['foxit', 'native'],
    ['illustrator', 'import'],
    ['coreldraw', 'import'],
    ['inkscape', 'import'],
    ['autocad', 'import'],
  ],
};

const ROLE_LABELS = {
  native: 'Native format',
  import: 'Import',
  view: 'Preview only',
};

const ROLE_ORDER = { native: 0, import: 1, view: 2 };

/** Formats that CAD or drawing software opens, keyed by lowercase extension. */
export const CAD_SOFTWARE_EXTENSIONS = Object.keys(FORMATS);

/** Every application id the ERP may hand to a launch mechanism. */
export const APPROVED_CAD_APPLICATION_IDS = Object.freeze(Object.keys(APPLICATIONS));

export function approvedCadApplicationIds() {
  return APPROVED_CAD_APPLICATION_IDS;
}

export function isApprovedCadApplication(applicationId = '') {
  return APPROVED_CAD_APPLICATION_IDS.includes(String(applicationId));
}

/**
 * Applications that can read a file name's extension.
 *
 * Returns reference data only: `installed` is deliberately absent. Installation
 * is reported exclusively by the optional local CAD bridge.
 */
export function compatibleCadApplications(fileName = '') {
  const extension = extensionOf(fileName);
  const apps = (FORMATS[extension] || [])
    .map(([id, role]) => {
      const application = APPLICATIONS[id];
      const protocol = application.protocol ? PROTOCOLS[application.protocol] : null;
      return {
        id,
        name: application.name,
        publisher: application.publisher,
        discipline: application.discipline,
        kind: application.kind,
        role,
        roleLabel: ROLE_LABELS[role] || role,
        protocol,
      };
    })
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  return {
    extension,
    apps,
    nativeApps: apps.filter((app) => app.role === 'native'),
    importApps: apps.filter((app) => app.role === 'import'),
    viewApps: apps.filter((app) => app.role === 'view'),
    protocolApps: apps.filter((app) => Boolean(app.protocol)),
    hasCompatibleApplication: apps.length > 0,
    roleLabel: (role) => ROLE_LABELS[role] || role,
  };
}

/**
 * Build a documented protocol URL for an application, or null when the vendor
 * documents no handler / the browser-side file reference cannot be addressed by
 * an external program.
 */
export function protocolUrlFor(app, { fileUrl } = {}) {
  const protocol = app?.protocol;
  if (!protocol) return null;
  if (protocol.acceptsUrl && !fileUrl) return null;
  return protocol.buildUrl({ fileUrl });
}

export function isCadSoftwareFormat(fileName = '') {
  return CAD_SOFTWARE_EXTENSIONS.includes(extensionOf(fileName));
}

export { ROLE_LABELS };
