import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import {
  Box,
  Eye,
  EyeOff,
  FlipHorizontal,
  Focus,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Scissors,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import { extensionOf } from '../../../data/cadData';

const PALETTE = [0x2f8f7e, 0x4a7fb5, 0xc08a3e, 0x8e6bab, 0x5a8f4e, 0xb56767, 0x4f7f8a];
const STANDARD_VIEWS = {
  iso: new THREE.Vector3(1, 0.9, 1.2).normalize(),
  front: new THREE.Vector3(0, 0.15, 1).normalize(),
  back: new THREE.Vector3(0, 0.15, -1).normalize(),
  left: new THREE.Vector3(-1, 0.2, 0).normalize(),
  right: new THREE.Vector3(1, 0.2, 0).normalize(),
  top: new THREE.Vector3(0, 1, 0.001).normalize(),
  bottom: new THREE.Vector3(0, -1, 0.001).normalize(),
};
const BACKGROUNDS = [
  { value: '#0d1b1a', label: 'Dark' },
  { value: '#1b2735', label: 'Slate' },
  { value: '#f4f7f6', label: 'Light' },
];

let occtPromise = null;
/** Lazily load OpenCascade WASM once per browser session. */
function getOcct() {
  if (!occtPromise) {
    occtPromise = import('occt-import-js')
      .then((module) => module.default({ locateFile: () => occtWasmUrl }))
      .catch((error) => {
        occtPromise = null;
        throw new Error(`The OpenCascade STEP/IGES module could not be loaded. ${error?.message || ''}`);
      });
  }
  return occtPromise;
}

function disposeObject(object) {
  if (!object) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  object.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) geometries.add(child.geometry);
    const list = Array.isArray(child.material) ? child.material : [child.material];
    list.forEach((material) => {
      if (!material) return;
      materials.add(material);
      ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach((key) => {
        if (material[key]?.isTexture) textures.add(material[key]);
      });
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  object.parent?.remove(object);
}

/**
 * World-space bounds of the renderable meshes, ignoring any component whose
 * position buffer contains NaN (some demonstration/exported meshes do).
 */
function finiteModelBounds(object) {
  if (!object) return null;
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let found = false;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    const local = child.geometry.boundingBox;
    if (!local) return;
    if (![local.min.x, local.min.y, local.min.z, local.max.x, local.max.y, local.max.z].every(Number.isFinite)) {
      return;
    }
    const world = local.clone().applyMatrix4(child.matrixWorld);
    if (found) box.union(world);
    else {
      box.copy(world);
      found = true;
    }
  });
  return found ? box : null;
}

/**
 * 3D model viewer — the same browser-only stack the ERP uses for mesh files:
 * Three.js + WebGLRenderer + OrbitControls + GLTF/OBJ/STL/PLY loaders.
 * STEP/IGES/SolidWorks are not routed here; they are reported unsupported by
 * the caller instead of being faked.
 */
export default function Viewer3D({ file, source, onNotify }) {
  const [container, setContainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tree, setTree] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [stats, setStats] = useState(null);
  const [wireframe, setWireframe] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [background, setBackground] = useState(BACKGROUNDS[0].value);
  const gridRef = useRef(null);
  const axesRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewName, setViewName] = useState('iso');
  const sourceUrl = source?.url || source?.assetPath || '';

  // Cut View (section) state — render-time clipping plus a stencil section cap.
  const [cutEnabled, setCutEnabled] = useState(false);
  const [cutPanelOpen, setCutPanelOpen] = useState(false);
  const [cutAxis, setCutAxis] = useState('x');
  const [cutPosition, setCutPosition] = useState(0);
  const [cutFlip, setCutFlip] = useState(false);
  const [showCap, setShowCap] = useState(true);
  const [capColor, setCapColor] = useState('#c98a3e');
  const [cutBounds, setCutBounds] = useState(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const viewportRef = useRef(null);
  const clickRef = useRef({ x: 0, y: 0 });
  const clipPlaneRef = useRef(null);
  const cutBoxRef = useRef(null);
  const capMeshRef = useRef(null);
  const cutOutlineRef = useRef(null);
  const stencilGroupsRef = useRef([]);

  /** Remove the cap, outline and per-mesh stencil passes (shared geometry is kept). */
  const clearCutResources = () => {
    const scene = sceneRef.current;
    stencilGroupsRef.current.forEach((group) => {
      group.parent?.remove(group);
      group.children.forEach((mesh) => mesh.material?.dispose());
    });
    stencilGroupsRef.current = [];
    if (capMeshRef.current) {
      scene?.remove(capMeshRef.current);
      capMeshRef.current.geometry?.dispose();
      capMeshRef.current.material?.dispose();
      capMeshRef.current = null;
    }
    if (cutOutlineRef.current) {
      scene?.remove(cutOutlineRef.current);
      cutOutlineRef.current.geometry?.dispose();
      cutOutlineRef.current.material?.dispose();
      cutOutlineRef.current = null;
    }
  };

  /**
   * Build the section cap for the current model: one invisible stencil pass per
   * mesh (front/back faces) plus a filled plane whose stencil test only passes
   * inside the clipped solid. This produces a real cut surface for every mesh,
   * including multiple solids, without modifying the imported geometry.
   */
  const buildCutResources = () => {
    const scene = sceneRef.current;
    const model = modelRef.current;
    const plane = clipPlaneRef.current;
    if (!scene || !model || !plane) return;
    clearCutResources();

    const box = finiteModelBounds(model);
    if (!box) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    cutBoxRef.current = { box, center, size };
    const extent = Math.max(size.x, size.y, size.z, 1) * 1.35;

    const capMaterial = new THREE.MeshStandardMaterial({
      color: capColor,
      metalness: 0.08,
      roughness: 0.82,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp,
      stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp,
    });
    capMaterial.clippingPlanes = [];
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(extent * 2, extent * 2), capMaterial);
    cap.name = 'Section cap';
    cap.renderOrder = 1.1;
    cap.visible = showCap;
    cap.onAfterRender = (activeRenderer) => activeRenderer.clearStencil();
    scene.add(cap);
    capMeshRef.current = cap;

    const outline = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-extent, -extent, 0),
        new THREE.Vector3(extent, -extent, 0),
        new THREE.Vector3(extent, extent, 0),
        new THREE.Vector3(-extent, extent, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0x7fd6c2, transparent: true, opacity: 0.45 }),
    );
    outline.name = 'Cut plane outline';
    outline.renderOrder = 1.05;
    scene.add(outline);
    cutOutlineRef.current = outline;

    const groups = [];
    const meshComponents = [];
    model.traverse((child) => {
      if (child.isMesh && !child.userData.isCutStencil) meshComponents.push(child);
    });
    meshComponents.forEach((child) => {
      if (!child.geometry) return;
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      const localBounds = child.geometry.boundingBox;
      if (!localBounds) return;
      if (![localBounds.min.x, localBounds.min.y, localBounds.min.z, localBounds.max.x, localBounds.max.y, localBounds.max.z].every(Number.isFinite)) {
        return;
      }
      const baseMaterial = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        stencilWrite: true,
        stencilFunc: THREE.AlwaysStencilFunc,
      });

      const backMaterial = baseMaterial.clone();
      backMaterial.side = THREE.BackSide;
      backMaterial.clippingPlanes = [plane];
      backMaterial.stencilFail = THREE.IncrementWrapStencilOp;
      backMaterial.stencilZFail = THREE.IncrementWrapStencilOp;
      backMaterial.stencilZPass = THREE.IncrementWrapStencilOp;

      const frontMaterial = baseMaterial.clone();
      frontMaterial.side = THREE.FrontSide;
      frontMaterial.clippingPlanes = [plane];
      frontMaterial.stencilFail = THREE.DecrementWrapStencilOp;
      frontMaterial.stencilZFail = THREE.DecrementWrapStencilOp;
      frontMaterial.stencilZPass = THREE.DecrementWrapStencilOp;
      baseMaterial.dispose();

      const group = new THREE.Group();
      group.name = `Cut stencil · ${child.name || 'component'}`;
      group.visible = showCap;
      group.userData.isCutStencil = true;

      const backMesh = new THREE.Mesh(child.geometry, backMaterial);
      const frontMesh = new THREE.Mesh(child.geometry, frontMaterial);
      [backMesh, frontMesh].forEach((mesh) => {
        mesh.renderOrder = 1;
        mesh.frustumCulled = false;
        mesh.raycast = () => {};
        mesh.userData.isCutStencil = true;
        group.add(mesh);
      });
      // The stencil meshes inherit the component transform and visibility.
      child.add(group);
      groups.push(group);
    });
    stencilGroupsRef.current = groups;

    const bounds = {
      x: { min: box.min.x, max: box.max.x },
      y: { min: box.min.y, max: box.max.y },
      z: { min: box.min.z, max: box.max.z },
    };
    setCutBounds(bounds);
    setCutPosition((bounds.x.min + bounds.x.max) / 2);
  };

  /** Move the world-space clipping plane and its cap/outline in real time. */
  const updateCutPlane = (axis, position, flip) => {
    const plane = clipPlaneRef.current;
    if (!plane) return;
    const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const normal = new THREE.Vector3();
    normal.setComponent(index, flip ? -1 : 1);
    plane.normal.copy(normal);
    plane.constant = flip ? position : -position;

    const boxInfo = cutBoxRef.current;
    if (!boxInfo) return;
    const planeCenter = boxInfo.center.clone();
    planeCenter.setComponent(index, position);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );
    if (capMeshRef.current) {
      capMeshRef.current.position.copy(planeCenter);
      capMeshRef.current.quaternion.copy(quaternion);
    }
    if (cutOutlineRef.current) {
      cutOutlineRef.current.position.copy(planeCenter);
      cutOutlineRef.current.quaternion.copy(quaternion);
    }
  };

  const cutBoundsRaw = cutBounds?.[cutAxis];
  const cutBoundsForAxis =
    cutBoundsRaw && [cutBoundsRaw.min, cutBoundsRaw.max].every(Number.isFinite) ? cutBoundsRaw : null;

  const cutStep = (() => {
    const bounds = cutBoundsForAxis;
    if (!bounds) return 0.1;
    const span = bounds.max - bounds.min;
    if (!Number.isFinite(span) || span <= 0) return 0.01;
    return Number(Math.max(span / 500, 0.01).toFixed(3));
  })();

  const cutDisplay = (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');

  /** Keep the far half so the freshly cut face points towards the viewer. */
  const autoFlipForAxis = (axis) => {
    const camera = cameraRef.current;
    const boxInfo = cutBoxRef.current;
    const controls = controlsRef.current;
    if (!camera || !boxInfo) return false;
    const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const target = controls?.target ?? boxInfo.center;
    return camera.position.clone().sub(target).getComponent(index) > 0;
  };

  const changeCutAxis = (axis) => {
    setCutAxis(axis);
    setCutFlip(autoFlipForAxis(axis));
    const bounds = cutBounds?.[axis];
    setCutPosition(bounds ? (bounds.min + bounds.max) / 2 : 0);
  };

  const resetCutPosition = () => {
    const bounds = cutBounds?.[cutAxis];
    setCutPosition(bounds ? (bounds.min + bounds.max) / 2 : 0);
  };

  const resetCutView = () => {
    setCutEnabled(false);
    setCutPanelOpen(false);
    setCutFlip(false);
    setShowCap(true);
    setCutAxis('x');
    const bounds = cutBounds?.x;
    setCutPosition(bounds ? (bounds.min + bounds.max) / 2 : 0);
  };

  const toggleCutView = () => {
    if (!modelRef.current) {
      onNotify?.('Load a 3D model before enabling Cut View.', 'error');
      return;
    }
    if (!cutEnabled) {
      setCutFlip(autoFlipForAxis(cutAxis));
      setCutEnabled(true);
      setCutPanelOpen(true);
      return;
    }
    if (!cutPanelOpen) {
      setCutPanelOpen(true);
      return;
    }
    setCutEnabled(false);
  };

  useEffect(() => {
    if (!container || rendererRef.current) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, stencil: true });
    } catch {
      setError('WebGL is not available in this browser, so the 3D model cannot be rendered.');
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, Math.max(container.clientHeight, 260));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);

    clipPlaneRef.current = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1b1a');
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / Math.max(container.clientHeight, 1), 0.005, 5000);
    camera.position.set(140, 110, 170);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1e3a35, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(160, 220, 180);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfe6dd, 0.55);
    fill.position.set(-180, -80, -120);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(-80, 120, -180);
    scene.add(rim);

    const grid = new THREE.GridHelper(600, 30, 0x1f4d46, 0x173733);
    grid.position.y = -0.5;
    scene.add(grid);
    const axes = new THREE.AxesHelper(45);
    axes.position.set(-70, 0, -70);
    scene.add(axes);
    gridRef.current = grid;
    axesRef.current = axes;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (document.hidden) return;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      if (!container.clientWidth) return;
      camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, Math.max(container.clientHeight, 260));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      clearCutResources();
      disposeObject(modelRef.current);
      modelRef.current = null;
      grid.geometry?.dispose();
      grid.material?.dispose();
      axes.geometry?.dispose();
      axes.material?.dispose();
      gridRef.current = null;
      axesRef.current = null;
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      sceneRef.current = null;
    };
  }, [container]);

  const fitCamera = (direction = STANDARD_VIEWS.iso) => {
    const model = modelRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!model || !camera || !controls) return;
    model.updateMatrixWorld(true);
    const bounds = finiteModelBounds(model);
    if (!bounds) return;
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    if (!sphere || !Number.isFinite(sphere.radius) || sphere.radius <= 0) return;
    const radius = Math.max(sphere.radius, 1e-4);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distance = (radius * 1.45) / Math.sin(Math.min(vFov, hFov) / 2);
    const dir = direction.clone().normalize();
    camera.position.copy(sphere.center).addScaledVector(dir, distance);
    camera.near = Math.max((distance - radius) / 10, 0.0001);
    camera.far = distance * 12 + radius * 4;
    camera.lookAt(sphere.center);
    camera.updateProjectionMatrix();
    controls.target.copy(sphere.center);
    controls.minDistance = radius * 0.08;
    controls.maxDistance = distance * 10;
    controls.update();
  };

  useEffect(() => {
    if (!sourceUrl || !rendererRef.current) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setTree([]);
    setSelectedId('');
    setStats(null);
    setExploded(false);
    setCutEnabled(false);
    setCutPanelOpen(false);
    setCutFlip(false);
    setShowCap(true);
    setCutBounds(null);
    cutBoxRef.current = null;
    clearCutResources();

    const scene = sceneRef.current;
    if (modelRef.current) {
      disposeObject(modelRef.current);
      modelRef.current = null;
    }

    const ext = extensionOf(source.name || file?.fileName || '');
    const colorFor = (index) => PALETTE[index % PALETTE.length];
    const prepareMeshes = (group) => {
      let index = 0;
      group.traverse((child) => {
        if (!child.isMesh) return;
        if (!child.geometry.getAttribute('normal')) child.geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: colorFor(index),
          metalness: 0.28,
          roughness: 0.42,
        });
        child.material = material;
        child.userData.cadOrder = index;
        index += 1;
      });
      return group;
    };

    const load = async () => {
      try {
        const url = source.url || source.assetPath;
        if (!url) throw new Error('No file is attached to this record in the current browser session.');
        let group;
        if (ext === 'obj') {
          const text = await fetch(url).then((response) => {
            if (!response.ok) throw new Error(`The OBJ file could not be loaded (${response.status}).`);
            return response.text();
          });
          group = new OBJLoader().parse(text);
          prepareMeshes(group);
        } else if (ext === 'stl') {
          const buffer = await fetch(url).then((response) => {
            if (!response.ok) throw new Error(`The STL file could not be loaded (${response.status}).`);
            return response.arrayBuffer();
          });
          const geometry = new STLLoader().parse(buffer);
          geometry.computeVertexNormals();
          group = new THREE.Group();
          const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colorFor(0), metalness: 0.28, roughness: 0.42 }));
          mesh.name = (file?.partName || 'Part model');
          group.add(mesh);
        } else if (ext === 'ply') {
          const buffer = await fetch(url).then((response) => {
            if (!response.ok) throw new Error(`The PLY file could not be loaded (${response.status}).`);
            return response.arrayBuffer();
          });
          const geometry = new PLYLoader().parse(buffer);
          geometry.computeVertexNormals();
          group = new THREE.Group();
          const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colorFor(0), metalness: 0.2, roughness: 0.55 }));
          mesh.name = file?.partName || 'Part model';
          group.add(mesh);
        } else if (ext === 'glb' || ext === 'gltf') {
          group = await new Promise((resolve, reject) => {
            new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, (err) => reject(err));
          });
          prepareMeshes(group);
        } else if (ext === 'fbx') {
          const buffer = await fetch(url).then((response) => {
            if (!response.ok) throw new Error(`The FBX file could not be loaded (${response.status}).`);
            return response.arrayBuffer();
          });
          group = new FBXLoader().parse(buffer, '');
          prepareMeshes(group);
        } else if (ext === '3mf') {
          const buffer = await fetch(url).then((response) => {
            if (!response.ok) throw new Error(`The 3MF package could not be loaded (${response.status}).`);
            return response.arrayBuffer();
          });
          group = new ThreeMFLoader().parse(buffer);
          prepareMeshes(group);
        } else if (['step', 'stp', 'iges', 'igs', 'brep'].includes(ext)) {
          const buffer = await fetch(url).then((response) => {
            if (!response.ok) throw new Error(`The CAD file could not be loaded (${response.status}).`);
            return response.arrayBuffer();
          });
          const occt = await getOcct();
          const result =
            ext === 'brep'
              ? occt.ReadBrepFile(new Uint8Array(buffer), null)
              : ext === 'iges' || ext === 'igs'
                ? occt.ReadIgesFile(new Uint8Array(buffer), { linearUnit: 'millimeter' })
                : occt.ReadStepFile(new Uint8Array(buffer), { linearUnit: 'millimeter' });
          if (!result?.success || !result.meshes?.length) {
            throw new Error('OpenCascade could not extract any solid geometry from this file.');
          }
          group = new THREE.Group();
          result.meshes.forEach((mesh, index) => {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(Array.from(mesh.attributes.position.array), 3),
            );
            if (mesh.attributes.normal) {
              geometry.setAttribute(
                'normal',
                new THREE.Float32BufferAttribute(Array.from(mesh.attributes.normal.array), 3),
              );
            } else {
              geometry.computeVertexNormals();
            }
            if (mesh.index) {
              geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(mesh.index.array), 1));
            }
            const meshColor = mesh.color
              ? new THREE.Color(mesh.color[0], mesh.color[1], mesh.color[2])
              : new THREE.Color(colorFor(index));
            const object = new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color: meshColor,
                metalness: 0.28,
                roughness: 0.42,
                side: THREE.DoubleSide,
              }),
            );
            object.name = mesh.name || `Solid ${index + 1}`;
            object.userData.cadOrder = index;
            group.add(object);
          });
        } else {
          throw new Error(`${ext.toUpperCase() || 'This'} files have no Three.js loader in this build.`);
        }

        if (!active) {
          disposeObject(group);
          return;
        }
        if (!group || group.children.length === 0) throw new Error('The file contains no renderable mesh geometry.');

        group.name = 'CAD model';
        modelRef.current = group;
        scene.add(group);

        const entries = [];
        let triangleCount = 0;
        group.traverse((child) => {
          if (!child.isMesh) return;
          const position = child.geometry.getAttribute('position');
          triangleCount += (child.geometry.index ? child.geometry.index.count : position.count) / 3;
          entries.push({
            id: child.uuid,
            name: child.name || child.parent?.name || `Component ${entries.length + 1}`,
            visible: true,
          });
        });
        setTree(entries);
        setStats({ meshes: entries.length, triangles: Math.round(triangleCount), vertices: Math.round(triangleCount * 0.6) });
        setLoading(false);
        setViewName('iso');

        // Establish the model-space extent used by the Cut View plane.
        const cutBox = finiteModelBounds(group);
        if (cutBox) {
          cutBoxRef.current = {
            box: cutBox,
            center: cutBox.getCenter(new THREE.Vector3()),
            size: cutBox.getSize(new THREE.Vector3()),
          };
          setCutBounds({
            x: { min: cutBox.min.x, max: cutBox.max.x },
            y: { min: cutBox.min.y, max: cutBox.max.y },
            z: { min: cutBox.min.z, max: cutBox.max.z },
          });
          setCutPosition((cutBox.min.x + cutBox.max.x) / 2);
        } else {
          cutBoxRef.current = null;
          setCutBounds(null);
        }
        requestAnimationFrame(() => fitCamera(STANDARD_VIEWS.iso));
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'The 3D model could not be loaded.');
        setLoading(false);
      }
    };
    load();

    return () => {
      active = false;
    };
    // Primitive URL key avoids reloading when the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, file?.id, file?.fileName, container]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    tree.forEach((entry) => {
      const object = model.getObjectByProperty('uuid', entry.id);
      if (object) object.visible = entry.visible;
    });
  }, [tree]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    model.updateMatrixWorld(true);
    const center = finiteModelBounds(model)?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
    model.traverse((child) => {
      if (!child.isMesh || child.userData.isCutStencil) return;
      if (!child.userData.offsetBase) child.userData.offsetBase = child.position.clone();
      const base = child.userData.offsetBase;
      if (exploded) {
        const direction = new THREE.Vector3()
          .copy(child.getWorldPosition(new THREE.Vector3()))
          .sub(center);
        if (direction.lengthSq() < 1e-8) direction.set(0, 1, 0);
        direction.normalize().multiplyScalar(28);
        child.position.copy(base).add(direction);
      } else {
        child.position.copy(base);
      }
      const list = Array.isArray(child.material) ? child.material : [child.material];
      list.forEach((material) => {
        if (!material) return;
        if ('wireframe' in material) material.wireframe = wireframe;
        if (material.emissive) {
          material.emissive.setHex(child.uuid === selectedId ? 0x0f8f78 : 0x000000);
          material.emissiveIntensity = child.uuid === selectedId ? 0.55 : 0;
        }
      });
    });
  }, [selectedId, wireframe, tree, exploded]);

  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (axesRef.current) axesRef.current.visible = showAxes;
  }, [showAxes]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(background);
  }, [background]);

  // Enable/disable render-time clipping on every visible or hidden component.
  useEffect(() => {
    const model = modelRef.current;
    const plane = clipPlaneRef.current;
    if (!model || !plane) return;
    if (cutEnabled) buildCutResources();
    model.traverse((child) => {
      if (!child.isMesh || child.userData.isCutStencil) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material) return;
        material.clippingPlanes = cutEnabled ? [plane] : null;
        material.clipShadows = cutEnabled;
        material.needsUpdate = true;
      });
    });
    if (!cutEnabled) clearCutResources();
    // Build only when the feature is toggled; position changes never re-import geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutEnabled]);

  // Live plane movement: no geometry rebuild, no material recompile.
  useEffect(() => {
    updateCutPlane(cutAxis, cutPosition, cutFlip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutAxis, cutPosition, cutFlip, cutEnabled]);

  useEffect(() => {
    if (capMeshRef.current) capMeshRef.current.visible = cutEnabled && showCap;
    stencilGroupsRef.current.forEach((group) => {
      group.visible = cutEnabled && showCap;
    });
    if (cutOutlineRef.current) cutOutlineRef.current.visible = cutEnabled;
  }, [cutEnabled, showCap]);

  // Cap fill colour is a live material change; the cap mesh is never rebuilt.
  useEffect(() => {
    if (capMeshRef.current) capMeshRef.current.material.color.set(capColor);
  }, [capColor, cutEnabled]);

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const zoomBy = (factor) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  };

  const applyView = (name) => {
    setViewName(name);
    fitCamera(STANDARD_VIEWS[name] || STANDARD_VIEWS.iso);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await viewportRef.current?.requestFullscreen();
    } catch {
      onNotify?.('Fullscreen is not available in this browser context.', 'error');
    }
  };

  const handlePointerDown = (event) => {
    clickRef.current = { x: event.clientX, y: event.clientY };
  };
  const handlePointerUp = (event) => {
    const moved = Math.hypot(event.clientX - clickRef.current.x, event.clientY - clickRef.current.y);
    if (moved > 5) return;
    const camera = cameraRef.current;
    const model = modelRef.current;
    const renderer = rendererRef.current;
    if (!camera || !model || !renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster
      .intersectObjects(model.children, true)
      .filter((hit) => hit.object.visible && !hit.object.userData.isCutStencil);
    setSelectedId(hits[0]?.object?.uuid || '');
  };

  const selected = tree.find((entry) => entry.id === selectedId);

  return (
    <div className={`cad-viewer cad-viewer-3d${fullscreen ? ' is-fullscreen' : ''}`} ref={viewportRef}>
      <div className="cad-viewer-toolbar">
        <span className="cad-viewer-mode">
          3D · {extensionOf(file?.fileName || '').toUpperCase() || 'Mesh'} ·{' '}
          {['step', 'stp', 'iges', 'igs', 'brep'].includes(extensionOf(file?.fileName || ''))
            ? 'OpenCascade WASM'
            : 'Three.js'}
        </span>
        <div className="cad-toolgroup">
          <button type="button" className="icon-btn" title="Zoom in" aria-label="Zoom in" onClick={() => zoomBy(0.82)}><ZoomIn aria-hidden="true" /></button>
          <button type="button" className="icon-btn" title="Zoom out" aria-label="Zoom out" onClick={() => zoomBy(1.22)}><ZoomOut aria-hidden="true" /></button>
          <button type="button" className="cad-tool-btn" onClick={() => fitCamera(STANDARD_VIEWS[viewName] || STANDARD_VIEWS.iso)}><Focus aria-hidden="true" /><span>Fit</span></button>
          <button type="button" className="cad-tool-btn" onClick={() => { setViewName('iso'); fitCamera(STANDARD_VIEWS.iso); }}><RotateCcw aria-hidden="true" /><span>Reset camera</span></button>
        </div>
        <div className="cad-toolgroup">
          {['iso', 'front', 'back', 'left', 'right', 'top', 'bottom'].map((view) => (
            <button key={view} type="button" className={`cad-view-chip${viewName === view ? ' is-active' : ''}`} onClick={() => applyView(view)}>
              {view === 'iso' ? 'ISO' : view.toUpperCase()}
            </button>
          ))}
          <button type="button" className={`cad-view-chip${!wireframe ? ' is-active' : ''}`} onClick={() => setWireframe(false)} title="Shaded solid display">Solid</button>
          <button type="button" className={`cad-view-chip${wireframe ? ' is-active' : ''}`} onClick={() => setWireframe(true)}>Wireframe</button>
          <button type="button" className={`cad-view-chip${exploded ? ' is-active' : ''}`} onClick={() => setExploded((value) => !value)}>
            Exploded
          </button>
          <button type="button" className={`cad-view-chip${showGrid ? ' is-active' : ''}`} onClick={() => setShowGrid((value) => !value)}>
            Grid
          </button>
          <button type="button" className={`cad-view-chip${showAxes ? ' is-active' : ''}`} onClick={() => setShowAxes((value) => !value)}>
            Axes
          </button>
          <button
            type="button"
            className={`cad-view-chip cad-cut-trigger${cutEnabled ? ' is-active' : ''}`}
            aria-pressed={cutEnabled}
            title="Cut View — section the model along X, Y or Z"
            onClick={toggleCutView}
          >
            <Scissors aria-hidden="true" /> Cut View
          </button>
        </div>
        <div className="cad-toolgroup cad-toolgroup-right">
          <select
            className="cad-bg-select"
            aria-label="Viewer background"
            title="Viewer background"
            value={background}
            onChange={(event) => setBackground(event.target.value)}
          >
            {BACKGROUNDS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
          <button type="button" className="cad-tool-btn" onClick={toggleFullscreen} title="Fullscreen">
            {fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}<span>{fullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      <div className="cad-viewer-body">
        <aside className="cad-model-tree">
          <div className="cad-panel-head"><Box aria-hidden="true" /><strong>Model tree</strong><span className="mech-aside-count">{tree.length}</span></div>
          <ul>
            {tree.map((entry) => (
              <li key={entry.id} className={entry.id === selectedId ? 'is-selected' : ''}>
                <button type="button" className="cad-tree-name" onClick={() => setSelectedId(entry.id)} title={entry.name}>
                  <Box aria-hidden="true" /><span>{entry.name}</span>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`${entry.visible ? 'Hide' : 'Show'} ${entry.name}`}
                  onClick={() => setTree((previous) => previous.map((row) => (row.id === entry.id ? { ...row, visible: !row.visible } : row)))}
                >
                  {entry.visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                </button>
              </li>
            ))}
            {tree.length === 0 && <li className="cell-muted">No components loaded</li>}
          </ul>
        </aside>

        <div className="cad-3d-stage" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} ref={setContainer}>
          {cutEnabled && cutPanelOpen && (
            <div
              className="cad-cut-panel"
              role="group"
              aria-label="Cut View controls"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
            >
              <div className="cad-cut-head">
                <Scissors aria-hidden="true" />
                <strong>Cut View</strong>
                <span className="cad-cut-plane-badge">{cutAxis.toUpperCase()} plane</span>
                <button
                  type="button"
                  className="cad-cut-icon"
                  aria-label="Hide Cut View controls"
                  title="Hide controls"
                  onClick={() => setCutPanelOpen(false)}
                >
                  <X aria-hidden="true" />
                </button>
              </div>

              <div className="cad-cut-block">
                <span className="cad-cut-label">Cutting plane</span>
                <div className="cad-cut-axis" role="group" aria-label="Cutting plane selection">
                  {['x', 'y', 'z'].map((axis) => (
                    <button
                      key={axis}
                      type="button"
                      className={`cad-cut-chip${cutAxis === axis ? ' is-active' : ''}`}
                      aria-pressed={cutAxis === axis}
                      title={`Cut along the ${axis.toUpperCase()} plane`}
                      onClick={() => changeCutAxis(axis)}
                    >
                      {axis.toUpperCase()} Plane
                    </button>
                  ))}
                </div>
              </div>

              <div className="cad-cut-block">
                <div className="cad-cut-label-row">
                  <span className="cad-cut-label">Position</span>
                  <strong className="cad-cut-value">{cutDisplay(cutPosition)}</strong>
                </div>
                <input
                  className="cad-cut-slider"
                  type="range"
                  min={cutBoundsForAxis?.min ?? -1}
                  max={cutBoundsForAxis?.max ?? 1}
                  step="any"
                  value={Number.isFinite(cutPosition) ? cutPosition : 0}
                  aria-label="Cutting plane position"
                  onChange={(event) => setCutPosition(Number(event.target.value))}
                />
                <div className="cad-cut-number-row">
                  <label htmlFor="cad-cut-offset">Offset</label>
                  <input
                    id="cad-cut-offset"
                    className="cad-cut-number"
                    type="number"
                    step={cutStep}
                    value={Number((Number.isFinite(cutPosition) ? cutPosition : 0).toFixed(3))}
                    aria-label="Cutting plane offset"
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) setCutPosition(next);
                    }}
                  />
                  <span>model units</span>
                </div>
                {cutBoundsForAxis && (
                  <p className="cad-cut-range">
                    {cutDisplay(cutBoundsForAxis.min)} … {cutDisplay(cutBoundsForAxis.max)} along{' '}
                    {cutAxis.toUpperCase()}
                  </p>
                )}
              </div>

              <div className="cad-cut-row">
                <button
                  type="button"
                  className={`cad-cut-btn${cutFlip ? ' is-active' : ''}`}
                  aria-pressed={cutFlip}
                  title="Keep the other side of the cutting plane"
                  onClick={() => setCutFlip((value) => !value)}
                >
                  <FlipHorizontal aria-hidden="true" /> Flip Direction
                </button>
                <button
                  type="button"
                  className={`cad-cut-btn${showCap ? ' is-active' : ''}`}
                  aria-pressed={showCap}
                  title="Show or hide the section cap"
                  onClick={() => setShowCap((value) => !value)}
                >
                  <Layers aria-hidden="true" /> {showCap ? 'Hide Cap' : 'Show Cap'}
                </button>
                <label className="cad-cut-color" title="Section cap fill colour">
                  <span>Cap colour</span>
                  <input
                    type="color"
                    value={capColor}
                    aria-label="Section cap fill colour"
                    onChange={(event) => setCapColor(event.target.value)}
                  />
                </label>
              </div>

              <div className="cad-cut-row">
                <button
                  type="button"
                  className="cad-cut-btn"
                  title="Return the plane to the model centre"
                  onClick={resetCutPosition}
                >
                  <RotateCcw aria-hidden="true" /> Reset Position
                </button>
                <button
                  type="button"
                  className="cad-cut-btn is-danger"
                  title="Disable Cut View and restore the complete model"
                  onClick={resetCutView}
                >
                  <X aria-hidden="true" /> Reset Cut View
                </button>
              </div>

              <p className="cad-cut-note">
                Render-time section through every visible solid. The cap is masked by the clipped
                surfaces; the source file and camera are untouched.
              </p>
            </div>
          )}
          {loading && (
            <div className="cad-viewer-overlay"><span className="cad-spinner" aria-hidden="true" /><strong>Loading model…</strong><span>Parsing geometry in the browser</span></div>
          )}
          {error && (
            <div className="cad-viewer-overlay is-error">
              <strong>Unable to render the 3D model</strong>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="cad-viewer-footer">
        <div className="cad-viewer-selection">
          {selected ? <><strong>{selected.name}</strong><span className="cell-muted">selected component</span></> : <span className="cell-muted">Click a component in the canvas or model tree to select it.</span>}
        </div>
        <div className="cad-viewer-stats">
          {cutEnabled && (
            <span className="cad-cut-status">
              Cut {cutAxis.toUpperCase()} · {cutDisplay(cutPosition)} · {cutFlip ? 'reversed' : 'forward'}
              {showCap ? ' · cap on' : ' · cap off'}
            </span>
          )}
          {stats && <span>{stats.meshes} meshes · {stats.triangles.toLocaleString('en-IN')} triangles</span>}
          <span>Orbit: drag · Pan: right-drag / two-finger · Zoom: wheel</span>
        </div>
      </div>
    </div>
  );
}
