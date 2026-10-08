import Phaser from "phaser";
import { Capacitor } from "@capacitor/core";
import { WIDTH, HEIGHT, FPS } from "./config";
import { MenuScene } from "./scenes/MenuScene";
import { FightScene } from "./scenes/FightScene";
import { StreetsScene } from "./scenes/StreetsScene";
import "./styles.css";
// Native wrappers run the same bundle. No PWA or service-worker dependency.
document.documentElement.dataset.platform = Capacitor.getPlatform();
const game = new Phaser.Game({
  // Canvas override is useful on GPU-less test runners. Production selects WebGL automatically.
  type:
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get("renderer") === "canvas"
      ? Phaser.CANVAS
      : Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#080d18",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT,
  },
  fps: { target: FPS, forceSetTimeOut: false, smoothStep: false },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 6 },
  scene: [MenuScene, FightScene, StreetsScene],
});
// Parent geometry can change before Phaser's window-resize debounce runs.
const resizeObserver = new ResizeObserver(() =>
  requestAnimationFrame(() => game.scale.refresh()),
);
resizeObserver.observe(document.querySelector("#game")!);
// Development-only inspection for browser verification; stripped from production.
if (import.meta.env.DEV) Object.assign(window, { __FKBC__: game });
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    resizeObserver.disconnect();
    game.destroy(true);
  });
