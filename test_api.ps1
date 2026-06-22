$ErrorActionPreference = "Stop"

$body1 = @{ letters="zebra"; dictionary="TWL" } | ConvertTo-Json
$response1 = Invoke-RestMethod -Uri "http://localhost:4321/api/find-words" -Method Post -Body $body1 -ContentType "application/json"
Write-Host "Test 1:"
$response1 | ConvertTo-Json -Depth 5

$body2 = @{ word="quixotic" } | ConvertTo-Json
$response2 = Invoke-RestMethod -Uri "http://localhost:4321/api/check-word" -Method Post -Body $body2 -ContentType "application/json"
Write-Host "Test 2:"
$response2 | ConvertTo-Json -Depth 5
