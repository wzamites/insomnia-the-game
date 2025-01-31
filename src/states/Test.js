import DayCycle from 'objects/DayCycle';
import Weather from 'objects/Weather';
import Player from 'objects/Player';
import Dummy from 'objects/Dummy';
import Helpers from 'includes/Helpers';
import MenuButton from 'objects/MenuButton';
import LevelData from 'includes/LevelData';

class Test extends Phaser.State {

    create() {
        //game progression variables
        this.game.health = 4;
        this.game.progress = 0;
        this.game.orbCount = 0;
        this.game.checkpoint = 0;
        this.game.debugMode = true;
        this.game.ready = true;
        this.game.lvlId = 4;
        this.game.end = false;
        this.game.day = false;
        this.game.soundsDecoded = false;
        this.game.sounds = new Object();
        this.helpers = new Helpers(this.game);
        this.lvlProgress = localStorage.getItem(this.game.uniqueKey);
        this.lvlScore = localStorage.getItem(this.game.uniqueKey+"L"+this.game.lvlId);

        //set up world and physics
        //left 1024 offset for objects swap
        this.game.world.setBounds(-1024, 0, this.game.width+1024, this.game.height);
        this.game.physics.startSystem(Phaser.Physics.P2JS);
        this.game.physics.p2.restitution = 0.0;
        this.game.physics.p2.setImpactEvents(true);
        this.game.physics.p2.gravity.y = 1800;
        this.game.physics.p2.setPostBroadphaseCallback(this.handleContact, this);

        //fullscreen if supported in browser and not in debug mode
        if(!this.game.debugMode) {
            this.game.scale.startFullScreen();
        }

        //set up camera and add offset
        this.game.cameraOffset = 1024;
        this.game.camera.width = 0;

        //collision groups
        this.playerCollision = this.game.physics.p2.createCollisionGroup();
        this.obstaclesCollision = this.game.physics.p2.createCollisionGroup();
        this.interactionCollision = this.game.physics.p2.createCollisionGroup();
        this.fiendCollision = this.game.physics.p2.createCollisionGroup();
        this.puzzleCollision = this.game.physics.p2.createCollisionGroup();
        this.worldCollision = this.game.physics.p2.createCollisionGroup();

        //collision with world bounds
        this.game.physics.p2.updateBoundsCollisionGroup();

        //fetch lvl data
        this.lvlData = new LevelData(this.game);
        this.game.lvlObjects = this.lvlData.fetch({
            playerCollision: this.playerCollision,
            obstaclesCollision: this.obstaclesCollision,
            interactionCollision: this.interactionCollision,
            fiendCollision: this.fiendCollision,
            worldCollision: this.worldCollision,
            puzzleCollision: this.puzzleCollision
        });

        //create game world bitmap and color it
        let bgBitMap = this.game.add.bitmapData(this.game.width, this.game.height);
        bgBitMap.ctx.rect(0, 0, this.game.width, this.game.height);
        bgBitMap.ctx.fillStyle = this.game.lvlFillColor;
        bgBitMap.ctx.fill();
        this.backgroundSprite = this.game.add.sprite(0, 0, bgBitMap);

        //create sun and moon
        this.sunSprite = this.game.add.sprite(this.game.width/2-276/2, 750, 'sun');
        this.moonSprite = this.game.add.sprite(this.game.width - (this.game.width / 4), 150*this.game.lvlId, 'moon');
        this.moonSprite.visible = false;
        this.sunSprite.visible = false;

        //create game backgrounds
        this.backgroundMid = this.game.add.tileSprite(0,
            this.game.height - this.game.cache.getImage('background-mid-lvl'+this.game.lvlId).height,
            this.game.width,
            this.game.cache.getImage('background-mid-lvl'+this.game.lvlId).height,
            'background-mid-lvl'+this.game.lvlId
        );

        //create player
        //this.player = new Dummy(this.game, 150, this.game.height-95);
        this.player = new Player(this.game, 150, this.game.height-95);
        this.player.setCollisionGroup(this.playerCollision);

        //set collision rules for player
        this.player.collides([this.obstaclesCollision, this.worldCollision, this.interactionCollision, this.fiendCollision, this.puzzleCollision], this.player.hitSprite);

        //create ground fog
        this.backgroundBottom = this.game.add.tileSprite(0,
            this.game.height - this.game.cache.getImage('background-bottom').height,
            this.game.width,
            this.game.cache.getImage('background-bottom').height,
            'background-bottom'
        );

        //render lvl objects
        //set collision rules for game objects
        for (var i = 0; i < this.game.lvlObjects.length; i++) {
            this.game.lvlObjects[i].render();
            this.game.lvlObjects[i].collides([this.playerCollision], this.game.lvlObjects[i].hitPlayer, this.onHit, this);
            this.game.lvlObjects[i].collides([this.obstaclesCollision, this.worldCollision, this.interactionCollision], this.game.lvlObjects[i].hitSprite);
            if(this.game.lvlObjects[i].oType!='PuzzleObstacle') {
                this.game.lvlObjects[i].collides([this.puzzleCollision], this.game.lvlObjects[i].hitSprite);
            }
            this.game.lvlObjects[i].setContact(this.player.material);
        }

        //add endgame listener on last object in lvl array
        this.game.lvlObjects[this.game.lvlObjects.length-1].sprite.oType = 'EndGame';

        //init day night cycle
        this.dayCycle = new DayCycle(this.game, 0);
        if(!this.game.day) {
            this.dayCycle.initMoon(this.moonSprite);
        } else {
            this.dayCycle.initSun(this.sunSprite);
        }

        //apply day night shading
        this.dayCycle.initShading(backgroundSprites);
        let backgroundSprites = [
            {sprite: this.backgroundSprite, from: 0x1f2a27, to: 0xB2DDC8},
            {sprite: this.backgroundMid, from: 0x283632, to: 0x8BBCAC},
            {sprite: this.backgroundBottom, from: 0x283632, to: 0x8BBCAC}
        ];

        //weather effects
        this.weather = new Weather(this.game)
        this.weather.addRain();
        if(this.game.fog) {
            this.weather.addFog();
        }

        //background sounds
        this.game.sounds.backgroundRain = this.game.add.audio('background-rain', 1, true);
        this.game.sounds.backgroundWind = this.game.add.audio('background-wind', 0.2, true);
        this.game.sound.setDecodedCallback([this.game.sounds.backgroundRain, this.game.sounds.backgroundRain], this.playSounds, this);

        //orb count display
        this.orbCountDisplay = new MenuButton(
            this.game, this.game.width-200, 60, "Orbs collected: "+this.game.orbCount, null,
            {
                font: 'Arial',
                fontWeight: 'normal',
                fontSize: 28,
                fill: '#FFFFFF',
                align: 'right'
            }
        );

        //health display
        this.healthDisplay = new MenuButton(
            this.game, 200, 60, "Lives: "+this.game.health, null,
            {
                font: 'Arial',
                fontWeight: 'normal',
                fontSize: 28,
                fill: '#FFFFFF',
                align: 'left'
            }
        );

        //lvl start message
        //background
        /*let mesageBitMap = this.game.add.bitmapData(this.game.width, this.game.height);
        mesageBitMap.ctx.rect(0, 0, this.game.width, this.game.height);
        mesageBitMap.ctx.fillStyle = '#000000';
        mesageBitMap.ctx.fill();
        this.messageBackground = this.game.add.sprite(0, 0, mesageBitMap);

        //text
        this.text = this.game.add.text(
            this.game.width/2, this.game.height/2,
            this.game.lvlIntroText
        );
        this.text.anchor.setTo(0.5);
        this.text.font = 'IM Fell DW Pica';
        this.text.fontWeight = 'normal';
        this.text.fontSize = 60;
        this.text.fill = '#FFFFFF'
        this.text.align = 'center';

        //time to hide message and start game
        this.game.time.events.add(Phaser.Timer.SECOND*4, this.clearStartMessage, this);*/

        //enable movement controls
        this.game.cursors = this.input.keyboard.createCursorKeys();

        //interactions controls
        this.game.cursors.interact = {
                a: this.input.keyboard.addKey(Phaser.Keyboard.A),
                q: this.input.keyboard.addKey(Phaser.Keyboard.Q),
                esc: this.input.keyboard.addKey(Phaser.Keyboard.ESC)
        };

        this.game.camera.follow(this.player.sprite);
    }

    update() {
        //back to mainmenu with ESC key
        if(this.game.cursors.interact.esc.isDown) {
            this.game.ready = false;
            this.showLoadingMessage("... Loading, please wait ...", this.mainMenu);

            return;
        }

        //update orb count display
        this.orbCountDisplay.text.setText("Orbs collected: "+this.game.orbCount);

        //update health display
        this.healthDisplay.text.setText("Lives: "+this.game.health);

        //paralax scroll ground fog
        this.backgroundBottom.tilePosition.x -= 3;

        //update every game object
        for (var i = 0; i < this.game.lvlObjects.length; i++) {
            this.game.lvlObjects[i].update(this.player);
        }

        while(!this.game.ready) {
            return;
        }

        //check if game is finished
        if(this.game.end) {
            this.game.ready = false;
            this.helpers.api({progress: this.game.progress, status: 'win'});

            if(this.game.lvlId==this.game.lastLvlId) {
                this.showLoadingMessage("... Wake Up!! ...", this.gameEnd);
            } else {
                this.showLoadingMessage("... Loading, please wait ...", this.gameEnd);
            }

            return;
        }

        //check if player is dead
        if(!this.game.health) {
            this.game.ready = false;
            this.helpers.api({progress: this.game.progress, status: 'dead'});
            this.showLoadingMessage("... Loading, please wait ...", this.gameOver);

            return;
        }


        //update player position
        this.player.update(this.game, this.game.cursors, this.backgroundMid);
    }

    handleContact(body1, body2) {
        //if any of two bodies does not have oType skip that contact
        if(body1.sprite == null || body2.sprite == null) {
            return false;
        }

        //check if player is one of interacting bodies
        if(body1.sprite.oType == 'Player') {
            var sprite = body2.sprite;
            var player = body1.sprite;
        } else if(body2.sprite.oType == 'Player') {
            var sprite = body1.sprite;
            var player = body2.sprite;
        } else {
            if(body1.sprite.oType == 'Trap') {
                var sprite = body2.sprite;
                var sprite2 = body1.sprite;
            } else {
                var sprite = body1.sprite;
                var sprite2 = body2.sprite;
            }
            var player = null;
        }


        //if player is stunned he does not collide with any object
        //only checkpoint interactions will be handled
        if(sprite.oType!='Checkpoint' && player!=null) {
            if(this.player.stunned || this.player.debug) {
                return false;
            }
        }

        switch(sprite.oType) {
            case 'EndGame':
                if(player!=null) {
                    this.player.player.animations.play('idle');
                    this.game.end = true;
                }

                return true;
                break;
            case 'Orb':
                if(player!=null) {
                    sprite.collect = true;
                }

                return false;
                break;
            case 'Fiend':
                if(player!=null) {
                    if(!player.damageBounce) {
                        player.damageBounce = true;
                        sprite.playerHit = true;
                    }
                } else if(sprite.oType == 'Trap' || sprite2.oType == 'Trap') {
                    sprite.trapHit = true;
                }

                return false;
                break;
            case 'FlyingFiend':
                if(player!=null) {
                    if(!player.damageBounce) {
                        sprite.playerHit = true;
                        player.damageBounce = true;
                    }
                }

                return false;
                break;
            case 'Trap':
                if(this.game.cursors.interact.a.isDown) {
                    sprite.isFollowingPlayer = true;
                } else {
                    sprite.isFollowingPlayer = false;
                }

                return false;
                break;
            case 'PuzzleObstacle':
                if(this.game.cursors.interact.a.isDown) {
                    if(!this.player.drag) {
                        sprite.isFollowingPlayer = true;
                        this.player.drag = sprite;
                    }
                } else {
                    this.player.drag = false;
                    sprite.isFollowingPlayer = false;
                }

                if(this.player.touchingDown()) {
                    return false;
                } else {
                    return true;
                }

                break;
            case 'Spikes':
                if(player!=null) {
                    if(!player.damageBounce) {
                        player.damageBounce = true;
                    }
                }

                return false;
                break;
            case 'Pond':
                if(player!=null && player.position.y>this.game.height-300) {
                    player.animations.play('jump');
                    player.jumping = true;
                    player.body.moveUp(1380);
                    this.player.pondBoost = true;
                    this.player.sounds.boost.play();
                }
                return false;
            case 'Particle':

                return false;
                break;
            case 'Checkpoint':
                //set checkpoint to current game progress
                if(player!=null) {
                    if(this.game.checkpoint<this.game.progress) {
                        sprite.showHint = true;
                        this.clearObjectArray();
                    }
                    this.game.checkpoint = this.game.progress;
                    if(this.player.stunned) {
                        sprite.showHint = true;
                        this.player.checkpointReached = true;
                    }
                }

                return false;
                break;
            default:
                return true;
        }
    }

    clearStartMessage() {
        this.game.ready = true;

        this.game.add.tween(this.text)
        .to( { alpha: 0 }, 500, Phaser.Easing.Linear.None, true, 0, 0, false);
        this.startMessageTween = this.game.add.tween(this.messageBackground)
        .to( { alpha: 0 }, 2000, Phaser.Easing.Linear.None, true, 0, 0, false);

        this.startMessageTween.onComplete.add(this.startGame, this);
    }

    showLoadingMessage(message, action) {
        let endMessageBitMap = this.game.add.bitmapData(this.game.width, this.game.height);
        endMessageBitMap.ctx.rect(0, 0, this.game.width, this.game.height);
        endMessageBitMap.ctx.fillStyle = '#000000';
        endMessageBitMap.ctx.fill();
        this.messageBackground = this.game.add.sprite(0, 0, endMessageBitMap);
        this.messageBackground.alpha = 0;

        //text
        this.text = this.game.add.text(
            this.game.width/2, this.game.height/2,
            message
        );
        this.text.anchor.setTo(0.5);
        this.text.font = 'IM Fell DW Pica';
        this.text.fontWeight = 'normal';
        this.text.fontSize = 60;
        this.text.fill = '#FFFFFF'
        this.text.align = 'center';
        this.text.alpha = 0;

        this.game.add.tween(this.text)
        .to( { alpha: 1 }, 500, Phaser.Easing.Linear.None, true, 0, 0, false);
        this.endMessageTween = this.game.add.tween(this.messageBackground)
        .to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None, true, 0, 0, false);

        this.endMessageTween.onComplete.add(action, this);
    }

    startGame() {
        this.messageBackground.kill();
        this.text.kill();
    }

    gameOver() {
        this.game.state.clearCurrentState();

        //save score for current lvl
        if(!this.lvlScore || this.lvlScore<this.game.progress) {
            localStorage.setItem(this.game.uniqueKey+"L"+this.game.lvlId, this.game.progress);
        }

        this.game.state.start('GameOver', true, false);
    }

    mainMenu() {
        this.game.state.clearCurrentState();

        //save score for current lvl
        if(!this.lvlScore || this.lvlScore<this.game.progress) {
            localStorage.setItem(this.game.uniqueKey+"L"+this.game.lvlId, this.game.progress);
        }

        this.game.state.start('Menu', true, false);
    }

    gameEnd() {
        this.game.state.clearCurrentState();

        //save score for current lvl
        if(!this.lvlScore || this.lvlScore<this.game.progress) {
            localStorage.setItem(this.game.uniqueKey+"L"+this.game.lvlId, this.game.progress);
        }

        //update lvl id
        this.game.lvlId++;

        //save player progress
        if(!this.lvlProgress || this.lvlProgress<this.game.lvlId) {
            localStorage.setItem(this.game.uniqueKey, this.game.lvlId);
        }

        if(this.game.lvlId>this.game.lastLvlId) {
            this.game.state.start('Credits', true, false);
        } else {
            this.game.state.start("Test");
        }
    }

    playSounds() {
        this.game.sounds.backgroundRain.play();
        this.game.sounds.backgroundWind.play();
        this.game.soundsDecoded = true;
    }

    clearObjectArray() {
        for (var i = 0; i < this.game.lvlObjects.length; i++) {
            if(this.game.lvlObjects[i].isOut()) {
                this.game.lvlObjects[i].destroy();
                delete this;
                this.game.lvlObjects.splice(i, 1);
            }
        }
    }
}

export default Test;
