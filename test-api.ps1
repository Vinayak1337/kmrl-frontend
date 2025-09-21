# Test script for API
$testHtml = '''
<!DOCTYPE html>
<html>
<body>
    <h1>Test Image</h1>
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Red Pixel" />
</body>
</html>
'''

# URL-encode the HTML content
$encodedHtml = [System.Web.HttpUtility]::UrlEncode($testHtml)

$uri = "http://localhost:3000/api/user?html=$encodedHtml"

Write-Host "Testing API with GET request..."
Write-Host "URI: $uri"

try {
    $response = Invoke-RestMethod -Uri $uri -Method GET
    # Format the output for better readability
    $jsonResponse = $response | ConvertTo-Json -Depth 10
    Write-Host $jsonResponse
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}