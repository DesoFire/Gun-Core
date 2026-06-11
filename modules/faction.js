import {
  blackMarketSupplyPool,
  buildings,
  facilityRanks,
  facilityUpgradeRequirements,
  mechaFrames,
  mercenaryRanks,
} from "../data/sampleData.js";
import { getState, updateState } from "../js/state.js";
import { clamp, createId, randomItem, randomNumber } from "../js/utils.js";
import { generateArmorItem } from "./armorGenerator.js";
import { generateWeaponItem } from "./weaponGenerator.js";

export function calculateDailyUpkeep() {
  const state = getState();
  return calculateBaseUpkeep() + state.roster
    .filter((character) => character.status === "待命")
    .reduce((sum, character) => sum + identityFee(character), 0);
}

export function calculateBaseUpkeep() {
  const state = getState();
  return Object.entries(state.buildings).reduce((sum, [id, level]) => sum + calculateFacilityUpkeep(id, level), 10);
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
    if (level >= facilityRanks.length) {
      draft.log.push(`第 ${draft.day} 天：${building.name} 已达到最高 S 级。`);
      return;
    }
    const nextLevel = level + 1;
    const requirement = getFacilityRequirement(nextLevel);
    const cost = getFacilityUpgradeCost(id, level);
    if (!canUpgradeFacilityDraft(draft, nextLevel)) {
      draft.log.push(`第 ${draft.day} 天：${building.name} 暂不满足升级条件，需要 ${requirement.rank} 级许可、${requirement.reputation} 声望、第 ${requirement.day} 天后。`);
      return;
    }
    if (draft.gold < cost) return;
    draft.gold -= cost;
    draft.buildings[id] = nextLevel;
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "facility",
      title: `${building.name} ${getFacilityRankLabel(nextLevel)}`,
      status: "done",
      detail: "基地建设完成。",
    });
    draft.log.push(`第 ${draft.day} 天：${building.name} 升到了 ${getFacilityRankLabel(nextLevel)}。`);
  });
}

export function buyBlackMarketItem(kind) {
  updateState((draft) => {
    if (draft.gameStatus !== "active" || (draft.buildings.blackMarket ?? 0) <= 0) return;
    const rank = getFacilityRankLabel(draft.buildings.blackMarket ?? 0);
    const cost = getBlackMarketItemCost(kind, rank);
    if (draft.gold < cost) {
      draft.log.push(`第 ${draft.day} 天：资金不足，黑市摊主把货箱合上了。`);
      return;
    }
    const item = createBlackMarketItem(kind, rank);
    draft.gold -= cost;
    if (kind === "mecha") {
      draft.mechs.unshift(item);
    } else {
      draft.inventory.unshift(item);
    }
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "facility",
      title: "黑市采购",
      status: "done",
      detail: `购入 ${item.name}。`,
    });
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金，从 ${rank} 级黑市购入 ${item.name}。`);
  });
}

export function buyBlackMarketWeapon() {
  buyBlackMarketItem("weapon");
}

export function hospitalTreatMercenaries() {
  updateState((draft) => {
    if (draft.gameStatus !== "active" || (draft.buildings.hospital ?? 0) <= 0) return;
    const patients = draft.roster.filter((character) => character.status !== "阵亡" && (character.wound > 0 || character.stress >= 8));
    const cost = 32;
    if (patients.length === 0) {
      draft.log.push(`第 ${draft.day} 天：医院没有找到需要处理的伤员。`);
      return;
    }
    if (draft.gold < cost) {
      draft.log.push(`第 ${draft.day} 天：资金不足，医院拒绝接诊。`);
      return;
    }
    draft.gold -= cost;
    patients.forEach((character) => {
      character.wound = Math.max(0, character.wound - 1);
      character.stress = Math.max(0, character.stress - 8);
      character.hp = Math.min(character.maxHp, character.hp + 12);
    });
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "facility",
      title: "医院治疗",
      status: "done",
      detail: `${patients.length} 名佣兵恢复。`,
    });
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金，医院治疗了 ${patients.length} 名佣兵。`);
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
  draft.roster.filter((character) => character.status !== "阵亡").forEach((character) => {
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
  return calculateBaseUpkeepFromDraft(draft) + draft.roster
    .filter((character) => character.status === "待命")
    .reduce((sum, character) => sum + identityFee(character), 0);
}

function calculateBaseUpkeepFromDraft(draft) {
  return Object.entries(draft.buildings).reduce((sum, [id, level]) => sum + calculateFacilityUpkeep(id, level), 10);
}

function calculateRestAttackChanceFromDraft(draft) {
  const pressure = Math.max(0, 72 - draft.stealth);
  return clamp(Math.round(4 + pressure * 0.75), 4, 58);
}

export function getFacilityRankLabel(level) {
  if (!level || level <= 0) return "未解锁";
  return facilityRanks[Math.min(level - 1, facilityRanks.length - 1)];
}

export function getFacilityUpgradeCost(id, level) {
  const building = buildings[id];
  if (!building) return 0;
  return level <= 0 ? building.unlockCost ?? building.cost : building.cost + level * 55;
}

export function getFacilityRequirement(level) {
  return facilityUpgradeRequirements[Math.min(Math.max(level - 1, 0), facilityUpgradeRequirements.length - 1)];
}

export function canUpgradeFacility(id) {
  const state = getState();
  const nextLevel = (state.buildings[id] ?? 0) + 1;
  return nextLevel <= facilityRanks.length && canUpgradeFacilityDraft(state, nextLevel);
}

export function getBlackMarketItemCost(kind, rank) {
  const rankIndex = Math.max(0, facilityRanks.indexOf(rank));
  const base = { supplies: 26, weapon: 58, armor: 46, mecha: 150 }[kind] ?? 40;
  return base + rankIndex * (kind === "mecha" ? 45 : 14);
}

function canUpgradeFacilityDraft(draft, nextLevel) {
  const requirement = getFacilityRequirement(nextLevel);
  return draft.reputation >= requirement.reputation && draft.day >= requirement.day;
}

function calculateFacilityUpkeep(id, level) {
  if (!level || level <= 0) return 0;
  return (buildings[id]?.upkeep ?? 0) * level;
}

function createBlackMarketItem(kind, rank) {
  if (kind === "weapon") return generateWeaponItem({ rarity: rank });
  if (kind === "armor") return generateArmorItem({ rarity: rank });
  if (kind === "mecha") return createRankedMecha(rank);
  return createRankedSupply(rank);
}

function createRankedSupply(rank) {
  const item = randomItem(blackMarketSupplyPool);
  const quantity = rank === "F" ? randomNumber(2, 4) : randomNumber(4, 8);
  return {
    id: createId(),
    ...item,
    name: `${rank}级 ${item.name}`,
    rarity: rank,
    quantity,
    itemCategory: "supply",
  };
}

function createRankedMecha(rank) {
  const frame = randomItem(mechaFrames);
  return {
    id: createId(),
    ...frame,
    name: `${rank}级 ${frame.name}`,
    rarity: rank,
    condition: 100,
    maintenance: 20 + Math.max(0, facilityRanks.indexOf(rank)) * 18,
  };
}
