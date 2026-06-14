import { wealthCollections } from "../data/sampleData.js";
import { getState, updateState } from "../js/state.js";

export function getWealthCollections() {
  const state = getState();
  return wealthCollections.map((room) => ({
    ...room,
    items: room.items.map((item) => ({ ...item, owned: Boolean(state.wealth?.owned?.[item.id]) })),
  }));
}

export function getWealthProgress(state = getState()) {
  const total = wealthCollections.reduce((sum, room) => sum + room.items.length, 0);
  const owned = wealthCollections.reduce(
    (sum, room) => sum + room.items.filter((item) => state.wealth?.owned?.[item.id]).length,
    0
  );
  const spent = wealthCollections.reduce(
    (sum, room) => sum + room.items.filter((item) => state.wealth?.owned?.[item.id]).reduce((roomSum, item) => roomSum + item.cost, 0),
    0
  );
  return { owned, total, spent, complete: total > 0 && owned >= total };
}

export function buyWealthItem(itemId) {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    draft.wealth ??= { owned: {} };
    if (draft.wealth.owned?.[itemId]) return;

    const item = wealthCollections.flatMap((room) => room.items).find((entry) => entry.id === itemId);
    if (!item || draft.gold < item.cost) return;

    draft.gold -= item.cost;
    draft.wealth.owned[item.id] = { day: draft.day, cost: item.cost };
    draft.log.push(`第 ${draft.day} 天：私人收藏室新增「${item.name}」，花费 ${item.cost} 金。`);
    if (getWealthProgress(draft).complete) {
      draft.gameStatus = "won";
      draft.log.push(`第 ${draft.day} 天：收藏室全部填满。战争财完成私人化，短局胜利。`);
    }
  });
}
