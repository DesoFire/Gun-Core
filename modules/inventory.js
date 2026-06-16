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

export function getItemSellValue(item) {
  if (!item || !isRecoverableEquipment(item)) return 0;
  const originalPrice = item.purchasePrice ?? item.originalPrice ?? estimateEquipmentOriginalPrice(item);
  return Math.max(1, Math.floor(originalPrice * 0.5));
}

export function sellInventoryItem(itemId) {
  let result = { ok: false, item: null, value: 0 };
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const item = draft.inventory.find((entry) => entry.id === itemId) ?? null;
    if (!item || !isRecoverableEquipment(item)) return;
    const value = getItemSellValue(item);
    draft.inventory = draft.inventory.filter((entry) => entry.id !== itemId);
    draft.gold += value;
    draft.log.push(`第 ${draft.day} 天：回收 ${item.name}，获得 ${value} 金。`);
    result = { ok: true, item, value };
  });
  return result;
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

function isRecoverableEquipment(item) {
  return item.itemCategory === "weapon" || item.itemCategory === "armor" || item.slot === "weapon" || item.slot === "armor";
}

function estimateEquipmentOriginalPrice(item) {
  const rankIndex = Math.max(0, ["F", "E", "D", "C", "B", "A", "S"].indexOf(item.rarity ?? "F"));
  if (item.itemCategory === "weapon" || item.slot === "weapon") return 58 + rankIndex * 14;
  if (item.itemCategory === "armor" || item.slot === "armor") return 46 + rankIndex * 14;
  return 10;
}
