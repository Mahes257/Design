import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Focus, Layers, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { previewCapability } from '../../../data/cadData';
import { dxfToSvg } from './dxfToSvg';

/**
 * 2D drawing viewer.
 *
 * SVG is parsed and rendered as real vector markup — zoom, pan, layer
 * visibility and sheet navigation all operate on that geometry.
 * PDF uses the browser's own PDF engine (embedded frame), and raster images
 * use the browser decoder. Nothing is converted or faked.
 */
export default function Viewer2D({ file, sources = [], onNotify }) {
  const stageRef = useRef(null);
  const viewportRef = useRef(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [viewBox, setViewBox] = useState('');
  const [layers, setLayers] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const dragRef = useRef(null);

  const capability = previewCapability(file?.fileName || '');
  const mode = capability.mode;
  const source = sources[sheetIndex] || sources[0] || null;
  const sourceUrl = source?.url || source?.assetPath || '';
  const ext = sourceUrl.split('.').pop()?.toLowerCase()
    || String(file?.fileName || '').split('.').pop()?.toLowerCase();

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
    setSheetIndex(0);
    setSvgMarkup('');
    setLayers([]);
  }, [file?.id, resetView]);

  useEffect(() => {
    if (mode !== '2d-dxf' || !sourceUrl) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setSvgMarkup('');
    setLayers([]);
    fetch(sourceUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`The DXF file could not be loaded (${response.status}).`);
        return response.text();
      })
      .then((text) => {
        if (!active) return;
        const result = dxfToSvg(text);
        setViewBox(result.viewBox);
        setSvgMarkup(result.svg);
        setLayers(result.layers.map((id) => ({ id: `layer-${id.replace(/\s+/g, '-')}`, label: id, visible: true })));
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'The DXF drawing could not be rendered.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sourceUrl, mode]);

  useEffect(() => {
    if (mode !== '2d-svg' || !sourceUrl) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setSvgMarkup('');
    fetch(sourceUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`The drawing could not be loaded (${response.status}).`);
        return response.text();
      })
      .then((text) => {
        if (!active) return;
        const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
        if (parsed.querySelector('parsererror')) throw new Error('The SVG drawing could not be parsed.');
        const root = parsed.documentElement;
        const found = [...root.children]
          .filter((node) => node.tagName?.toLowerCase() === 'g' && node.getAttribute('id'))
          .map((node) => ({ id: node.getAttribute('id'), visible: true }));
        setViewBox(root.getAttribute('viewBox') || '0 0 1000 700');
        setSvgMarkup(new XMLSerializer().serializeToString(root));
        setLayers(found);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'The drawing could not be loaded.');
        setLoading(false);
      });
    return () => { active = false; };
  }, [sourceUrl, mode]);

  useEffect(() => {
    const container = stageRef.current;
    if (!container || (mode !== '2d-svg' && mode !== '2d-dxf')) return;
    layers.forEach((layer) => {
      const node = container.querySelector(`svg [id="${CSS.escape(layer.id)}"]`);
      if (node) node.style.display = layer.visible ? '' : 'none';
    });
  }, [layers, svgMarkup, mode]);

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const zoomBy = (factor) => {
    setZoom((value) => Math.min(4, Math.max(0.25, Number((value * factor).toFixed(2)))));
  };

  const onPointerDown = (event) => {
    if (mode !== '2d-svg' && mode !== '2d-image' && mode !== '2d-dxf') return;
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, origin: pan };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.origin.x + (event.clientX - dragRef.current.startX),
      y: dragRef.current.origin.y + (event.clientY - dragRef.current.startY),
    });
  };
  const endDrag = () => { dragRef.current = null; };

  const toggleFullscreen = async () => {
    const node = viewportRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await node.requestFullscreen();
    } catch {
      onNotify?.('Fullscreen is not available in this browser context.', 'error');
    }
  };

  const download = () => {
    if (!source) return;
    const anchor = document.createElement('a');
    anchor.href = source.url || source.assetPath;
    anchor.download = source.name || file.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const sourcesCount = sources.length;
  const canZoom = mode === '2d-svg' || mode === '2d-image' || mode === '2d-dxf';

  const body = useMemo(() => {
    if (!source) {
      return (
        <div className="cad-viewer-empty">
          <Layers aria-hidden="true" />
          <strong>No drawing file attached</strong>
          <p>This record exists, but no file is attached to it in this browser session.</p>
        </div>
      );
    }
    if (loading) return <div className="cad-viewer-empty"><span className="cad-spinner" aria-hidden="true" /><strong>Loading drawing…</strong></div>;
    if (error) {
      return (
        <div className="cad-viewer-empty is-error">
          <strong>Unable to open the drawing</strong>
          <p>{error}</p>
        </div>
      );
    }

    if (mode === '2d-pdf') {
      return (
        <div className="cad-pdf-wrap">
          <iframe title={file?.fileName || 'PDF drawing'} src={source.url || source.assetPath} />
          <p className="cad-viewer-note">PDF rendered by the browser's built-in PDF engine. Page navigation and zoom are handled by that engine, not by this toolbar.</p>
        </div>
      );
    }

    if (mode === '2d-image') {
      return (
        <div className="cad-2d-image-wrap">
          <img
            src={source.url || source.assetPath}
            alt={file?.fileName || 'Drawing'}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            draggable={false}
          />
        </div>
      );
    }

    if (mode === '2d-svg' || mode === '2d-dxf') {
      return (
        <div className="cad-svg-wrap">
          <div
            className="cad-svg-transform"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        </div>
      );
    }

    return (
      <div className="cad-viewer-empty is-error">
        <strong>Preview unavailable for {ext?.toUpperCase() || 'this format'}</strong>
        <p>{capability.reason}</p>
        {source && <button type="button" className="button button-secondary button-sm" onClick={download}>Download original file</button>}
      </div>
    );
  }, [source, loading, error, mode, pan, zoom, svgMarkup, file, ext, capability.reason]);

  return (
    <div className={`cad-viewer cad-viewer-2d${fullscreen ? ' is-fullscreen' : ''}`} ref={viewportRef}>
      <div className="cad-viewer-toolbar">
        <span className="cad-viewer-mode">2D · {capability.label}</span>
        <div className="cad-toolgroup">
          <button type="button" className="icon-btn" title="Zoom in" aria-label="Zoom in" onClick={() => zoomBy(1.2)} disabled={!canZoom}>+</button>
          <button type="button" className="icon-btn" title="Zoom out" aria-label="Zoom out" onClick={() => zoomBy(0.8)} disabled={!canZoom}>−</button>
          <button type="button" className="cad-tool-btn" onClick={resetView} disabled={!canZoom} title="Fit to screen"><Focus aria-hidden="true" /><span>Fit</span></button>
          <button type="button" className="cad-tool-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset view"><RotateCcw aria-hidden="true" /><span>Reset</span></button>
        </div>
        <div className="cad-toolgroup cad-toolgroup-right">
          <span className="cad-zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" className="cad-tool-btn" onClick={toggleFullscreen} title="Fullscreen">
            {fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}<span>{fullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      <div className="cad-viewer-body">
        {(mode === '2d-svg' || mode === '2d-dxf') && layers.length > 0 && (
          <aside className="cad-layers">
            <div className="cad-panel-head"><Layers aria-hidden="true" /><strong>Layers</strong></div>
            <ul>
              {layers.map((layer) => (
                <li key={layer.id}>
                  <button
                    type="button"
                    className="cad-layer-row"
                    onClick={() => setLayers((previous) => previous.map((row) => (row.id === layer.id ? { ...row, visible: !row.visible } : row)))}
                    aria-pressed={layer.visible}
                  >
                    {layer.visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    <span>{(layer.label || layer.id).replaceAll('_', ' ')}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="cad-mini-link" onClick={() => setLayers((previous) => previous.map((row) => ({ ...row, visible: true })))}>Show all layers</button>
          </aside>
        )}

        <div
          className={`cad-2d-stage${canZoom ? ' is-draggable' : ''}`}
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          style={{ cursor: dragRef.current ? 'grabbing' : canZoom ? 'grab' : 'default' }}
        >
          {body}
        </div>
      </div>

      <div className="cad-viewer-footer">
        <div className="cad-sheets">
          {sources.map((entry, index) => (
            <button
              key={`${entry.name}-${index}`}
              type="button"
              className={`cad-sheet-tab${index === sheetIndex ? ' is-active' : ''}`}
              onClick={() => { setSheetIndex(index); resetView(); }}
            >
              {entry.name || `Sheet ${index + 1}`}
            </button>
          ))}
          {sourcesCount === 0 && <span className="cell-muted">No sheets attached</span>}
        </div>
        <span className="cad-viewer-scale">{viewBox ? `viewBox ${viewBox}` : `${sourcesCount || 1} sheet${sourcesCount === 1 ? '' : 's'}`}</span>
      </div>
    </div>
  );
}
