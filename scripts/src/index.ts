import { world } from "@minecraft/server";
import { PrisonMine } from "./mine";
import { WeightedElements, getData } from "./utils";
import { minesMenu } from "./ui";

export let refillStallMS = 25;

export function setRefillStallMS(ms: number) {
  refillStallMS = ms;
}

world.events.worldInitialize.subscribe((e) => {
  let str = getData(2);
  if (str) {
    setRefillStallMS(parseFloat(str));
  }

  str = getData(1);
  if (!str) return; //no data to load
  PrisonMine.data = {};
  const obj = JSON.parse(str);
  Object.keys(obj).forEach((key) => {
    const mine = obj[key];
    const m = new PrisonMine(
      mine.name,
      mine.min,
      mine.max,
      mine.blocks,
      false,
      mine.currentBlocks,
      mine.maxRefillTimer,
      mine.refillPercent,
      mine.teleportLoc
    );
    let blocks = new WeightedElements();
    Object.keys(mine.blocks.elements).forEach((key) => {
      blocks.add(
        mine.blocks.elements[key].element,
        mine.blocks.elements[key].weight
      );
    });
    m.setBlocks(blocks);
    PrisonMine.data[mine.name] = m;
  });
  PrisonMine.update();
});

world.events.blockBreak.subscribe((e) => {
  const location = e.block.location;
  const mine: PrisonMine | undefined = Object.values(PrisonMine.data).find(
    (mine) => {
      return (
        location.x >= mine.min.x &&
        location.x <= mine.max.x &&
        location.y >= mine.min.y &&
        location.y <= mine.max.y &&
        location.z >= mine.min.z &&
        location.z <= mine.max.z
      );
    }
  );
  if (!mine) return;

  mine.currentBlocks--;

  if (
    mine.currentBlocks <= (mine.maxBlocks * mine.refillPercent) / 100 &&
    !mine.isRefilling
  ) {
    mine.refill();
  }
});

export let refillTasks: any = [];
world.events.tick.subscribe((e) => {
  //Admin UI panel
  world.getAllPlayers().forEach((p) => {
    if (p.hasTag("mines-ui")) {
      p.removeTag("mines-ui");
      minesMenu(p);
    }
  });

  //only execute 1 refill task per tick
  const currentTask = refillTasks.shift();
  refillTasks = [];
  if (currentTask) {
    currentTask();
  }

  if (e.currentTick % (20 * 15) === 0) {
    //Save data every 15 seconds
    PrisonMine.update();
  }

  if (e.currentTick % 20 === 0) { //Every second
    Object.values(PrisonMine.data).forEach((mine) => {
      if (mine.maxRefillTimer > 0 && !mine.isRefilling && mine.currentBlocks < mine.maxBlocks) {
        mine.refillTimer--;
        if (mine.refillTimer <= 0) {
          mine.refill();
        }
      }
    });
  }
});
