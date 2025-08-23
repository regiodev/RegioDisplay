using Microsoft.Extensions.Logging;
using RegioPlayer.Core.Interfaces;
using RegioPlayer.Core.Models;
using System;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace RegioPlayer.Infrastructure.WebSocket;

public class WebSocketService : IWebSocketService
{
    private readonly ILogger<WebSocketService> _logger;
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _cancellationTokenSource;
    private Task? _receiveTask;
    private Task? _keepAliveTask;

    public event Action<string>? MessageReceived;
    public event Action? Connected;
    public event Action? Disconnected;

    public bool IsConnected => _webSocket?.State == WebSocketState.Open;

    public WebSocketService(ILogger<WebSocketService> logger)
    {
        _logger = logger;
    }

    public async Task ConnectAsync(string screenKey, string version, string resolution)
    {
        try
        {
            await DisconnectAsync();

            var uri = new Uri($"wss://display.regio-cloud.ro/api/ws/connect/{screenKey}");
            _logger.LogInformation("Connecting to WebSocket: {Uri}", uri);

            _cancellationTokenSource = new CancellationTokenSource();
            _webSocket = new ClientWebSocket();
            
            // Set timeouts
            _webSocket.Options.KeepAliveInterval = TimeSpan.FromSeconds(30);

            await _webSocket.ConnectAsync(uri, _cancellationTokenSource.Token);

            // Send device info immediately after connection
            var deviceInfo = new DeviceInfoMessage
            {
                Version = version,
                Resolution = resolution
            };

            await SendAsync(JsonSerializer.Serialize(deviceInfo));

            // Start background tasks
            _receiveTask = Task.Run(ReceiveLoop, _cancellationTokenSource.Token);
            _keepAliveTask = Task.Run(KeepAliveLoop, _cancellationTokenSource.Token);

            Connected?.Invoke();
            _logger.LogInformation("WebSocket connected successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to WebSocket");
            await DisconnectAsync();
            throw;
        }
    }

    public async Task DisconnectAsync()
    {
        try
        {
            _cancellationTokenSource?.Cancel();

            if (_webSocket?.State == WebSocketState.Open)
            {
                await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Disconnecting", CancellationToken.None);
            }

            // Wait for background tasks to complete
            if (_receiveTask != null)
            {
                await _receiveTask;
            }
            
            if (_keepAliveTask != null)
            {
                await _keepAliveTask;
            }

            _webSocket?.Dispose();
            _cancellationTokenSource?.Dispose();

            _webSocket = null;
            _cancellationTokenSource = null;
            _receiveTask = null;
            _keepAliveTask = null;

            Disconnected?.Invoke();
            _logger.LogInformation("WebSocket disconnected");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during WebSocket disconnect");
        }
    }

    public async Task SendAsync(string message)
    {
        if (_webSocket?.State != WebSocketState.Open)
        {
            _logger.LogWarning("Cannot send message - WebSocket is not connected");
            return;
        }

        try
        {
            var buffer = Encoding.UTF8.GetBytes(message);
            await _webSocket.SendAsync(buffer, WebSocketMessageType.Text, true, CancellationToken.None);
            _logger.LogDebug("Message sent: {Message}", message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending WebSocket message");
            throw;
        }
    }

    private async Task ReceiveLoop()
    {
        var buffer = new byte[4096];

        try
        {
            while (_webSocket?.State == WebSocketState.Open && !_cancellationTokenSource!.Token.IsCancellationRequested)
            {
                var result = await _webSocket.ReceiveAsync(buffer, _cancellationTokenSource.Token);
                
                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    _logger.LogDebug("Message received: {Message}", message);
                    
                    // Don't notify for ping messages
                    if (!message.Contains("\"type\":\"ping\""))
                    {
                        MessageReceived?.Invoke(message);
                    }
                }
                else if (result.MessageType == WebSocketMessageType.Close)
                {
                    _logger.LogInformation("WebSocket close message received");
                    await DisconnectAsync();
                    break;
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogDebug("WebSocket receive loop cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in WebSocket receive loop");
            await DisconnectAsync();
        }
    }

    private async Task KeepAliveLoop()
    {
        try
        {
            while (_webSocket?.State == WebSocketState.Open && !_cancellationTokenSource!.Token.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(15), _cancellationTokenSource.Token);
                
                // Server handles ping, we just need to stay connected
                // The WebSocket keep-alive mechanism will handle the actual ping/pong
                if (_webSocket?.State != WebSocketState.Open)
                {
                    _logger.LogWarning("WebSocket connection lost during keep-alive");
                    break;
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogDebug("WebSocket keep-alive loop cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in WebSocket keep-alive loop");
        }
    }

    public void Dispose()
    {
        DisconnectAsync().ConfigureAwait(false).GetAwaiter().GetResult();
    }
}