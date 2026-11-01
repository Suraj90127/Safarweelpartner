Add-Type -AssemblyName System.Drawing

$baseDir = $PSScriptRoot
$imgs = @(
    "src\assets\images\customer_illustration.png",
    "src\assets\images\captain_training_banner.png"
)

foreach ($img in $imgs) {
    $fullPath = Join-Path $baseDir $img
    $tmpPath = $fullPath + ".tmp.png"
    
    Write-Host "Re-encoding: $fullPath"
    
    $bmp = [System.Drawing.Image]::FromFile($fullPath)
    $bmp.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    
    Remove-Item $fullPath -Force
    Rename-Item $tmpPath $fullPath
    
    Write-Host "Done: $fullPath"
}

Write-Host "All images re-encoded successfully."
