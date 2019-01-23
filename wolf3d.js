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
    this.edgeDetectAngle = 0.005;
    this.raytraceStep = 0.1;
    this.showMiniMap = showMiniMap;

    this.blockChars = {
      // wall
      "#": {
        isSolid: true,
        shades: ["█", "▓", "▒", "░", " "],
        edgeChar: " "
      },
      // door, closed
      "-": {
        isSolid: true,
        shades: ["#", "#", "#", "#", " "],
        edgeChar: " "
      },
      // door, open
      "/": {
        isSolid: false,
        edgeChar: "|"
      }
    };
    this.defaultChar = " ";
    this.ceilingChar = " ";
    this.floorChars = [".", ".", ".", ".", "."];

    // this.defaultChar = "\u001b[31m \u001b[0m";
    // this.ceilingChar = "\u001b[31m \u001b[0m";
    // this.wallChars = [
    //   "\u001b[31m█\u001b[0m",
    //   "\u001b[31m▓\u001b[0m",
    //   "\u001b[31m▒\u001b[0m",
    //   "\u001b[31m░\u001b[0m",
    //   "\u001b[31m \u001b[0m"
    // ];
    // this.doorChars = [
    //   "\u001b[32m█\u001b[0m",
    //   "\u001b[32m▓\u001b[0m",
    //   "\u001b[32m▒\u001b[0m",
    //   "\u001b[32m░\u001b[0m",
    //   "\u001b[32m \u001b[0m"
    // ];
    // this.floorChars = [
    //   "\u001b[33m@\u001b[0m",
    //   "\u001b[33mx\u001b[0m",
    //   "\u001b[33m~\u001b[0m",
    //   "\u001b[33m.\u001b[0m",
    //   "\u001b[33m \u001b[0m"
    // ];
    // this.edgeChar = "\u001b[31m \u001b[0m";

    this.activeKey = "";
    this.turnSpeed = 0.7;
    this.moveSpeed = 0.04;
    this.strafeSpeed = 0.02;
    this.timeStart = 0;
    this.elapsedTime = 0;
    this.frameNumber = 0;
    this.fps = 0;

    this.fovShock = 0;

    this.map = "";
    this.loadMap(mapPath);
  }

  loadMap(mapPath, positionPlayer = true) {
    let data = fs.readFileSync(mapPath, "utf8").replace(/\r\n/g, "\n");

    this.mapWidth = data.indexOf("\n");
    this.mapHeight = (data.match(/\n/g) || []).length + 1;
    this.maxDepth = this.mapWidth;

    data = data.replace(/[\n]/g, ""); // remove newlines

    if (positionPlayer) {
      this.playerY = parseInt(data.indexOf("P") / this.mapWidth);
      this.playerX = -1 * (this.playerY * this.mapWidth - data.indexOf("P"));

      this.playerX += 0.5;
      this.playerY += 0.5;
      this.playerA = 4.7;
    }

    this.map = data.replace(/P/g, " ");
  }

  toggleBlock() {}

  toggleAllDoors() {
    if (this.map.includes("/")) {
      this.map = this.map.replace(/\//g, "-");
    } else {
      this.map = this.map.replace(/-/g, "/");
    }
  }

  sendKey(key) {
    if (key === "tab") {
      this.showStats = !this.showStats;
    } else if (key === "m") {
      this.showMiniMap = !this.showMiniMap;
    } else if (key === "f") {
      this.toggleAllDoors();
      // this.fovShock = -0.2;
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

  movePlayer() {
    const noCollisionMove = (newX, newY) => {
      if (this.getBlockInfo(this.map[parseInt(newY) * this.mapWidth + parseInt(newX)]).isSolid) {
        this.activeKey = "";
        this.fovShock = -0.4;
      } else {
        this.playerX = newX;
        this.playerY = newY;
      }
    };

    if (this.activeKey == "q") {
      this.playerA -= this.turnSpeed / this.fps; // turn left
    } else if (this.activeKey == "e") {
      this.playerA += this.turnSpeed / this.fps; // turn right
    } else if (this.activeKey == "x") {
      this.playerA += 3.14159;
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
    const stats = `X:${this.playerX.toFixed(1)} Y:${this.playerY.toFixed(1)} FPS:${this.fps}`;
    const keys1 = "w,a,s,d = move (toggle)";
    const keys2 = "q,e = rotate (toggle)";
    const keys3 = "x = turn 180";
    const keys4 = "f = doors (toggle)";
    this.screen.splice(0, stats.length, ...stats);
    this.screen.splice(this.screenWidth, keys1.length, ...keys1);
    this.screen.splice(this.screenWidth * 2, keys2.length, ...keys2);
    this.screen.splice(this.screenWidth * 3, keys3.length, ...keys3);
    this.screen.splice(this.screenWidth * 4, keys4.length, ...keys4);
  }
  drawMinimap() {
    let yOffset = 5;
    for (let nx = 0; nx < this.mapWidth; nx++)
      for (let ny = 0; ny < this.mapHeight; ny++)
        this.screen[(ny + yOffset) * this.screenWidth + nx] = this.map[ny * this.mapWidth + nx];
    this.screen[parseInt(this.playerY + yOffset) * this.screenWidth + parseInt(this.playerX)] = "P";
  }

  raytrace(x) {
    let distanceToBlock = 0;
    let block = this.getBlockInfo(" ");
    let isEdge = false;
    let rayAngle = this.playerA - this.fov / 2 + (x / this.screenWidth) * this.fov;
    let hitWall = false;

    const eyeX = Math.sin(rayAngle);
    const eyeY = Math.cos(rayAngle);

    while (!hitWall && distanceToBlock < this.maxDepth) {
      distanceToBlock += this.raytraceStep;

      let testX = parseInt(this.playerX + eyeX * distanceToBlock);
      let testY = parseInt(this.playerY + eyeY * distanceToBlock);
      let blockChar = this.map[testY * this.mapWidth + testX];

      if (testX < 0 || testX >= this.mapWidth || testY < 0 || testY >= this.mapHeight) {
        // ray out of bounds
        hitWall = true;
        distanceToBlock = this.maxDepth;
      } else {
        block = this.getBlockInfo(blockChar);

        if (block.isSolid) hitWall = true;

        if (block.edgeChar) {
          let vector = [];

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

    return { block, distanceToBlock, isEdge };
  }

  screenEffects() {
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

  isVisibleBlock(char) {
    let match = char.match(/[#|-]/);
    return match ? match[0] : false;
  }

  getBlockInfo(char) {
    return this.blockChars[char] ? this.blockChars[char] : this.defaultChar;
  }

  render() {
    process.stdout.write(this.screen.join(""));
  }

  gameLoop() {
    this.fps = this.calcFps();

    this.movePlayer();

    for (let x = 0; x < this.screenWidth; x++) {
      let { block, distanceToBlock, isEdge } = this.raytrace(x);
      let ceiling = this.screenHeight / 2 - this.screenHeight / distanceToBlock;
      let floor = this.screenHeight - ceiling;
      let shade = this.defaultChar;
      // let block = this.getBlockInfo(block);

      if (block.shades) {
        if (distanceToBlock <= this.maxDepth / 4) {
          shade = block.shades[0];
        } else if (distanceToBlock <= this.maxDepth / 3) {
          shade = block.shades[1];
        } else if (distanceToBlock <= this.maxDepth / 2) {
          shade = block.shades[2];
        } else if (distanceToBlock <= this.maxDepth) {
          shade = block.shades[3];
        } else {
          shade = block.shades[4];
        }
      }

      if (isEdge) shade = block.edgeChar;

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

    this.screenEffects();
    this.render();

    setTimeout(() => {
      this.gameLoop();
    }, 1);
  }
}

module.exports = wolf3d;
