var Client = {};
Client.socket = io.connect();

Client.socket.on('init',function(data){
    // Called on sucseful connection to server 
    scene.player_id = data.id;
    scene.loaded = true;
});

// All client side code 
Client.connect = function(username){
    // Create new connection to server 
    scene.state.id = 0;
    Client.socket.emit('connect_to_server', {
        username: username
    });
};

Client.socket.on('update', (state) => {
    scene.update_state(state);
})
