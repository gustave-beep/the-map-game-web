# The Map Game (web build)

A playable build of The Map Game, a Pacific Northwest village builder. It needs a computer with a keyboard and mouse and a browser with WebGPU (current Chrome or Edge, or Safari 26 or newer).

This repository holds only the built game files. The first visit downloads about 71 MiB, which your browser then keeps.

First-time players receive a skippable ten-step guide covering village founding, logging, sawmills, homes, food storage, farms, direct control and research. Progress is saved in the browser. Replay it from Menu > Tutorial.

The build includes the current terrain, dense forests, citizens, economy, crop farming and automatic farm fences/gates. `release.json` identifies the published build. Previous hashed assets remain available during the rollout for cached launchers.

The main interface and house designer reuse their rendered controls, and ocean patches render in batches. Graphics adjust automatically to sustained low frame rates; World > Graphics also offers manual presets. Low no longer limits gameplay to 30 FPS. Existing villages retain their trees when graphics settings change.
