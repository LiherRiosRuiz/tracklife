# wsl-portforward.ps1
# Reenvía puertos del stack web desde Windows a WSL2.
# Ejecutar como Administrador despues de arrancar WSL2.
#
# Uso manual:   powershell -ExecutionPolicy Bypass -File D:\Compartida\wsl-portforward.ps1
# Automatico:   ver tarea en Task Scheduler "WSL2 PortForward"

$wslIP = (wsl -d Ubuntu -- hostname -I 2>$null).Trim().Split(" ")[0]

if (-not $wslIP) {
    Write-Host "ERROR: No se pudo obtener la IP de WSL2. Asegurate de que Ubuntu esta corriendo." -ForegroundColor Red
    exit 1
}

Write-Host "WSL2 IP: $wslIP" -ForegroundColor Cyan

$ports = @(80, 8080, 9100)

foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port 2>$null | Out-Null
    netsh interface portproxy add    v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wslIP connectport=$port
    Write-Host "  :${port} --> ${wslIP}:${port}" -ForegroundColor Green
}

Write-Host ""
Write-Host "Reglas activas:" -ForegroundColor Yellow
netsh interface portproxy show all
