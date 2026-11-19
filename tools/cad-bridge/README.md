# Local Windows CAD bridge

The ERP frontend cannot enumerate installed Windows programs or start an executable. Only a
local helper can do that. This bridge is that helper: a small loopback HTTP service that

- detects installed CAD applications from the Windows registry,
- accepts one allowlisted `applicationId` plus the original file,
- launches **only** that application with **only** that file.

It is optional and independent of the React build.

**One bridge per computer.** The ERP may be hosted on one machine and opened from many; the
browser on each device talks to the bridge on *that* device, because the bridge only listens on
`127.0.0.1`. Install it once on every computer that must open CAD files — see
[`CLIENT-SETUP.md`](./CLIENT-SETUP.md) and `install-startup.ps1`.

## Start / stop

```bash
# from the project root
npm run cad-bridge
# or
node tools/cad-bridge/server.mjs
```

Stop with `Ctrl+C`. It listens on `http://127.0.0.1:47823` only.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CAD_BRIDGE_PORT` | `47823` | Loopback port (must match `VITE_CAD_BRIDGE_ORIGIN`). |
| `CAD_BRIDGE_ALLOWED_ORIGINS` | *(empty)* | Extra browser origins allowed to call the bridge. Loopback, private LAN addresses and `*.local`/`*.lan`/`*.internal` are accepted automatically; public origins must be listed here. No wildcard. |
| `CAD_BRIDGE_FILE_ORIGINS` | *(empty)* | Extra origins the bridge may fetch a stored original file from. The calling ERP origin and local/private origins are accepted automatically. |

If the ERP is opened over HTTPS from a public host, start the bridge with that origin added:

```bash
CAD_BRIDGE_ALLOWED_ORIGINS="https://erp.example.com" npm run cad-bridge
```

Accessing the ERP as `http://192.168.1.20:5173` from another laptop needs no configuration: the
browser's origin is a private address, and the launch request goes to that laptop's own
`127.0.0.1:47823`.

## Detection

Detection is registry-based only — the bridge never guesses an install folder:

1. `HKLM/HKCU\SOFTWARE\...\App Paths\<exe>` (all views),
2. `HKCR\Applications\<exe>\shell\open\command`,
3. uninstall keys' `InstallLocation` for the product display name, then the known executable name
   inside that folder.

If none of these resolves an existing `.exe`, the application is reported as **not installed**. The
catalogue is in `tools/cad-bridge/catalogue.mjs` (application id, real executable names, product
match, allowed extensions). Applications whose executable name is not certain are deliberately
absent rather than guessed.

## API

```
GET /cad-bridge/capabilities[?refresh=1]
  refresh=1 re-reads the registry (throttled), so an application installed after
  the bridge started is reported without restarting the helper.
→ {
    "service": "mechanical-design-cad-bridge",
    "version": "1.1.1",
    "platform": "win32",
    "scanning": false,
    "checkedAt": "…",
    "applications": [
      { "applicationId": "solidworks", "name": "SolidWorks",
        "publisher": "Dassault Systèmes", "installed": true,
        "extensions": ["sldprt", "sldasm", "slddrw", "step", "…"] }
    ],
    "diagnostics": [ { "applicationId": "freecad", "installed": false, "probedExecutables": ["FreeCAD.exe"] } ]
  }

POST /cad-bridge/open
  application/json      { applicationId, fileName, recordRef, fileUrl }
  multipart/form-data   applicationId, fileName, recordRef, file (original bytes)
→ 200 { "opened": true, "applicationName": "SolidWorks", "fileName": "…", "message": "…" }
→ 4xx/5xx { "error": "…" }
```

The bridge never accepts `executable`, `command`, `args` or a local `path`; a request containing
them is rejected. Files are written to a private temp folder under the OS temp directory, keeping
the original filename and extension; the original in the ERP is never modified.

`opened: true` means the process was actually spawned. It does not prove the document finished
loading, and the ERP reports it as a handoff rather than a completed open.

## Status on this machine

Not running, and no supported CAD application is registered in the Windows registry here, so the
bridge reports an empty `applications` list. Installing SolidWorks, eDrawings, AutoCAD or FreeCAD
and starting the bridge is what enables direct opening for those applications.
