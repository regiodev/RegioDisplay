# PLAN TEHNIC DEZVOLTARE REGIO WINDOWS PLAYER
## Documentație Completă pentru Player Digital Signage Windows

---

## 1. ANALIZA SISTEMULUI EXISTENT

### 1.1 Protocolul de Comunicare
Bazat pe analiza codului backend și Android player, sistemul utilizează:

**WebSocket Connection:**
- Endpoint: `wss://display.regio-cloud.ro/api/ws/connect/{screen_key}`
- Keep-alive cu ping interval de 30 secunde
- Reconnect automat la 15 secunde în caz de deconectare

**HTTP API Endpoints:**
- `POST /api/client/register` - Înregistrarea playerului cu pairing code
- `GET /api/client/sync` - Sincronizarea playlist-ului
- Headers: `X-Screen-Key`, `X-Playlist-Version`

**Message Types WebSocket:**
```json
// Trimis de player la conectare
{
    "type": "device_info",
    "version": "1.0.0",
    "resolution": "1920x1080"
}

// Primit de la server
{
    "type": "ping"
}
// Mesaje: "playlist_updated", "screen_deleted"
```

### 1.2 Tipuri de Content Suportate
1. **Video**: mp4, avi, mkv, etc.
2. **Image**: jpg, png, gif, etc.  
3. **Web Content**: URL-uri cu refresh interval configurabil
4. **Audio**: mp3, wav, etc.

### 1.3 Configurări Ecran
- **Rotație**: 0°, 90°, 180°, 270°
- **Playlist assignment** dinamic
- **Screen pairing** cu cod de 6 caractere

---

## 2. ARHITECTURA APLICAȚIEI WINDOWS

### 2.1 Tehnologii Recomandate

**Framework Principal: WPF (.NET 6)**
- Motivație: Flexibilitate UI, suport multimedia robust, threading modern
- Alternative evaluate: UWP (limitări kiosk), WinForms (UI limitată)

**Componente Media:**
- **FFME (FFMediaElement)** - replacementul MediaElement cu FFmpeg
- **WebView2** - pentru conținut web modern
- **CefSharp** - backup pentru compatibilitate web

**Networking:**
- **System.Net.WebSockets** - pentru comunicare timp real
- **HttpClient** - pentru API calls
- **System.Text.Json** - pentru serialization

**Storage & Cache:**
- **SQLite** - pentru cache local și logs
- **File system** - pentru media cache

### 2.2 Structura Proiectului
```
RegioWindowsPlayer/
├── src/
│   ├── RegioPlayer.Core/              # Business logic
│   │   ├── Models/                    # Data models
│   │   ├── Services/                  # Services (API, WebSocket, Media)
│   │   ├── Managers/                  # State management
│   │   └── Interfaces/                # Abstractions
│   ├── RegioPlayer.UI/                # WPF Application
│   │   ├── Views/                     # Windows & User Controls
│   │   ├── ViewModels/                # MVVM ViewModels
│   │   ├── Controls/                  # Custom Controls
│   │   ├── Converters/                # Value Converters
│   │   └── Resources/                 # Styles & Templates
│   ├── RegioPlayer.Infrastructure/    # External concerns
│   │   ├── Api/                       # HTTP API client
│   │   ├── WebSocket/                 # WebSocket client
│   │   ├── Storage/                   # SQLite & file operations
│   │   └── Media/                     # Media processing
│   └── RegioPlayer.Windows/           # Windows-specific
│       ├── Kiosk/                     # Kiosk mode setup
│       ├── Services/                  # Windows services
│       └── Installation/              # Setup & deployment
├── tests/                             # Unit & Integration tests
├── docs/                              # Documentation
└── deployment/                        # Deployment scripts
```

---

## 3. IMPLEMENTARE PAS CU PAS

### FAZA 1: SETUP PROIECT ȘI INFRASTRUCTURA (Săptămâna 1)

#### 3.1 Crearea Soluției
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net6.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <ApplicationManifest>app.manifest</ApplicationManifest>
    <AssemblyVersion>1.0.0.0</AssemblyVersion>
  </PropertyGroup>
</Project>
```

#### 3.2 Dependințe NuGet
```xml
<PackageReference Include="Microsoft.Extensions.DependencyInjection" />
<PackageReference Include="Microsoft.Extensions.Hosting" />
<PackageReference Include="Microsoft.Extensions.Logging" />
<PackageReference Include="Microsoft.Extensions.Configuration" />
<PackageReference Include="FFME.Windows" /> <!-- Video playback -->
<PackageReference Include="Microsoft.Web.WebView2" /> <!-- Web content -->
<PackageReference Include="System.Data.SQLite.Core" />
<PackageReference Include="Newtonsoft.Json" />
<PackageReference Include="Serilog" />
```

#### 3.3 Models Core
```csharp
// Models/Screen.cs
public class Screen
{
    public string UniqueKey { get; set; }
    public string Name { get; set; }
    public string Location { get; set; }
    public string PairingCode { get; set; }
    public int Rotation { get; set; }
    public DateTime RotationUpdatedAt { get; set; }
    public bool IsActive { get; set; }
}

// Models/Playlist.cs
public class Playlist
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string PlaylistVersion { get; set; }
    public List<PlaylistItem> Items { get; set; }
    public int Rotation { get; set; }
}

// Models/PlaylistItem.cs
public class PlaylistItem
{
    public string Url { get; set; }
    public string Type { get; set; }
    public int Duration { get; set; }
    public int? WebRefreshInterval { get; set; }
}
```

### FAZA 2: SERVICII CORE (Săptămâna 2)

#### 3.4 API Service
```csharp
// Services/ApiService.cs
public interface IApiService
{
    Task<bool> RegisterScreenAsync(string uniqueKey, string pairingCode);
    Task<PlaylistResponse> SyncPlaylistAsync(string screenKey, string currentVersion);
    Task DownloadMediaAsync(string url, string localPath, IProgress<double> progress);
}

public class ApiService : IApiService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl = "https://display.regio-cloud.ro/api";
    
    public ApiService()
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "RegioWindowsPlayer/1.0");
    }
    
    public async Task<PlaylistResponse> SyncPlaylistAsync(string screenKey, string currentVersion)
    {
        _httpClient.DefaultRequestHeaders.Add("X-Screen-Key", screenKey);
        _httpClient.DefaultRequestHeaders.Add("X-Playlist-Version", currentVersion);
        
        var response = await _httpClient.GetAsync($"{_baseUrl}/client/sync");
        response.EnsureSuccessStatusCode();
        
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<PlaylistResponse>(json);
    }
}
```

#### 3.5 WebSocket Service
```csharp
// Services/WebSocketService.cs
public interface IWebSocketService
{
    event Action<string> MessageReceived;
    event Action Connected;
    event Action Disconnected;
    
    Task ConnectAsync(string screenKey, string version, string resolution);
    Task DisconnectAsync();
    Task SendAsync(string message);
}

public class WebSocketService : IWebSocketService
{
    private ClientWebSocket _webSocket;
    private CancellationTokenSource _cancellationTokenSource;
    private readonly ILogger<WebSocketService> _logger;
    
    public event Action<string> MessageReceived;
    public event Action Connected;
    public event Action Disconnected;
    
    public async Task ConnectAsync(string screenKey, string version, string resolution)
    {
        var uri = new Uri($"wss://display.regio-cloud.ro/api/ws/connect/{screenKey}");
        
        _cancellationTokenSource = new CancellationTokenSource();
        _webSocket = new ClientWebSocket();
        
        await _webSocket.ConnectAsync(uri, _cancellationTokenSource.Token);
        
        // Send device info
        var deviceInfo = new
        {
            type = "device_info",
            version = version,
            resolution = resolution
        };
        
        await SendAsync(JsonSerializer.Serialize(deviceInfo));
        Connected?.Invoke();
        
        // Start receiving messages
        _ = Task.Run(ReceiveLoop);
        _ = Task.Run(KeepAliveLoop);
    }
    
    private async Task ReceiveLoop()
    {
        var buffer = new byte[4096];
        while (_webSocket.State == WebSocketState.Open)
        {
            var result = await _webSocket.ReceiveAsync(buffer, _cancellationTokenSource.Token);
            var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
            
            if (!message.Contains("ping"))
                MessageReceived?.Invoke(message);
        }
    }
    
    private async Task KeepAliveLoop()
    {
        while (_webSocket.State == WebSocketState.Open)
        {
            await Task.Delay(15000, _cancellationTokenSource.Token);
            // Server handles ping, we just need to stay alive
        }
    }
}
```

### FAZA 3: MANAGERI DE STARE (Săptămâna 3)

#### 3.6 Screen Manager
```csharp
// Managers/ScreenManager.cs
public interface IScreenManager
{
    event Action<Playlist> PlaylistUpdated;
    event Action<int> RotationChanged;
    
    Task<bool> RegisterAsync();
    Task SyncAsync();
    Task<string> GenerateUniqueKeyAsync();
    Task<string> GeneratePairingCodeAsync();
}

public class ScreenManager : IScreenManager
{
    private readonly IApiService _apiService;
    private readonly IWebSocketService _webSocketService;
    private readonly IStorageService _storageService;
    private Screen _currentScreen;
    private Playlist _currentPlaylist;
    
    public event Action<Playlist> PlaylistUpdated;
    public event Action<int> RotationChanged;
    
    public async Task<bool> RegisterAsync()
    {
        _currentScreen = await _storageService.GetScreenAsync();
        
        if (_currentScreen == null)
        {
            _currentScreen = new Screen
            {
                UniqueKey = await GenerateUniqueKeyAsync(),
                PairingCode = await GeneratePairingCodeAsync()
            };
            await _storageService.SaveScreenAsync(_currentScreen);
        }
        
        return await _apiService.RegisterScreenAsync(_currentScreen.UniqueKey, _currentScreen.PairingCode);
    }
    
    public async Task SyncAsync()
    {
        var syncResult = await _apiService.SyncPlaylistAsync(_currentScreen.UniqueKey, _currentPlaylist?.PlaylistVersion);
        
        if (syncResult != null)
        {
            _currentPlaylist = syncResult;
            await _storageService.SavePlaylistAsync(_currentPlaylist);
            PlaylistUpdated?.Invoke(_currentPlaylist);
            
            if (syncResult.Rotation != _currentScreen.Rotation)
            {
                _currentScreen.Rotation = syncResult.Rotation;
                await _storageService.SaveScreenAsync(_currentScreen);
                RotationChanged?.Invoke(syncResult.Rotation);
            }
        }
    }
}
```

#### 3.7 Media Manager
```csharp
// Managers/MediaManager.cs
public interface IMediaManager
{
    Task<string> CacheMediaAsync(PlaylistItem item, IProgress<double> progress);
    Task<bool> IsMediaCachedAsync(PlaylistItem item);
    Task CleanupUnusedMediaAsync(Playlist currentPlaylist);
    string GetLocalPath(PlaylistItem item);
}

public class MediaManager : IMediaManager
{
    private readonly IApiService _apiService;
    private readonly string _cacheDirectory;
    
    public MediaManager()
    {
        _cacheDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "RegioPlayer", "Cache");
        Directory.CreateDirectory(_cacheDirectory);
    }
    
    public async Task<string> CacheMediaAsync(PlaylistItem item, IProgress<double> progress)
    {
        if (item.Type == "web/html") return item.Url; // Web content nu se cache-ază
        
        var fileName = GetFileNameFromUrl(item.Url);
        var localPath = Path.Combine(_cacheDirectory, fileName);
        
        if (File.Exists(localPath)) return localPath;
        
        await _apiService.DownloadMediaAsync(item.Url, localPath, progress);
        return localPath;
    }
    
    public string GetLocalPath(PlaylistItem item)
    {
        if (item.Type == "web/html") return item.Url;
        
        var fileName = GetFileNameFromUrl(item.Url);
        return Path.Combine(_cacheDirectory, fileName);
    }
}
```

### FAZA 4: UI PRINCIPAL (Săptămâna 4-5)

#### 3.8 MainWindow
```csharp
// Views/MainWindow.xaml.cs
public partial class MainWindow : Window
{
    private readonly MainViewModel _viewModel;
    
    public MainWindow(MainViewModel viewModel)
    {
        InitializeComponent();
        _viewModel = viewModel;
        DataContext = _viewModel;
        
        SetupKioskMode();
        SetupRotation();
    }
    
    private void SetupKioskMode()
    {
        WindowState = WindowState.Maximized;
        WindowStyle = WindowStyle.None;
        ResizeMode = ResizeMode.NoResize;
        Topmost = true;
        
        // Dezactivare Alt+Tab, Win key, etc.
        KeyDown += MainWindow_KeyDown;
    }
    
    private void MainWindow_KeyDown(object sender, KeyEventArgs e)
    {
        // Blochează combinații de taste sistem
        if (e.Key == Key.LWin || e.Key == Key.RWin ||
            e.Key == Key.Tab && (Keyboard.Modifiers & ModifierKeys.Alt) == ModifierKeys.Alt ||
            e.Key == Key.Escape && (Keyboard.Modifiers & ModifierKeys.Ctrl) == ModifierKeys.Ctrl ||
            e.Key == Key.F4 && (Keyboard.Modifiers & ModifierKeys.Alt) == ModifierKeys.Alt)
        {
            e.Handled = true;
        }
        
        // Triple Ctrl pentru settings (debug)
        if (e.Key == Key.LeftCtrl || e.Key == Key.RightCtrl)
        {
            _viewModel.HandleControlKey();
        }
    }
    
    private void SetupRotation()
    {
        _viewModel.RotationChanged += rotation =>
        {
            Dispatcher.Invoke(() =>
            {
                var transform = new RotateTransform(rotation);
                RenderTransform = transform;
                
                // Adjustări pentru centrare după rotație
                if (rotation == 90 || rotation == 270)
                {
                    RenderTransformOrigin = new Point(0.5, 0.5);
                }
            });
        };
    }
}
```

#### 3.9 MainWindow XAML
```xml
<Window x:Class="RegioPlayer.UI.Views.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Regio Digital Signage Player"
        Background="Black">
    
    <Grid>
        <!-- Pairing Screen -->
        <ContentControl x:Name="PairingContent" 
                       Content="{Binding PairingViewModel}"
                       Visibility="{Binding IsPairing, Converter={StaticResource BoolToVisibilityConverter}}">
            <ContentControl.ContentTemplate>
                <DataTemplate>
                    <local:PairingScreen />
                </DataTemplate>
            </ContentControl.ContentTemplate>
        </ContentControl>
        
        <!-- Player Content -->
        <ContentControl x:Name="PlayerContent"
                       Content="{Binding PlayerViewModel}"
                       Visibility="{Binding IsPlaying, Converter={StaticResource BoolToVisibilityConverter}}">
            <ContentControl.ContentTemplate>
                <DataTemplate>
                    <local:PlayerScreen />
                </DataTemplate>
            </ContentControl.ContentTemplate>
        </ContentControl>
        
        <!-- Loading Screen -->
        <ContentControl x:Name="LoadingContent"
                       Content="{Binding LoadingViewModel}"
                       Visibility="{Binding IsLoading, Converter={StaticResource BoolToVisibilityConverter}}">
            <ContentControl.ContentTemplate>
                <DataTemplate>
                    <local:LoadingScreen />
                </DataTemplate>
            </ContentControl.ContentTemplate>
        </ContentControl>
        
        <!-- Settings Panel (Hidden by default) -->
        <ContentControl x:Name="SettingsContent"
                       Content="{Binding SettingsViewModel}"
                       Visibility="{Binding ShowSettings, Converter={StaticResource BoolToVisibilityConverter}}"
                       Panel.ZIndex="999">
            <ContentControl.ContentTemplate>
                <DataTemplate>
                    <local:SettingsPanel />
                </DataTemplate>
            </ContentControl.ContentTemplate>
        </ContentControl>
    </Grid>
</Window>
```

### FAZA 5: PLAYERE MEDIA (Săptămâna 6)

#### 3.10 Video Player Control
```csharp
// Controls/VideoPlayerControl.xaml.cs
public partial class VideoPlayerControl : UserControl
{
    public static readonly DependencyProperty SourceProperty =
        DependencyProperty.Register(nameof(Source), typeof(string), typeof(VideoPlayerControl),
            new PropertyMetadata(null, OnSourceChanged));
    
    public string Source
    {
        get => (string)GetValue(SourceProperty);
        set => SetValue(SourceProperty, value);
    }
    
    private static void OnSourceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is VideoPlayerControl control && e.NewValue is string source)
        {
            control.LoadVideo(source);
        }
    }
    
    private void LoadVideo(string source)
    {
        MediaElement.Source = new Uri(source);
        MediaElement.Play();
    }
    
    public void Play() => MediaElement.Play();
    public void Pause() => MediaElement.Pause();
    public void Stop() => MediaElement.Stop();
}
```

#### 3.11 Web Content Control
```csharp
// Controls/WebContentControl.xaml.cs
public partial class WebContentControl : UserControl
{
    private readonly Timer _refreshTimer;
    
    public static readonly DependencyProperty SourceProperty =
        DependencyProperty.Register(nameof(Source), typeof(string), typeof(WebContentControl));
    
    public static readonly DependencyProperty RefreshIntervalProperty =
        DependencyProperty.Register(nameof(RefreshInterval), typeof(int?), typeof(WebContentControl),
            new PropertyMetadata(null, OnRefreshIntervalChanged));
    
    public string Source
    {
        get => (string)GetValue(SourceProperty);
        set => SetValue(SourceProperty, value);
    }
    
    public int? RefreshInterval
    {
        get => (int?)GetValue(RefreshIntervalProperty);
        set => SetValue(RefreshIntervalProperty, value);
    }
    
    public WebContentControl()
    {
        InitializeComponent();
        _refreshTimer = new Timer(RefreshPage);
        WebView.NavigationCompleted += OnNavigationCompleted;
    }
    
    private static void OnRefreshIntervalChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is WebContentControl control && e.NewValue is int interval)
        {
            control.SetupRefreshTimer(interval);
        }
    }
    
    private void SetupRefreshTimer(int intervalSeconds)
    {
        _refreshTimer.Change(TimeSpan.FromSeconds(intervalSeconds), TimeSpan.FromSeconds(intervalSeconds));
    }
    
    private void RefreshPage(object state)
    {
        Dispatcher.Invoke(() => WebView.Reload());
    }
    
    private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (e.IsSuccess)
        {
            // Injectare CSS pentru ascundere scroll bars și fullscreen
            _ = WebView.CoreWebView2.AddWebResourceResponseReceivedEventFilter("*", CoreWebView2WebResourceContext.Document);
        }
    }
}
```

### FAZA 6: PLAYER SCREEN ȘI LOGICA DE REDARE (Săptămâna 7)

#### 3.12 Player Screen
```csharp
// ViewModels/PlayerViewModel.cs
public class PlayerViewModel : ViewModelBase
{
    private readonly IMediaManager _mediaManager;
    private readonly Timer _playbackTimer;
    private PlaylistItem _currentItem;
    private int _currentIndex;
    private Playlist _playlist;
    
    public PlayerViewModel(IMediaManager mediaManager)
    {
        _mediaManager = mediaManager;
        _playbackTimer = new Timer(OnPlaybackTimer);
    }
    
    public async Task LoadPlaylistAsync(Playlist playlist)
    {
        _playlist = playlist;
        _currentIndex = 0;
        
        // Pre-cache toate media files
        var cacheProgress = new Progress<double>(p => CacheProgress = p);
        
        foreach (var item in playlist.Items)
        {
            if (item.Type != "web/html")
            {
                await _mediaManager.CacheMediaAsync(item, cacheProgress);
            }
        }
        
        await PlayNextItemAsync();
    }
    
    private async Task PlayNextItemAsync()
    {
        if (_playlist?.Items?.Count > 0)
        {
            _currentItem = _playlist.Items[_currentIndex];
            CurrentMediaSource = await _mediaManager.CacheMediaAsync(_currentItem, null);
            CurrentMediaType = _currentItem.Type;
            
            // Setup timer pentru următorul item
            var duration = _currentItem.Duration * 1000; // Convert to milliseconds
            _playbackTimer.Change(duration, Timeout.Infinite);
            
            // Log playback start
            await LogPlaybackAsync("START");
            
            _currentIndex = (_currentIndex + 1) % _playlist.Items.Count;
        }
    }
    
    private async void OnPlaybackTimer(object state)
    {
        // Log playback end
        await LogPlaybackAsync("END");
        
        // Switch to next item
        await PlayNextItemAsync();
    }
    
    private async Task LogPlaybackAsync(string eventType)
    {
        // Implement logging logic similar to Android player
        // Could be stored locally and synced later
    }
}
```

### FAZA 7: PAIRING ȘI SETTINGS (Săptămâna 8)

#### 3.13 Pairing Screen
```csharp
// Views/PairingScreen.xaml.cs
public partial class PairingScreen : UserControl
{
    public PairingScreen()
    {
        InitializeComponent();
    }
}

// ViewModels/PairingViewModel.cs
public class PairingViewModel : ViewModelBase
{
    private string _pairingCode;
    private string _uniqueKey;
    
    public string PairingCode
    {
        get => _pairingCode;
        set => SetProperty(ref _pairingCode, value);
    }
    
    public async Task GenerateNewCodesAsync()
    {
        _uniqueKey = Guid.NewGuid().ToString();
        PairingCode = GeneratePairingCode();
        
        var success = await _screenManager.RegisterAsync(_uniqueKey, PairingCode);
        
        if (success)
        {
            // Start monitoring for pairing completion
            StartPairingMonitor();
        }
    }
    
    private string GeneratePairingCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 6)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }
    
    private void StartPairingMonitor()
    {
        // Monitor prin API calls până când screen devine activ
        var timer = new Timer(async _ =>
        {
            var syncResult = await _screenManager.SyncAsync();
            if (syncResult != null)
            {
                // Pairing successful
                PairingCompleted?.Invoke();
            }
        }, null, TimeSpan.Zero, TimeSpan.FromSeconds(5));
    }
}
```

#### 3.14 Pairing Screen XAML
```xml
<UserControl x:Class="RegioPlayer.UI.Views.PairingScreen">
    <Grid Background="#1a1a1a">
        <Grid.RowDefinitions>
            <RowDefinition Height="*" />
            <RowDefinition Height="Auto" />
            <RowDefinition Height="Auto" />
            <RowDefinition Height="*" />
        </Grid.RowDefinitions>
        
        <!-- Logo -->
        <Image Grid.Row="1" Source="/Resources/logo.png" 
               MaxHeight="120" Margin="0,0,0,40" />
        
        <!-- Pairing Info -->
        <StackPanel Grid.Row="2" HorizontalAlignment="Center">
            <TextBlock Text="Pentru a activa acest ecran, accesează platforma web" 
                       Foreground="White" FontSize="24" HorizontalAlignment="Center" 
                       Margin="0,0,0,20" />
            
            <TextBlock Text="și folosește codul de împerechere:" 
                       Foreground="#cccccc" FontSize="20" HorizontalAlignment="Center" 
                       Margin="0,0,0,30" />
            
            <Border Background="#2a2a2a" CornerRadius="8" Padding="30,20" 
                    HorizontalAlignment="Center">
                <TextBlock Text="{Binding PairingCode}" 
                           Foreground="#00ff88" FontSize="48" FontWeight="Bold" 
                           FontFamily="Consolas" LetterSpacing="8" />
            </Border>
            
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" 
                        Margin="0,40,0,0">
                <TextBlock Text="🔗 " Foreground="#00ff88" FontSize="18" />
                <TextBlock Text="display.regio-cloud.ro" 
                           Foreground="#00ff88" FontSize="18" FontWeight="SemiBold" />
            </StackPanel>
            
            <Button Content="🔄 Generează cod nou" 
                    Background="#2a2a2a" Foreground="White" 
                    Padding="20,10" Margin="0,30,0,0"
                    Command="{Binding GenerateNewCodeCommand}" />
        </StackPanel>
    </Grid>
</UserControl>
```

### FAZA 8: KIOSK MODE ȘI DEPLOYMENT (Săptămâna 9)

#### 3.15 Kiosk Mode Setup
```csharp
// Windows/KioskModeManager.cs
public class KioskModeManager
{
    private const int SW_HIDE = 0;
    private const int SW_SHOW = 5;
    
    [DllImport("user32.dll")]
    private static extern int FindWindow(string className, string windowText);
    
    [DllImport("user32.dll")]
    private static extern int ShowWindow(int hwnd, int command);
    
    public static void EnableKioskMode()
    {
        // Ascunde taskbar
        var taskBarHwnd = FindWindow("Shell_TrayWnd", null);
        ShowWindow(taskBarHwnd, SW_HIDE);
        
        // Ascunde Start Menu
        var startMenuHwnd = FindWindow("Button", "Start");
        ShowWindow(startMenuHwnd, SW_HIDE);
        
        // Setup registry pentru startup
        SetupAutoStart();
        
        // Disable Ctrl+Alt+Del, Alt+Tab, etc.
        SetupSystemKeyDisable();
    }
    
    public static void DisableKioskMode()
    {
        var taskBarHwnd = FindWindow("Shell_TrayWnd", null);
        ShowWindow(taskBarHwnd, SW_SHOW);
        
        RemoveAutoStart();
        RestoreSystemKeys();
    }
    
    private static void SetupAutoStart()
    {
        var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", true);
        key?.SetValue("RegioWindowsPlayer", Application.ExecutablePath);
    }
    
    private static void SetupSystemKeyDisable()
    {
        // Implementare pentru dezactivarea combinațiilor de taste
        // Folosind Low-level keyboard hooks
    }
}
```

#### 3.16 App.xaml.cs - Dependency Injection
```csharp
public partial class App : Application
{
    private ServiceProvider _serviceProvider;
    
    protected override void OnStartup(StartupEventArgs e)
    {
        var services = new ServiceCollection();
        
        // Register services
        services.AddSingleton<IApiService, ApiService>();
        services.AddSingleton<IWebSocketService, WebSocketService>();
        services.AddSingleton<IStorageService, StorageService>();
        services.AddSingleton<IMediaManager, MediaManager>();
        services.AddSingleton<IScreenManager, ScreenManager>();
        
        // Register ViewModels
        services.AddTransient<MainViewModel>();
        services.AddTransient<PlayerViewModel>();
        services.AddTransient<PairingViewModel>();
        services.AddTransient<SettingsViewModel>();
        
        // Register Views
        services.AddTransient<MainWindow>();
        
        // Logging
        services.AddLogging(builder =>
        {
            builder.AddSerilog(new LoggerConfiguration()
                .WriteTo.File("logs/regio-player.log", rollingInterval: RollingInterval.Day)
                .CreateLogger());
        });
        
        _serviceProvider = services.BuildServiceProvider();
        
        // Setup kiosk mode
        if (!Debugger.IsAttached)
        {
            KioskModeManager.EnableKioskMode();
        }
        
        // Launch main window
        var mainWindow = _serviceProvider.GetService<MainWindow>();
        mainWindow.Show();
        
        base.OnStartup(e);
    }
    
    protected override void OnExit(ExitEventArgs e)
    {
        if (!Debugger.IsAttached)
        {
            KioskModeManager.DisableKioskMode();
        }
        
        _serviceProvider?.Dispose();
        base.OnExit(e);
    }
}
```

#### 3.17 Application Manifest (app.manifest)
```xml
<?xml version="1.0" encoding="utf-8"?>
<assembly manifestVersion="1.0" xmlns="urn:schemas-microsoft-com:asm.v1">
  <assemblyIdentity version="1.0.0.0" name="RegioWindowsPlayer"/>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v2">
    <security>
      <requestedPrivileges xmlns="urn:schemas-microsoft-com:asm.v3">
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
  
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}" />
    </application>
  </compatibility>
  
  <application xmlns="urn:schemas-microsoft-com:asm.v3">
    <windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true</dpiAware>
    </windowsSettings>
  </application>
</assembly>
```

### FAZA 9: TESTING ȘI DEBUGGING (Săptămâna 10)

#### 3.18 Unit Tests
```csharp
// Tests/Services/ApiServiceTests.cs
[TestClass]
public class ApiServiceTests
{
    private ApiService _apiService;
    private MockHttpMessageHandler _mockHandler;
    
    [TestInitialize]
    public void Setup()
    {
        _mockHandler = new MockHttpMessageHandler();
        var httpClient = new HttpClient(_mockHandler);
        _apiService = new ApiService(httpClient);
    }
    
    [TestMethod]
    public async Task SyncPlaylistAsync_ReturnsValidPlaylist()
    {
        // Arrange
        var expectedResponse = new PlaylistResponse
        {
            Id = 1,
            Name = "Test Playlist",
            Items = new List<PlaylistItem>
            {
                new() { Url = "test.mp4", Type = "video", Duration = 30 }
            }
        };
        
        _mockHandler.SetupResponse(HttpStatusCode.OK, JsonSerializer.Serialize(expectedResponse));
        
        // Act
        var result = await _apiService.SyncPlaylistAsync("test-key", "v1");
        
        // Assert
        Assert.IsNotNull(result);
        Assert.AreEqual(expectedResponse.Name, result.Name);
    }
}
```

#### 3.19 Integration Tests
```csharp
// Tests/Integration/EndToEndTests.cs
[TestClass]
public class EndToEndTests
{
    [TestMethod]
    public async Task CompleteWorkflow_PairingToPlayback()
    {
        // Test complete workflow from pairing to media playback
        var screenManager = new ScreenManager(/* dependencies */);
        
        // 1. Generate pairing code
        var pairingCode = await screenManager.GeneratePairingCodeAsync();
        Assert.IsNotNull(pairingCode);
        
        // 2. Simulate pairing from web interface
        // This would require a test backend or mocking
        
        // 3. Verify playlist sync
        var playlist = await screenManager.SyncAsync();
        Assert.IsNotNull(playlist);
        
        // 4. Test media caching
        var mediaManager = new MediaManager(/* dependencies */);
        foreach (var item in playlist.Items)
        {
            var localPath = await mediaManager.CacheMediaAsync(item, null);
            Assert.IsTrue(File.Exists(localPath) || item.Type == "web/html");
        }
    }
}
```

### FAZA 10: DEPLOYMENT ȘI INSTALARE (Săptămâna 11)

#### 3.20 Installer Script (PowerShell)
```powershell
# deployment/install.ps1
param(
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "C:\Program Files\RegioWindowsPlayer"
)

Write-Host "Installing Regio Windows Player..." -ForegroundColor Green

# Check administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script requires Administrator privileges"
    exit 1
}

# Create installation directory
New-Item -ItemType Directory -Force -Path $InstallPath

# Copy application files
Copy-Item -Path ".\RegioWindowsPlayer\*" -Destination $InstallPath -Recurse -Force

# Install .NET 6 Desktop Runtime if not present
$dotnetVersion = & dotnet --version 2>$null
if ($LASTEXITCODE -ne 0 -or $dotnetVersion -lt "6.0") {
    Write-Host "Installing .NET 6 Desktop Runtime..." -ForegroundColor Yellow
    $url = "https://download.microsoft.com/download/6/6/1/661e271f-4e7e-4e4b-9b8c-d7e6c9bb9f5e/windowsdesktop-runtime-6.0.x-win-x64.exe"
    $output = "$env:TEMP\dotnet-runtime.exe"
    Invoke-WebRequest -Uri $url -OutFile $output
    Start-Process -FilePath $output -ArgumentList "/quiet" -Wait
    Remove-Item $output
}

# Create startup shortcut
$shell = New-Object -comObject WScript.Shell
$shortcut = $shell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\RegioWindowsPlayer.lnk")
$shortcut.TargetPath = "$InstallPath\RegioWindowsPlayer.exe"
$shortcut.WorkingDirectory = $InstallPath
$shortcut.WindowStyle = 7 # Minimized
$shortcut.Save()

# Setup Windows service for kiosk mode
$serviceName = "RegioPlayerKiosk"
$serviceDisplayName = "Regio Digital Signage Player"
$serviceDescription = "Regio Digital Signage Player Service"

if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $serviceName
    Remove-Service -Name $serviceName
}

New-Service -Name $serviceName -DisplayName $serviceDisplayName -Description $serviceDescription -BinaryPathName "$InstallPath\RegioWindowsPlayer.exe --service" -StartupType Automatic

Write-Host "Installation completed successfully!" -ForegroundColor Green
Write-Host "The application will start automatically on next boot." -ForegroundColor Yellow
Write-Host "To start immediately, run: $InstallPath\RegioWindowsPlayer.exe" -ForegroundColor Yellow
```

#### 3.21 Configurare și Settings
```csharp
// Services/ConfigurationService.cs
public class ConfigurationService
{
    private readonly string _configPath;
    
    public ConfigurationService()
    {
        var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var configDir = Path.Combine(appDataPath, "RegioWindowsPlayer");
        Directory.CreateDirectory(configDir);
        _configPath = Path.Combine(configDir, "config.json");
    }
    
    public async Task<PlayerConfiguration> LoadConfigAsync()
    {
        if (File.Exists(_configPath))
        {
            var json = await File.ReadAllTextAsync(_configPath);
            return JsonSerializer.Deserialize<PlayerConfiguration>(json);
        }
        
        return new PlayerConfiguration();
    }
    
    public async Task SaveConfigAsync(PlayerConfiguration config)
    {
        var json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_configPath, json);
    }
}

public class PlayerConfiguration
{
    public string ApiBaseUrl { get; set; } = "https://display.regio-cloud.ro/api";
    public string WebSocketUrl { get; set; } = "wss://display.regio-cloud.ro/api/ws";
    public bool EnableLogging { get; set; } = true;
    public string LogLevel { get; set; } = "Information";
    public bool EnableKioskMode { get; set; } = true;
    public int SyncIntervalSeconds { get; set; } = 30;
    public int KeepAliveIntervalSeconds { get; set; } = 15;
    public double MediaCacheMaxSizeGB { get; set; } = 10.0;
    public bool EnableHardwareAcceleration { get; set; } = true;
}
```

---

## 4. ARHITECTURA DE SECURITATE ȘI PERFORMANȚĂ

### 4.1 Securitate
- **HTTPS/WSS only** pentru toate comunicările
- **Certificate validation** strict
- **No sensitive data storage** local (doar cache media)
- **Registry protection** pentru setările critice
- **Process isolation** pentru media players

### 4.2 Performanță
- **Lazy loading** pentru media cache
- **Background preloading** pentru următoarele items
- **Memory management** cu disposal patterns
- **Hardware acceleration** pentru video playback
- **Efficient WebSocket** cu reconnect logic

### 4.3 Monitoring & Logging
- **Structured logging** cu Serilog
- **Performance counters** pentru media playback
- **Health checks** pentru servicii
- **Error reporting** către server (opcional)
- **Local diagnostics** pentru troubleshooting

---

## 5. PLAN DE TESTARE

### 5.1 Unit Tests
- ✅ API Service communication
- ✅ WebSocket client functionality  
- ✅ Media caching logic
- ✅ Playlist management
- ✅ Screen rotation handling

### 5.2 Integration Tests
- ✅ End-to-end pairing workflow
- ✅ Media download and playback
- ✅ WebSocket reconnection scenarios
- ✅ Playlist updates in real-time
- ✅ Kiosk mode activation/deactivation

### 5.3 Performance Tests
- ✅ Large media file handling
- ✅ Multiple playlist transitions
- ✅ Memory usage over 24h runtime
- ✅ Network interruption recovery
- ✅ System resource utilization

---

## 6. DEPLOYMENT ȘI MAINTENANCE

### 6.1 System Requirements
- **Windows 10 Pro** (build 1903+) sau Windows 11
- **.NET 6 Desktop Runtime**
- **4GB RAM minimum** (8GB recomandat)
- **100GB storage** pentru media cache
- **Stable internet connection** (minimum 10 Mbps)

### 6.2 Installation Methods
1. **Manual Installation** - PowerShell script
2. **Group Policy Deployment** - pentru enterprise
3. **SCCM/Intune** - pentru management la scară
4. **USB/Local** - pentru instalări offline

### 6.3 Maintenance
- **Auto-updates** prin API checking
- **Log rotation** și cleanup
- **Media cache cleanup** periodic
- **Health monitoring** și alerting
- **Remote diagnostics** prin web interface

---

## 7. TIMELINE DEZVOLTARE

| Săptămâna | Faza | Deliverables | Status |
|-----------|------|--------------|---------|
| 1 | Setup & Infrastructure | Project structure, dependencies, core models | ⏳ |
| 2 | Core Services | API Service, WebSocket Service | ⏳ |
| 3 | State Managers | Screen Manager, Media Manager | ⏳ |
| 4-5 | Main UI | MainWindow, basic UI structure | ⏳ |
| 6 | Media Players | Video, Image, Web content controls | ⏳ |
| 7 | Player Logic | Playback engine, playlist management | ⏳ |
| 8 | Pairing & Settings | Pairing workflow, settings UI | ⏳ |
| 9 | Kiosk & Deployment | Kiosk mode, installer script | ⏳ |
| 10 | Testing | Unit tests, integration tests | ⏳ |
| 11 | Final Deployment | Production ready installer | ⏳ |

---

## 8. CONSIDERAȚII FINALE

### 8.1 Compatibilitate Backend
Aplicația este complet compatibilă cu backend-ul existent și nu necesită modificări în codul server sau frontend.

### 8.2 Extensibilitate
Arhitectura permite adăugarea ușoară de noi tipuri de conținut și funcționalități.

### 8.3 Maintenance
Sistemul de logging și monitoring permite diagnosticarea și rezolvarea problemelor la distanță.

### 8.4 Enterprise Ready
Soluția respectă standardele enterprise pentru securitate, performanță și deployment.

---

**Autor**: Claude AI Assistant  
**Data**: 21 August 2025  
**Versiune**: 1.0  
**Status**: Ready for Implementation