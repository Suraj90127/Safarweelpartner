Add-Type -AssemblyName System.Drawing
$base = $PSScriptRoot
$files = @(
    'src\assets\images\customer_illustration.png',
    'src\assets\images\captain_training_banner.png'
)
foreach ($f in $files) {
    $full = Join-Path $base $f
    $img = [System.Drawing.Image]::FromFile($full)
    Write-Host "$f => $($img.Width) x $($img.Height) pixels, Format: $($img.RawFormat)"
    $img.Dispose()
}
