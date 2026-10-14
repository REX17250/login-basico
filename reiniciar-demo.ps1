# Deja la demo como al inicio: server.js con el bug sembrado (minimo de contrasena 6) y bitacora vacia.
$raiz = $PSScriptRoot
Copy-Item "$raiz\.reset\server.js" "$raiz\backend\server.js" -Force
(Get-Content "$raiz\backend\server.js" -Raw).Replace("password.length < 8", "password.length < 6") | Set-Content "$raiz\backend\server.js" -NoNewline
Remove-Item "$raiz\.claude\auditoria.log" -Force -ErrorAction SilentlyContinue
Write-Host "Demo reiniciada: 4 pruebas pasan y 1 falla."
