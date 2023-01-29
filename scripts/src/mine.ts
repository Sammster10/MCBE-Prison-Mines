import {
  BlockLocation,
  MinecraftBlockTypes,
  MinecraftDimensionTypes,
  Player,
  StringBlockProperty,
  Vector3,
  world,
} from "@minecraft/server";
import { WeightedElements, setData } from "./utils";
import { refillStallMS, refillTasks } from "./index";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { minesMenu } from "./ui";

export function getMinPos(pos1: Vector3, pos2: Vector3) {
  return {
    x: Math.min(pos1.x, pos2.x),
    y: Math.min(pos1.y, pos2.y),
    z: Math.min(pos1.z, pos2.z),
  };
}

export function getMaxPos(pos1: Vector3, pos2: Vector3) {
  return {
    x: Math.max(pos1.x, pos2.x),
    y: Math.max(pos1.y, pos2.y),
    z: Math.max(pos1.z, pos2.z),
  };
}

export class PrisonMine {
  static data: { [key: string]: PrisonMine } = {};

  readonly name: string;
  readonly min: Vector3;
  readonly max: Vector3;
  blocks: WeightedElements = new WeightedElements();
  isRefilling = false;
  maxBlocks = 0;
  currentBlocks = 0;
  refillTimer = -1;
  maxRefillTimer = 30;
  refillPercent = 50;
  teleportLoc: Vector3 = { x: 0, y: 0, z: 0 };

  constructor(
    name: string,
    pos1: Vector3,
    pos2: Vector3,
    blocks: WeightedElements,
    isRefilling = false,
    currentBlocks = 0,
    maxRefillTimer = -1,
    refillPercent = 50,
    teleportLoc?: Vector3
  ) {
    this.name = name;
    this.min = getMinPos(pos1, pos2);
    this.max = getMaxPos(pos1, pos2);
    this.blocks = blocks;
    this.isRefilling = isRefilling;
    this.currentBlocks = currentBlocks;
    this.maxBlocks =
      Math.abs(1 + this.min.x - this.max.x) *
      Math.abs(1 + this.min.y - this.max.y) *
      Math.abs(1 + this.min.z - this.max.z);

    this.maxRefillTimer = maxRefillTimer;
    this.refillTimer = maxRefillTimer;
    this.refillPercent = refillPercent;

    if (teleportLoc) {
      this.teleportLoc = teleportLoc;
    } else {
      this.teleportLoc = {
        x: this.max.x - (this.max.x - this.min.x) / 2,
        y: this.max.y + 1,
        z: this.max.z - (this.max.z - this.min.z) / 2,
      };
    }
  }

  static get(name: string): PrisonMine {
    const mine = PrisonMine.data[name];
    if (mine) {
      return mine;
    }
    throw new Error(`Mine ${name} does not exist`);
  }

  register() {
    PrisonMine.data[this.name] = this;
    PrisonMine.update();
  }

  unRegister() {
    delete PrisonMine.data[this.name];
    PrisonMine.update();
  }

  public setBlocks(blocks: WeightedElements) {
    this.blocks = blocks;
  }

  static update() {
    setData(1, JSON.stringify(PrisonMine.data));
  }

  public refill() {
    if (this.isRefilling) return;
    if (this.blocks.elements.length === 0) return;
    this.isRefilling = true;
    this.currentBlocks = this.maxBlocks;
    this.refillTimer = this.maxRefillTimer;

    world.getAllPlayers().forEach((p) => {
      if (p.dimension.id !== MinecraftDimensionTypes.overworld) return;
      let loc = p.location;
      if (
        loc.x >= this.min.x &&
        loc.x <= this.max.x &&
        loc.y >= this.min.y &&
        loc.y <= this.max.y &&
        loc.z >= this.min.z &&
        loc.z <= this.max.z
      ) {
        p.teleport(this.teleportLoc, p.dimension, 0, 0, false);
      }
    });

    PrisonMine.refillAction(
      this,
      this.min.x,
      this.min.y,
      this.min.z,
      this.min.x,
      this.min.y,
      this.min.z,
      this.max.x,
      this.max.y,
      this.max.z,
      this.blocks
    );
  }

  static refillAction(
    mine: PrisonMine,
    initialX: number,
    initialY: number,
    initialZ: number,
    startX: number,
    startY: number,
    startZ: number,
    endX: number,
    endY: number,
    endZ: number,
    blocks: WeightedElements
  ) {
    const startTime = Date.now();

    const overworld = world.getDimension(MinecraftDimensionTypes.overworld);
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        for (let z = startZ; z <= endZ; z++) {
          try {
            const b = blocks.get();
            const blockType = MinecraftBlockTypes.get(b.blockID);
            const block = overworld.getBlock(new BlockLocation(x, y, z));
            const permutation = blockType.createDefaultBlockPermutation();
            block.setType(blockType);
            if (b.permutation.key != "undefined") {
              const prop = permutation.getProperty(
                b.permutation.key
              ) as StringBlockProperty;
              if (prop && prop.validValues.includes(b.permutation.value)) {
                prop.value = b.permutation.value;
              }
              block.setPermutation(permutation);
            }
          } catch (e) {
            //There was some error, just skip this block. This is most likely due to the block not being loaded
          }
          //allow this to stall
          if (Date.now() - startTime > refillStallMS) {
            let newX = x;
            let newY = y;
            let newZ = z++;

            if (newZ > endZ) {
              newZ = initialZ;
            }

            refillTasks.push(() =>
              PrisonMine.refillAction(
                mine,
                initialX,
                initialY,
                initialZ,
                newX,
                newY,
                newZ,
                endX,
                endY,
                endZ,
                blocks
              )
            );
            return;
          }
        }
        startZ = initialZ;
      }
      startY = initialY;
    }

    mine.isRefilling = false;
  }

  editMineMenu(player: Player) {
    const menu = new ActionFormData()
      .title(`Edit Mine: ${this.name}`)
      .body(
        `Location: ${this.min.x}, ${this.min.y}, ${this.min.z} to ${this.max.x}, ${this.max.y}, ${this.max.z}`
      )
      .button("Refill Mine")
      .button("Teleport to Mine")
      .button("Edit Blocks")
      .button("Mine Settings")
      .button("Delete Mine")
      .button("Go Back");

    //@ts-ignore
    menu.show(player).then((result) => {
      switch (result.selection) {
        case 0:
          this.refill();
          break;
        case 1:
          player.teleport(
            this.teleportLoc,
            world.getDimension(MinecraftDimensionTypes.overworld),
            0,
            0,
            false
          );
          break;
        case 2:
          this.editBlocksMenu(player);
          break;
        case 3:
          this.settingsMenu(player);
          break;
        case 4:
          this.unRegister();
          break;
        default:
          minesMenu(player);
          break;
      }
    });
  }
  editBlocksMenu(player: Player) {
    let menu = new ActionFormData().title(`Edit Blocks | Mine: ${this.name}`);

    let currentBlocks = "Current Blocks: \n";

    this.blocks.elements.forEach((element) => {
      let extra = "";
      if (
        element.element.permutation.key != "undefined" &&
        element.element.permutation.value != "undefined"
      ) {
        extra = ` | ${element.element.permutation.key}: ${element.element.permutation.value}`;
      }
      currentBlocks += `${element.element.blockID}: ${element.weight}%${extra}\n`;
    });

    menu = menu
      .body(currentBlocks)
      .button("Add Block")
      .button("Remove Block")
      .button("Reset Blocks")
      .button("Go Back");

    //@ts-ignore
    menu.show(player).then((result) => {
      switch (result.selection) {
        case 0:
          this.addBlockMenu(player);
          break;
        case 1:
          this.removeBlockMenu(player);
          break;
        case 2:
          this.blocks = new WeightedElements();
          PrisonMine.update();
          this.editBlocksMenu(player);
          break;
        default:
          this.editMineMenu(player);
          break;
      }
    });
  }

  addBlockMenu(player: Player) {
    const menu = new ModalFormData()
      .title(`Add Block | Mine: ${this.name}`)
      .textField("Block ID", "Block ID", "minecraft:stone")
      .slider("Block Weight", 1, 100, 1, 50)
      .textField("Permutation Key", "Permutation Key", "undefined")
      .textField("Permutation Value", "Permutation Value", "undefined");

    //@ts-ignore
    menu.show(player).then((result) => {
      if (!result.formValues) {
        this.editBlocksMenu(player);
        return;
      }

      const block = MinecraftBlockTypes.get(result.formValues[0]);

      if (!block) {
        player.tell("Invalid Block ID");
        this.addBlockMenu(player);
        return;
      }
      const weight = result.formValues[1];

      if (this.blocks.totalWeight + weight > 100) {
        player.tell("Total weight cannot exceed 100%");
        this.addBlockMenu(player);
        return;
      }

      this.blocks.add(
        {
          blockID: block.id,
          permutation: {
            key: result.formValues[2],
            value: result.formValues[3],
          },
        },
        weight
      );
      PrisonMine.update();
      this.editBlocksMenu(player);
    });
  }

  removeBlockMenu(player: Player) {
    let menu = new ActionFormData().title(`Remove Block | Mine: ${this.name}`);

    const blocks: string[] = [];

    this.blocks.elements.forEach((element) => {
      menu = menu.button(
        `${element.element.blockID}: ${element.weight}\%\nClick to remove`
      );
      blocks.push(element.element);
    });

    menu = menu.button("Go Back");

    //@ts-ignore
    menu.show(player).then((result) => {
      if (result.selection === undefined) {
        this.editBlocksMenu(player);
        return;
      }

      if (result.selection === this.blocks.elements.length) {
        this.editBlocksMenu(player);
        return;
      }

      this.blocks.remove(blocks[result.selection]);
      PrisonMine.update();
      this.removeBlockMenu(player);
    });
  }

  settingsMenu(player: Player) {
    let form = new ModalFormData()
      .title(`Mine Settings | Mine: ${this.name}`)
      .textField(
        "Mine Refill Timer (in seconds)",
        "Set to -1 to disable",
        this.maxRefillTimer.toString()
      )
      .slider(
        "Auto-Refill Percentage | Percentage of mine left to auto-refill the mine (-1 to disable)",
        -1,
        90,
        1,
        this.refillPercent
      )
      .textField(
        "Teleport Coordinates",
        "X, Y, Z",
        `${this.teleportLoc.x}, ${this.teleportLoc.y}, ${this.teleportLoc.z}`
      );

    //@ts-ignore
    form.show(player).then((result) => {
      if (!result.formValues) {
        this.editMineMenu(player);
        return;
      }

      const refillTimer = parseInt(result.formValues[0]);
      const refillPercent = parseInt(result.formValues[1]);
      const rawTeleportCoords = result.formValues[2]
        .replace(" ", "")
        .split(",");

      const teleportCoords = {
        x: parseInt(rawTeleportCoords[0]),
        y: parseInt(rawTeleportCoords[1]),
        z: parseInt(rawTeleportCoords[2]),
      };

      if (
        isNaN(refillTimer) ||
        isNaN(refillPercent) ||
        isNaN(teleportCoords.x) ||
        isNaN(teleportCoords.y) ||
        isNaN(teleportCoords.z)
      ) {
        player.tell("Invalid Input");
        this.settingsMenu(player);
        return;
      }

      this.maxRefillTimer = refillTimer;
      this.refillTimer = refillTimer;
      this.refillPercent = refillPercent;
      this.teleportLoc = teleportCoords;
      PrisonMine.update();
      this.editMineMenu(player);
    });
  }
}
