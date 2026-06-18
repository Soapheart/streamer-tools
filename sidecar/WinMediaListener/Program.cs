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
    
    // === ОТЛАДКА ===
    private static int _coverCounter = 0;
    private static readonly string CoversFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "debug_covers");
    
    // === DEBOUNCE ЛОГИКА ===
    private static CancellationTokenSource? _debounceCts;
    private static readonly int DEBOUNCE_DELAY_MS = 800; // Ждём 800мс после последнего события
    
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
        
        // Запускаем debounce для отправки
        await ScheduleSendAsync(session, "HandleSession");
    }

    private static async void OnMediaPropertiesChanged(
        GlobalSystemMediaTransportControlsSession session,
        object args)
    {
        Console.WriteLine($"\n🎵 [{DateTime.Now:HH:mm:ss.fff}] MediaPropertiesChanged event!");
        await ScheduleSendAsync(session, "MediaPropertiesChanged");
    }

    private static async void OnPlaybackInfoChanged(
        GlobalSystemMediaTransportControlsSession session,
        object args)
    {
        var playbackInfo = session.GetPlaybackInfo();
        Console.WriteLine($"\n▶️  [{DateTime.Now:HH:mm:ss.fff}] PlaybackInfoChanged: {playbackInfo?.PlaybackStatus}");
    }

    // === НОВАЯ ЛОГИКА: Debounce на отправку ===
    private static async Task ScheduleSendAsync(GlobalSystemMediaTransportControlsSession session, string eventName)
    {
        // Отменяем предыдущий таймер, если он был
        _debounceCts?.Cancel();
        _debounceCts = new CancellationTokenSource();
        var token = _debounceCts.Token;

        Console.WriteLine($"   ⏳ Scheduling send in {DEBOUNCE_DELAY_MS}ms (event: {eventName})");

        try
        {
            // Ждём DEBOUNCE_DELAY_MS, но если придёт новое событие, мы отменим этот таймер
            await Task.Delay(DEBOUNCE_DELAY_MS, token);
            
            // Если дошли сюда, значит новых событий не было - отправляем
            Console.WriteLine($"   ✅ Debounce completed, sending data...");
            await SendMediaInfoAsync(session);
        }
        catch (TaskCanceledException)
        {
            // Таймер был отменён новым событием - ничего не делаем
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

            string currentTrackId = $"{mediaProps.Artist} - {mediaProps.Title}";
            Console.WriteLine($"   📝 Final track: {currentTrackId}");
            Console.WriteLine($"   📊 PlaybackType: {mediaProps.PlaybackType}");
            Console.WriteLine($"   📊 Album: {mediaProps.AlbumTitle ?? "null"}");
            
            // === Обрабатываем обложку ===
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
            else
            {
                Console.WriteLine("   🖼️ Thumbnail is NULL");
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
                    source = "winrt"
                }
            };

            var json = JsonSerializer.Serialize(trackData);
            Console.WriteLine($"   📤 SENDING to WS: {mediaProps.Artist} - {mediaProps.Title}");
            Console.WriteLine($"   📤 Cover in payload: {(coverBase64 != null ? "YES" : "NO")}");
            
            await SendToWebSocketAsync(json);
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