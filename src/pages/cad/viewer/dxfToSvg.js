import DxfParser from 'dxf-parser';

/**
 * Real DXF → SVG conversion for the shared CAD viewer.
 *
 * dxf-parser (MIT) reads the ASCII/binary DXF entity table; this module turns
 * the supported entities into SVG geometry. Unsupported entity types are
 * skipped explicitly and reported, never invented.
 */
const MAX_ENTITIES = 12000;

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const round = (value) => Math.round(Number(value) * 1000) / 1000;

function collectBounds(points, bounds) {
  points.forEach((point) => {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return;
    bounds.minX = Math.min(bounds.minX, point[0]);
    bounds.minY = Math.min(bounds.minY, point[1]);
    bounds.maxX = Math.max(bounds.maxX, point[0]);
    bounds.maxY = Math.max(bounds.maxY, point[1]);
  });
}

/** Sample a polyline bulge segment into short chords. */
function bulgeSegment(start, end, bulge) {
  if (!bulge) return [end];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chord = Math.hypot(dx, dy);
  if (!chord) return [end];
  const theta = 4 * Math.atan(bulge);
  const radius = chord / (2 * Math.sin(Math.abs(theta) / 2));
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const offset = radius * Math.cos(theta / 2);
  const sign = bulge > 0 ? 1 : -1;
  const cx = midX - (dy / chord) * offset * sign;
  const cy = midY + (dx / chord) * offset * sign;
  const startAngle = Math.atan2(start.y - cy, start.x - cx);
  const points = [];
  const steps = Math.max(4, Math.min(48, Math.round(Math.abs(theta) / 0.12)));
  for (let index = 1; index <= steps; index += 1) {
    const angle = startAngle + (theta * index) / steps;
    points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return points;
}

export function dxfToSvg(text) {
  const parser = new DxfParser();
  let dxf;
  try {
    dxf = parser.parseSync(text);
  } catch (error) {
    throw new Error(`The DXF file could not be parsed: ${error.message}`);
  }
  if (!dxf || !Array.isArray(dxf.entities)) {
    throw new Error('The DXF file contains no entities.');
  }

  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const layerSet = new Set();
  const shapes = [];
  const skipped = new Set();
  let rendered = 0;

  const layerOf = (entity) => {
    const layer = entity.layer || '0';
    layerSet.add(layer);
    return layer;
  };
  const push = (entity, markup, points = []) => {
    if (rendered >= MAX_ENTITIES) {
      skipped.add('entity limit');
      return;
    }
    collectBounds(points, bounds);
    shapes.push({
      layer: layerOf(entity),
      color: entity.color ? `#${Number(entity.color).toString(16).padStart(6, '0')}` : '',
      markup,
    });
    rendered += 1;
  };

  dxf.entities.forEach((entity) => {
    switch (entity.type) {
      case 'LINE': {
        const { start, end } = entity.vertices ? { start: entity.vertices[0], end: entity.vertices[1] } : {};
        if (!start || !end) return;
        push(entity, `<line x1="${round(start.x)}" y1="${round(start.y)}" x2="${round(end.x)}" y2="${round(end.y)}" />`, [
          [start.x, start.y],
          [end.x, end.y],
        ]);
        return;
      }
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const vertices = entity.vertices || [];
        if (vertices.length < 2) return;
        const points = [];
        vertices.forEach((vertex, index) => {
          if (!index) points.push([vertex.x, vertex.y]);
          if (vertex.bulge) {
            const next = vertices[index + 1];
            if (next) {
              bulgeSegment(vertex, next, vertex.bulge).forEach((point) => points.push([point.x, point.y]));
            }
          } else if (index) {
            points.push([vertex.x, vertex.y]);
          }
        });
        const closed = entity.shape || entity.closed;
        const path = `M ${points.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L ')}${closed ? ' Z' : ''}`;
        push(entity, `<path d="${path}" fill="none" />`, points);
        return;
      }
      case 'CIRCLE': {
        if (!entity.center || !entity.radius) return;
        const { x, y } = entity.center;
        push(
          entity,
          `<circle cx="${round(x)}" cy="${round(y)}" r="${round(entity.radius)}" fill="none" />`,
          [
            [x - entity.radius, y - entity.radius],
            [x + entity.radius, y + entity.radius],
          ],
        );
        return;
      }
      case 'ARC': {
        if (!entity.center || !entity.radius) return;
        const toRad = (degrees) => (Number(degrees) * Math.PI) / 180;
        const start = toRad(entity.startAngle);
        const end = toRad(entity.endAngle);
        const { x, y } = entity.center;
        const startPoint = { x: x + entity.radius * Math.cos(start), y: y + entity.radius * Math.sin(start) };
        const endPoint = { x: x + entity.radius * Math.cos(end), y: y + entity.radius * Math.sin(end) };
        const sweep = (end - start + Math.PI * 2) % (Math.PI * 2);
        const large = sweep > Math.PI ? 1 : 0;
        push(
          entity,
          `<path d="M ${round(startPoint.x)} ${round(startPoint.y)} A ${round(entity.radius)} ${round(entity.radius)} 0 ${large} 1 ${round(endPoint.x)} ${round(endPoint.y)}" fill="none" />`,
          [
            [x - entity.radius, y - entity.radius],
            [x + entity.radius, y + entity.radius],
          ],
        );
        return;
      }
      case 'TEXT':
      case 'MTEXT': {
        const point = entity.startPoint || entity.position;
        if (!point) return;
        const height = Number(entity.height) || 2.5;
        const rotation = Number(entity.rotation) || 0;
        push(
          entity,
          `<text x="0" y="0" font-size="${round(height)}" transform="translate(${round(point.x)} ${round(point.y)}) rotate(${round(rotation)}) scale(1 -1)" fill="currentColor">${escapeXml(entity.text || '')}</text>`,
          [[point.x, point.y]],
        );
        return;
      }
      case 'SOLID':
      case '3DFACE': {
        const points = (entity.vertices || []).map((vertex) => [vertex.x, vertex.y]);
        if (points.length < 3) return;
        push(entity, `<polygon points="${points.map(([x, y]) => `${round(x)},${round(y)}`).join(' ')}" />`, points);
        return;
      }
      case 'SPLINE': {
        const points = (entity.fitPoints || entity.controlPoints || []).map((point) => [point.x, point.y]);
        if (points.length < 2) return;
        push(entity, `<path d="M ${points.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L ')}" fill="none" />`, points);
        return;
      }
      default:
        skipped.add(entity.type);
    }
  });

  if (!shapes.length) {
    throw new Error('No supported drawing entities were found in this DXF file.');
  }

  const padding = Math.max((bounds.maxX - bounds.minX) * 0.03, (bounds.maxY - bounds.minY) * 0.03, 1);
  const minX = bounds.minX - padding;
  const minY = bounds.minY - padding;
  const width = Math.max(bounds.maxX - bounds.minX + padding * 2, 1);
  const height = Math.max(bounds.maxY - bounds.minY + padding * 2, 1);
  const flip = bounds.minY + bounds.maxY;

  const layers = [...layerSet];
  const layerGroups = layers
    .map((layer) => {
      const layerShapes = shapes.filter((shape) => shape.layer === layer);
      return `<g id="layer-${escapeXml(layer).replace(/\s+/g, '-')}" data-layer="${escapeXml(layer)}" stroke="currentColor" stroke-width="${round(Math.max(width, height) / 1400)}" fill="none" vector-effect="non-scaling-stroke">${layerShapes
        .map((shape) => `<g${shape.color ? ` stroke="${shape.color}" color="${shape.color}"` : ''}>${shape.markup}</g>`)
        .join('')}</g>`;
    })
    .join('');

  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(minX)} ${round(minY)} ${round(width)} ${round(height)}" preserveAspectRatio="xMidYMid meet"><g transform="translate(0 ${round(flip)}) scale(1 -1)" color="#0f172a">${layerGroups}</g></svg>`;

  return {
    svg: markup,
    viewBox: `${round(minX)} ${round(minY)} ${round(width)} ${round(height)}`,
    layers,
    entityCount: rendered,
    skipped: [...skipped],
  };
}
