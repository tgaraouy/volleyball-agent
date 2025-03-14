# PowerShell script to start a local server for the Volleyball Program Management application

Write-Host "Starting server for Volleyball Program Management application..."
Write-Host "The application will be available at http://localhost:3000"
Write-Host "Press Ctrl+C to stop the server"
Write-Host ""

# Change to the project directory
Set-Location -Path $PSScriptRoot

# Start a Python HTTP server on port 3000
python -m http.server 3000 