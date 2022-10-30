import Phaser from 'phaser'
import { io } from "socket.io-client";


export default class HelloWorldScene extends Phaser.Scene {
	socket;

	constructor() {
		super('hello-world');
		this.socket = io("https://localhost:42069");
	}

	preload() {
	}

	create() {
	}
}
