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
  bullets: {}
};

scene.preload = () => {
  // Load all assets 
  scene.load.image('player', 'assets/sprites/player.png');
  scene.load.image('enemy', 'assets/sprites/enemy.png');
  scene.load.image('bullet', 'assets/sprites/dead_body.png');

  // Init keys 
  scene.keys = {
    up: scene.input.keyboard.addKey('W'),
    down: scene.input.keyboard.addKey('S'),
    left: scene.input.keyboard.addKey('A'),
    right: scene.input.keyboard.addKey('D'),
    space: scene.input.keyboard.addKey('space'),
  }

  // Init text
  scene.score_text = scene.add.text(0, 0, 'Waiting For Players', {
    fontSize: 60,
    color: 'black',
  });
  scene.goal_text = scene.add.text(0, 60, '', {
    fontSize: 60,
    color: 'black',
  });
}

scene.create = () => {
    console.log('Start');
    Client.connect(username);
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
    if(player.obj.texture.key === '__MISSING'){
      if(player_id == scene.player_id){
        player.obj.setTexture('player');
      } else {
        player.obj.setTexture('enemy');
      }
    }
  }

  //  Render bullets
  for(const [bullet_id, bullet] of Object.entries(scene.state.bullets)){
    bullet.obj.x = bullet.x
    bullet.obj.y = bullet.y
    if(bullet.obj.texture.key === '__MISSING'){
      bullet.obj.setTexture('bullet');
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
  }
  Client.socket.emit('movement', keys);
}


scene.draw_text = () => {
  switch(scene.state.game_state){
  case PLAYING:
    scene.score_text.setText('Score: Nonce');
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
    game_state: server_state.game_state,
  }


  // Update the client side players 
  update_players(new_state, server_state);

  // Update the client side bullets 
  update_bullets(new_state, server_state);

  // Update the state 
  scene.state = new_state;
}


const update_players = (new_state, server_state) => {
  // Get all players in the server state
  for(let player_id in server_state.players) {
    // Check if player is already created 
    const obj = ((player_id) => {;
      if(scene.state.players[player_id]){
        return scene.state.players[player_id].obj;
      }
      
      usernames_set = false;
      if(player_id == scene.player_id){
        return scene.add.sprite(-50, -50, 'player');
      } else {
        return scene.add.sprite(-50, -50, 'enemy');
      }
    })(player_id, server_state);

    new_state.players[player_id] = {
      x: server_state.players[player_id].x,
      y: server_state.players[player_id].y,
      obj: obj,
      username: server_state.players[player_id].username
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

