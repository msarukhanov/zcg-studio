import { AppState, getActiveMap, getTileFromState } from '../shared/GameState.js';


export class VisionManager {
    constructor() {
        // Никакого Prop Drilling!
    }

    updateFogOfWar() {
        // Зачищаем глобальный стейт видимости в реальном времени
        AppState.play.visibleTiles.clear();

        const hexMath = AppState.engine.hexMath;
        const activeMap = getActiveMap();
        const playerFaction = AppState.player.faction;

        // Перебираем ВСЕХ персонажей в стейте, ищем тех, кто принадлежит игроку
        Object.keys(AppState.entities).forEach(charId => {
            const char = AppState.entities[charId];
            if (char.faction !== playerFaction || char.mapId !== AppState.map.mapId) return;

            const startTile = getTileFromState(char.mapPosition.q, char.mapPosition.r);
            if (!startTile) return;

            // Саму клетку под ногами видно всегда
            AppState.play.visibleTiles.add(`${char.mapPosition.q},${char.mapPosition.r}`);
            AppState.player.exploredTiles.add(`${char.mapPosition.q},${char.mapPosition.r}`);

            // Опрашиваем карту вокруг
            activeMap.tiles.forEach(targetTile => {
                const distance = hexMath.getDistance(char.mapPosition, targetTile);
                if (distance > char.vision?.current || distance === 0) return;

                if (this.checkLineOfSight(startTile, targetTile)) {
                    AppState.play.visibleTiles.add(`${targetTile.q},${targetTile.r}`);
                    AppState.player.exploredTiles.add(`${targetTile.q},${targetTile.r}`);
                }
            });
        });
    }

    checkLineOfSight(startTile, targetTile) {
        const hexMath = AppState.engine.hexMath;
        const lineCoords = hexMath.getHexLine(startTile, targetTile);
        let currentTile = startTile;

        for (let i = 1; i < lineCoords.length; i++) {
            const coord = lineCoords[i];
            const nextTile = getTileFromState(coord.q, coord.r);

            if (!nextTile) return false;

            const isTarget = (nextTile.q === targetTile.q && nextTile.r === targetTile.r);

            // =========================================================================
            // ⛰️ 1. ПРОВЕРКА ПЕРЕПАДА ВЫСОТ (Исправлено: холм виден, скрыто то, что за ним)
            // =========================================================================
            if (nextTile.height - currentTile.height > 0.5) {
                // Крутой склон блокирует обзор. Мы увидим эту вершину, только если она и есть наша цель (isTarget === true)
                return isTarget;
            }

            // 2. ПРОВЕРКА ЛАНДШАФТА (Скала, лес)
            const terrainConfig = AppState.ConfigTerrain[nextTile.type];
            if (terrainConfig && terrainConfig.blocksVisibility) {
                return isTarget;
            }

            // 3. ПРОВЕРКА ИНТЕРАКТИВНЫХ ОБЪЕКТОВ (Стены, руины)
            for (const char of Object.values(AppState.entities)) {
                if (char && char.mapPosition && char.mapPosition.q === nextTile.q && char.mapPosition.r === nextTile.r) {
                    if (char.blocksVisibility === true) {
                        return isTarget;
                    }
                }
            }

            currentTile = nextTile;
        }
        return true;
    }



    checkLineOfSight222(startTile, targetTile) {
        const hexMath = AppState.engine.hexMath;
        const lineCoords = hexMath.getHexLine(startTile, targetTile);
        let currentTile = startTile;

        for (let i = 1; i < lineCoords.length; i++) {
            const coord = lineCoords[i];
            const nextTile = getTileFromState(coord.q, coord.r);

            if (!nextTile) return false;

            // Если перепад высот слишком большой — зрение блокируется
            if (nextTile.height - currentTile.height > 0.5) return false;

            const isTarget = (nextTile.q === targetTile.q && nextTile.r === targetTile.r);

            if (!isTarget) {
                // Проверка ландшафта (например, горы/леса)
                const terrainConfig = AppState.ConfigTerrain[nextTile.type];
                if (terrainConfig && terrainConfig.blocksVisibility) return false;

                // СТРОГИЙ ФИКС: Используем цикл for...of для объектов. Он честно прервет метод через return!
                for (const char of Object.values(AppState.entities)) {
                    if (char && char.mapPosition && char.mapPosition.q === nextTile.q && char.mapPosition.r === nextTile.r) {
                        if (char.blocksVisibility === true) {
                            return false; // Теперь этот return мгновенно прервет весь метод!
                        }
                    }
                }
            }
            currentTile = nextTile;
        }
        return true;
    }
}
