/**
 * Allowlisted application catalogue for the local Windows CAD bridge.
 *
 * The bridge is a separate trust boundary from the ERP frontend, so it keeps its
 * own allowlist instead of importing the browser catalogue. An application can
 * only ever be launched through the id + executable pair resolved here, and only
 * for the extensions listed for it.
 *
 * Nothing here invents an executable path: `executables` are the real Windows
 * program file names, and the actual full path is resolved at runtime from the
 * registry (App Paths, HKCR\Applications, uninstall InstallLocation). If the
 * registry has no entry, the application is reported as not detected rather than
 * guessed from a hard-coded folder.
 *
 * Applications whose executable name is not certain (for example Siemens NX or
 * Creo variants) are intentionally absent. Add them only with a verified name.
 */

export const BRIDGE_SERVICE = 'mechanical-design-cad-bridge';
export const BRIDGE_VERSION = '1.2.0';

export const BRIDGE_APPLICATIONS = [
  {
    id: 'solidworks',
    name: 'SolidWorks',
    publisher: 'Dassault Systèmes',
    executables: ['SLDWORKS.exe'],
    productMatch: /solidworks(?!.*edrawings)/i,
    extensions: ['sldprt', 'sldasm', 'slddrw', 'step', 'stp', 'iges', 'igs', 'stl', 'dxf', 'dwg', 'x_t', 'x_b'],
  },
  {
    id: 'edrawings',
    name: 'eDrawings',
    publisher: 'Dassault Systèmes',
    executables: ['eDrawings.exe'],
    productMatch: /edrawings/i,
    extensions: [
      'eprt', 'easm', 'edrw', 'eprtx', 'easmx', 'edrwx',
      'sldprt', 'sldasm', 'slddrw',
      'step', 'stp', 'iges', 'igs', 'stl', 'obj',
      'dxf', 'dwg', 'ipt', 'iam', 'catpart', 'catproduct', 'prt', 'asm', 'x_t', 'x_b',
    ],
  },
  {
    id: 'autocad',
    name: 'AutoCAD',
    publisher: 'Autodesk',
    executables: ['acad.exe'],
    productMatch: /autocad(?! lt)/i,
    extensions: ['dwg', 'dxf', 'dwt'],
  },
  {
    id: 'draftsight',
    name: 'DraftSight',
    publisher: 'Dassault Systèmes',
    executables: ['DraftSight.exe'],
    productMatch: /draftsight/i,
    extensions: ['dwg', 'dxf', 'dwt'],
  },
  {
    id: 'inventor',
    name: 'Autodesk Inventor',
    publisher: 'Autodesk',
    executables: ['Inventor.exe'],
    productMatch: /autodesk inventor/i,
    extensions: ['ipt', 'iam', 'idw', 'ipn', 'step', 'stp', 'iges', 'igs', 'dwg', 'dxf'],
  },
  {
    id: 'freecad',
    name: 'FreeCAD',
    publisher: 'Open source',
    executables: ['FreeCAD.exe'],
    productMatch: /freecad/i,
    extensions: ['step', 'stp', 'iges', 'igs', 'stl', 'obj', 'ply', 'dxf', 'dwg', 'fcstd', 'brep', '3mf', 'gltf', 'glb', 'svg'],
  },
  {
    id: 'catia',
    name: 'CATIA',
    publisher: 'Dassault Systèmes',
    executables: ['CNEXT.exe'],
    productMatch: /catia/i,
    extensions: ['catpart', 'catproduct', 'model', 'exp', 'session', 'dlv', 'cgr'],
  },
  {
    id: 'solidedge',
    name: 'Solid Edge',
    publisher: 'Siemens',
    executables: ['Edge.exe'],
    productMatch: /solid edge/i,
    extensions: ['par', 'asm', 'psm', 'dft', 'step', 'stp', 'iges', 'igs', 'x_t', 'x_b'],
  },
  {
    id: 'bricscad',
    name: 'BricsCAD',
    publisher: 'Bricsys',
    executables: ['bricscad.exe'],
    productMatch: /bricscad/i,
    extensions: ['dwg', 'dxf', 'dwt', 'dgn'],
  },
  {
    id: 'zwcad',
    name: 'ZWCAD',
    publisher: 'ZWSOFT',
    executables: ['ZWCAD.exe'],
    productMatch: /zwcad/i,
    extensions: ['dwg', 'dxf', 'dwt'],
  },
  {
    id: 'librecad',
    name: 'LibreCAD',
    publisher: 'Open source',
    executables: ['LibreCAD.exe', 'librecad.exe'],
    productMatch: /librecad/i,
    extensions: ['dxf', 'dwg'],
  },
  {
    id: 'qcad',
    name: 'QCAD',
    publisher: 'RibbonSoft',
    executables: ['qcad.exe'],
    productMatch: /qcad/i,
    extensions: ['dxf', 'dwg'],
  },
  {
    id: 'inkscape',
    name: 'Inkscape',
    publisher: 'Open source',
    executables: ['inkscape.exe'],
    productMatch: /inkscape/i,
    extensions: ['svg', 'dxf', 'pdf', 'ai', 'cdr'],
  },
  {
    id: 'illustrator',
    name: 'Adobe Illustrator',
    publisher: 'Adobe',
    executables: ['Illustrator.exe'],
    productMatch: /adobe illustrator/i,
    extensions: ['ai', 'svg', 'pdf', 'dxf', 'cdr'],
  },
  {
    id: 'coreldraw',
    name: 'CorelDRAW',
    publisher: 'Alludo',
    executables: ['CorelDRW.exe'],
    productMatch: /coreldraw/i,
    extensions: ['cdr', 'ai', 'svg', 'pdf', 'dxf'],
  },
  {
    id: 'acrobat',
    name: 'Adobe Acrobat',
    publisher: 'Adobe',
    executables: ['Acrobat.exe'],
    productMatch: /adobe acrobat/i,
    extensions: ['pdf'],
  },
  {
    id: 'rhino',
    name: 'Rhino',
    publisher: 'Robert McNeel & Associates',
    executables: ['Rhino.exe'],
    productMatch: /rhino/i,
    extensions: ['3dm', 'step', 'stp', 'iges', 'igs', 'stl', 'obj', 'ply', '3mf', 'gltf', 'glb'],
  },
  {
    id: 'blender',
    name: 'Blender',
    publisher: 'Blender Foundation',
    executables: ['blender.exe'],
    productMatch: /blender/i,
    extensions: ['obj', 'ply', 'stl', 'gltf', 'glb', '3mf', 'fbx'],
  },
  {
    id: 'fusion',
    name: 'Autodesk Fusion',
    publisher: 'Autodesk',
    executables: ['Fusion360.exe'],
    productMatch: /fusion 360|autodesk fusion/i,
    extensions: ['f3d', 'step', 'stp', 'iges', 'igs', 'stl', 'obj', 'dxf', 'dwg', 'sldprt', 'ipt'],
  },
];

export function bridgeApplicationFor(id) {
  return BRIDGE_APPLICATIONS.find((app) => app.id === id) || null;
}
