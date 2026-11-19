#!/usr/bin/env node
/**
 * Local Windows CAD bridge.
 *
 * Purpose: open an ERP-selected *original* CAD file in the *explicitly selected*
 * installed Windows application (SolidWorks, eDrawings, AutoCAD, FreeCAD …),
 * because a web page cannot enumerate installed programs or start an executable.
 *
 * Security model:
 *  - listens on 127.0.0.1 only;
 *  - accepts browser origins on localhost, loopback and private network addresses
 *    (plus any origin listed in CAD_BRIDGE_ALLOWED_ORIGINS) — no wildcard CORS;
 *  - is installed once per client computer, so each browser reaches its own bridge;
 *  - launches only application ids from ./catalogue.mjs, and only the executable
 *    path resolved from the Windows registry for that id;
 *  - never accepts an executable path, command, or arguments from the caller;
 *  - validates the file extension against the application's allowlist;
 *  - fetches `fileUrl` values only from allowlisted origins (no arbitrary SSRF);
 *  - writes the original bytes to a private temp folder preserving filename;
 *  - reports `opened` only when the process was actually spawned.
 *
 * Run:  node tools/cad-bridge/server.mjs
 * Stop: Ctrl+C (or terminate the node process).
 */

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import {
  BRIDGE_APPLICATIONS,
  BRIDGE_SERVICE,
  BRIDGE_VERSION,
  bridgeApplicationFor,
} from './catalogue.mjs';

const execFileAsync = promisify(execFile);

const HOST = '127.0.0.1';
const PORT = Number(process.env.CAD_BRIDGE_PORT || 47823);

/**
 * Extra origins allowed on top of the built-in local/LAN rule. The ERP may be
 * opened from any device on the LAN, so each browser sends its own origin
 * (`http://192.168.1.20:5173`, `http://erp.local:5173`, …). Only loopback and
 * private-network hosts are accepted implicitly; a public or tunnelled origin
 * must be listed explicitly here.
 */
const EXTRA_ALLOWED_ORIGINS = (
  process.env.CAD_BRIDGE_ALLOWED_ORIGINS || ''
)
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const ALLOWED_FILE_ORIGINS = (
  process.env.CAD_BRIDGE_FILE_ORIGINS || ''
)
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);

function normaliseOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return true;
  if (/\.(local|lan|internal|home\.arpa)$/.test(host)) return true;
  const octets = host.split('.');
  if (octets.length !== 4 || !octets.every((part) => /^\d{1,3}$/.test(part))) return false;
  const [a, b] = octets.map(Number);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * The browser that calls this bridge is the device the bridge runs on, so its
 * Origin is the ERP the user opened — localhost during development or a private
 * LAN address when the ERP is hosted on another computer. Public origins are
 * rejected unless explicitly configured, and the bridge itself stays bound to
 * 127.0.0.1, so it is never reachable from the network.
 */
function isAllowedOrigin(rawOrigin) {
  const origin = normaliseOrigin(rawOrigin);
  if (!origin) return false;
  if (EXTRA_ALLOWED_ORIGINS.includes(origin)) return true;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  return isPrivateHost(url.hostname);
}

function isAllowedFileOrigin(rawOrigin, requestOrigin) {
  const origin = normaliseOrigin(rawOrigin);
  if (!origin) return false;
  if (origin === normaliseOrigin(requestOrigin)) return true;
  if (ALLOWED_FILE_ORIGINS.includes(origin)) return true;
  return isAllowedOrigin(origin);
}

const MAX_UPLOAD_BYTES = 128 * 1024 * 1024;
const MAX_JSON_BYTES = 64 * 1024;
const TEMP_DIR = path.join(os.tmpdir(), 'mechanical-design-cad-bridge');
const DETECTION_WAIT_MS = 4500;

/* ------------------------------------------------------------------ helpers */

function expandEnv(value) {
  return String(value || '').replace(/%([^%]+)%/g, (match, name) => process.env[name] || match);
}

function cleanRegistryPath(raw) {
  const value = expandEnv(String(raw || '').trim().replace(/^"|"$/g, ''));
  return path.isAbsolute(value) ? value : '';
}

async function isFile(candidate) {
  if (!candidate) return false;
  try {
    const stat = await fs.stat(candidate);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function regQuery(args, timeout = 6000) {
  try {
    const { stdout } = await execFileAsync('reg.exe', args, {
      timeout,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout || '';
  } catch {
    return '';
  }
}

function safeFileName(rawName, fallbackExtension = '') {
  const withoutPaths = String(rawName || '').replace(/\\/g, '/').split('/').pop() || '';
  const cleaned = withoutPaths
    .replace(/[\u0000-\u001f<>:"|?*]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 180);
  if (cleaned) return cleaned;
  const suffix = fallbackExtension ? `.${fallbackExtension}` : '';
  return `original-${Date.now()}${suffix}`;
}

function extensionOf(name) {
  const value = String(name || '');
  const index = value.lastIndexOf('.');
  return index > 0 ? value.slice(index + 1).toLowerCase() : '';
}

/* --------------------------------------------------------------- detection */

const APP_PATH_ROOT = 'Microsoft\\Windows\\CurrentVersion\\App Paths';
const APP_PATH_HIVES = [
  `HKLM\\SOFTWARE\\${APP_PATH_ROOT}`,
  `HKLM\\SOFTWARE\\WOW6432Node\\${APP_PATH_ROOT}`,
  `HKCU\\SOFTWARE\\${APP_PATH_ROOT}`,
];
const UNINSTALL_ROOTS = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
];

async function executableFromAppPaths(exeName) {
  for (const hive of APP_PATH_HIVES) {
    const output = await regQuery(['query', `${hive}\\${exeName}`, '/ve']);
    const match = /REG_(?:SZ|EXPAND_SZ)\s+(.+)$/m.exec(output);
    if (match) {
      const candidate = cleanRegistryPath(match[1]);
      if (await isFile(candidate)) return candidate;
    }
  }
  return '';
}

async function executableFromApplicationHandler(exeName) {
  const output = await regQuery([
    'query',
    `HKCR\\Applications\\${exeName}\\shell\\open\\command`,
    '/ve',
  ]);
  const match = /REG_(?:SZ|EXPAND_SZ)\s+(.+)$/m.exec(output);
  if (!match) return '';
  const value = expandEnv(match[1].trim());
  const quoted = /^"([^"]+\.exe)"/i.exec(value);
  const bare = /^([A-Za-z]:\\.+?\.exe)/i.exec(value);
  const candidate = quoted ? quoted[1] : bare ? bare[1] : '';
  return (await isFile(candidate)) ? candidate : '';
}

async function executableFromOpenWith(application) {
  const exeNames = application.executables.map((name) => name.toLowerCase());
  for (const extension of application.extensions.slice(0, 12)) {
    const progIds = await regQuery(['query', `HKCR\\.${extension}\\OpenWithProgids`]);
    const candidates = progIds
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^HKEY_/i.test(line) && /REG_/i.test(line))
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean);

    for (const progId of candidates) {
      const command = await regQuery(['query', `HKCR\\${progId}\\shell\\open\\command`, '/ve']);
      const match = /REG_(?:SZ|EXPAND_SZ)\s+(.+)$/m.exec(command);
      if (!match) continue;
      const value = expandEnv(match[1].trim());
      const quoted = /^"([^"]+\.exe)"/i.exec(value);
      const bare = /^([A-Za-z]:\\.+?\.exe)/i.exec(value);
      const candidate = quoted ? quoted[1] : bare ? bare[1] : '';
      if (!candidate) continue;
      if (!exeNames.includes(path.basename(candidate).toLowerCase())) continue;
      if (await isFile(candidate)) {
        return { executable: candidate, detectedBy: `open-with:${progId}` };
      }
    }
  }
  return null;
}

async function scanUninstallProducts() {
  const rows = [];
  for (const root of UNINSTALL_ROOTS) {
    const output = await regQuery(['query', root, '/s', '/v', 'DisplayName'], 9000);
    let currentKey = '';
    for (const line of output.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (/^HKEY_/i.test(trimmed)) {
        currentKey = trimmed;
        continue;
      }
      const match = /^DisplayName\s+REG_SZ\s+(.*)$/i.exec(trimmed);
      if (match && currentKey) rows.push({ key: currentKey, name: match[1].trim() });
    }
  }
  return rows;
}

async function registryValues(key) {
  const output = await regQuery(['query', key]);
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^\s+([^\s]+)\s+(REG_SZ|REG_EXPAND_SZ|REG_MULTI_SZ)\s+(.*)$/i.exec(line);
    if (match) values[match[1]] = match[3].trim();
  }
  return values;
}

function stripIconIndex(raw) {
  return String(raw || '')
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/,\s*-?\d+$/, '')
    .trim();
}

function executableFromCommandLine(raw) {
  const value = expandEnv(String(raw || '').trim());
  const quoted = /^"([^"]+\.exe)"/i.exec(value);
  const bare = /^([A-Za-z]:\\.+?\.exe)/i.exec(value);
  const candidate = quoted ? quoted[1] : bare ? bare[1] : '';
  return candidate ? candidate.replace(/^"|"$/g, '') : '';
}

/**
 * Resolve the executable of an installed product from its uninstall entry.
 *
 * `InstallLocation` is frequently empty (FreeCAD installs to something like
 * D:\CAD and leaves it blank), so `DisplayIcon` and `UninstallString` are used
 * as well: both carry a real path written by the installer. The executable must
 * still match one of the catalogue's program names and exist on disk.
 */
async function executableFromUninstallProduct(key, application) {
  const exeNames = application.executables.map((name) => name.toLowerCase());
  const values = await registryValues(key);
  const directories = [];

  const icon = stripIconIndex(values.DisplayIcon || '');
  if (icon && exeNames.includes(path.basename(icon).toLowerCase()) && (await isFile(icon))) {
    return icon;
  }
  if (icon && path.isAbsolute(icon)) directories.push(path.dirname(icon));

  const installLocation = cleanRegistryPath(values.InstallLocation || values.InstallDir || '');
  if (installLocation) directories.push(installLocation);

  const uninstallExe = executableFromCommandLine(values.UninstallString || '');
  if (uninstallExe) directories.push(path.dirname(uninstallExe));

  for (const directory of directories) {
    for (const exeName of application.executables) {
      for (const candidate of [
        path.join(directory, exeName),
        path.join(directory, 'bin', exeName),
        path.join(directory, 'program', 'bin', exeName),
      ]) {
        if (await isFile(candidate)) return candidate;
      }
    }
  }
  return '';
}

async function detectApplication(application, uninstallRows) {
  const attempts = [];

  for (const exeName of application.executables) {
    const fromAppPaths = await executableFromAppPaths(exeName);
    if (fromAppPaths) {
      return { applicationId: application.id, executable: fromAppPaths, detectedBy: 'app-paths', exeName };
    }
    const fromHandler = await executableFromApplicationHandler(exeName);
    if (fromHandler) {
      return {
        applicationId: application.id,
        executable: fromHandler,
        detectedBy: 'application-handler',
        exeName,
      };
    }
    attempts.push(exeName);
  }

  const fromOpenWith = await executableFromOpenWith(application);
  if (fromOpenWith) {
    return {
      applicationId: application.id,
      executable: fromOpenWith.executable,
      detectedBy: fromOpenWith.detectedBy,
      exeName: path.basename(fromOpenWith.executable),
    };
  }

  const products = uninstallRows.filter(
    (row) => row.name && application.productMatch.test(row.name),
  );
  for (const product of products) {
    const executable = await executableFromUninstallProduct(product.key, application);
    if (executable) {
      return {
        applicationId: application.id,
        executable,
        detectedBy: `uninstall:${product.name}`,
        exeName: path.basename(executable),
      };
    }
  }

  return null;
}

const detection = {
  status: 'idle',
  detected: new Map(),
  checkedAt: '',
};
let scanPromise = null;
let detectionDone = false;
let lastScanAt = 0;
const RESCAN_THROTTLE_MS = 1500;

/**
 * Scan the registry. `force` re-reads it: an application installed after the
 * bridge started must be picked up by "Check again" and by the next open
 * attempt, without restarting the helper.
 */
function startDetection({ force = false } = {}) {
  if (scanPromise) return scanPromise;
  if (!force && detection.status === 'complete') return Promise.resolve();
  if (force && Date.now() - lastScanAt < RESCAN_THROTTLE_MS) return Promise.resolve();
  detection.status = 'scanning';
  detection.detected = new Map();
  scanPromise = (async () => {
    const uninstallRows = process.platform === 'win32' ? await scanUninstallProducts() : [];
    for (const application of BRIDGE_APPLICATIONS) {
      try {
        const found = await detectApplication(application, uninstallRows);
        if (found) detection.detected.set(application.id, found);
      } catch {
        // A single probe failure never marks an application as installed.
      }
    }
    detection.status = 'complete';
    detection.checkedAt = new Date().toISOString();
    lastScanAt = Date.now();
  })().finally(() => {
    detectionDone = true;
    scanPromise = null;
  });

  return scanPromise;
}

function capabilitiesPayload() {
  const applications = [];
  const diagnostics = [];
  for (const application of BRIDGE_APPLICATIONS) {
    const found = detection.detected.get(application.id);
    if (found) {
      applications.push({
        applicationId: application.id,
        name: application.name,
        publisher: application.publisher,
        installed: true,
        extensions: application.extensions,
        detectedBy: found.detectedBy,
      });
    }
    diagnostics.push({
      applicationId: application.id,
      name: application.name,
      installed: Boolean(found),
      probedExecutables: application.executables,
    });
  }
  return {
    service: BRIDGE_SERVICE,
    version: BRIDGE_VERSION,
    platform: process.platform,
    scanning: detection.status !== 'complete',
    checkedAt: detection.checkedAt,
    applications,
    diagnostics,
  };
}

/* -------------------------------------------------------------------- files */

async function ensureTempDir() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

async function pruneTempDir() {
  try {
    const entries = await fs.readdir(TEMP_DIR, { withFileTypes: true });
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const full = path.join(TEMP_DIR, entry.name);
      try {
        const stat = await fs.stat(full);
        if (stat.mtimeMs < cutoff) await fs.unlink(full);
      } catch {
        // best effort
      }
    }
  } catch {
    // directory may not exist yet
  }
}

async function writeTempFile(fileName, buffer) {
  await ensureTempDir();
  const folder = path.join(TEMP_DIR, randomUUID());
  await fs.mkdir(folder, { recursive: true });
  const target = path.join(folder, fileName);
  await fs.writeFile(target, buffer);
  return target;
}

async function fetchOriginalToTemp(fileUrl, fileName, requestOrigin) {
  let url;
  try {
    url = new URL(String(fileUrl || ''));
  } catch {
    throw Object.assign(new Error('The original file URL is not a valid absolute URL.'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('Only http(s) original-file URLs can be fetched by the bridge.'), { status: 400 });
  }
  if (!isAllowedFileOrigin(url.origin, requestOrigin)) {
    throw Object.assign(
      new Error(
        `The bridge will not fetch files from ${url.origin}. It accepts the ERP origin that called it, local/private-network origins, and CAD_BRIDGE_FILE_ORIGINS.`,
      ),
      { status: 403 },
    );
  }
  const response = await fetch(url, { redirect: 'error' });
  if (!response.ok) {
    throw Object.assign(
      new Error(`The original file could not be read (HTTP ${response.status}).`),
      { status: 502 },
    );
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw Object.assign(new Error('The original file exceeds the bridge size limit.'), { status: 413 });
  }
  return writeTempFile(fileName, bytes);
}

/* ------------------------------------------------------------- multipart */

function parseMultipart(buffer, contentType) {
  const matched = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  const boundary = (matched?.[1] || matched?.[2] || '').trim();
  if (!boundary) throw Object.assign(new Error('Malformed multipart request.'), { status: 400 });
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let cursor = buffer.indexOf(delimiter);
  while (cursor !== -1) {
    const partStart = cursor + delimiter.length;
    if (buffer.slice(partStart, partStart + 2).toString() === '--') break;
    const headerEnd = buffer.indexOf('\r\n\r\n', partStart);
    if (headerEnd === -1) break;
    const next = buffer.indexOf(delimiter, headerEnd + 4);
    if (next === -1) break;
    const headers = buffer.slice(partStart, headerEnd).toString('utf8');
    const body = buffer.slice(headerEnd + 4, Math.max(headerEnd + 4, next - 2));
    const nameMatch = /name="([^"]*)"/i.exec(headers);
    const fileNameMatch = /filename="([^"]*)"/i.exec(headers);
    parts.push({
      name: nameMatch?.[1] || '',
      fileName: fileNameMatch?.[1] || '',
      body,
    });
    cursor = next;
  }
  return parts;
}

/* ----------------------------------------------------------------- launch */

async function launchFile(application, exePath, filePath) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(exePath, [filePath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
    } catch (error) {
      resolve({ opened: false, message: error?.message || 'The application could not be started.' });
      return;
    }

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    child.once('error', (error) => {
      finish({
        opened: false,
        message:
          error?.code === 'ENOENT'
            ? `${application.name} could not be started: the resolved executable no longer exists.`
            : error?.code === 'EACCES'
              ? `${application.name} could not be started: access to the executable was denied.`
              : error?.message || `${application.name} could not be started.`,
      });
    });

    child.once('spawn', () => {
      child.unref();
      setTimeout(
        () => finish({ opened: true, message: `The bridge started ${application.name} with the original file.` }),
        500,
      );
    });
  });
}

/* ------------------------------------------------------------------- server */

function corsHeaders(origin) {
  const headers = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Accept',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    // Chromium's Private Network Access preflight: a page on a LAN address
    // calling loopback must be granted this header explicitly.
    'Access-Control-Allow-Private-Network': 'true',
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function sendJson(response, status, payload, origin) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders(origin),
  });
  response.end(body);
}

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    request.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(Object.assign(new Error('The request body is too large for the bridge.'), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', (error) => reject(Object.assign(error, { status: 400 })));
  });
}

async function handleOpen(request, response, origin) {
  if (!origin || !isAllowedOrigin(origin)) {
    sendJson(
      response,
      403,
      {
        error:
          'This origin is not allowed to use the local CAD bridge. Open the ERP from localhost or a private network address, or add this origin to CAD_BRIDGE_ALLOWED_ORIGINS when starting the bridge.',
      },
      origin,
    );
    return;
  }

  const contentType = String(request.headers['content-type'] || '').toLowerCase();
  const isMultipart = contentType.startsWith('multipart/form-data');
  const isJson = contentType.startsWith('application/json');

  if (!isMultipart && !isJson) {
    sendJson(response, 415, { error: 'Use application/json or multipart/form-data.' }, origin);
    return;
  }

  let applicationId = '';
  let fileName = '';
  let recordRef = '';
  let fileUrl = '';
  let uploadBuffer = null;

  if (isJson) {
    const raw = await readBody(request, MAX_JSON_BYTES);
    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8') || '{}');
    } catch {
      sendJson(response, 400, { error: 'The request body is not valid JSON.' }, origin);
      return;
    }
    applicationId = String(payload.applicationId || '');
    fileName = String(payload.fileName || '');
    recordRef = String(payload.recordRef || '');
    fileUrl = String(payload.fileUrl || '');

    if (payload.executable || payload.command || payload.args || payload.path) {
      sendJson(
        response,
        400,
        { error: 'The bridge does not accept executables, commands, arguments or arbitrary paths.' },
        origin,
      );
      return;
    }
  } else {
    const raw = await readBody(request, MAX_UPLOAD_BYTES);
    const parts = parseMultipart(raw, request.headers['content-type']);
    for (const part of parts) {
      if (part.name === 'applicationId') applicationId = part.body.toString('utf8').trim();
      else if (part.name === 'fileName') fileName = part.body.toString('utf8').trim();
      else if (part.name === 'recordRef') recordRef = part.body.toString('utf8').trim();
      else if (part.name === 'fileUrl') fileUrl = part.body.toString('utf8').trim();
      else if (part.name === 'file') {
        uploadBuffer = part.body;
        if (part.fileName && !fileName) fileName = part.fileName;
      }
    }
  }

  const application = bridgeApplicationFor(applicationId);
  if (!application) {
    sendJson(
      response,
      400,
      { error: `Application id "${applicationId || '(missing)'}" is not in the bridge allowlist.` },
      origin,
    );
    return;
  }

  const safeName = safeFileName(fileName, application.extensions[0]);
  const extension = extensionOf(safeName);
  if (!extension || !application.extensions.includes(extension)) {
    sendJson(
      response,
      415,
      {
        error: `${application.name} is not allowed to open .${extension || '(no extension)'} through the bridge. Allowed: ${application.extensions
          .map((value) => `.${value}`)
          .join(', ')}.`,
      },
      origin,
    );
    return;
  }

  let detected = detection.detected.get(application.id);
  if (!detected && Date.now() - lastScanAt > RESCAN_THROTTLE_MS) {
    // The application may have been installed after the bridge started, so
    // re-read the registry once before refusing to launch it.
    await Promise.race([
      startDetection({ force: true }),
      new Promise((resolve) => setTimeout(resolve, DETECTION_WAIT_MS)),
    ]);
    detected = detection.detected.get(application.id);
  }
  if (!detected) {
    sendJson(
      response,
      409,
      {
        error: `${application.name} is not installed on this computer, or its executable could not be resolved from the Windows registry.`,
        applicationId: application.id,
      },
      origin,
    );
    return;
  }

  let filePath = '';
  try {
    if (uploadBuffer && uploadBuffer.length > 0) {
      filePath = await writeTempFile(safeName, uploadBuffer);
    } else if (fileUrl) {
      filePath = await fetchOriginalToTemp(fileUrl, safeName, origin);
    } else {
      sendJson(
        response,
        400,
        { error: 'The original file bytes or an allowed original-file URL are required.' },
        origin,
      );
      return;
    }
  } catch (error) {
    sendJson(
      response,
      error.status || 502,
      { error: error.message || 'The original file could not be prepared for launch.' },
      origin,
    );
    return;
  }

  const result = await launchFile(application, detected.executable, filePath);
  console.log(
    `[cad-bridge] ${result.opened ? 'launched' : 'failed'} ${application.id} · ${safeName} · ref=${recordRef || '-'}`,
  );

  if (!result.opened) {
    sendJson(
      response,
      500,
      { opened: false, error: result.message, applicationId: application.id },
      origin,
    );
    return;
  }

  sendJson(
    response,
    200,
    {
      opened: true,
      applicationId: application.id,
      applicationName: application.name,
      fileName: safeName,
      recordRef,
      message: result.message,
    },
    origin,
  );
}

const server = http.createServer(async (request, response) => {
  const origin = String(request.headers.origin || '');
  const url = new URL(request.url || '/', `http://${HOST}:${PORT}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders(origin));
    response.end();
    return;
  }

  if (url.pathname === '/cad-bridge/health' && request.method === 'GET') {
    sendJson(response, 200, { service: BRIDGE_SERVICE, status: 'ok', version: BRIDGE_VERSION }, origin);
    return;
  }

  if (url.pathname === '/cad-bridge/capabilities' && request.method === 'GET') {
    const refresh = ['1', 'true'].includes(String(url.searchParams.get('refresh') || '').toLowerCase());
    if (!detectionDone || refresh) {
      await Promise.race([
        startDetection({ force: refresh }),
        new Promise((resolve) => setTimeout(resolve, DETECTION_WAIT_MS)),
      ]);
    }
    sendJson(response, 200, capabilitiesPayload(), origin);
    return;
  }

  if (url.pathname === '/cad-bridge/open' && request.method === 'POST') {
    try {
      await handleOpen(request, response, origin);
    } catch (error) {
      if (!response.headersSent) {
        sendJson(response, error.status || 500, { error: error.message || 'Bridge request failed.' }, origin);
      }
    }
    return;
  }

  sendJson(response, 404, { error: 'Unknown CAD bridge route.' }, origin);
});

if (process.platform !== 'win32') {
  console.warn(
    '[cad-bridge] This bridge detects and launches Windows applications only; on this platform it will report no installed applications.',
  );
}

await ensureTempDir();
await pruneTempDir();
startDetection();

server.listen(PORT, HOST, () => {
  console.log(`[cad-bridge] listening on http://${HOST}:${PORT}`);
  console.log(
    '[cad-bridge] origins: localhost, 127.0.0.1, private LAN addresses and *.local/*.lan/*.internal' +
      (EXTRA_ALLOWED_ORIGINS.length ? ` + ${EXTRA_ALLOWED_ORIGINS.join(', ')}` : ''),
  );
  console.log('[cad-bridge] this bridge serves THIS computer only (per-device install).');
  console.log('[cad-bridge] detection scan started; GET /cad-bridge/capabilities when ready');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n[cad-bridge] ${signal} received, stopping.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
