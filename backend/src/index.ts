import { logEnvStatus } from './loadEnv.js';
import express from 'express';
import cors from 'cors';

import recommendRouter from './routes/recommend.js';
import playlistRouter from './routes/playlist.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors());
app.use(express.json());

app.use('/api/recommend', recommendRouter);
app.use('/api/playlist', playlistRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'MoodPlay Backend',
    version: '1.0.0',
    endpoints: {
      recommend: 'POST /api/recommend',
      playlist: 'POST /api/playlist',
      health: 'GET /api/recommend/health',
    },
  });
});

const server = app.listen(PORT, () => {
  logEnvStatus();
  console.log(`\n🎵 MoodPlay Backend running on http://localhost:${PORT}`);
  console.log(`   POST /api/recommend  — 감정 기반 큐레이션 플레이리스트`);
  console.log(`   POST /api/playlist   — YouTube 플레이리스트 저장 (OAuth)`);
  console.log(`   GET  /api/recommend/health — 상태 확인\n`);
  console.log(`   추천 = Gemini + YouTube (키 없으면 내부 카탈로그 fallback)\n`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n[backend] 포트 ${PORT}이(가) 이미 사용 중입니다.\n` +
        `   다른 터미널의 node/tsx 프로세스를 종료하세요:\n` +
        `   netstat -ano | findstr :${PORT}\n` +
        `   taskkill /PID <PID> /F\n`
    );
    process.exit(1);
  }
  throw err;
});
