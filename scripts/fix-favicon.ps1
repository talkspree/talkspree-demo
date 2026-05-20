Add-Type -AssemblyName System.Drawing

$publicDir = (Resolve-Path (Join-Path $PSScriptRoot '..\public')).Path
$sourcePath = Join-Path $publicDir 'favicon.png'

function Save-ResizedSquare {
  param(
    [string]$SourcePath,
    [string]$OutPath,
    [int]$Px
  )
  $src = [System.Drawing.Image]::FromFile($SourcePath)
  try {
    $bmp = New-Object System.Drawing.Bitmap $Px, $Px
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.DrawImage($src, 0, 0, $Px, $Px)
      $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $g.Dispose()
      $bmp.Dispose()
    }
  } finally {
    $src.Dispose()
  }
}

$src = [System.Drawing.Image]::FromFile($sourcePath)
try {
  if ($src.Width -ne $src.Height) {
    $size = [Math]::Max($src.Width, $src.Height)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.Clear([System.Drawing.Color]::Transparent)
      $x = [int](($size - $src.Width) / 2)
      $y = [int](($size - $src.Height) / 2)
      $g.DrawImage($src, $x, $y, $src.Width, $src.Height)
      $tempPath = Join-Path $publicDir 'favicon-square-temp.png'
      $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $g.Dispose()
      $bmp.Dispose()
    }
    $src.Dispose()
    $src = $null
    Remove-Item -Force $sourcePath
    Rename-Item $tempPath (Split-Path $sourcePath -Leaf)
    Write-Output "Padded favicon to ${size}x${size}"
  }
} finally {
  if ($null -ne $src) { $src.Dispose() }
}

Save-ResizedSquare -SourcePath $sourcePath -OutPath (Join-Path $publicDir 'apple-touch-icon.png') -Px 180
Save-ResizedSquare -SourcePath $sourcePath -OutPath (Join-Path $publicDir 'favicon-32.png') -Px 32
Write-Output 'Created apple-touch-icon.png (180) and favicon-32.png (32)'
