# ascii-wolf3d

Can Node.js do 3D?

Well no, not really.  But it can do 2.5D!

This is a Node.js implementation of billboard rendering from 2D projection maps, a technique pioneered by games like [Wolfenstein 3D](https://en.wikipedia.org/wiki/Wolfenstein_3D).

Inspired by OneLoneCoder's C++ video: [First Person Shooter (Quick and Simple C++)
](https://www.youtube.com/watch?v=xW8skO7MFYw)

## Installation

Use the package manager [npm](https://www.npmjs.com/get-npm) to install dependencies.

```bash
npm install
```

## Playing

Best results in a 120 x 30 console.

```bash
node index
```

### Controls

Due to the constraints with Node.js and the missing `keydown` and `keyup` events, `keypress` has been used instead.  So player movement is controlled by toggling keys, not by holding them down.

Keys | Action
--- | ---
w,a,s,d | Player translation (toggle)
q,e | Player rotation (toggle)
x | Turn 180
f | Toggle all doors
tab | Toggle stats and instructions
m | Toggle minimap
