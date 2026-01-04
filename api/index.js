import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import songsHandler from './songs/index.js';
import setlistsHandler from './setlists/index.js';
import statusHandler from './status.js';

const app = express();
app.use(cors());
app.use(express.json());

// Wrap handler functions so this file can be used for local Express dev
app.use('/api/songs', (req, res, next) => {
  Promise.resolve(songsHandler(req, res)).catch(next);
});
app.use('/api/setlists', (req, res, next) => {
  Promise.resolve(setlistsHandler(req, res)).catch(next);
});
app.use('/api/status', (req, res, next) => {
  Promise.resolve(statusHandler(req, res)).catch(next);
});

app.get('/', (req, res) => {
  res.send('Turso ChordPro API is running');
});

// Only listen in local dev
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

export default app;
