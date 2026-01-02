import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import songsRouter from './songs/index.js';
import setlistsRouter from './setlists/index.js';
import statusRouter from './status.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/songs', songsRouter);
app.use('/api/setlists', setlistsRouter);
app.use('/api/status', statusRouter);

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
