require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/devices',  require('./routes/devices'));
app.use('/earnings', require('./routes/earnings'));
app.use('/modules',  require('./routes/modules'));
app.use('/payouts',  require('./routes/payouts'));
app.use('/admin',    require('./routes/admin'));
app.use('/b2b',      require('./routes/b2b'));

const server = http.createServer(app);

// WebSocket — push live earnings updates to connected devices
const wss = new WebSocketServer({ server });
const clients = new Map(); // deviceId -> ws

wss.on('connection', (ws, req) => {
  const deviceId = new URL(req.url, 'http://x').searchParams.get('deviceId');
  if (deviceId) clients.set(deviceId, ws);
  ws.on('close', () => clients.delete(deviceId));
});

// Export push helper for routes to use
app.locals.push = (deviceId, data) => {
  const ws = clients.get(deviceId);
  if (ws?.readyState === 1) ws.send(JSON.stringify(data));
};

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Voltrix backend running on port ${PORT}`));
