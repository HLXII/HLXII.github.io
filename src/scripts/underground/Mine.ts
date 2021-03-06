/// <reference path="../../declarations/GameHelper.d.ts" />

class Mine {
    public static sizeX = 25;
    public static sizeY = 12;
    public static maxSkips = 5;
    public static grid: Array<Array<KnockoutObservable<number>>>;
    public static rewardGrid: Array<Array<any>>;
    public static itemsFound: KnockoutObservable<number> = ko.observable(0);
    public static itemsBuried: KnockoutObservable<number> = ko.observable(0);
    public static rewardNumbers: Array<number>;
    public static prospectResult = ko.observable(null);
    public static skipsRemaining = ko.observable(Mine.maxSkips)

    // 0 represents the Mine.Tool.Chisel but it's not loaded here yet.
    public static toolSelected: KnockoutObservable<Mine.Tool> = ko.observable(0);
    private static loadingNewLayer = true

    public static loadMine() {
        const tmpGrid = [];
        const tmpRewardGrid = [];
        Mine.rewardNumbers = [];
        Mine.itemsBuried(0);
        Mine.prospectResult(null);
        for (let i = 0; i < this.sizeY; i++) {
            const row = [];
            const rewardRow = [];
            for (let j = 0; j < this.sizeX; j++) {
                row.push(ko.observable(Math.min(5, Math.max(1, Math.floor(Math.random() * 2 + Math.random() * 3) + 1))));
                rewardRow.push(0);
            }
            tmpGrid.push(row);
            tmpRewardGrid.push(rewardRow);
        }
        Mine.grid = tmpGrid;
        Mine.rewardGrid = tmpRewardGrid;

        for (let i = 0; i < App.game.underground.getMaxItems(); i++) {
            const item = UndergroundItem.getRandomItem();
            const x = Mine.getRandomCoord(this.sizeX, item.space[0].length);
            const y = Mine.getRandomCoord(this.sizeY, item.space.length);
            const res = Mine.canAddReward(x, y, item);
            if (res) {
                Mine.addReward(x, y, item);
            }
        }
        Mine.loadingNewLayer = false;
        Mine.itemsFound(0);

        Underground.showMine();
    }

    private static getRandomCoord(max: number, size: number): number {
        return Math.floor(Math.random() * (max - size - 1)) + 1;
    }

    private static canAddReward(x: number, y: number, reward: UndergroundItem): boolean {
        if (Mine.alreadyHasRewardId(reward.id)) {
            return false;
        }
        if (y + reward.space.length >= this.sizeY || x + reward.space[0].length >= this.sizeX) {
            return false;
        }
        for (let i = 0; i < reward.space.length; i++) {
            for (let j = 0; j < reward.space[i].length; j++) {
                if (reward.space[i][j] !== 0) {
                    if (Mine.rewardGrid[i + y][j + x] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    private static alreadyHasRewardId(id: number): boolean {
        for (const row of Mine.rewardGrid) {
            for (const item of row) {
                if (item.value === id) {
                    return true;
                }
            }
        }
        return false;
    }

    private static addReward(x: number, y: number, reward: UndergroundItem) {
        for (let i = 0; i < reward.space.length; i++) {
            for (let j = 0; j < reward.space[i].length; j++) {
                if (reward.space[i][j] !== 0) {
                    Mine.rewardGrid[i + y][j + x] = {
                        sizeX: reward.space[i].length,
                        sizeY: reward.space.length,
                        x: j,
                        y: i,
                        value: reward.space[i][j] ? reward.id : 0,
                        revealed: 0,
                    };
                }
            }
        }
        GameHelper.incrementObservable(Mine.itemsBuried);
        Mine.rewardNumbers.push(reward.id);
    }

    public static prospect() {
        if (Mine.prospectResult()) {
            $('#mine-prospect-result').tooltip('show');
            setTimeout(() => $('#mine-prospect-result').tooltip('hide'), 4000);
            return;
        }

        if (App.game.underground.energy < Underground.PROSPECT_ENERGY) {
            return;
        }

        App.game.underground.energy -= Underground.PROSPECT_ENERGY;

        const rewards = Mine.rewardSummary();
        Mine.updateProspectResult(rewards);
    }

    private static rewardSummary() {
        return Mine.rewardNumbers.reduce((res, id) => {
            const reward = UndergroundItem.list.find(x => x.id == id);

            if (ItemList[reward.valueType]) {
                res.evoItems++;
            } else {
                switch (reward.valueType) {
                    case 'Diamond': {
                        res.totalValue += reward.value;
                        break;
                    }
                    case 'Mine Egg': {
                        res.fossils++;
                        break;
                    }
                    default: {
                        res.plates++;
                    }
                }
            }

            return res;
        }, {fossils: 0, plates: 0, evoItems: 0, totalValue: 0});
    }

    private static updateProspectResult(summary) {
        const text = [];
        if (summary.fossils) {
            text.push(`Fossils: ${summary.fossils}`);
        }
        if (summary.evoItems) {
            text.push(`Evolution Items: ${summary.evoItems}`);
        }
        if (summary.plates) {
            text.push(`Shard Plates: ${summary.plates}`);
        }
        text.push(`Diamond Value: ${summary.totalValue}`);

        Mine.prospectResult(text.join('<br>'));
        $('#mine-prospect-result').tooltip('show');
        setTimeout(() => $('#mine-prospect-result').tooltip('hide'), 2000);
    }

    public static click(i: number, j: number) {
        if (Mine.toolSelected() == Mine.Tool.Hammer) {
            Mine.hammer(i, j);
        } else {
            Mine.chisel(i, j);
        }
    }

    private static hammer(x: number, y: number) {
        if (App.game.underground.energy >= Underground.HAMMER_ENERGY) {
            if (x < 0 || y < 0) {
                return;
            }
            let hasMined = false;
            for (let i = -1; i < 2; i++) {
                for (let j = -1; j < 2; j++) {
                    if (Mine.grid[Mine.normalizeY(x + i)][Mine.normalizeX(y + j)]() > 0) {
                        hasMined = true;
                    }
                    this.breakTile(x + i, y + j, 1);
                }
            }
            if (hasMined) {
                App.game.underground.energy -= Underground.HAMMER_ENERGY;
            }
        }
    }

    private static chisel(x: number, y: number) {
        if (Mine.grid[x][y]() > 0) {
            if (App.game.underground.energy >= Underground.CHISEL_ENERGY) {
                this.breakTile(x, y, 2);
                App.game.underground.energy -= Underground.CHISEL_ENERGY;
            }
        }
    }

    private static bomb() {
        const tiles = App.game.underground.getBombEfficiency();
        if (App.game.underground.energy >= Underground.BOMB_ENERGY) {
            for (let i = 1; i < tiles; i++) {
                const x = GameConstants.randomIntBetween(1, this.sizeY - 2);
                const y = GameConstants.randomIntBetween(1, this.sizeX - 2);
                this.breakTile(x, y, 2);
            }

            App.game.underground.energy -= Underground.BOMB_ENERGY;
        }
    }

    private static skipLayer(shouldConfirm = true): boolean {
        if (!this.skipsRemaining()) {
            return false;
        }

        if (!shouldConfirm || confirm('Skip this mine layer?')) {
            setTimeout(Mine.completed, 1500);
            Mine.loadingNewLayer = true;
            GameHelper.incrementObservable(this.skipsRemaining, -1);
            return true;
        }
    }

    private static breakTile(_x: number, _y: number, layers = 1) {
        const x = Mine.normalizeY(_x);
        const y = Mine.normalizeX(_y);
        const newlayer = Math.max(0, Mine.grid[x][y]() - layers);

        Mine.grid[x][y](newlayer);

        const reward = Mine.rewardGrid[x][y];
        if (newlayer == 0 && reward != 0 && reward.revealed != 1) {
            reward.revealed = 1;
            const image = Underground.getMineItemById(reward.value).undergroundImage;
            $(`div[data-i=${x}][data-j=${y}]`).html(`<div class="mineReward size-${reward.sizeX}-${reward.sizeY} pos-${reward.x}-${reward.y}" style="background-image: url('${image}');"></div>`);
            Mine.checkItemsRevealed();
        }
    }

    private static normalizeX(x: number): number {
        return Math.min(this.sizeX - 1, Math.max(0, x));
    }

    private static normalizeY(y: number): number {
        return Math.min(this.sizeY - 1, Math.max(0, y));
    }

    public static checkItemsRevealed() {
        for (let i = 0; i < Mine.rewardNumbers.length; i++) {
            if (Mine.checkItemRevealed(Mine.rewardNumbers[i])) {
                Underground.gainMineItem(Mine.rewardNumbers[i]);
                const itemName = Underground.getMineItemById(Mine.rewardNumbers[i]).name;
                Notifier.notify({
                    message: `You found ${GameHelper.anOrA(itemName)} ${GameConstants.humanifyString(itemName)}`,
                    type: NotificationConstants.NotificationOption.success,
                });
                Mine.itemsFound(Mine.itemsFound() + 1);
                GameHelper.incrementObservable(App.game.statistics.undergroundItemsFound);
                Mine.rewardNumbers.splice(i, 1);
                i--;
                Mine.checkCompleted();
            }
        }
    }

    public static checkItemRevealed(id: number) {
        for (let i = 0; i < this.sizeX; i++) {
            for (let j = 0; j < this.sizeY; j++) {
                if (Mine.rewardGrid[j][i] != 0) {
                    if (Mine.rewardGrid[j][i].value == id) {
                        if (Mine.rewardGrid[j][i].revealed === 0) {
                            return false;
                        }
                    }
                }
            }
        }
        App.game.oakItems.use(OakItems.OakItem.Cell_Battery);
        return true;
    }

    public static checkCompleted() {
        if (Mine.itemsFound() >= Mine.itemsBuried()) {
            // Don't resolve queued up calls to checkCompleted() until completed() is finished and sets loadingNewLayer to false
            if (Mine.loadingNewLayer == true) {
                return;
            }
            Mine.loadingNewLayer = true;
            setTimeout(Mine.completed, 1500);
            GameHelper.incrementObservable(App.game.statistics.undergroundLayersMined);

            if (this.skipsRemaining() < this.maxSkips) {
                GameHelper.incrementObservable(this.skipsRemaining);
            }
        }
    }

    private static completed() {
        Notifier.notify({
            message: 'You dig deeper...',
            type: NotificationConstants.NotificationOption.info,
        });
        ko.cleanNode(document.getElementById('mineBody'));
        Mine.loadMine();
        ko.applyBindings(null, document.getElementById('mineBody'));
    }

    public static loadSavedMine(mine) {
        this.grid = mine.grid.map(row => row.map(val => ko.observable(val))),
        this.rewardGrid = mine.rewardGrid;
        this.itemsFound(mine.itemsFound);
        this.itemsBuried(mine.itemsBuried);
        this.rewardNumbers = mine.rewardNumbers;
        this.loadingNewLayer = false;
        this.prospectResult(mine.prospectResult ?? this.prospectResult());
        this.skipsRemaining(mine.skipsRemaining ?? this.maxSkips);

        Underground.showMine();
        // Check if completed in case the mine was saved after completion and before creating a new mine
        // TODO: Remove setTimeout after TypeScript module migration is complete. Needed so that `App.game` is available
        setTimeout(Mine.checkCompleted, 0);
    }

    public static save(): Record<string, any> {
        if (this.grid == null) {
            Mine.loadMine();
        }
        const mineSave = {
            grid: this.grid.map(row => row.map(val => val())),
            rewardGrid: this.rewardGrid,
            itemsFound: this.itemsFound(),
            itemsBuried: this.itemsBuried(),
            rewardNumbers: this.rewardNumbers,
            prospectResult: this.prospectResult(),
            skipsRemaining: this.skipsRemaining(),
        };
        return mineSave;
    }
}

namespace Mine {
    export enum Tool {
        'Chisel' = 0,
        'Hammer' = 1,
    }
}
