import express from 'express';
import cors from 'cors';
import http from 'http';
import * as path from 'path';

import { WidgetAdapter } from '../core/ports/WidgetPort';
import { WebSocketServer } from 'ws';
import { WSGateway } from '../adapters/transports/wsGateway';


export function startWidgetServer(widgetAdapters: WidgetAdapter[]) {
  const widgetApp = express();
  widgetApp.use(cors());

  // Health check endpoint
  widgetApp.get('/health', (req, res) => {
    console.log('✅ Health check requested');
    res.json({ status: 'ok', service: 'streamer-tools-widget' });
  });

  // Раздача статических файлов для виджетов
  const widgetsPath = path.join(process.cwd(), 'public', 'widgets');
  widgetApp.use('/widgets', express.static(widgetsPath));

  const server = http.createServer(widgetApp);
  const wss = new WebSocketServer({ server });
  const wsGateway = new WSGateway(wss);

  widgetAdapters.forEach(adapter => {
    console.log(`🔌 Setting up widget adapter: ${adapter.path}`);
    wsGateway.register(adapter);
  });

  wsGateway.start();


  const PORT = 3000;
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Widget server running at http://127.0.0.1:${PORT}`);
  }).on('error', (err) => {
    console.error('❌ Widget server error:', err);
  });

  return { server, wss };
}