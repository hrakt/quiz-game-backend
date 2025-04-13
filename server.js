const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend dev server
    methods: ["GET", "POST"]
  }
});


const waitingRooms = {};
const activeGames = {}; // { roomId: { quiz, players: [] } }

io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  socket.on("find-room", (topic) => {
    if (waitingRooms[topic]) {
      const roomId = waitingRooms[topic];
      socket.join(roomId);
      const quiz = activeGames[roomId]?.quiz;
      if (quiz) {
        socket.emit("start-quiz", quiz);
        socket.to(roomId).emit("start-quiz", quiz);
      }
  
      io.to(roomId).emit("message", `User ${socket.id} joined room ${roomId}`);
      io.to(roomId).emit("opponent-joined"); // ✅ notify both users now
      socket.emit("joined-room", roomId);
  
      delete waitingRooms[topic];
    } else {
      const newRoomId = `${topic}-${socket.id}`;
      waitingRooms[topic] = newRoomId;
      socket.join(newRoomId);
      const quiz = [
        { question: "What is 2 + 2?", options: ["3", "4", "5"], answer: "4" },
        { question: "What color is the sky?", options: ["Blue", "Red", "Green"], answer: "Blue" }
      ];
      activeGames[newRoomId] = {
        quiz,
        players: [socket.id],
      };
      socket.emit("joined-room", newRoomId);
    }
  });

  socket.on("send-answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("receive-answer", answer);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on http://localhost:${PORT}`);
});