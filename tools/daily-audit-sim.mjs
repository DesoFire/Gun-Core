import { resetState, getState, updateState } from "../js/state.js";
import {
  advanceDay,
  evaluateMissionFit,
  getMissionPowerRange,
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
import { dismissMercenary, equipItem, getMercenaryLimit, hireRecruit, recruitCost } from "../modules/character.js";
import { calculateEffectiveCharacterCombatPower } from "../modules/combatPower.js";

const MAX_DAYS = Number.parseInt(process.argv[2] ?? "45", 10);
const STRATEGY_ID = process.argv[3] ?? "growth";
const SEED = process.argv[4] ?? `${STRATEGY_ID}-daily-audit`;

const originalRandom = Math.random;

const strategies = {
  conservative: {
    id: "conservative",
    name: "保守调查型",
    minChance: 72,
    maxInvestigations: 2,
    prefer: "safe",
    reserveGold: 90,
    hireBelow: 3,
  },
  aggressive: {
    id: "aggressive",
    name: "激进接单型",
    minChance: 50,
    maxInvestigations: 0,
    prefer: "reward",
    reserveGold: 25,
    hireBelow: 3,
  },
  growth: {
    id: "growth",
    name: "成长优先型",
    minChance: 64,
    maxInvestigations: 1,
    prefer: "throughput",
    reserveGold: 65,
    hireBelow: 4,
  },
  profit: {
    id: "profit",
    name: "现金积累型",
    minChance: 58,
    maxInvestigations: 1,
    prefer: "profit",
    reserveGold: 40,
    hireBelow: 3,
  },
};

const strategy = strategies[STRATEGY_ID] ?? strategies.growth;

Math.random = mulberry32(hashSeed(SEED));
resetState();
normalizeTextsForSimulation();
const report = simulateDailyAudit(strategy, MAX_DAYS, SEED);
Math.random = originalRandom;

process.stdout.write(renderMarkdownReport(report));

function simulateDailyAudit(strategy, maxDays, seed) {
  const days = [];
  const runStart = summarizeState();

  for (let tick = 1; tick <= maxDays; tick += 1) {
    const state = getState();
    if (state.gameStatus !== "active") break;

    const dayRecord = {
      day: state.day,
      actions: [],
      before: summarizeState(),
      board: summarizeMissionBoard(),
    };

    payMonthlySecrecyIfDue(dayRecord);
    maybeDismissLiabilities(strategy, dayRecord);
    maybeDismissForSecrecy(strategy, dayRecord);
    maybeUseFacilities(strategy, dayRecord);
    maybeStockpileSupplies(strategy, dayRecord);
    maybeHire(strategy, dayRecord);
    runDispatchPolicy(strategy, dayRecord);

    const beforeAdvance = summarizeState();
    const beforeEvents = eventCounters();
    advanceDay();
    const afterEvents = eventCounters();

    dayRecord.after = summarizeState();
    dayRecord.advance = summarizeAdvanceDelta(beforeAdvance, dayRecord.after, beforeEvents, afterEvents);
    dayRecord.events = collectNewLogLines(dayRecord.day, getState().day);
    dayRecord.roster = summarizeRosterDetail();
    dayRecord.activeContracts = summarizeActiveContracts();
    days.push(dayRecord);

    if (getState().gameStatus !== "active") break;
  }

  return {
    seed,
    strategy,
    maxDays,
    start: runStart,
    end: summarizeState(),
    days,
    totals: buildTotals(days),
  };
}

function runDispatchPolicy(strategy, dayRecord) {
  let guard = 0;
  while (guard < 4) {
    guard += 1;
    const state = getState();
    const availableMercs = state.roster.filter((character) => isIdle(character));
    if (availableMercs.length === 0) return;
    const availableMissions = getMissions().filter((mission) => mission.status === "available");
    if (availableMissions.length === 0) return;

    const candidates = availableMissions
      .map((mission) => {
        investigateForPolicy(strategy, mission, dayRecord);
        const team = chooseTeamForMission(mission, availableMercs, strategy);
        if (team.length === 0) return null;
        const equipActions = autoEquipTeamForMission(team, mission);
        dayRecord.actions.push(...equipActions);
        const fit = evaluateMissionFit(team.map((character) => character.id), mission);
        const reward = mission.reward?.gold ?? 0;
        const duration = mission.duration ?? 1;
        const score = scoreMission(strategy, fit, mission, reward, duration);
        return { mission, team, fit, reward, duration, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const pick = candidates.find((item) => item.fit.chance >= strategy.minChance);
    if (!pick) return;

    const beforeGold = getState().gold;
    startMission(pick.mission.id, pick.team.map((character) => character.id));
    const afterMission = getState().missions.find((mission) => mission.id === pick.mission.id);
    dayRecord.actions.push({
      type: "dispatch",
      text: `派遣 ${pick.team.map((character) => character.name).join("、")} 执行「${pick.mission.name}」；预估成功率 ${pick.fit.chance}%；预付款 +${Math.max(0, getState().gold - beforeGold)} 金。`,
      mission: pick.mission.name,
      team: pick.team.map((character) => character.name),
      chance: pick.fit.chance,
      power: pick.fit.teamPower,
      requirement: pick.fit.requirement,
      advancePaid: afterMission?.advancePaid ?? 0,
    });
  }
}

function maybeUseFacilities(strategy, dayRecord) {
  maybeTreatAtHospital(strategy, dayRecord);
  maybeUpgradeFacilities(strategy, dayRecord);
  maybeBuyBlackMarketGear(strategy, dayRecord);
}

function maybeTreatAtHospital(strategy, dayRecord) {
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
  if (after.gold < beforeGold) {
    dayRecord.actions.push({
      type: "hospital",
      text: `医疗中心治疗负面状态，支付 ${beforeGold - after.gold} 金；医疗负担 ${beforeBurden} -> ${totalMedicalBurden(after)}。`,
    });
  }
}

function maybeUpgradeFacilities(strategy, dayRecord) {
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
    const beforeGold = getState().gold;
    upgradeBuilding(entry.id);
    const afterLevel = getState().buildings[entry.id] ?? 0;
    if (afterLevel > beforeLevel) {
      dayRecord.actions.push({
        type: "facility",
        text:
          entry.id === "defenses"
            ? `修建第 ${afterLevel} 座${facilityName(entry.id)}，支付 ${beforeGold - getState().gold} 金。`
            : `${facilityName(entry.id)} 升级 ${getFacilityRankLabel(beforeLevel)} -> ${getFacilityRankLabel(afterLevel)}，支付 ${beforeGold - getState().gold} 金。`,
      });
    }
    return;
  }
}

function maybeBuyBlackMarketGear(strategy, dayRecord) {
  const state = getState();
  if ((state.buildings.blackMarket ?? 0) <= 0) return;
  autoEquipIdleMercenaries(dayRecord);
  const rank = getFacilityRankLabel(state.buildings.blackMarket ?? 0);
  const weakest = state.roster
    .filter((character) => isIdle(character) && !isDead(character))
    .sort((a, b) => calculateEffectiveCharacterCombatPower(a) - calculateEffectiveCharacterCombatPower(b))[0];
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
  const beforeGold = state.gold;
  const beforeInventory = state.inventory.length + state.mechs.length;
  const beforeSupplies = state.supplies ?? 0;
  buyBlackMarketItem(kind);
  const after = getState();
  if (after.inventory.length + after.mechs.length > beforeInventory || (after.supplies ?? 0) > beforeSupplies) {
    dayRecord.actions.push({ type: "market", text: `黑市购买${marketKindName(kind)}，支付 ${beforeGold - after.gold} 金。` });
    autoEquipIdleMercenaries(dayRecord);
  }
}

function maybeStockpileSupplies(strategy, dayRecord) {
  const state = getState();
  const dailyUse = calculateDailySupplyConsumption(state);
  const target = Math.max(14, dailyUse * 14);
  if ((state.supplies ?? 0) >= target) return;
  const quantity = chooseSupplyPurchaseQuantity(target - (state.supplies ?? 0));
  const cost = getSupplyPurchaseCost(quantity);
  if (state.gold - cost < strategy.reserveGold + 40) return;
  const beforeGold = state.gold;
  const beforeSupplies = state.supplies ?? 0;
  buySupplies(quantity);
  const after = getState();
  if ((after.supplies ?? 0) > beforeSupplies) {
    dayRecord.actions.push({
      type: "supplies",
      text: `支出页囤积补给 ${after.supplies - beforeSupplies}，支付 ${beforeGold - after.gold} 金；库存 ${after.supplies}。`,
    });
  }
}

function autoEquipTeamForMission(team, mission) {
  const wantedDamageTypes = mission.requirements?.damageTypes ?? [];
  const wantedWeapons = mission.requirements?.weaponTypes ?? [];
  return team.flatMap((character) => [
    ...equipBestItem(character.id, "weapon", (item) => scoreWeaponForMission(item, wantedWeapons, wantedDamageTypes)),
    ...equipBestItem(character.id, "armor", (item) => scoreArmorForMission(item, wantedDamageTypes)),
  ]);
}

function autoEquipIdleMercenaries(dayRecord) {
  getState()
    .roster
    .filter((character) => isIdle(character) && !isDead(character))
    .forEach((character) => {
      dayRecord?.actions.push(...equipBestItem(character.id, "weapon", scoreWeaponForMission));
      dayRecord?.actions.push(...equipBestItem(character.id, "armor", scoreArmorForMission));
    });
}

function equipBestItem(characterId, slot, scorer) {
  const state = getState();
  const character = state.roster.find((entry) => entry.id === characterId);
  if (!character) return [];
  const current = character.equipment?.[slot];
  const currentScore = current ? scorer(current) : -Infinity;
  const candidate = state.inventory
    .filter((item) => item.slot === slot || item.itemCategory === slot)
    .map((item) => ({ item, score: scorer(item) }))
    .sort((a, b) => b.score - a.score)[0];
  if (!candidate || candidate.score <= currentScore) return [];
  equipItem(characterId, slot, candidate.item.id);
  return [{ type: "equip", text: `${character.name} 装备${slot === "weapon" ? "武器" : "防具"}「${candidate.item.name}」。` }];
}

function investigateForPolicy(strategy, mission, dayRecord) {
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
    const afterMission = after.missions.find((entry) => entry.id === mission.id);
    const afterIntel = (afterMission?.revealedIntel?.length ?? 0) + (afterMission?.powerIntelLevel ?? 0);
    if (after.gold < beforeGold || afterIntel > beforeIntel) {
      dayRecord.actions.push({
        type: "investigate",
        text: `调查「${mission.name}」的${intelName(key)}，支付 ${beforeGold - after.gold} 金；情报进度 ${beforeIntel} -> ${afterIntel}。`,
      });
    }
  }
}

function maybeHire(strategy, dayRecord) {
  const state = getState();
  const alive = state.roster.filter((character) => !isDead(character)).length;
  if (alive >= getMercenaryLimit(state)) return;
  if (alive >= strategy.hireBelow) return;
  const recruit = [...state.recruitPool]
    .map((candidate) => ({ candidate, cost: recruitCost(candidate) }))
    .filter((entry) => state.gold - entry.cost >= strategy.reserveGold)
    .sort((a, b) => calculateEffectiveCharacterCombatPower(b.candidate) - calculateEffectiveCharacterCombatPower(a.candidate))[0];
  if (!recruit) return;
  const beforeGold = state.gold;
  hireRecruit(recruit.candidate.id);
  dayRecord.actions.push({
    type: "hire",
    text: `招募 ${recruit.candidate.name}，战力 ${calculateEffectiveCharacterCombatPower(recruit.candidate)}，签字费 ${beforeGold - getState().gold} 金。`,
  });
}

function maybeDismissLiabilities(strategy, dayRecord) {
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
  dismissMercenary(target.id);
  dayRecord.actions.push({ type: "dismiss", text: `解雇 ${target.name}，战力 ${candidates[0].power}，负担 ${candidates[0].burden}。` });
}

function maybeDismissForSecrecy(strategy, dayRecord) {
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
  dismissMercenary(target.character.id);
  dayRecord.actions.push({
    type: "dismiss",
    text: `月底解雇 ${target.character.name}，个人声望 ${target.personalReputation}，战力 ${target.power}，避免隐秘费负担。`,
  });
}

function payMonthlySecrecyIfDue(dayRecord) {
  const state = getState();
  if (!isSecrecyBillingDay(state.day)) return;
  const items = calculateSecrecyExpenseItems(state);
  let remainingGold = state.gold;
  const paidIds = [];
  const paidItems = [];
  for (const item of items.sort((a, b) => a.cost - b.cost)) {
    if (remainingGold < item.cost) continue;
    remainingGold -= item.cost;
    paidIds.push(item.id);
    paidItems.push(item);
  }
  approveSecrecyExpenses(paidIds);
  const total = paidItems.reduce((sum, item) => sum + item.cost, 0);
  dayRecord.actions.push({
    type: "secrecy",
    text: `月初隐秘费结算：支付 ${paidItems.length}/${items.length} 项，共 ${total} 金；未支付声望 ${calculateUnpaidSecrecyReputation(getState())}。`,
  });
}

function daysUntilSecrecyBilling(day) {
  const first = 31;
  const cycle = 30;
  if (day <= first) return first - day;
  const mod = (day - first) % cycle;
  return mod === 0 ? 0 : cycle - mod;
}

function chooseTeamForMission(mission, availableMercs, strategy) {
  const min = mission.recommendedTeamSize?.min ?? 1;
  const max = Math.min(4, mission.recommendedTeamSize?.max ?? 4);
  const sorted = [...availableMercs].sort((a, b) => calculateEffectiveCharacterCombatPower(b) - calculateEffectiveCharacterCombatPower(a));
  const candidates = [];
  for (let size = min; size <= Math.min(max, sorted.length); size += 1) candidates.push(sorted.slice(0, size));
  if (strategy.prefer === "throughput" && sorted.length > min) candidates.push(sorted.slice(Math.max(0, sorted.length - min), sorted.length));
  if (candidates.length === 0 && sorted.length > 0) candidates.push(sorted.slice(0, 1));
  return candidates
    .map((team) => ({ team, fit: evaluateMissionFit(team.map((character) => character.id), mission) }))
    .sort((a, b) => b.fit.chance - a.fit.chance)[0]?.team ?? [];
}

function scoreMission(strategy, fit, mission, reward, duration) {
  if (strategy.prefer === "reward") return reward + fit.chance * 1.2 + (mission.difficulty ?? 1) * 8;
  if (strategy.prefer === "profit") return reward / Math.max(1, duration) + fit.chance * 0.8;
  if (strategy.prefer === "throughput") return fit.chance * 1.5 + reward / Math.max(1, duration) - duration * 6;
  return fit.chance * 2 + reward / Math.max(1, duration) - (mission.difficulty ?? 1) * 3;
}

function summarizeState() {
  const state = getState();
  const alive = state.roster.filter((character) => !isDead(character));
  const idle = alive.filter(isIdle);
  const active = alive.filter((character) => !isIdle(character));
  const expenses = calculateDailyExpenseBreakdown(state);
  return {
    day: state.day,
    status: state.gameStatus,
    gold: state.gold,
    supplies: state.supplies,
    baseReputation: state.reputation ?? 0,
    unpaidSecrecy: calculateUnpaidSecrecyReputation(state),
    stealth: state.stealth,
    raidChance: Math.max(0, 100 - state.stealth),
    dailyExpense: expenses.total,
    roster: alive.length,
    idle: idle.length,
    active: active.length,
    avgPower: round(avg(alive.map(calculateEffectiveCharacterCombatPower)), 1),
    totalPower: sum(alive.map(calculateEffectiveCharacterCombatPower)),
    avgStress: round(avg(alive.map((character) => character.stress ?? 0)), 1),
    maxStress: max(alive.map((character) => character.stress ?? 0)),
    avgWound: round(avg(alive.map((character) => character.wound ?? 0)), 1),
    conditions: sum(alive.map((character) => character.conditions?.length ?? 0)),
    facilities: Object.entries(state.buildings)
      .filter(([, level]) => level > 0)
      .map(([id, level]) => (id === "defenses" ? `${facilityName(id)}x${level}` : `${facilityName(id)}${getFacilityRankLabel(level)}`))
      .join("、") || "无",
  };
}

function summarizeMissionBoard() {
  return getMissions()
    .filter((mission) => mission.status === "available")
    .map((mission) => {
      const range = getMissionPowerRange(mission);
      return `${mission.name}(${mission.reward.gold}金/${range.low}-${range.high}/截止${mission.expiresDay})`;
    });
}

function summarizeRosterDetail() {
  return getState().roster.filter((character) => !isDead(character)).map((character) => ({
    name: character.name,
    rank: character.rank,
    status: character.status,
    power: calculateEffectiveCharacterCombatPower(character),
    stress: character.stress ?? 0,
    wound: character.wound ?? 0,
    reputation: character.personalReputation ?? 0,
    conditions: (character.conditions ?? []).map((condition) => condition.name).join("、") || "无",
  }));
}

function summarizeActiveContracts() {
  const state = getState();
  return getMissions()
    .filter((mission) => mission.status === "active")
    .map((mission) => {
      const names = (mission.assigned ?? [])
        .map((id) => state.roster.find((character) => character.id === id)?.name)
        .filter(Boolean)
        .join("、");
      return `${mission.name}(${names}，剩余${mission.remaining}天)`;
    });
}

function summarizeAdvanceDelta(before, after, beforeEvents, afterEvents) {
  return {
    gold: after.gold - before.gold,
    stealth: after.stealth - before.stealth,
    reputation: after.baseReputation - before.baseReputation,
    stress: round(after.avgStress - before.avgStress, 1),
    wound: round(after.avgWound - before.avgWound, 1),
    completedContracts: afterEvents.completedContracts - beforeEvents.completedContracts,
    failedContracts: afterEvents.failedContracts - beforeEvents.failedContracts,
    deaths: afterEvents.deaths - beforeEvents.deaths,
    conditions: afterEvents.conditions - beforeEvents.conditions,
  };
}

function eventCounters() {
  const state = getState();
  return {
    completedContracts: state.timeline.filter((entry) => entry.type === "contract" && entry.status === "done").length,
    failedContracts: state.timeline.filter((entry) => entry.type === "contract" && entry.status === "failed").length,
    deaths: state.roster.filter(isDead).length,
    conditions: sum(state.roster.map((character) => (character.conditions?.length ?? 0) + (character.positiveConditions?.length ?? 0))),
  };
}

function collectNewLogLines(startDay, endDay) {
  return getState().log.filter((line) => {
    const match = line.match(/第\s*(\d+)\s*天/);
    if (!match) return false;
    const day = Number(match[1]);
    return day >= startDay && day <= endDay;
  }).slice(-12);
}

function buildTotals(days) {
  return {
    days: days.length,
    dispatches: sum(days.map((day) => day.actions.filter((action) => action.type === "dispatch").length)),
    investigations: sum(days.map((day) => day.actions.filter((action) => action.type === "investigate").length)),
    hires: sum(days.map((day) => day.actions.filter((action) => action.type === "hire").length)),
    facilityUpgrades: sum(days.map((day) => day.actions.filter((action) => action.type === "facility").length)),
    marketPurchases: sum(days.map((day) => day.actions.filter((action) => action.type === "market").length)),
    hospitalTreatments: sum(days.map((day) => day.actions.filter((action) => action.type === "hospital").length)),
    completedContracts: sum(days.map((day) => day.advance.completedContracts)),
    failedContracts: sum(days.map((day) => day.advance.failedContracts)),
    deaths: sum(days.map((day) => day.advance.deaths)),
    newConditions: sum(days.map((day) => Math.max(0, day.advance.conditions))),
  };
}

function renderMarkdownReport(report) {
  const lines = [];
  lines.push("# Gun-Core 逐日精细化测试报告");
  lines.push("");
  lines.push(`- 策略：${report.strategy.name} (${report.strategy.id})`);
  lines.push(`- 种子：${report.seed}`);
  lines.push(`- 计划天数：${report.maxDays}`);
  lines.push(`- 实际记录天数：${report.days.length}`);
  lines.push("");
  lines.push("## 总结");
  lines.push("");
  lines.push(`- 起始：${formatBaseState(report.start)}`);
  lines.push(`- 结束：${formatBaseState(report.end)}`);
  lines.push(`- 行动统计：派遣 ${report.totals.dispatches}，调查 ${report.totals.investigations}，招募 ${report.totals.hires}，设施升级 ${report.totals.facilityUpgrades}，黑市购买 ${report.totals.marketPurchases}，医院治疗 ${report.totals.hospitalTreatments}`);
  lines.push(`- 结果统计：完成契约 ${report.totals.completedContracts}，失败契约 ${report.totals.failedContracts}，死亡 ${report.totals.deaths}，新增状态 ${report.totals.newConditions}`);
  lines.push("");
  lines.push("## 逐日记录");
  for (const day of report.days) {
    lines.push("");
    lines.push(`### 第 ${day.day} 天`);
    lines.push("");
    lines.push(`- 日初基地：${formatBaseState(day.before)}`);
    lines.push(`- 契约面板：${day.board.length ? day.board.join("；") : "无"}`);
    lines.push(`- 当日行动：${day.actions.length ? "" : "无"}`);
    day.actions.forEach((action) => lines.push(`  - ${action.text}`));
    lines.push(`- 推进结算：资金 ${signed(day.advance.gold)}，隐秘 ${signed(day.advance.stealth)}，基地声望 ${signed(day.advance.reputation)}，均压 ${signed(day.advance.stress)}，均伤 ${signed(day.advance.wound)}，完成 ${day.advance.completedContracts}，失败 ${day.advance.failedContracts}，死亡 ${day.advance.deaths}，状态变化 ${signed(day.advance.conditions)}`);
    lines.push(`- 日末基地：${formatBaseState(day.after)}`);
    lines.push(`- 执行中契约：${day.activeContracts.length ? day.activeContracts.join("；") : "无"}`);
    lines.push("- 佣兵状态：");
    day.roster.forEach((character) => {
      lines.push(`  - ${character.name}：${character.rank}，${character.status}，战力 ${character.power}，压力 ${character.stress}，伤势 ${character.wound}，个人声望 ${character.reputation}，负面 ${character.conditions}`);
    });
    if (day.events.length) {
      lines.push("- 关键日志：");
      day.events.forEach((event) => lines.push(`  - ${event}`));
    }
  }
  lines.push("");
  lines.push("## 使用方式");
  lines.push("");
  lines.push("- `node tools/daily-audit-sim.mjs 45 growth > reports/daily-audit-growth.md`");
  lines.push("- 参数 1：模拟天数。参数 2：策略，可选 `conservative`、`aggressive`、`growth`、`profit`。参数 3：随机种子。");
  lines.push("- 报告重点看每日资金净变化、日支出、契约完成/失败、佣兵压力伤势和隐秘值波动。");
  lines.push("");
  return lines.join("\n");
}

function formatBaseState(state) {
  return `第 ${state.day} 天，资金 ${state.gold}，补给 ${state.supplies}，基地声望 ${state.baseReputation}，隐秘 ${state.stealth}/100，遇袭率 ${state.raidChance}%，未付声望 ${state.unpaidSecrecy}，日支出 ${state.dailyExpense}，佣兵 ${state.roster} 人(待命 ${state.idle}/执行 ${state.active})，总战力 ${state.totalPower}，均战 ${state.avgPower}，均压 ${state.avgStress}，均伤 ${state.avgWound}，负面 ${state.conditions}，设施 ${state.facilities}`;
}

function normalizeTextsForSimulation() {
  updateState(
    (draft) => {
      for (const character of [...draft.roster, ...draft.recruitPool]) {
        if (character.status !== "阵亡") character.status = "待命";
        if (character.rank !== "无" && !["F", "E", "D", "C", "B", "A", "S"].includes(character.rank)) character.rank = "无";
      }
    },
    { save: false, notify: false }
  );
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

function scoreWeaponForMission(item, wantedWeapons = [], wantedDamageTypes = []) {
  return (item.power ?? 0) + (wantedWeapons.includes(item.type) ? 18 : 0) + (wantedDamageTypes.includes(item.damageType) ? 10 : 0);
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

function isIdle(character) {
  return character.status === "待命";
}

function isDead(character) {
  return character.status === "阵亡";
}

function facilityName(id) {
  const names = {
    tavern: "酒馆",
    barracks: "兵营",
    defenses: "防御设施",
    blackMarket: "黑市",
    hospital: "医疗中心",
    infirmary: "娱乐中心",
    intel: "情报室",
  };
  return names[id] ?? id;
}

function marketKindName(kind) {
  return { weapon: "武器", armor: "防具", supplies: "补给", mecha: "机甲" }[kind] ?? kind;
}

function intelName(key) {
  return { power: "战力区间", damageTypes: "敌方伤害", careerCategories: "推荐职业", weaponTypes: "推荐武器", teamSize: "需求人数" }[key] ?? key;
}

function signed(value) {
  if (!Number.isFinite(value)) return String(value);
  if (value > 0) return `+${value}`;
  return String(value);
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
