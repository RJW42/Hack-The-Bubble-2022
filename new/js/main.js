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

const PLAYING = 0; //Symbol('Playing');
const WAITING_FOR_PLAYERS = 1; //Symbol('Waiting');
const COUNT_DOWN = 2; //Symbol('CountDown');
const SPECTATING = 3;

var usernames_set = false;

scene.preload = () => {
  // Load all assets 
  scene.load.image('player', 'assets/sprites/player.png');
  scene.load.image('team', 'assets/sprites/team.png');
  scene.load.image('enemy', 'assets/sprites/enemy.png');
  scene.load.image('dead_body', 'assets/sprites/dead_body.png');
  scene.load.image('enemy_goal', 'assets/sprites/enemy_goal.png');
  scene.load.image('player_goal', 'assets/sprites/player_goal.png');
  scene.keys = {
    up: scene.input.keyboard.addKey('W'),
    down: scene.input.keyboard.addKey('S'),
    left: scene.input.keyboard.addKey('A'),
    right: scene.input.keyboard.addKey('D'),
    space: scene.input.keyboard.addKey('space'),
  }
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

  // State set render the state 
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
  if(!scene.loaded)
    return;

  // Convert the state to client side 
  let new_state = {
    id: 0,
    players: {},
    game_state: server_state.game_state,
  }

  for(var player_id in server_state.players) {
    // Check if player is already created 
    var obj;

    if(scene.state.players[player_id]){
      obj = scene.state.players[player_id].obj;
    } else {
      usernames_set = false;
      if(player_id == scene.player_id){
          obj = scene.add.sprite(-50, -50, 'player');
      } else {
          obj = scene.add.sprite(-50, -50, 'enemy');
      }
    }

    new_state.players[player_id] = {
      x: server_state.players[player_id].x,
      y: server_state.players[player_id].y,
      obj: obj,
      username: server_state.players[player_id].username
    }
  }

  // Check for deleted players 
  for(var player_id in scene.state.players){
    if(!new_state.players[player_id]){
      scene.state.players[player_id].obj.destroy(true);
      usernames_set = false;
    }
  }

  // Update the state 
  scene.state = new_state;
}

scene.state = {
    id: 0,
    players: {}
};

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

