import { MinecraftDimensionTypes, world, } from "@minecraft/server";
/**
 * A wrapper class which is used to assign a weight to some arbitrary object.
 */
class WeightedElement {
    constructor(element, weight) {
        this.element = element;
        this.weight = weight;
    }
}
/**
 * A collection of weighted elements.
 * This class is used to randomly select a WeightedElement with respect to its weight.
 */
export class WeightedElements {
    constructor() {
        this.elements = [];
        this.totalWeight = 0;
    }
    add(element, weight) {
        this.elements.push(new WeightedElement(element, weight));
        this.totalWeight += weight;
        return this;
    }
    remove(element) {
        for (let i = 0; i < this.elements.length; i++) {
            if (this.elements[i].element === element) {
                this.totalWeight -= this.elements[i].weight;
                this.elements.splice(i, 1);
                break;
            }
        }
        return this;
    }
    get() {
        const random = Math.random() * this.totalWeight;
        let currentWeight = 0;
        for (let i = 0; i < this.elements.length; i++) {
            currentWeight += this.elements[i].weight;
            if (random < currentWeight) {
                return this.elements[i].element;
            }
        }
        return undefined;
    }
}
/**
 * Gets the data from the scoreboard
 * @param id The id of the data
 * @returns The data
 */
export function getData(id) {
    let scoreboard = world.scoreboard.getObjective("data");
    if (!scoreboard) {
        scoreboard = world.scoreboard.addObjective("data", "data");
    }
    let str = "";
    scoreboard.getScores().forEach((info) => {
        if (info.score === id) {
            if (!str) {
                //If the data has not yet been found, grab it
                str = info.participant.displayName;
            }
            else {
                //If the data has already been found, void the other data with that id
                world
                    .getDimension(MinecraftDimensionTypes.overworld)
                    .runCommandAsync(`scoreboard players reset "${info.participant.displayName}" data`);
            }
        }
    });
    return uncleanData(str);
}
/**
 * Sets the data in the scoreboard
 * @param id The id of the data
 * @param data The data
 */
export function setData(id, data) {
    data = cleanData(data);
    let scoreboard = world.scoreboard.getObjective("data");
    if (!scoreboard) {
        scoreboard = world.scoreboard.addObjective("data", "data");
    }
    scoreboard.getScores().forEach((info) => {
        if (info.score === id && info.participant.displayName !== data) {
            world
                .getDimension(MinecraftDimensionTypes.overworld)
                .runCommandAsync(`scoreboard players reset "${info.participant.displayName}" data`);
        }
    });
    world
        .getDimension(MinecraftDimensionTypes.overworld)
        .runCommandAsync(`scoreboard players set "${data}" data ${id}`);
}
export function cleanData(str) {
    return str.replace(/"/g, "�");
}
export function uncleanData(str) {
    return str.replace(/�/g, '"');
}
