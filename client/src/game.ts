import 'phaser';

export default class Demo extends Phaser.Scene
{
    constructor () {
        super('demo');
    }

    preload () {
    }

    create () {
    
    }
}

const config = {
    type: Phaser.AUTO,
    backgroundColor: 'black',
    width: 800,
    height: 800,
    scene: Demo
};

const game = new Phaser.Game(config);
