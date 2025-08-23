using RegioPlayer.UI.ViewModels;
using System;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;

namespace RegioPlayer.UI.Views;

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
        
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        // Focus the window to ensure key events are captured
        Focus();
        Keyboard.Focus(this);
        
        // CRITICAL: Initialize the ViewModel!
        await _viewModel.InitializeAsync();
    }

    private void SetupKioskMode()
    {
        WindowState = WindowState.Maximized;
        WindowStyle = WindowStyle.None;
        ResizeMode = ResizeMode.NoResize;
        Topmost = true;

        // Handle key events
        KeyDown += MainWindow_KeyDown;
        
        // Prevent Alt+Tab, Windows key, etc.
        PreviewKeyDown += MainWindow_PreviewKeyDown;
    }

    private void MainWindow_KeyDown(object sender, KeyEventArgs e)
    {
        // Triple Ctrl for settings (debug mode)
        if (e.Key == Key.LeftCtrl || e.Key == Key.RightCtrl)
        {
            _viewModel.HandleControlKey();
            e.Handled = true;
        }
    }

    private void MainWindow_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        // Block system key combinations in kiosk mode
        if (IsSystemKey(e.Key, Keyboard.Modifiers))
        {
            e.Handled = true;
        }
    }

    private bool IsSystemKey(Key key, ModifierKeys modifiers)
    {
        // Block Windows keys
        if (key == Key.LWin || key == Key.RWin)
            return true;

        // Block Alt+Tab
        if (key == Key.Tab && modifiers.HasFlag(ModifierKeys.Alt))
            return true;

        // Block Ctrl+Escape (Start menu)
        if (key == Key.Escape && modifiers.HasFlag(ModifierKeys.Control))
            return true;

        // Block Alt+F4
        if (key == Key.F4 && modifiers.HasFlag(ModifierKeys.Alt))
            return true;

        // Block Ctrl+Alt+Delete (handled by system, but we can try)
        if (key == Key.Delete && 
            modifiers.HasFlag(ModifierKeys.Control) && 
            modifiers.HasFlag(ModifierKeys.Alt))
            return true;

        // Block F1-F12 function keys
        if (key >= Key.F1 && key <= Key.F12)
            return true;

        return false;
    }

    private void SetupRotation()
    {
        _viewModel.RotationChanged += rotation =>
        {
            Dispatcher.Invoke(() =>
            {
                var transform = new RotateTransform(rotation);
                RenderTransform = transform;

                // Adjust render transform origin for proper centering
                if (rotation == 90 || rotation == 270)
                {
                    RenderTransformOrigin = new Point(0.5, 0.5);
                    
                    // For 90/270 degree rotation, we might need to adjust positioning
                    // This ensures the rotated content stays centered
                    var screenWidth = SystemParameters.PrimaryScreenWidth;
                    var screenHeight = SystemParameters.PrimaryScreenHeight;
                    
                    if (rotation == 90)
                    {
                        RenderTransformOrigin = new Point(0.5, 0.5);
                        var translateX = (screenHeight - screenWidth) / 2;
                        var translateY = (screenWidth - screenHeight) / 2;
                        
                        var transformGroup = new TransformGroup();
                        transformGroup.Children.Add(new RotateTransform(90, screenWidth / 2, screenHeight / 2));
                        transformGroup.Children.Add(new TranslateTransform(translateX, translateY));
                        RenderTransform = transformGroup;
                    }
                    else if (rotation == 270)
                    {
                        RenderTransformOrigin = new Point(0.5, 0.5);
                        var translateX = (screenHeight - screenWidth) / 2;
                        var translateY = (screenWidth - screenHeight) / 2;
                        
                        var transformGroup = new TransformGroup();
                        transformGroup.Children.Add(new RotateTransform(270, screenWidth / 2, screenHeight / 2));
                        transformGroup.Children.Add(new TranslateTransform(-translateX, -translateY));
                        RenderTransform = transformGroup;
                    }
                }
                else
                {
                    RenderTransformOrigin = new Point(0, 0);
                }
            });
        };
    }

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);
        
        // Additional kiosk mode setup if needed
        // This is where we could hook into Windows API for more advanced kiosk features
    }
}