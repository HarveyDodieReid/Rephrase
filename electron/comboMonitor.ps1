# Polls GetAsyncKeyState every 50 ms.
# Writes "combo_down" to stdout (with explicit flush) each time Ctrl+Win is pressed.

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ComboMon {
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
}
"@ -Language CSharp

$wasCtrlPressed = $false
$wasAltPressed = $false

while ($true) {
    $ctrl  = ([ComboMon]::GetAsyncKeyState(0x11) -band 0x8000) -ne 0
    $alt   = ([ComboMon]::GetAsyncKeyState(0x12) -band 0x8000) -ne 0
    $lwin  = ([ComboMon]::GetAsyncKeyState(0x5B) -band 0x8000) -ne 0
    $rwin  = ([ComboMon]::GetAsyncKeyState(0x5C) -band 0x8000) -ne 0

    $ctrlCombo = $ctrl -and ($lwin -or $rwin)
    $altCombo  = $alt -and ($lwin -or $rwin)

    if ($ctrlCombo -and -not $wasCtrlPressed) {
        [Console]::WriteLine("ctrl_win_down")
        [Console]::Out.Flush()
        $wasCtrlPressed = $true
    }
    if ($altCombo -and -not $wasAltPressed) {
        [Console]::WriteLine("alt_win_down")
        [Console]::Out.Flush()
        $wasAltPressed = $true
    }

    if (-not $ctrlCombo) {
        $wasCtrlPressed = $false
    }
    if (-not $altCombo) {
        $wasAltPressed = $false
    }

    [System.Threading.Thread]::Sleep(50)
}
