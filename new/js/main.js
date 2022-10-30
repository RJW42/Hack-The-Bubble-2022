var scene = new Phaser.Scene('Game');
var title_scene = new Phaser.Scene('Title');
var username = "";


title_scene.preload = () => {
  title_scene.load.plugin('rexinputtextplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', true);
  title_scene.input_key = title_scene.input.keyboard.addKey('enter');
}

title_scene.create = () => {
  title_scene.input_text = title_scene.add.rexInputText(700, 400, 500, 50, {
    type: 'text',
    text: '...',
    fontSize: '50px',
    color: 'black',
    borderColor: 'black',
    border: 1,
  });
  title_scene.add.text(180, 375, 'Username: ', {
    fontSize: 50,
    color: 'black',
  });
}

title_scene.update = () => {
  if(title_scene.input_key.isDown && title_scene.input_text.text.length > 3 && title_scene.input_text.text != '...'){
    username = title_scene.input_text.text;
    title_scene.scene.start('Game');
  }
}

scene.connected = false;
var usernames_set = false;

const PLAYING = 0; //Symbol('Playing');
const WAITING_FOR_PLAYERS = 1; //Symbol('Waiting');
const COUNT_DOWN = 2; //Symbol('CountDown');
const SPECTATING = 3;

scene.state = {
  id: 0,
  players: {},
  bullets: {},
  asteroids: {}
};

scene.preload = () => {
  // Load all assets 
  scene.load.image('background', 'assets/sprites/galaxy.jpg');
  scene.load.image('player', 'assets/sprites/player.png');
  scene.load.image('enemy', 'assets/sprites/enemy.png');
  scene.load.image('bullet', 'assets/sprites/bullet.png');
  scene.load.image('asteroid', 'assets/sprites/asteroid.png');

  // Init keys 
  scene.keys = {
    up: scene.input.keyboard.addKey('W'),
    down: scene.input.keyboard.addKey('S'),
    left: scene.input.keyboard.addKey('A'),
    right: scene.input.keyboard.addKey('D'),
    space: scene.input.keyboard.addKey('space'),
    p: scene.input.keyboard.addKey('P'),
  }
}

scene.create = () => {
    console.log('Start');
    scene.add.image(400, 0, 'background');
    Client.connect(username);
    scene.score_text = scene.add.text(0, 0, 'Waiting For Players', {
      fontSize: 60,
      color: 'white',
    });
    scene.goal_text = scene.add.text(0, 60, '', {
      fontSize: 60,
      color: 'white',
    });
}

scene.update = () => {
  // Check if state is set 
  if(scene.state == null)
    return;

  // Render the game state 
  //  Render Players 
  for(const [player_id, player] of Object.entries(scene.state.players)){
    player.obj.x = player.x
    player.obj.y = player.y
    // if(player.obj.texture.key === '__MISSING'){
    //   if(player_id == scene.player_id){
    //     player.obj.setTexture('player');
    //   } else {
    //     player.obj.setTexture('enemy');
    //   }
    // }
    // // console.log("angle", player.angle);
    // player.obj.setAngle(player.angle + 90);
    // if(player.obj.texture.key === '__MISSING'){
    //   if(player_id == scene.player_id){
    //     player.obj.setTexture('player');
    //   } else {
    //     player.obj.setTexture('enemy');
    //   }
    // }

    // scene.add.circle(player.x, player.y, 10, 0xff1166);
  }

  //  Render bullets
  for(const [bullet_id, bullet] of Object.entries(scene.state.bullets)){
    bullet.obj.x = bullet.x
    bullet.obj.y = bullet.y
    if(bullet.obj.texture.key === '__MISSING'){
      bullet.obj.setTexture('bullet');
    }
  }

  //  Render asteroids
  for(const [asteroid_id, asteroid] of Object.entries(scene.state.asteroids)){
    asteroid.obj.x = asteroid.x
    asteroid.obj.y = asteroid.y
    if(asteroid.obj.texture.key === '__MISSING'){
      asteroid.obj.setTexture('asteroid');
    }
  }

  // Draw Text
  scene.draw_text();

  // Send keyboard input 
  keys = {
    up: scene.keys.up.isDown,
    down: scene.keys.down.isDown,
    left: scene.keys.left.isDown,
    right: scene.keys.right.isDown,
    space: scene.keys.space.isDown,
    p: scene.keys.p.isDown,
  }
  Client.socket.emit('movement', keys);
}


scene.draw_text = () => {
  switch(scene.state.game_state){
  case PLAYING:
    for(const [player_id, player] of Object.entries(scene.state.players))
      scene.score_text.setText('SpaceCoins: ' + player.coins.toString());
    break;
  }
}

scene.update_state = (server_state) => {
  console.log("UPDATE_STATE: " + server_state);

  if(!scene.loaded) return;

  // Convert the state to client side 
  let new_state = {
    id: 0,
    players: {},
    bullets: {},
    asteroids: {},
    game_state: server_state.game_state,
  }


  // Update the client side players 
  update_players(new_state, server_state);

  // Update the client side bullets 
  update_bullets(new_state, server_state);

  // Update the client side asteroids
  update_asteroids(new_state, server_state);

  // Update the state 
  scene.state = new_state;
}


const update_players = (new_state, server_state) => {
  // Get all players in the server state
  for(let player_id in server_state.players) {
    // Check if player is already created 
    const obj = ((player_id) => {;
      if(scene.state.players[player_id]) {
        return scene.state.players[player_id].obj;
      }
      
      usernames_set = false;

      return scene.add.rectangle(-50,-50,10,40,parseInt(server_state.players[player_id].color));
    })(player_id, server_state);

    // Setting rotation
    obj.setAngle(server_state.players[player_id].angle + 90);

    new_state.players[player_id] = {
      x: server_state.players[player_id].x,
      y: server_state.players[player_id].y,
      obj: obj,
      angle: server_state.players[player_id].angle,
      username: server_state.players[player_id].username,
      color: server_state.players[player_id].color,
      coins: server_state.players[player_id].coins
    };
  }

  // Check for deleted players 
  for(let player_id in scene.state.players){
    if(!new_state.players[player_id]){
      scene.state.players[player_id].obj.destroy(true);
      usernames_set = false;
    }
  }
}


const update_bullets = (new_state, server_state) => {
  // Get all bullets in the server state
  for(let bullet_id in server_state.bullets) {
    // Check if bullet is already created 
    const obj = ((bullet_id) => {;
      if(scene.state.bullets[bullet_id]){
        return scene.state.bullets[bullet_id].obj;
      }
      
      return scene.add.sprite(-50, -50, 'bullet');
    })(bullet_id, server_state);

    new_state.bullets[bullet_id] = {
      x: server_state.bullets[bullet_id].x,
      y: server_state.bullets[bullet_id].y,
      obj: obj,
    };
  }

  // Check for deleted bullets 
  for(let bullet_id in scene.state.bullets){
    if(!new_state.bullets[bullet_id]){
      scene.state.bullets[bullet_id].obj.destroy(true);
    }
  }
}


const update_asteroids = (new_state, server_state) => {
    // Get all asteroids in the server state
  for(let asteroid_id in server_state.asteroids) {
    // Check if asteroid is already created 
    const obj = ((asteroid_id) => {;
      if(scene.state.asteroids[asteroid_id]){
        return scene.state.asteroids[asteroid_id].obj;
      }
      
      return scene.add.sprite(-50, -50, 'asteroid');
    })(asteroid_id, server_state);

    new_state.asteroids[asteroid_id] = {
      x: server_state.asteroids[asteroid_id].x,
      y: server_state.asteroids[asteroid_id].y,
      obj: obj,
    };
  }

  // Check for deleted asteroids 
  for(let asteroid_id in scene.state.asteroids){
    if(!new_state.asteroids[asteroid_id]){
      scene.state.asteroids[asteroid_id].obj.destroy(true);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 1400,
  height: 800,
  dom: {
    createContainer: true
  },        
  scene: [title_scene, scene],
  parent: 'game',
  backgroundColor: '#70a4c9',
}

const game = new Phaser.Game(config);

