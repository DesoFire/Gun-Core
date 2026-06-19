import {
  missionBriefFragments,
  missionHiddenTwists,
  missionRandomEvents,
  missionIntelFields,
  missionIntelPool,
  missionIssuers,
  missionRequirementPool,
  missionTypes,
  mercenaryRanks,
  missionTemplates,
  mentalConditions,
  negativeConditions,
  otherMissionIssuers,
  promotionChances,
} from "../data/sampleData.js";
import { getAllTrainingSkills } from "../data/trainingPools.js";
import { getNextStoryStageConfig, getStoryRouteConfig } from "../data/storyRoutes.js";
import { economyConfig } from "../data/economyConfig.js";
import { getState, updateState } from "../js/state.js";
import { calculateUnpaidSecrecyReputation, createRankedMecha, identityFee, payDailyUpkeep } from "./faction.js";
import { evaluateGameOverDraft } from "./game.js";
import { calculateEffectiveCharacterCombatPower, calculateTeamCombatPower, getInjuryState, getPressureState, getPromotionCombatPowerGain } from "./combatPower.js";
import { clamp, createId, randomItem, randomNumber } from "../js/utils.js";
import { generateArmorItem } from "./armorGenerator.js";
import { generateWeaponItem } from "./weaponGenerator.js";
import {
  getAdvancePaymentRateBonus,
  getDeathRiskModifier,
  getInvestigationSkillDiscount,
  getLootChanceBonus,
  getMentalRiskModifier,
  getNegativeEventWeightMultiplier,
  getRewardGoldMultiplier as getSkillRewardGoldMultiplier,
  getStealthEventImpactMultiplier,
  getTeamMissionChanceBonus,
  getTeamSizePenaltyReduction,
  getWoundRiskModifier,
  hasSkill,
} from "./skillEffects.js";

export function getMissions() {
  return getState().missions;
}

export function createMission(options = {}) {
  const storyMission = options.storyMission ?? chooseStoryMissionForState(getState());
  if (storyMission) options = createStoryMissionOptions(storyMission, options);
  const state = getState();
  const type = options.type ?? randomItem(missionTypes);
  const issuer = options.issuer ?? randomIssuerForState(state);
  const routeInfo = createMissionRouteInfo({ state, issuer, type, options });
  const difficultyConfig = economyConfig.missions.difficulty;
  const reputationTier = Math.floor((state.reputation ?? 0) / difficultyConfig.reputationTierStep);
  const difficulty = options.difficulty ?? clamp(randomNumber(difficultyConfig.baseMin, difficultyConfig.baseMax) + reputationTier, difficultyConfig.min, difficultyConfig.max);
  const duration = options.duration ?? randomNumber(1, 3 + Math.floor(difficulty / 2));
  const issueDay = options.issueDay ?? state.day ?? 1;
  const expiresDay = options.expiresDay ?? issueDay + randomNumber(2, 4) + Math.floor(difficulty / 2);
  const rewardConfig = economyConfig.missions.reward;
  const rewardGold = Math.round(
    (rewardConfig.baseGold + difficulty * randomNumber(rewardConfig.goldPerDifficultyMin, rewardConfig.goldPerDifficultyMax)) *
      (options.rewardMultiplier ?? 1) *
      getStoryRouteRewardMultiplier(state, routeInfo.storyRoute)
  );
  const rewardReputation = Math.max(
    rewardConfig.minReputation,
    Math.round(
      difficulty * rewardConfig.reputationPerDifficulty +
        randomNumber(rewardConfig.reputationRandomMin, rewardConfig.reputationRandomMax)
    )
  );
  const name = options.name ?? `${type.name}契约：${randomMissionSubject(type)}`;
  const powerRequirement = options.powerRequirement ?? calculateMissionPowerRequirement(difficulty, state.reputation ?? 0);
  const recommendedTeamSize = options.recommendedTeamSize ?? createRecommendedTeamSize(difficulty);
  const requirements = options.requirements ?? createMissionRequirements(difficulty);

  return {
    id: createId(),
    name,
    issuer,
    storyRoute: routeInfo.storyRoute,
    isStoryMission: routeInfo.isStoryMission,
    storyStage: routeInfo.storyStage,
    routeLocking: routeInfo.routeLocking,
    moralBrief: routeInfo.moralBrief,
    type: type.name,
    typeCode: type.code,
    actionType: type.actionType,
    acquisition: options.acquisition ?? "广撒网",
    difficulty,
    powerRequirement,
    powerIntelLevel: options.powerIntelLevel ?? 0,
    recommendedTeamSize,
    requirements,
    duration,
    issueDay,
    expiresDay,
    reward: { gold: rewardGold, reputation: rewardReputation },
    description: options.description ?? `${randomItem(type.verbs)}目标。${randomItem(missionBriefFragments)}`,
    intel: createMissionIntel(),
    revealedIntel: options.freeIntel ? [randomItem(missionIntelFields).key] : [],
    hidden: { twist: randomMissionHiddenTwist() },
    refreshCost: calculateRefreshCost(difficulty),
    investigateCost: calculateInvestigateCost({ rewardGold }),
    assigned: [],
    remaining: duration,
    status: "available",
  };
}

export function normalizeMission(mission) {
  normalizeLegacyMission(mission);
  mission.remaining ??= mission.duration;
  mission.assigned ??= [];
  mission.status ??= "available";
  normalizeMissionPlanningFields(mission);
  return mission;
}

export function refreshMission(id) {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const index = draft.missions.findIndex((item) => item.id === id);
    const mission = draft.missions[index];
    if (!mission || mission.status !== "available") return;

    const cost = mission.refreshCost ?? calculateRefreshCost(mission.difficulty ?? 2);
    if (draft.gold < cost) return;

    draft.gold -= cost;
    draft.missions[index] = createMission();
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金刷新了一份契约。`);
  });
}

export function investigateMission(id, intelKey = "random") {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const mission = draft.missions.find((item) => item.id === id);
    if (!mission || mission.status !== "available") return;

    normalizeMissionPowerFields(mission, draft.reputation ?? 0);
    normalizeMissionPlanningFields(mission);
    normalizeLegacyMission(mission);
    mission.revealedIntel ??= [];
    const target = chooseInvestigationTarget(mission, intelKey);
    if (!target) return;

    const cost = calculateDiscountedInvestigateCost(draft, mission, target.mode);
    if (draft.gold < cost) return;

    draft.gold -= cost;
    let detail = target.label;
    if (target.key === "power") {
      mission.powerIntelLevel += 1;
    } else if (!mission.revealedIntel.includes(target.key)) {
      mission.revealedIntel.push(target.key);
    }
    mission.investigateCost ??= calculateInvestigateCost({ rewardGold: mission.reward?.gold, difficulty: mission.difficulty ?? 2 });
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金调查「${mission.name}」，更新：${detail}。`);
  });
}

export function startMission(id, memberIds) {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const mission = draft.missions.find((item) => item.id === id);
    if (!mission || mission.status !== "available") return;
    normalizeStoryMissionFields(mission);
    if (!canStartMissionForStoryRoute(draft, mission)) {
      draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」因路线冲突无法接取。`);
      return;
    }
    const validMemberIds = [...new Set(memberIds)].filter((memberId) =>
      draft.roster.some((character) => character.id === memberId && character.status === "待命")
    );
    if (validMemberIds.length === 0) return;
    if (validMemberIds.length > 4) {
      draft.log.push(`第 ${draft.day} 天：一支派遣小队最多 4 人。`);
      return;
    }

    applyStoryRouteStartDraft(draft, mission);
    mission.status = "active";
    mission.assigned = [...validMemberIds];
    mission.remaining = mission.duration;
    mission.startDay = draft.day;
    mission.endDay = draft.day + mission.duration;
    const team = draft.roster.filter((character) => validMemberIds.includes(character.id));
    mission.advancePaid = calculateMissionAdvancePayment(mission, team);
    draft.gold += mission.advancePaid;
    mission.deferredWages = Object.fromEntries(
      validMemberIds.map((memberId) => {
        const character = draft.roster.find((item) => item.id === memberId);
        return [memberId, character ? identityFee(character) : 0];
      })
    );
    mission.deferredWageDays = mission.duration;
    draft.roster.forEach((character) => {
      if (validMemberIds.includes(character.id)) character.status = `履行「${mission.name}」`;
    });
    refillAvailableMissionsDraft(draft);
    draft.log.push(`第 ${draft.day} 天：小队已出发履行契约「${mission.name}」。`);
  });
}

export function advanceDay() {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    draft.day += 1;
    resolveBaseRaidDraft(draft);
    payDailyUpkeep(draft);
    draft.missions
      .filter((mission) => mission.status === "active")
      .forEach((mission) => {
        mission.remaining -= 1;
        if (mission.remaining <= 0) resolveMissionDraft(draft, mission);
      });

    const expiredMissions = draft.missions.filter((mission) => mission.status === "available" && mission.expiresDay < draft.day);
    expiredMissions.forEach((mission) => {
      draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」超过截止日，已从列表撤下。`);
    });
    draft.missions = draft.missions.filter((mission) => mission.status !== "available" || mission.expiresDay >= draft.day);

    refillAvailableMissionsDraft(draft);

    evaluateGameOverDraft(draft);
  });
}

export function calculateMissionChance(memberIds, mission) {
  const state = getState();
  return calculateMissionChanceFromRoster(state.roster, state.facilities, memberIds, mission);
}

export function getMissionRisk(memberIds, mission) {
  return getRiskLabel(calculateMissionChance(memberIds, mission));
}

export function getMissionRiskTag(mission) {
  const config = economyConfig.missions.display;
  const roughChance = clamp(
    config.roughRiskBase -
      (mission.difficulty ?? 2) * config.roughRiskDifficultyPenalty -
      (mission.duration ?? 1) * config.roughRiskDurationPenalty,
    config.roughRiskMin,
    config.roughRiskMax
  );
  return getRiskLabel(roughChance);
}

export function evaluateMissionFit(memberIds, mission) {
  const state = getState();
  return evaluateMissionFitFromRoster(state.roster, state.facilities, memberIds, mission);
}

export function getMissionPowerRange(mission) {
  normalizeMissionPowerFields(mission, getState().reputation ?? 0);
  const level = mission.powerIntelLevel ?? 0;
  const spread = economyConfig.missions.display.powerIntelSpreads[Math.min(level, 3)];
  const low = Math.max(1, mission.powerRequirement - spread);
  const high = mission.powerRequirement + spread;
  return { low, high, level };
}

export function getTeamCombatPower(memberIds) {
  const state = getState();
  return calculateTeamCombatPower(state.roster, memberIds);
}

function resolveMissionDraft(draft, mission) {
  normalizeMissionPowerFields(mission, draft.reputation ?? 0);
  normalizeMissionPlanningFields(mission);
  const fit = evaluateMissionFitFromRoster(draft.roster, draft.facilities, mission.assigned, mission);
  const teamPower = fit.teamPower;
  const gap = teamPower - mission.powerRequirement;
  const chance = fit.chance;
  const success = randomNumber(1, 100) <= chance;
  const team = draft.roster.filter((character) => mission.assigned.includes(character.id));
  const mechaMismatch = hasEnemyMechaMismatch(team, mission);
  const initialGold = draft.gold ?? 0;
  const initialBaseReputation = draft.reputation ?? 0;
  const memberSnapshots = new Map(
    team.map((character) => [
      character.id,
      {
        personalReputation: character.personalReputation ?? 0,
        conditionIds: new Set((character.conditions ?? []).map((condition) => condition.id)),
      },
    ])
  );
  const outcome = applyHiddenTwistDraft(draft, mission, team, success);
  const enemyDamageTypes = mission.requirements?.damageTypes ?? [];

  team.forEach((character) => {
    character.missionRecord.survived += 1;
    if (success) character.missionRecord.completed += 1;
    if (!success) character.missionRecord.failed += 1;
    const deathRisk = calculateDeathRisk(gap, mission.difficulty, character, team, success, { mechaMismatch });
    const woundRisk = calculateWoundRisk(gap, mission.difficulty, success, team, { mechaMismatch });
    const mentalRisk = calculateMentalConditionRisk(gap, mission.difficulty, success, team);
    if (randomNumber(1, 100) <= deathRisk) {
      character.status = "阵亡";
      draft.log.push(`第 ${draft.day} 天：${character.name} 在「${mission.name}」中阵亡。`);
      return;
    }
    character.status = "待命";
    if (randomNumber(1, 100) <= woundRisk) {
      applyNegativeConditionDraft(draft, character, {
        severity: chooseConditionSeverity(gap, mission.difficulty, success),
        damageType: randomItem(enemyDamageTypes),
        armorMatched: hasMatchingArmor(character, enemyDamageTypes),
      });
    }
    maybeApplyDamageTypeConditionDraft(draft, character, mission, gap, success);
    if (randomNumber(1, 100) <= mentalRisk) {
      applyNegativeConditionDraft(draft, character, {
        category: "mental",
        severity: chooseMentalConditionSeverity(gap, mission.difficulty, success),
      });
    }
    if (success) resolveGrowthDraft(draft, character, mission.actionType ?? "logistics");
  });

  let loot = null;
  let reputationDelta = 0;

  if (success) {
    const grossGold = Math.max(0, Math.round((mission.reward.gold + outcome.goldDelta) * getRewardGoldMultiplier(team)));
    const gold = Math.max(0, grossGold - (mission.advancePaid ?? 0));
    const reputation = Math.max(0, mission.reward.reputation + outcome.reputationDelta);
    reputationDelta = reputation;
    distributeMissionReputationDraft(draft, team.filter((character) => character.status !== "阵亡"), reputation);
    draft.gold += gold;
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」成功。队伍战斗力 ${teamPower} / 需求 ${mission.powerRequirement}，获得 ${gold} 金，队员瓜分 ${reputation} 声望。${outcome.text}${mechaMismatch ? " 敌方机动兵器造成额外压制。" : ""}`);
    loot = rollCombatLootDraft(draft, mission, `契约「${mission.name}」`, team);
  } else {
    const reputationLoss = calculateMissionReputationLoss(mission, team.length);
    reputationDelta = -reputationLoss * (team.length + 1);
    applyMissionReputationLossDraft(draft, team.filter((character) => character.status !== "阵亡"), reputationLoss);
    if (outcome.reputationDelta > 0) distributeMissionReputationDraft(draft, team.filter((character) => character.status !== "阵亡"), outcome.reputationDelta);
    draft.gold += outcome.goldDelta;
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」失败。队伍战斗力 ${teamPower} / 需求 ${mission.powerRequirement}，伤亡风险上升。${outcome.text}${mechaMismatch ? " 敌方机动兵器把现场变成了账单粉碎机。" : ""}`);
  }

  applyStoryRouteResolutionDraft(draft, mission, success);
  settleReturningWagesDraft(draft, mission, team.filter((character) => character.status !== "阵亡"));
  const finalBaseReputation = draft.reputation ?? 0;
  const memberReputationDelta = team.reduce((sum, character) => {
    const snapshot = memberSnapshots.get(character.id);
    return sum + ((character.personalReputation ?? 0) - (snapshot?.personalReputation ?? 0));
  }, 0);
  const settlementMembers = team.map((character) => {
    const snapshot = memberSnapshots.get(character.id);
    const newConditions = (character.conditions ?? [])
      .filter((condition) => !snapshot?.conditionIds?.has(condition.id))
      .map((condition) => condition.name);
    return {
      id: character.id,
      name: character.name,
      status: character.status,
      combatPower: calculateEffectiveCharacterCombatPower(character),
      injuryLabel: getInjuryState(character).label,
      pressureLabel: getPressureState(character).label,
      newConditions,
    };
  });
  draft.lastSettlement = {
    id: createId(),
    day: draft.day,
    missionId: mission.id,
    title: mission.name,
    success,
    teamPower,
    requiredPower: mission.powerRequirement,
    goldDelta: (draft.gold ?? 0) - initialGold,
    reputationDelta: (finalBaseReputation - initialBaseReputation) + memberReputationDelta,
    remainingGold: draft.gold ?? 0,
    lootName: loot?.name ?? "",
    lootType: loot ? formatLootItemType(loot.itemCategory ?? loot.slot) : "",
    lootRarity: loot?.rarity ?? "",
    summaryText: `${outcome.text}${mechaMismatch ? " 敌方存在机动兵器，我方未部署机动兵器，成功率与伤亡率均受到显著惩罚。" : ""}`,
    members: settlementMembers,
  };

  draft.missions = draft.missions.filter((item) => item.id !== mission.id);
  evaluateGameOverDraft(draft);
}

function settleReturningWagesDraft(draft, mission, returningTeam) {
  if (returningTeam.length === 0) return;

  const serviceDays = Math.max(
    1,
    mission.deferredWageDays ?? ((draft.day ?? mission.endDay ?? 0) - (mission.startDay ?? draft.day ?? 0))
  );
  const totalWages = returningTeam.reduce((sum, character) => {
    const dailyWage = mission.deferredWages?.[character.id] ?? identityFee(character);
    return sum + dailyWage * serviceDays;
  }, 0);
  if (totalWages <= 0) return;

  if (draft.gold >= totalWages) {
    draft.gold -= totalWages;
    draft.log.push(`第 ${draft.day} 天：外勤队伍归来，结清 ${serviceDays} 天外勤薪资 ${totalWages} 金。`);
    return;
  }

  const shortage = totalWages - draft.gold;
  draft.gold = 0;
  draft.log.push(`第 ${draft.day} 天：外勤薪资需要 ${totalWages} 金，但资金缺口 ${shortage} 金。返队佣兵没有拿到完整报酬，隐秘值不受欠薪影响。`);
}

function resolveBaseRaidDraft(draft) {
  const unpaidReputation = calculateUnpaidSecrecyReputation(draft);
  const raidPressure = unpaidReputation + Math.max(0, draft.reputation ?? 0);
  const config = economyConfig.baseRaid;
  const raidChance = clamp(100 - (draft.stealth ?? 0), 0, 100);
  if (raidChance <= 0 || randomNumber(1, 100) > raidChance) return;

  const defenders = draft.roster.filter((character) => character.status === "待命");
  const difficulty = calculateRaidDifficulty(raidPressure);
  if (defenders.length === 0) {
    applyBaseRaidFailureDraft(draft, difficulty, "无人留守");
    return;
  }

  randomlyEquipDefendersDraft(draft, defenders);
  const powerRequirement = calculateMissionPowerRequirement(difficulty, raidPressure);
  const mission = createMission({
    difficulty,
    powerRequirement,
    duration: 1,
    rewardMultiplier: 1,
    recommendedTeamSize: { min: 1, max: 4 },
    requirements: createMissionRequirements(difficulty),
  });
  mission.name = "基地暴露袭击";
  mission.powerRequirement = powerRequirement;
  mission.status = "raid";

  const memberIds = defenders.map((character) => character.id);
  const baseDefensePower = calculateBaseDefensePower(draft);
  const fit = evaluateMissionFitFromRoster(draft.roster, draft.facilities, memberIds, mission, { extraPower: baseDefensePower });
  const success = randomNumber(1, 100) <= fit.chance;
  const gap = fit.teamPower - powerRequirement;
  const enemyDamageTypes = mission.requirements?.damageTypes ?? [];

  defenders.forEach((character) => {
    const mechaMismatch = hasEnemyMechaMismatch(defenders, mission);
    const deathRisk = calculateDeathRisk(gap, difficulty, character, defenders, success, { mechaMismatch });
    const woundRisk = calculateWoundRisk(gap, difficulty, success, defenders, { mechaMismatch });
    const mentalRisk = calculateMentalConditionRisk(gap, difficulty, success, defenders);
    if (randomNumber(1, 100) <= deathRisk) {
      character.status = "阵亡";
      return;
    }
    if (randomNumber(1, 100) <= woundRisk) {
      applyNegativeConditionDraft(draft, character, {
        severity: chooseConditionSeverity(gap, difficulty, success),
        damageType: randomItem(enemyDamageTypes),
        armorMatched: hasMatchingArmor(character, enemyDamageTypes),
      });
    }
    maybeApplyDamageTypeConditionDraft(draft, character, mission, gap, success);
    if (randomNumber(1, 100) <= mentalRisk) {
      applyNegativeConditionDraft(draft, character, {
        category: "mental",
        severity: chooseMentalConditionSeverity(gap, difficulty, success),
      });
    }
  });

  if (success) {
    draft.log.push(`第 ${draft.day} 天：基地遭遇袭击，留守佣兵与防御设施防守成功。防御设施提供 ${baseDefensePower} 战斗力。`);
    rollCombatLootDraft(draft, mission, "基地防守", defenders);
    return;
  }

  applyBaseRaidFailureDraft(draft, difficulty, "防守失败");
}

function calculateRaidDifficulty(raidPressure) {
  const config = economyConfig.baseRaid;
  const reputationPressure = Math.max(config.minUnpaidReputationForRaid ?? 1, raidPressure);
  return clamp(Math.ceil(reputationPressure / config.unpaidReputationPerDifficulty), config.minDifficulty, config.maxDifficulty);
}

function calculateBaseDefensePower(draft) {
  return (draft.facilities?.defenses ?? 0) * economyConfig.facilities.defensePowerPerLevel;
}

export function getMissionRank(missionOrDifficulty = 1) {
  if (typeof missionOrDifficulty === "number") return getMissionRankByDifficulty(missionOrDifficulty);
  const mission = missionOrDifficulty ?? {};
  const averagePower = getMissionAveragePowerRequirement(mission);
  return getRankByAveragePowerRequirement(averagePower);
}

export function getMissionAveragePowerRequirement(mission) {
  const teamSize = getMissionRankTeamSize(mission);
  return Math.max(1, Math.round((mission.powerRequirement ?? 1) / teamSize));
}

function getMissionRankByDifficulty(difficulty = 1) {
  const ranks = ["F", "F", "E", "D", "C", "B", "A", "S"];
  return ranks[Math.max(0, Math.min(ranks.length - 1, difficulty))] ?? "F";
}

function getMissionRankTeamSize(mission) {
  const teamSize = mission.recommendedTeamSize ?? {};
  return Math.max(1, teamSize.max ?? teamSize.min ?? 1);
}

function getRankByAveragePowerRequirement(averagePower) {
  const templates = economyConfig.recruitment.rankTemplates ?? {};
  const ranks = ["F", "E", "D", "C", "B", "A", "S"];
  let selected = "F";
  ranks.forEach((rank) => {
    const range = templates[rank]?.combatPower;
    if (!Array.isArray(range)) return;
    if (averagePower >= range[0]) selected = rank;
  });
  return selected;
}

function rollCombatLootDraft(draft, mission, sourceLabel = "契约", team = []) {
  const config = economyConfig.missions.loot ?? {};
  const baseChance = config.baseChance ?? 25;
  const perDifficulty = config.perDifficulty ?? 3;
  const chance = clamp(baseChance + Math.max(0, (mission.difficulty ?? 1) - 1) * perDifficulty + getLootChanceBonus(team), 0, 100);
  if (randomNumber(1, 100) > chance) return null;

  const baseRank = getMissionRank(mission);
  const rarity = rollLootRank(baseRank);
  const itemType = rollLootItemType(mission, config);
  const item =
    itemType === "mecha"
      ? createRankedMecha(rarity)
      : itemType === "armor"
        ? generateArmorItem({ rarity })
        : generateWeaponItem({ rarity });
  item.source = sourceLabel;
  item.originalPrice = estimateCombatLootOriginalPrice(item);
  draft.inventory.unshift(item);
  draft.log.push(`第 ${draft.day} 天：${sourceLabel}结束后回收战利品「${item.name}」（${formatLootItemType(itemType)} / ${rarity}级）。`);
  return item;
}

function rollLootRank(baseRank) {
  const ranks = ["F", "E", "D", "C", "B", "A", "S"];
  const index = Math.max(0, ranks.indexOf(baseRank));
  const candidates = ranks.slice(Math.max(0, index - 1), Math.min(ranks.length, index + 2));
  return randomItem(candidates.length ? candidates : ["F"]);
}

function rollLootItemType(mission, config) {
  const hasEnemyMecha = Boolean(mission.requirements?.enemyMecha);
  if (hasEnemyMecha) {
    return rollWeightedLootType([
      ["mecha", config.mechaChanceWhenEnemyMecha ?? 10],
      ["armor", config.armorChanceWhenEnemyMecha ?? 45],
      ["weapon", config.weaponChanceWhenEnemyMecha ?? 45],
    ]);
  }
  return rollWeightedLootType([
    ["weapon", config.weaponChance ?? 50],
    ["armor", config.armorChance ?? 50],
  ]);
}

function rollWeightedLootType(entries) {
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight ?? 0), 0);
  if (total <= 0) return "weapon";
  let roll = randomNumber(1, total);
  for (const [type, weight] of entries) {
    roll -= Math.max(0, weight ?? 0);
    if (roll <= 0) return type;
  }
  return entries.at(-1)?.[0] ?? "weapon";
}

function formatLootItemType(type) {
  if (type === "mecha") return "机动兵器";
  if (type === "armor") return "防具";
  return "武器";
}

function estimateCombatLootOriginalPrice(item) {
  const rankIndex = Math.max(0, ["F", "E", "D", "C", "B", "A", "S"].indexOf(item.rarity ?? "F"));
  const config = economyConfig.blackMarket;
  if (item.itemCategory === "weapon" || item.slot === "weapon") return (config.baseCost.weapon ?? 58) + rankIndex * (config.perRank.weapon ?? 14);
  if (item.itemCategory === "armor" || item.slot === "armor") return (config.baseCost.armor ?? 46) + rankIndex * (config.perRank.armor ?? 14);
  if (item.itemCategory === "mecha" || item.slot === "mecha") return (config.baseCost.mecha ?? 150) + rankIndex * (config.perRank.mecha ?? 45);
  return config.baseCost.fallback ?? 40;
}

function randomlyEquipDefendersDraft(draft, defenders) {
  const pool = [...(draft.inventory ?? [])].sort(() => Math.random() - 0.5);
  defenders.forEach((character) => {
    ["weapon", "armor", "mecha"].forEach((slot) => {
      if (slot === "mecha" && !hasPilotTag(character)) return;
      const index = pool.findIndex((item) => item.slot === slot || item.itemCategory === slot);
      if (index < 0) return;
      const [item] = pool.splice(index, 1);
      if (character.equipment?.[slot]) pool.push(character.equipment[slot]);
      character.equipment[slot] = item;
    });
  });
  draft.inventory = pool;
}

function applyBaseRaidFailureDraft(draft, difficulty, reason) {
  const rewardConfig = economyConfig.missions.reward;
  const raidConfig = economyConfig.baseRaid;
  const goldLoss = Math.min(
    Math.max(0, draft.gold),
    rewardConfig.baseGold + difficulty * randomNumber(rewardConfig.goldPerDifficultyMin, rewardConfig.goldPerDifficultyMax)
  );
  const stealthLoss = randomNumber(raidConfig.failureStealthLossMin, raidConfig.failureStealthLossMax);
  draft.gold -= goldLoss;
  draft.stealth = clamp(draft.stealth - stealthLoss, 0, 100);
  maybeDowngradeFacilityDraft(draft);
  draft.log.push(`第 ${draft.day} 天：基地遭遇袭击，${reason}，损失 ${goldLoss} 金，隐秘值下降 ${stealthLoss}。`);
}

function maybeDowngradeFacilityDraft(draft) {
  if (randomNumber(1, 100) > economyConfig.baseRaid.facilityDamageChance) return;
  const candidates = Object.entries(draft.facilities ?? {}).filter(([, level]) => level > 0);
  if (candidates.length === 0) return;
  const [id, level] = randomItem(candidates);
  draft.facilities[id] = Math.max(0, level - economyConfig.baseRaid.facilityDowngradeAmount);
}

function calculateMissionChanceFromRoster(roster, facilities, memberIds, mission) {
  return evaluateMissionFitFromRoster(roster, facilities, memberIds, mission).chance;
}

function refillAvailableMissionsDraft(draft) {
  while (draft.missions.filter((mission) => mission.status === "available").length < economyConfig.missions.missionBoard.availableLimit) {
    draft.missions.push(createMission({ issueDay: draft.day }));
  }
}

function evaluateMissionFitFromRoster(roster, facilities, memberIds, mission, options = {}) {
  if (memberIds.length === 0) {
    return {
      chance: 0,
      teamPower: 0,
      powerGap: -(mission.powerRequirement ?? 0),
      risk: getRiskLabel(0),
      teamSizePenalty: 0,
      matchingWeapons: 0,
      matchingDamageTypes: 0,
      matchingSkillTags: 0,
      skillTagPenalty: 0,
      unlockedIntelBonus: 0,
      intelBonus: 0,
      skillEffectBonus: 0,
    };
  }

  normalizeMissionPowerFields(mission, getState().reputation ?? 0);
  normalizeMissionPlanningFields(mission);
  const team = roster.filter((character) => memberIds.includes(character.id));
  const teamPower = calculateTeamCombatPower(roster, memberIds) + (options.extraPower ?? 0);
  const powerChance = calculateMissionChanceFromPower(teamPower - mission.powerRequirement);
  const rawSizePenalty = calculateTeamSizePenalty(memberIds.length, mission.recommendedTeamSize);
  const sizePenalty = Math.max(0, rawSizePenalty - getTeamSizePenaltyReduction(team, rawSizePenalty));
  const equipmentBonus = calculateEquipmentFitBonus(team, mission);
  const skillFit = calculateSkillTagFit(team, mission);
  const mechaPenalty = hasEnemyMechaMismatch(team, mission)
    ? economyConfig.missions.mechaThreat.noFriendlyMechaChancePenalty
    : 0;
  const unlockedIntelBonus = (mission.revealedIntel?.length ?? 0) * 2 + (mission.powerIntelLevel ?? 0);
  const intelBonus = 0;
  const skillEffectBonus = getTeamMissionChanceBonus(team, mission, {
    fullSkillMatch: skillFit.missing === 0 && (mission.requirements?.skillTags ?? []).length > 0,
  });
  const chance = clamp(
    powerChance + equipmentBonus + skillFit.bonus + unlockedIntelBonus + intelBonus + skillEffectBonus - sizePenalty - skillFit.penalty - mechaPenalty,
    2,
    98
  );

  return {
    chance,
    teamPower,
    powerGap: teamPower - mission.powerRequirement,
    risk: getRiskLabel(chance),
    teamSizePenalty: sizePenalty,
    matchingWeapons: countMatchingEquipmentTags(team, mission.requirements?.weaponTypes ?? []),
    matchingDamageTypes: countMatchingEquipmentTags(team, mission.requirements?.damageTypes ?? []),
    matchingSkillTags: skillFit.matched,
    skillTagPenalty: skillFit.penalty,
    mechaPenalty,
    unlockedIntelBonus,
    intelBonus,
    skillEffectBonus,
  };
}

function getRiskLabel(chance) {
  if (chance >= 90) return { label: "十拿九稳", tone: "safe", description: "除非合同会读心，否则问题不大。" };
  if (chance >= 70) return { label: "有风险", tone: "warning", description: "能接，但别把遗言写得太潦草。" };
  if (chance >= 45) return { label: "高危", tone: "danger", description: "客户说简单，客户一般不进现场。" };
  return { label: "近乎送死", tone: "fatal", description: "这不是契约，是遗产分配预演。" };
}

function calculateTeamSizePenalty(teamSize, recommendedTeamSize) {
  const min = recommendedTeamSize?.min ?? 1;
  const max = recommendedTeamSize?.max ?? 4;
  if (teamSize < min) return (min - teamSize) * 12;
  if (teamSize > max) return (teamSize - max) * 8;
  return 0;
}

function calculateEquipmentFitBonus(team, mission) {
  const weaponMatches = countMatchingEquipmentTags(team, mission.requirements?.weaponTypes ?? []);
  const damageMatches = countMatchingEquipmentTags(team, mission.requirements?.damageTypes ?? []);
  return Math.min(20, weaponMatches * 5 + damageMatches * 4);
}

function calculateSkillTagFit(team, mission) {
  const required = mission.requirements?.skillTags ?? [];
  if (required.length === 0) return { matched: 0, missing: 0, penalty: 0, bonus: 0 };
  const owned = new Set(team.flatMap((character) => getCharacterSkillTags(character)));
  const matched = required.filter((tag) => owned.has(tag)).length;
  const missing = required.length - matched;
  const penalty = missing <= 0 ? 0 : missing * 10 + (matched === 0 ? 6 : 0);
  const bonus = missing === 0 ? 4 : 0;
  return { matched, missing, penalty, bonus };
}

function getCharacterSkillTags(character) {
  return (character.skills ?? []).flatMap((skill) => skill.tags ?? []);
}

function hasPilotTag(character) {
  return getCharacterSkillTags(character).includes("机师");
}

function hasEquippedMecha(character) {
  return Boolean(character.equipment?.mecha);
}

function missionHasEnemyMecha(mission) {
  return Boolean(mission.requirements?.enemyMecha);
}

function teamHasMecha(team) {
  return team.some(hasEquippedMecha);
}

function hasEnemyMechaMismatch(team, mission) {
  return missionHasEnemyMecha(mission) && !teamHasMecha(team);
}

function countMatchingEquipmentTags(team, wantedTags) {
  if (wantedTags.length === 0) return 0;
  return team.reduce((sum, character) => {
    const equipmentTags = Object.values(character.equipment ?? {})
      .filter(Boolean)
      .flatMap((item) => [item.type, item.damageType, item.itemCategory, ...(item.tags ?? [])].filter(Boolean));
    return sum + equipmentTags.filter((tag) => wantedTags.includes(tag)).length;
  }, 0);
}

function randomIssuer() {
  return randomIssuerForState(getState());
}

function chooseStoryMissionForState(state = getState()) {
  if (state.gameStatus !== "active") return null;
  const routes = state.storyRoutes ?? {};
  const locked = routes.lockedRoute;
  if (locked) {
    const next = getNextStoryStageConfig(locked, routes.progress?.[locked] ?? 0);
    return next && randomNumber(1, 100) <= 45 ? { route: locked, stage: next } : null;
  }

  const candidates = [];
  if (getNextStoryStageConfig("SSS", routes.progress?.SSS ?? 0)) candidates.push(["SSS", 12]);
  if (getNextStoryStageConfig("FOF", routes.progress?.FOF ?? 0)) candidates.push(["FOF", 12]);
  if ((routes.attention?.rust ?? 0) >= 3 && getNextStoryStageConfig("rust", routes.progress?.rust ?? 0)) candidates.push(["rust", 10]);
  if (getNextStoryStageConfig("heaven", routes.progress?.heaven ?? 0)) candidates.push(["heaven", 4]);
  const total = candidates.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0 || randomNumber(1, 100) > 24) return null;
  let roll = randomNumber(1, total);
  for (const [route, weight] of candidates) {
    roll -= weight;
    if (roll <= 0) return { route, stage: getNextStoryStageConfig(route, routes.progress?.[route] ?? 0) };
  }
  return null;
}

function createStoryMissionOptions(storyMission, options = {}) {
  const config = getStoryRouteConfig(storyMission.route);
  const stage = storyMission.stage;
  const type = missionTypes.find((item) => item.name === stage.typeName) ?? randomItem(missionTypes);
  const issuer = storyMission.route === "rust" && stage.stage === 1
    ? "匿名雇主"
    : storyMission.route === "heaven"
      ? "天人残余"
      : config.displayName;
  const difficultyConfig = economyConfig.missions.difficulty;
  const baseDifficulty = options.difficulty ?? randomNumber(difficultyConfig.baseMin, difficultyConfig.baseMax);
  const difficulty = clamp(baseDifficulty + (stage.difficultyBonus ?? 0), difficultyConfig.min, difficultyConfig.max);
  return {
    ...options,
    type,
    issuer,
    difficulty,
    storyRoute: storyMission.route,
    isStoryMission: true,
    storyStage: stage.stage,
    routeLocking: Boolean(stage.routeLocking) || stage.stage >= config.lockStage,
    rewardMultiplier: (options.rewardMultiplier ?? 1) * (stage.rewardMultiplier ?? 1),
    requirements: createStoryMissionRequirements(difficulty, stage),
    name: `${stage.title}：${stage.subject}`,
    description: stage.visible,
    moralBrief: {
      visible: stage.visible,
      hiddenCost: stage.hiddenCost,
    },
  };
}

function createStoryMissionRequirements(difficulty, stage) {
  const requirements = createMissionRequirements(difficulty);
  requirements.skillTags = [...new Set([...(stage.requirementTags ?? []), ...(requirements.skillTags ?? [])])].slice(0, 3);
  if (stage.enemyMecha != null) requirements.enemyMecha = Boolean(stage.enemyMecha);
  return requirements;
}

function randomIssuerForState(state = getState()) {
  const routes = state.storyRoutes ?? {};
  if (routes.heavenPact || routes.lockedRoute === "heaven") {
    return randomNumber(1, 100) <= 55 ? "天人残余" : randomItem(["匿名雇主", "二次转包"]);
  }
  if (routes.lockedRoute === "SSS") {
    return randomNumber(1, 100) <= 70 ? "SSS" : randomItem(["企业财团", "科研机构", "匿名雇主", "二次转包"]);
  }
  if (routes.lockedRoute === "FOF") {
    return randomNumber(1, 100) <= 70 ? "FOF" : randomItem(["黑市商会", "匿名雇主", "二次转包"]);
  }
  if (routes.lockedRoute === "rust") {
    return randomNumber(1, 100) <= 65 ? "锈蚀部队" : randomItem(["匿名雇主", "二次转包", "纯净社区"]);
  }
  if (randomNumber(1, 100) <= 35) return randomItem(missionIssuers);
  return randomItem(otherMissionIssuers.filter((issuer) => issuer !== "锈蚀部队"));
}

function createMissionRouteInfo({ state, issuer, type, options }) {
  const explicitRoute = options.storyRoute ?? null;
  let storyRoute = explicitRoute;
  let isStoryMission = Boolean(options.isStoryMission);
  let routeLocking = Boolean(options.routeLocking);
  let storyStage = options.storyStage ?? null;

  if (!storyRoute) {
    if (issuer === "SSS") storyRoute = "SSS";
    if (issuer === "FOF") storyRoute = "FOF";
    if (issuer === "天人残余") storyRoute = "heaven";
    if (issuer === "锈蚀部队") storyRoute = "rust";
  }

  if (!storyRoute && isRustCoverMission(type, issuer)) {
    storyRoute = "rust";
    isStoryMission = true;
    storyStage ??= Math.max(1, Math.min(2, Math.floor(((state.storyRoutes?.attention?.rust ?? 0) + 2) / 3)));
  }

  if (storyRoute === "heaven" && issuer === "天人残余") {
    isStoryMission = true;
    routeLocking = true;
    storyStage ??= Math.max(1, (state.storyRoutes?.progress?.heaven ?? 0) + 1);
  }

  if ((storyRoute === "SSS" || storyRoute === "FOF") && randomNumber(1, 100) <= 18) {
    isStoryMission = true;
    storyStage ??= Math.max(1, (state.storyRoutes?.progress?.[storyRoute] ?? 0) + 1);
    routeLocking = storyStage >= 3;
  }

  if (storyRoute === "rust" && issuer === "锈蚀部队") {
    isStoryMission = true;
    storyStage ??= Math.max(1, (state.storyRoutes?.progress?.rust ?? 0) + 1);
    routeLocking = storyStage >= 3;
  }

  return {
    storyRoute,
    isStoryMission,
    storyStage,
    routeLocking,
    moralBrief: options.moralBrief ?? createRouteMoralBrief(storyRoute, type),
  };
}

function getStoryRouteRewardMultiplier(state, route) {
  const progress = state.storyRoutes?.progress?.[route] ?? 0;
  if (route === "SSS") return 1 + progress * 0.03;
  if (route === "FOF") return 1 + progress * 0.04;
  if (route === "rust") return 1 + progress * 0.05;
  if (route === "heaven") return 1 + (state.storyRoutes?.alienSupport ?? 0) * 0.04;
  return 1;
}

function isRustCoverMission(type, issuer) {
  if (!["匿名雇主", "二次转包", "纯净社区"].includes(issuer)) return false;
  if (!["破坏", "突袭", "回收", "特殊"].includes(type.name)) return false;
  return randomNumber(1, 100) <= 14;
}

function createRouteMoralBrief(route, type) {
  const fallback = {
    visible: "明面上，这仍是一份可以结算的契约。",
    hiddenCost: "暗地里，它会把一些人的名字从公开记录里擦掉。",
  };
  const briefs = {
    SSS: {
      visible: "恢复秩序、供电和调度，让红色系统重新把失控地区接回账本。",
      hiddenCost: "审查和清洗会跟着后勤车一起抵达，部分证词会在秩序恢复前消失。",
    },
    FOF: {
      visible: "保护证词、联络地方力量，让蓝色改革派获得继续作战的理由。",
      hiddenCost: "革命也需要诱饵、保密名单和不会被写进宣言的外包处决。",
    },
    rust: {
      visible: "破坏矩阵节点、战争工厂或异源技术链条，让战争机器降温。",
      hiddenCost: "同一条线路也可能连着医院、净水泵和普通人的明天。",
    },
    heaven: {
      visible: "接受天人残余的异常支援，处理人类技术无法解释的问题。",
      hiddenCost: "从这一刻起，人类社会会把你的组织视为异源代理。",
    },
  };
  if (route === "rust" && type?.name === "破坏") return briefs.rust;
  return briefs[route] ?? fallback;
}

function normalizeStoryMissionFields(mission) {
  mission.storyRoute ??= inferMissionRoute(mission);
  mission.isStoryMission ??= Boolean(mission.storyRoute && ["天人残余", "锈蚀部队"].includes(mission.issuer));
  mission.storyStage ??= null;
  mission.routeLocking ??= mission.storyRoute === "heaven" && mission.issuer === "天人残余";
  mission.moralBrief ??= createRouteMoralBrief(mission.storyRoute, mission);
}

function inferMissionRoute(mission) {
  if (mission.issuer === "SSS") return "SSS";
  if (mission.issuer === "FOF") return "FOF";
  if (mission.issuer === "天人残余") return "heaven";
  if (mission.issuer === "锈蚀部队") return "rust";
  return null;
}

function canStartMissionForStoryRoute(draft, mission) {
  const routes = draft.storyRoutes ?? {};
  const route = mission.storyRoute;
  if ((routes.heavenPact || routes.lockedRoute === "heaven") && mission.issuer !== "天人残余" && !["匿名雇主", "二次转包"].includes(mission.issuer)) {
    return false;
  }
  if (!route || !routes.lockedRoute) return true;
  if (routes.lockedRoute === route) return true;
  return ["匿名雇主", "二次转包"].includes(mission.issuer);
}

function applyStoryRouteStartDraft(draft, mission) {
  draft.storyRoutes ??= {};
  draft.storyRoutes.progress ??= { SSS: 0, FOF: 0, rust: 0, heaven: 0 };
  if (mission.storyRoute === "heaven" && mission.issuer === "天人残余") {
    draft.storyRoutes.heavenPact = true;
    draft.storyRoutes.lockedRoute = "heaven";
    draft.log.push(`第 ${draft.day} 天：接受天人残余契约后，组织被永久标记为异源代理。`);
  }
  if (mission.routeLocking && mission.storyRoute && mission.storyRoute !== "heaven") {
    draft.storyRoutes.lockedRoute = mission.storyRoute;
    draft.log.push(`第 ${draft.day} 天：组织路线锁定为 ${formatStoryRouteName(mission.storyRoute)}。`);
  }
}

function applyStoryRouteResolutionDraft(draft, mission, success) {
  normalizeStoryMissionFields(mission);
  draft.storyRoutes ??= {};
  draft.storyRoutes.progress ??= { SSS: 0, FOF: 0, rust: 0, heaven: 0 };
  draft.storyRoutes.attention ??= { rust: 0 };
  draft.storyRoutes.exposure ??= { rust: 0 };
  draft.storyRoutes.alienSupport ??= 0;
  const route = mission.storyRoute;
  if (!route) return;

  if (success && mission.isStoryMission) {
    const previous = draft.storyRoutes.progress[route] ?? 0;
    const next = Math.max(previous, mission.storyStage ?? (previous + 1));
    draft.storyRoutes.progress[route] = next;
    applyStoryStageRewardDraft(draft, mission);
    draft.log.push(`第 ${draft.day} 天：${formatStoryRouteName(route)}主线推进到第 ${next} 阶段。`);
    const config = getStoryRouteConfig(route);
    if (mission.routeLocking || (config && next >= config.lockStage)) {
      draft.storyRoutes.lockedRoute ??= route;
    }
  }

  if (route === "rust") {
    const gain = mission.type === "破坏" || mission.requirements?.enemyMecha ? 2 : 1;
    draft.storyRoutes.attention.rust = Math.min(100, (draft.storyRoutes.attention.rust ?? 0) + gain);
    if (success) draft.storyRoutes.matrixDamage = Math.min(100, (draft.storyRoutes.matrixDamage ?? 0) + (mission.isStoryMission ? 3 : 1));
  }

  if (success) applyFactionBalanceForRouteDraft(draft, route, mission);
}

function applyStoryStageRewardDraft(draft, mission) {
  const config = getStoryRouteConfig(mission.storyRoute);
  const stage = config?.stageMissions.find((item) => item.stage === mission.storyStage);
  const reward = stage?.reward;
  if (!reward) return;
  const parts = [];
  if (reward.gold) {
    draft.gold += reward.gold;
    parts.push(`${reward.gold} 金`);
  }
  if (reward.enhancementPoints) {
    draft.enhancementPoints = (draft.enhancementPoints ?? 0) + reward.enhancementPoints;
    parts.push(`${reward.enhancementPoints} 强化点`);
  }
  if (reward.reputation) {
    draft.reputation = (draft.reputation ?? 0) + reward.reputation;
    parts.push(`${reward.reputation} 基地声望`);
  }
  if (reward.stealth) {
    draft.stealth = clamp((draft.stealth ?? 0) + reward.stealth, 0, 100);
    parts.push(`${reward.stealth > 0 ? "+" : ""}${reward.stealth} 隐秘`);
  }
  if (reward.matrixDamage) {
    draft.storyRoutes.matrixDamage = Math.min(100, (draft.storyRoutes.matrixDamage ?? 0) + reward.matrixDamage);
    parts.push(`${reward.matrixDamage} 矩阵破坏度`);
  }
  if (reward.alienSupport) {
    draft.storyRoutes.alienSupport = (draft.storyRoutes.alienSupport ?? 0) + reward.alienSupport;
    parts.push(`${reward.alienSupport} 天人支援`);
  }
  if (parts.length > 0) {
    draft.log.push(`第 ${draft.day} 天：完成主线阶段奖励，获得 ${parts.join("、")}。`);
  }
}

function applyFactionBalanceForRouteDraft(draft, route, mission) {
  draft.factionBalance ??= {};
  draft.factionBalance.war ??= { SSS: 70, FOF: 24, 天人残余: 5, 锈蚀部队: 1 };
  draft.factionBalance.order ??= { 民生秩序: 90, 地方暴力: 10 };
  const war = draft.factionBalance.war;
  const order = draft.factionBalance.order;
  const major = mission.isStoryMission ? 3 : 1;
  if (route === "SSS") {
    shiftWarShare(war, "SSS", major, ["FOF", "锈蚀部队"]);
    order.民生秩序 = clamp((order.民生秩序 ?? 90) + 1, 0, 100);
    order.地方暴力 = clamp((order.地方暴力 ?? 10) - 1, 0, 100);
  } else if (route === "FOF") {
    shiftWarShare(war, "FOF", major, ["SSS"]);
    order.民生秩序 = clamp((order.民生秩序 ?? 90) + (mission.type === "营救" ? 1 : 0), 0, 100);
    order.地方暴力 = clamp((order.地方暴力 ?? 10) + (mission.type === "突袭" ? 1 : 0), 0, 100);
  } else if (route === "rust") {
    shiftWarShare(war, "锈蚀部队", major, ["SSS", "FOF"]);
    order.民生秩序 = clamp((order.民生秩序 ?? 90) - 1, 0, 100);
    order.地方暴力 = clamp((order.地方暴力 ?? 10) + 1, 0, 100);
  } else if (route === "heaven") {
    shiftWarShare(war, "天人残余", major, ["SSS", "FOF", "锈蚀部队"]);
  }
}

function shiftWarShare(war, target, amount, donors) {
  war[target] = clamp((war[target] ?? 0) + amount, 0, 100);
  let remaining = amount;
  donors.forEach((donor, index) => {
    if (remaining <= 0) return;
    const loss = index === donors.length - 1 ? remaining : Math.ceil(amount / donors.length);
    const actual = Math.min(war[donor] ?? 0, loss);
    war[donor] = Math.max(0, (war[donor] ?? 0) - actual);
    remaining -= actual;
  });
}

function formatStoryRouteName(route) {
  return { SSS: "SSS", FOF: "FOF", rust: "锈蚀部队", heaven: "天人残余" }[route] ?? "未知路线";
}

function randomMissionSubject(type) {
  const subjects = {
    护送: ["补给车队", "边境医师", "失联证人", "净水芯片"],
    运输: ["封存货箱", "机兵零件", "加密药剂", "旧联邦账册"],
    侦察: ["坠落带", "敌方前哨", "异常信号", "空港残骸"],
    搜索: ["失踪信使", "地下档案", "污染源头", "遗迹入口"],
    回收: ["黑匣子", "样本罐", "无人机残骸", "债务芯片"],
    歼灭: ["异源兽巢", "劫掠队", "叛逃安保组", "失控机兵"],
    突袭: ["走私仓库", "临时据点", "火控节点", "黑市拍卖场"],
    破坏: ["中继塔", "采矿钻机", "追踪网络", "军火流水线"],
    营救: ["被困工程师", "欠债线人", "伤员小队", "劫持目标"],
    防御: ["边境诊所", "补给站", "临时营地", "净水设施"],
    占领: ["转运站", "通讯楼", "矿区闸门", "列车站台"],
    特殊: ["无名委托", "错误回波", "旧神经接口", "异常遗物"],
  };
  return randomItem(subjects[type.name] ?? ["未分类目标"]);
}

function createMissionIntel() {
  return Object.fromEntries(missionIntelFields.map((field) => [field.key, randomItem(missionIntelPool[field.key])]));
}

function createRecommendedTeamSize(difficulty) {
  if (difficulty <= 1) return { min: 1, max: 2 };
  if (difficulty <= 3) return { min: 2, max: 3 };
  return { min: 3, max: 4 };
}

function createMissionRequirements(difficulty = 1) {
  const weaponTypeCount = randomNumber(1, 2);
  const damageTypeCount = randomNumber(1, 2);
  const skillTagCount = randomNumber(1, 100) <= 35 ? 2 : 1;
  const mechaConfig = economyConfig.missions.mechaThreat ?? {};
  const chanceTable = mechaConfig.enemyPresenceChanceByDifficulty ?? [];
  const enemyMechaChance = chanceTable[Math.max(0, Math.min(chanceTable.length - 1, difficulty))] ?? 0;
  return {
    weaponTypes: drawUniqueRequirements(missionRequirementPool.weaponTypes, weaponTypeCount),
    damageTypes: drawUniqueRequirements(missionRequirementPool.damageTypes, damageTypeCount),
    skillTags: drawUniqueRequirements(missionRequirementPool.skillTags, skillTagCount),
    enemyMecha: randomNumber(1, 100) <= enemyMechaChance,
  };
}

function drawUniqueRequirements(pool, count) {
  const result = [];
  while (result.length < count && result.length < pool.length) {
    const item = randomItem(pool);
    if (!result.includes(item)) result.push(item);
  }
  return result;
}

function calculateMissionPowerRequirement(difficulty, reputation) {
  const config = economyConfig.missions.requirement;
  const reputationPressure = Math.floor(reputation / config.reputationStep) * config.reputationPressure;
  return (
    config.basePower +
    difficulty * randomNumber(config.powerPerDifficultyMin, config.powerPerDifficultyMax) +
    reputationPressure +
    randomNumber(config.randomOffsetMin, config.randomOffsetMax)
  );
}

function normalizeMissionPowerFields(mission, reputation = 0) {
  mission.powerRequirement ??= calculateMissionPowerRequirement(mission.difficulty ?? 2, reputation);
  mission.powerIntelLevel ??= Math.min(3, mission.revealedIntel?.length ?? 0);
}

function normalizeMissionPlanningFields(mission) {
  mission.recommendedTeamSize ??= createRecommendedTeamSize(mission.difficulty ?? 2);
  mission.requirements ??= createMissionRequirements();
  mission.requirements.weaponTypes ??= [];
  mission.requirements.damageTypes ??= [];
  mission.requirements.skillTags ??= mission.requirements.careerCategories ?? [];
  mission.requirements.enemyMecha ??= false;
  delete mission.requirements.careerCategories;
  delete mission.requirements.tags;
}

function calculateMissionChanceFromPower(gap) {
  return clamp(Math.round(55 + gap * 3), 5, 96);
}

function calculateWoundRisk(gap, difficulty, success, team = [], context = {}) {
  const base = success ? 18 : 34;
  const skillModifier = averageTeamModifier(team, (character) => getWoundRiskModifier(character, team, { difficulty, success }));
  const mechaPenalty = context.mechaMismatch ? economyConfig.missions.mechaThreat.noFriendlyMechaWoundRiskPenalty : 0;
  return clamp(Math.round(base + difficulty * 4 - gap * 1.4 + skillModifier + mechaPenalty), 4, 95);
}

function calculateMentalConditionRisk(gap, difficulty, success, team = []) {
  const base = success ? 8 : 24;
  const skillModifier = averageTeamModifier(team, (character) => getMentalRiskModifier(character, team, { difficulty, success }));
  const raw = base + difficulty * 3 - gap * 0.9 + skillModifier;
  return clamp(Math.round(raw), 1, 75);
}

function calculateDeathRisk(gap, difficulty, character, team = [], success = true, context = {}) {
  const armorReduction = getArmorDeathRiskReduction(character);
  const conditionRisk = getConditionDeathRiskModifier(character);
  const skillModifier = getDeathRiskModifier(character, team, { difficulty, success });
  const mechaPenalty = context.mechaMismatch ? economyConfig.missions.mechaThreat.noFriendlyMechaDeathRiskPenalty : 0;
  return clamp(Math.round(1 + difficulty * 2 - gap * 0.6 + conditionRisk - armorReduction + skillModifier + mechaPenalty), 1, 85);
}

function getArmorDeathRiskReduction(character) {
  const armor = character.equipment?.armor;
  const mecha = character.equipment?.mecha;
  return (armor?.deathRiskReduction ?? 0) + (mecha?.deathRiskReduction ?? 0);
}

function getConditionDeathRiskModifier(character) {
  return (character.conditions ?? []).reduce((sum, condition) => sum + (condition.deathRiskModifier ?? 0), 0);
}

function averageTeamModifier(team, getModifier) {
  if (team.length === 0) return 0;
  return Math.round(team.reduce((sum, character) => sum + getModifier(character), 0) / team.length);
}

function getRewardGoldMultiplier(team) {
  return getSkillRewardGoldMultiplier(team);
}

function calculateRefreshCost(difficulty = 2) {
  const config = economyConfig.missions.costs;
  return config.refreshBase + difficulty * config.refreshPerDifficulty;
}

function calculateMissionAdvancePayment(mission, team = []) {
  if (mission.advancePaid) return mission.advancePaid;
  const range = economyConfig.missions.advancePaymentRates[mission.typeCode] ?? economyConfig.missions.advancePaymentRates.fallback;
  const [minRate, maxRate] = range;
  const fofBonus = mission.storyRoute === "FOF" ? (getState().storyRoutes?.progress?.FOF ?? 0) * 0.02 : 0;
  const rate = Math.min(0.95, minRate + Math.random() * (maxRate - minRate) + getAdvancePaymentRateBonus(team) + fofBonus);
  return Math.max(0, Math.floor((mission.reward?.gold ?? 0) * rate));
}

function calculateInvestigateCost({ rewardGold = 0, difficulty = 2 } = {}) {
  const config = economyConfig.missions.costs;
  const fallbackReward =
    rewardGold > 0
      ? rewardGold
      : economyConfig.missions.reward.baseGold + difficulty * economyConfig.missions.reward.goldPerDifficultyMin;
  const rate = config.investigationRewardRateMin + Math.random() * (config.investigationRewardRateMax - config.investigationRewardRateMin);
  return Math.max(config.investigationMinCost, Math.round(fallbackReward * rate));
}

function calculateDiscountedInvestigateCost(draft, mission, mode = "targeted") {
  const baseCost = mission.investigateCost ?? calculateInvestigateCost({ rewardGold: mission.reward?.gold, difficulty: mission.difficulty ?? 2 });
  const config = economyConfig.missions.costs;
  const modeMultiplier =
    mode === "random" ? config.randomInvestigationMultiplier : mode === "power" ? config.powerInvestigationMultiplier : 1;
  const facilityDiscount = (draft.facilities?.intel ?? 0) * economyConfig.facilities.intelInvestigationDiscountPerLevel;
  const skillDiscount = getInvestigationSkillDiscount(draft, mode);
  const heavenDiscount = mission.storyRoute === "heaven" ? (draft.storyRoutes?.alienSupport ?? 0) * 0.02 : 0;
  const discount = Math.min(config.maxInvestigationDiscount, facilityDiscount + skillDiscount + heavenDiscount);
  return Math.max(1, Math.round(baseCost * modeMultiplier * (1 - discount)));
}

function chooseInvestigationTarget(mission, intelKey = "random") {
  const revealed = mission.revealedIntel ?? [];
  const lockedFields = missionIntelFields.filter((field) => !revealed.includes(field.key));
  const canRefinePowerIntel = (mission.powerIntelLevel ?? 0) < 3;

  if (intelKey === "power") {
    return canRefinePowerIntel ? { key: "power", label: "战斗力需求区间", mode: "power" } : null;
  }

  if (intelKey && intelKey !== "random") {
    const field = missionIntelFields.find((item) => item.key === intelKey);
    if (!field || revealed.includes(field.key)) return null;
    return { key: field.key, label: field.label, mode: "targeted" };
  }

  const candidates = [...lockedFields];
  if (canRefinePowerIntel) candidates.push({ key: "power", label: "战斗力需求区间" });
  const field = randomItem(candidates);
  if (!field) return null;
  return { key: field.key, label: field.label, mode: field.key === "power" ? "power" : "random" };
}

function resolveGrowthDraft(draft, character, actionType) {
  const currentRank = mercenaryRanks.includes(character.rank) ? character.rank : "无";
  const chance = promotionChances[currentRank] ?? 0;
  if (randomNumber(1, 100) <= chance) resolvePromotionDraft(draft, character, actionType);

  const enhancementChance = hasSkill(character, "common-learn") ? 8 : 5;
  if (randomNumber(1, 100) <= enhancementChance) {
    draft.enhancementPoints = (draft.enhancementPoints ?? 0) + 1;
    draft.log.push(`第 ${draft.day} 天：${character.name} 从契约里为基地攒下 1 点强化点。`);
  }
}

function resolvePromotionDraft(draft, character, actionType) {
  const currentRank = mercenaryRanks.includes(character.rank) ? character.rank : "无";
  const currentIndex = mercenaryRanks.indexOf(currentRank);
  if (currentIndex < 0 || currentIndex >= mercenaryRanks.length - 1) return;

  const nextRank = mercenaryRanks[currentIndex + 1];
  const powerGain = getPromotionCombatPowerGain(nextRank);
  const skill = drawPromotionSkill(character);
  character.rank = nextRank;
  character.combatPower = (character.combatPower ?? 0) + powerGain;
  if (skill) {
    character.skills ??= [];
    character.skills.push({ ...skill, day: draft.day, source: "promotion" });
  }
  const skillText = skill ? `，获得技能「${skill.name}」` : "";
  draft.log.push(`第 ${draft.day} 天：${character.name} 晋升为 ${nextRank} 级佣兵，基础战力 +${powerGain}${skillText}。`);
}

function drawPromotionSkill(character) {
  const ownedIds = new Set((character.skills ?? []).map((skill) => skill.id));
  const available = getAllTrainingSkills().filter((skill) => !ownedIds.has(skill.id));
  return randomItem(available);
}

function applyNegativeConditionDraft(draft, character, options = {}) {
  character.conditions ??= [];
  const condition = { ...drawNegativeCondition(options), id: createId(), day: draft.day };
  character.conditions.push(condition);
  draft.log.push(`第 ${draft.day} 天：${character.name} 获得负面状态「${condition.name}」。`);
}

function drawNegativeCondition(options = {}) {
  const severity = options.severity ?? "light";
  const category = options.category ?? "physical";
  if (category === "mental") {
    const bySeverity = mentalConditions.filter((condition) => condition.severity === severity);
    return randomItem(bySeverity.length > 0 ? bySeverity : mentalConditions);
  }
  const damageType = options.damageType;
  const byDamageType = negativeConditions.filter(
    (condition) =>
      condition.category === "physical" &&
      condition.severity === severity &&
      (!damageType || condition.damageTypes?.includes(damageType))
  );
  const bySeverity = negativeConditions.filter((condition) => condition.category === "physical" && condition.severity === severity);
  return randomItem(byDamageType.length > 0 ? byDamageType : bySeverity);
}

function maybeApplyDamageTypeConditionDraft(draft, character, mission, gap, success) {
  const enemyDamageTypes = mission.requirements?.damageTypes ?? [];
  if (enemyDamageTypes.length === 0) return;
  const matched = hasMatchingArmor(character, enemyDamageTypes);
  const base = success ? 12 : 24;
  const gapPressure = Math.max(0, Math.round((mission.powerRequirement - (mission.powerRequirement + gap)) / 4));
  const chance = clamp(base + gapPressure + (matched ? -10 : 18), 1, 75);
  if (randomNumber(1, 100) > chance) return;
  applyNegativeConditionDraft(draft, character, {
    severity: chooseConditionSeverity(gap, mission.difficulty, success, !matched),
    damageType: randomItem(enemyDamageTypes),
    armorMatched: matched,
  });
}

function chooseConditionSeverity(gap, difficulty, success, armorMismatch = false) {
  const score = difficulty + (success ? 0 : 3) + Math.max(0, Math.ceil(-gap / 8)) + (armorMismatch ? 2 : 0);
  if (score >= 8) return "heavy";
  if (score >= 4) return "medium";
  return "light";
}

function chooseMentalConditionSeverity(gap, difficulty, success) {
  const score = difficulty + (success ? 0 : 3) + Math.max(0, Math.ceil(-gap / 10));
  if (score >= 8) return "heavy";
  if (score >= 4) return "medium";
  return "light";
}

function hasMatchingArmor(character, damageTypes) {
  const armor = character.equipment?.armor;
  const mecha = character.equipment?.mecha;
  return Boolean(
    (armor?.protectionType && damageTypes.includes(armor.protectionType)) ||
      (mecha?.protectionType && damageTypes.includes(mecha.protectionType))
  );
}

function distributeMissionReputationDraft(draft, team, reputation) {
  if (reputation <= 0) return;
  const entities = [{ type: "base" }, ...team.map((character) => ({ type: "mercenary", character }))];
  for (let point = 0; point < reputation; point += 1) {
    const target = randomItem(entities);
    if (target.type === "base") {
      draft.reputation = (draft.reputation ?? 0) + 1;
    } else {
      target.character.personalReputation = (target.character.personalReputation ?? 0) + 1;
    }
  }
}

function calculateMissionReputationLoss(mission, teamSize) {
  const totalEntities = Math.max(1, teamSize + 1);
  const successReputation = Math.max(0, mission.reward?.reputation ?? 0);
  const config = economyConfig.missions.reputationFailure;
  const maxTotalLoss = Math.max(0, Math.floor(successReputation * config.maxRate));
  if (maxTotalLoss <= 0) return 0;
  return Math.max(config.minLoss, Math.floor(maxTotalLoss / totalEntities));
}

function applyMissionReputationLossDraft(draft, team, reputationLoss) {
  if (reputationLoss <= 0) return;
  draft.reputation = Math.max(0, (draft.reputation ?? 0) - reputationLoss);
  team.forEach((character) => {
    character.personalReputation = Math.max(0, (character.personalReputation ?? 0) - reputationLoss);
  });
}

function applyHiddenTwistDraft(draft, mission, team, success) {
  const twist = mission.hidden?.twist ?? "";
  const revealedCount = mission.revealedIntel?.length ?? 0;
  const mitigated = revealedCount >= 3;
  const result = { goldDelta: 0, reputationDelta: 0, text: `隐藏情报：${twist}` };

  if (twist.includes("情报错误")) {
    result.text += mitigated ? " 事前调查降低了混乱。" : " 错误情报让队伍更容易留下战场阴影。";
  } else if (twist.includes("第三方介入")) {
    const loss = mitigated ? 6 : 16;
    result.goldDelta -= loss;
    draft.stealth = clamp(draft.stealth - (mitigated ? 1 : 4), 0, 100);
    result.text += mitigated ? " 第三方被提前识别，只损失少量收益。" : " 第三方截走部分收益并留下追踪痕迹。";
  } else if (twist.includes("伏击")) {
    const target = randomItem(team);
    if (target && !mitigated) {
      applyNegativeConditionDraft(draft, target, { severity: "light" });
      applyNegativeConditionDraft(draft, target, { category: "mental", severity: "light" });
      result.text += ` ${target.name} 在伏击中受伤。`;
    } else {
      result.text += " 伏击被提前规避。";
    }
  } else if (twist.includes("客户欺骗")) {
    result.reputationDelta -= success ? 2 : 0;
    draft.stealth = clamp(draft.stealth - (mitigated ? 2 : 6), 0, 100);
    result.text += mitigated ? " 欺骗被留档，影响有限。" : " 客户留下麻烦尾巴，隐秘值下降。";
  } else if (twist.includes("隐藏奖励")) {
    const bonus = mitigated ? 24 : 14;
    result.goldDelta += bonus;
    result.text += ` 现场额外回收物资，追加 ${bonus} 金。`;
  } else if (twist.includes("目标背叛")) {
    result.reputationDelta += success && mitigated ? 2 : -1;
    result.text += mitigated ? " 背叛被控制，反而提高了业内评价。" : " 目标背叛让委托评价受损。";
  }

  const eventResult = applyMissionRandomEventDraft(draft, mission, team, success, revealedCount);
  result.goldDelta += eventResult.goldDelta;
  result.reputationDelta += eventResult.reputationDelta;
  if (eventResult.text) result.text += ` ${eventResult.text}`;

  return result;
}

function normalizeLegacyMission(mission) {
  const alreadyCoreComplete = mission.issuer && mission.type && mission.intel && mission.hidden;

  const fallbackTemplate = alreadyCoreComplete ? null : missionTemplates.find((template) => template.name === mission.name) ?? randomItem(missionTemplates);
  const fallbackType =
    missionTypes.find((type) => type.name === mission.type || type.code === mission.typeCode) ??
    randomItem(missionTypes);
  if (!alreadyCoreComplete) {
    mission.issuer ??= randomIssuer();
    mission.type ??= fallbackType.name;
    mission.typeCode ??= fallbackType.code;
    mission.actionType ??= fallbackType.actionType ?? "logistics";
    mission.acquisition ??= "旧合同转录";
    mission.description ??= `${randomItem(fallbackType.verbs)}目标。${randomItem(missionBriefFragments)}`;
    mission.intel ??= createMissionIntel();
    mission.revealedIntel ??= [];
    mission.hidden ??= { twist: randomMissionHiddenTwist() };
  }
  normalizeMissionPlanningFields(mission);
  mission.refreshCost ??= calculateRefreshCost(mission.difficulty ?? fallbackTemplate?.difficulty ?? 2);
  mission.investigateCost ??= calculateInvestigateCost({ rewardGold: mission.reward?.gold, difficulty: mission.difficulty ?? fallbackTemplate?.difficulty ?? 2 });
  mission.issueDay ??= 1;
  mission.expiresDay ??= mission.issueDay + 4;
  normalizeStoryMissionFields(mission);
  return mission;
}

function applyMissionRandomEventDraft(draft, mission, team, success, revealedCount = 0) {
  let goldDelta = 0;
  let reputationDelta = 0;
  const texts = [];
  const used = new Set();
  const rolls = getMissionRandomEventRolls(mission);
  const chance = getMissionRandomEventChance(mission);

  for (let index = 0; index < rolls; index += 1) {
    if (chance <= 0 || Math.random() * 100 > chance) continue;
    const event = pickMissionRandomEvent(draft, mission, revealedCount, used, team);
    if (!event) continue;
    used.add(event.id);

    const severity = event.tone === "negative" ? getNegativeEventSeverityMultiplier(draft, mission) : 1;
    const effect = event.effect ?? {};

    if (effect.gold) goldDelta += Math.round(effect.gold * severity);
    if (effect.reputation) reputationDelta += Math.round(effect.reputation * severity);
    if (effect.stealth) {
      const stealthMultiplier = effect.stealth < 0 ? getStealthEventImpactMultiplier(team) : 1;
      draft.stealth = clamp(draft.stealth + Math.round(effect.stealth * severity * stealthMultiplier), 0, 100);
    }
    if (effect.mentalInjury) {
      team.forEach((character) => {
        if (effect.mentalInjury > 0 && Math.random() <= Math.min(0.75, Math.abs(effect.mentalInjury) * 0.18 * severity)) {
          applyNegativeConditionDraft(draft, character, {
            category: "mental",
            severity: effect.mentalInjury >= 3 ? "medium" : "light",
          });
        }
      });
    }
    if (effect.physicalInjury) {
      team.forEach((character) => {
        if (effect.physicalInjury > 0 && Math.random() <= 0.5) {
          applyNegativeConditionDraft(draft, character, { severity: effect.physicalInjury >= 2 ? "medium" : "light" });
        }
      });
    }
    if (effect.successBonus && success) {
      goldDelta += effect.successBonus.gold ?? 0;
      reputationDelta += effect.successBonus.reputation ?? 0;
    }

    let text = `随机事件：${event.title}。${event.description}`;
    if (event.tone === "negative" && effect.stealth) {
      text += " 隐秘值受到牵连。";
    }
    texts.push(text);
  }

  return { goldDelta, reputationDelta, text: texts.join(" ") };
}

function pickMissionRandomEvent(draft, mission, revealedCount = 0, used = new Set(), team = []) {
  const missionCode = mission.typeCode ?? mission.issuer?.typeCode ?? mission.actionType ?? "";
  const actionType = mission.actionType ?? "";
  const difficulty = mission.difficulty ?? 1;
  const intelLevel = Math.min(3, revealedCount);
  const intelRoomReduction = clamp(
    (draft.facilities?.intel ?? 0) * economyConfig.missions.hiddenTwists.negativeEventWeightReductionPerIntelLevel,
    0,
    1 - economyConfig.missions.hiddenTwists.negativeEventMinWeightMultiplier
  );
  const candidates = missionRandomEvents
    .filter((event) => !used.has(event.id))
    .filter((event) => difficulty >= (event.minDifficulty ?? 1) && difficulty <= (event.maxDifficulty ?? 8))
    .filter((event) => event.appliesTo.includes(missionCode) || event.appliesTo.includes(actionType) || event.appliesTo.includes("all"))
    .map((event) => {
      const baseWeight = event.weight ?? 1;
      let weight = baseWeight;
      if (event.tone === "negative") {
        const reduction = Math.max(0, intelLevel) * 0.08 + intelRoomReduction;
        const multiplier = Math.max(
          economyConfig.missions.hiddenTwists.negativeEventMinWeightMultiplier,
          1 - reduction
        ) * getNegativeEventWeightMultiplier(team);
        weight *= multiplier;
      }
      return { event, weight: Math.max(0, weight) };
    })
    .filter((entry) => entry.weight > 0);

  const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const entry of candidates) {
    roll -= entry.weight;
    if (roll <= 0) return entry.event;
  }
  return candidates[candidates.length - 1]?.event ?? null;
}

function getMissionRandomEventRolls(mission) {
  const difficulty = mission.difficulty ?? 1;
  const tiers = economyConfig.missions.hiddenTwists.randomEventRollsByDifficulty ?? [];
  const tier = tiers.find((entry) => difficulty <= entry.maxDifficulty);
  return Math.max(0, tier?.rolls ?? 1);
}

function getMissionRandomEventChance(mission) {
  const config = economyConfig.missions.hiddenTwists;
  return clamp(
    (config.randomEventChance ?? 0) + Math.max(0, (mission.difficulty ?? 1) - 1) * (config.randomEventChancePerDifficulty ?? 0),
    0,
    95
  );
}

function getNegativeEventSeverityMultiplier(draft, mission) {
  const intelLevel = Math.max(0, mission.powerIntelLevel ?? 0, mission.revealedIntel?.length ?? 0);
  const facilityBonus = (draft.facilities?.intel ?? 0) * economyConfig.missions.hiddenTwists.negativeEventWeightReductionPerIntelLevel;
  return clamp(1 - intelLevel * 0.1 - facilityBonus * 0.5, 0.35, 1);
}

function randomMissionHiddenTwist() {
  const weights = economyConfig.missions.hiddenTwists.weights ?? {};
  const weighted = missionHiddenTwists.map((twist) => ({
    twist,
    weight: Math.max(0, weights[twist] ?? 1),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return randomItem(missionHiddenTwists);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.twist;
  }
  return weighted[weighted.length - 1]?.twist ?? randomItem(missionHiddenTwists);
}
