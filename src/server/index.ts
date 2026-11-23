import express from 'express';
import cors from 'cors';
import http from 'http';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';
import { WIDGET_SERVER_PORT } from '../shared/constants'

import { WidgetAdapter } from '../core/ports/WidgetPort';
import { ContentPackManager } from '../core/services/ContentPackManager';
import { WebSocketServer } from 'ws';
import { WSGateway } from '../adapters/transports/wsGateway';


// Получаем __dirname для ESM модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startWidgetServer(widgetAdapters: WidgetAdapter[], contentPackManager: ContentPackManager) {
  const widgetApp = express();
  widgetApp.use(cors());

  // Health check endpoint
  widgetApp.get('/health', (req, res) => {
    console.log('✅ Health check requested');
    res.json({ status: 'ok', service: 'streamer-tools-widget' });
  });

  widgetApp.get('/content/:widget/:contentType/:packId/:file', (req, res) => {
    const { widget, contentType, packId, file } = req.params;
    const filePath = contentPackManager.getItemPath(widget, contentType, packId, file);
    
    if (!filePath) {
      res.status(404).json({ error: 'Content not found or not licensed' });
      return;
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ error: 'File not found' });
      }
    });
  });

  widgetApp.get('/api/content/:widget', (req, res) => {
    const { widget } = req.params;
    const contentType = req.query.contentType as string | undefined;
    const packs = contentPackManager.getPacksForWidget(widget, contentType);
    console.log(`[API] /api/content/${widget} → ${packs.length} packs`);
    res.json({ packs });
  });

  const isPackaged = app.isPackaged;
  const widgetsPath = isPackaged
    ? path.join(process.resourcesPath, 'public', 'widgets') // Для собранного приложения
    : path.join(process.cwd(), 'public', 'widgets');        // Для разработки

  console.log(`📂 Serving widgets from: ${widgetsPath}`);
  // Раздача статических файлов для виджетов
  widgetApp.use('/widgets', express.static(widgetsPath));

  widgetApp.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  const server = http.createServer(widgetApp);
  const wss = new WebSocketServer({ server });
  const wsGateway = new WSGateway(wss);

  widgetAdapters.forEach(adapter => {
    console.log(`🔌 Setting up widget adapter: ${adapter.path}`);
    wsGateway.register(adapter);
  });

  wsGateway.start();


  server.listen(WIDGET_SERVER_PORT, '127.0.0.1', () => {
    console.log(`🚀 Widget server running at http://127.0.0.1:${WIDGET_SERVER_PORT}`);
  }).on('error', (err) => {
    console.error('❌ Widget server error:', err);
  });

  return { server, wss };
}