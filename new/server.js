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
const https = require('http');

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
server.last_bullet_id = 0;


// Constants
const PLAYING = 0; 


// Game State  
const state = {
    players: {},
    bullets: {},
    game_state: PLAYING,
};
const connections = {};
const removes = [];


// Connections Code 
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
    // });

    // socket.on('reset', () => {
    // })

    // socket.on('purge', () => {
    // })
  });

  socket.on('connect_to_server', (data) => {
    // New Player Connected. The following code is specific to that player 
    socket.id = server.last_player_id++;
    console.log('new player: ', socket.id);

    handle_player_connect(data, socket);

    // Give Client Socket info 
    socket.emit('init', {id: socket.id});
    socket.on('movement', (keys) => handle_player_movement(keys, socket));
    socket.on('disconnect', () => handle_player_disconnnect(socket));
  });
});



const handle_player_connect = (data, socket) => {
  if(data.username.length > 10){
    data.username = data.username.slice(0, 10);
  }
  
  socket.player = {
    x: randomInt(0, 1400),
    y: randomInt(0, 800),
    velx: 0,
    vely: 0,
    body: null,
    username: data.username,
    can_fire: true,
    red: randomInt(0, 255),
    green: randomInt(0, 255),
    blue: randomInt(0, 255),
    coins: 0
  };

  state.players[socket.id] = socket.player;
  connections[socket.id] = socket;
}


const handle_player_disconnnect = (socket) => {
  // When a client disconects remove form the connections list 
  removes.push(socket.player.body);
  delete connections[socket.id];
  delete state.players[socket.id];
}


const handle_player_movement = (keys, socket) => {
  // Todo handle movement. 
  // Keys is a list of key codes. Use uppoer for letters 
  // Remember socket.id == player.id 
  if(state.game_state != PLAYING)
      return;

  const player = state.players[socket.id];

  player.velx = 0;
  player.vely = 0;
  augment =  0.001

  if(keys.right)
    player.velx = augment;
  if(keys.left)
    player.velx = -augment;
  if(keys.up)
    player.vely = -augment;
  if(keys.down)
    player.vely = augment;

  if(!keys.space && !player.can_fire)
    player.can_fire = true;

  if(keys.space && player.body != null && player.can_fire) {
    player.can_fire = false;

    const vx = player.body.velocity.x;
    const vy = player.body.velocity.y;

    player.can_fire = false;

    console.log("Bang!: " + vx + ", " + vy);
    
    // Add a new bullet to the state
    state.bullets[server.last_bullet_id++] = {
      x: player.body.position.x + vx * 5,
      y: player.body.position.y + vy * 5,
      velx: vx * 2,
      vely: vy * 2,
      body: null,
      fired_from: socket.id
    };

    (async () => {
      const response = await https.get('http://pc8-026-l:8080', (resp) => {
        let data = '';
      
        // A chunk of data has been received.
        resp.on('data', (chunk) => {
          data += chunk;
        });
      
        // The whole response has been received. Print out the result.
        resp.on('end', () => {
          console.log(JSON.parse(data));
        });
      
      }).on("error", (err) => {
        console.log("Error: " + err.message);
      });
    })();
  }
  
}

// Serverside Game Code 
const FPS = 60
global.phaserOnNodeFPS = FPS

// MainScene
class MainScene extends Phaser.Scene {
  create(){
  }

  update(){
    // Update game state 
    this.update_collision_bodies();

    // Init game state
    const send_state = {
      players: {},
      bullets: {},
      game_state: state.game_state,
    };

    this.update_and_clone_player_data(send_state.players);
    this.update_and_clone_bullet_data(send_state.bullets);
    
    // Send the new state to all the players 
    io.emit('update', 
      send_state
    );
  }


  update_and_clone_player_data(players) {
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
       
      // Update this player position for the client
      players[key] = {
        x: value.body.position.x,
        y: value.body.position.y,
        username: value.username,
        red: value.red,
        green: value.green,
        blue: value.blue,
        coins: value.coins,
      };
    }
  }


  update_and_clone_bullet_data(bullets) {
    for (const [key, value] of Object.entries(state.bullets)) {     
      // Update this player position for the client
      bullets[key] = {
        x: value.body.position.x,
        y: value.body.position.y,
      };
    }
  }


  update_collision_bodies() {
    // Remove any dead collisions 
    //  This occours when a player disconects from the game 
    removes.forEach(body => {
      this.matter.world.remove(body);    
    });
    removes.length = 0;

    // Update the player physics objects  
    for (const [key, value] of Object.entries(state.players)) {
      if(value.body == null){
        // Player does not have a collision body, give them one. 
        //  This occours when a new player connects to the game 
        value.body = this.matter.bodies.rectangle(value.x, value.y, 21, 32);
        this.matter.world.add(value.body);
      }
      this.matter.body.applyForce(value.body, value.body.position, {x: value.velx, y: value.vely});
    }

    // Update the bullet physics objects
    for (const [key, value] of Object.entries(state.bullets)) {
      if(value.body != null) continue;
      
      value.body = this.matter.bodies.rectangle(value.x, value.y, 21, 32);
      this.matter.world.add(value.body);
      this.matter.body.setVelocity(value.body, {x: value.velx, y: value.vely});
    };
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