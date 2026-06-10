import { buildings, mercenaryRanks } from "../data/sampleData.js";
import { getState, updateState } from "../js/state.js";
import { clamp, createId, randomNumber } from "../js/utils.js";

export function calculateDailyUpkeep() {
  const state = getState();
  return calculateBaseUpkeep() + state.roster.reduce((sum, character) => sum + identityFee(character), 0);
}

export function calculateBaseUpkeep() {
  const state = getState();
  return Object.entries(state.buildings).reduce((sum, [id, level]) => sum + (buildings[id]?.upkeep ?? 0) * level, 10);
}

export function identityFee(character) {
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(character.rank));
  return 3 + rankIndex * 2 + character.notoriety * 2 + (character.isPlayer ? 2 : 0);
}

export function calculateRestAttackChance() {
  const pressure = Math.max(0, 72 - getState().stealth);
  return clamp(Math.round(4 + pressure * 0.75), 4, 58);
}

export function upgradeBuilding(id) {
  updateState((draft) => {
    const building = buildings[id];
    if (!building) return;
    const level = draft.buildings[id] ?? 0;
    const cost = building.cost + level * 45;
    if (draft.gold < cost) return;
    draft.gold -= cost;
    draft.buildings[id] = level + 1;
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "facility",
      title: `${building.name} Lv.${draft.buildings[id]}`,
      status: "done",
      detail: "基地建设完成。",
    });
    draft.log.push(`第 ${draft.day} 天：${building.name} 升到了 Lv.${draft.buildings[id]}。`);
  });
}

export function payDailyUpkeep(draft) {
  const cost = calculateDailyUpkeepFromDraft(draft);
  if (cost <= 0) return;

  if (draft.gold >= cost) {
    draft.gold -= cost;
    draft.log.push(`第 ${draft.day} 天：支付基地维护与身份伪装费用 ${cost} 金。`);
    return;
  }

  const shortage = cost - draft.gold;
  draft.gold = 0;
  const stealthLoss = clamp(Math.ceil(shortage / 4) + 5, 5, 22);
  draft.stealth = clamp(draft.stealth - stealthLoss, 0, 100);
  draft.roster.forEach((character) => {
    character.stress += 1;
  });
  draft.log.push(`第 ${draft.day} 天：维护费用缺口 ${shortage} 金，假身份链条开始漏风。隐秘值下降 ${stealthLoss}。`);
}

export function resolveRestAttack(draft) {
  const chance = calculateRestAttackChanceFromDraft(draft);
  if (chance <= 0 || randomNumber(1, 100) > chance) return;

  const available = draft.roster.filter((character) => character.status === "待命");
  const casualtyCount = available.length > 0 ? randomNumber(1, Math.min(2, available.length)) : 0;
  const casualties = available.sort(() => Math.random() - 0.5).slice(0, casualtyCount);
  casualties.forEach((character) => {
    character.wound += 1;
    character.stress += randomNumber(4, 8);
    character.hp = Math.max(1, character.hp - randomNumber(2, 6));
  });

  const loss = Math.min(draft.gold, randomNumber(12, 32));
  draft.gold -= loss;
  draft.stealth = clamp(draft.stealth - randomNumber(3, 8), 0, 100);

  const damageText =
    casualties.length > 0 ? `${casualties.map((character) => character.name).join("、")} 受伤` : "基地外围设施受损";
  draft.log.push(`第 ${draft.day} 天：休整期遭到不明势力袭击，${damageText}，损失 ${loss} 金。`);
}

export function calculateRank(character) {
  return mercenaryRanks.includes(character.rank) ? character.rank : "无";
}

export function addVariance(stats) {
  return Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, Math.max(1, value + randomNumber(-1, 1))]));
}

function calculateDailyUpkeepFromDraft(draft) {
  return calculateBaseUpkeepFromDraft(draft) + draft.roster.reduce((sum, character) => sum + identityFee(character), 0);
}

function calculateBaseUpkeepFromDraft(draft) {
  return Object.entries(draft.buildings).reduce((sum, [id, level]) => sum + (buildings[id]?.upkeep ?? 0) * level, 10);
}

function calculateRestAttackChanceFromDraft(draft) {
  const pressure = Math.max(0, 72 - draft.stealth);
  return clamp(Math.round(4 + pressure * 0.75), 4, 58);
}
