using System;
using System.Text.Json;
using System.Threading.Tasks;
using Windows.Media.Control;
using Windows.Storage.Streams;

class Program
{
    private static GlobalSystemMediaTransportControlsSessionManager? _sessionManager;
    private static GlobalSystemMediaTransportControlsSession? _currentSession;
    private const string WS_URL = "ws://127.0.0.1:3000/ws/music";
    
    // Переменные для защиты от дублей (Debounce)
    private static string _lastSentTrackId = "";
    private static DateTime _lastSentTime = DateTime.MinValue;
    private const int DEBOUNCE_MS = 500; // Игнорировать повторные события в течение 500 мс

    static async Task Main(string[] args)
    {
        Console.WriteLine("[MediaListener] Starting...");
        
        _sessionManager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        _sessionManager.CurrentSessionChanged += OnCurrentSessionChanged;
        
        var currentSession = _sessionManager.GetCurrentSession();
        if (currentSession != null)
        {
            await HandleSessionAsync(currentSession);
        }

        Console.WriteLine("[MediaListener] Listening. Press Ctrl+C to exit.");
        await Task.Delay(-1);
    }

    private static async void OnCurrentSessionChanged(
        GlobalSystemMediaTransportControlsSessionManager sender,
        object args)
    {
        var session = sender.GetCurrentSession();
        if (session != null)
        {
            await HandleSessionAsync(session);
        }
    }

    private static async Task HandleSessionAsync(GlobalSystemMediaTransportControlsSession session)
    {
        if (_currentSession != null)
        {
            _currentSession.MediaPropertiesChanged -= OnMediaPropertiesChanged;
            _currentSession.PlaybackInfoChanged -= OnPlaybackInfoChanged;
        }

        _currentSession = session;
        session.MediaPropertiesChanged += OnMediaPropertiesChanged;
        session.PlaybackInfoChanged += OnPlaybackInfoChanged;
        
        await SendMediaInfoAsync(session);
    }

    private static async void OnMediaPropertiesChanged(
        GlobalSystemMediaTransportControlsSession session,
        object args)
    {
        await SendMediaInfoAsync(session);
    }

    private static async void OnPlaybackInfoChanged(
        GlobalSystemMediaTransportControlsSession session,
        object args)
    {
        // Статус воспроизведения можно отправлять отдельно, если нужно
        var playbackInfo = session.GetPlaybackInfo();
        Console.WriteLine($"[MediaListener] Status: {playbackInfo?.PlaybackStatus}");
    }

    private static async Task SendMediaInfoAsync(GlobalSystemMediaTransportControlsSession session)
    {
        try
        {
            var mediaProps = await session.TryGetMediaPropertiesAsync();
            if (mediaProps == null) return;

            // Создаем уникальный идентификатор текущего трека
            string currentTrackId = $"{mediaProps.Artist} - {mediaProps.Title}";
            TimeSpan timeSinceLastSend = DateTime.Now - _lastSentTime;

            // ЗАЩИТА ОТ ДУБЛЕЙ:
            // Если трек тот же самый И прошло меньше 500 мс с последней отправки -> игнорируем
            if (currentTrackId == _lastSentTrackId && timeSinceLastSend.TotalMilliseconds < DEBOUNCE_MS)
            {
                return; 
            }

            // Обновляем "последнее отправленное" состояние
            _lastSentTrackId = currentTrackId;
            _lastSentTime = DateTime.Now;

            string? coverBase64 = null;
            if (mediaProps.Thumbnail != null)
            {
                using var stream = await mediaProps.Thumbnail.OpenReadAsync();
                using var reader = new DataReader(stream);
                await reader.LoadAsync((uint)stream.Size);
                var bytes = new byte[stream.Size];
                reader.ReadBytes(bytes);
                coverBase64 = Convert.ToBase64String(bytes);
            }
 
            string sourceApp = session.SourceAppUserModelId ?? "Unknown";
            string categorizedSource = "unknown";

            // Простая классификация источника
            if (sourceApp.Contains("Spotify", StringComparison.OrdinalIgnoreCase)) {
                categorizedSource = "spotify";
            } else if (sourceApp.Contains("YandexMusic", StringComparison.OrdinalIgnoreCase)) {
                categorizedSource = "yandex-desktop";
            } else if (sourceApp.Contains("Chrome", StringComparison.OrdinalIgnoreCase) || 
                    sourceApp.Contains("msedge", StringComparison.OrdinalIgnoreCase) || 
                    sourceApp.Contains("Firefox", StringComparison.OrdinalIgnoreCase)) {
                categorizedSource = "browser";
            } else {
                categorizedSource = "other-app";
            }

            var trackData = new
            {
                type = "TRACK_UPDATE",
                payload = new
                {
                    title = mediaProps.Title ?? "Unknown",
                    artist = mediaProps.Artist ?? "Unknown",
                    cover = coverBase64 != null ? $"data:image/jpeg;base64,{coverBase64}" : null,
                    source = "winrt",              // <-- Указываем, что источник - это WinRT API
                    platform = categorizedSource, // <-- Добавляем классифицированный источник
                    rawAppId = sourceApp        // <-- Для отладки (например, "Chrome")
                }
            };

            var json = JsonSerializer.Serialize(trackData);
            Console.WriteLine($"[MediaListener] Sent: {mediaProps.Artist} - {mediaProps.Title}");
            
            await SendToWebSocketAsync(json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MediaListener] Error: {ex.Message}");
        }
    }

    private static async Task SendToWebSocketAsync(string message)
    {
        using var client = new System.Net.WebSockets.ClientWebSocket();
        try 
        {
            await client.ConnectAsync(new Uri(WS_URL), CancellationToken.None);
            var bytes = System.Text.Encoding.UTF8.GetBytes(message);
            await client.SendAsync(
                new ArraySegment<byte>(bytes),
                System.Net.WebSockets.WebSocketMessageType.Text,
                true,
                CancellationToken.None);
            
            await client.CloseAsync(System.Net.WebSockets.WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MediaListener] WS Error (is server running?): {ex.Message}");
        }
    }
}