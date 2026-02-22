Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class KeyTracker {
    private const int WH_KEYBOARD_LL = 13;
    private const int WH_MOUSE_LL = 14;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_LBUTTONDOWN = 0x0201;
    
    private static LowLevelKeyboardProc _kbProc = HookCallback;
    private static LowLevelMouseProc _msProc = MouseHookCallback;
    private static IntPtr _kbHookID = IntPtr.Zero;
    private static IntPtr _msHookID = IntPtr.Zero;

    public static void Start() {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule) {
            _kbHookID = SetWindowsHookEx(WH_KEYBOARD_LL, _kbProc, GetModuleHandle(curModule.ModuleName), 0);
            _msHookID = SetWindowsHookEx(WH_MOUSE_LL, _msProc, GetModuleHandle(curModule.ModuleName), 0);
        }
        System.Windows.Forms.Application.Run();
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, Delegate lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("user32.dll")]
    private static extern int ToUnicodeEx(uint wVirtKey, uint wScanCode, byte[] lpKeyState, [Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pwszBuff, int cchBuff, uint wFlags, IntPtr dwhkl);

    [DllImport("user32.dll")]
    private static extern bool GetKeyboardState(byte[] lpKeyState);

    [DllImport("user32.dll")]
    private static extern IntPtr GetKeyboardLayout(uint idThread);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)) {
            int vkCode = Marshal.ReadInt32(lParam);
            
            if (vkCode == 8) {
                Console.WriteLine("BACKSPACE"); Console.Out.Flush();
            } else if (vkCode == 13) {
                Console.WriteLine("ENTER"); Console.Out.Flush();
            } else if (vkCode >= 37 && vkCode <= 40) {
                Console.WriteLine("ARROW"); Console.Out.Flush();
            } else if (vkCode == 32) {
                Console.WriteLine("SPACE"); Console.Out.Flush();
            } else {
                byte[] keyState = new byte[256];
                GetKeyboardState(keyState);
                
                // If Ctrl or Alt is held, probably a shortcut, so abort tracking
                if ((keyState[0x11] & 0x80) != 0 || (keyState[0x12] & 0x80) != 0) {
                    Console.WriteLine("MODIFIER"); Console.Out.Flush();
                } else {
                    StringBuilder sb = new StringBuilder(2);
                    IntPtr hWnd = GetForegroundWindow();
                    uint processId;
                    uint threadId = GetWindowThreadProcessId(hWnd, out processId);
                    IntPtr hkl = GetKeyboardLayout(threadId);

                    uint scanCode = 0;
                    int result = ToUnicodeEx((uint)vkCode, scanCode, keyState, sb, sb.Capacity, 0, hkl);
                    if (result > 0) {
                        Console.WriteLine("CHAR:" + sb.ToString());
                        Console.Out.Flush();
                    }
                }
            }
        }
        return CallNextHookEx(_kbHookID, nCode, wParam, lParam);
    }

    private static IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && wParam == (IntPtr)WM_LBUTTONDOWN) {
            Console.WriteLine("CLICK"); Console.Out.Flush();
        }
        return CallNextHookEx(_msHookID, nCode, wParam, lParam);
    }
}
"@ -ReferencedAssemblies System.Windows.Forms

[KeyTracker]::Start()