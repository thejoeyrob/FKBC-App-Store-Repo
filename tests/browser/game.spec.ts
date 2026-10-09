import { test, expect, type Page } from "@playwright/test";
// Development inspection is injected only in Vite DEV builds.
async function state(page: Page, key = "Fight") {
  return page.evaluate((sceneKey) => {
    const game = (window as any).__FKBC__;
    const scene = game.scene.getScene(sceneKey);
    const f = (fighter: any) =>
      fighter
        ? {
            x: fighter.x,
            y: fighter.y,
            floor: fighter.floor,
            health: fighter.health,
            state: fighter.state,
            move: fighter.move?.id,
            moveFrame: fighter.moveFrame,
            facing: fighter.facing,
            combo: fighter.combo,
          }
        : null;
    return {
      joe: f(scene.joe),
      dummy: f(scene.dummy ?? scene.enemy),
      paused: scene.paused,
      projectiles: scene.world?.projectiles.length,
      scrollX: scene.cameras.main.scrollX,
      frame: scene.world?.frame,
    };
  }, key);
}
async function ready(page: Page, mode = "training") {
  await page.goto("/?renderer=canvas");
  await expect(page.locator("canvas")).toBeVisible();
  await page.locator(`[data-mode="${mode}"]`).click();
  await expect(page.locator("#pause")).toBeVisible();
}
test("menu → training → movement, jump, crouch, punch, guard and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  const start = (await state(page)).joe!.x;
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await state(page)).joe!.x)
    .toBeGreaterThan(start + 50);
  await page.keyboard.up("ArrowRight");
  expect((await state(page)).joe!.x).toBeGreaterThan(start + 50);
  await page.keyboard.press("ArrowUp");
  await expect.poll(async () => (await state(page)).joe!.y).toBeLessThan(450);
  await expect.poll(async () => (await state(page)).joe!.y).toBe(512);
  await page.keyboard.down("ArrowDown");
  await expect.poll(async () => (await state(page)).joe!.state).toBe("crouch");
  await page.keyboard.up("ArrowDown");
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await state(page)).joe!.x)
    .toBeGreaterThan(820);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("j");
  await expect
    .poll(async () => (await state(page)).dummy!.health)
    .toBeLessThan(1000);
  await page.locator("#reset").click();
  expect((await state(page)).dummy!.health).toBe(1000);
  await page.selectOption("#dummy", "guard");
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await state(page)).joe!.x)
    .toBeGreaterThan(820);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("j");
  await page.waitForTimeout(350);
  expect((await state(page)).dummy!.health).toBe(1000);
  await page.locator("#pause").click();
  const frozen = (await state(page)).frame;
  await page.waitForTimeout(100);
  expect((await state(page)).frame).toBe(frozen);
  await page
    .getByRole("button", { name: "RESUME", exact: true })
    .last()
    .click();
  await expect
    .poll(async () => (await state(page)).frame)
    .toBeGreaterThan(frozen!);
  await page.screenshot({ path: "test-results/training.png" });
  expect(errors).toEqual([]);
});
test("keyboard simplified projectile and mirrored motion after crossing", async ({
  page,
}) => {
  await ready(page);
  // Poll the actual special start, then verify travel causes damage.
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(50);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(50);
  await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(50);
  await page.keyboard.press("j");
  await expect
    .poll(async () => (await state(page)).joe!.move)
    .toBe("projectile");
  await page.keyboard.up("ArrowRight");
  await expect.poll(async () => (await state(page)).dummy!.health).toBe(915);
  await page.locator("#reset").click();
  // Jump over the dummy to exercise automatic facing in the browser.
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await state(page)).joe!.x)
    .toBeGreaterThan(820);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(350);
  expect((await state(page)).joe!.facing).toBe(-1);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(50);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(50);
  await page.keyboard.press("j");
  await expect
    .poll(async () => (await state(page)).joe!.move)
    .toBe("projectile");
  await page.keyboard.up("ArrowLeft");
});
test("tornado and rising motions start their distinct moves", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(50);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(50);
  await page.keyboard.press("u");
  await expect.poll(async () => (await state(page)).joe!.move).toBe("tornado");
  await page.keyboard.up("ArrowRight");
  await page.locator("#reset").click();
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(50);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(50);
  await page.keyboard.press("j");
  await expect.poll(async () => (await state(page)).joe!.move).toBe("rising");
  await page.keyboard.up("ArrowDown");
  await page.keyboard.up("ArrowLeft");
});
test("touch controller supports simultaneous direction and punch; gamepad mapping is polled", async ({
  page,
}) => {
  await ready(page);
  // A synthetic gamepad exercises browser polling without claiming physical hardware validation.
  await page.evaluate(() => {
    (window as any).__testPad = {
      connected: true,
      index: 0,
      mapping: "standard",
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({
        pressed: false,
        value: 0,
        touched: false,
      })),
    };
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [(window as any).__testPad],
    });
  });
  await page.evaluate(() => ((window as any).__testPad.axes[0] = 1));
  await expect
    .poll(async () => (await state(page)).joe!.x)
    .toBeGreaterThan(820);
  await page.evaluate(() => ((window as any).__testPad.axes[0] = 0));
  await expect(page.locator("#device")).toContainText("PAD 1");
  await page.evaluate(
    () => ((window as any).__testPad.buttons[2].pressed = true),
  );
  await page.waitForTimeout(90);
  await page.evaluate(
    () => ((window as any).__testPad.buttons[2].pressed = false),
  );
  await expect
    .poll(async () => (await state(page)).dummy!.health)
    .toBeLessThan(1000);
  await page.locator("#reset").click();
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const right = await page.locator('[data-action="right"]').boundingBox();
  const lp = await page.locator('[data-action="LP"]').boundingBox();
  const p1 = {
    x: right!.x + right!.width / 2,
    y: right!.y + right!.height / 2,
    id: 1,
  };
  const p2 = { x: lp!.x + lp!.width / 2, y: lp!.y + lp!.height / 2, id: 2 };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [p1],
  });
  await expect
    .poll(async () => (await state(page)).joe!.x)
    .toBeGreaterThan(820);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [p1, p2],
  });
  await page.waitForTimeout(120);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => (await state(page)).dummy!.health)
    .toBeLessThan(1000);
});
test("arcade rounds and Streets horizontal scrolling with depth movement", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page, "arcade");
  await expect(page.locator("#dummy")).toHaveCount(0);
  await page.waitForTimeout(250);
  expect((await state(page)).frame).toBeGreaterThan(0);
  // Set health to one-hit range so the round transition is testable without a 99s wait.
  await page.evaluate(() => {
    const s = (window as any).__FKBC__.scene.getScene("Fight");
    s.dummy.health = 0;
  });
  await expect
    .poll(async () =>
      page.evaluate(
        () => (window as any).__FKBC__.scene.getScene("Fight").wins[0],
      ),
    )
    .toBe(1);
  await expect
    .poll(async () =>
      page.evaluate(
        () => (window as any).__FKBC__.scene.getScene("Fight").round,
      ),
    )
    .toBe(2);
  await page.locator("#home").click();
  await page.locator('[data-mode="streets"]').click();
  await expect(page.locator("#pause")).toBeVisible();
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(170);
  await page.keyboard.up("ArrowDown");
  expect((await state(page, "Streets")).joe!.floor).toBeGreaterThan(460);
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await state(page, "Streets")).scrollX)
    .toBeGreaterThan(100);
  await page.keyboard.up("ArrowRight");
  expect((await state(page, "Streets")).scrollX).toBeGreaterThan(100);
  // Put the placeholder within punch range to isolate input → depth contact → HUD.
  await page.evaluate(() => {
    const s = (window as any).__FKBC__.scene.getScene("Streets");
    s.enemy.x = s.joe.x + 75;
    s.enemy.floor = s.joe.floor;
    s.enemy.y = s.joe.floor;
    s.enemy.depth = s.joe.depth;
    s.enemy.state = "idle";
    s.enemy.move = null;
  });
  await page.keyboard.press("l");
  await expect
    .poll(async () => (await state(page, "Streets")).dummy!.health)
    .toBeLessThan(1000);
  await page.screenshot({ path: "test-results/streets.png" });
  await page.locator("#reset").click();
  expect((await state(page, "Streets")).joe!.health).toBe(1000);
  expect(errors).toEqual([]);
});
test("FIT keeps the complete 16:9 canvas in landscape and portrait viewports", async ({
  page,
}) => {
  await ready(page);
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 390, height: 844 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(600);
    const canvas = await page.locator("canvas").boundingBox();
    expect(canvas).not.toBeNull();
    expect(canvas!.width / canvas!.height).toBeCloseTo(16 / 9, 2);
    expect(canvas!.x).toBeGreaterThanOrEqual(-1);
    expect(canvas!.y).toBeGreaterThanOrEqual(-1);
    expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(canvas!.y + canvas!.height).toBeLessThanOrEqual(viewport.height + 1);
    const buttons = await page.locator(".six-buttons").boundingBox();
    expect(buttons!.x + buttons!.width).toBeLessThanOrEqual(
      canvas!.x + canvas!.width + 1,
    );
  }
});

test("default WebGL renderer runs combat and returns safely to mode select", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator('[data-mode="training"]').click();
  await expect(page.locator("#pause")).toBeVisible();
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => (await state(page)).joe!.x)
    .toBeGreaterThan(450);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("j");
  await expect.poll(async () => (await state(page)).joe!.move).toBe("LP");
  await page.locator("#home").click();
  await expect(page.locator('[data-mode="training"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("six-button guard pressure and simultaneous jump attack use the refined combat rules", async ({
  page,
}) => {
  await ready(page);
  await page.selectOption("#dummy", "guard");
  await page.evaluate(() => {
    const s = (window as any).__FKBC__.scene.getScene("Fight");
    s.joe.x = 400;
    s.dummy.x = 475;
    (window as any).__guardContacts = [];
    const original = s.world.onImpact;
    s.world.onImpact = (impact: any) => {
      (window as any).__guardContacts.push({
        blocked: impact.blocked,
        damage: impact.damage,
      });
      original?.(impact);
    };
  });
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(50);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.press("u");
  await page.keyboard.up("ArrowRight");
  await expect.poll(async () => (await state(page)).joe!.move).toBe("tornado");
  await expect
    .poll(async () =>
      page.evaluate(() => (window as any).__guardContacts.length),
    )
    .toBe(3);
  expect(await page.evaluate(() => (window as any).__guardContacts)).toEqual([
    { blocked: true, damage: 4 },
    { blocked: true, damage: 4 },
    { blocked: true, damage: 4 },
  ]);
  await page.locator("#reset").click();
  await page.evaluate(() => {
    // Both keys arrive in one browser task, before the next simulation sample.
    for (const code of ["ArrowUp", "KeyJ"])
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code, bubbles: true }),
      );
    for (const code of ["ArrowUp", "KeyJ"])
      window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
  });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const s = (window as any).__FKBC__.scene.getScene("Fight");
        return s.joe.attackStance;
      }),
    )
    .toBe("air");
  await page.keyboard.up("ArrowUp");
  await expect.poll(async () => (await state(page)).joe!.y).toBe(512);
});

test("same-frame keyboard ordering cannot turn a prior punch into a later motion", async ({
  page,
}) => {
  await ready(page);
  const inject = async (
    sequence: { type: "keydown" | "keyup"; code: string }[],
  ) =>
    page.evaluate((events) => {
      for (const event of events)
        window.dispatchEvent(
          new KeyboardEvent(event.type, { code: event.code, bubbles: true }),
        );
    }, sequence);
  await inject([
    { type: "keydown", code: "KeyJ" },
    { type: "keyup", code: "KeyJ" },
    { type: "keydown", code: "ArrowDown" },
    { type: "keydown", code: "ArrowRight" },
    { type: "keyup", code: "ArrowDown" },
    { type: "keyup", code: "ArrowRight" },
  ]);
  await expect
    .poll(async () => (await state(page)).joe!.move, {
      intervals: [20, 50, 100],
    })
    .toBe("LP");
  await page.locator("#reset").click();
  await inject([
    { type: "keydown", code: "ArrowDown" },
    { type: "keydown", code: "ArrowRight" },
    { type: "keyup", code: "ArrowDown" },
    { type: "keydown", code: "KeyJ" },
    { type: "keyup", code: "KeyJ" },
    { type: "keyup", code: "ArrowRight" },
  ]);
  await expect
    .poll(async () => (await state(page)).joe!.move, {
      intervals: [20, 50, 100],
    })
    .toBe("projectile");
});

test("a quick keyboard jump and punch remain buffered throughout heavy hit-stop", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const s = (window as any).__FKBC__.scene.getScene("Fight");
    s.world.hitstop = 9;
    for (const code of ["ArrowUp", "KeyJ"])
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code, bubbles: true }),
      );
    for (const code of ["ArrowUp", "KeyJ"])
      window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
  });
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const f = (window as any).__FKBC__.scene.getScene("Fight").joe;
          return f.attackStance === "air" && f.move?.id === "LP" && !f.grounded;
        }),
      { intervals: [20, 50, 100] },
    )
    .toBe(true);
  await expect.poll(async () => (await state(page)).joe!.y).toBe(512);
});

test("touch specials use separate cardinal taps without diagonals", async ({
  page,
}) => {
  await ready(page);
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  for (const [first, second, attack, move] of [
    ["down", "right", "LP", "projectile"],
    ["down", "left", "HP", "rising"],
    ["left", "right", "HK", "tornado"],
  ]) {
    await page.locator("#reset").click();
    await page.evaluate(() => {
      const s = (window as any).__FKBC__.scene.getScene("Fight");
      (window as any).__touchMoves = [];
      const original = s.joe.startMove.bind(s.joe);
      s.joe.startMove = (...args: any[]) => {
        (window as any).__touchMoves.push(args[0].id);
        return original(...args);
      };
    });
    for (const action of [first, second, attack]) {
      const box = await page.locator(`[data-action="${action}"]`).boundingBox();
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2, id: 1 },
        ],
      });
      await page.waitForTimeout(35);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
    await expect
      .poll(() => page.evaluate(() => (window as any).__touchMoves))
      .toContain(move);
  }
});
