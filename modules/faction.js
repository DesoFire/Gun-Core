import {
  blackMarketSupplyPool,
  buildings,
  facilityRanks,
  facilityUpgradeRequirements,
  mechaFrames,
  mercenaryRanks,
} from "../data/sampleData.js";
import { economyConfig } from "../data/economyConfig.js";
import { getState, updateState } from "../js/state.js";
import { clamp, createId, randomItem, randomNumber } from "../js/utils.js";
import { generateArmorItem } from "./armorGenerator.js";
import { generateWeaponItem } from "./weaponGenerator.js";

export function calculateDailyUpkeep() {
  return calculateDailyExpenseBreakdown().total;
}

export function calculateBaseUpkeep() {
  return calculateDailyExpenseBreakdown().facilities.total + calculateDailyExpenseBreakdown().base.total;
}

export function calculateDailyExpenseBreakdown(state = getState()) {
  return calculateDailyExpenseBreakdownFromDraft(state);
}

export function calculateDailyExpenseBreakdownFromDraft(draft) {
  const livingRoster = draft.roster.filter((character) => character.status !== "阵亡");
  const wageItems = livingRoster
    .filter((character) => character.status === "待命")
    .map((character) => ({
      id: character.id,
      name: character.name,
      rank: calculateRank(character),
      status: character.status,
      cost: identityFee(character),
    }));
  const supplyItems = livingRoster.map((character) => ({
    id: character.id,
    name: character.name,
    rank: calculateRank(character),
    status: character.status,
    cost: calculateLivingSupplyCost(character),
  }));
  const equipmentItems = livingRoster.flatMap((character) =>
    Object.entries(character.equipment ?? {})
      .filter(([, item]) => item && (item.itemCategory === "weapon" || item.itemCategory === "armor" || item.slot === "weapon" || item.slot === "armor"))
      .map(([slot, item]) => ({
        id: item.id,
        characterId: character.id,
        characterName: character.name,
        slot,
        slotLabel: slot === "weapon" ? "武器" : "防具",
        itemName: item.name,
        rarity: item.rarity ?? "F",
        type: item.damageType ?? item.protectionType ?? item.type ?? "未知",
        cost: calculateEquipmentMaintenanceCost(item),
      }))
  );
  const facilityItems = Object.entries(draft.buildings)
    .filter(([, level]) => level > 0)
    .map(([id, level]) => ({
      id,
      name: buildings[id]?.name ?? id,
      level,
      rank: getFacilityRankLabel(level),
      cost: calculateFacilityUpkeep(id, level),
    }));
  const baseCost = economyConfig.dailyExpenses.baseUpkeep;
  const base = { total: baseCost, items: [{ id: "base", name: "基地基础开销", cost: baseCost }] };
  const wages = { total: sumCosts(wageItems), items: wageItems };
  const supplies = { total: sumCosts(supplyItems), items: supplyItems };
  const equipment = { total: sumCosts(equipmentItems), items: equipmentItems };
  const facilities = { total: sumCosts(facilityItems), items: facilityItems };
  return {
    total: base.total + wages.total + supplies.total + equipment.total + facilities.total,
    base,
    wages,
    supplies,
    equipment,
    facilities,
  };
}

export function identityFee(character) {
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(character.rank));
  const config = economyConfig.dailyExpenses.wages;
  return config.base + rankIndex * config.perRank + character.notoriety * config.perNotoriety + (character.isPlayer ? config.playerBonus : 0);
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
    if (draft.gold < cost) return;
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
    const cost = economyConfig.facilities.hospitalTreatCost;
    if (patients.length === 0) {
      draft.log.push(`第 ${draft.day} 天：医疗中心没有找到需要处理的伤病佣兵。`);
      return;
    }
    if (draft.gold < cost) return;
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
      title: "医疗中心治疗",
      status: "done",
      detail: `${patients.length} 名佣兵恢复。`,
    });
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金，医疗中心治疗了 ${patients.length} 名佣兵。`);
  });
}

export function payDailyUpkeep(draft) {
  const breakdown = calculateDailyExpenseBreakdownFromDraft(draft);
  const cost = breakdown.total;
  if (cost <= 0) return;

  if (draft.gold >= cost) {
    draft.gold -= cost;
    draft.log.push(`第 ${draft.day} 天：支付基地每日支出 ${cost} 金。`);
    return;
  }

  const shortage = cost - draft.gold;
  draft.gold = 0;
  const shortageConfig = economyConfig.dailyExpenses.shortage;
  const stealthLoss = clamp(
    Math.ceil(shortage / shortageConfig.divisor) + shortageConfig.baseLoss,
    shortageConfig.minLoss,
    shortageConfig.maxLoss
  );
  draft.stealth = clamp(draft.stealth - stealthLoss, 0, 100);
  draft.roster.filter((character) => character.status !== "阵亡").forEach((character) => {
    character.stress += shortageConfig.stress;
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
    character.stress += randomNumber(economyConfig.restAttack.woundStressMin, economyConfig.restAttack.woundStressMax);
    character.hp = Math.max(1, character.hp - randomNumber(2, 6));
  });

  const attackConfig = economyConfig.restAttack;
  const loss = Math.min(draft.gold, randomNumber(attackConfig.goldLossMin, attackConfig.goldLossMax));
  draft.gold -= loss;
  draft.stealth = clamp(draft.stealth - randomNumber(attackConfig.stealthLossMin, attackConfig.stealthLossMax), 0, 100);

  const damageText =
    casualties.length > 0 ? `${casualties.map((character) => character.name).join("、")} 受伤` : "基地外围设施受损";
  draft.log.push(`第 ${draft.day} 天：休整期遭到不明势力袭击，${damageText}，损失 ${loss} 金。`);
}

export function calculateRank(character) {
  return mercenaryRanks.includes(character.rank) ? character.rank : "无";
}

function calculateRestAttackChanceFromDraft(draft) {
  const config = economyConfig.restAttack;
  const pressure = Math.max(0, config.triggerStealth - draft.stealth);
  return clamp(Math.round(config.baseChance + pressure * config.pressureMultiplier), config.minChance, config.maxChance);
}

export function getFacilityRankLabel(level) {
  if (!level || level <= 0) return "未解锁";
  return facilityRanks[Math.min(level - 1, facilityRanks.length - 1)];
}

export function getFacilityUpgradeCost(id, level) {
  const building = buildings[id];
  if (!building) return 0;
  return level <= 0 ? building.unlockCost ?? building.cost : building.cost + level * economyConfig.facilities.upgradePerCurrentLevel;
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
  const base = economyConfig.blackMarket.baseCost[kind] ?? economyConfig.blackMarket.baseCost.fallback;
  const perRank = economyConfig.blackMarket.perRank[kind] ?? economyConfig.blackMarket.perRank.fallback;
  return base + rankIndex * perRank;
}

function canUpgradeFacilityDraft(draft, nextLevel) {
  const requirement = getFacilityRequirement(nextLevel);
  return draft.reputation >= requirement.reputation && draft.day >= requirement.day;
}

function calculateFacilityUpkeep(id, level) {
  if (!level || level <= 0) return 0;
  return (buildings[id]?.upkeep ?? 0) * level;
}

function calculateLivingSupplyCost(character) {
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(calculateRank(character)));
  const config = economyConfig.dailyExpenses.livingSupplies;
  return config.base + Math.ceil(rankIndex / config.rankDivisor);
}

function calculateEquipmentMaintenanceCost(item) {
  const rankIndex = Math.max(0, facilityRanks.indexOf(item.rarity ?? "F"));
  const config = economyConfig.dailyExpenses.equipmentMaintenance;
  const base = item.itemCategory === "weapon" || item.slot === "weapon" ? config.weaponBase : config.armorBase;
  return base + rankIndex * config.perRank;
}

function sumCosts(items) {
  return items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
}

function createBlackMarketItem(kind, rank) {
  if (kind === "weapon") return generateWeaponItem({ rarity: rank });
  if (kind === "armor") return generateArmorItem({ rarity: rank });
  if (kind === "mecha") return createRankedMecha(rank);
  return createRankedSupply(rank);
}

function createRankedSupply(rank) {
  const item = randomItem(blackMarketSupplyPool);
  const quantityRange = rank === "F" ? economyConfig.blackMarket.supplyQuantityLowRank : economyConfig.blackMarket.supplyQuantityHighRank;
  const quantity = randomNumber(...quantityRange);
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
