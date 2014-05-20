// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

function BoundingBoxHandler() 
{
    this.boxes = false;
}

var BBH = new BoundingBoxHandler();

window.requestAnim = (function () 
{
    return window.requestAnimation || window.webkitRequestAnimation ||
            window.mozRequestAnimation || window.oRequestAnimation ||
            window.msRequestAnimation ||
            function (/* function */ callback, /* DOMElement */ element) 
            {
                window.setTimeout(callback, 1000 / 60);
            };
})();

function AssetManager() 
{
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = [];
    this.downloadQueue = [];
}

AssetManager.prototype.queueDownload = function (path) 
{
    console.log(path.toString());
    this.downloadQueue.push(path);
};

AssetManager.prototype.isDone = function () 
{
    return (this.downloadQueue.length == this.successCount + this.errorCount);
};

AssetManager.prototype.downloadAll = function (callback) 
{
    if (this.downloadQueue.length === 0) window.setTimeout(callback, 100);
    
    for (var i = 0; i < this.downloadQueue.length; i++) 
    {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        
        img.addEventListener("load", function () 
        {
            console.log("dun: " + this.src.toString());
            that.successCount += 1;
            if (that.isDone()) callback();
        });
        
        img.addEventListener("error", function () 
        {
            that.errorCount += 1;
            if (that.isDone()) callback();
        });
        
        img.src = path;
        this.cache[path] = img;
    }
};

AssetManager.prototype.getAsset = function(path)
{
    return this.cache[path];
};

function Animation(spriteSheet, startX, startY, frameWidth, frameHeight, 
					frameDuration, frames, loop, reverse) 
{
    this.spriteSheet = spriteSheet;
    this.startX = startX;
    this.startY = startY;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameDuration = frameDuration;
    this.frames = frames;
    this.loop = loop;
    this.reverse = reverse;
    
    this.totalTime = frameDuration * frames;
    this.elapsedTime = 0;  
}

Animation.prototype.draw = function (tick, ctxEntities, x, y, scaleBy) 
{
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    
    if (this.loop) 
    {
        if (this.isDone()) this.elapsedTime = 0;
    } 
    else if (this.isDone()) return;
    
    var index = this.reverse ? this.frames - this.currentFrame() - 1 : this.currentFrame();
    var vindex = 0;
    
    if ((index + 1) * this.frameWidth + this.startX > this.spriteSheet.width) 
    {
        index -= Math.floor((this.spriteSheet.width - this.startX) / this.frameWidth);
        vindex++;
    }
    
    while ((index + 1) * this.frameWidth > this.spriteSheet.width) 
    {
        index -= Math.floor(this.spriteSheet.width / this.frameWidth);
        vindex++;
    }

    var locX = x;
    var locY = y;
    var offset = vindex === 0 ? this.startX : 0;
    
    ctxEntities.drawImage(this.spriteSheet, index * this.frameWidth + offset, 
    				vindex*this.frameHeight + this.startY,  // source from sheet
    				this.frameWidth, this.frameHeight, locX, locY, this.frameWidth * scaleBy,
    				this.frameHeight * scaleBy);
};

Animation.prototype.currentFrame = function () 
{
    return Math.floor(this.elapsedTime / this.frameDuration);
};

Animation.prototype.isDone = function () 
{
    return (this.elapsedTime >= this.totalTime);
};

function Timer() 
{
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function () 
{
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
    this.wallLastTimestamp = wallCurrent;

    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
};

function GameEngine() 
{
    this.entities = [];
    this.ctxEntities = null;
    this.map = new Map(1, 30, 20);
    this.map.init();
    this.hasDrawnLevel = false;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
}

GameEngine.prototype.init = function (ctxEntities, ctxMap) 
{
	this.ctxMap = ctxMap;
    this.ctxEntities = ctxEntities;
    this.surfaceWidth = this.ctxEntities.canvas.width;
    this.surfaceHeight = this.ctxEntities.canvas.height;
    this.startInput();
    this.timer = new Timer();
    console.log('game initialized');
};

GameEngine.prototype.start = function () 
{
    console.log("starting game");
    var that = this;
    
    (function gameLoop() 
    {
        that.loop();
        requestAnim(gameLoop, that.ctxEntities.canvas);
    })();
};

GameEngine.prototype.startInput = function () 
{
    console.log('Starting input');

    var getXandY = function (e) 
    {
        var x = e.clientX - that.ctxEntities.canvas.getBoundingClientRect().left;
        var y = e.clientY - that.ctxEntities.canvas.getBoundingClientRect().top;

        if (x < 1024) 
        {
            x = Math.floor(x / 32);
            y = Math.floor(y / 32);
        }

        return { x: x, y: y };
    };

    var that = this;

    this.ctxEntities.canvas.addEventListener("keydown", function (e) 
    {
    	// up, down, left, right movement
    	if (String.fromCharCode(e.which) === 'W') that.up = true;
    	if (String.fromCharCode(e.which) === 'S') that.down = true;
    	if (String.fromCharCode(e.which) === 'A') that.left = true;
    	if (String.fromCharCode(e.which) === 'D') that.right = true;
    	
    	// up, down, left, right attacks
    	if (String.fromCharCode(e.which) === 'I') that.upAttack = true;
    	if (String.fromCharCode(e.which) === 'K') that.downAttack = true;
    	if (String.fromCharCode(e.which) === 'J') that.leftAttack = true;
    	if (String.fromCharCode(e.which) === 'L') that.rightAttack = true;
        
        else that.standing = true;
    	
        e.preventDefault();
    }, false);

    console.log('Input started');
};

GameEngine.prototype.addEntity = function (entity) 
{
    console.log('added entity');
    this.entities.push(entity);
};

GameEngine.prototype.draw = function (drawCallback) 
{
    if (!this.hasDrawnLevel) 
    {
    	loadCaves(this.ctxMap, this.map.caves[0]);
    	this.hasDrawnLevel = true;
    }
    
    this.ctxEntities.clearRect(0, 0, this.ctxEntities.canvas.width, this.ctxEntities.canvas.height);
    this.ctxEntities.save();
    
    for (var i = 0; i < this.entities.length; i++) 
    {
    	this.entities[i].draw(this.ctxEntities, this.map.caves[0]);
    }
    
    if (drawCallback) drawCallback(this);
    
    this.ctxEntities.restore();
};

GameEngine.prototype.update = function () 
{
    var entitiesCount = this.entities.length;

    for (var i = 0; i < entitiesCount; i++) 
    {
        var entity = this.entities[i];

        if (!entity.removeFromWorld) entity.update();
    }

    for (var i = this.entities.length - 1; i >= 0; --i) 
    {
        if (this.entities[i].removeFromWorld) this.entities.splice(i, 1);
    }
};

GameEngine.prototype.loop = function () 
{
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.upAttack = false;
    this.downAttack = false;
    this.leftAttack = false;
    this.rightAttack = false;
    this.standing = false;
    this.squirt = false;
};

function Entity(game, x, y) 
{
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function () {
};

Entity.prototype.draw = function (ctxEntities) 
{
    if (this.game.showOutlines && this.radius) 
    {
        ctxEntities.beginPath();
        ctxEntities.strokeStyle = "green";
        ctxEntities.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctxEntities.stroke();
        ctxEntities.closePath();
    }
};

Entity.prototype.rotateAndCache = function (image, angle) 
{
    var offscreenCanvas = document.createElement('canvas');
    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    var offscreenctxEntities = offscreenCanvas.getContext('2d');
    offscreenctxEntities.save();
    offscreenctxEntities.translate(size / 2, size / 2);
    offscreenctxEntities.rotate(angle);
    offscreenctxEntities.translate(0, 0);
    offscreenctxEntities.drawImage(image, -(image.width / 2), -(image.height / 2));
    offscreenctxEntities.restore();
    return offscreenCanvas;
};

//////////// GAMEBOARD CODE BELOW ///////////////////////

function BoundingBox(x, y, width, height) 
{
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.left = x;
    this.top = y;
    this.right = this.left + width;
    this.bottom = this.top + height;
}

BoundingBox.prototype.collide = function (oth) 
{
    if (this.right > oth.left && this.left < oth.right && this.top < oth.bottom && this.bottom > oth.top) return true;
    return false;
};

function MonsterSquirt(game)
{
	// walk animation
	this.leftWalkAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 0, 64, 64, 64, 0.15, 4, false, false);
	this.rightWalkAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 0, 0, 64, 64, 0.15, 4, false, false);
	// attack animation
	this.upAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 64 * 6, 0, 64, 64, 0.08, 2, false, true);
	this.downAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 64 * 6, 64, 64, 64, 0.08, 2, false, false);
	this.leftAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 64 * 4, 64, 64, 64, 0.08, 2, false, false);
	this.rightAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 64 * 4, 0, 64, 64, 0.08, 2, false, false);
	this.leftStandingAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 0, 64, 64, 64, 0.1, 1, true, false);
	this.rightStandingAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 0, 0, 64, 64, 0.1, 1, true, false);
	
	this.dieAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 0, 64 * 2, 64, 64, 0.05, 4, false, false);
    
	this.upWalk = false;
    this.downWalk = false;
    this.leftWalk = false;
    this.rightWalk = false;
    this.standingStill = false;
    this.upAttacking = false;
    this.downAttacking = false;
    this.leftAttacking = false;
    this.rightAttacking = false;
    this.squirting = false;
    
    this.facingDirection = 0; // left = 0, right = 1
    
    this.xMoveAmount = 0;
    this.yMoveAmount = 0;
    
    this.boxes = BBH.boxes;
    this.type = "enemy";
    this.health = 5;
    this.deadChange = false;
    
    this.shootDelay = 0;
    this.maxDelay = 10;
    
    this.boundingbox = new BoundingBox(this.x + 25, this.y, this.rightStandingAnimation.frameWidth - 40, this.rightStandingAnimation.frameHeight - 20);

    var spawnX = Math.floor(Math.random() * (game.map.caves[0].matrix[0][0].length + 1));
    var spawnY = Math.floor(Math.random() * (game.map.caves[0].matrix[0].length + 1));
    
    while (game.map.caves[0].matrix[spawnX][spawnY] != " ") 
    {
    	spawnX = Math.floor(Math.random() * (game.map.caves[0].matrix[0].length + 1));
    	//console.log(spawnX + "meep");
        spawnY = Math.floor(Math.random() * (game.map.caves[0].matrix.length + 1));
        //console.log(spawnY);
    }

    Entity.call(this, game, (spawnX * 32) - 19, (spawnY * 32) - 34);
}

MonsterSquirt.prototype = new Entity();
MonsterSquirt.prototype.constructor = MonsterSquirt;

MonsterSquirt.prototype.update = function () 
{	
	
	if(this.game.up) this.upWalk = true;
	if(this.game.down) this.downWalk = true;
	if(this.game.left) this.leftWalk = true;
	if(this.game.right) this.rightWalk = true;
	if(this.game.standing) this.standingStill = true;
	if(this.game.upAttack) this.upAttacking = true;
	if(this.game.downAttack) this.downAttacking = true;
	if(this.game.leftAttack) this.leftAttacking = true;
	if(this.game.rightAttack) this.rightAttacking = true;
	if(this.game.squirt) this.squirting = true;
	
    
    Entity.prototype.update.call(this);
};

MonsterSquirt.prototype.draw = function (ctxEntities, array) 
{
	if (this.shootDelay > 0)
	{
		this.shootDelay -= 1;
	}
	
	if (this.health <= 0) {
		if (!this.deadChange) {
			this.deadChange = true;
			this.yMoveAmount += 15;
		}
		
			this.dieAnimation.draw(this.game.clockTick, ctxEntities, 
					this.x + this.xMoveAmount, this.y + this.yMoveAmount);
		
		this.check();
		return;
	}
	
	var bb_x = this.x + 28 + this.xMoveAmount;
	var bb_y = this.y + 34 + this.yMoveAmount;
	var bb_w = 19;
	var bb_h = 29;
    
    if(this.leftWalk)
    {
    	this.facingDirection = 0;
    	
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x - 10, bb_y, bb_w, bb_h);
        
        var check = Math.floor((bb_x - 1 - 10) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
       
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.xMoveAmount -= 1;
        
    	this.leftWalkAnimation.draw(this.game.clockTick, ctxEntities, 
    								this.x + this.xMoveAmount, this.y + this.yMoveAmount);
    	
    	if (this.leftWalkAnimation.isDone()) 
    	{
    		this.leftWalkAnimation.elapsedTime = 0;
    		this.leftWalk = false;
    		this.standingStill = true;
    	}  
    }
    
    else if(this.rightWalk)
    {
    	this.facingDirection = 1;
    	
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
        
        var check = Math.floor((bb_x + bb_w + 1 /*+ 10*/) / 32); //that +10 will prevent wall phasing
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
               
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.xMoveAmount += 1;
        
        this.rightWalkAnimation.draw(this.game.clockTick, ctxEntities, 
        							 this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if (this.rightWalkAnimation.isDone()) 
        {
            this.rightWalkAnimation.elapsedTime = 0;
            this.rightWalk = false;
            this.standingStill = true;
        }
    }
    
    else if(this.upWalk)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }

        var thex = bb_x;
        if (this.facingDirection === 0) thex -= 10;
        
        this.boundingbox = new BoundingBox(thex, bb_y, bb_w, bb_h);
        
        var check = Math.floor((bb_y - 1) / 32);
        var x_left;
        var x_right;
        
        if(this.facingDirection === 0) 
        {
        	x_left = Math.floor((bb_x - 10) / 32);
        	x_right = Math.floor((bb_x - 10 + bb_w) / 32);
        }
        else
        {
        	x_left = Math.floor(bb_x / 32);
        	x_right = Math.floor((bb_x + bb_w) / 32);
        }
        
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.yMoveAmount -= 1;
        
        if(this.facingDirection === 0) this.leftWalkAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        else this.rightWalkAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if(this.facingDirection === 0)
        {
        	if(this.leftWalkAnimation.isDone())
        	{
        		this.leftWalkAnimation.elapsedTime = 0;
                this.upWalk = false;
                this.standingStill = true;
        	}
        }
        else
        {
        	if(this.rightWalkAnimation.isDone())
        	{
        		this.rightWalkAnimation.elapsedTime = 0;
                this.upWalk = false;
                this.standingStill = true;
        	}
        }
    }
 
    else if(this.downWalk)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        var thex = bb_x;
        if (this.facingDirection === 0) thex -= 10;
        
        this.boundingbox = new BoundingBox(thex, bb_y, bb_w, bb_h);
        
        var check = Math.floor(((bb_y + bb_h) + 1) / 32);
        var x_left;
        var x_right;
        
        if(this.facingDirection === 0) 
        {
        	x_left = Math.floor((bb_x - 10) / 32);
        	x_right = Math.floor(((bb_x - 10) + bb_w) / 32);
        }
        else
        {
        	x_left = Math.floor(bb_x / 32);
        	x_right = Math.floor((bb_x + bb_w) / 32);
        }
        
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.yMoveAmount += 1;
        
        
        if(this.facingDirection === 0) this.leftWalkAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        else this.rightWalkAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if(this.facingDirection === 0)
        {
        	if(this.leftWalkAnimation.isDone())
        	{
        		this.leftWalkAnimation.elapsedTime = 0;
                this.downWalk = false;
                this.standingStill = true;
        	}
        }
        else
        {
        	if(this.rightWalkAnimation.isDone())
        	{
        		this.rightWalkAnimation.elapsedTime = 0;
                this.downWalk = false;
                this.standingStill = true;
        	}
        }
    }
    
    else if(this.upAttacking)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x - 10, bb_y, bb_w, bb_h);
        this.upAttackAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);

        var spit = new Spit(this.game, this.x + this.xMoveAmount, this.y + this.yMoveAmount, 0);
        
        if (this.shootDelay === 0) {
        	this.game.addEntity(spit);
        	this.shootDelay = this.maxDelay;
        }

        if (this.upAttackAnimation.isDone()) 
        {
            this.upAttackAnimation.elapsedTime = 0;
            this.upAttacking = false;
            this.facingDirection = 0;
            this.standingStill = true;
        }
    }
    
    else if(this.downAttacking)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x - 10, bb_y, bb_w, bb_h);
        this.downAttackAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);

        var spit = new Spit(this.game, this.x + this.xMoveAmount, this.y + this.yMoveAmount, 1);
        
        if (this.shootDelay === 0) {
        	this.game.addEntity(spit);
        	this.shootDelay = this.maxDelay;
        }
        
        if (this.downAttackAnimation.isDone()) 
        {
            this.downAttackAnimation.elapsedTime = 0;
            this.downAttacking = false;
            this.facingDirection = 0;
            this.standingStill = true;
        }
    }
    
    else if(this.leftAttacking)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x - 10, bb_y, bb_w, bb_h);
        this.leftAttackAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);

        var spit = new Spit(this.game, this.x + this.xMoveAmount, this.y + this.yMoveAmount, 2);
        
        if (this.shootDelay === 0) {
        	this.game.addEntity(spit);
        	this.shootDelay = this.maxDelay;
        }
        
        if (this.leftAttackAnimation.isDone()) 
        {
            this.leftAttackAnimation.elapsedTime = 0;
            this.leftAttacking = false;
            this.facingDirection = 0;
            this.standingStill = true;
        }
    }
    
    else if(this.rightAttacking)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
        this.rightAttackAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);

        var spit = new Spit(this.game, this.x + this.xMoveAmount, this.y + this.yMoveAmount, 3);
        
        if (this.shootDelay === 0) {
        	this.game.addEntity(spit);
        	this.shootDelay = this.maxDelay;
        }
        
        if (this.rightAttackAnimation.isDone()) 
        {
            this.rightAttackAnimation.elapsedTime = 0;
            this.rightAttacking = false;
            this.facingDirection = 1;
            this.standingStill = true;
        }
    }
    
    else
    {
    	if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
    	
    	if(this.facingDirection === 0) 
    	{
    		this.leftStandingAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
    		this.boundingbox = new BoundingBox(bb_x - 10, bb_y, bb_w, bb_h);
    	} 
    	else 
    	{
    		this.rightStandingAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
    		this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	}
    	
    	this.standingStill = true;     
    }   
};

MonsterSquirt.prototype.check = function()
{
	if (this.dieAnimation.isDone())
	{
		this.dieAnimation.elapsedTime = 0;
		this.removeFromWorld = true;
	}
};

function MonsterNeck(game)
{
	// walk animation
	this.leftWalkAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterNeckWalkLeft2.png"), 0, 0, 163, 156, 0.1, 4, false, false);
	this.rightWalkAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterNeckWalkRight2.png"), 0, 0, 163, 156, 0.1, 4, false, false);
	// attack animation
	this.upAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterNeckAttack2.png"), 0, 0, 163, 156, 0.2, 1, false, false);
	this.downAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterNeckAttack2.png"), 163, 0, 163, 156, 0.2, 1, false, false);
	this.leftAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterNeckAttack2.png"), 163 * 2, 0, 163, 156, 0.2, 1, false, false);
	this.rightAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterNeckAttack2.png"), 163 * 3, 0, 163, 156, 0.2, 1, false, false);
	this.leftStandingAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterNeckWalkLeft2.png"), 0, 0, 163, 156, 0.1, 1, true, false);
	this.rightStandingAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterNeckWalkRight2.png"), 0, 0, 163, 156, 0.1, 1, true, false);
	this.dieAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 0, 64 * 2, 64, 64, 0.05, 4, false, false);
    
	
	this.upWalk = false;
    this.downWalk = false;
    this.leftWalk = false;
    this.rightWalk = false;
    this.standingStill = false;
    this.upAttacking = false;
    this.downAttacking = false;
    this.leftAttacking = false;
    this.rightAttacking = false;
    
    this.facingDirection = 0; // left = 0, right = 1
    
    this.xMoveAmount = 0;
    this.yMoveAmount = 0;
    
    this.boxes = BBH.boxes;
    this.type = "enemy";
    this.health = 5;
    this.deadChange = false;
    
    this.boundingbox = new BoundingBox(this.x + 25, this.y, this.rightStandingAnimation.frameWidth - 40, this.rightStandingAnimation.frameHeight - 20);
    
    var spawnX = Math.floor(Math.random() * (game.map.caves[0].matrix[0][0].length + 1));
    var spawnY = Math.floor(Math.random() * (game.map.caves[0].matrix[0].length + 1));
    
    while (game.map.caves[0].matrix[spawnX][spawnY] != " ") 
    {
    	spawnX = Math.floor(Math.random() * (game.map.caves[0].matrix[0].length + 1));
    	//console.log(spawnX + "meep");
        spawnY = Math.floor(Math.random() * (game.map.caves[0].matrix.length + 1));
        //console.log(spawnY);
    }

    Entity.call(this, game, (spawnX * 32) - 64, (spawnY * 32) - 64);
}

MonsterNeck.prototype = new Entity();
MonsterNeck.prototype.constructor = MonsterNeck;

MonsterNeck.prototype.update = function () 
{	
	if(this.game.up) this.upWalk = true;
	if(this.game.down) this.downWalk = true;
	if(this.game.left) this.leftWalk = true;
	if(this.game.right) this.rightWalk = true;
	if(this.game.standing) this.standingStill = true;
	if(this.game.upAttack) this.upAttacking = true;
	if(this.game.downAttack) this.downAttacking = true;
	if(this.game.leftAttack) this.leftAttacking = true;
	if(this.game.rightAttack) this.rightAttacking = true;
	
    Entity.prototype.update.call(this);
};

MonsterNeck.prototype.draw = function (ctxEntities, array) 
{
	if (this.health <= 0) {
		if (!this.deadChange) {
			this.deadChange = true;
			this.xMoveAmount += 50;
			this.yMoveAmount += 45;
		}
			this.dieAnimation.draw(this.game.clockTick, ctxEntities, 
					this.x + this.xMoveAmount, this.y + this.yMoveAmount);
		
		this.check();
		return;
	}
	
	var bb_x = this.x + 64 + this.xMoveAmount;
	var bb_y = this.y + 64 + this.yMoveAmount;
	var bb_w = 30;
	var bb_h = 30;
    
    if(this.leftWalk)
    {
    	this.facingDirection = 0;
    	
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
        
        var check = Math.floor((bb_x - 1) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
       
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.xMoveAmount -= 1;
        
    	this.leftWalkAnimation.draw(this.game.clockTick, ctxEntities, 
    								this.x + this.xMoveAmount, this.y + this.yMoveAmount);
    	
    	if (this.leftWalkAnimation.isDone()) 
    	{
    		this.leftWalkAnimation.elapsedTime = 0;
    		this.leftWalk = false;
    		this.standingStill = true;
    	}   
    }
    
    else if(this.rightWalk)
    {
    	this.facingDirection = 1;
    	
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
        
        var check = Math.floor((bb_x + bb_w + 1) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
               
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.xMoveAmount += 1;
        
        this.rightWalkAnimation.draw(this.game.clockTick, ctxEntities, 
        							 this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if (this.rightWalkAnimation.isDone()) 
        {
            this.rightWalkAnimation.elapsedTime = 0;
            this.rightWalk = false;
            this.standingStill = true;
        }
    }
    
    else if(this.upWalk)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
        
        var check = Math.floor((bb_y - 1) / 32);
        var x_left = Math.floor(bb_x / 32);
        var x_right = Math.floor((bb_x + bb_w) / 32);
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.yMoveAmount -= 1;
        
        if(this.facingDirection === 0) this.leftWalkAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        else this.rightWalkAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if(this.facingDirection === 0)
        {
        	if(this.leftWalkAnimation.isDone())
        	{
        		this.leftWalkAnimation.elapsedTime = 0;
                this.upWalk = false;
                this.standingStill = true;
        	}
        }
        else
        {
        	if(this.rightWalkAnimation.isDone())
        	{
        		this.rightWalkAnimation.elapsedTime = 0;
                this.upWalk = false;
                this.standingStill = true;
        	}
        }
    }
 
    else if(this.downWalk)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
        
        var check = Math.floor(((bb_y + bb_h) + 1) / 32);
        var x_left = Math.floor(bb_x / 32);
        var x_right = Math.floor((bb_x + bb_w) / 32);
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.yMoveAmount += 1;
        
        if(this.facingDirection === 0) this.leftWalkAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        else this.rightWalkAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if(this.facingDirection === 0)
        {
        	if(this.leftWalkAnimation.isDone())
        	{
        		this.leftWalkAnimation.elapsedTime = 0;
                this.downWalk = false;
                this.standingStill = true;
        	}
        }
        else
        {
        	if(this.rightWalkAnimation.isDone())
        	{
        		this.rightWalkAnimation.elapsedTime = 0;
                this.downWalk = false;
                this.standingStill = true;
        	}
        }
    }
    
    else if(this.upAttacking)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(58 + this.xMoveAmount + this.x, 8 + this.yMoveAmount + this.y, 40, 88);
        this.upAttackAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);

        if (this.upAttackAnimation.isDone()) 
        {
            this.upAttackAnimation.elapsedTime = 0;
            this.upAttacking = false;
            this.facingDirection = 0;
            this.standingStill = true;
        }
    }
    
    else if(this.downAttacking)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(56 + this.xMoveAmount + this.x, 64 + this.yMoveAmount + this.y, 40, 88);
        this.downAttackAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);

        if (this.downAttackAnimation.isDone()) 
        {
            this.downAttackAnimation.elapsedTime = 0;
            this.downAttacking = false;
            this.facingDirection = 0;
            this.standingStill = true;
        }
    }
    
    else if(this.leftAttacking)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(8 + this.xMoveAmount + this.x, 48 + this.yMoveAmount + this.y, 88, 48);
        this.leftAttackAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);

        if (this.leftAttackAnimation.isDone()) 
        {
            this.leftAttackAnimation.elapsedTime = 0;
            this.leftAttacking = false;
            this.facingDirection = 0;
            this.standingStill = true;
        }
    }
    
    else if(this.rightAttacking)
    {
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(64 + this.xMoveAmount + this.x, 48 + this.yMoveAmount + this.y, 96, 48);
        this.rightAttackAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);

        if (this.rightAttackAnimation.isDone()) 
        {
            this.rightAttackAnimation.elapsedTime = 0;
            this.rightAttacking = false;
            this.facingDirection = 1;
            this.standingStill = true;
        }
    }
    
    else
    {
    	if(this.facingDirection === 0) this.leftStandingAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
    	else this.rightStandingAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
    	
    	this.standingStill = true;
    	
    	if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    }   
};

MonsterNeck.prototype.check = function()
{
	if (this.dieAnimation.isDone())
	{
		this.dieAnimation.elapsedTime = 0;
		this.removeFromWorld = true;
	}
};

function Link(game) 
{
    
	// LINK ANIMATION
    this.downWalkAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 32 * 3, 32, 32, 0.08, 5, false, false);
	this.upWalkAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 32 * 2, 32, 32, 0.08, 5, false, false);
	this.leftWalkAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 0, 32, 32, 0.08, 5, false, false);
	this.rightWalkAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 32, 32, 32, 0.08, 5, false, false);
	this.standingAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 32 * 3, 32, 32, 0.08, 1, true, false);
	
	this.upAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 32 * 2, 32, 32, 0.2, 1, false, false);
	this.downAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 32 * 3, 32, 32, 0.2, 1, false, false);
	this.leftAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 0, 32, 32, 0.2, 1, false, false);
	this.rightAttackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/spacemanSmall.png"), 0, 32, 32, 32, 0.2, 1, false, false);
	this.dieAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 0, 64 * 2, 64, 64, 0.08, 4, false, false);
	
	this.game = game;
    this.downWalk = false;
    this.upWalk = false;
    this.leftWalk = false;
    this.rightWalk = false;
    this.standingStill = false;
    this.upAttacking = false;
    this.downAttacking = false;
    this.leftAttacking = false;
    this.rightAttacking = false;
    this.xMoveAmount = 0;
    this.yMoveAmount = 0;
    
    this.boxes = BBH.boxes;
    this.type = "player";
    this.health = 10;
    this.shootDelay = 0;
    this.maxDelay = 10;	//constant
    this.collisionWithMonsterDelay = 0;
    this.maxMonsterDelay = 15; //constant

    this.boundingbox = new BoundingBox(this.x + 25, this.y, this.standingAnimation.frameWidth - 40, this.standingAnimation.frameHeight - 20);

    var spawnX = Math.floor(Math.random() * (game.map.caves[0].matrix[0][0].length + 1));
    var spawnY = Math.floor(Math.random() * (game.map.caves[0].matrix[0].length + 1));
    
    while (game.map.caves[0].matrix[spawnX][spawnY] != " ") {
    	spawnX = Math.floor(Math.random() * (game.map.caves[0].matrix[0].length + 1));
    	//console.log(spawnX + "meep");
        spawnY = Math.floor(Math.random() * (game.map.caves[0].matrix.length + 1));
        //console.log(spawnY);
    }
    
    Entity.call(this, game, spawnX * 32, spawnY * 32); // places entity
}

Link.prototype = new Entity();
Link.prototype.constructor = Link;

Link.prototype.update = function () 
{	
	if(this.game.left) this.leftWalk = true;
	if(this.game.right) this.rightWalk = true;
	if(this.game.up) this.upWalk = true;
	if(this.game.down) this.downWalk = true;
	if(this.game.standing) this.standingStill = true;
	if(this.game.upAttack) this.upAttacking = true;
	if(this.game.downAttack) this.downAttacking = true;
	if(this.game.leftAttack) this.leftAttacking = true;
	if(this.game.rightAttack) this.rightAttacking = true;
    
    Entity.prototype.update.call(this);
};

function Blood(game, isDead)
{
	this.isDead = isDead;
    this.permaBlood = new Animation(ASSET_MANAGER.getAsset("./img/blood.png"), 0, 0, 960, 640, 0.1, 1, true, false);
    this.bloodAnimation = new Animation(ASSET_MANAGER.getAsset("./img/blood.png"), 0, 0, 960, 640, 0.1, 3, false, false);
	Entity.call(this, game, 0, 0); // places entity
};
Blood.prototype = new Entity();
Blood.prototype.constructor = Blood;
Blood.prototype.update = function () 
{	
    Entity.prototype.update.call(this);
};
Blood.prototype.draw = function (ctxEntities, array)
{
	if (this.isDead) {
		this.permaBlood.draw(this.game.clockTick, ctxEntities, 0, 0);
		return;
	}
	
	this.bloodAnimation.draw(this.game.clockTick, ctxEntities, 0, 0);
	if (this.bloodAnimation.isDone()) 
	{
		this.removeFromWorld = true;
	}
};

Link.prototype.loseHealth = function (hpLost)
{
	this.health -= hpLost;
	var isDead = (this.health <= 0);
	var blood = new Blood(this.game, isDead);
    this.game.addEntity(blood);
	console.log("Link lost " + hpLost + " health.  He now has " + this.health + " health.");
};

Link.prototype.draw = function (ctxEntities, array) 
{
	if (this.health <= 0) {
		this.removeFromWorld = true;
	}
	if (this.collisionWithMonsterDelay > 0) {
		this.collisionWithMonsterDelay -= 1;
	}
	
	if (this.shootDelay > 0)
	{
		this.shootDelay -= 1;
	}
	//Bounding Box dimensions.  Change these 4 variables to change the entire collision mask
	var bb_x = this.x + 10 + this.xMoveAmount;
	var bb_y = this.y + 16 + this.yMoveAmount;
	var bb_w = this.standingAnimation.frameWidth - 22;
	var bb_h = this.standingAnimation.frameHeight - 22;
	/* It is highly recommended to make bb_w and bb_h exactly 30, or less.
	 * (currently Link cannot fit through 32pixel passageways!)
	 * 30 is equal to 32 (size of block) - 2 (move speed).  If you make it less than 30,
	 * it is a lot easier to slide inside blocks.  Just remove the whole
	 * this.standingAnimation stuff and replace it with a number.
	 */
	
	//Check if you are colliding with a monster.  If so, lose health every once in a while.
	var i = 0;
	for(i; i < this.game.entities.length; i++)
	{
		if (this.game.entities[i].type === "enemy")
		{
			if (this.boundingbox !== null && this.game.entities[i].health > 0 &&
					this.boundingbox.left <= this.game.entities[i].boundingbox.right &&
					this.boundingbox.right >= this.game.entities[i].boundingbox.left &&
					this.boundingbox.top <= this.game.entities[i].boundingbox.bottom &&
					this.boundingbox.bottom >= this.game.entities[i].boundingbox.top)
			{
				if (this.collisionWithMonsterDelay === 0)
				{
					this.loseHealth(1);
					this.collisionWithMonsterDelay = this.maxMonsterDelay;
				}
			}

		}
	}
    
    if(this.leftWalk)
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
        if (this.boxes) 
        {
            ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        var check = Math.floor((bb_x - 1) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
       
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.xMoveAmount -= 1;
        
    	this.leftWalkAnimation.draw(this.game.clockTick, ctxEntities, 
    								this.x + this.xMoveAmount, this.y + this.yMoveAmount);
    	
    	if (this.leftWalkAnimation.isDone()) 
    	{
    		this.leftWalkAnimation.elapsedTime = 0;
    		this.leftWalk = false;
    		this.standingStill = true;
    	}
    }
    
    else if(this.rightWalk)
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        var check = Math.floor((bb_x + bb_w + 1) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
               
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.xMoveAmount += 1;
        
        this.rightWalkAnimation.draw(this.game.clockTick, ctxEntities, 
        							 this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if (this.rightWalkAnimation.isDone()) 
        {
            this.rightWalkAnimation.elapsedTime = 0;
            this.rightWalk = false;
            this.standingStill = true;
        }
    }
    
    else if(this.upWalk)
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        var check = Math.floor((bb_y - 1) / 32);
        var x_left = Math.floor(bb_x / 32);
        var x_right = Math.floor((bb_x + bb_w) / 32);
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.yMoveAmount -= 1;
        
        this.upWalkAnimation.draw(this.game.clockTick, ctxEntities, 
        						  this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if (this.upWalkAnimation.isDone()) 
        {
            this.upWalkAnimation.elapsedTime = 0;
            this.upWalk = false;
            this.standingStill = true;
        }
    }
 
    else if(this.downWalk)
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        var check = Math.floor(((bb_y + bb_h) + 1) / 32);
        var x_left = Math.floor(bb_x / 32);
        var x_right = Math.floor((bb_x + bb_w) / 32);
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.yMoveAmount += 1;
        
        this.downWalkAnimation.draw(this.game.clockTick, ctxEntities, 
        							this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        if (this.downWalkAnimation.isDone()) 
        {
            this.downWalkAnimation.elapsedTime = 0;
            this.downWalk = false;
            this.standingStill = true;
        }
    }
	
    else
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
        if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.standingAnimation.draw(this.game.clockTick, ctxEntities, this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        this.standingStill = false;
    }
    
    if(this.upAttacking)
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
    	if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.upAttackAnimation.draw(this.game.clockTick, ctxEntities, 
        						  this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        var arrow = new Arrow(this.game, this.x + this.xMoveAmount, this.y + this.yMoveAmount, 0);
        
        if (this.shootDelay === 0) {
        	this.game.addEntity(arrow);
        	this.shootDelay = this.maxDelay;
        }

        if (this.upAttackAnimation.isDone()) 
        {
            this.upAttacking = false;
            this.standingStill = true;
            this.upAttackAnimation.elapsedTime = 0;
        }
    }
    
    else if(this.downAttacking)
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
    	if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.downAttackAnimation.draw(this.game.clockTick, ctxEntities, 
        						  this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        var arrow = new Arrow(this.game, this.x + this.xMoveAmount, this.y + this.yMoveAmount, 1);
        
        if (this.shootDelay === 0) {
        	this.game.addEntity(arrow);
        	this.shootDelay = this.maxDelay;
        }

        if (this.downAttackAnimation.isDone()) 
        {
            this.downAttacking = false;
            this.standingStill = true;
            this.downAttackAnimation.elapsedTime = 0;

        }
    }
    
    else if(this.leftAttacking)
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
    	if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.leftAttackAnimation.draw(this.game.clockTick, ctxEntities, 
        						  this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        var arrow = new Arrow(this.game, this.x + this.xMoveAmount, this.y + this.yMoveAmount, 2);
        if (this.shootDelay === 0) {
        	this.game.addEntity(arrow);
        	this.shootDelay = this.maxDelay;
        }

        if (this.leftAttackAnimation.isDone()) 
        {
            this.leftAttacking = false;
            this.standingStill = true;
            this.leftAttackAnimation.elapsedTime = 0;

        }
    }
    
    else if(this.rightAttacking)
    {
    	this.boundingbox = new BoundingBox(bb_x, bb_y, bb_w, bb_h);
    	
    	if (this.boxes) 
        {
        	ctxEntities.strokeStyle = "green";
            ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
        }
        
        this.rightAttackAnimation.draw(this.game.clockTick, ctxEntities, 
        						  this.x + this.xMoveAmount, this.y + this.yMoveAmount);
        
        var arrow = new Arrow(this.game, this.x + this.xMoveAmount, this.y + this.yMoveAmount, 3);
        
        if (this.shootDelay === 0) {
        	this.game.addEntity(arrow);
        	this.shootDelay = this.maxDelay;
        } 


        if (this.rightAttackAnimation.isDone()) 
        {
            this.rightAttacking = false;
            this.standingStill = true;
            this.rightAttackAnimation.elapsedTime = 0;
        }
    }
    
      
};

function Arrow(game, x, y, direction) // Direction: up = 0, down = 1, left = 2, right = 3
{
	this.x = x;
	this.y = y;
	this.direction = direction;
	
	//this.boundingbox = new BoundingBox(x, y, 32, 32);
	
	this.upArrowAnimation = new Animation(ASSET_MANAGER.getAsset("./img/arrow2.png"), 0, 0, 32, 32, 0.01, 1, true, false);
	this.downArrowAnimation = new Animation(ASSET_MANAGER.getAsset("./img/arrow2.png"), 32, 0, 32, 32, 0.01, 1, true, false);
	this.leftArrowAnimation = new Animation(ASSET_MANAGER.getAsset("./img/arrow2.png"), 32 * 2, 0, 32, 32, 0.01, 1, true, false);
	this.rightArrowAnimation = new Animation(ASSET_MANAGER.getAsset("./img/arrow2.png"), 32 * 3, 0, 32, 32, 0.01, 1, true, false);
	
	this.boxes = BBH.boxes;
	this.type = "laser";
	
	this.boundingbox = null;
	
	Entity.call(this, game, x, y); // places entity
}

Arrow.prototype = new Entity();
Arrow.prototype.constructor = Arrow;

Arrow.prototype.update = function () 
{	
	/*if(this.game.left) this.leftWalk = true;
	if(this.game.right) this.rightWalk = true;
	if(this.game.up) this.upWalk = true;
	if(this.game.down) this.downWalk = true;
	if(this.game.standing) this.standingStill = true;
	if(this.game.upAttack) this.upAttacking = true;
	if(this.game.downAttack) this.downAttacking = true;
	if(this.game.leftAttack) this.leftAttacking = true;
	if(this.game.rightAttack) this.rightAttacking = true;*/
    
    Entity.prototype.update.call(this);
};

Arrow.prototype.draw = function (ctxEntities, array)
{	
	var i = 0;
	for(i; i < this.game.entities.length; i++)
	{
		if (this.game.entities[i].type === "enemy")
		{
			if (this.boundingbox !== null && this.game.entities[i].health > 0 &&
					this.boundingbox.left <= this.game.entities[i].boundingbox.right &&
					this.boundingbox.right >= this.game.entities[i].boundingbox.left &&
					this.boundingbox.top <= this.game.entities[i].boundingbox.bottom &&
					this.boundingbox.bottom >= this.game.entities[i].boundingbox.top)
			{
				this.game.entities[i].health -= 1;
				this.removeFromWorld = true;
			}

		}
	}
	
	if(this.direction === 0)
	{
		var bb_x = this.x + 13;
		var bb_y = this.y + 6;
		var bb_w = 5;
		var bb_h = 18;
		
		var check = Math.floor((bb_y - 1) / 32);
        var x_left = Math.floor(bb_x / 32);
        var x_right = Math.floor((bb_x + bb_w) / 32);
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.y -= 5;
        else this.removeFromWorld = true;
        
		this.boundingbox = new BoundingBox(this.x + 13, this.y + 6, 5, 18);
		this.upArrowAnimation.draw(this.game.clockTick, ctxEntities, this.x, this.y);	
	}
	
	else if(this.direction === 1)
	{
		var bb_x = this.x + 13;
		var bb_y = this.y + 6;
		var bb_w = 5;
		var bb_h = 18;
		
		var check = Math.floor(((bb_y + bb_h) + 1) / 32);
        var x_left = Math.floor(bb_x / 32);
        var x_right = Math.floor((bb_x + bb_w) / 32);
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.y += 5;
        else this.removeFromWorld = true;
		
		
		this.boundingbox = new BoundingBox(this.x + 13, this.y + 6, 5, 18);
		this.downArrowAnimation.draw(this.game.clockTick, ctxEntities, this.x, this.y);
	}
	
	else if(this.direction === 2)
	{
		var bb_x = this.x + 6;
		var bb_y = this.y + 13;
		var bb_w = 18;
		var bb_h = 5;
		
		var check = Math.floor((bb_x - 1) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
       
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.x -= 5;
        else this.removeFromWorld = true;
        
		
		this.boundingbox = new BoundingBox(this.x + 6, this.y + 13, 18, 5);
		this.leftArrowAnimation.draw(this.game.clockTick, ctxEntities, this.x, this.y);
	}
	
	else // direction = 3
	{
		var bb_x = this.x + 6;
		var bb_y = this.y + 13;
		var bb_w = 18;
		var bb_h = 5;
		
		var check = Math.floor((bb_x + bb_w + 1) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
               
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.x += 5;
        else this.removeFromWorld = true;
		
		
		this.boundingbox = new BoundingBox(this.x + 6, this.y + 13, 18, 5);
		this.rightArrowAnimation.draw(this.game.clockTick, ctxEntities, this.x, this.y);
	}
	
	if (this.boxes) 
    {
    	ctxEntities.strokeStyle = "green";
        ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
    }
};

function Spit(game, x, y, direction) // Direction: up = 0, down = 1, left = 2, right = 3
{
	this.x = x;
	this.y = y;
	this.direction = direction;
	
	//this.boundingbox = new BoundingBox(x, y, 32, 32);
	
	this.horzSquirtAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 64 * 4, 64 * 2, 64, 64, 0.1, 1, true, false);
	this.vertSquirtAnimation = new Animation(ASSET_MANAGER.getAsset("./img/monsterSprite2.png"), 64 * 5, 64 * 2, 64, 64, 0.1, 1, true, false);
	
	this.boxes = BBH.boxes;
	this.type = "spit";
	
	this.boundingbox = null;
	
	Entity.call(this, game, x, y); // places entity
}

Spit.prototype = new Entity();
Spit.prototype.constructor = Spit;

Spit.prototype.update = function () 
{	
	/*if(this.game.left) this.leftWalk = true;
	if(this.game.right) this.rightWalk = true;
	if(this.game.up) this.upWalk = true;
	if(this.game.down) this.downWalk = true;
	if(this.game.standing) this.standingStill = true;
	if(this.game.upAttack) this.upAttacking = true;
	if(this.game.downAttack) this.downAttacking = true;
	if(this.game.leftAttack) this.leftAttacking = true;
	if(this.game.rightAttack) this.rightAttacking = true;*/
    
    Entity.prototype.update.call(this);
};

Spit.prototype.draw = function (ctxEntities, array)
{	
	var i = 0;
	for(i; i < this.game.entities.length; i++)
	{
		if (this.game.entities[i].type === "player")
		{
			if (this.boundingbox !== null && this.game.entities[i].health > 0 &&
					this.boundingbox.left <= this.game.entities[i].boundingbox.right &&
					this.boundingbox.right >= this.game.entities[i].boundingbox.left &&
					this.boundingbox.top <= this.game.entities[i].boundingbox.bottom &&
					this.boundingbox.bottom >= this.game.entities[i].boundingbox.top)
			{
				this.game.entities[i].loseHealth(1);
				this.removeFromWorld = true;
			}

		}
	}
	
	if(this.direction === 0)
	{
		var bb_x = this.x + 27;
		var bb_y = this.y;
		var bb_w = 5;
		var bb_h = 30;
		
		var check = Math.floor((bb_y - 1) / 32);
        var x_left = Math.floor(bb_x / 32);
        var x_right = Math.floor((bb_x + bb_w) / 32);
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.y -= 5;
        else this.removeFromWorld = true;
        
		this.boundingbox = new BoundingBox(this.x + 27, this.y, 5, 30);
		this.vertSquirtAnimation.draw(this.game.clockTick, ctxEntities, this.x, this.y - 15);	
	}
	
	else if(this.direction === 1)
	{
		var bb_x = this.x + 27;
		var bb_y = this.y + 25;
		var bb_w = 5;
		var bb_h = 30;
		
		var check = Math.floor(((bb_y + bb_h) + 1) / 32);
        var x_left = Math.floor(bb_x / 32);
        var x_right = Math.floor((bb_x + bb_w) / 32);
        var x_mid = Math.floor((x_left + x_right) / 2);
               
        if (array.matrix[x_left][check] == " " && array.matrix[x_mid][check] == " " &&
        		array.matrix[x_right][check] == " ") this.y += 5;
        else this.removeFromWorld = true;
		
		
		this.boundingbox = new BoundingBox(this.x + 27, this.y + 15, 5, 30);
		this.vertSquirtAnimation.draw(this.game.clockTick, ctxEntities, this.x, this.y);
	}
	
	else if(this.direction === 2)
	{
		var bb_x = this.x + 6;
		var bb_y = this.y + 13;
		var bb_w = 30;
		var bb_h = 5;
		
		var check = Math.floor((bb_x - 1) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
       
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.x -= 5;
        else this.removeFromWorld = true;
        
		
		this.boundingbox = new BoundingBox(this.x + 6, this.y + 18, 30, 5);
		this.horzSquirtAnimation.draw(this.game.clockTick, ctxEntities, this.x - 10, this.y - 13);
	}
	
	else // direction = 3
	{
		var bb_x = this.x + 24;
		var bb_y = this.y + 18;
		var bb_w = 30;
		var bb_h = 5;
		
		var check = Math.floor((bb_x + bb_w + 1) / 32);
        var y_top = Math.floor(bb_y / 32);
        var y_bot = Math.floor((bb_y + bb_h) / 32);
        var y_mid = Math.floor((y_top + y_bot) / 2);
               
        if (array.matrix[check][y_top] == " " && array.matrix[check][y_mid] == " " &&
        		array.matrix[check][y_bot] == " ") this.x += 5;
        else this.removeFromWorld = true;
		
		
		this.boundingbox = new BoundingBox(this.x + 24, this.y + 18, 30, 5);
		this.horzSquirtAnimation.draw(this.game.clockTick, ctxEntities, this.x + 8, this.y - 13);
	}
	
	if (this.boxes) 
    {
    	ctxEntities.strokeStyle = "green";
        ctxEntities.strokeRect(this.boundingbox.x, this.boundingbox.y, this.boundingbox.width, this.boundingbox.height);
    }
};

function Cave(max_width, max_height) 
{
	this.width = max_width;
	this.height = max_height;
	this.items = [];
	this.portals = [];
	this.matrix = [];
	this.isTraversable = function() 
	{
		var count = 0;
		
		for (var col = 0, row = 0; col < this.width; col++) 
		{
			for (row = 0; row < this.height; row++) 
			{
				if (this.matrix[col][row] == " ") count++;
			}
		}
		
		if (count < Math.floor((this.width * this.height) * 0.4)) return false; 
		else return true;
	};
	
	this.initMatrix = function() 
	{
		var mapRandH = 0;
		var mapRandW = 0;
		
		for (var col = 0, row = 0; col < this.width; col++) 
		{
			this.matrix[col] = [];
			for (row = 0; row < this.height; row++) 
			{
				if (col == 0 || row == 0 || col == this.width - 1 || row == this.height - 1) 
				{
					this.matrix[col][row] = "#";
				} 
				else 
				{
					mapRandH = (Math.floor(Math.random() * this.height));
					mapRandW = (Math.floor(Math.random() * this.width));
					
					if (row == mapRandH || col == mapRandW) this.matrix[col][row] = " ";
					else 
					{
						if (Math.random() < 0.5) this.matrix[col][row] = " ";
						else this.matrix[col][row] = "#";
					}
				}
			}
		}
	};
	
	this.generateMatrix = function() //generates a cave from the initial matrix
	{ 
		this.initMatrix();
		var newMatrix = [];
		for (var k = 0; k < 2; k++) 
		{
			newMatrix = [];
			for (var col = 0, row = 0; col < this.width; col++) 
			{
				newMatrix[col] = [];
				for (row = 0; row < this.height; row++) 
				{
					newMatrix[col][row] = this.placeWalls(col, row);
				}		
			}
			
			this.matrix = newMatrix;
		}
		
		this.fineTuneMatrix();
		
		if (!this.isTraversable()) this.generateMatrix();
	};
	
	this.fineTuneMatrix = function() 
	{
		for (var col = 0, row = 0; col < this.width; col++) 
		{
			for (row = 0; row < this.height; row++) 
			{
				if (this.matrix[col][row] == " ") this.fillCavities(col, row);
			}
		}
	};
	
	this.fillCavities = function(x, y) 
	{
		if (!this.isOutOfBounds(x, y)) 
		{
			if (this.matrix[x][y] != "#" && this.matrix[x][y] != "-") 
			{
				var cave_size = this.floodFillOrCount(x, y, " ", "-", true);
				
				if (cave_size < Math.floor((this.height * this.width) * 0.38)) 
				{
					this.floodFillOrCount(x, y, "-", "#", false);
				} 
				else 
				{
					this.floodFillOrCount(x, y, "-", " ", false);	
				}
			}
		}
	};
	
	this.floodFillOrCount = function(x, y, target, replacement, willCount) 
	{
		if (!this.isOutOfBounds(x, y)) 
		{
			if (this.matrix[x][y] != target) 
			{
				return 0;
			} 
			else 
			{
				this.matrix[x][y] = replacement;
				var count = 1;
				count += this.floodFillOrCount(x - 1, y, target, replacement, willCount);
				count += this.floodFillOrCount(x + 1, y, target, replacement, willCount);
				count += this.floodFillOrCount(x, y - 1, target, replacement, willCount);
				count += this.floodFillOrCount(x, y + 1, target, replacement, willCount);
				return count;
			}
		}
		
		return 0;
	};
	
	this.placeWalls = function(col, row) 
	{
		var numWalls = this.countNeighbors(col, row, 1, 1);
		
		if (this.matrix[col][row] == "#") 
		{
			if (numWalls >= 5 ) return "#";
			
			if (numWalls < 2) return " ";
		} 
		else 
		{
			if (numWalls >= 4) return "#";
		}
		
		return " ";
	};
	
	this.countNeighbors = function(x, y, scopeX, scopeY) //counts the number of 1s in the 3x3 grid centered on matrix[i][j]
	{ 
		var startX = x - scopeX;
		var startY = y - scopeY;
		var endX = x + scopeX;
		var endY = y + scopeY;
		var wallCounter = 0;
		
		for (var i = startX, j = startY; i <= endX; i++) 
		{
			for (j = startY; j <= endY; j++) 
			{
				if (!(i == x && j == y)) 
				{
					if (this.isWall(i, j)) wallCounter++;
				}
			}
		}
		
		return wallCounter;
	};
	
	this.isWall = function(x, y) 
	{
		if (this.isOutOfBounds(x, y)) return true;
		
		if (this.matrix[x][y] == "#") return true;
		
		if (this.matrix[x][y] == " ") return false;
		
		return false;
	};
	
	this.isOutOfBounds = function(x, y) 
	{
		if (x < 0 || y < 0) return true;
		
		else if (x > this.width - 1 || y > this.height - 1) return true;
		
		return false;
	};
	
	this.print = function() 
	{
		var newRow = "";
		
		for (var row = 0, row = 0; row < this.height; row++) 
		{
			newRow = "";
			for (col = 0; col < this.width; col++) 
			{
				newRow += this.matrix[col][row];
			}
			console.log(newRow);
		}
	};
}

function Map(max_num_caves, max_width, max_height) 
{
	this.caves = [];
	this.init = function() 
	{
		for (var i = 0; i < max_num_caves; i++) 
		{
			var cave = new Cave(max_width, max_height);
			cave.generateMatrix();
			this.caves.push(cave);
		}
	};
}

function loadCaves(context, cave_array) 
{
	var imgDirt = new Image();
	
	imgDirt.addEventListener("load", function() {
		imgDirt.hasLoaded = true;
		if (imgDirt.hasLoaded && imgWall.hasLoaded) 
		{
			drawCave(context, cave_array, imgWall, imgDirt);
		}
	});
	
	var imgWall = new Image();
	
	imgWall.addEventListener("load", function() {
		imgWall.hasLoaded = true;
		if (imgDirt.hasLoaded && imgWall.hasLoaded) 
		{
			drawCave(context, cave_array, imgWall, imgDirt);
		}
	});
	
	imgDirt.src = "./img/groundTile.jpg";
	imgWall.src = "./img/wallTileFront.jpg";
};

function drawCave(context, cave_array, wall_tile, floor_tile) 
{
	for (var i = 0, j = 0; i < cave_array.matrix.length; i++) 
	{
		for (j = 0; j < cave_array.matrix[i].length; j++) 
		{
			//console.log(i + " " + j);
			if (cave_array.matrix[i][j] === "#") 
			{
				context.drawImage(wall_tile, i * 32, j * 32);
			} 
			else if (cave_array.matrix[i][j] === " ") 
			{
				context.drawImage(floor_tile, i * 32, j * 32);	
			}
		}
	}
};

///////////////////// THE "MAIN" CODE BEGINS HERE ///////////////////////

var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload("./img/spacemanSmall.png");
ASSET_MANAGER.queueDownload("./img/arrow2.png");
ASSET_MANAGER.queueDownload("./img/monsterSprite2.png");
ASSET_MANAGER.queueDownload("./img/monsterNeckAttack2.png");
ASSET_MANAGER.queueDownload("./img/monsterNeckWalkLeft2.png");
ASSET_MANAGER.queueDownload("./img/monsterNeckWalkRight2.png");
ASSET_MANAGER.queueDownload("./img/blood.png");

ASSET_MANAGER.downloadAll(function () 
{
    var canvasMap = document.getElementById('gameWorldMap');
    var canvasEntities = document.getElementById('gameWorldEntities');
    var ctxMap = canvasMap.getContext('2d');
    var ctxEntities = canvasEntities.getContext('2d');
    var gameEngine = new GameEngine();
	
    var link = new Link(gameEngine);
    
    for(var i = 0; i <= 5; i++)
    {
    	var monsterSquirt = new MonsterSquirt(gameEngine);
        var monsterNeck = new MonsterNeck(gameEngine);
        gameEngine.addEntity(monsterSquirt);
        gameEngine.addEntity(monsterNeck);
    }
    
    
    gameEngine.addEntity(link);
    gameEngine.init(ctxEntities, ctxMap);
    gameEngine.start();
});