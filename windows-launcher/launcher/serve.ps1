<#
  Nabta — local launcher

  Serves the static app over http://localhost so the browser will grant camera
  access (getUserMedia is blocked on file:// URLs) and opens it.

  Uses only components built into Windows — no Node.js, no npm, no internet,
  and no administrator rights. Close this window to stop the server.
#>

$ErrorActionPreference = "Stop"

$root = Join-Path (Split-Path -Parent $PSScriptRoot) "app"
if (-not (Test-Path $root)) {
    Write-Host ""
    Write-Host "  ERROR: could not find the 'app' folder next to this launcher." -ForegroundColor Red
    Write-Host "  Make sure you extracted the whole ZIP, keeping the folders together." -ForegroundColor Red
    Write-Host ""
    Read-Host "  Press Enter to close"
    exit 1
}
$rootFull = (Resolve-Path $root).Path

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".mjs"  = "text/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"  = "font/ttf"
    ".map"  = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json"
}

# ── find a free port ──────────────────────────────────────────────────────
$listener = $null
$port = 0
foreach ($p in 3000..3020) {
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://localhost:$p/")
        $l.Start()
        $listener = $l
        $port = $p
        break
    } catch {
        if ($l) { try { $l.Close() } catch {} }
    }
}

if (-not $listener) {
    Write-Host ""
    Write-Host "  ERROR: could not open a local port (tried 3000-3020)." -ForegroundColor Red
    Write-Host "  Close any other development servers and try again." -ForegroundColor Red
    Write-Host ""
    Read-Host "  Press Enter to close"
    exit 1
}

$url = "http://localhost:$port/"

Write-Host ""
Write-Host "   NABTA" -ForegroundColor Green
Write-Host "   Plant. Verify. Earn." -ForegroundColor DarkGray
Write-Host ""
Write-Host "   Running at  $url" -ForegroundColor White
Write-Host ""
Write-Host "   The app should open in your browser automatically." -ForegroundColor DarkGray
Write-Host "   If it does not, copy the address above into your browser." -ForegroundColor DarkGray
Write-Host ""
Write-Host "   KEEP THIS WINDOW OPEN while using the app." -ForegroundColor Yellow
Write-Host "   Close it (or press Ctrl+C) to stop." -ForegroundColor DarkGray
Write-Host ""
Write-Host "   ------------------------------------------------------------"
Write-Host ""

try { Start-Process $url } catch {
    Write-Host "   (Could not open the browser automatically.)" -ForegroundColor DarkYellow
}

# ── resolve a request path to a file on disk ──────────────────────────────
function Resolve-RequestPath([string]$urlPath) {
    $rel = $urlPath.Trim("/")

    $candidates = @()
    if ([string]::IsNullOrWhiteSpace($rel)) {
        $candidates += "index.html"
    } else {
        $candidates += $rel
        $candidates += "$rel/index.html"
        $candidates += "$rel.html"
    }

    foreach ($c in $candidates) {
        $full = Join-Path $rootFull ($c -replace "/", "\")
        # Guard against path traversal: the resolved file must sit inside app/.
        try { $resolved = (Resolve-Path -LiteralPath $full -ErrorAction Stop).Path }
        catch { continue }
        if (-not $resolved.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) { continue }
        if (Test-Path -LiteralPath $resolved -PathType Leaf) { return $resolved }
    }
    return $null
}

# ── serve ─────────────────────────────────────────────────────────────────
try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        try {
            $file = Resolve-RequestPath $req.Url.LocalPath
            $status = 200

            if (-not $file) {
                # Unknown route — hand back the SPA 404 page if the export made one.
                $fallback = Join-Path $rootFull "404.html"
                if (Test-Path -LiteralPath $fallback) { $file = $fallback; $status = 404 }
            }

            if ($file) {
                $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
                $type = $mime[$ext]
                if (-not $type) { $type = "application/octet-stream" }

                $bytes = [System.IO.File]::ReadAllBytes($file)
                $res.StatusCode = $status
                $res.ContentType = $type
                $res.ContentLength64 = $bytes.Length
                # Hashed asset names make long caching safe; HTML must stay fresh.
                if ($req.Url.LocalPath -like "/_next/static/*") {
                    $res.Headers.Add("Cache-Control", "public, max-age=31536000, immutable")
                } else {
                    $res.Headers.Add("Cache-Control", "no-cache")
                }
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $res.StatusCode = 404
                $res.ContentType = "text/plain; charset=utf-8"
                $res.ContentLength64 = $msg.Length
                $res.OutputStream.Write($msg, 0, $msg.Length)
            }
        } catch {
            try {
                $res.StatusCode = 500
                $err = [System.Text.Encoding]::UTF8.GetBytes("500 Server Error")
                $res.OutputStream.Write($err, 0, $err.Length)
            } catch {}
        } finally {
            try { $res.OutputStream.Close() } catch {}
        }
    }
} finally {
    try { $listener.Stop(); $listener.Close() } catch {}
    Write-Host ""
    Write-Host "   Nabta stopped." -ForegroundColor DarkGray
    Write-Host ""
}
