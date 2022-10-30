"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const port = 42069; // default port to listen
app.use(cors_1.default);
const server = http_1.default.createServer(app);
<<<<<<< HEAD
const io = require("socket.io")(server, {
    cors: { origin: "*" }
=======
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*'
    }
>>>>>>> 25b2a70aeb40043d4fc7226d4a67157f1983cb96
});
io.on('connection', (socket) => {
    console.log('a user connected');
});
server.listen(port, () => {
    console.log('listening on localhost:' + port);
});
//# sourceMappingURL=index.js.map