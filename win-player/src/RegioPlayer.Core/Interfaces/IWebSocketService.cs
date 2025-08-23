using System;
using System.Threading.Tasks;

namespace RegioPlayer.Core.Interfaces;

public interface IWebSocketService
{
    event Action<string>? MessageReceived;
    event Action? Connected;
    event Action? Disconnected;
    
    bool IsConnected { get; }
    
    Task ConnectAsync(string screenKey, string version, string resolution);
    Task DisconnectAsync();
    Task SendAsync(string message);
}