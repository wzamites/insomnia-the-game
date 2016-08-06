import Rock from 'objects/Rock';
import Orb from 'objects/Orb';
import Fiend from 'objects/Fiend';
import FlyingFiend from 'objects/FlyingFiend';

class Helpers {

	constructor(game){
		this.game = game;
	}

	//generates Orb in linear interval
	linearOrbGenerator(main, lvlArray, orbNumber, orbStartPosition, orbPositionY, interval) {
		var orbSpawnPosition = orbStartPosition;
		var loopLimit = lvlArray.length+orbNumber;

		for (var i = lvlArray.length; i < loopLimit; i++) {
			lvlArray.push(new Orb(main.game, orbSpawnPosition, orbPositionY, 1, main.interactionCollision));
			orbSpawnPosition+=interval;
		};

		return lvlArray;
	}

	//generates Rock in linear interval
	linearRockGenerator(main, lvlArray, orbNumber, orbStartPosition, orbPositionY, interval) {
		var orbSpawnPosition = orbStartPosition;
		var loopLimit = lvlArray.length+orbNumber;

		for (var i = lvlArray.length; i < loopLimit; i++) {
			lvlArray.push(new Rock(main.game, orbSpawnPosition, orbPositionY, 1, main.interactionCollision));
			orbSpawnPosition+=interval;
		};

		return lvlArray;
	}

	//generates Fiend in linear interval
	linearFiendGenerator(main, lvlArray, orbNumber, orbStartPosition, orbPositionY, interval) {
		var orbSpawnPosition = orbStartPosition;
		var loopLimit = lvlArray.length+orbNumber;

		for (var i = lvlArray.length; i < loopLimit; i++) {
			lvlArray.push(new Fiend(main.game, orbSpawnPosition, orbPositionY, 1, main.interactionCollision));
			orbSpawnPosition+=interval;
		};

		return lvlArray;
	}

	//generates FlyingFiend in linear interval
	linearFlyingFiendGenerator(main, lvlArray, orbNumber, orbStartPosition, orbPositionY, interval) {
		var orbSpawnPosition = orbStartPosition;
		var loopLimit = lvlArray.length+orbNumber;

		for (var i = lvlArray.length; i < loopLimit; i++) {
			lvlArray.push(new FlyingFiend(main.game, orbSpawnPosition, orbPositionY, 1, main.interactionCollision));
			orbSpawnPosition+=interval;
		};

		return lvlArray;
	}
}

export default Helpers;