import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
const app = express();




app.use(cors({
    origin: '*', // Replace with your frontend's origin
}));
app.use(express.json());

// Create the native Node.js HTTP server to wrap the Express app
const httpServer = createServer(app);

// Initialize Socket.IO on top of the HTTP server with CORS configurations
const io = new Server(httpServer, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});


io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('message', (msg) => {
        if (msg.trim() === '') return; 
        socket.broadcast.emit('message', msg);
    })

    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);
    });
})


httpServer.listen(3000, () => {
  console.log('Server is running on port 3000');
});