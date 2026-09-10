# One-shot BotFather-side config for the Telegram bot: description, short description and the
# command menu, in EN / RU / LV. Run once after deploying the functions.
#
# Usage (from the project root):
#     powershell -ExecutionPolicy Bypass -File .\supabase\functions\setup-bot.ps1 -Token "<BOT TOKEN>"
#
# The bot token is the "API Token" from BotFather. It is only used to call api.telegram.org and
# is never stored.
#
# This script is deliberately ASCII-only. The localized strings live in setup-bot.json (UTF-8),
# read explicitly as UTF-8 here, so Windows PowerShell 5.1's default ANSI script encoding can't
# corrupt them. Request bodies are sent as UTF-8 bytes for the same reason.

param(
  [Parameter(Mandatory = $true)]
  [string]$Token
)

$ErrorActionPreference = 'Stop'
$api = "https://api.telegram.org/bot$Token"
$cfgPath = Join-Path $PSScriptRoot 'setup-bot.json'
$cfg = (Get-Content -Raw -Encoding UTF8 -LiteralPath $cfgPath) | ConvertFrom-Json

function Invoke-Bot([string]$method, $payload) {
  $json  = $payload | ConvertTo-Json -Depth 8 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $res = Invoke-RestMethod -Method Post -Uri "$api/$method" -ContentType 'application/json; charset=utf-8' -Body $bytes
  Write-Host ("  {0,-22} ok={1}" -f $method, $res.ok)
}

$me = Invoke-RestMethod -Uri "$api/getMe"
Write-Host ("Bot: @{0}  ({1})" -f $me.result.username, $me.result.first_name)
Write-Host ""

foreach ($lc in 'en', 'ru', 'lv') {
  Write-Host "Language: $lc"
  Invoke-Bot 'setMyDescription'      @{ description       = $cfg.description.$lc;       language_code = $lc }
  Invoke-Bot 'setMyShortDescription' @{ short_description = $cfg.short_description.$lc; language_code = $lc }
  Invoke-Bot 'setMyCommands'         @{ commands          = $cfg.commands.$lc;          language_code = $lc }
}

Write-Host "Default (fallback = English)"
Invoke-Bot 'setMyDescription'      @{ description       = $cfg.description.en }
Invoke-Bot 'setMyShortDescription' @{ short_description = $cfg.short_description.en }
Invoke-Bot 'setMyCommands'         @{ commands          = $cfg.commands.en }

Write-Host ""
Write-Host "Done."
Write-Host "Verify RU:  (Invoke-RestMethod '$api/getMyDescription?language_code=ru').result.description"
Write-Host "To see the description + START again: bot chat -> tap bot name -> 'Delete and Stop', then reopen the bot."
