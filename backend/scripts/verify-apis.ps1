$base = "http://localhost:3000/api/v1"
$failures = @()
$passed = 0

function Test-Endpoint {
  param($Name, $Method, $Path, $Headers = @{}, $Body = $null, $ExpectStatus = 200)
  try {
    $params = @{
      Uri = "$base$Path"
      Method = $Method
      Headers = $Headers
      TimeoutSec = 10
      UseBasicParsing = $true
    }
    if ($Body) {
      $params.ContentType = "application/json"
      $params.Body = ($Body | ConvertTo-Json -Depth 5)
    }
    $r = Invoke-WebRequest @params
    if ($r.StatusCode -eq $ExpectStatus) {
      $script:passed++
      Write-Host "[OK] $Name"
      return $true
    }
    $script:failures += "$Name (status $($r.StatusCode))"
    Write-Host "[FAIL] $Name status $($r.StatusCode)"
    return $false
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq $ExpectStatus) {
      $script:passed++
      Write-Host "[OK] $Name"
      return $true
    }
    $script:failures += "$Name ($($_.Exception.Message))"
    Write-Host "[FAIL] $Name - $($_.Exception.Message)"
    return $false
  }
}

Write-Host "=== Public / Storefront ==="
Test-Endpoint "Health" GET "/health"
Test-Endpoint "Maps config" GET "/storefront/maps/config"
Test-Endpoint "Storefront menu (missing zone)" GET "/storefront/menu" -ExpectStatus 400
Test-Endpoint "Storefront menu (bad zone)" GET "/storefront/menu?zone_id=00000000-0000-0000-0000-000000000000" -ExpectStatus 404

Write-Host "`n=== Auth ==="
$loginOk = Test-Endpoint "Login" POST "/auth/login" @{} @{ email = "admin@restaurant.com"; password = "Admin@123" }
$token = $null
if ($loginOk) {
  try {
    $login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@restaurant.com","password":"Admin@123"}'
    $token = $login.data.token
  } catch {}
}

if (-not $token) {
  Write-Host "Cannot continue admin tests - login failed. Restart backend?"
  exit 1
}

$h = @{ Authorization = "Bearer $token" }

Write-Host "`n=== Admin APIs ==="
Test-Endpoint "Auth me" GET "/auth/me" $h
Test-Endpoint "Settings GET" GET "/settings" $h
Test-Endpoint "Hero GET" GET "/hero" $h
Test-Endpoint "Sales summary" GET "/sales/summary?range=weekly" $h
Test-Endpoint "Sales by-item" GET "/sales/by-item" $h
Test-Endpoint "Sales by-category" GET "/sales/by-category" $h
Test-Endpoint "Sales by-day" GET "/sales/by-day" $h
Test-Endpoint "Slips list" GET "/slips" $h
Test-Endpoint "Riders list" GET "/delivery/riders" $h
Test-Endpoint "Categories" GET "/delivery/menu/categories" $h
Test-Endpoint "Menu items" GET "/delivery/menu/items" $h
Test-Endpoint "Marketing deals" GET "/admin/deals" $h
Test-Endpoint "Delivery orders" GET "/delivery/orders" $h
Test-Endpoint "Dashboard" GET "/delivery/dashboard" $h
Test-Endpoint "Delivery summary" GET "/delivery/summary" $h
Test-Endpoint "Catalog deals" GET "/delivery/deals" $h

Write-Host "`n=== Summary ==="
Write-Host "Passed: $passed"
if ($failures.Count -gt 0) {
  Write-Host "Failures:"
  $failures | ForEach-Object { Write-Host "  - $_" }
  exit 1
}
Write-Host "All endpoints reachable."
