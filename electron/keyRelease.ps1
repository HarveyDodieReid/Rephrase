# Polls until EITHER Ctrl OR Win is released, then writes "released" and exits.
# Called after push-to-talk starts so we know when to stop recording.

param(
    [string]$Modifier = "ctrl"
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KeyRel {
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
}
"@ -Language CSharp

while ($true) {
    $modPressed = $false
    if ($Modifier -eq "alt") {
        $modPressed = ([KeyRel]::GetAsyncKeyState(0x12) -band 0x8000) -ne 0
    } else {
        $modPressed = ([KeyRel]::GetAsyncKeyState(0x11) -band 0x8000) -ne 0
    }

    $lwin  = ([KeyRel]::GetAsyncKeyState(0x5B) -band 0x8000) -ne 0
    $rwin  = ([KeyRel]::GetAsyncKeyState(0x5C) -band 0x8000) -ne 0

    if (-not $modPressed -or (-not $lwin -and -not $rwin)) {
        [Console]::WriteLine("released")
        [Console]::Out.Flush()
        exit
    }

    [System.Threading.Thread]::Sleep(50)
}
