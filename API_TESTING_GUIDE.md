# API Testing Guide

## Testing the HTML Image Extractor API

Your API is now ready! Here are different ways to test it:

### Method 1: Browser Testing (GET request)
1. Start your development server: `npm run dev`
2. Open your browser and go to:
   ```
   http://localhost:3000/api/user?html=<h1>Test</h1><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test" />
   ```

### Method 2: PowerShell Testing (GET request)
```powershell
# Simple test with URL-encoded HTML
$html = [System.Web.HttpUtility]::UrlEncode('<h1>Test</h1><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test" />')
Invoke-RestMethod -Uri "http://localhost:3000/api/user?html=$html" -Method GET
```

### Method 3: PowerShell Testing (POST request)
```powershell
# Test with POST request
$body = @{
    html = '<h1>Test Page</h1><p>Some content</p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test image" /><p>More content</p>'
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/user" -Method POST -Body $body -ContentType "application/json"
```

### Method 4: Using test files
```powershell
# Read HTML from file and test
$htmlContent = Get-Content -Path "test-samples/sample1.html" -Raw
$body = @{ html = $htmlContent } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/user" -Method POST -Body $body -ContentType "application/json"
```

### Method 5: Using curl (if available)
```bash
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Test</h1><img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==\" alt=\"test\" />"}'
```

## API Response Format

The API returns:
```json
{
  "success": true,
  "extractedImages": 2,
  "processedHTML": "<h1>Test</h1>[IMAGE_1]<p>Content</p>[IMAGE_2]",
  "aiResponse": "AI analysis of the content and images...",
  "imageParts": [
    {
      "index": 1,
      "mimeType": "image/png",
      "dataSize": 123
    },
    {
      "index": 2,
      "mimeType": "image/jpeg",
      "dataSize": 456
    }
  ]
}
```

## Features
- ✅ Extracts images from HTML (both data URLs and external URLs)
- ✅ Converts external images to base64
- ✅ Structures data for Gemini AI (imageParts array + text)
- ✅ Handles both GET and POST requests
- ✅ Proper error handling
- ✅ Replaces images with placeholders in HTML to avoid duplication