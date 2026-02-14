param(
  [string]$Scenario = "login"
)

if ($Scenario -eq "login") {
  k6 run .\k6-login.js
}
else {
  Write-Host "Unknown scenario"
}
