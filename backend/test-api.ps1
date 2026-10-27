
try {
    Write-Host "Logging in as Vendor..."
    $vendorParams = @{
        Uri = "http://localhost:3001/auth/login"
        Method = "Post"
        Body = @{
            email = "vendor1@test.com"
            password = "password123"
        } | ConvertTo-Json
        ContentType = "application/json"
    }
    $vendorLogin = Invoke-RestMethod @vendorParams
    $token = $vendorLogin.access_token
    Write-Host "✅ Login Success. Token Prefix: $($token.Substring(0, 10))..."

    Write-Host "Fetching Available Challans..."
    $headers = @{ Authorization = "Bearer $token" }
    $challans = Invoke-RestMethod -Uri "http://localhost:3001/vendor-invoices/available-challans" -Headers $headers
    
    Write-Host "✅ Challans Count: $($challans.Count)"
    
    if ($challans.Count -gt 0) {
        $c = $challans[0]
        Write-Host "Sample Challan: $($c.challanNumber)"
        Write-Host "Items: $($c.items.Count)"
        
        # Try to Create Invoice for first item
        $item = $c.items[0]
        $qty = 5
        Write-Host "Creating Invoice for Item $($item.partNumber) (Qty: $qty)..."
        
        $invBody = @{
            invoiceNumber = "INV-Test-$(Get-Date -Format 'yyyyMMddHHmmss')"
            invoiceDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            customerId = $c.customerId
            remarks = "PS E2E Test"
            items = @(
                @{
                    challanItemId = $item.id
                    invoiceQuantity = $qty
                }
            )
        } | ConvertTo-Json -Depth 5

        $invResponse = Invoke-RestMethod -Uri "http://localhost:3001/vendor-invoices" -Method Post -Headers $headers -Body $invBody -ContentType "application/json"
        Write-Host "✅ Invoice Created: $($invResponse.invoiceNumber)"
        Write-Host "   Total Amount: $($invResponse.totalAmount)"
    } else {
        Write-Error "❌ No Challans found!"
    }

} catch {
    Write-Error "❌ Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Error "Response Body: $($reader.ReadToEnd())"
    }
}
