# Multi-device CAD Bridge — per-client detection and eDrawings launch

Report for making **Open in CAD Software** work on every computer that opens the Design ERP, not
only on the computer hosting it.

Date: 2026-11-18 · Bridge version 1.2.0 · Build: `npm run build` exit 0

---

## 1. Architecture implemented

```
             ┌────────────────────────────┐
Laptop A ────┤ browser: http://erp:5173    │
             │ fetch → 127.0.0.1:47823     │──► CAD Bridge (A) ──► eDrawings (A)
             └────────────────────────────┘        registry scan of A
             ┌────────────────────────────┐
Laptop B ────┤ browser: http://erp:5173    │
             │ fetch → 127.0.0.1:47823     │──► CAD Bridge (B) ──► eDrawings (B)
             └────────────────────────────┘        registry scan of B
             ┌────────────────────────────┐
ERP host ────┤ browser: http://localhost   │──► CAD Bridge (host) ──► app on host
             └────────────────────────────┘
```

- The bridge is installed **once per client computer** and always binds `127.0.0.1:47823`, so the
  URL `http://127.0.0.1:47823` in a browser is that browser's own computer. Nothing is proxied and
  the bridge is never reachable from the LAN.
- The ERP is hosted once (`vite` already listens on `0.0.0.0:5173`); clients open
  `http://<erp-host>:5173`.
- The client never asks the ERP host for its application list; the probe goes to the browser
  device's loopback bridge. Detection results are cached in memory only for the current page, never
  in localStorage, and re-read on **Connect / Retry**.
- Origin policy: the bridge accepts the ERP origin when its host is `localhost`, `127.0.0.1`, a
  private IPv4 range (`10/8`, `172.16/12`, `192.168/16`, `169.254/16`) or `*.local` / `*.lan` /
  `*.internal`. Public origins must be added explicitly with `CAD_BRIDGE_ALLOWED_ORIGINS`. This is
  what makes `http://192.168.1.20:5173` work on every laptop without configuration.
- Chromium Private Network Access: every response and preflight carries
  `Access-Control-Allow-Private-Network: true`, so a page served from a LAN address may call
  loopback.
- File transfer: the browser fetches the original from the ERP it is already using and posts the
  **bytes** (multipart, original filename) to its own bridge. The bridge does not need to reach the
  ERP host, and no server-side path is assumed. If the page cannot read the file, or it exceeds the
  bridge's 128 MB upload cap, the request falls back to `fileUrl`; the bridge then fetches only from
  the calling origin, private origins, or `CAD_BRIDGE_FILE_ORIGINS`.
- Launch: `spawn(exe, [file])` with the executable resolved from the local registry, extension
  validated against the application's allowlist, no shell, no caller-supplied executable, arguments
  or paths. `opened: true` means the process was started, not that the file finished loading.
- Detection refresh: `GET /capabilities?refresh=1` re-scans the registry (throttled), and a refused
  `/open` re-scans once, so an application installed after the bridge started is found without a
  restart.

## 2. Files changed

| File | Change |
| --- | --- |
| `tools/cad-bridge/server.mjs` | Origin policy for loopback + private LAN hosts (`isAllowedOrigin`), Private Network Access header/preflight, file-fetch origin restricted to caller/private/configured origins, updated messages and startup log. |
| `tools/cad-bridge/catalogue.mjs` | Version `1.2.0`. |
| `src/data/cadLaunch.js` | Client-side status classification (`not-running`, `timeout`, `origin-rejected`, HTTP errors) with explicit messages; HTTPS/mixed-content hint; original file read in the browser and posted as bytes, URL fallback only when needed. |
| `src/pages/cad/OpenInCadSoftware.jsx` | Per-device wording, exact not-running message, **Connect / Retry** action, “not installed on this computer” copy, explanation that a page cannot inspect another computer. |
| `tools/cad-bridge/start-bridge.cmd` | **New.** Manual start; refuses to start a second copy; logs to `%LOCALAPPDATA%\MechanicalDesignCadBridge\bridge.log`. |
| `tools/cad-bridge/start-bridge-hidden.vbs` | **New.** Hidden launcher used by the Startup shortcut. |
| `tools/cad-bridge/install-startup.ps1` | **New.** Copies the bridge into `%LOCALAPPDATA%`, creates a per-user Startup shortcut (opt-in), starts it, verifies `/health`; `-Uninstall` removes the shortcut. |
| `tools/cad-bridge/CLIENT-SETUP.md` | **New.** Per-device installation, firewall, HTTPS/browser restrictions, troubleshooting. |
| `tools/cad-bridge/README.md` | Multi-device model and new origin defaults. |

## 3. Client installation / startup

1. Install **Node.js LTS** on the client.
2. Copy `tools\cad-bridge` to the device.
3. `powershell -ExecutionPolicy Bypass -File .\install-startup.ps1` — copies to
   `%LOCALAPPDATA%\MechanicalDesignCadBridge`, adds a Startup shortcut for the current user, starts
   the bridge, prints the version. No admin rights, no firewall rule.
4. Open the ERP (`http://<erp-host>:5173`), press **Connect / Retry**.
5. To remove: `install-startup.ps1 -Uninstall` (stops the bridge and deletes the shortcut).

The installer was run on this computer and then uninstalled to leave no autostart behind: it
copied all four files, created
`…\Start Menu\Programs\Startup\Mechanical Design CAD Bridge.lnk`, reported
`Bridge is running: mechanical-design-cad-bridge 1.2.0`, and `-Uninstall` removed the shortcut and
stopped the bridge. `start-bridge.cmd` refuses to start a second instance
("The local CAD bridge is already running…").

## 4. HTTPS / browser restrictions

- **HTTP ERP on the LAN + HTTP loopback bridge** — supported and tested; no browser prompt in
  Chromium because the Private Network Access preflight is answered.
- **Firefox** may ask once whether the page may reach a service on this computer; allow it.
- **HTTPS ERP** — loopback is usually treated as potentially trustworthy, but Safari and some
  Chrome enterprise policies block `http://` loopback from an HTTPS page. The dialog then reports
  the bridge as not running with an HTTPS hint. Recommended: serve the ERP over HTTP on the LAN, or
  run an HTTPS local bridge with a trusted local certificate (not implemented here).
- **Public internet exposure** — not supported by default; the exact public origin must be listed in
  `CAD_BRIDGE_ALLOWED_ORIGINS`. The bridge still launches only on an explicit click.
- Browser extensions/privacy modes that block loopback requests must be disabled for the ERP origin.

## 5. Test results

### 5.1 Primary computer (this machine)

| Check | Result |
| --- | --- |
| Bridge `/health` | **Pass** — `mechanical-design-cad-bridge 1.2.0`, `127.0.0.1:47823` |
| eDrawings detection | **Pass** — `uninstall:eDrawings`, 25 formats; `C:\Program Files\Common Files\eDrawings2026\eDrawings.exe` |
| LAN-origin capabilities (`Origin: http://172.27.100.65:5173`) | **Pass** — `200`, `Access-Control-Allow-Origin` echoed, `Access-Control-Allow-Private-Network: true` |
| Same check after DHCP changed this machine to `172.19.5.105` | **Pass** — ERP served on the new address (`200`), bridge echoed the new origin |
| PNA preflight (`OPTIONS`, private-network request header) | **Pass** — `204` with the private-network header |
| Foreign origin (`https://evil.example`) `/open` | **Pass** — `403`; capabilities response carries no `Access-Control-Allow-Origin` |
| Foreign file URL (`https://example.com/x.step`) | **Pass** — `403`, nothing fetched |
| Open in eDrawings from `http://172.27.100.65:5173` (UI click) | **Pass** — log `launched edrawings · rounded-cube.step`; eDrawings recent list gained `…a52b524f…\rounded-cube.step` (browser-posted bytes) |
| Open via API with LAN `fileUrl` | **Pass** — log `launched edrawings · lan-test.step · ref=lan-origin`; recent list `…a23c43f6…\lan-test.step`, original name preserved |
| Bridge stopped (eDrawings installed) | **Pass** — dialog: “Local CAD Bridge is not running on this computer. Install/start the CAD Bridge on this device and retry.” with **Connect / Retry** |
| Connect / Retry after starting the bridge | **Pass** — connected, “2 installed applications reported”, no page reload |
| Application not installed on this computer | **Pass** (SolidWorks) — “SolidWorks is not installed on this computer.”, launch disabled |
| Startup installer | **Pass** — copy, shortcut, health check; `-Uninstall` removed it |

### 5.2 Second computer — **NOT TESTED**

No second physical computer was available in this environment. The LAN-origin browser test above
ran on the **primary** machine using its LAN URL; it verifies origin handling and the browser-side
byte transfer, but it is **not** evidence of a second device's own registry, its own bridge, or its
own eDrawings installation.

Consequently these requested checks remain unverified:

1. Second computer: its own bridge connection and independent eDrawings detection.
2. Second computer: opening an original CAD file in its own eDrawings.
3. Second computer without eDrawings: the “not installed” message for eDrawings specifically (the
   identical code path was verified with SolidWorks on the primary machine).
4. ERP hosted on one device and accessed through another device's browser.
5. Firewall/antivirus/group-policy behaviour on a domain-managed laptop.

Multi-device support is **implemented and architecturally verified, not device-verified**.

## 6. Remaining limitations

- One bridge installation per client device is required; there is no remote agent discovery.
- Node.js must be installed on every client device.
- Browsers cannot inspect another computer's installed applications — that is a platform rule, not
  a gap in this implementation.
- HTTPS-hosted ERP pages may be blocked from calling the HTTP loopback bridge by some browsers.
- The bridge's multipart cap is 128 MB; larger originals use the URL fallback, which requires the
  bridge device to reach the ERP host.
- Port 47823 must be free on each device; the startup script refuses to start a second instance.
- `opened: true` confirms the process started with the exact file; the page cannot confirm that the
  application finished loading it.
