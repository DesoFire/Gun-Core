import {
  blackMarketSupplyPool,
  buildings,
  facilityRanks,
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

export function calculateDailySupplyConsumption(state = getState()) {
  return (state.roster ?? [])
    .filter((character) => character.status !== "阵亡")
    .reduce((sum, character) => sum + calculateLivingSupplyCost(character), 0);
}

export function isSecrecyBillingDay(day = getState().day) {
  const config = economyConfig.secrecy;
  return day >= config.firstBillingDay && (day - config.firstBillingDay) % config.billingCycleDays === 0;
}

export function calculateSecrecyExpenseItems(state = getState()) {
  const config = economyConfig.secrecy;
  const items = [];
  if ((state.reputation ?? 0) > 0) {
    items.push({
      id: "base",
      type: "base",
      name: "基地黑历史",
      reputation: state.reputation ?? 0,
      cost: (state.reputation ?? 0) * config.baseMonthlyCostPerReputation,
      paid: false,
    });
  }
  state.roster
    .filter((character) => character.status !== "阵亡" && (character.personalReputation ?? 0) > 0)
    .forEach((character) => {
      items.push({
        id: character.id,
        type: "mercenary",
        name: character.name,
        reputation: character.personalReputation ?? 0,
        cost: (character.personalReputation ?? 0) * config.mercenaryMonthlyCostPerReputation,
        paid: false,
      });
    });
  return items;
}

export function calculateUnpaidSecrecyReputation(state = getState()) {
  const mercenaryDebt = Object.values(state.unpaidSecrecy?.mercenaries ?? {}).reduce((sum, value) => sum + Math.max(0, value ?? 0), 0);
  return Math.max(0, state.unpaidSecrecy?.base ?? 0) + mercenaryDebt;
}

export function approveSecrecyExpenses(paidIds = []) {
  const paid = new Set(paidIds);
  updateState((draft) => {
    if (draft.gameStatus !== "active" || !isSecrecyBillingDay(draft.day)) return;
    draft.unpaidSecrecy ??= { base: 0, mercenaries: {} };
    draft.unpaidSecrecy.mercenaries ??= {};
    const items = calculateSecrecyExpenseItems(draft);
    let paidCost = 0;
    let unpaidReputation = 0;

    items.forEach((item) => {
      const wantsPay = paid.has(item.id);
      if (wantsPay && draft.gold >= item.cost) {
        draft.gold -= item.cost;
        paidCost += item.cost;
        return;
      }

      unpaidReputation += item.reputation;
      if (item.type === "base") {
        draft.unpaidSecrecy.base = (draft.unpaidSecrecy.base ?? 0) + item.reputation;
      } else {
        draft.unpaidSecrecy.mercenaries[item.id] = (draft.unpaidSecrecy.mercenaries[item.id] ?? 0) + item.reputation;
      }
    });

    const stealthLoss = unpaidReputation * economyConfig.secrecy.stealthLossPerUnpaidReputation;
    draft.stealth = clamp(draft.stealth - stealthLoss, 0, 100);
    draft.lastSecrecyBillingDay = draft.day;
    draft.log.push(`第 ${draft.day} 天：隐秘费用结算，支付 ${paidCost} 金，未遮掩声望 ${unpaidReputation}，隐秘值下降 ${stealthLoss}。`);
  });
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
      rank: id === "defenses" ? `${level}座` : getFacilityRankLabel(level),
      cost: calculateFacilityUpkeep(id, level),
    }));
  const baseCost = economyConfig.dailyExpenses.baseUpkeep;
  const base = { total: baseCost, items: [{ id: "base", name: "基地基础开销", cost: baseCost }] };
  const wages = { total: sumCosts(wageItems), items: wageItems };
  const supplies = { total: sumCosts(supplyItems), items: supplyItems };
  const equipment = { total: sumCosts(equipmentItems), items: equipmentItems };
  const facilities = { total: sumCosts(facilityItems), items: facilityItems };
  return {
    total: base.total + wages.total + equipment.total + facilities.total,
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
  const rankWage = config.rankDailyWage?.[rankIndex] ?? config.base + rankIndex * config.perRank;
  return rankWage + (character.personalReputation ?? 0) * (config.perPersonalReputation ?? 0) + (character.isPlayer ? config.playerBonus : 0);
}

export function upgradeBuilding(id) {
  updateState((draft) => {
    const building = buildings[id];
    if (!building) return;
    const level = draft.buildings[id] ?? 0;
    if (id !== "defenses" && level >= facilityRanks.length) {
      draft.log.push(`第 ${draft.day} 天：${building.name} 已达到最高 S 级。`);
      return;
    }
    const nextLevel = level + 1;
    const cost = getFacilityUpgradeCost(id, level);
    if (draft.gold < cost) return;
    draft.gold -= cost;
    draft.buildings[id] = nextLevel;
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "facility",
      title: id === "defenses" ? `${building.name} x${nextLevel}` : `${building.name} ${getFacilityRankLabel(nextLevel)}`,
      status: "done",
      detail: "基地建设完成。",
    });
    draft.log.push(id === "defenses" ? `第 ${draft.day} 天：修建了第 ${nextLevel} 座${building.name}。` : `第 ${draft.day} 天：${building.name} 升到了 ${getFacilityRankLabel(nextLevel)}。`);
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
    const plan = createHospitalTreatmentPlan(draft);
    if (plan.entries.length === 0) {
      draft.log.push(`第 ${draft.day} 天：医疗中心没有找到需要处理的伤病佣兵。`);
      return;
    }
    if (draft.gold < plan.cost) return;
    draft.gold -= plan.cost;
    let cured = 0;
    plan.entries.forEach(({ character, condition }) => {
      if (randomNumber(1, 100) > plan.successChance) return;
      character.conditions = (character.conditions ?? []).filter((entry) => entry.id !== condition.id);
      character.wound = Math.max(0, (character.wound ?? 0) - economyConfig.facilities.hospitalWoundRecoveryOnSuccess);
      character.stress = Math.max(0, (character.stress ?? 0) - economyConfig.facilities.hospitalStressRecoveryOnSuccess);
      character.hp = Math.min(character.maxHp, (character.hp ?? character.maxHp) + 12);
      cured += 1;
    });
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      type: "facility",
      title: "医疗中心治疗",
      status: "done",
      detail: `尝试处理 ${plan.entries.length} 个负面状态，成功 ${cured} 个。`,
    });
    draft.log.push(`第 ${draft.day} 天：支付 ${plan.cost} 金，医疗中心尝试治疗 ${plan.entries.length} 个负面状态，成功 ${cured} 个。`);
  });
}

export function calculateHospitalTreatmentPlan(state = getState()) {
  return createHospitalTreatmentPlan(state);
}

export function buySupplies(quantity = 1) {
  const amount = Math.max(0, Math.floor(Number(quantity) || 0));
  if (amount <= 0) return false;
  const cost = getSupplyPurchaseCost(amount);
  let purchased = false;
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    if (draft.gold < cost) return;
    draft.gold -= cost;
    draft.supplies = (draft.supplies ?? 0) + amount;
    draft.log.push(`第 ${draft.day} 天：购买 ${amount} 份补给，支付 ${cost} 金。`);
    purchased = true;
  });
  return purchased;
}

export function getSupplyPurchaseCost(quantity = 1) {
  const amount = Math.max(0, Math.floor(Number(quantity) || 0));
  const tiers = economyConfig.dailyExpenses.livingSupplies.purchaseTiers ?? [{ quantity: 1, cost: 1 }];
  const exact = tiers.find((tier) => tier.quantity === amount);
  if (exact) return exact.cost;
  const unit = tiers.find((tier) => tier.quantity === 1)?.cost ?? 1;
  return amount * unit;
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
  draft.roster.filter((character) => character.status !== "阵亡").forEach((character) => {
    character.stress += shortageConfig.stress;
  });
  draft.log.push(`第 ${draft.day} 天：维护费用缺口 ${shortage} 金，资金清零。隐秘值不受每日支出影响。`);
}

export function calculateRank(character) {
  return mercenaryRanks.includes(character.rank) ? character.rank : "无";
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

export function canUpgradeFacility(id) {
  const state = getState();
  if (id === "defenses") return true;
  const nextLevel = (state.buildings[id] ?? 0) + 1;
  return nextLevel <= facilityRanks.length;
}

export function getBlackMarketItemCost(kind, rank) {
  const rankIndex = Math.max(0, facilityRanks.indexOf(rank));
  const base = economyConfig.blackMarket.baseCost[kind] ?? economyConfig.blackMarket.baseCost.fallback;
  const perRank = economyConfig.blackMarket.perRank[kind] ?? economyConfig.blackMarket.perRank.fallback;
  return base + rankIndex * perRank;
}

function createHospitalTreatmentPlan(draft) {
  const level = draft.buildings?.hospital ?? 0;
  const allowedSeverity = getHospitalAllowedSeverity(level);
  const successChance = getHospitalSuccessChance(level);
  const entries = [];
  draft.roster
    .filter((character) => character.status !== "阵亡")
    .forEach((character) => {
      (character.conditions ?? [])
        .filter((condition) => canHospitalTreatSeverity(condition.severity, allowedSeverity))
        .forEach((condition) => entries.push({ character, condition }));
    });
  const cost = entries.reduce((sum, entry) => sum + getHospitalConditionCost(entry.condition), 0);
  return { entries, cost, successChance, allowedSeverity };
}

function getHospitalAllowedSeverity(level) {
  const index = Math.max(0, Math.min(level - 1, economyConfig.facilities.hospitalSeverityByLevel.length - 1));
  return economyConfig.facilities.hospitalSeverityByLevel[index] ?? "light";
}

function getHospitalSuccessChance(level) {
  const index = Math.max(0, Math.min(level - 1, economyConfig.facilities.hospitalSuccessChanceByLevel.length - 1));
  return economyConfig.facilities.hospitalSuccessChanceByLevel[index] ?? 65;
}

function canHospitalTreatSeverity(severity = "light", allowedSeverity = "light") {
  return severityWeight(severity) <= severityWeight(allowedSeverity);
}

function severityWeight(severity = "light") {
  if (severity === "heavy") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function getHospitalConditionCost(condition) {
  const costs = economyConfig.facilities.hospitalConditionCost;
  return costs[condition.severity] ?? costs.light ?? 14;
}

function calculateFacilityUpkeep(id, level) {
  if (!level || level <= 0) return 0;
  const rawCost = (buildings[id]?.upkeep ?? 0) * level * economyConfig.facilities.upkeepMultiplier;
  return Math.max(1, Math.round(rawCost));
}

function calculateLivingSupplyCost(character) {
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(calculateRank(character)));
  return economyConfig.dailyExpenses.livingSupplies.rankDailySupply?.[rankIndex] ?? 1;
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
