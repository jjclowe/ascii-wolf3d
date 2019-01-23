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

// console.log(`
// CPU: ${chalk.red("90%")}
// RAM: ${chalk.green("40%")}
// DISK: ${chalk.yellow("70%")}
// `);

// process.stdout.write("\x1b[36m" + "test message" + "\x1b[0m");
// process.stdout.write("\x1b[32m" + "test message" + "\x1b[0m");
