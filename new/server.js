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
const Matter = require('matter');

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
server.last_asteroid_id = 0;
server.curr_number_of_asteroids = 0;

// Constants
const PLAYING = 0; 


// Game State  
const state = {
    players: {},
    bullets: {},
    asteroids: {},
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
    score: 0,
    angle: 0,
    velArg: 0,
    speed: 0,
    velx: 0,
    vely: 0,
    body: null,
    username: data.username,
    can_fire: 0,
    can_buy: false,
    red: randomInt(0, 255),
    green: randomInt(0, 255),
    blue: randomInt(0, 255),

    coins: 0,
    difficulty: 1,
    color: Math.floor(Math.random()*16777215),

    pid: -1
  };

  console.log(socket.player.color);

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
  player.speed = 0;
  player.velArg = 0;
  augment =  0.0005;

  if(keys.right) {
    player.velArg = 0.12;
    // player.velx = augment;
  }
    
    
  if(keys.left) {
    player.velArg = -0.12;
    // player.velx = -augment;
  }
    
  if(keys.up) {
// player.vely = -augment;
    player.speed = augment;
  }
    
  if(keys.down) {
// player.vely = augment;
  }

  // if(!keys.space && !player.can_fire)
  //   player.can_fire = true;


  // spend coins!
  if(!keys.p && !player.can_buy) {
    player.can_buy = true;
  }

  if(keys.p) {
    if (player.coins < 10 || !player.can_buy) return;
    player.can_buy = false;
    player.can_fire = 60;
    (async () => {
      const response = await https.get('http://pc8-026-l:8080/' + socket.id + '/' + 2 + '/' + 10, (resp) => {
        let data = '';
      
        // A chunk of data has been received.
        resp.on('data', (chunk) => {
          data += chunk;
        });
      
        // The whole response has been received. Print out the result.
        resp.on('end', () => {
          console.log(JSON.parse(data));
          player.coins = JSON.parse(data).coins
          player.difficulty++
        });
      
      }).on("error", (err) => {
        console.log("Error: " + err.message);
      });
    })();
  }

  if(keys.space && player.body != null && player.can_fire <= 0) {
    player.can_fire = 60;

    const vx = player.body.velocity.x;
    const vy = player.body.velocity.y;

    const angle = player.body.angle * Math.PI / 180;
    const mag = Math.sqrt((vx ** 2) + (vy ** 2));

    player.can_fire = 60;

    console.log("Bang!: " + mag + ", " + angle);
    
    const bullet_id = server.last_bullet_id++;

    // Add a new bullet to the state
    state.bullets[bullet_id] = {
      x: player.body.position.x + (Math.cos(angle) * 30),
      y: player.body.position.y + (Math.sin(angle) * 30),
      velx : Math.cos(angle) * Math.max(Math.min(mag, 6), 1) * (5),
      vely : Math.sin(angle) * Math.max(Math.min(mag, 6), 1) * (5),
      // velx: Math.cos(angle) * mag * 10,
      // vely: Math.sin(angle) * mag * 10,
      body: null,
      fired_from: socket.id,
      bullet_id: bullet_id
    };

    // (async () => {
    //   const response = await https.get('http://pc8-026-l:8080/' + 2, (resp) => {
    //     let data = '';
      
    //     // A chunk of data has been received.
    //     resp.on('data', (chunk) => {
    //       data += chunk;
    //     });
      
    //     // The whole response has been received. Print out the result.
    //     resp.on('end', () => {
    //       console.log(JSON.parse(data));
    //       player.coins = JSON.parse(data).coins
    //       // player.can_fire = true
    //     });
      
    //   }).on("error", (err) => {
    //     // console.log("Error: " + err.message);
    //   });
    // })();
  }
}

// Serverside Game Code 
const FPS = 60
global.phaserOnNodeFPS = FPS

// MainScene
class MainScene extends Phaser.Scene {
  create(){
    this.matter.world.on('collisionstart', (e, ba, bb) => {
      if(ba.c_parent && ba.c_parent.type === "bullet" && 
         bb.c_parent && bb.c_parent.type === "asteroid") {
        handle_bullet_collsion(ba.c_parent.data, bb.c_parent.data);
      } else if(bb.c_parent && bb.c_parent.type === "bullet" && 
        ba.c_parent && ba.c_parent.type === "asteroid") {
        handle_bullet_collsion(bb.c_parent.data, ba.c_parent.data);
      }
    });
  }

  update(){
    this.random_asteroid_spawn();

    // Update game state 
    this.update_collision_bodies();

    // Init game state
    const send_state = {
      players: {},
      bullets: {},
      asteroids: {},
      game_state: state.game_state,
    };

    this.update_and_clone_player_data(send_state.players);
    this.update_and_clone_bullet_data(send_state.bullets);
    this.update_and_clone_asteroid_data(send_state.asteroids);
    
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
      const a = value.body.angle;

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
        angle: a,
        username: value.username,
        coins: value.coins,
        color: value.color
      };
    }
  }


  update_and_clone_bullet_data(bullets) {
    const width = this.sys.canvas.width;
    const height = this.sys.canvas.height;
    const bullets_to_del = [];

    for (const [key, value] of Object.entries(state.bullets)) {     
      // Check if shuold remove this bullet
      const x = value.body.position.x;
      const y = value.body.position.y;
      const vx = value.body.velocity.x;
      const vy = value.body.velocity.y;

      if(x < 20 || y < 20 || x > width - 20 || y > height - 20 || 
        (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5)) {
        removes.push(value.body);
        bullets_to_del.push(key);
        continue;
      }

      // Update this player position for the client
      bullets[key] = {
        x: x, 
        y: y
      };
    }

    bullets_to_del.forEach(id => delete state.bullets[id]);
  }


  update_and_clone_asteroid_data(asteroids) {
    const width = this.sys.canvas.width;
    const height = this.sys.canvas.height;
    const asteroid_to_del = [];

    for (const [key, value] of Object.entries(state.asteroids)) {     
      // Check if shuold remove this asteroid
      const x = value.body.position.x;
      const y = value.body.position.y;
      const vx = value.body.velocity.x;
      const vy = value.body.velocity.y;

      if(x < 20 || y < 20 || x > width - 20 || y > height - 20 || 
        (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5)) {
        server.curr_number_of_asteroids--;
        removes.push(value.body);
        asteroid_to_del.push(key);
        continue;
      }

      // Update this player position for the client
      asteroids[key] = {
        x: value.body.position.x,
        y: value.body.position.y,
      };
    }

    asteroid_to_del.forEach(id => delete state.asteroids[id]);
  }

  random_asteroid_spawn() {
    if(server.curr_number_of_asteroids > 10) return;

    // Spawn an asteroid 
    server.curr_number_of_asteroids++;

    const asteroid_id = server.last_asteroid_id++;
    
    const margin = 100;
    const SIDE_SPEED = 5;
    const FORWARD_SPEED = 10;
    let udlr =  randomInt(0, 4);
    

    let x = 0;
    let y = 0;
    let velx = 0;
    let vely = 0;
    switch (udlr) {
      // up
      case 0:
        x = randomInt(0, config.width);
        y = randomInt(0, margin);
        velx = randomInt(-SIDE_SPEED, SIDE_SPEED);
        vely = randomInt(0,FORWARD_SPEED);
        break;
      // down
      case 1:
        x = randomInt(0, config.width);
        y = randomInt(config.height - margin, config.height);
        velx = randomInt(-SIDE_SPEED, SIDE_SPEED);
        vely = randomInt(-FORWARD_SPEED,0);
        break;
      // left
      case 2:
        x = randomInt(0, margin);
        y = randomInt(0, config.height);
        velx = randomInt(0, FORWARD_SPEED);
        vely = randomInt(0,SIDE_SPEED);
        break;
      // right
      case 3:
        x = randomInt(config.width - margin, config.width);
        y = randomInt(0, config.height);
        velx = randomInt(-FORWARD_SPEED, 0);
        vely = randomInt(-SIDE_SPEED,SIDE_SPEED);
        break;
      
    }

    state.asteroids[asteroid_id] = {
      x: x,
      y: y,
      velx: velx,
      vely: vely,
      body: null,
      asteroid_id: asteroid_id,
    };
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
      value.can_fire -= value.difficulty;
      if(value.body == null){
        // Player does not have a collision body, give them one. 
        //  This occours when a new player connects to the game 
        value.body = this.matter.bodies.rectangle(value.x, value.y, 21, 32, {
          friction: 0,
          frictionAir: 0,
          frictionStatic: 0,
        });
        this.matter.world.add(value.body);
      }
      
      this.matter.body.setAngle(value.body, (value.body.angle * Math.PI / 180.0) + value.velArg);
      // console.log(value.body.angle, value.velArg);
      this.matter.applyForceFromAngle(value.body, value.speed);
      this.matter.body.setAngle(value.body, value.body.angle * 180 / Math.PI)
      // this.matter.body.applyForce(value.body, value.body.position, {x: value.velx, y: value.vely});
    }

    // Update the bullet physics objects
    for (const [key, value] of Object.entries(state.bullets)) {
      if(value.body != null) continue;
      
      value.body = this.matter.bodies.rectangle(value.x, value.y, 16, 16, {
        friction: 0,
        frictionAir: 0,
        frictionStatic: 0,
      });
      value.body.c_parent = {
        type: "bullet",
        data: value
      };
      
      this.matter.world.add(value.body);
      this.matter.body.setVelocity(value.body, {x: value.velx, y: value.vely});
    };

    // Update the bullet physics objects
    for (const [key, value] of Object.entries(state.asteroids)) {
      if(value.body != null) continue;
      
      value.body = this.matter.bodies.rectangle(value.x, value.y, 64, 64, {
        friction: 0,
        frictionAir: 0,
        frictionStatic: 0,
      });
      value.body.c_parent = {
        type: "asteroid",
        data: value
      };

      this.matter.world.add(value.body);
      this.matter.body.setVelocity(value.body, {x: value.velx, y: value.vely});
    };
  }
}


const handle_bullet_collsion = (bullet, asteroid, socket) => {
  console.log("Killed by: " + bullet.fired_from)
  server.curr_number_of_asteroids--;
  state.players[bullet.fired_from].score++;

  (async () => {
      const response = await https.get('http://pc8-026-l:8080/' + bullet.fired_from + '/' + 2, (resp) => {
        let data = '';
      
        // A chunk of data has been received.
        resp.on('data', (chunk) => {
          data += chunk;
        });
      
        // The whole response has been received. Print out the result.
        resp.on('end', () => {
          console.log(JSON.parse(data));
          state.players[bullet.fired_from].coins = JSON.parse(data).coins
          // player.can_fire = true
        });
      
      }).on("error", (err) => {
        // console.log("Error: " + err.message);
      });
    })();

  // Remove both the asteroid and the bullet
  removes.push(bullet.body);
  removes.push(asteroid.body);

  delete state.bullets[bullet.bullet_id];
  delete state.asteroids[asteroid.asteroid_id];
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