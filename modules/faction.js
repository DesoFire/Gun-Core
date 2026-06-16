import {
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
import { getConditionStressPoints, getConditionWoundPoints } from "./combatPower.js";

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
    .filter((character) => !isDeadStatus(character.status))
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
    .filter((character) => !isDeadStatus(character.status) && (character.personalReputation ?? 0) > 0)
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
  const livingRoster = draft.roster.filter((character) => !isDeadStatus(character.status));
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
  const equippedEquipmentItems = livingRoster.flatMap((character) =>
    Object.entries(character.equipment ?? {})
      .filter(([, item]) => isEquipmentItem(item))
      .map(([slot, item]) => createEquipmentExpenseItem(item, {
        characterId: character.id,
        characterName: character.name,
        location: character.name,
        slot,
      }))
  );
  const warehouseEquipmentItems = (draft.inventory ?? [])
    .filter(isEquipmentItem)
    .map((item) => createEquipmentExpenseItem(item, {
      characterId: null,
      characterName: "仓库",
      location: "仓库",
      slot: item.slot ?? item.itemCategory,
    }));
  const equipmentItems = [...equippedEquipmentItems, ...warehouseEquipmentItems];
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
  return rankWage + (character.personalReputation ?? 0) * (config.perPersonalReputation ?? 0);
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
    draft.log.push(id === "defenses"
      ? `第 ${draft.day} 天：修建了第 ${nextLevel} 座${building.name}。`
      : `第 ${draft.day} 天：${building.name} 升到了 ${getFacilityRankLabel(nextLevel)} 级。`);
  });
}

export function buyBlackMarketItem(kind) {
  updateState((draft) => {
    if (draft.gameStatus !== "active" || (draft.buildings.blackMarket ?? 0) <= 0) return;
    const rank = getFacilityRankLabel(draft.buildings.blackMarket ?? 0);
    const cost = getBlackMarketItemCost(kind, rank);
    if (draft.gold < cost) return;
    const item = createBlackMarketItem(kind, rank);
    if (!item) return;
    item.purchasePrice = cost;
    item.originalPrice = cost;
    draft.gold -= cost;
    if (kind === "mecha") {
      draft.mechs.unshift(item);
    } else {
      draft.inventory.unshift(item);
    }
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金，从 ${rank} 级黑市购入 ${item.name}。`);
  });
}

export function buyBlackMarketWeapon() {
  buyBlackMarketItem("weapon");
}

export function hospitalTreatMercenaries() {
  return treatNegativeConditions({
    facilityId: "hospital",
    category: "physical",
    config: economyConfig.facilities.hospitalTreatment,
    sourceName: "医疗中心",
    emptyText: "医疗中心没有找到可以处理的物理伤病。",
  });
}

export function infirmaryTreatMercenaries() {
  return treatNegativeConditions({
    facilityId: "infirmary",
    category: "mental",
    config: economyConfig.facilities.infirmaryTreatment,
    sourceName: "娱乐中心",
    emptyText: "娱乐中心没有找到可以处理的心理负面状态。",
  });
}

function treatNegativeConditions({ facilityId, category, config, sourceName, emptyText }) {
  let result = { ok: false, cost: 0, attempted: 0, cured: 0 };
  updateState((draft) => {
    if (draft.gameStatus !== "active" || (draft.buildings[facilityId] ?? 0) <= 0) return;
    const plan = createTreatmentPlan(draft, { facilityId, category, config });
    if (plan.entries.length === 0) {
      draft.log.push(`第 ${draft.day} 天：${emptyText}`);
      return;
    }
    if (draft.gold < plan.cost) return;
    draft.gold -= plan.cost;
    let cured = 0;
    plan.entries.forEach(({ character, condition }) => {
      if (randomNumber(1, 100) > plan.successChance) return;
      character.conditions = (character.conditions ?? []).filter((entry) => entry.id !== condition.id);
      cured += 1;
    });
    draft.log.push(`第 ${draft.day} 天：支付 ${plan.cost} 金，${sourceName}尝试处理 ${plan.entries.length} 个负面状态，成功 ${cured} 个。`);
    result = { ok: true, cost: plan.cost, attempted: plan.entries.length, cured };
  });
  return result;
}

export function calculateHospitalTreatmentPlan(state = getState()) {
  return createTreatmentPlan(state, {
    facilityId: "hospital",
    category: "physical",
    config: economyConfig.facilities.hospitalTreatment,
  });
}

export function calculateInfirmaryTreatmentPlan(state = getState()) {
  return createTreatmentPlan(state, {
    facilityId: "infirmary",
    category: "mental",
    config: economyConfig.facilities.infirmaryTreatment,
  });
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

function createTreatmentPlan(draft, { facilityId, category, config }) {
  const level = draft.buildings?.[facilityId] ?? 0;
  const maxPoints = getTreatmentMaxPoints(level, config);
  const successChance = getTreatmentSuccessChance(level, config);
  const entries = [];
  draft.roster
    .filter((character) => !isDeadStatus(character.status))
    .forEach((character) => {
      (character.conditions ?? [])
        .filter((condition) => condition.category === category)
        .filter((condition) => getTreatmentConditionPoints(condition, category) <= maxPoints)
        .forEach((condition) => entries.push({ character, condition }));
    });
  const cost = entries.reduce((sum, entry) => sum + getTreatmentConditionCost(entry.condition, category, config), 0);
  return { entries, cost, successChance, maxPoints };
}

function getTreatmentMaxPoints(level, config) {
  if (level <= 0) return 0;
  const values = config?.maxPointsByLevel ?? [1, 3, 5, 7, 9, 11, 99];
  const index = Math.max(0, Math.min(level - 1, values.length - 1));
  return values[index] ?? 1;
}

function getTreatmentSuccessChance(level, config) {
  const values = config?.successChanceByLevel ?? [70, 76, 82, 88, 93, 97, 100];
  const index = Math.max(0, Math.min(level - 1, values.length - 1));
  return values[index] ?? 65;
}

function getTreatmentConditionPoints(condition, category) {
  return category === "mental" ? getConditionStressPoints(condition) : getConditionWoundPoints(condition);
}

function getTreatmentConditionCost(condition, category, config) {
  const points = getTreatmentConditionPoints(condition, category);
  const base = config?.baseCost ?? 8;
  const perPoint = config?.costPerPoint ?? 5;
  const severityMultiplier = config?.severityMultiplier?.[condition.severity] ?? 1;
  return Math.max(1, Math.round((base + points * perPoint) * severityMultiplier));
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

function isEquipmentItem(item) {
  return Boolean(item && (item.itemCategory === "weapon" || item.itemCategory === "armor" || item.slot === "weapon" || item.slot === "armor"));
}

function createEquipmentExpenseItem(item, context = {}) {
  const slot = context.slot ?? item.slot ?? item.itemCategory;
  return {
    id: item.id,
    characterId: context.characterId ?? null,
    characterName: context.characterName ?? context.location ?? "仓库",
    location: context.location ?? context.characterName ?? "仓库",
    slot,
    slotLabel: slot === "weapon" || item.itemCategory === "weapon" ? "武器" : "防具",
    itemName: item.name,
    rarity: item.rarity ?? "F",
    type: item.damageType ?? item.protectionType ?? item.type ?? "未知",
    cost: calculateEquipmentMaintenanceCost(item),
  };
}

function sumCosts(items) {
  return items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
}

function isDeadStatus(status) {
  return status === "阵亡" || status === "闃典骸";
}

function createBlackMarketItem(kind, rank) {
  if (kind === "weapon") return generateWeaponItem({ rarity: rank });
  if (kind === "armor") return generateArmorItem({ rarity: rank });
  if (kind === "mecha") return createRankedMecha(rank);
  return null;
}

function createRankedMecha(rank) {
  const frame = randomItem(mechaFrames);
  return {
    id: createId(),
    ...frame,
    name: `${rank}级${frame.name}`,
    rarity: rank,
    condition: 100,
    maintenance: 20 + Math.max(0, facilityRanks.indexOf(rank)) * 18,
  };
}
