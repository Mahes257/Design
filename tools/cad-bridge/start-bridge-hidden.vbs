' Starts the local CAD bridge without a console window.
' Used by the Startup shortcut created by install-startup.ps1.
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.Run """" & scriptDir & "\start-bridge.cmd""", 0, False
