# CAD Bridge — setup on each client computer

The ERP runs on one computer (or a small server) and is opened in a browser on many. The CAD
bridge is different: **one copy runs on every computer that needs to open CAD files**, and it is
bound to `127.0.0.1`, so a browser always talks to the bridge on the machine in front of the user.

```
Laptop A  browser → http://erp-host:5173  ──fetch──►  127.0.0.1:47823 (Laptop A) → eDrawings (Laptop A)
Laptop B  browser → http://erp-host:5173  ──fetch──►  127.0.0.1:47823 (Laptop B) → eDrawings (Laptop B)
ERP host  browser → http://localhost:5173 ──fetch──►  127.0.0.1:47823 (ERP host) → application there
```

Nothing is installed on the ERP host on behalf of other computers, and no computer can inspect
another computer's installed programs. If a device has no bridge running, that device shows
*Local CAD Bridge is not running on this computer*.

## 1. Install on the client computer

1. Install **Node.js LTS** (18 or newer) from <https://nodejs.org/> — once per computer.
2. Copy the `tools\cad-bridge` folder from the Design project to the client (USB, network share or
   a zip). It contains `server.mjs`, `catalogue.mjs`, `start-bridge.cmd`,
   `start-bridge-hidden.vbs`, `install-startup.ps1`.
3. Open PowerShell in that folder and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install-startup.ps1
   ```

   This copies the bridge to `%LOCALAPPDATA%\MechanicalDesignCadBridge`, adds a Startup shortcut
   for the current user, starts it, and prints the bridge version. Administrator rights are **not**
   required.
4. Open the ERP and use **Connect / Retry** in the CAD dialog. The status should read
   *Local CAD bridge connected (Bridge 1.2.0) — N installed applications reported.*

### Start it manually (no autostart)

Double-click `start-bridge.cmd`. Log: `%LOCALAPPDATA%\MechanicalDesignCadBridge\bridge.log`.
To stop it, close the window or run `install-startup.ps1 -Uninstall`.

## 2. Firewall and network

- The bridge binds `127.0.0.1` only. **Do not** add an inbound firewall rule for port 47823; other
  computers must not be able to reach it.
- Only the ERP itself must be reachable on the LAN (the Vite dev server already listens on
  `0.0.0.0:5173`). Open it as `http://<erp-host-ip>:5173`.
- Origin rule: the bridge accepts browser origins on `localhost`, `127.0.0.1`, private IPv4 ranges
  (`10/8`, `172.16/12`, `192.168/16`, `169.254/16`) and `*.local` / `*.lan` / `*.internal` hosts,
  on any port. Public origins are rejected. To allow one explicitly:

  ```cmd
  set CAD_BRIDGE_ALLOWED_ORIGINS=https://erp.example.com
  start-bridge.cmd
  ```

## 3. Browser and HTTPS notes

| Situation | Behaviour |
| --- | --- |
| ERP on `http://<lan-ip>:5173`, bridge on `http://127.0.0.1:47823` | Works. Chromium's Private Network Access preflight is answered with `Access-Control-Allow-Private-Network: true`. |
| Firefox, first call from a LAN origin | May ask once for permission to reach a service on this device — allow it. |
| ERP served over **HTTPS** | Browsers treat loopback as potentially trustworthy, but some (notably Safari, and Chrome under strict policies) still block `http://` loopback from an HTTPS page. The dialog then reports the bridge as not running and mentions the HTTPS restriction. Serve the ERP over HTTP on the LAN, or put an HTTPS bridge behind a local certificate. |
| ERP exposed to the public internet | Not supported by default. Add the exact public origin with `CAD_BRIDGE_ALLOWED_ORIGINS`; the bridge still launches only from an explicit click and only allowlisted applications. |

## 4. Checking a device

- Bridge: <http://127.0.0.1:47823/cad-bridge/health> → JSON with service and version.
- Capabilities: <http://127.0.0.1:47823/cad-bridge/capabilities> → installed applications for
  **that** computer.
- Force a fresh registry scan: `http://127.0.0.1:47823/cad-bridge/capabilities?refresh=1`.
- Registry check for eDrawings: uninstall entry `DisplayName = eDrawings` with
  `InstallLocation` pointing at `…\Common Files\eDrawings2026\`, or `App Paths\eDrawings.exe`.

## 5. Troubleshooting

| Message | Meaning / action |
| --- | --- |
| *Local CAD Bridge is not running on this computer…* | Start `start-bridge.cmd` on this device, then Connect / Retry. |
| *…does not allow the origin http://…* | Public origin not configured; add it to `CAD_BRIDGE_ALLOWED_ORIGINS` and restart the bridge. |
| *eDrawings is not installed on this computer.* | The registry scan found no eDrawings on this device; install it or repair its installation. |
| Bridge connected, eDrawings missing | Press Connect / Retry after installing eDrawings; the scan is re-run on refresh. |
| File opens on the ERP host instead of this laptop | The browser is on the ERP host; open the ERP from the laptop instead. |
