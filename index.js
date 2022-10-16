class Entity {
    constructor(id, etype, tileC) {
        this.eid = id;
        this.type = etype;
        this.tile = tileC;
        this.tileType = tileC.type;
    }

    draw() {
        if (this.tile) {
            this.tile.type = this.type;
            this.tile.data = `entity-${this.eid}`;
            this.tile.redraw();
        }
    }

    kill() {
        delete this;
    }

    moveTo(newX, newY) {
        var newTile = Game.getTile(newX, newY);
        this.tile.type = this.tileType;
        this.tileType = newTile.type;
        this.tile.data = "";
        newTile.tileNode.innerHTML = this.tile.tileNode.innerHTML;
        this.tile.tileNode.innerHTML = "";
        this.tile.tileNode
        newTile.type = this.type;
        newTile.data = `entity-${this.eid}`;
        newTile.redraw();
        this.tile.redraw();
        this.tile = newTile;
    }

    whereCanMove() {
        return { up: false, right: false, down: false, left: false };
    }

    pickNextMove(dirs) {
        var nextWay = this.whereCanMove();
        if (dirs.up && nextWay.up) return this.moveTo(this.tile.coord.x, this.tile.coord.y - 1);
        if (dirs.right && nextWay.right) return this.moveTo(this.tile.coord.x + 1, this.tile.coord.y);
        if (dirs.down && nextWay.down) return this.moveTo(this.tile.coord.x, this.tile.coord.y + 1);
        if (dirs.left && nextWay.left) return this.moveTo(this.tile.coord.x - 1, this.tile.coord.y);
    }

}

class Sword extends Entity {
    constructor(eid, tileC) {
        super(eid, "tileSW", tileC);
    }
}

class Potion extends Entity {
    constructor(eid, tileC) {
        super(eid, "tileHP", tileC);
    }
}

class ArmedMovableEntity extends Entity {
    constructor(eid, type, tileC) {
        super(eid, type, tileC);
        this.blockedTypes = ["tileW", "tileE", "tileHP", "tileSW", "tileP"];
        this.health = 100;
        this.attack = 1;
        this.aim = "tileE";
        this.nearAim = false;
    }

    draw() {
        if (this.health > 0) {
            super.draw();
            var healthNode = document.createElement('div');
            healthNode.className = "health";
            healthNode.style = `width: ${this.health}%`;
            this.tile.tileNode.appendChild(healthNode);
        } else {
            this.kill();
        }
    }

    redraw() {
        this.tile.tileNode.innerHTML = "";
        this.draw();
    }

    kill() {
        this.tile.type = "tile";
        this.tile.tileNode.removeAttribute("data");
        this.tile.redraw();
        super.kill();
    }

    canGoTo(tile) {
        if (tile) return !this.blockedTypes.includes(tile.type);
        return false;
    }

    whereCanMove() {
        var up = Game.getTile(this.tile.coord.x, this.tile.coord.y - 1);
        var right = Game.getTile(this.tile.coord.x + 1, this.tile.coord.y);
        var down = Game.getTile(this.tile.coord.x, this.tile.coord.y + 1);
        var left = Game.getTile(this.tile.coord.x - 1, this.tile.coord.y);
        return {
            up: this.canGoTo(up),
            right: this.canGoTo(right),
            down: this.canGoTo(down),
            left: this.canGoTo(left)
        };
    }

    takeDamage(dmg) {
        this.health -= dmg;
        this.redraw();
        console.log(`${dmg} damage taken to entity ${this.eid} = ${this.health}`);
    }

    findAndAttack() {
        var x_pos = [this.tile.coord.x - 1, this.tile.coord.x, this.tile.coord.x + 1];
        var y_pos = [this.tile.coord.y - 1, this.tile.coord.y, this.tile.coord.y + 1];
        var kill = this.aim;
        //find aim
        var near = Game.entityList.filter(function (entity) {
            return entity.type == kill && x_pos.includes(entity.tile.coord.x) && y_pos.includes(entity.tile.coord.y) && entity.health > 0;
        });
        this.nearAim = near.length > 0;
        for (var i = 0; i < near.length; i++) {
            near[i].takeDamage(this.attack);
        }
    }
}

class Enemy extends ArmedMovableEntity {
    constructor(eid, tileC) {
        super(eid, "tileE", tileC);
        this.attack = 5;
        this.aim = "tileP";
        this.attackBehaviour = setInterval(function () { this.findAndAttack() }.bind(this), 500);
        this.moveBehaviour = setInterval(function () { this.calculateNextStep() }.bind(this), 500);
        this.onEnemyDied = null;
    }

    kill() {
        clearInterval(this.attackBehaviour);
        clearInterval(this.moveBehaviour);
        super.kill();
    }

    takeDamage(dmg) {
        super.takeDamage(dmg);
        if(this.health <= 0) this.onEnemyDied();
    }

    calculateNextStep() {
        if (!this.nearAim) this.pickNextMove({
            up: Math.random() < Math.random(),
            right: Math.random() > Math.random(),
            down: Math.random() < Math.random(),
            left: Math.random() > Math.random()
        });
    }
}

class Player extends ArmedMovableEntity {
    constructor(eid, tileC) {
        super(eid, "tileP", tileC);
        this.attack = 10;
        this.aim = "tileE";
        this.blockedTypes = ["tileW", "tileE"];
        this.playerMoveListener = function (event) {
            this.pickNextMove({
                up: event.key == "w",
                right: event.key == "d",
                down: event.key == "s",
                left: event.key == "a"
            });
            //attack
            if (event.key == " ") this.findAndAttack();
        }.bind(this);
    }

    draw() {
        document.addEventListener('keydown', this.playerMoveListener);
        super.draw();
    }

    takeDamage(dmg) {
        super.takeDamage(dmg);
        if (this.health <= 0) {
            alert("Ты проиграл!");
            document.removeEventListener("keydown", this.playerMoveListener);
            game.restart();
        }
    }

    moveTo(newX, newY) {
        var newTile = Game.getTile(newX, newY);
        if (newTile) {
            if (newTile.type == "tileHP") {
                this.health = 100;
                this.redraw();
            }
            if (newTile.type == "tileSW") this.attack += 10;
            super.moveTo(newX, newY);
        }
    }
}

class Tile {
    constructor(classType, tx, ty) {
        this.type = classType;
        this.coord = {
            x: tx,
            y: ty,
        }
        this.id = `tile-${tx}-${ty}`;
        this.offset = {
            left: tx * 50,
            top: ty * 50,
        }
        this.data = "";
    }

    draw() {
        this.tileNode = document.getElementById(`tile-${this.coord.x}-${this.coord.y}`);
        if (this.tileNode == null) {
            this.tileNode = document.createElement('div');
        }
        this.tileNode.className = `tile ${this.type}`;
        this.tileNode.style = `left: ${this.offset.left}px; top: ${this.offset.top}px`;
        this.tileNode.id = this.id;
        this.tileNode.setAttribute("data", this.data);
        Game.getField().appendChild(this.tileNode);
    }

    redraw() {
        if (this.data.length == 0) {
            this.type = "tile";
        }
        this.tileNode.className = `tile ${this.type}`;
        this.tileNode.setAttribute("data", this.data);
    }
}

class Game {

    static entityList = [];
    static tileList = [];

    constructor() {
        this.settings = {
            Height: 20,
            Width: 32,
            Enemies: 10,
            Swords: 2,
            Potions: 10
        }
        this.playerMoveListener = null;
    }

    initTileMap() {
        Game.getField().innerHTML = '';
        //fill map tileW
        for (var x = 0; x < this.settings.Width; x++) {
            for (var y = 0; y < this.settings.Height; y++) {
                Game.tileList.push(new Tile('tileW', x, y));
            }
        }
        //rooms
        var rooms = 5 + Math.round(Math.random() * 5);
        for (var i = 0; i < rooms; i++) {
            var h = 3 + Math.round(Math.random() * 5);
            var w = 3 + Math.round(Math.random() * 5);

            var startX = Math.round(Math.random() * this.settings.Width);
            var startY = Math.round(Math.random() * this.settings.Height);

            for (var x = 0; x < w; x++) {
                for (var y = 0; y < h; y++) {
                    var tile = Game.getTile(startX + x, startY + y);
                    if (tile) tile.type = "tile";
                }
            }
        }
        //vertical lines
        var count = 0;
        var x_cord = 2 + Math.round(Math.random() * (this.settings.Width / 5));
        for (x_cord; x_cord < this.settings.Width && count < 5; x_cord += (2 + Math.round(Math.random() * (this.settings.Width / 3)))) {
            for (var i = 0; i < this.settings.Height; i++) {
                var tile = Game.getTile(x_cord, i);
                if (tile) tile.type = "tile";
            }
            count++;
        }
        //horizontal lines
        count = 0;
        var y_cord = 2 + Math.round(Math.random() * (this.settings.Height / 5));
        for (y_cord; y_cord < this.settings.Height && count < 5; y_cord += (2 + Math.round(Math.random() * (this.settings.Height / 3)))) {
            for (var i = 0; i < this.settings.Width; i++) {
                var tile = Game.getTile(i, y_cord);
                if (tile) tile.type = "tile";
            }
            count++;
        }

        Game.tileList.forEach(function (tile) { tile.draw() });
    }

    spawnEntities() {
        var eid = 0;
        var emptyTiles = Game.tileList.filter(function (tile) {
            return tile.type != 'tileW';
        });
        //player
        var tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        var entity = new Player(eid++, tile);
        Game.entityList.push(entity);
        entity.draw();
        //swords
        for (var i = 0; i < this.settings.Swords; i++) {
            var tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            var entity = new Sword(eid++, tile);
            Game.entityList.push(entity);
            entity.draw();
        }
        //potions
        for (var i = 0; i < this.settings.Potions; i++) {
            var tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            var entity = new Potion(eid++, tile);
            Game.entityList.push(entity);
            entity.draw();
        }
        //enemies
        for (var i = 0; i < this.settings.Enemies; i++) {
            var tile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            var entity = new Enemy(eid++, tile);
            Game.entityList.push(entity);
            entity.onEnemyDied = this.enemyDied.bind(this);
            entity.draw();
        }
    }

    enemyDied() {
        var remain = Game.entityList.filter(function (entity) { return entity.type == "tileE" && entity.health > 0 });
        if (remain.length == 0) {
            alert("Ты выйграл!");
            this.restart();
        }
    }

    restart() {
        for (var i = 0; i < Game.tileList.length; i++) {
            delete Game.tileList[i];
        }
        for (var i = 0; i < Game.entityList.length; i++) {
            Game.entityList[i].kill();
            delete Game.entityList[i];
        }
        delete Game.tileList;
        delete Game.entityList;
        Game.tileList = [];
        Game.entityList = [];
        this.init();
    }

    init() {
        this.initTileMap();
        this.spawnEntities();
    }

    static getTile(x, y) {
        var tiles = Game.tileList.filter(function (tile) { return tile.coord.x == x && tile.coord.y == y });
        if (tiles[0]) return tiles[0];
    }

    static getField() {
        return document.getElementsByClassName('field')[0];
    }
}

