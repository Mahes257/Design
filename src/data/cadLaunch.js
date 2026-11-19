/**
 * Launching an original CAD / drawing file in an installed application.
 *
 * Two mechanisms exist, in this order of reliability:
 *
 *  1. The optional local CAD bridge (`tools/cad-bridge`, started separately with
 *     `npm run cad-bridge`). It reports the applications actually installed on
 *     the computer and opens the original file with the chosen one. It is a
 *     separate process, not part of the browser bundle, so `probeCadBridge()`
 *     honestly reports "not available" whenever it is not running.
 *
 *  2. A documented vendor protocol handler (currently Autodesk Fusion's
 *     `fusion360://`). The browser hands the request to Windows, which may ask
 *     the user for permission, then starts the registered application.
 *
 * Neither mechanism lets a web page enumerate installed programs or run an
 * arbitrary executable, and neither is ever reported as successful from the
 * attempt alone.
 */

import {extensionOf} from './cadData';
import {isApprovedCadApplication} from './cadApplications';

/**
 * Loopback origin of the optional local CAD bridge. It must match the port the
 * helper listens on; override with VITE_CAD_BRIDGE_ORIGIN.
 */
export const CAD_BRIDGE_ORIGIN = (
  import.meta.env?.VITE_CAD_BRIDGE_ORIGIN || 'http://127.0.0.1:47823'
).replace(/\/+$/, '');

export const CAD_BRIDGE_SERVICE = 'mechanical-design-cad-bridge';

/** How the local helper is started (nothing starts it automatically). */
export const CAD_BRIDGE_START_COMMAND = 'npm run cad-bridge';

/**
 * Absolute http(s) URL for a stored file reference.
 *
 * Only http/https can be handed to an external program; `blob:` (browser memory)
 * and `data:` URLs cannot be read by another process, so they return null.
 */
export function absoluteFileUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    return null;
  } catch {
    return null;
  }
}

/**
 * Trigger a protocol-handler launch from an explicit user gesture.
 *
 * Browsers give no API to ask "is this scheme registered?", and a declined or
 * unregistered launch throws nothing. The only browser-observable signal is
 * whether the page lost focus shortly after the request, which is what we
 * report: `handoff` (Windows took the request), `unconfirmed` (nothing observed)
 * or `error` (the request could not be issued).
 */
export function launchViaProtocol(url, { timeoutMs = 3000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;

    const cleanup = () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timer) clearTimeout(timer);
    };

    const finish = (outcome) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    };

    function onBlur() {
      finish({ outcome: 'handoff' });
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') finish({ outcome: 'handoff' });
    }

    if (!url) {
      resolve({ outcome: 'error', message: 'No launch URL could be built for this file.' });
      return;
    }

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      finish({
        outcome: 'error',
        message: error?.message || 'The browser refused to open the registered application.',
      });
      return;
    }

    timer = setTimeout(() => finish({ outcome: 'unconfirmed' }), timeoutMs);
  });
}

/* --- optional local bridge ---------------------------------------------- */

let bridgeProbe = null;

function isReportedApplication(row) {
  return (
    row &&
    typeof row.applicationId === 'string' &&
    typeof row.name === 'string' &&
    row.installed === true &&
    Array.isArray(row.extensions)
  );
}

function normaliseExtension(value) {
  return String(value || '').replace(/^\./, '').toLowerCase();
}

/**
 * Ask the optional local helper which compatible applications are installed.
 * Never throws: a missing helper is a first-class result, not an error.
 */
export async function probeCadBridge({ force = false } = {}) {
  if (force) bridgeProbe = null;
  // Only a successful probe is cached. A failure is retried the next time the
  // dialog opens, so starting the bridge later is picked up without a reload.
  if (bridgeProbe?.available) return bridgeProbe;

  const probe = (async () => {
    if (!CAD_BRIDGE_ORIGIN) {
      return { available: false, apps: [], reason: 'disabled', message: 'No bridge origin configured.' };
    }
    const controller = new AbortController();
    // The helper scans the Windows registry on first use, which can take a few
    // seconds on a cold start; it answers immediately once cached.
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      // A forced probe ("Check again") asks the bridge to re-read the registry,
      // so an application installed after the bridge started is reported
      // without restarting the helper.
      const response = await fetch(
        `${CAD_BRIDGE_ORIGIN}/cad-bridge/capabilities${force ? '?refresh=1' : ''}`,
        {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        return {
          available: false,
          apps: [],
          reason: response.status === 403 ? 'origin-rejected' : `http-${response.status}`,
          message:
            response.status === 403
              ? `The CAD bridge on this computer does not allow the origin ${window.location.origin}. Start it with this origin in CAD_BRIDGE_ALLOWED_ORIGINS (local and private-network origins are accepted automatically).`
              : `The local CAD bridge answered with HTTP ${response.status}.`,
        };
      }
      const payload = await response.json();
      if (payload?.service !== CAD_BRIDGE_SERVICE) {
        return {
          available: false,
          apps: [],
          reason: 'unexpected-service',
          message: 'Something answered on the bridge port but did not identify as the CAD bridge.',
        };
      }
      const apps = (Array.isArray(payload.applications) ? payload.applications : [])
        .filter(isReportedApplication)
        .map((row) => ({
          applicationId: row.applicationId,
          name: row.name,
          version: typeof row.version === 'string' ? row.version : '',
          executable: typeof row.executable === 'string' ? row.executable : '',
          extensions: row.extensions.map(normaliseExtension).filter(Boolean),
        }));
      return { available: true, apps, version: payload.version || '', reason: '', message: '' };
    } catch (error) {
      const timedOut = error?.name === 'AbortError';
      const httpsPage = window.location?.protocol === 'https:';
      const loopbackHttp = CAD_BRIDGE_ORIGIN.startsWith('http://');
      return {
        available: false,
        apps: [],
        reason: timedOut ? 'timeout' : 'not-running',
        message: timedOut
          ? 'The local CAD bridge on this computer did not answer in time. It may still be scanning the registry — retry in a moment.'
          : httpsPage && loopbackHttp
            ? 'Local CAD Bridge is not running on this computer, and this HTTPS page may also be blocked from calling http://127.0.0.1. Start/install the CAD Bridge on this device and retry, or serve the ERP over HTTP on the local network.'
            : 'Local CAD Bridge is not running on this computer. Install/start the CAD Bridge on this device and retry.',
      };
    } finally {
      clearTimeout(timer);
    }
  })();

  const result = await probe;
  if (result.available) bridgeProbe = result;
  return result;
}

export function resetCadBridgeCache() {
  bridgeProbe = null;
}

/**
 * The bridge may only launch applications from the shared ERP catalogue, and
 * only for an original file that actually has an extension. This rejects an
 * arbitrary executable id or a command masquerading as an application id before
 * anything leaves the page.
 */
export function validateBridgeLaunch({ applicationId, fileName }) {
  if (!isApprovedCadApplication(applicationId)) {
    return { ok: false, message: 'That application is not in the approved CAD application catalogue.' };
  }
  if (!extensionOf(fileName)) {
    return { ok: false, message: 'The selected file has no extension, so no application can be targeted.' };
  }
  return { ok: true, message: '' };
}

/**
 * Ask the local helper to open the original file with a specific application.
 *
 * The browser sends the actual bytes whenever it can read them, because the
 * bridge runs on the *client* device: a path or URL that only the ERP host can
 * reach would be useless there. Browser-memory uploads are read from their
 * `blob:` URL; stored files are fetched by the page itself and posted as
 * multipart with their original filename. Only if the page cannot read the
 * stored file (or it exceeds the bridge's upload limit) does it ask the bridge
 * to fetch the URL itself from an allowed origin.
 */
export async function requestBridgeOpen({
  applicationId,
  fileName,
  recordRef = '',
  fileUrl = null,
  blobUrl = null,
}) {
  if (!applicationId) {
    return { ok: false, message: 'No application was selected.' };
  }
  const guard = validateBridgeLaunch({ applicationId, fileName });
  if (!guard.ok) return guard;
  if (!blobUrl && !fileUrl) {
    return { ok: false, message: 'The original file reference is not available for a direct launch.' };
  }

  let body;
  let headers = { Accept: 'application/json' };

  const multipartFor = (blob) => {
    const form = new FormData();
    form.append('applicationId', applicationId);
    form.append('fileName', fileName || 'drawing');
    form.append('recordRef', recordRef);
    form.append('file', new File([blob], fileName || 'drawing'));
    return form;
  };

  try {
    if (blobUrl) {
      const bytes = await fetch(blobUrl).then((response) => {
        if (!response.ok) throw new Error(`The browser-memory file could not be read (HTTP ${response.status}).`);
        return response.blob();
      });
      body = multipartFor(bytes);
    } else {
      // Read the original in this browser so the client device is guaranteed to
      // have the bytes. Fall back to the URL form only when the page cannot read
      // the file or it is too large for the bridge's upload limit.
      let sentBytes = false;
      try {
        const response = await fetch(fileUrl, { credentials: 'omit', cache: 'no-store' });
        if (response.ok) {
          const length = Number(response.headers.get('content-length') || 0);
          if (!length || length <= 100 * 1024 * 1024) {
            body = multipartFor(await response.blob());
            sentBytes = true;
          }
        }
      } catch {
        // Cross-origin or unreachable for the page; let the bridge try below.
      }
      if (!sentBytes) {
        headers = { ...headers, 'Content-Type': 'application/json' };
        body = JSON.stringify({ applicationId, fileName, recordRef, fileUrl });
      }
    }

    const response = await fetch(`${CAD_BRIDGE_ORIGIN}/cad-bridge/open`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers,
      body,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        message:
          payload?.error ||
          `The local CAD bridge rejected the request (HTTP ${response.status}).`,
      };
    }
    return {
      ok: payload?.opened === true,
      message:
        payload?.message ||
        (payload?.opened === true
          ? `The bridge handed the file to ${payload?.applicationName || applicationId}.`
          : 'The bridge did not confirm that the application opened the file.'),
    };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'The local CAD bridge could not be reached.',
    };
  }
}
