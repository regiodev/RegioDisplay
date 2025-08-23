using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Infrastructure.Api;
using RegioPlayer.Infrastructure.Storage;
using RegioPlayer.Infrastructure.WebSocket;
using RegioPlayer.Core.Managers;
using RegioPlayer.UI.ViewModels;
using RegioPlayer.UI.Views;
using RegioPlayer.Windows.Kiosk;
using Serilog;
using System;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;

namespace RegioPlayer.UI;

public partial class App : Application
{
    private ServiceProvider? _serviceProvider;

    protected override void OnStartup(StartupEventArgs e)
    {
        var services = new ServiceCollection();

        // Configure Serilog
        Log.Logger = new LoggerConfiguration()
            .WriteTo.File("logs/regio-player.log", rollingInterval: Serilog.RollingInterval.Day)
            .CreateLogger();

        // Register services
        services.AddSingleton<IApiService, ApiService>();
        services.AddSingleton<IWebSocketService, WebSocketService>();
        services.AddSingleton<IStorageService, StorageService>();
        services.AddSingleton<IMediaManager, MediaManager>();
        services.AddSingleton<IScreenManager, ScreenManager>();

        // Register ViewModels in correct order (dependencies first)
        services.AddTransient<SettingsViewModel>();
        services.AddTransient<PlayerViewModel>();
        services.AddTransient<PairingViewModel>();
        services.AddTransient<MainViewModel>();

        // Register Views
        services.AddTransient<MainWindow>();

        // Logging
        services.AddLogging(builder =>
        {
            builder.AddSerilog(Log.Logger);
        });

        _serviceProvider = services.BuildServiceProvider();

        // Configure kiosk mode
        var logger = _serviceProvider.GetService<ILogger<App>>();
        KioskModeManager.SetLogger(logger!);
        
        // Setup kiosk mode
        if (!Debugger.IsAttached)
        {
            KioskModeManager.EnableKioskMode();
            KioskModeManager.PowerManagement.PreventSleep();
        }

        try 
        {
            // Launch main window
            var mainWindow = _serviceProvider.GetRequiredService<MainWindow>();
            mainWindow.Show();
        }
        catch (Exception ex)
        {
            var appLogger = _serviceProvider.GetService<ILogger<App>>();
            appLogger?.LogError(ex, "Failed to create MainWindow - dependency injection error");
            
            // Create a simple error window to show the issue
            var errorWindow = new Window
            {
                Title = "Startup Error",
                Width = 600,
                Height = 400,
                Content = new TextBlock 
                { 
                    Text = $"Startup Error:\n\n{ex.Message}\n\nStack Trace:\n{ex.StackTrace}",
                    Margin = new System.Windows.Thickness(20),
                    TextWrapping = System.Windows.TextWrapping.Wrap
                }
            };
            errorWindow.Show();
        }

        base.OnStartup(e);
    }

    protected override void OnExit(ExitEventArgs e)
    {
        if (!Debugger.IsAttached)
        {
            KioskModeManager.PowerManagement.AllowSleep();
            KioskModeManager.DisableKioskMode();
        }

        _serviceProvider?.Dispose();
        Log.CloseAndFlush();
        base.OnExit(e);
    }
}