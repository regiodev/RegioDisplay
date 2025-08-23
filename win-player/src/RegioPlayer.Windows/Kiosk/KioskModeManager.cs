using Microsoft.Extensions.Logging;
using Microsoft.Win32;
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows;

namespace RegioPlayer.Windows.Kiosk;

public static class KioskModeManager
{
    private static ILogger? _logger;
    
    // Windows API constants
    private const int SW_HIDE = 0;
    private const int SW_SHOW = 5;
    
    // Windows API imports
    [DllImport("user32.dll")]
    private static extern int FindWindow(string? className, string? windowText);
    
    [DllImport("user32.dll")]
    private static extern int ShowWindow(int hwnd, int command);
    
    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);
    
    private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_SHOWWINDOW = 0x0040;

    public static void SetLogger(ILogger logger)
    {
        _logger = logger;
    }

    public static void EnableKioskMode()
    {
        try
        {
            _logger?.LogInformation("Enabling kiosk mode");

            // Hide taskbar
            HideTaskbar();
            
            // Setup auto-start
            SetupAutoStart();
            
            // Disable system keys (this is limited in user mode)
            DisableSystemKeys();
            
            _logger?.LogInformation("Kiosk mode enabled successfully");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to enable kiosk mode");
        }
    }

    public static void DisableKioskMode()
    {
        try
        {
            _logger?.LogInformation("Disabling kiosk mode");

            // Show taskbar
            ShowTaskbar();
            
            // Remove auto-start
            RemoveAutoStart();
            
            // Re-enable system keys
            EnableSystemKeys();
            
            _logger?.LogInformation("Kiosk mode disabled successfully");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to disable kiosk mode");
        }
    }

    public static void EnsureTopmost(Window window)
    {
        try
        {
            var windowHandle = new System.Windows.Interop.WindowInteropHelper(window).Handle;
            SetWindowPos(windowHandle, HWND_TOPMOST, 0, 0, 0, 0, 
                SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to ensure window is topmost");
        }
    }

    private static void HideTaskbar()
    {
        try
        {
            var taskBarHandle = FindWindow("Shell_TrayWnd", null);
            if (taskBarHandle != 0)
            {
                ShowWindow(taskBarHandle, SW_HIDE);
                _logger?.LogDebug("Taskbar hidden");
            }

            // Also hide start button if found
            var startButtonHandle = FindWindow("Button", "Start");
            if (startButtonHandle != 0)
            {
                ShowWindow(startButtonHandle, SW_HIDE);
                _logger?.LogDebug("Start button hidden");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to hide taskbar");
        }
    }

    private static void ShowTaskbar()
    {
        try
        {
            var taskBarHandle = FindWindow("Shell_TrayWnd", null);
            if (taskBarHandle != 0)
            {
                ShowWindow(taskBarHandle, SW_SHOW);
                _logger?.LogDebug("Taskbar shown");
            }

            var startButtonHandle = FindWindow("Button", "Start");
            if (startButtonHandle != 0)
            {
                ShowWindow(startButtonHandle, SW_SHOW);
                _logger?.LogDebug("Start button shown");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to show taskbar");
        }
    }

    private static void SetupAutoStart()
    {
        try
        {
            var exePath = Process.GetCurrentProcess().MainModule?.FileName;
            if (string.IsNullOrEmpty(exePath)) return;

            using var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", true);
            key?.SetValue("RegioWindowsPlayer", $"\"{exePath}\"");
            
            _logger?.LogDebug("Auto-start registry entry created");
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to setup auto-start");
        }
    }

    private static void RemoveAutoStart()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", true);
            if (key?.GetValue("RegioWindowsPlayer") != null)
            {
                key.DeleteValue("RegioWindowsPlayer");
                _logger?.LogDebug("Auto-start registry entry removed");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to remove auto-start");
        }
    }

    private static void DisableSystemKeys()
    {
        // Note: In user mode, we have limited ability to disable system keys
        // This would require a low-level keyboard hook or group policy settings
        // For production deployment, consider using Windows Kiosk Mode or Assigned Access
        
        _logger?.LogDebug("System key disabling requested (limited in user mode)");
    }

    private static void EnableSystemKeys()
    {
        // Corresponding enable function
        _logger?.LogDebug("System key enabling requested");
    }

    public static bool IsKioskModeSupported()
    {
        try
        {
            // Check if we're running on a supported Windows version
            var version = Environment.OSVersion.Version;
            return version.Major >= 10; // Windows 10 and later
        }
        catch
        {
            return false;
        }
    }

    public static void ConfigureWindowsKioskMode()
    {
        // This method would configure Windows built-in kiosk mode
        // Requires administrator privileges and specific Windows configuration
        
        try
        {
            _logger?.LogInformation("Configuring Windows Kiosk Mode (requires admin privileges)");
            
            // This would typically involve:
            // 1. Creating a dedicated kiosk user account
            // 2. Configuring Assigned Access policy
            // 3. Setting up automatic login
            // 4. Configuring group policies
            
            // Implementation would require PowerShell commands or Windows Management APIs
            _logger?.LogWarning("Windows Kiosk Mode configuration not implemented - requires admin setup");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to configure Windows Kiosk Mode");
        }
    }

    public static class PowerManagement
    {
        [DllImport("kernel32.dll")]
        private static extern bool SetThreadExecutionState(ExecutionState esFlags);

        [Flags]
        private enum ExecutionState : uint
        {
            SystemRequired = 0x00000001,
            DisplayRequired = 0x00000002,
            UserPresent = 0x00000004,
            AwayModeRequired = 0x00000040,
            Continuous = 0x80000000,
        }

        public static void PreventSleep()
        {
            try
            {
                SetThreadExecutionState(ExecutionState.Continuous | 
                                      ExecutionState.SystemRequired | 
                                      ExecutionState.DisplayRequired);
                
                _logger?.LogDebug("Sleep prevention enabled");
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to prevent system sleep");
            }
        }

        public static void AllowSleep()
        {
            try
            {
                SetThreadExecutionState(ExecutionState.Continuous);
                _logger?.LogDebug("Sleep prevention disabled");
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to allow system sleep");
            }
        }
    }
}