const fs = require("fs");
const chalk = require("chalk");

class wolf3d {
  constructor({ mapPath, fov = 3.14159 / 4, showStats = true, showMiniMap = true }) {
    this.screenWidth = process.stdout.columns;
    this.screenHeight = process.stdout.rows;
    this.screen = [];

    this.savedFov = fov;
    this.fov = fov;
    this.showStats = showStats;
    this.showMiniMap = showMiniMap;
    this.defaultChar = " ";
    this.ceilingChar = " ";
    this.wallChars = ["█", "▓", "▒", "░", " "];
    this.doorChars = ["█", "█", "█", "█", " "];
    this.floorChars = ["@", "x", "~", ".", " "];
    this.edgeChar = " ";
    this.edgeDetectAngle = 0.005;
    this.raytraceStep = 0.1;

    this.activeKey = "";
    this.turnSpeed = 0.7;
    this.moveSpeed = 0.04;
    this.strafeSpeed = 0.02;
    this.timeStart = 0;
    this.elapsedTime = 0;
    this.frameNumber = 0;
    this.fps = 0;
    this.autoTurnRemaining = 0;

    this.fovShock = 0;

    this.map = "";
    this.loadMap(mapPath);
  }

  loadMap(mapPath, positionPlayer = true) {
    let data = fs.readFileSync(mapPath, "utf8").replace(/\r\n/g, "\n");

    this.mapWidth = data.indexOf("\n");
    this.mapHeight = (data.match(/\n/g) || []).length + 1;
    this.map = data.replace(/\n/g, "");

    this.maxDepth = this.mapWidth;

    if (positionPlayer) {
      this.playerX = 14;
      this.playerY = 1.5;
      this.playerA = 4.7;
    }
  }

  toggleBlock() {}

  toggleDoors() {
    // if (this.map.includes("/")) {
    //   this.map = this.map.replace(/\//g, "-");
    // } else {
    //   this.map = this.map.replace(/-/g, "/");
    // }
  }

  sendKey(key) {
    if (key === "tab") {
      this.showStats = !this.showStats;
    } else if (key === "m") {
      this.showMiniMap = !this.showMiniMap;
    } else if (key === "f") {
      //    this.toggleDoors();
      this.fovShock = -0.2;
    } else {
      if (key.match(/[w|s]/)) this.activeKey = this.activeKey.match(/[w|s]/) ? "" : key;
      if (key.match(/[q|e]/)) this.activeKey = this.activeKey.match(/[q|e]/) ? "" : key;
      if (key.match(/[a|d]/)) this.activeKey = this.activeKey.match(/[a|d]/) ? "" : key;
      if (key.match(/x/)) this.activeKey = key;
    }
  }

  calcFps() {
    this.frameNumber++;
    let d = new Date().getTime();
    let timeEnd = (d - this.timeStart) / 1000;
    let result = Math.floor(this.frameNumber / timeEnd);
    if (timeEnd > 1) {
      this.timeStart = new Date().getTime();
      this.frameNumber = 0;
    }
    return parseInt(result);
  }

  isPassableBlock(char) {
    return char.match(/[#|-]/) !== null;
  }

  isVisibleBlock(char) {
    let match = char.match(/[#|-]/);
    return match ? match[0] : false;
  }

  getBlockShades(char) {
    if (char === "#") return this.wallChars;
    if (char === "-") return this.doorChars;
  }

  movePlayer() {
    const noCollisionMove = (newX, newY) => {
      if (this.isPassableBlock(this.map[parseInt(newY) * this.mapWidth + parseInt(newX)])) {
        this.activeKey = "";
        this.fovShock = -0.4;
      } else {
        this.playerX = newX;
        this.playerY = newY;
      }
    };

    if (this.autoTurnRemaining > -0.1 && this.autoTurnRemaining < 0.1) {
      this.autoTurnRemaining = 0;
    } else if (this.autoTurnRemaining > 0) {
      this.autoTurnRemaining -= (this.turnSpeed * 4) / this.fps;
      this.playerA -= (this.turnSpeed * 4) / this.fps;
    } else if (this.autoTurnRemaining < 0) {
      this.autoTurnRemaining += (this.turnSpeed * 4) / this.fps;
      this.playerA += (this.turnSpeed * 4) / this.fps;
    }

    if (this.activeKey == "q") {
      this.playerA -= this.turnSpeed / this.fps; // turn left
    } else if (this.activeKey == "e") {
      this.playerA += this.turnSpeed / this.fps; // turn right
    } else if (this.activeKey == "x") {
      this.autoTurnRemaining = 3.14159; // turn 180 degrees
      this.activeKey = "";
    } else if (this.activeKey == "w") {
      noCollisionMove(
        this.playerX + Math.sin(this.playerA) * this.moveSpeed,
        this.playerY + Math.cos(this.playerA) * this.moveSpeed
      ); // move forward
    } else if (this.activeKey == "s") {
      noCollisionMove(
        this.playerX - Math.sin(this.playerA) * this.moveSpeed,
        this.playerY - Math.cos(this.playerA) * this.moveSpeed
      ); // move backward
    } else if (this.activeKey == "a") {
      noCollisionMove(
        this.playerX - Math.cos(this.playerA) * this.strafeSpeed,
        this.playerY + Math.sin(this.playerA) * this.strafeSpeed
      ); // move left
    } else if (this.activeKey == "d") {
      noCollisionMove(
        this.playerX + Math.cos(this.playerA) * this.strafeSpeed,
        this.playerY - Math.sin(this.playerA) * this.strafeSpeed
      ); // move right
    }
  }

  drawStats() {
    const stats = `X:${this.playerX.toFixed(1)} Y:${this.playerY.toFixed(1)} A:${this.playerA.toFixed(1)} FPS:${
      this.fps
    }`;
    this.screen.splice(0, stats.length, ...stats);
  }
  drawMinimap() {
    for (let nx = 0; nx < this.mapWidth; nx++)
      for (let ny = 0; ny < this.mapHeight; ny++)
        this.screen[(ny + 1) * this.screenWidth + nx] = this.map[ny * this.mapWidth + nx];
    this.screen[parseInt(this.playerY + 1) * this.screenWidth + parseInt(this.playerX)] = "P";
  }

  raytrace(x) {
    let distanceToBlock = 0;
    let blockChar = null;
    let isEdge = false;
    let rayAngle = this.playerA - this.fov / 2 + (x / this.screenWidth) * this.fov;
    let hitWall = false;

    const eyeX = Math.sin(rayAngle);
    const eyeY = Math.cos(rayAngle);

    while (!hitWall && distanceToBlock < this.maxDepth) {
      distanceToBlock += this.raytraceStep;

      let testX = parseInt(this.playerX + eyeX * distanceToBlock);
      let testY = parseInt(this.playerY + eyeY * distanceToBlock);

      if (testX < 0 || testX >= this.mapWidth || testY < 0 || testY >= this.mapHeight) {
        // ray out of bounds
        hitWall = true;
        distanceToBlock = this.maxDepth;
      } else {
        blockChar = this.isVisibleBlock(this.map[testY * this.mapWidth + testX]);

        if (blockChar) {
          let vector = [];

          hitWall = true;

          for (let tx = 0; tx < 2; tx++)
            for (let ty = 0; ty < 2; ty++) {
              let vy = testY + ty - this.playerY;
              let vx = testX + tx - this.playerX;
              let d = Math.sqrt(vx * vx + vy * vy);
              let dot = (eyeX * vx) / d + (eyeY * vy) / d;
              vector.push([d, dot]);
            }

          vector.sort(); // sort vectors from cloest to farthest

          if (Math.acos(vector[0][1]) < this.edgeDetectAngle) isEdge = true;
          if (Math.acos(vector[1][1]) < this.edgeDetectAngle) isEdge = true;
        }
      }
    }

    return { blockChar, distanceToBlock, isEdge };
  }

  effects() {
    if (this.fovShock < 0.1 && this.fovShock > -0.1) {
      this.fov = this.savedFov;
    } else if (this.fovShock < 0) {
      this.fov = this.savedFov + this.fovShock;
      this.fovShock += 0.05;
    } else if (this.fovShock > 0) {
      this.fov = this.savedFov + this.fovShock;
      this.fovShock -= 0.05;
    }
  }

  render() {
    // console.log(this.screen.join("").substr(0, 6471));
    // console.log(this.screen.join(""));
    // process.exit();
    //console.log(`${chalk.red(this.screen.join(""))}`);
    process.stdout.write(this.screen.join("").substr(0, 6471));
  }

  gameLoop() {
    this.fps = this.calcFps();

    this.movePlayer();

    for (let x = 0; x < this.screenWidth; x++) {
      let { blockChar, distanceToBlock, isEdge } = this.raytrace(x);
      let ceiling = this.screenHeight / 2 - this.screenHeight / distanceToBlock;
      let floor = this.screenHeight - ceiling;
      let shade = this.defaultChar;

      if (distanceToBlock <= this.maxDepth / 4) {
        shade = this.getBlockShades(blockChar)[0];
      } else if (distanceToBlock <= this.maxDepth / 3) {
        shade = this.getBlockShades(blockChar)[1];
      } else if (distanceToBlock <= this.maxDepth / 2) {
        shade = this.getBlockShades(blockChar)[2];
      } else if (distanceToBlock <= this.maxDepth) {
        shade = this.getBlockShades(blockChar)[3];
      } else {
        shade = this.getBlockShades(blockChar)[4];
      }

      if (isEdge) shade = this.edgeChar;

      // draw column
      for (let y = 0; y < this.screenHeight; y++) {
        if (y < ceiling) {
          // ceiling
          this.screen[y * this.screenWidth + x] = this.ceilingChar;
        } else if (y > ceiling && y <= floor) {
          // walls
          this.screen[y * this.screenWidth + x] = shade;
        } else {
          // floor
          let n = 1 - (y - this.screenHeight / 2) / (this.screenHeight / 2);

          if (n < 0.25) {
            shade = this.floorChars[0];
          } else if (n < 0.5) {
            shade = this.floorChars[1];
          } else if (n < 0.75) {
            shade = this.floorChars[2];
          } else if (n < 0.9) {
            shade = this.floorChars[3];
          } else {
            shade = this.floorChars[4];
          }

          this.screen[y * this.screenWidth + x] = shade;
        }
      }
    }

    if (this.showStats) this.drawStats();
    if (this.showMiniMap) this.drawMinimap();

    this.effects();
    this.render();

    setTimeout(() => {
      this.gameLoop();
    }, 1);
  }
}

module.exports = wolf3d;
