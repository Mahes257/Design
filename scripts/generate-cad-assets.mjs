import fs from 'fs';

const out = 'public/cad-samples';
const f3 = (n) => Number(n).toFixed(4).replace(/\.?0+$/, '');

function box(cx, cy, cz, sx, sy, sz) {
  const x0 = cx - sx / 2;
  const x1 = cx + sx / 2;
  const y0 = cy - sy / 2;
  const y1 = cy + sy / 2;
  const z0 = cz - sz / 2;
  const z1 = cz + sz / 2;
  return [
    [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]],
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
    [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]],
    [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
    [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
  ];
}

function cylinder(cx, cy, cz, r, h, seg = 28, axis = 'y') {
  const quads = [];
  const pts = (a) => {
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return axis === 'y' ? [cx + x, cy + h / 2, cz + z] : [cx + h / 2, cy + x, cz + z];
  };
  for (let i = 0; i < seg; i += 1) {
    const p0 = pts((i / seg) * Math.PI * 2);
    const p1 = pts(((i + 1) / seg) * Math.PI * 2);
    const q0 = axis === 'y' ? [p0[0], cy - h / 2, p0[2]] : [cx - h / 2, p0[1], p0[2]];
    const q1 = axis === 'y' ? [p1[0], cy - h / 2, p1[2]] : [cx - h / 2, p1[1], p1[2]];
    quads.push([p0, p1, q1, q0]);
  }
  if (axis === 'y') {
    quads.push([[cx, cy + h / 2, cz], [cx + r, cy + h / 2, cz], [cx, cy + h / 2, cz + r]]);
  }
  return quads;
}

const groups = [
  { name: 'Base_Plate', quads: box(0, 4, 0, 120, 8, 70) },
  { name: 'Housing', quads: box(-18, 34, 0, 52, 52, 54) },
  { name: 'Bearing_Boss', quads: cylinder(-18, 52, 0, 16, 14, 28) },
  { name: 'Drive_Shaft', quads: cylinder(16, 30, 0, 7, 74, 24, 'x') },
  { name: 'Motor_Mount', quads: box(38, 16, 0, 26, 16, 46) },
];

let obj = '# Drive assembly - demonstration sample geometry (mock CAD data)\n';
obj += '# Units: millimetres. Generated primitives for browser viewer verification.\n';
let offset = 1;
for (const group of groups) {
  obj += `\no ${group.name}\nusemtl sample_steel\n`;
  let vertices = '';
  let faces = '';
  let count = 0;
  const emitted = new Set();
  for (const quad of group.quads) {
    const key = quad.map((p) => p.map(f3).join(',')).join('|');
    const reverse = [...quad].reverse().map((p) => p.map(f3).join(',')).join('|');
    if (emitted.has(key) || emitted.has(reverse)) continue;
    emitted.add(key);
    const base = offset + count;
    for (const p of quad) vertices += `v ${f3(p[0])} ${f3(p[1])} ${f3(p[2])}\n`;
    faces += `f ${base} ${base + 1} ${base + 2} ${base + 3}\n`;
    count += 4;
  }
  obj += vertices + faces;
  offset += count;
}
fs.writeFileSync(`${out}/drive-assembly.obj`, obj);
fs.writeFileSync(`${out}/drive-assembly.mtl`, 'newmtl sample_steel\nKa 0.2 0.2 0.2\nKd 0.55 0.63 0.62\nKs 0.4 0.4 0.4\nNs 60\n');

function writeStl(name, quads) {
  let text = `solid ${name}\n`;
  for (const quad of quads) {
    const triangles = quad.length === 3
      ? [quad]
      : [[quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]]];
    for (const tri of triangles) {
      const [a, b, c] = tri;
      const ux = b[0] - a[0];
      const uy = b[1] - a[1];
      const uz = b[2] - a[2];
      const vx = c[0] - a[0];
      const vy = c[1] - a[1];
      const vz = c[2] - a[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      text += `  facet normal ${f3(nx)} ${f3(ny)} ${f3(nz)}\n    outer loop\n`;
      for (const p of [a, b, c]) text += `      vertex ${f3(p[0])} ${f3(p[1])} ${f3(p[2])}\n`;
      text += '    endloop\n  endfacet\n';
    }
  }
  fs.writeFileSync(`${out}/${name}`, `${text}endsolid ${name}\n`);
}

writeStl('gearbox-housing.stl', [
  ...box(0, 26, 0, 96, 52, 64),
  ...cylinder(0, 56, 0, 24, 14, 32),
  ...cylinder(0, 0, 0, 30, 6, 32),
  ...box(0, 26, 34, 60, 34, 6),
]);

writeStl('drive-shaft.stl', [
  ...cylinder(0, 0, 0, 9, 96, 32, 'x'),
  ...cylinder(-52, 0, 0, 13, 12, 32, 'x'),
  ...cylinder(35, 0, 0, 6.5, 34, 28, 'x'),
  ...cylinder(56, 0, 0, 10, 10, 28, 'x'),
  ...box(20, 0, 0, 8, 4, 4),
]);

const content = `0.12 0.16 0.16 RG
2 w
24 24 547 794 re S
1 w
80 560 300 150 re S
230 635 m 80 560 l S
230 635 m 380 560 l S
60 420 m 560 420 l S
0.7 w
[10 4] 0 d
60 250 m 560 250 l S
[] 0 d
BT /F1 18 Tf 80 740 Td (VISHAK TECH - MECHANICAL DESIGN) Tj ET
BT /F1 13 Tf 80 716 Td (UTILITY SKID PIPING - GENERAL ARRANGEMENT) Tj ET
BT /F1 11 Tf 80 682 Td (DRAWING NO: DRG-PIP-033-001   REVISION: A   SHEET 1 OF 1) Tj ET
BT /F1 11 Tf 80 398 Td (NOTES:) Tj ET
BT /F1 10 Tf 80 378 Td (1. ALL DIMENSIONS IN MILLIMETRES.) Tj ET
BT /F1 10 Tf 80 360 Td (2. DEMONSTRATION VECTOR PDF FOR BROWSER VIEWER VERIFICATION.) Tj ET
BT /F1 10 Tf 80 342 Td (3. REFER TO PIPE SPOOL DETAILS AND SUPPORT STANDARD STD-SUP-014.) Tj ET
80 130 400 70 re S
BT /F1 10 Tf 90 182 Td (PROJECT: PRJ-2026-033 - UTILITY SKID PIPING) Tj ET
BT /F1 10 Tf 90 164 Td (PREPARED BY: P. DESHMUKH   CHECKED BY: N. JOSHI) Tj ET
BT /F1 10 Tf 90 146 Td (STATUS: RELEASED - DEMONSTRATION SAMPLE) Tj ET
80 540 120 40 re S
BT /F1 10 Tf 90 556 Td (DN50 SPOOL) Tj ET
`;

const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];
let pdf = '%PDF-1.4\n';
const offsets = [0];
objects.forEach((body, index) => {
  offsets.push(Buffer.byteLength(pdf, 'latin1'));
  pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefStart = Buffer.byteLength(pdf, 'latin1');
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
fs.writeFileSync(`${out}/utility-skid-ga.pdf`, pdf, 'latin1');

console.log('generated', fs.readdirSync(out));
