const wolf3d = require("./wolf3d");
const keypress = require("keypress");
const chalk = require("chalk");

function bindKeys() {
  keypress(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on("keypress", function(ch, key) {
    if (key && key.ctrl && key.name == "c") process.exit();
    if (key && key.name) {
      game.sendKey(key.name);
    }
  });
}

const game = new wolf3d({ mapPath: "./maps/0.txt" });
game.gameLoop();
bindKeys();
