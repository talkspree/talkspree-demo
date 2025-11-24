# Deploy Agora Token Generation Edge Function
# Run this script to deploy the Edge Function to Supabase

Write-Host "🚀 Agora Edge Function Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SUPABASE_ACCESS_TOKEN is set
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "⚠️  SUPABASE_ACCESS_TOKEN not set!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please follow these steps:" -ForegroundColor White
    Write-Host "1. Go to https://supabase.com/dashboard/account/tokens" -ForegroundColor White
    Write-Host "2. Click 'Generate new token'" -ForegroundColor White
    Write-Host "3. Copy the token" -ForegroundColor White
    Write-Host "4. Run this command (replace YOUR_TOKEN):" -ForegroundColor White
    Write-Host '   $env:SUPABASE_ACCESS_TOKEN="YOUR_TOKEN"' -ForegroundColor Green
    Write-Host "5. Then run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Access token found!" -ForegroundColor Green
Write-Host ""

# Link to project
Write-Host "🔗 Linking to Supabase project..." -ForegroundColor Cyan
npx supabase link --project-ref ywdfdzlffburtwbssfwz

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to link project" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project linked!" -ForegroundColor Green
Write-Host ""

# Deploy the function
Write-Host "📦 Deploying Edge Function..." -ForegroundColor Cyan
npx supabase functions deploy generate-agora-token --no-verify-jwt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy function" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Edge Function deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run the SQL migration in Supabase Dashboard" -ForegroundColor White
Write-Host "2. Enable certificate in Agora Console" -ForegroundColor White
Write-Host "3. Test your video calls!" -ForegroundColor White
Write-Host ""
Write-Host "See AGORA_CERTIFICATE_SETUP.md for detailed instructions" -ForegroundColor Yellow

