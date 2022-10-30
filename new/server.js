const { randomInt } = require('crypto');
const express = require('express');
const { Socket } = require('socket.io');
const app = express();
const server = require('http').Server(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    pingTimeout: 500
});
require('@geckos.io/phaser-on-nodejs')
const Phaser = require('phaser');
const { stat } = require('fs');
const { Body } = require('matter');


// Game Engine Code 
app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/assets',express.static(__dirname + '/assets'));

app.get('/',function(req,res){
    res.sendFile(__dirname+'/index.html');
});

app.get('/backend/',function(req,res){
    res.sendFile(__dirname+'/backend.html');
});

server.listen(42564,function(){ // Listens to port 8081
    console.log('Listening on '+server.address().port);
});

server.last_player_id = 0;


// Constants
const PLAYING = 0; 


// Main Server Code 
const state = {
    players: {

    },
    game_state: PLAYING,
}
const connections = {} // Todo: store what conn is what player maybe 
const removes = []

io.on('connection', (socket) => {
    socket.on('connect_to_server_backend', (data) => {
        if(data.password !== 'ligma'){
            console.log('bad password');
            socket.disconnect();
            return;
        }
        console.log('good password to backend');

        socket.emit('connected');

        // socket.on('start', () => {
        //     console.log('starting game');
        //     state.game_state = PLAYING
        // });

        // socket.on('reset', () => {
        //     console.log('resetting game');
        //     state.team_0_score = 0;
        //     state.team_1_score = 0;
        //     state.reset_ball = true;
        // })

        // socket.on('purge', () => {
        //     return;
        //     /*
        //     console.log('purging game');
        //     state.players = {
            
        //         },
        //     state.game_state = WAITING_FOR_PLAYERS;
        //     state.time_left = 0;
        //     state.team_0_score = 0;
        //     state.team_1_score = 0;
        //     state.team_0_count = 0;
        //     state.team_1_count = 0;
        //     state.reset_ball = true;
            
        //     for(const [id_, socket_] of Object.entries(connections)){
        //         removes.push(socket_.player.body);
        //         socket_.disconnect();
        //     }

        //     connections = {};
        //     */
        // })
    });

    socket.on('connect_to_server', (data) => {
        // New Player Connected. The following code is specific to that player 
        socket.id = server.last_player_id++;
        console.log('new player: ', socket.id);

        if(data.username.length > 10){
            data.username = data.username.slice(0, 10);
        }
        
        socket.player = {
            x: randomInt(0, 1400),
            y: randomInt(0, 800),
            velx: 0,
            vely: 0,
            body: null,
            username: data.username
        };

        state.players[socket.id] = socket.player;
        connections[socket.id] = socket;

        // Give Client Socket info 
        socket.emit('init', {
            id: socket.id
        });

        // Get keyboard input 
        socket.on('movement', (keys) => {
            // Todo handle movement. 
            // Keys is a list of key codes. Use uppoer for letters 
            // Remember socket.id == player.id 
            if(state.game_state != PLAYING)
                return;

            state.players[socket.id].velx = 0;
            state.players[socket.id].vely = 0;
            augment =  0.001

            if(keys.right)
                state.players[socket.id].velx = augment;
            if(keys.left)
                state.players[socket.id].velx = -augment;
            if(keys.up)
                state.players[socket.id].vely = -augment;
            if(keys.down)
                state.players[socket.id].vely = augment;
        });

        // Init logic to handle player disconnet 
        socket.on('disconnect', () => {
            // When a client disconects remove form the connections list 
            //socket.player.body.destroy();
            //if(!socket.player.spectating)
            removes.push(socket.player.body);
            //else
            delete connections[socket.id];
            delete state.players[socket.id];
        });
    });
});

// Serverside Game Code 
const FPS = 60
global.phaserOnNodeFPS = FPS

// MainScene
class MainScene extends Phaser.Scene {
  create(){
  }

  update(){
    // Update game state 
    this.update_game_state();

    // Remove any dead collisions 
    //  This occours when a player disconects from the game 
    removes.forEach(body => {
      this.matter.world.remove(body);    
    })
    removes.length = 0;

    // Give all players a collidable body 
    for (const [key, value] of Object.entries(state.players)) {
      if(value.body == null){
        value.body = this.matter.bodies.rectangle(value.x, value.y, 21, 32);
        this.matter.world.add(value.body);
      }
      this.matter.body.applyForce(value.body, value.body.position, {x: value.velx, y: value.vely});
    }

    // Updating the players positions
    var send_state = {
      players: {},
      game_state: state.game_state,
    };

    this.update_player_positions(send_state.players);
    
    // Send the new state to all the players 
    io.emit('update', 
      send_state
    );
  }

  update_game_state() {
    
  }

  update_player_positions(players) {
    const width = this.sys.canvas.width;
    const height = this.sys.canvas.height;

    for (const [key, value] of Object.entries(state.players)) {
      const x = value.body.position.x;
      const y = value.body.position.y;
      const vx = value.body.velocity.x;
      const vy = value.body.velocity.y;

      // Move the players from on side to the other 
      if(x >= width - 25 && vx > 0) {
        this.matter.body.translate(value.body, {x: -x + 25, y: 0}); 
      } else if(x < 25 && vx < 0) {
        this.matter.body.translate(value.body, {x: width - 25, y: 0}); 
      }

      if(y >= height - 25 && vy > 0) {
        this.matter.body.translate(value.body, {x: 0, y: -y + 25}); 
      } else if(y < 25 && vy < 0) {
        this.matter.body.translate(value.body, {x: 0, y: height - 25}); 
      }

      console.log("hello");
       
      // Update this player position for the client
      players[key] = {
        x: value.body.position.x,
        y: value.body.position.y,
        username: value.username
      };
    }
  }
}

// prepare the config for Phaser
const config = {
  type: Phaser.HEADLESS,
  width: 1400,
  height: 800,
  banner: false,
  audio: false,
  scene: [MainScene],
  fps: {
    target: FPS
  },
  physics: {
    default: 'matter',
    matter: {
        gravity: false,
        setBounds: true
    }
  }
}

// start the game
new Phaser.Game(config)