# Nabta: serve the site to a phone on the same network, over HTTPS.
#
# Why HTTPS: getUserMedia is blocked on insecure origins. Over plain HTTP the
# phone can view the site but the camera, and therefore the verification loop,
# will not work.
#
# What this does:
#   1. finds the machine's LAN address
#   2. mints a self signed certificate covering that address (openssl, from Git)
#   3. starts the Next dev server on 127.0.0.1:3000 if it is not already up
#   4. runs phone/proxy.js to terminate HTTPS on port 3443 and forward to it
#
# No administrator rights needed. Node already has an inbound firewall allow.

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = Split-Path -Parent $here
$certDir = Join-Path $here "certs"
$listenPort = 3443
$devPort = 3000

function Write-Step($text) { Write-Host "  $text" -ForegroundColor DarkGray }
function Write-Good($text) { Write-Host "  $text" -ForegroundColor Green }
function Write-Bad($text) { Write-Host "  $text" -ForegroundColor Red }

# openssl reports key generation progress on stderr. PowerShell turns native
# stderr into ErrorRecords, which under ErrorActionPreference Stop aborts the
# script even when the command succeeded. Run native tools with that relaxed
# and judge success by the exit code instead.
function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $Exe @Arguments 2>&1 | Out-Null
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Get-NativeText {
    param([string]$Exe, [string[]]$Arguments)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        return (& $Exe @Arguments 2>&1 | Out-String)
    } finally {
        $ErrorActionPreference = $previous
    }
}

Write-Host ""
Write-Host "  Nabta on your phone" -ForegroundColor White
Write-Host "  ===================" -ForegroundColor DarkGray
Write-Host ""

# ---------------------------------------------------------------- LAN address
$candidates = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and
    (Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue).Status -eq 'Up'
}
if (-not $candidates) {
    Write-Bad "No active network connection found."
    Write-Host ""
    Write-Host "  Connect this PC to the same Wi-Fi as your phone and run this again."
    Read-Host "  Press Enter to close"
    exit 1
}
# Prefer Wi-Fi, then Ethernet, then whatever is left.
$ip = ($candidates | Sort-Object -Property @{ Expression = {
    if ($_.InterfaceAlias -match 'Wi-?Fi|Wireless') { 0 }
    elseif ($_.InterfaceAlias -match 'Ethernet') { 1 }
    else { 2 }
} } | Select-Object -First 1).IPAddress
Write-Step "Network address: $ip"

# -------------------------------------------------------------------- openssl
$openssl = (Get-Command openssl -ErrorAction SilentlyContinue).Source
if (-not $openssl) {
    $probes = @(
        (Join-Path $env:ProgramFiles "Git\mingw64\bin\openssl.exe"),
        (Join-Path $env:ProgramFiles "Git\usr\bin\openssl.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Git\mingw64\bin\openssl.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Git\usr\bin\openssl.exe")
    )
    foreach ($p in $probes) { if (Test-Path $p) { $openssl = $p; break } }
}
if (-not $openssl) {
    Write-Bad "openssl not found. It ships with Git for Windows."
    Write-Host "  Install Git for Windows, then run this again."
    Read-Host "  Press Enter to close"
    exit 1
}

# ---------------------------------------------------------------- certificate
New-Item -ItemType Directory -Force -Path $certDir | Out-Null
$keyPath = Join-Path $certDir "key.pem"
$crtPath = Join-Path $certDir "cert.pem"

$needCert = $true
if ((Test-Path $keyPath) -and (Test-Path $crtPath)) {
    # Reuse only if it still covers this address and is not near expiry,
    # because a DHCP lease, or moving to a phone hotspot, changes the address.
    $text = Get-NativeText $openssl @("x509", "-in", $crtPath, "-noout", "-text")
    $expiryCode = Invoke-Native $openssl @("x509", "-in", $crtPath, "-noout", "-checkend", "86400")
    if ($expiryCode -eq 0 -and $text -match ("IP Address:" + [regex]::Escape($ip))) {
        $needCert = $false
        Write-Step "Certificate: reusing existing"
    }
}

if ($needCert) {
    Write-Step "Certificate: creating one for $ip"
    # Build into temporary files and swap them in together. Writing the pair in
    # place risks leaving a new key beside a stale certificate if this fails
    # halfway, which then fails later at TLS handshake time and is hard to read.
    $tmpKey = "$keyPath.tmp"
    $tmpCrt = "$crtPath.tmp"
    Remove-Item $tmpKey, $tmpCrt -Force -ErrorAction SilentlyContinue

    $code = Invoke-Native $openssl @(
        "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "825",
        "-keyout", $tmpKey, "-out", $tmpCrt,
        "-subj", "/CN=Nabta local",
        "-addext", "subjectAltName=IP:$ip,IP:127.0.0.1,DNS:localhost"
    )

    if ($code -ne 0 -or -not (Test-Path $tmpCrt) -or -not (Test-Path $tmpKey)) {
        Write-Bad "Could not create the certificate (openssl exit code $code)."
        Remove-Item $tmpKey, $tmpCrt -Force -ErrorAction SilentlyContinue
        Read-Host "  Press Enter to close"
        exit 1
    }

    Move-Item -Force $tmpKey $keyPath
    Move-Item -Force $tmpCrt $crtPath
}

# ------------------------------------------------------------- the dev server
function Test-DevUp {
    try {
        $c = New-Object Net.Sockets.TcpClient
        $c.Connect("127.0.0.1", $devPort)
        $c.Close()
        return $true
    } catch { return $false }
}

if (Test-DevUp) {
    Write-Step "Dev server: already running on port $devPort"
} else {
    Write-Step "Dev server: starting"
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npm run dev" `
        -WorkingDirectory $root -WindowStyle Minimized
    $waited = 0
    while (-not (Test-DevUp) -and $waited -lt 90) {
        Start-Sleep -Seconds 1
        $waited++
    }
    if (-not (Test-DevUp)) {
        Write-Bad "The dev server did not come up within 90 seconds."
        Write-Host "  Run 'npm run dev' in $root and look at the error."
        Read-Host "  Press Enter to close"
        exit 1
    }
    Write-Step "Dev server: up after $waited seconds"
}

# ----------------------------------------------------------------- the bridge
$url = "https://$($ip):$listenPort"
Write-Host ""
Write-Good "Open this on your phone:"
Write-Host ""
Write-Host "      $url" -ForegroundColor Yellow
Write-Host ""
Write-Host "  The phone must be on the same Wi-Fi as this PC." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  You will see a certificate warning. That is expected: the" -ForegroundColor DarkGray
Write-Host "  certificate is self signed, not issued by a public authority." -ForegroundColor DarkGray
Write-Host "    iPhone:  Show Details, then Visit This Website" -ForegroundColor DarkGray
Write-Host "    Android: Advanced, then Proceed" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Leave this window open. Close it to stop serving." -ForegroundColor DarkGray
Write-Host ""

$env:CERT_KEY = $keyPath
$env:CERT_CRT = $crtPath
$env:PHONE_PORT = "$listenPort"
$env:TARGET_PORT = "$devPort"

& node (Join-Path $here "proxy.js")

Write-Host ""
Write-Host "  Stopped." -ForegroundColor DarkGray
Read-Host "  Press Enter to close"
