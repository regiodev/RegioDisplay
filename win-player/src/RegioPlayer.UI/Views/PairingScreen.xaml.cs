using RegioPlayer.UI.ViewModels;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;

namespace RegioPlayer.UI.Views;

public partial class PairingScreen : UserControl
{
    public PairingScreen()
    {
        InitializeComponent();
        
        // Show debug info only in debug builds
#if DEBUG
        DebugInfo.Visibility = Visibility.Visible;
#endif
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        // Initialize pairing when screen loads
        if (DataContext is PairingViewModel viewModel)
        {
            _ = viewModel.InitializeAsync();
        }
    }

    // Handle keyboard shortcuts for debugging
    protected override void OnKeyDown(System.Windows.Input.KeyEventArgs e)
    {
        if (Debugger.IsAttached && DataContext is PairingViewModel viewModel)
        {
            switch (e.Key)
            {
                case System.Windows.Input.Key.F5:
                    // Generate new code
                    viewModel.GenerateNewCodeCommand.Execute(null);
                    e.Handled = true;
                    break;
                    
                case System.Windows.Input.Key.F6:
                    // Test connection
                    viewModel.TestConnectionCommand.Execute(null);
                    e.Handled = true;
                    break;
                    
                case System.Windows.Input.Key.D1:
                    // Toggle debug info
                    DebugInfo.Visibility = DebugInfo.Visibility == Visibility.Visible 
                        ? Visibility.Collapsed 
                        : Visibility.Visible;
                    e.Handled = true;
                    break;
            }
        }
        
        base.OnKeyDown(e);
    }
}