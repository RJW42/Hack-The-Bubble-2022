var Client = {};
var logged_in = false;
Client.socket = io.connect();


// All client side code 
Client.connect = function(password){
    // Create new connection to server 
    console.log('connecting')
    Client.socket.emit('connect_to_server_backend', {password: password});
};


function init_connection(password) {
    Client.connect(password);
}

Client.socket.on('connected', () => {
    logged_in = true;
    console.log('connected');
})


function start_game() {
    if(logged_in)
        Client.socket.emit('start');
}

function reset() {
    if(logged_in)
        Client.socket.emit('reset');
}

function purge() {
    if(logged_in)
        Client.socket.emit('purge');
}