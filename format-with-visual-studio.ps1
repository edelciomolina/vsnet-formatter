param(
    [Parameter(Mandatory = $true)]
    [string[]]$Path,

    [string]$ProgId = "VisualStudio.DTE.17.0"
)

$ErrorActionPreference = "Stop"
$dte = $null
$document = $null

function Invoke-ComAction {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action,

        [int]$MaxAttempts = 120,

        [int]$DelayMilliseconds = 500
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            return & $Action
        }
        catch [Runtime.InteropServices.COMException] {
            if ($attempt -eq $MaxAttempts) {
                throw
            }

            Start-Sleep -Milliseconds $DelayMilliseconds
        }
    }
}

try {
    $dte = Invoke-ComAction { New-Object -ComObject $ProgId }
    Invoke-ComAction { $dte.SuppressUI = $true } | Out-Null
    Invoke-ComAction { $dte.MainWindow.Visible = $false } | Out-Null

    foreach ($item in $Path) {
        $resolvedPath = (Resolve-Path -LiteralPath $item).Path
        Invoke-ComAction { $dte.ItemOperations.OpenFile($resolvedPath) | Out-Null }
        Start-Sleep -Milliseconds 1000
        $document = Invoke-ComAction { $dte.ActiveDocument }
        Invoke-ComAction { $dte.ExecuteCommand("Edit.FormatDocument") | Out-Null }
        Invoke-ComAction { $document.Save() } | Out-Null
        Invoke-ComAction { $document.Close() | Out-Null }
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
        $document = $null
    }
}
finally {
    if ($dte) {
        Invoke-ComAction { $dte.Quit() | Out-Null }
    }

    if ($null -ne $document) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
    }

    if ($null -ne $dte) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($dte)
    }
}
