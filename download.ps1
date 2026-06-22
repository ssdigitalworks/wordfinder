$ErrorActionPreference = "Stop"

$twlUrl = "https://raw.githubusercontent.com/jessicatysu/scrabble/master/TWL06.txt"
$sowpodsUrl = "https://raw.githubusercontent.com/jesstess/Scrabble/master/scrabble/sowpods.txt"

Write-Host "Downloading TWL..."
Invoke-WebRequest -Uri $twlUrl -OutFile "twl_raw.txt"

Write-Host "Downloading SOWPODS..."
Invoke-WebRequest -Uri $sowpodsUrl -OutFile "sowpods_raw.txt"

Write-Host "Processing TWL..."
(Get-Content "twl_raw.txt") | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim().ToUpper() } | Out-File -FilePath "public\data\twl.txt" -Encoding UTF8

Write-Host "Processing SOWPODS..."
(Get-Content "sowpods_raw.txt") | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim().ToUpper() } | Out-File -FilePath "public\data\sowpods.txt" -Encoding UTF8

Write-Host "TWL count: $((Get-Content public\data\twl.txt).Count)"
Write-Host "SOWPODS count: $((Get-Content public\data\sowpods.txt).Count)"

Remove-Item "twl_raw.txt"
Remove-Item "sowpods_raw.txt"
Write-Host "Done!"
