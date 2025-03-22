import express from 'express';
import connect from './DB/dbconnection.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import userRoutes from './Routes/userRoutes.js';
import { Server } from 'socket.io';
import http from 'http';
import configureSocket from './config/socket.js';
import aiRoutes from './Routes/aiRoutes.js';
import passwordResetRoutes from './Routes/passwordResetRoutes.js';
import punycode from 'punycode';

// Suppress punycode deprecation warning
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return;
  }
  console.warn(warning);
});

dotenv.config();
connect();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = configureSocket(server);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/user', userRoutes);

app.use('/api/auth', passwordResetRoutes);

app.use('/ai',aiRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

export { app, server };
