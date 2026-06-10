import { getState, updateState } from "../js/state.js";

export function getInventory() {
  return getState().inventory;
}

export function getInventoryBySlot(slot) {
  return getState().inventory.filter((item) => item.slot === slot);
}

export function getInventoryItem(id) {
  return getState().inventory.find((item) => item.id === id);
}

export function addInventoryItem(item, source = "仓库") {
  updateState((draft) => {
    draft.inventory.unshift(item);
    draft.log.push(`第 ${draft.day} 天：${source}获得 ${item.name}。`);
  });
}

export function removeInventoryItem(itemId) {
  let removed = null;
  updateState((draft) => {
    removed = draft.inventory.find((item) => item.id === itemId) ?? null;
    draft.inventory = draft.inventory.filter((item) => item.id !== itemId);
  });
  return removed;
}
