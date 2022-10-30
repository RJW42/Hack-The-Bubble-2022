import express from "express";
import http from "http"
import {Server} from "socket.io";

const app = express();
const port = 42069; // default port to listen

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

io.on('connection', (socket: any) => {
  console.log('a user connected');
});

server.listen(port, () => {
  console.log('listening on localhost:' + port);
});