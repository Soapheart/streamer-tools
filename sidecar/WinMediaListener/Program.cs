using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Windows.Media.Control;
using Windows.Storage.Streams;

class Program
{
    private static GlobalSystemMediaTransportControlsSessionManager? _sessionManager;
    private static GlobalSystemMediaTransportControlsSession? _currentSession;
    private const string WS_URL = "ws://127.0.0.1:3000/ws/music";
    
    private static int _coverCounter = 0;
    private static readonly string CoversFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "debug_covers");
    
    private static CancellationTokenSource? _debounceCts;
    private static readonly int DEBOUNCE_DELAY_MS = 800;
    
    private static string? _lastSentTrackId;
    private static string? _lastSentPlayState;
    
    // ✅ НОВОЕ: Кэшируем последнюю обложку для повторных отправок
    private static string? _lastCoverBase64;
    private static string? _lastTrackIdForCover;

    static async Task Main(string[] args)
    {
        Console.WriteLine("[MediaListener] Starting...");
        Directory.CreateDirectory(CoversFolder);
        Console.WriteLine($"[MediaListener] Debug covers will be saved to: {CoversFolder}");
        
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
        Console.WriteLine($"\n🔔 [{DateTime.Now:HH:mm:ss.fff}] CurrentSessionChanged event!");
        var session = sender.GetCurrentSession();
        
        if (session != null)
        {
            Console.WriteLine($"   SourceApp: {session.SourceAppUserModelId}");
            await HandleSessionAsync(session);
        }
        else
        {
            // ✅ ИСПРАВЛЕНО: Обрабатываем остановку воспроизведения
            Console.WriteLine("   ⚠️ No current session (playback stopped)");
            await HandlePlaybackStoppedAsync();
        }
    }

    // ✅ НОВЫЙ МЕТОД: Остановка воспроизведения
    private static async Task HandlePlaybackStoppedAsync()
    {
        // Отписываемся от старой сессии
        if (_currentSession != null)
        {
            _currentSession.MediaPropertiesChanged -= OnMediaChanged;
            _currentSession.PlaybackInfoChanged -= OnMediaChanged;
            _currentSession = null;
        }

        // Сбрасываем состояние
        _lastSentTrackId = null;
        _lastSentPlayState = null;
        _lastCoverBase64 = null;
        _lastTrackIdForCover = null;

        // Уведомляем виджет об остановке
        var stopData = new
        {
            type = "TRACK_UPDATE",
            payload = new
            {
                title = "",
                artist = "",
                cover = (string?)null,
                contentType = "unknown",
                playState = "stopped",
                source = "winrt"
            }
        };

        var json = JsonSerializer.Serialize(stopData);
        Console.WriteLine("   📤 SENDING playback stopped event");
        await SendToWebSocketAsync(json);
    }

    private static async Task HandleSessionAsync(GlobalSystemMediaTransportControlsSession session)
    {
        // ✅ ИСПРАВЛЕНО: Чистая логика отписки
        if (_currentSession != null)
        {
            _currentSession.MediaPropertiesChanged -= OnMediaChanged;
            _currentSession.PlaybackInfoChanged -= OnMediaChanged;
        }

        _currentSession = session;
        session.MediaPropertiesChanged += OnMediaChanged;
        session.PlaybackInfoChanged += OnMediaChanged;
        
        await ScheduleSendAsync(session, "HandleSession");
    }

    private static async void OnMediaChanged(
        GlobalSystemMediaTransportControlsSession session,
        object args)
    {
        Console.WriteLine($"\n🎵 [{DateTime.Now:HH:mm:ss.fff}] MediaChanged event!");
        await ScheduleSendAsync(session, "MediaChanged");
    }

    private static async Task ScheduleSendAsync(GlobalSystemMediaTransportControlsSession session, string eventName)
    {
        _debounceCts?.Cancel();
        _debounceCts?.Dispose();
        _debounceCts = new CancellationTokenSource();
        var token = _debounceCts.Token;

        Console.WriteLine($"   ⏳ Scheduling send in {DEBOUNCE_DELAY_MS}ms (event: {eventName})");

        try
        {
            await Task.Delay(DEBOUNCE_DELAY_MS, token);
            Console.WriteLine($"   ✅ Debounce completed, sending data...");
            await SendMediaInfoAsync(session);
        }
        catch (TaskCanceledException)
        {
            Console.WriteLine($"   ⏭️ Debounce cancelled by new event");
        }
    }

    private static async Task SendMediaInfoAsync(GlobalSystemMediaTransportControlsSession session)
    {
        try
        {
            var mediaProps = await session.TryGetMediaPropertiesAsync();
            if (mediaProps == null)
            {
                Console.WriteLine("   ⚠️ MediaProperties is NULL");
                return;
            }

            var playbackInfo = session.GetPlaybackInfo();
            var playState = playbackInfo?.PlaybackStatus.ToString().ToLower() ?? "unknown";
            string currentTrackId = $"{mediaProps.Artist} - {mediaProps.Title}";
            
            Console.WriteLine($"   📝 Final track: {currentTrackId}");
            Console.WriteLine($"   📊 PlaybackType: {mediaProps.PlaybackType}");
            Console.WriteLine($"   📊 PlayState: {playState}");
            Console.WriteLine($"   📊 Album: {mediaProps.AlbumTitle ?? "null"}");

            bool trackChanged = _lastSentTrackId != currentTrackId;
            bool playStateChanged = _lastSentPlayState != playState;         

            if (!trackChanged && !playStateChanged)
            {
                Console.WriteLine("   🔄 No changes in track or play state, skipping send.");
                return;
            }

            // === Обрабатываем обложку с кэшированием ===
            string? coverBase64 = null;
            
            if (trackChanged)
            {
                // Трек сменился — нужно извлечь новую обложку
                if (mediaProps.Thumbnail != null)
                {
                    using var stream = await mediaProps.Thumbnail.OpenReadAsync();
                    
                    // ✅ ИСПРАВЛЕНО: Не прерываем отправку, если обложка слишком большая
                    if (stream.Size > int.MaxValue)
                    {
                        Console.WriteLine("   ⚠️ Thumbnail is too large, skipping cover.");
                        coverBase64 = null;
                    }
                    else
                    {
                        using var reader = new DataReader(stream);
                        await reader.LoadAsync((uint)stream.Size);
                        var bytes = new byte[(int)stream.Size];
                        reader.ReadBytes(bytes);
                        coverBase64 = Convert.ToBase64String(bytes);
                        
                        // Сохраняем в кэш
                        _lastCoverBase64 = coverBase64;
                        _lastTrackIdForCover = currentTrackId;
                    }
                }
                else
                {
                    Console.WriteLine("   🖼️ Thumbnail is NULL for new track");
                    // Сбрасываем кэш, так как у нового трека нет обложки
                    _lastCoverBase64 = null;
                    _lastTrackIdForCover = currentTrackId;
                }
            }
            else
            {
                // Трек тот же (изменился только playState) — используем кэшированную обложку
                if (_lastTrackIdForCover == currentTrackId)
                {
                    coverBase64 = _lastCoverBase64;
                    Console.WriteLine($"   📦 Using cached cover (track unchanged)");
                }
            }

            var trackData = new
            {
                type = "TRACK_UPDATE",
                payload = new
                {
                    title = mediaProps.Title ?? "Unknown",
                    artist = mediaProps.Artist ?? "Unknown",
                    cover = coverBase64 != null ? $"data:image/jpeg;base64,{coverBase64}" : null,
                    contentType = mediaProps.PlaybackType.ToString().ToLower(),
                    playState = playState,
                    source = "winrt"
                }
            };

            var json = JsonSerializer.Serialize(trackData);
            Console.WriteLine($"   📤 SENDING to WS: {mediaProps.Artist} - {mediaProps.Title} | State: {playState}");
            Console.WriteLine($"   📤 Cover in payload: {(coverBase64 != null ? "YES" : "NO")}");
            
            await SendToWebSocketAsync(json);

            _lastSentTrackId = currentTrackId;
            _lastSentPlayState = playState;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"   ❌ Error: {ex.Message}");
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
            Console.WriteLine("   ✅ WS send successful");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"   ❌ WS Error: {ex.Message}");
        }
    }
}