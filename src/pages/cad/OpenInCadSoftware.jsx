import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Box,
  Check,
  CheckCircle2,
  Download,
  DraftingCompass,
  ExternalLink,
  FileText,
  Layers,
  MonitorDown,
  Shapes,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '../../components/common';
import {
  compatibleCadApplications,
  isApprovedCadApplication,
  protocolUrlFor,
} from '../../data/cadApplications';
import { extensionOf, formatBytes } from '../../data/cadData';
import {
  CAD_BRIDGE_START_COMMAND,
  absoluteFileUrl,
  launchViaProtocol,
  probeCadBridge,
  requestBridgeOpen,
  resetCadBridgeCache,
} from '../../data/cadLaunch';

/**
 * Open in CAD Software — the one shared application-selection and launch flow.
 *
 * Both the CAD module (viewer, repository, drawing register, drawing
 * attachments) and Engineering Analysis → Simulation Workspace open this same
 * dialog with their own source context. Only the original file of the selected
 * record is ever handed to an application.
 *
 * What the dialog can and cannot claim:
 *  - it can list applications that are compatible with the real extension;
 *  - it can report installation ONLY when the optional local CAD bridge reports
 *    it (a web page cannot enumerate Windows programs);
 *  - it can launch through the bridge, or through a vendor-documented protocol
 *    handler (Autodesk Fusion's fusion360:// only);
 *  - it never reports success from the attempt alone, and it never substitutes
 *    one application for another.
 *
 * No application is ever preselected, nothing launches when the dialog opens,
 * and Fusion 360 has no default or permanent button of its own.
 */

/** Resolve the original file bytes for a record. */
export function resolveOriginalFile({ fileName, assetPath, localEntry } = {}) {
  if (localEntry?.url) {
    return {
      available: true,
      url: localEntry.url,
      fileName: localEntry.name || fileName,
      origin: 'session',
      size: localEntry.size,
    };
  }
  if (assetPath) {
    return { available: true, url: assetPath, fileName, origin: 'bundled', size: null };
  }
  return { available: false, url: '', fileName, origin: 'none', size: null };
}

export function downloadOriginalFile(file) {
  if (!file?.available || !file.url) return false;
  const anchor = document.createElement('a');
  anchor.href = file.url;
  anchor.download = file.fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return true;
}

const ORIGIN_LABEL = {
  session: 'Browser session upload',
  bundled: 'Stored in this workspace',
  none: 'No bytes stored',
};

const KIND_ICON = {
  cad3d: Box,
  cad2d: DraftingCompass,
  viewer: MonitorDown,
  mesh: Layers,
  vector: Shapes,
  pdf: FileText,
};

function AppCard({ app, selected, statusText, onSelect }) {
  const Icon = KIND_ICON[app.kind] || Wrench;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`cad-app-card${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(app)}
    >
      <span className="cad-app-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="cad-app-main">
        <strong>{app.name}</strong>
        <span className="cad-app-publisher">{app.publisher}</span>
        <span className="cad-app-tags">
          <span className={`cad-app-role is-${app.role}`}>{app.roleLabel}</span>
          <span className="cad-app-status">{statusText}</span>
        </span>
      </span>
      <span className="cad-app-check" aria-hidden="true">
        {selected ? <Check /> : null}
      </span>
    </button>
  );
}

export function OpenInCadDialog({
  open,
  onClose,
  fileName,
  assetPath,
  localEntry,
  recordRef,
  sourceModule = 'Drawing & CAD Management → CAD Viewer',
  sourceRef = '',
  context = [],
  externalUrl = '',
}) {
  const [selectedId, setSelectedId] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [bridge, setBridge] = useState({ status: 'idle', apps: [], message: '' });
  const [launch, setLaunch] = useState({ state: 'idle' });

  const original = resolveOriginalFile({ fileName, assetPath, localEntry });
  const effectiveName = original.fileName || fileName || '';
  const extension = extensionOf(effectiveName);
  const compatibility = compatibleCadApplications(effectiveName);
  const fileUrl = absoluteFileUrl(original.url);
  const blobUrl = original.origin === 'session' && original.url ? original.url : null;

  // A different selected file must never reuse the previous application choice
  // or launch outcome.
  useEffect(() => {
    setSelectedId('');
    setLaunch({ state: 'idle' });
    setDownloaded(false);
  }, [open, effectiveName, assetPath, externalUrl]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setBridge({ status: 'checking', apps: [], message: '' });
    probeCadBridge().then((result) => {
      if (cancelled) return;
      setBridge(
        result.available
          ? { status: 'ready', apps: result.apps, message: result.version ? `Bridge ${result.version}` : '' }
          : { status: 'unavailable', apps: [], message: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selected = compatibility.apps.find((app) => app.id === selectedId) || null;
  const detectedApp = (
    selected && bridge.status === 'ready'
      ? bridge.apps.find((app) => app.applicationId === selected.id)
      : null
  );
  const detectedForExtension = Boolean(
    detectedApp && detectedApp.extensions.includes(extension),
  );
  const protocolUrl = selected ? protocolUrlFor(selected, { fileUrl }) : null;
  const approvedSelection = Boolean(selected && isApprovedCadApplication(selected.id));
  // A launch is only offered when a verified mechanism exists for this exact
  // selection: the bridge reported the application for this extension, or the
  // vendor documents a protocol handler. Otherwise the action is disabled and
  // the download path is used instead.
  const hasLaunchMechanism = Boolean(detectedForExtension || protocolUrl);
  const canAttemptLaunch = Boolean(selected) && original.available && hasLaunchMechanism;

  const statusFor = (app) => {
    if (bridge.status === 'ready') {
      const row = bridge.apps.find((item) => item.applicationId === app.id);
      if (row) {
        return row.extensions.includes(extension)
          ? 'Installed and available'
          : 'Not detected for this format';
      }
      return 'Not installed on this computer';
    }
    if (bridge.status === 'checking') return 'Installation status not detected';
    return 'Installation status not detected';
  };

  const recheck = () => {
    resetCadBridgeCache();
    setBridge({ status: 'checking', apps: [], message: '' });
    probeCadBridge({ force: true }).then((result) => {
      setBridge(
        result.available
          ? { status: 'ready', apps: result.apps, message: result.version ? `Bridge ${result.version}` : '' }
          : { status: 'unavailable', apps: [], message: result.message },
      );
    });
  };

  const openWithBridge = async (app) => {
    // `app` is the bridge row (applicationId + name); the catalogue id is the
    // selected one, and it is what the dialog uses to keep this result tied to
    // the exact application that was launched.
    const appId = selected?.id || app.applicationId;
    const appName = selected?.name || app.name;
    setLaunch({ state: 'launching', appName, appId });
    const result = await requestBridgeOpen({
      applicationId: app.applicationId,
      fileName: effectiveName,
      recordRef: sourceRef || recordRef || '',
      fileUrl,
      blobUrl,
    });
    setLaunch(
      result.ok
        ? { state: 'handoff', appName, appId, message: result.message }
        : { state: 'error', appName, appId, message: result.message },
    );
  };

  const openViaProtocol = async (app) => {
    setLaunch({ state: 'launching', appName: app.name, appId: app.id });
    const result = await launchViaProtocol(protocolUrl);
    if (result.outcome === 'handoff') {
      setLaunch({
        state: 'handoff',
        appName: app.name,
        appId: app.id,
        message: `Windows received the launch request for ${app.name}.`,
      });
      return;
    }
    if (result.outcome === 'error') {
      setLaunch({ state: 'error', appName: app.name, appId: app.id, message: result.message });
      return;
    }
    setLaunch({
      state: 'unconfirmed',
      appName: app.name,
      appId: app.id,
      message:
        'The application launch was requested, but completion could not be verified. The handler may not be registered, the browser may have blocked the request, or the permission prompt may have been dismissed.',
    });
  };

  /** Launch only the explicitly selected application — never a fallback. */
  const launchSelected = async () => {
    if (!selected || !approvedSelection) return;
    if (!original.available) {
      setLaunch({
        state: 'error',
        appName: selected.name,
        appId: selected.id,
        message: 'Original file is unavailable. This record contains metadata only.',
      });
      return;
    }
    if (detectedForExtension && detectedApp) {
      await openWithBridge(detectedApp);
      return;
    }
    if (selected.protocol) {
      if (protocolUrl) {
        await openViaProtocol(selected);
        return;
      }
      setLaunch({
        state: 'unavailable',
        appName: selected.name,
        appId: selected.id,
        message: `${selected.name} is not detected or could not be launched on this computer. Its documented handler needs an http(s) file reference, and a browser-session upload has no such address.`,
      });
      return;
    }
    setLaunch({
      state: 'unavailable',
      appName: selected.name,
      appId: selected.id,
      message:
        bridge.status === 'ready'
          ? `${selected.name} is not detected or could not be launched on this computer. The local CAD bridge did not report it as installed.`
          : `${selected.name} is not detected or could not be launched on this computer. A browser cannot enumerate installed programs or start an executable without the optional local CAD bridge.`,
    });
  };

  const handleDownload = () => {
    if (downloadOriginalFile(original)) setDownloaded(true);
  };

  const launchIsCurrent = launch.appId && launch.appId === selected?.id;
  const busy = launch.state === 'launching';
  const primaryLabel = selected ? `Open in ${selected.name}` : 'Select an application';
  const groups = [
    { key: 'native', title: 'Native format', apps: compatibility.nativeApps },
    { key: 'import', title: 'Import support', apps: compatibility.importApps },
    { key: 'view', title: 'Preview-only support', apps: compatibility.viewApps },
  ].filter((group) => group.apps.length > 0);

  return (
    <div
      className="cad-open-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="cad-open-dialog" role="dialog" aria-modal="true" aria-labelledby="cad-open-title">
        <header className="cad-open-head">
          <div>
            <span className="cad-open-kicker">Open in CAD Software</span>
            <h2 id="cad-open-title">{original.fileName || 'No file selected'}</h2>
            <div className="cad-open-meta">
              <span><em>File ID</em>{recordRef || '—'}</span>
              <span><em>Extension</em>{extension ? `.${extension}` : 'Unknown'}</span>
              <span><em>Size</em>{original.size ? formatBytes(original.size) : 'Not recorded'}</span>
              <span><em>Source</em>{ORIGIN_LABEL[original.origin]}</span>
              <span><em>Module</em>{sourceModule}</span>
              {sourceRef && <span><em>Source record</em>{sourceRef}</span>}
              {context.map((row) => (
                <span key={row.label}><em>{row.label}</em>{row.value || '—'}</span>
              ))}
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="cad-open-body">
          {externalUrl && !original.available && (
            <section className="cad-open-block is-info">
              <span className="cad-open-block-icon"><ExternalLink aria-hidden="true" /></span>
              <div>
                <strong>This record is an external URL, not a stored file</strong>
                <p>
                  It cannot be launched as a local CAD file, and it is not a convert of any other
                  file. Open the original external URL in the browser instead — the existing URL
                  preview behaviour is unchanged.
                </p>
                <div className="cad-open-actions">
                  <a className="button button-secondary button-sm" href={externalUrl} target="_blank" rel="noreferrer noopener">
                    <ExternalLink aria-hidden="true" /> Open external URL
                  </a>
                </div>
              </div>
            </section>
          )}

          {!original.available && !externalUrl && (
            <section className="cad-open-block is-warning">
              <span className="cad-open-block-icon"><AlertTriangle aria-hidden="true" /></span>
              <div>
                <strong>Original file is unavailable. This record contains metadata only.</strong>
                <p>
                  The ERP stores the record, its filename and its metadata, but no original bytes
                  exist for it in this browser session, so nothing can be handed to an application.
                  Re-upload or link the original file through the repository before opening it in
                  CAD software. No application will be launched.
                </p>
              </div>
            </section>
          )}

          <section
            className={`cad-open-detect is-${bridge.status}`}
            aria-live="polite"
          >
            {bridge.status === 'checking' && (
              <>
                <span className="cad-open-spinner" aria-hidden="true" />
                <span>Checking this computer for the optional local CAD bridge…</span>
              </>
            )}
            {bridge.status === 'ready' && (
              <>
                <CheckCircle2 aria-hidden="true" />
                <span>
                  Local CAD bridge connected{bridge.message ? ` (${bridge.message})` : ''} —{' '}
                  {bridge.apps.length === 0
                    ? 'it reported no installed CAD applications.'
                    : `${bridge.apps.length} installed application${bridge.apps.length === 1 ? '' : 's'} reported.`}
                </span>
              </>
            )}
            {bridge.status === 'unavailable' && (
              <>
                <MonitorDown aria-hidden="true" />
                <span>
                  <strong>
                    {bridge.message ||
                      'Local CAD Bridge is not running on this computer. Install/start the CAD Bridge on this device and retry.'}
                  </strong>{' '}
                  Installation status is detected per device: the bridge must run on the computer
                  whose browser is using the ERP, not on the computer that hosts the ERP. A web page
                  cannot inspect another computer's installed programs.
                </span>
                <Button variant="ghost" size="sm" icon={ShieldCheck} onClick={recheck}>
                  Connect / Retry
                </Button>
                <span className="cad-open-bridge-hint">
                  On this device, run <code>tools\cad-bridge\start-bridge.cmd</code> (or install it
                  for automatic sign-in with <code>install-startup.ps1</code>) and then choose{' '}
                  <strong>Connect / Retry</strong>. Firefox may ask once to allow this page to reach
                  a service on this computer. Development command:{' '}
                  <code>{CAD_BRIDGE_START_COMMAND}</code>. Only Autodesk Fusion publishes a documented
                  browser protocol, and it is used only when you select Fusion.
                </span>
              </>
            )}
          </section>

          <section className="cad-open-section">
            <div className="cad-open-section-head">
              <strong>Choose the application to open this file in</strong>
              <span className="cell-muted">
                Compatible with {extension ? `.${extension.toUpperCase()}` : 'this format'} · nothing is selected for you
              </span>
            </div>

            {compatibility.hasCompatibleApplication ? (
              <div className="cad-open-groups" role="radiogroup" aria-label="Compatible CAD applications">
                {groups.map((group) => (
                  <div key={group.key} className="cad-open-group">
                    <span className="cad-open-group-label">{group.title}</span>
                    <div className="cad-app-grid">
                      {group.apps.map((app) => (
                        <AppCard
                          key={app.id}
                          app={app}
                          selected={selectedId === app.id}
                          statusText={statusFor(app)}
                          onSelect={(row) => {
                            setSelectedId(row.id);
                            setLaunch({ state: 'idle' });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="cad-open-empty">
                No compatible application is available for this file format
                {extension ? ` (.${extension})` : ''}. The original file can still be downloaded
                unchanged and opened with whatever handles it on this computer.
              </p>
            )}
          </section>

          {selected && original.available && (
            <section className="cad-open-selected" aria-live="polite">
              <div>
                <strong>{selected.name} selected</strong>
                <span className="cell-muted">
                  {detectedForExtension
                    ? 'Reported as installed by the local CAD bridge on this computer for this extension.'
                    : selected.protocol
                      ? `Documented handler: ${selected.protocol.scheme}:// — ${selected.protocol.vendor}.`
                      : bridge.status === 'ready'
                        ? `${selected.name} is not installed on this computer.`
                        : 'No installed copy has been reported on this computer.'}
                </span>
              </div>
              <span className={`cad-app-role is-${selected.role}`}>{selected.roleLabel}</span>
            </section>
          )}

          {selected && original.available && !hasLaunchMechanism && (
            <p className="cad-open-note" role="status">
              <strong>
                {bridge.status !== 'ready'
                  ? `No verified launch mechanism is available for ${selected.name} on this computer.`
                  : bridge.apps.some((app) => app.applicationId === selected.id)
                    ? `${selected.name} is installed on this computer but cannot open .${extension} files.`
                    : `${selected.name} is not installed on this computer.`}
              </strong>{' '}
              {bridge.status !== 'ready'
                ? `Start the local CAD bridge on this device (${CAD_BRIDGE_START_COMMAND}) and use Connect / Retry — or download the original below and open it from Windows.`
                : 'No other application is substituted for it. Download the original below and open it from Windows if you need it in another program.'}{' '}
              The launch action stays disabled so no other application is started in its place.
            </p>
          )}

          {launch.state !== 'idle' && launchIsCurrent && launch.state !== 'launching' && (
            <section
              className={`cad-open-result${
                launch.state === 'handoff'
                  ? ' is-ok'
                  : launch.state === 'error'
                    ? ' is-error'
                    : ' is-warn'
              }`}
              role="status"
              aria-live="polite"
            >
              {launch.state === 'handoff' ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
              <div className="cad-open-result-body">
                {launch.state === 'handoff' && (
                  <>
                    <strong>Opening the selected file in {launch.appName}…</strong>
                    <span>
                      {launch.message} The original file was handed over unchanged; this page cannot
                      confirm that the application finished loading it.
                    </span>
                  </>
                )}
                {launch.state === 'unconfirmed' && (
                  <>
                    <strong>Launch of {launch.appName} could not be confirmed</strong>
                    <span>{launch.message}</span>
                  </>
                )}
                {launch.state === 'unavailable' && (
                  <>
                    <strong>Could not open the file in {launch.appName}</strong>
                    <span>{launch.message}</span>
                  </>
                )}
                {launch.state === 'error' && (
                  <>
                    <strong>Could not open the file in {launch.appName || 'the selected application'}</strong>
                    <span>{launch.message}</span>
                  </>
                )}
                <div className="cad-open-actions">
                  <Button variant="secondary" size="sm" icon={MonitorDown} disabled={busy || !original.available} onClick={launchSelected}>
                    Retry
                  </Button>
                  <Button variant="secondary" size="sm" icon={Download} onClick={handleDownload} disabled={!original.available}>
                    Download Original File
                  </Button>
                </div>
              </div>
            </section>
          )}

          <section className="cad-open-section">
            <div className="cad-open-section-head">
              <strong>Opening the original file</strong>
              <span className="cell-muted">Never a preview, PDF or generated copy</span>
            </div>
            <p className="cad-open-note">
              {detectedForExtension ? (
                <>
                  <strong>No browser permission prompt is involved.</strong> The ERP asks the local
                  CAD bridge on this computer, which starts only the application you selected with
                  the original file. The bridge reports that the program was started; it does not
                  claim that the application finished loading the file.
                </>
              ) : (
                <>
                  <strong>The browser may ask permission to open an external application.</strong>{' '}
                  Allow it if you trust the selected program — the ERP cannot grant that permission
                  for you and never bypasses the browser prompt. If Windows has no handler for the
                  chosen application, nothing starts; the dialog reports that instead of claiming
                  success.
                </>
              )}
            </p>
            <ol className="cad-open-steps">
              <li>The exact selected original is handed over: same filename, same extension, same contents, unmodified.</li>
              <li>The action button only ever targets the application you selected. No fallback application is used.</li>
              <li>If the launch is unavailable, download the original and open it from Windows with <em>Open with</em>.</li>
            </ol>
            <div className="cad-open-actions">
              <Button
                icon={downloaded ? CheckCircle2 : Download}
                onClick={handleDownload}
                disabled={!original.available}
              >
                {downloaded ? 'Downloaded — open it from Windows' : 'Download Original File'}
              </Button>
              {downloaded && (
                <span className="cad-open-success" role="status">
                  <CheckCircle2 aria-hidden="true" /> File saved with its original name. It was not modified.
                </span>
              )}
            </div>
            <p className="cad-open-note cad-open-fineprint">
              Compatibility is a format reference, not proof of installation. Installation status is
              only shown when the local CAD bridge reports it; otherwise it stays
              &ldquo;Installation status not detected&rdquo; — never &ldquo;confirmed not installed&rdquo;.
            </p>
          </section>
        </div>

        <footer className="cad-open-foot">
          <span className="cell-muted">
            <ExternalLink aria-hidden="true" /> {sourceModule}
            {sourceRef ? ` · ${sourceRef}` : ''}
          </span>
          <div className="cad-open-foot-actions">
            <Button variant="secondary" onClick={handleDownload} disabled={!original.available}>
              Download Original
            </Button>
            <Button
              icon={MonitorDown}
              onClick={launchSelected}
              disabled={!canAttemptLaunch || busy || !approvedSelection}
              title={
                !selected
                  ? 'Select a compatible application first'
                  : !original.available
                    ? 'The original file is unavailable for this record'
                    : hasLaunchMechanism
                      ? `Open the original file only in ${selected.name}`
                      : `No verified launch mechanism for ${selected.name} on this computer`
              }
            >
              {busy ? `Opening the selected file in ${launch.appName}…` : primaryLabel}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Drop-in button with its own dialog state. */
export default function OpenInCadSoftwareButton({
  fileName,
  assetPath,
  localEntry,
  recordRef,
  sourceModule,
  sourceRef,
  context,
  externalUrl,
  size = 'sm',
  variant = 'secondary',
  className = '',
  label = 'Open in CAD Software',
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={size}
        variant={variant}
        icon={MonitorDown}
        className={className}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <OpenInCadDialog
        open={open}
        onClose={() => setOpen(false)}
        fileName={fileName}
        assetPath={assetPath}
        localEntry={localEntry}
        recordRef={recordRef}
        sourceModule={sourceModule}
        sourceRef={sourceRef}
        context={context}
        externalUrl={externalUrl}
      />
    </>
  );
}
