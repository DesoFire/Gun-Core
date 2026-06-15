import { resetState, getState, updateState } from "../js/state.js";
import {
  advanceDay,
  evaluateMissionFit,
  getMissions,
  investigateMission,
  startMission,
} from "../modules/mission.js";
import {
  approveSecrecyExpenses,
  buyBlackMarketItem,
  buySupplies,
  calculateDailyExpenseBreakdown,
  calculateDailySupplyConsumption,
  calculateHospitalTreatmentPlan,
  calculateSecrecyExpenseItems,
  calculateUnpaidSecrecyReputation,
  canUpgradeFacility,
  getBlackMarketItemCost,
  getFacilityRankLabel,
  getFacilityUpgradeCost,
  getSupplyPurchaseCost,
  hospitalTreatMercenaries,
  isSecrecyBillingDay,
  upgradeBuilding,
} from "../modules/faction.js";
import { getWealthProgress } from "../modules/wealth.js";
import { equipItem, dismissMercenary, getMercenaryLimit, hireRecruit, recruitCost } from "../modules/character.js";
import { calculateEffectiveCharacterCombatPower } from "../modules/combatPower.js";

const RUNS = Number.parseInt(process.argv[2] ?? "250", 10);
const MAX_DAYS = Number.parseInt(process.argv[3] ?? "60", 10);

const originalRandom = Math.random;

const strategies = [
  {
    id: "conservative",
    name: "保守调查型",
    minChance: 72,
    maxInvestigations: 2,
    prefer: "safe",
    reserveGold: 90,
    hireBelow: 3,
  },
  {
    id: "aggressive",
    name: "激进接单型",
    minChance: 50,
    maxInvestigations: 0,
    prefer: "reward",
    reserveGold: 25,
    hireBelow: 3,
  },
  {
    id: "growth",
    name: "成长优先型",
    minChance: 64,
    maxInvestigations: 1,
    prefer: "throughput",
    reserveGold: 65,
    hireBelow: 4,
  },
  {
    id: "wealth",
    name: "财富优先型",
    minChance: 58,
    maxInvestigations: 1,
    prefer: "profit",
    reserveGold: 30,
    hireBelow: 3,
  },
];

const summary = {};

for (const strategy of strategies) {
  summary[strategy.id] = [];
  for (let run = 0; run < RUNS; run += 1) {
    Math.random = mulberry32(hashSeed(`${strategy.id}-${run + 1}`));
    resetState();
    normalizeTextsForSimulation();
    summary[strategy.id].push(simulateRun(strategy, run + 1));
  }
}

Math.random = originalRandom;
process.stdout.write(JSON.stringify(buildReport(summary), null, 2));

function simulateRun(strategy, runIndex) {
  const metrics = {
    run: runIndex,
    daysPlayed: 1,
    endStatus: "active",
    missionsStarted: 0,
    missionsSucceeded: 0,
    missionsFailed: 0,
    deaths: 0,
    conditionEvents: 0,
    mentalEvents: 0,
    recruitsHired: 0,
    dismissed: 0,
    wealthBought: 0,
    wealthSpent: 0,
    totalInvestigations: 0,
    lowFundDays: 0,
    zeroGoldDays: 0,
    stealthMin: getState().stealth,
    goldMin: getState().gold,
    goldMax: getState().gold,
    dailyExpensePeak: calculateDailyExpenseBreakdown().total,
    facilityUpgrades: 0,
    hospitalTreatments: 0,
    marketPurchases: 0,
    firstGameOverDay: null,
    attemptedChances: [],
    startedRewards: [],
    successfulRewards: [],
    endGold: 0,
    endStealth: 0,
    endReputation: 0,
    endRoster: 0,
    endAlive: 0,
    endAvgPower: 0,
    endAvgRank: 0,
    endWealthOwned: 0,
    endWealthTotal: 0,
    maxStress: 0,
    avgStress: 0,
    avgWound: 0,
  };

  for (let day = 1; day <= MAX_DAYS; day += 1) {
    const before = snapshot();
    payMonthlySecrecyIfDue();
    maybeDismissLiabilities(strategy, metrics);
    maybeDismissForSecrecy(strategy, metrics);
    maybeUseFacilities(strategy, metrics);
    maybeStockpileSupplies(strategy);
    maybeHire(strategy, metrics);
    runDispatchPolicy(strategy, metrics);

    if (getState().gameStatus !== "active") break;
    advanceDay();
    collectDelta(metrics, before);
    collectDaily(metrics);

    if (getState().gameStatus !== "active") {
      metrics.firstGameOverDay = getState().day;
      break;
    }
  }

  finalize(metrics);
  return metrics;
}

function runDispatchPolicy(strategy, metrics) {
  let guard = 0;
  while (guard < 4) {
    guard += 1;
    const state = getState();
    const availableMercs = state.roster.filter((c) => isIdle(c));
    if (availableMercs.length === 0) return;
    const availableMissions = getMissions().filter((m) => m.status === "available");
    if (availableMissions.length === 0) return;

    const candidates = availableMissions
      .map((mission) => {
        investigateForPolicy(strategy, mission, metrics);
        const team = chooseTeamForMission(mission, availableMercs, strategy);
        if (team.length === 0) return null;
        autoEquipTeamForMission(team, mission);
        const fit = evaluateMissionFit(team.map((c) => c.id), mission);
        const reward = mission.reward?.gold ?? 0;
        const duration = mission.duration ?? 1;
        const score = scoreMission(strategy, fit, mission, reward, duration);
        return { mission, team, fit, reward, duration, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const pick = candidates.find((item) => item.fit.chance >= strategy.minChance);
    if (!pick) return;

    metrics.missionsStarted += 1;
    metrics.attemptedChances.push(pick.fit.chance);
    metrics.startedRewards.push(pick.reward);
    startMission(pick.mission.id, pick.team.map((c) => c.id));
  }
}

function maybeUseFacilities(strategy, metrics) {
  maybeTreatAtHospital(strategy, metrics);
  maybeUpgradeFacilities(strategy, metrics);
  maybeBuyBlackMarketGear(strategy, metrics);
}

function maybeTreatAtHospital(strategy, metrics) {
  const state = getState();
  if ((state.buildings.hospital ?? 0) <= 0) return;
  const plan = calculateHospitalTreatmentPlan(state);
  if (plan.entries.length === 0) return;
  const burden = totalMedicalBurden(state);
  if (state.gold - plan.cost < strategy.reserveGold + 60 || burden < 28) return;
  const beforeGold = state.gold;
  const beforeBurden = totalMedicalBurden(state);
  hospitalTreatMercenaries();
  const after = getState();
  if (after.gold < beforeGold && totalMedicalBurden(after) < beforeBurden) metrics.hospitalTreatments += 1;
}

function maybeUpgradeFacilities(strategy, metrics) {
  const state = getState();
  const living = state.roster.filter((character) => !isDead(character)).length;
  const atCap = living >= getMercenaryLimit(state);
  const priorities = [
    { id: "hospital", when: state.roster.some((character) => !isDead(character) && ((character.wound ?? 0) > 0 || (character.stress ?? 0) >= 35)) },
    { id: "blackMarket", when: needBetterGear(state) },
    { id: "defenses", when: state.stealth < 85 || calculateUnpaidSecrecyReputation(state) > 0 },
    { id: "intel", when: strategy.maxInvestigations > 0 },
    { id: "barracks", when: atCap || strategy.hireBelow > getMercenaryLimit(state) },
    { id: "tavern", when: living < strategy.hireBelow + 1 || needBetterRecruitPool(state) },
  ];

  for (const entry of priorities) {
    if (!entry.when || !canUpgradeFacility(entry.id)) continue;
    const level = state.buildings[entry.id] ?? 0;
    const targetLevel = getFacilityTargetLevel(entry.id, strategy);
    if (level >= targetLevel) continue;
    const cost = getFacilityUpgradeCost(entry.id, level);
    const reserve = entry.id === "barracks" || entry.id === "hospital" ? strategy.reserveGold + 80 : strategy.reserveGold + 120;
    if (getState().gold - cost < reserve) continue;
    const beforeLevel = getState().buildings[entry.id] ?? 0;
    upgradeBuilding(entry.id);
    if ((getState().buildings[entry.id] ?? 0) > beforeLevel) metrics.facilityUpgrades += 1;
    return;
  }
}

function getFacilityTargetLevel(id, strategy) {
  if (id === "barracks") return strategy.hireBelow > 4 ? 1 : 0;
  if (id === "hospital") return 1;
  if (id === "blackMarket") return 1;
  if (id === "defenses") return 5;
  if (id === "intel") return strategy.maxInvestigations > 1 ? 2 : 1;
  if (id === "tavern") return strategy.hireBelow >= 4 ? 3 : 2;
  return 1;
}

function maybeBuyBlackMarketGear(strategy, metrics) {
  const state = getState();
  if ((state.buildings.blackMarket ?? 0) <= 0) return;
  if ((metrics.marketPurchases ?? 0) >= 4) return;
  autoEquipIdleMercenaries();
  const rank = getFacilityRankLabel(state.buildings.blackMarket ?? 0);
  const weakest = state.roster.filter((character) => isIdle(character) && !isDead(character)).sort((a, b) => calculateEffectiveCharacterCombatPower(a) - calculateEffectiveCharacterCombatPower(b))[0];
  if (!weakest) return;

  const choices = [];
  if (needMoreWeapons(state)) choices.push("weapon");
  if (needMoreArmor(state)) choices.push("armor");
  if ((state.supplies ?? 0) < state.roster.length * 3) choices.push("supplies");
  if (choices.length === 0 && calculateEffectiveCharacterCombatPower(weakest) < 35) choices.push("weapon");
  const kind = choices[0];
  if (!kind) return;
  const cost = getBlackMarketItemCost(kind, rank);
  if (state.gold - cost < strategy.reserveGold + 100) return;
  const beforeInventory = state.inventory.length + state.mechs.length;
  const beforeSupplies = state.supplies ?? 0;
  buyBlackMarketItem(kind);
  const after = getState();
  if (after.inventory.length + after.mechs.length > beforeInventory || (after.supplies ?? 0) > beforeSupplies) {
    metrics.marketPurchases += 1;
    autoEquipIdleMercenaries();
  }
}

function maybeStockpileSupplies(strategy) {
  const state = getState();
  const dailyUse = calculateDailySupplyConsumption(state);
  const target = Math.max(14, dailyUse * 14);
  if ((state.supplies ?? 0) >= target) return;
  const quantity = chooseSupplyPurchaseQuantity(target - (state.supplies ?? 0));
  const cost = getSupplyPurchaseCost(quantity);
  if (state.gold - cost < strategy.reserveGold + 40) return;
  buySupplies(quantity);
}

function autoEquipTeamForMission(team, mission) {
  const wantedDamageTypes = mission.requirements?.damageTypes ?? [];
  const wantedWeapons = mission.requirements?.weaponTypes ?? [];
  for (const character of team) {
    equipBestItem(character.id, "weapon", (item) => scoreWeaponForMission(item, wantedWeapons, wantedDamageTypes));
    equipBestItem(character.id, "armor", (item) => scoreArmorForMission(item, wantedDamageTypes));
  }
}

function autoEquipIdleMercenaries() {
  getState()
    .roster
    .filter((character) => isIdle(character) && !isDead(character))
    .forEach((character) => {
      equipBestItem(character.id, "weapon", scoreWeaponForMission);
      equipBestItem(character.id, "armor", scoreArmorForMission);
    });
}

function equipBestItem(characterId, slot, scorer) {
  const state = getState();
  const character = state.roster.find((entry) => entry.id === characterId);
  if (!character) return;
  const current = character.equipment?.[slot];
  const currentScore = current ? scorer(current) : -Infinity;
  const candidate = state.inventory
    .filter((item) => item.slot === slot || item.itemCategory === slot)
    .map((item) => ({ item, score: scorer(item) }))
    .sort((a, b) => b.score - a.score)[0];
  if (!candidate || candidate.score <= currentScore) return;
  equipItem(characterId, slot, candidate.item.id);
}

function scoreWeaponForMission(item, wantedWeapons = [], wantedDamageTypes = []) {
  return (
    (item.power ?? 0) +
    (wantedWeapons.includes(item.type) ? 18 : 0) +
    (wantedDamageTypes.includes(item.damageType) ? 10 : 0)
  );
}

function scoreArmorForMission(item, wantedDamageTypes = []) {
  return (item.deathRiskReduction ?? 0) * 10 + (wantedDamageTypes.includes(item.protectionType) ? 22 : 0);
}

function needBetterGear(state) {
  return needMoreWeapons(state) || needMoreArmor(state);
}

function needMoreWeapons(state) {
  const idle = state.roster.filter((character) => isIdle(character) && !isDead(character));
  const weapons = idle.filter((character) => character.equipment?.weapon).length + state.inventory.filter((item) => item.itemCategory === "weapon" || item.slot === "weapon").length;
  return weapons < Math.min(3, idle.length);
}

function needMoreArmor(state) {
  const idle = state.roster.filter((character) => isIdle(character) && !isDead(character));
  const armors = idle.filter((character) => character.equipment?.armor).length + state.inventory.filter((item) => item.itemCategory === "armor" || item.slot === "armor").length;
  return armors < Math.min(3, idle.length);
}

function totalMedicalBurden(state) {
  return state.roster.reduce((sum, character) => sum + (character.wound ?? 0) * 10 + Math.floor((character.stress ?? 0) / 4), 0);
}

function needBetterRecruitPool(state) {
  const bestRecruitPower = max(state.recruitPool.map((candidate) => calculateEffectiveCharacterCombatPower(candidate)));
  const alivePowers = state.roster.filter((character) => !isDead(character)).map((character) => calculateEffectiveCharacterCombatPower(character));
  return bestRecruitPower < Math.max(30, avg(alivePowers));
}

function chooseSupplyPurchaseQuantity(needed) {
  if (needed >= 100) return 100;
  if (needed >= 50) return 50;
  if (needed >= 20) return 20;
  return 1;
}

function investigateForPolicy(strategy, mission, metrics) {
  const keys = ["power", "damageTypes", "careerCategories", "weaponTypes", "teamSize"];
  for (let i = 0; i < strategy.maxInvestigations; i += 1) {
    const state = getState();
    const cost = mission.investigateCost ?? 24;
    if (state.gold - cost < strategy.reserveGold) return;
    const beforeGold = state.gold;
    const beforeIntel = (mission.revealedIntel?.length ?? 0) + (mission.powerIntelLevel ?? 0);
    const key = keys[i % keys.length];
    investigateMission(mission.id, key);
    const after = getState();
    const afterMission = after.missions.find((m) => m.id === mission.id);
    const afterIntel = (afterMission?.revealedIntel?.length ?? 0) + (afterMission?.powerIntelLevel ?? 0);
    if (after.gold < beforeGold || afterIntel > beforeIntel) metrics.totalInvestigations += 1;
  }
}

function chooseTeamForMission(mission, availableMercs, strategy) {
  const min = mission.recommendedTeamSize?.min ?? 1;
  const max = Math.min(4, mission.recommendedTeamSize?.max ?? 4);
  const sorted = [...availableMercs].sort((a, b) => calculateEffectiveCharacterCombatPower(b) - calculateEffectiveCharacterCombatPower(a));
  const candidates = [];
  for (let size = min; size <= Math.min(max, sorted.length); size += 1) {
    candidates.push(sorted.slice(0, size));
  }
  if (strategy.prefer === "throughput" && sorted.length > min) {
    candidates.push(sorted.slice(Math.max(0, sorted.length - min), sorted.length));
  }
  if (candidates.length === 0 && sorted.length > 0) candidates.push(sorted.slice(0, 1));

  return candidates
    .map((team) => ({ team, fit: evaluateMissionFit(team.map((c) => c.id), mission) }))
    .sort((a, b) => b.fit.chance - a.fit.chance)[0]?.team ?? [];
}

function scoreMission(strategy, fit, mission, reward, duration) {
  if (strategy.prefer === "reward") return reward + fit.chance * 1.2 + (mission.difficulty ?? 1) * 8;
  if (strategy.prefer === "profit") return reward / Math.max(1, duration) + fit.chance * 0.8;
  if (strategy.prefer === "throughput") return fit.chance * 1.5 + reward / Math.max(1, duration) - duration * 6;
  return fit.chance * 2 + reward / Math.max(1, duration) - (mission.difficulty ?? 1) * 3;
}

function maybeHire(strategy, metrics) {
  const state = getState();
  const alive = state.roster.filter((c) => !isDead(c)).length;
  if (alive >= getMercenaryLimit(state)) return;
  if (alive >= strategy.hireBelow) return;
  const recruit = [...state.recruitPool]
    .map((candidate) => ({ candidate, cost: recruitCost(candidate) }))
    .filter((entry) => state.gold - entry.cost >= strategy.reserveGold)
    .sort((a, b) => calculateEffectiveCharacterCombatPower(b.candidate) - calculateEffectiveCharacterCombatPower(a.candidate))[0];
  if (!recruit) return;
  const before = getState().roster.length;
  hireRecruit(recruit.candidate.id);
  if (getState().roster.length > before) metrics.recruitsHired += 1;
}

function maybeDismissLiabilities(strategy, metrics) {
  const state = getState();
  const aliveIdle = state.roster.filter((character) => isIdle(character) && !isDead(character));
  if (aliveIdle.length <= 3) return;
  const candidates = aliveIdle
    .filter((character) => !character.isPlayer)
    .map((character) => ({
      character,
      power: calculateEffectiveCharacterCombatPower(character),
      burden: (character.wound ?? 0) * 8 + (character.conditions?.length ?? 0) * 5 + Math.floor((character.stress ?? 0) / 10),
    }))
    .filter((entry) => entry.power <= 3 || entry.burden >= 40 || (entry.character.wound ?? 0) >= 5 || (entry.character.conditions?.length ?? 0) >= 5)
    .sort((a, b) => b.burden - a.burden || a.power - b.power);
  const target = candidates[0]?.character;
  if (!target) return;
  const before = getState().roster.length;
  dismissMercenary(target.id);
  if (getState().roster.length < before) metrics.dismissed = (metrics.dismissed ?? 0) + 1;
}

function maybeDismissForSecrecy(strategy, metrics) {
  const state = getState();
  const daysToBilling = daysUntilSecrecyBilling(state.day);
  if (daysToBilling > 3) return;
  const idle = state.roster.filter((character) => isIdle(character) && !isDead(character) && !character.isPlayer);
  if (idle.length <= 2) return;
  const candidates = idle
    .map((character) => {
      const personalReputation = character.personalReputation ?? 0;
      const power = calculateEffectiveCharacterCombatPower(character);
      const burden = personalReputation * 2 + (character.wound ?? 0) * 8 + (character.conditions?.length ?? 0) * 6 - power;
      return { character, personalReputation, power, burden };
    })
    .filter((entry) => entry.personalReputation >= 12 && (entry.power < 35 || entry.burden >= 20))
    .sort((a, b) => b.burden - a.burden);
  const target = candidates[0];
  if (!target) return;
  const before = getState().roster.length;
  dismissMercenary(target.character.id);
  if (getState().roster.length < before) metrics.dismissed = (metrics.dismissed ?? 0) + 1;
}

function payMonthlySecrecyIfDue() {
  const state = getState();
  if (!isSecrecyBillingDay(state.day)) return;
  const items = calculateSecrecyExpenseItems(state);
  let remainingGold = state.gold;
  const paidIds = [];
  for (const item of items.sort((a, b) => a.cost - b.cost)) {
    if (remainingGold < item.cost) continue;
    remainingGold -= item.cost;
    paidIds.push(item.id);
  }
  approveSecrecyExpenses(paidIds);
}

function daysUntilSecrecyBilling(day) {
  const first = 31;
  const cycle = 30;
  if (day <= first) return first - day;
  const mod = (day - first) % cycle;
  return mod === 0 ? 0 : cycle - mod;
}

function collectDelta(metrics, before) {
  const after = snapshot();
  metrics.missionsSucceeded += Math.max(0, after.completedMissions - before.completedMissions);
  metrics.missionsFailed += Math.max(0, after.failedMissions - before.failedMissions);
  metrics.deaths += Math.max(0, after.dead - before.dead);
  metrics.conditionEvents += Math.max(0, after.conditions - before.conditions);
  metrics.mentalEvents += Math.max(0, after.mental - before.mental);
  const successfulDelta = Math.max(0, after.completedMissions - before.completedMissions);
  if (successfulDelta > 0) {
    const gained = Math.max(0, after.gold + after.wealthSpent - before.gold + (after.expensePaid - before.expensePaid));
    metrics.successfulRewards.push(gained);
  }
}

function collectDaily(metrics) {
  const state = getState();
  metrics.daysPlayed = state.day;
  metrics.stealthMin = Math.min(metrics.stealthMin, state.stealth);
  metrics.goldMin = Math.min(metrics.goldMin, state.gold);
  metrics.goldMax = Math.max(metrics.goldMax, state.gold);
  metrics.dailyExpensePeak = Math.max(metrics.dailyExpensePeak, calculateDailyExpenseBreakdown().total);
  if (state.gold <= 0) metrics.zeroGoldDays += 1;
  if (state.gold < calculateDailyExpenseBreakdown().total) metrics.lowFundDays += 1;
}

function finalize(metrics) {
  const state = getState();
  const alive = state.roster.filter((c) => !isDead(c));
  const wealth = getWealthProgress(state);
  metrics.endStatus = state.gameStatus;
  metrics.endGold = state.gold;
  metrics.endStealth = state.stealth;
  metrics.endReputation = state.reputation;
  metrics.endRoster = state.roster.length;
  metrics.endAlive = alive.length;
  metrics.endAvgPower = avg(alive.map(calculateEffectiveCharacterCombatPower));
  metrics.endAvgRank = avg(alive.map((c) => Math.max(0, c.level ?? 0)));
  metrics.endWealthOwned = wealth.owned;
  metrics.endWealthTotal = wealth.total;
  metrics.maxStress = max(alive.map((c) => c.stress ?? 0));
  metrics.avgStress = avg(alive.map((c) => c.stress ?? 0));
  metrics.avgWound = avg(alive.map((c) => c.wound ?? 0));
}

function snapshot() {
  const state = getState();
  return {
    gold: state.gold,
    completedMissions: state.timeline.filter((entry) => entry.type === "contract" && entry.status === "done").length,
    failedMissions: state.timeline.filter((entry) => entry.type === "contract" && entry.status === "failed").length,
    dead: state.roster.filter(isDead).length,
    conditions: state.roster.reduce((sum, c) => sum + (c.conditions?.length ?? 0) + (c.positiveConditions?.length ?? 0), 0),
    mental: state.roster.reduce((sum, c) => sum + (c.conditions ?? []).filter((condition) => condition.category === "mental").length, 0),
    wealthSpent: getWealthProgress(state).spent,
    expensePaid: state.__simExpensePaid ?? 0,
  };
}

function normalizeTextsForSimulation() {
  updateState(
    (draft) => {
      for (const character of [...draft.roster, ...draft.recruitPool]) {
        if (character.status !== "阵亡") character.status = "待命";
        if (character.rank !== "无" && !["F", "E", "D", "C", "B", "A", "S"].includes(character.rank)) character.rank = "无";
      }
      draft.__simExpensePaid = 0;
    },
    { save: false, notify: false }
  );
}

function isIdle(character) {
  return character.status === "待命" || character.status === "寰呭懡";
}

function isDead(character) {
  return character.status === "阵亡" || character.status === "闃典骸";
}

function buildReport(raw) {
  return Object.fromEntries(
    Object.entries(raw).map(([id, runs]) => [
      id,
      {
        name: strategies.find((strategy) => strategy.id === id)?.name ?? id,
        runs: runs.length,
        endStatus: distribution(runs.map((run) => run.endStatus)),
        avgDaysPlayed: round(avg(runs.map((run) => run.daysPlayed)), 1),
        mission: {
          started: round(avg(runs.map((run) => run.missionsStarted)), 2),
          succeeded: round(avg(runs.map((run) => run.missionsSucceeded)), 2),
          failed: round(avg(runs.map((run) => run.missionsFailed)), 2),
          successRate: pct(sum(runs.map((run) => run.missionsSucceeded)) / Math.max(1, sum(runs.map((run) => run.missionsSucceeded + run.missionsFailed)))),
          avgAttemptChance: round(avg(runs.flatMap((run) => run.attemptedChances)), 1),
        },
        economy: {
          endGold: round(avg(runs.map((run) => run.endGold)), 1),
          goldMin: round(avg(runs.map((run) => run.goldMin)), 1),
          goldMax: round(avg(runs.map((run) => run.goldMax)), 1),
          lowFundDays: round(avg(runs.map((run) => run.lowFundDays)), 1),
          zeroGoldDays: round(avg(runs.map((run) => run.zeroGoldDays)), 1),
          dailyExpensePeak: round(avg(runs.map((run) => run.dailyExpensePeak)), 1),
          investigations: round(avg(runs.map((run) => run.totalInvestigations)), 1),
        },
        facilities: {
          upgrades: round(avg(runs.map((run) => run.facilityUpgrades ?? 0)), 2),
          hospitalTreatments: round(avg(runs.map((run) => run.hospitalTreatments ?? 0)), 2),
          marketPurchases: round(avg(runs.map((run) => run.marketPurchases ?? 0)), 2),
        },
        roster: {
          dismissed: round(avg(runs.map((run) => run.dismissed ?? 0)), 2),
          deaths: round(avg(runs.map((run) => run.deaths)), 2),
          endAlive: round(avg(runs.map((run) => run.endAlive)), 2),
          endAvgPower: round(avg(runs.map((run) => run.endAvgPower)), 1),
          endAvgRankIndex: round(avg(runs.map((run) => run.endAvgRank)), 2),
          conditionEvents: round(avg(runs.map((run) => run.conditionEvents)), 2),
          mentalEvents: round(avg(runs.map((run) => run.mentalEvents)), 2),
          avgStress: round(avg(runs.map((run) => run.avgStress)), 1),
          maxStress: round(avg(runs.map((run) => run.maxStress)), 1),
          avgWound: round(avg(runs.map((run) => run.avgWound)), 2),
        },
        progress: {
          endReputation: round(avg(runs.map((run) => run.endReputation)), 1),
          wealthOwned: round(avg(runs.map((run) => run.endWealthOwned)), 2),
          wealthTotal: runs[0]?.endWealthTotal ?? 0,
          wealthSpent: round(avg(runs.map((run) => run.wealthSpent)), 1),
          stealthMin: round(avg(runs.map((run) => run.stealthMin)), 1),
        },
        percentiles: {
          endGoldP10P50P90: percentiles(runs.map((run) => run.endGold)),
          reputationP10P50P90: percentiles(runs.map((run) => run.endReputation)),
          missionsStartedP10P50P90: percentiles(runs.map((run) => run.missionsStarted)),
          deathsP10P50P90: percentiles(runs.map((run) => run.deaths)),
        },
      },
    ])
  );
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(value) {
  return [...value].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
}

function avg(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? sum(valid) / valid.length : 0;
}

function max(values) {
  return values.length ? Math.max(...values) : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pct(value) {
  return `${round(value * 100, 1)}%`;
}

function distribution(values) {
  return values.reduce((map, value) => {
    map[value] = (map[value] ?? 0) + 1;
    return map;
  }, {});
}

function percentiles(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return [0, 0, 0];
  return [0.1, 0.5, 0.9].map((p) => round(sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))], 1));
}
