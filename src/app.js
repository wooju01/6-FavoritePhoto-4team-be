import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';
import cors from 'cors';
import errorHandler from './middlewares/ErrorHandler.js';
import usersController from './controllers/UsersController.js';
import authController from './controllers/AuthController.js';
import salesController from './controllers/SalesController.js';
import storeController from './controllers/StoreController.js';
import pointsController from './controllers/PointsController.js';
import notificationsController from './controllers/NotificationsController.js';
import purchasecontroller from './controllers/Purchasecontroller.js'
import { Server } from 'socket.io';
import http from 'http';
import tradeRequestController from './controllers/TradeRequestController.js';
import tradeController from './controllers/TradeController.js';
import { resetSequences } from './config/resetSequences.js';

const app = express();
app.use(
  cors({
    origin: [
      // 프론트 배포 도메인 (Vercel)
      'https://favorite-photo-psi.vercel.app',
      // 로컬 개발 환경
      'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    optionsSuccessStatus: 200
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use('/uploads', express.static('src/uploads'));

app.use('/api/auth', authController);
app.use('/api/users', usersController);
app.use('/api/store', storeController);
app.use('/api/notifications', notificationsController);
app.use('/api/points', pointsController);
// app.use('/api/store', salesController);
app.use('/api/store', tradeRequestController);
app.use('/api/store', salesController); // 계속 사용하고 있으니 주석하지 말아주세요
app.use('/api/store', tradeController);
app.use('/api/store', purchasecontroller);

app.use(errorHandler);

// 기존 app.listen 대신 http 서버 생성
// 시퀀스 초기화 (시드 데이터로 인해 시퀀스가 뒤쳐진 경우를 방지)
await resetSequences();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://favorite-photo-psi.vercel.app', 'http://localhost:3000'],
    credentials: true
  }
});

// 소켓 연결 이벤트
io.on('connection', (socket) => {
  // 유저 식별(예: 토큰/유저ID 등)
  socket.on('join', (userId) => {
    socket.join(userId); // 유저별 방 입장
  });
});

app.set('io', io); // app에서 io 객체 사용 가능하게 등록

// 서버 실행
const port = process.env.PORT ?? 3002;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
