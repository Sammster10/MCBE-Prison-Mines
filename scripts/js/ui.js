import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { PrisonMine, getMaxPos, getMinPos } from "./mine";
import { WeightedElements, setData } from "./utils";
import { refillStallMS, setRefillStallMS } from "./index";
export function minesMenu(player) {
    let form = new ActionFormData().title("Mines").body("Select a mine to edit");
    form = form.button("Create New Mine");
    const mines = [];
    Object.keys(PrisonMine.data).forEach((key) => {
        const mine = PrisonMine.data[key];
        mines.push(mine);
        form = form.button(`Manage Mine:\n${mine.name}`);
    });
    form = form.button("Global Settings");
    //@ts-ignore
    form.show(player).then((response) => {
        if (response.selection === 0) {
            createMine(player);
            return;
        }
        else if (response.selection === mines.length + 1) {
            globalSettingsMenu(player);
            return;
        }
        else if (response.selection !== undefined) {
            mines[response.selection - 1].editMineMenu(player);
            return;
        }
    });
}
function createMine(player) {
    let form = new ModalFormData()
        .title("Create New Mine")
        .textField("Mine Name", "Mine Name")
        .textField("Mine Coordinates (x1, y1, z1, x2, y2, z2)", "X1, Y1, Z1, X2, Y2, Z2");
    //@ts-ignore
    form.show(player).then((response) => {
        if (!response.formValues ||
            !response.formValues[0] ||
            !response.formValues[1])
            return;
        const mineName = response.formValues[0];
        if (PrisonMine.data[mineName]) {
            player.tell(`Mine already exists`);
            minesMenu(player);
            return;
        }
        else if (mineName.length > 20) {
            player.tell(`Mine name too long`);
            minesMenu(player);
            return;
        }
        else if (mineName.length < 1) {
            player.tell(`Mine name too short`);
            minesMenu(player);
            return;
        }
        else if (!/^[a-zA-Z0-9_ -]+$/.test(mineName)) {
            player.tell(`Mine name contains invalid characters`);
            minesMenu(player);
            return;
        }
        const mineCoordsStrs = response.formValues[1].replace(" ", "").split(",");
        if (mineCoordsStrs.length !== 6) {
            player.tell(`Invalid coordinates ${mineCoordsStrs}`);
            minesMenu(player);
            return;
        }
        const mineCoords = mineCoordsStrs.map((str) => parseInt(str));
        let pos1 = {
            x: mineCoords[0],
            y: mineCoords[1],
            z: mineCoords[2],
        };
        let pos2 = {
            x: mineCoords[3],
            y: mineCoords[4],
            z: mineCoords[5],
        };
        const min = getMinPos(pos1, pos2);
        const max = getMaxPos(pos1, pos2);
        //calc total area
        const area = Math.abs(1 + min.x - max.x) *
            Math.abs(1 + min.y - max.y) *
            Math.abs(1 + min.z - max.z);
        if (area > 5000000) {
            player.tell(`Mine too large`);
            minesMenu(player);
            return;
        }
        const mine = new PrisonMine(mineName, min, max, new WeightedElements());
        player.tell(`Created mine: ${mine.name}`);
        mine.register();
        minesMenu(player);
    });
}
function globalSettingsMenu(player) {
    let form = new ModalFormData()
        .title("Global Settings")
        .slider("Mine refill stalling:\nPercentage of each tick to allocate to refilling mines. \nNote: Higher values may cause lag.\nPercentage of tick", 20, 90, 5, (refillStallMS / 50) * 100);
    //@ts-ignore
    form.show(player).then((response) => {
        if (!response.formValues) {
            minesMenu(player);
            return;
        }
        const refillStalling = response.formValues[0];
        if (refillStalling < 20 || refillStalling > 90) {
            player.tell(`Invalid value`);
            minesMenu(player);
            return;
        }
        setRefillStallMS((refillStalling / 100) * 50);
        setData(2, refillStallMS + "");
    });
}
