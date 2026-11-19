import fs from 'fs';

const out = 'public/cad-samples';
fs.mkdirSync(out, { recursive: true });

const vertices = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const faces = [
  [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
  [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
  [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
];

/* glTF / GLB with an embedded binary buffer. */
const indexData = new Uint16Array(faces.flat());
const positionData = new Float32Array(vertices.flat());
const buffer = Buffer.alloc(positionData.byteLength + indexData.byteLength + ((4 - (positionData.byteLength % 4)) % 4));
Buffer.from(positionData.buffer).copy(buffer, 0);
const indexOffset = positionData.byteLength;
Buffer.from(indexData.buffer).copy(buffer, indexOffset);
const gltf = {
  asset: { version: '2.0', generator: 'Codebuff CAD format verification sample' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Sample cube' }],
  meshes: [{ name: 'Sample cube', primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
  buffers: [{ byteLength: buffer.byteLength, uri: `data:application/octet-stream;base64,${buffer.toString('base64')}` }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positionData.byteLength, target: 34962 },
    { buffer: 0, byteOffset: indexOffset, byteLength: indexData.byteLength, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: vertices.length, type: 'VEC3', min: [-1, -1, -1], max: [1, 1, 1] },
    { bufferView: 1, componentType: 5123, count: indexData.length, type: 'SCALAR' },
  ],
};
fs.writeFileSync(`${out}/simple-cube.gltf`, JSON.stringify(gltf));

const gltfBinary = { ...gltf, buffers: [{ byteLength: buffer.byteLength }] };
const jsonBuffer = Buffer.from(JSON.stringify(gltfBinary));
const jsonPadded = Buffer.concat([jsonBuffer, Buffer.alloc((4 - (jsonBuffer.length % 4)) % 4, 0x20)]);
const binPadded = Buffer.concat([buffer, Buffer.alloc((4 - (buffer.length % 4)) % 4, 0)]);
const totalLength = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
const header = Buffer.alloc(12);
header.write('glTF', 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonPadded.length, 0);
jsonHeader.write('JSON', 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binPadded.length, 0);
binHeader.write('BIN\0', 4);
fs.writeFileSync(`${out}/simple-cube.glb`, Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]));

/* ASCII PLY */
let ply = 'ply\nformat ascii 1.0\ncomment Codebuff CAD format verification sample\nelement vertex 8\nproperty float x\nproperty float y\nproperty float z\nelement face 12\nproperty list uchar int vertex_indices\nend_header\n';
vertices.forEach((vertex) => { ply += `${vertex.join(' ')}\n`; });
faces.forEach((face) => { ply += `3 ${face.join(' ')}\n`; });
fs.writeFileSync(`${out}/simple-cube.ply`, ply);

/* ASCII FBX 7.4 with a simple cube mesh. */
const flatVertices = vertices.flat().join(',');
const polygonIndex = faces.map((face) => `${face[0]},${face[1]},${-face[2] - 1}`).join(',');
const fbx = `; FBX 7.4.0 project file
FBXHeaderExtension:  {
  FBXHeaderVersion: 1003
  FBXVersion: 7400
  Creator: "Codebuff CAD format verification sample"
}
GlobalSettings:  {
  Version: 1000
  Properties70:  {
    P: "UpAxis", "int", "Integer", "",1
    P: "UnitScaleFactor", "double", "Number", "",1
  }
}
Definitions:  {
  Version: 100
  Count: 2
  ObjectType: "Geometry" {
    Count: 1
  }
  ObjectType: "Model" {
    Count: 1
  }
}
Objects:  {
  Geometry: 1, "Geometry::SampleCube", "Mesh" {
    GeometryVersion: 124
    Vertices: *24 {
      a: ${flatVertices}
    }
    PolygonVertexIndex: *36 {
      a: ${polygonIndex}
    }
    LayerElementNormal: 0 {
      Version: 101
      Name: ""
      MappingInformationType: "ByPolygonVertex"
      ReferenceInformationType: "Direct"
      Normals: *108 {
        a: 0,0,-1,0,0,-1,0,0,-1,0,0,1,0,0,1,0,0,1,0,-1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,1,0,0,1,0,0,1,0,0,0,0,-1,0,0,-1,0,0,-1,0,0,1,0,0,1,0,0,1,0,-1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,1,0,0,1,0,0,1,0,0
      }
    }
    Layer: 0 {
      Version: 100
    }
  }
  Model: 2, "Model::SampleCube", "Mesh" {
    Version: 232
    Properties70:  {
      P: "Lcl Translation", "Lcl Translation", "", "A",0,0,0
    }
    Shading: T
    Culling: "CullingOff"
  }
}
Connections:  {
  C: "OO",1,2
}
`;
fs.writeFileSync(`${out}/simple-cube.fbx`, fbx);

/* DXF with real LINE / CIRCLE / LWPOLYLINE / TEXT entities. */
const dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
OUTLINE
10
0
20
0
30
0
11
120
21
0
31
0
0
LINE
8
OUTLINE
10
120
20
0
30
0
11
120
21
60
31
0
0
LINE
8
OUTLINE
10
120
20
60
30
0
11
0
21
60
31
0
0
LINE
8
OUTLINE
10
0
20
60
30
0
11
0
21
0
31
0
0
CIRCLE
8
HOLES
10
60
20
30
30
0
40
12
0
LWPOLYLINE
8
CENTERLINE
90
4
70
0
10
20
20
30
10
100
20
30
10
100
20
50
10
20
20
50
0
TEXT
8
TEXT
10
10
20
68
30
0
40
6
1
SAMPLE BRACKET - VIEWER VERIFICATION
0
ENDSEC
0
EOF
`;
fs.writeFileSync(`${out}/bracket-outline.dxf`, dxf);

console.log('Generated glTF, GLB, PLY, FBX and DXF verification samples.');
