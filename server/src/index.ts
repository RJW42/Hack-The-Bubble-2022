import express from "express";
import http from "http"
import cors from "cors";

const app = express();
const port = 42069; // default port to listen

app.use(cors);

const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {origin: "*"}
});

io.on('connection', (socket: any) => {
  console.log('a user connected');
});

server.listen(port, () => {
  console.log('listening on localhost:' + port);
});