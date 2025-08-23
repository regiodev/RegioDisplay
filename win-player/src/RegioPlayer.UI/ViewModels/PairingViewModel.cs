using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Common;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Input;

namespace RegioPlayer.UI.ViewModels;

public class PairingViewModel : ViewModelBase
{
    private readonly IScreenManager _screenManager;
    private readonly ILogger<PairingViewModel> _logger;
    
    private string _pairingCode = string.Empty;
    private string _uniqueKey = string.Empty;
    private bool _isPairing = false;
    private string _statusMessage = "Generating pairing code...";
    private Timer? _pairingMonitorTimer;
    private CancellationTokenSource? _cancellationTokenSource;

    public PairingViewModel(IScreenManager screenManager, ILogger<PairingViewModel> logger)
    {
        _screenManager = screenManager;
        _logger = logger;
        
        GenerateNewCodeCommand = new RelayCommand(async () => await GenerateNewCodesAsync());
        TestConnectionCommand = new RelayCommand(async () => await TestConnectionAsync());
    }

    public string PairingCode
    {
        get => _pairingCode;
        set => SetProperty(ref _pairingCode, value);
    }

    public string UniqueKey
    {
        get => _uniqueKey;
        set => SetProperty(ref _uniqueKey, value);
    }

    public bool IsPairing
    {
        get => _isPairing;
        set => SetProperty(ref _isPairing, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public ICommand GenerateNewCodeCommand { get; }
    public ICommand TestConnectionCommand { get; }

    public event Action? PairingCompleted;

    public async Task InitializeAsync()
    {
        try
        {
            _logger.LogInformation("Initializing PairingViewModel...");
            StatusMessage = "Loading existing pairing code...";
            
            // Register with backend (this will create screen if not exists, or use existing)
            var registered = await _screenManager.RegisterAsync();
            if (registered && _screenManager.CurrentScreen != null)
            {
                // Use the existing/persistent pairing code from storage
                UniqueKey = _screenManager.CurrentScreen.UniqueKey;
                PairingCode = _screenManager.CurrentScreen.PairingCode;
                
                // Verify we have valid codes - if not, generate them
                if (string.IsNullOrEmpty(PairingCode) || string.IsNullOrEmpty(UniqueKey))
                {
                    _logger.LogWarning("Missing pairing code or unique key - generating new ones");
                    await GenerateNewCodesAsync();
                    return; // GenerateNewCodesAsync will set the proper status
                }
                
                _logger.LogInformation("Using persistent pairing code: {PairingCode}", PairingCode);
                
                StatusMessage = "Ready for pairing";
                IsPairing = true;
                await StartPairingMonitorAsync();
            }
            else
            {
                StatusMessage = "Failed to register screen - generating offline codes";
                _logger.LogWarning("Backend registration failed - generating codes for offline use");
                await GenerateNewCodesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize pairing");
            StatusMessage = "Initialization failed";
        }
    }


    public async Task GenerateNewCodesAsync()
    {
        try
        {
            StatusMessage = "Generating new pairing code...";
            
            // Stop pairing monitor to avoid interference
            await StopPairingMonitorAsync();
            
            // Generate new codes for the current screen
            var newUniqueKey = await _screenManager.GenerateUniqueKeyAsync();
            var newPairingCode = await _screenManager.GeneratePairingCodeAsync();
            
            _logger.LogInformation("Generated new pairing code: {PairingCode} for key: {UniqueKey}", 
                newPairingCode, newUniqueKey);

            // Update current screen with new codes
            if (_screenManager.CurrentScreen != null)
            {
                _screenManager.CurrentScreen.UniqueKey = newUniqueKey;
                _screenManager.CurrentScreen.PairingCode = newPairingCode;
                _screenManager.CurrentScreen.IsActive = false; // Reset activation status
                
                // Save updated screen to storage
                await _screenManager.SaveCurrentScreenAsync();
            }
            else
            {
                // This case should not happen since RegisterAsync would create a screen,
                // but handle it gracefully
                _logger.LogWarning("No current screen exists when generating new codes - this should not happen");
            }

            // Update UI immediately (no status message changes)
            UniqueKey = newUniqueKey;
            PairingCode = newPairingCode;
            StatusMessage = "Ready for pairing";

            // Register the screen with new credentials (this might update status, but only once)
            try
            {
                await _screenManager.RegisterAsync();
                await StartPairingMonitorAsync();
            }
            catch (Exception regEx)
            {
                _logger.LogWarning(regEx, "Failed to register with backend - codes still generated for offline use");
                // Don't change StatusMessage - keep "Ready for pairing"
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate new pairing codes");
            StatusMessage = "Failed to generate codes";
        }
    }

    private async Task TestConnectionAsync()
    {
        try
        {
            StatusMessage = "Testing connection...";
            
            // This would test the API connection
            // For now, we'll just show a message
            StatusMessage = "Connection test not implemented yet";
            
            await Task.Delay(2000);
            StatusMessage = "Ready for pairing";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Connection test failed");
            StatusMessage = "Connection test failed";
        }
    }

    private async Task StartPairingMonitorAsync()
    {
        try
        {
            // Stop any existing monitor
            await StopPairingMonitorAsync();
            
            _cancellationTokenSource = new CancellationTokenSource();
            IsPairing = true;
            
            StatusMessage = "Waiting for pairing...";
            
            _logger.LogInformation("Starting pairing monitor for screen: {UniqueKey}", UniqueKey);

            // Start periodic check for pairing completion
            _pairingMonitorTimer = new Timer(CheckPairingStatus, null, 
                TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(5));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start pairing monitor");
            StatusMessage = "Failed to start pairing monitor";
        }
    }

    private async void CheckPairingStatus(object? state)
    {
        try
        {
            if (_cancellationTokenSource?.Token.IsCancellationRequested == true)
            {
                return;
            }

            _logger.LogDebug("Checking pairing status for screen: {UniqueKey}", UniqueKey);

            // Try to sync with the server to see if screen is now paired
            await _screenManager.SyncAsync();

            // Check if screen is now active (paired)
            if (_screenManager.CurrentScreen?.IsActive == true)
            {
                _logger.LogInformation("Pairing completed successfully for screen: {UniqueKey}", UniqueKey);
                
                await StopPairingMonitorAsync();
                
                StatusMessage = "Pairing successful!";
                IsPairing = false;
                
                // Notify that pairing is complete
                PairingCompleted?.Invoke();
            }
            // No else block - don't update StatusMessage unnecessarily to avoid flickering
            // The status remains "Ready for pairing" until actual pairing happens
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking pairing status");
            StatusMessage = "Error checking pairing status";
        }
    }

    private async Task StopPairingMonitorAsync()
    {
        try
        {
            _cancellationTokenSource?.Cancel();
            _pairingMonitorTimer?.Dispose();
            
            _pairingMonitorTimer = null;
            _cancellationTokenSource?.Dispose();
            _cancellationTokenSource = null;
            
            IsPairing = false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping pairing monitor");
        }
    }

    public void Dispose()
    {
        StopPairingMonitorAsync().ConfigureAwait(false).GetAwaiter().GetResult();
    }
}

// Simple RelayCommand implementation
public class RelayCommand : ICommand
{
    private readonly Func<Task> _execute;
    private readonly Func<bool>? _canExecute;

    public RelayCommand(Func<Task> execute, Func<bool>? canExecute = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    public event EventHandler? CanExecuteChanged
    {
        add { CommandManager.RequerySuggested += value; }
        remove { CommandManager.RequerySuggested -= value; }
    }

    public bool CanExecute(object? parameter)
    {
        return _canExecute == null || _canExecute();
    }

    public async void Execute(object? parameter)
    {
        await _execute();
    }
}