# install-portproxy-task.ps1
# Registra una tarea programada de Windows que ejecuta wsl-portforward.ps1
# automaticamente al iniciar sesion, con privilegios elevados (sin prompt UAC
# en cada arranque).
#
# Ejecutar UNA VEZ, como Administrador:
#   powershell -ExecutionPolicy Bypass -File D:\Compartida\LIHER\infra\scripts\install-portproxy-task.ps1
#
# Por que existe: wsl-portforward.ps1 ya soluciona el problema de la IP de WSL2
# cambiante, pero requiere ejecucion manual cada reinicio. Esta tarea cierra ese
# hueco — el reenvio de puertos queda activo sin intervencion, item explicito de
# Pendientes.md.

$ErrorActionPreference = "Stop"

$taskName   = "WSL2 PortForward"
$scriptPath = Join-Path $PSScriptRoot "wsl-portforward.ps1"

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: no se encuentra $scriptPath" -ForegroundColor Red
    exit 1
}

$action    = New-ScheduledTaskAction -Execute "powershell.exe" `
                -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger   = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
                -LogonType Interactive -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
                -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName `
    -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
    -Description "Reenvia puertos 80/8080/9100 de WSL2 a Windows al iniciar sesion (LIHER stack)" `
    -Force | Out-Null

Write-Host "✓ Tarea programada '$taskName' registrada — se ejecutara al iniciar sesion con privilegios elevados." -ForegroundColor Green
Write-Host "  Verificar:  Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Cyan
Write-Host "  Ejecutar ya: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Cyan
Write-Host "  Eliminar:    Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false" -ForegroundColor Cyan
