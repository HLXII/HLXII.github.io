class MapHelper {
    public static calculateTownCssClass(town: string): string {
        // TODO Temporary fix
        town = town.replace(' ', '_');
        town = town.replace(' ', '_');

        // TODO(@Isha) this is very weird, refactor this.
        if (App.game.keyItems.hasKeyItem(KeyItems.KeyItem[town])) {
            return 'city unlockedTown';
        }
        if (player.currentTown() == town) {
            return 'city currentTown';
        }
        if (MapHelper.accessToTown(town)) {
            // if (dungeonList.hasOwnProperty(town)) {
            //     if (player.statistics.dungeonsCleared[Statistics.getDungeonIndex(town)]()) {
            //         return 'dungeon completedDungeon';
            //     }
            //     return 'dungeon unlockedDungeon';
            // }
            return 'city unlockedTown';
        }
        // if (dungeonList.hasOwnProperty(town)) {
        //     return 'dungeon';
        // }
        return 'city';
    }

    public static accessToTown(townName: string): boolean {
        const town = TownList[townName];
        if (!town) {
            return false;
        }
        return town.isUnlocked();
    };

    public static moveToTown(townName: string) {
        // TODO Temporary fix
        townName = townName.replace(' ', '_');
        townName = townName.replace(' ', '_');

        console.log(townName);

        if (MapHelper.accessToTown(townName)) {
            App.game.gameState = GameConstants.GameState.idle;
            App.game.world.currentRoute = -1;
            player.town(TownList[townName]);
            player.currentTown(townName);
            Battle.enemyPokemon(null);
            //this should happen last, so all the values all set beforehand
            App.game.gameState = GameConstants.GameState.town;
            GameController.applyRouteBindings();
        } else {
            console.error('Move to World');
        }
    };

    public static validRoute(route = 0, region: RegionName = 0): boolean {
        return route >= GameConstants.RegionRoute[region][0] && route <= GameConstants.RegionRoute[region][1];
    }

    public static openShipModal() {
        const openModal = () => {
            $('#ShipModal').modal('show');
        };
        switch (App.game.world.currentRegion) {
            case 0:
                if (TownList['Vermillion City'].isUnlocked() && player.highestRegion() > 0) {
                    openModal();
                    return;
                }
            case 1:
                if (TownList['Olivine City'].isUnlocked()) {
                    openModal();
                    return;
                }
            case 2:
                if (TownList['Slateport City'].isUnlocked()) {
                    openModal();
                    return;
                }
        }
        Notifier.notify('You cannot access this dock yet', GameConstants.NotificationOption.warning);
    }

    public static ableToTravel() {
        return player.highestRegion() < GameConstants.MAX_AVAILABLE_REGION && App.game.party.caughtPokemon.length >= GameConstants.TotalPokemonsPerRegion[player.highestRegion()];
    }

    public static travelToNextRegion() {
        if (MapHelper.ableToTravel()) {
            player.highestRegion(player.highestRegion() + 1);
            MapHelper.moveToTown(GameConstants.StartingTowns[player.highestRegion()]);
            App.game.world.currentRegion = player.highestRegion();
        }
    }

}
