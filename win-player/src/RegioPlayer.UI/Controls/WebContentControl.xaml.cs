using Microsoft.Extensions.Logging;
using Microsoft.Web.WebView2.Core;
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace RegioPlayer.UI.Controls;

public partial class WebContentControl : UserControl
{
    private ILogger<WebContentControl>? _logger;
    private Timer? _refreshTimer;
    private bool _isInitialized = false;
    
    public static readonly DependencyProperty SourceProperty =
        DependencyProperty.Register(nameof(Source), typeof(string), typeof(WebContentControl),
            new PropertyMetadata(null, OnSourceChanged));

    public static readonly DependencyProperty RefreshIntervalProperty =
        DependencyProperty.Register(nameof(RefreshInterval), typeof(int?), typeof(WebContentControl),
            new PropertyMetadata(null, OnRefreshIntervalChanged));

    public string? Source
    {
        get => (string?)GetValue(SourceProperty);
        set => SetValue(SourceProperty, value);
    }

    public int? RefreshInterval
    {
        get => (int?)GetValue(RefreshIntervalProperty);
        set => SetValue(RefreshIntervalProperty, value);
    }

    public event Action? NavigationCompleted;
    public event Action<Exception>? NavigationFailed;

    public WebContentControl()
    {
        InitializeComponent();
        Loaded += WebContentControl_Loaded;
        Unloaded += WebContentControl_Unloaded;
    }

    public void SetLogger(ILogger<WebContentControl> logger)
    {
        _logger = logger;
    }

    private async void WebContentControl_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            if (!_isInitialized)
            {
                await InitializeWebView();
                _isInitialized = true;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to initialize WebView2");
            ShowError(true);
        }
    }

    private void WebContentControl_Unloaded(object sender, RoutedEventArgs e)
    {
        _refreshTimer?.Dispose();
        _refreshTimer = null;
    }

    private async Task InitializeWebView()
    {
        try
        {
            // Create WebView2 environment with custom data folder in LocalAppData
            var webView2DataPath = System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "RegioWindowsPlayer", "WebView2");
            
            System.IO.Directory.CreateDirectory(webView2DataPath);
            
            var environment = await CoreWebView2Environment.CreateAsync(null, webView2DataPath);
            
            // Ensure WebView2 environment with custom data folder
            await WebView.EnsureCoreWebView2Async(environment);
            
            if (!string.IsNullOrEmpty(Source))
            {
                _ = LoadUrl(Source);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "WebView2 initialization failed");
            throw;
        }
    }

    private static void OnSourceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is WebContentControl control && e.NewValue is string source)
        {
            _ = control.LoadUrl(source);
        }
    }

    private static void OnRefreshIntervalChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is WebContentControl control && e.NewValue is int interval)
        {
            control.SetupRefreshTimer(interval);
        }
    }

    private async Task LoadUrl(string url)
    {
        try
        {
            if (string.IsNullOrEmpty(url)) return;

            _logger?.LogDebug("Loading web content: {Url}", url);
            
            ShowLoading(true);
            ShowError(false);

            if (_isInitialized)
            {
                WebView.Source = new Uri(url);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to load URL: {Url}", url);
            ShowLoading(false);
            ShowError(true);
            NavigationFailed?.Invoke(ex);
        }
    }

    private void SetupRefreshTimer(int intervalSeconds)
    {
        try
        {
            _refreshTimer?.Dispose();
            
            if (intervalSeconds > 0)
            {
                _logger?.LogDebug("Setting up refresh timer: {Interval} seconds", intervalSeconds);
                
                _refreshTimer = new Timer(RefreshPage, null,
                    TimeSpan.FromSeconds(intervalSeconds),
                    TimeSpan.FromSeconds(intervalSeconds));
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to setup refresh timer");
        }
    }

    private void RefreshPage(object? state)
    {
        try
        {
            Dispatcher.Invoke(() =>
            {
                if (_isInitialized && WebView.CoreWebView2 != null)
                {
                    _logger?.LogDebug("Refreshing web page");
                    WebView.CoreWebView2.Reload();
                }
            });
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to refresh web page");
        }
    }

    private void ShowLoading(bool show)
    {
        LoadingOverlay.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ShowError(bool show)
    {
        ErrorOverlay.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
    }

    private async void WebView_CoreWebView2InitializationCompleted(object? sender, CoreWebView2InitializationCompletedEventArgs e)
    {
        try
        {
            if (e.IsSuccess)
            {
                _logger?.LogDebug("WebView2 core initialized successfully");
                
                // Configure WebView2 settings
                var settings = WebView.CoreWebView2.Settings;
                settings.IsGeneralAutofillEnabled = false;
                settings.IsPasswordAutosaveEnabled = false;
                settings.AreDefaultContextMenusEnabled = false;
                settings.AreDefaultScriptDialogsEnabled = false;
                settings.AreBrowserAcceleratorKeysEnabled = false;
                settings.AreDevToolsEnabled = false;

                // Inject CSS to hide scrollbars and make fullscreen
                WebView.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.Document);
                WebView.CoreWebView2.WebResourceRequested += OnWebResourceRequested;

                if (!string.IsNullOrEmpty(Source))
                {
                    _ = LoadUrl(Source);
                }
            }
            else
            {
                _logger?.LogError(e.InitializationException, "WebView2 initialization failed");
                ShowError(true);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error in WebView2 initialization completion");
            ShowError(true);
        }
    }

    private void OnWebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
    {
        // Inject CSS for fullscreen experience
        var css = @"
            <style>
                body { 
                    margin: 0; 
                    padding: 0; 
                    overflow: hidden; 
                    background: black; 
                }
                html { 
                    overflow: hidden; 
                }
                ::-webkit-scrollbar { 
                    display: none; 
                }
            </style>";

        // This would need more sophisticated implementation to inject CSS
        // For now, we rely on the web content being designed appropriately
    }

    private void WebView_NavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        _logger?.LogDebug("Navigation starting: {Uri}", e.Uri);
        ShowLoading(true);
        ShowError(false);
    }

    private void WebView_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        try
        {
            ShowLoading(false);
            
            if (e.IsSuccess)
            {
                _logger?.LogDebug("Navigation completed successfully");
                NavigationCompleted?.Invoke();
            }
            else
            {
                _logger?.LogWarning("Navigation failed for web content");
                ShowError(true);
                NavigationFailed?.Invoke(new Exception("Navigation failed"));
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error handling navigation completion");
            ShowError(true);
        }
    }

    public void Refresh()
    {
        try
        {
            if (_isInitialized && WebView.CoreWebView2 != null)
            {
                WebView.CoreWebView2.Reload();
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to refresh web content manually");
        }
    }

    public void NavigateToUrl(string url)
    {
        Source = url;
    }
}