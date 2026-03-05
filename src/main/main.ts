import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

// ... существующие импорты

// === HTTP + WebSocket сервер для виджетов ===
function startWidgetServer() {
  const app = express();
  const server = http.createServer(app);
  
  // CORS для доступа из OBS Browser Source
  app.use(cors({ origin: '*' }));
  
  // Socket.io с CORS
  const io = new SocketIOServer(server, {
    cors: { origin: '*' },
  });

  // Простой health-check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Endpoint для статических виджетов (опционально)
  app.use('/widgets', express.static('public/widgets'));

  // WebSocket логика
  io.on('connection', (socket) => {
    console.log('🔌 Widget connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('🔌 Widget disconnected:', socket.id);
    });
  });

  // Запуск сервера на отдельном порту
  const WIDGET_PORT = 3000;
  server.listen(WIDGET_PORT, '127.0.0.1', () => {
    console.log(`🎯 Widget server running at http://127.0.0.1:${WIDGET_PORT}`);
  });

  return io; // Возвращаем io, чтобы отправлять события из других частей приложения
}

// === В функции createWindow, после mainWindow.loadURL ===
let io: SocketIOServer | null = null;

function createWindow() {
  // ... существующий код создания окна
  
  // Запускаем сервер виджетов
  io = startWidgetServer();
}

// === Экспорт io для использования в других модулях ===
export { io };