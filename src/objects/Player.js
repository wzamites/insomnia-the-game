import Material from 'objects/Material';
import Helpers from 'includes/Helpers';

class Player {

    //init player
	constructor(game, x, y){
		this.game = game;
        this.oType = 'Player';
        this.sounds = new Object();

        //load sprite
        this.player = this.game.add.sprite(x, y, 'girl');

        //define animation frames
        this.player.animations.add('idle', Phaser.Animation.generateFrameNames('girl-idle', 1, 3), 11, true);
        this.player.animations.add('right', Phaser.Animation.generateFrameNames('girl-right', 1, 3), 11, true);
        this.player.animations.add('left', Phaser.Animation.generateFrameNames('girl-left', 1, 3), 11, true);
        this.player.animations.add('jump', Phaser.Animation.generateFrameNames('girl-jump', 1, 1), 11, true);
        this.player.animations.add('falling', Phaser.Animation.generateFrameNames('girl-falling', 1, 2), 11, true);

        //set default player states
        this.player.jumping = false;
        this.player.damageBounce = false;
        this.stunned = false;
        this.tween = null;
        this.drag = false;
        this.pondBoost = false;
        this.checkpointReached = false;

        //enable physics on player
        this.game.physics.p2.enable(this.player, this.game.debugMode);
        this.player.oType = this.oType;
        this.player.body.clearShapes();
        this.player.body.setCircle(90);
        this.player.body.fixedRotation = true;
        this.player.body.offset.y = 10;
        this.player.body.velocity.y = 0;
        this.player.body.angularDamping = 1;

        //set material
        this.material = new Material(this.game, 'player', this.player.body);
        this.material.properties.relaxation = 10000;
        this.material.properties.friction = 1000;
        this.material.properties.restitution = 0;
        this.material.properties.stiffness = 10000;

        //set listener for when player interacts with lvl objects
        this.player.body.onBeginContact.add(this.handleContact, this);

        //helpers object
        this.helpers = new Helpers();

        //sounds
        this.sounds.drop = this.game.add.audio('girl-drop', 0.1, false);
        this.sounds.move = this.game.add.audio('girl-move', 0.1, true);
        this.sounds.boost = this.game.add.audio('girl-boost', 0.6, false);
	}

	update(game, cursors, background) {
        //console.log(this.player.frame);
        // Modify movement while mid air
        if(this.pondBoost) {
            this.modifier = 0.4;

            this.game.time.events.add(Phaser.Timer.SECOND*4, this.endPondBoost, this);
        } else {
            if(!this.checkIfCanJump()) {
                this.modifier = 1.1;
            } else {
                this.modifier = 0.9;
                if(this.player.jumping) {
                    this.player.jumping = false;
                    this.sounds.drop.play();
                }
            }
        }

        //reset the players velocity (movement)
        //if stunned then movement is automatic
        if(this.stunned) {
            if(!this.checkpointReached) {
                this.speed = -1200;
                background.tilePosition.x += 15/this.modifier;
                this.game.progress -= 3;
            } else {
                this.resetStunned();
            }
        } else {
            this.player.body.velocity.x = 0;
            this.speed = 0;
        }

        //debug mode movement
        if(this.game.cursors.interact.q.isDown && this.game.debugMode) {
            this.modifier = 0.1;
            this.debug = true;
        } else {
             this.debug = false;
        }

        //movement
        if(this.player.damageBounce && !this.stunned) {
            this.damage();
            this.player.alive = false;
            this.player.exists = true;
            this.player.visible = false;

            this.stunned = true;
        } else if (cursors.left.isDown && !this.stunned) {
            //  Move to the left
            if(this.player.position.x>200) {
                this.player.body.moveLeft(400/this.modifier);
            } else {
                if(this.game.progress>this.game.checkpoint) {
                    this.speed = -400;
                    background.tilePosition.x += 4/this.modifier;
                    this.game.progress -= 1;
                }
            }

            if(this.checkIfCanJump()) {
                if(this.game.progress>0 || this.player.position.x>200) {
                    this.player.animations.play('left');
                } else {
                    this.player.animations.play('idle');
                }
            }
        } else if (cursors.right.isDown && !this.stunned) {
            //  Move to the right
            if(this.game.width/3>this.player.position.x+98) {
                this.player.body.moveRight(400/this.modifier);
            } else {
                this.speed = 400;
                background.tilePosition.x -= 4/this.modifier;
                this.game.progress += 1;
            }

            if(this.checkIfCanJump()) {
                this.player.animations.play('right');
            }
        } else {
            //  Stand still
            if(this.checkIfCanJump()) {
                this.player.animations.play('idle');
            }
        }

        //  Allow to jump if they are touching the ground.
        if (cursors.up.isDown && this.checkIfCanJump() && !this.stunned)
        {
            this.player.animations.play('jump');

            this.player.jumping = true;

            this.player.body.moveUp(980);
        }

        if(!this.checkIfCanJump() && this.player.body.velocity.y>250) {
            if(this.player.jumping) {
                this.player.body.offset.y = -50;
                this.player.animations.play('falling');
            }
        } else {
            if(this.player.jumping && this.player.animations.currentAnim.name == 'falling') {
                this.player.animations.stop();
                this.player.jumping = false;
            }
            this.player.body.offset.y = 10;
        }
	}

    //check if player is jumping
    checkIfCanJump() {
        var yAxis = p2.vec2.fromValues(0, 1);
        var result = false;

        for (var i = 0; i < this.game.physics.p2.world.narrowphase.contactEquations.length; i++) {
            var c = this.game.physics.p2.world.narrowphase.contactEquations[i];

            if (c.bodyA === this.player.body.data || c.bodyB === this.player.body.data) {
                var d = p2.vec2.dot(c.normalA, yAxis); // Normal dot Y-axis
                if (c.bodyA === this.player.body.data) {
                    d *= -1;
                }

                if (d > 0.5) {
                    //this.safeLocation = this.player.position.x-this.player.width/2;
                    this.pondBoost = false;
                    result = true;
                }
            }
        }

        return result;
    }

    //get current movement speed of player
    getSpeed() {
        if(this.speed) {
            return -this.speed/this.modifier;
        } else {
            return 0;
        }
    }

    //set collision group for sprite
    setCollisionGroup(group) {
        this.player.body.setCollisionGroup(group);
    }

    //set collision rules for sprite and callback function
    collides(groups, callback) {
        this.player.body.collides(groups, callback);
    }

    //function is called on sprite collision
    hitSprite(body1, body2) {
        //console.log("hit");
    }

    hitFiend(body1, body2) {
        //return true;
    }

    handleContact(body1, body2, shape1, shape2, equation) {
        //console.log(body2.sprite);
        //this.player.body.moveLeft(400);
    }

    resetStunned() {
        this.player.damageBounce = false;
        this.stunned = false;
        this.checkpointReached = false;
        this.player.revive();
    }

    //heal player
    heal() {
        if(this.game.health<4) {
            this.game.health++;
            this.player.alpha = this.game.health*0.25;
        }
        //console.log("Health", this.game.health);
    }

    //damage player
    damage() {
        this.helpers.api({progress: this.game.progress, status: 'damage'});
        this.game.health--;
        this.player.alpha = this.game.health*0.25;
        //console.log("Health", this.game.health);
    }

    endPondBoost() {
        this.pondBoost = false;
    }

    touchingDown() {
        if(this.player.position.y>1000) {
            return true;
        } else {
            return false;
        }
    }
}

export default Player;
