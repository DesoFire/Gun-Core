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
import { economyConfig } from "../data/economyConfig.js";
import { getState, updateState } from "../js/state.js";
import { calculateDailySupplyConsumption, calculateUnpaidSecrecyReputation, identityFee, payDailyUpkeep } from "./faction.js";
import { evaluateGameOverDraft } from "./game.js";
import { calculateTeamCombatPower, getPromotionCombatPowerGain } from "./combatPower.js";
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
  const state = getState();
  const type = options.type ?? randomItem(missionTypes);
  const issuer = options.issuer ?? randomIssuer();
  const difficultyConfig = economyConfig.missions.difficulty;
  const reputationTier = Math.floor((state.reputation ?? 0) / difficultyConfig.reputationTierStep);
  const difficulty = options.difficulty ?? clamp(randomNumber(difficultyConfig.baseMin, difficultyConfig.baseMax) + reputationTier, difficultyConfig.min, difficultyConfig.max);
  const duration = options.duration ?? randomNumber(1, 3 + Math.floor(difficulty / 2));
  const issueDay = options.issueDay ?? state.day ?? 1;
  const expiresDay = options.expiresDay ?? issueDay + randomNumber(2, 4) + Math.floor(difficulty / 2);
  const rewardConfig = economyConfig.missions.reward;
  const rewardGold = Math.round(
    (rewardConfig.baseGold + difficulty * randomNumber(rewardConfig.goldPerDifficultyMin, rewardConfig.goldPerDifficultyMax)) *
      (options.rewardMultiplier ?? 1)
  );
  const rewardReputation = Math.max(
    rewardConfig.minReputation,
    Math.round(
      difficulty * rewardConfig.reputationPerDifficulty +
        randomNumber(rewardConfig.reputationRandomMin, rewardConfig.reputationRandomMax)
    )
  );
  const name = `${type.name}契约：${randomMissionSubject(type)}`;
  const powerRequirement = options.powerRequirement ?? calculateMissionPowerRequirement(difficulty, state.reputation ?? 0);
  const recommendedTeamSize = options.recommendedTeamSize ?? createRecommendedTeamSize(difficulty);
  const requirements = options.requirements ?? createMissionRequirements();

  return {
    id: createId(),
    name,
    issuer,
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
    description: `${randomItem(type.verbs)}目标。${randomItem(missionBriefFragments)}`,
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
    const validMemberIds = [...new Set(memberIds)].filter((memberId) =>
      draft.roster.some((character) => character.id === memberId && character.status === "待命")
    );
    if (validMemberIds.length === 0) return;
    if (validMemberIds.length > 4) {
      draft.log.push(`第 ${draft.day} 天：一支派遣小队最多 4 人。`);
      return;
    }

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
    draft.supplies = Math.max(0, draft.supplies - calculateDailySupplyConsumption(draft));
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

    if (draft.supplies === 0) {
      draft.log.push(`第 ${draft.day} 天：补给耗尽，基地运作进入危险状态。`);
    }

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
  const outcome = applyHiddenTwistDraft(draft, mission, team, success);
  const enemyDamageTypes = mission.requirements?.damageTypes ?? [];

  team.forEach((character) => {
    character.missionRecord.survived += 1;
    if (success) character.missionRecord.completed += 1;
    if (!success) character.missionRecord.failed += 1;
    const deathRisk = calculateDeathRisk(gap, mission.difficulty, character, team, success);
    const woundRisk = calculateWoundRisk(gap, mission.difficulty, success, team);
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

  if (success) {
    const grossGold = Math.max(0, Math.round((mission.reward.gold + outcome.goldDelta) * getRewardGoldMultiplier(team)));
    const gold = Math.max(0, grossGold - (mission.advancePaid ?? 0));
    const reputation = Math.max(0, mission.reward.reputation + outcome.reputationDelta);
    distributeMissionReputationDraft(draft, team.filter((character) => character.status !== "阵亡"), reputation);
    draft.gold += gold;
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」成功。队伍战斗力 ${teamPower} / 需求 ${mission.powerRequirement}，获得 ${gold} 金，队员瓜分 ${reputation} 声望。${outcome.text}`);
    rollCombatLootDraft(draft, mission, `契约「${mission.name}」`, team);
  } else {
    const reputationLoss = calculateMissionReputationLoss(mission, team.length);
    applyMissionReputationLossDraft(draft, team.filter((character) => character.status !== "阵亡"), reputationLoss);
    if (outcome.reputationDelta > 0) distributeMissionReputationDraft(draft, team.filter((character) => character.status !== "阵亡"), outcome.reputationDelta);
    draft.gold = Math.max(0, draft.gold + outcome.goldDelta);
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」失败。队伍战斗力 ${teamPower} / 需求 ${mission.powerRequirement}，伤亡风险上升。${outcome.text}`);
  }

  settleReturningWagesDraft(draft, mission, team.filter((character) => character.status !== "阵亡"));

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
  const config = economyConfig.baseRaid;
  if (unpaidReputation < config.minUnpaidReputationForRaid) return;
  const raidChance = clamp(100 - (draft.stealth ?? 0), 0, 100);
  if (raidChance <= 0 || randomNumber(1, 100) > raidChance) return;

  const defenders = draft.roster.filter((character) => character.status === "待命");
  const difficulty = calculateRaidDifficulty(unpaidReputation);
  if (defenders.length === 0) {
    applyBaseRaidFailureDraft(draft, difficulty, "无人留守");
    return;
  }

  randomlyEquipDefendersDraft(draft, defenders);
  const powerRequirement = calculateMissionPowerRequirement(difficulty, unpaidReputation);
  const mission = createMission({
    difficulty,
    powerRequirement,
    duration: 1,
    rewardMultiplier: 1,
    recommendedTeamSize: { min: 1, max: 4 },
    requirements: createMissionRequirements(),
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
    const deathRisk = calculateDeathRisk(gap, difficulty, character, defenders, success);
    const woundRisk = calculateWoundRisk(gap, difficulty, success, defenders);
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

function calculateRaidDifficulty(unpaidReputation) {
  const config = economyConfig.baseRaid;
  return clamp(Math.ceil(unpaidReputation / config.unpaidReputationPerDifficulty), config.minDifficulty, config.maxDifficulty);
}

function calculateBaseDefensePower(draft) {
  return (draft.facilities?.defenses ?? 0) * economyConfig.facilities.defensePowerPerLevel;
}

function getMissionRank(difficulty = 1) {
  const ranks = ["F", "F", "E", "D", "C", "B", "A", "S"];
  return ranks[Math.max(0, Math.min(ranks.length - 1, difficulty))] ?? "F";
}

function rollCombatLootDraft(draft, mission, sourceLabel = "契约", team = []) {
  const config = economyConfig.missions.loot ?? {};
  const baseChance = config.baseChance ?? 25;
  const perDifficulty = config.perDifficulty ?? 3;
  const chance = clamp(baseChance + Math.max(0, (mission.difficulty ?? 1) - 1) * perDifficulty + getLootChanceBonus(team), 0, 100);
  if (randomNumber(1, 100) > chance) return null;

  const rarity = getMissionRank(mission.difficulty ?? 1);
  const isWeapon = randomNumber(1, 100) <= (config.weaponChance ?? 50);
  const item = isWeapon ? generateWeaponItem({ rarity }) : generateArmorItem({ rarity });
  item.source = sourceLabel;
  item.originalPrice = estimateCombatLootOriginalPrice(item);
  draft.inventory.unshift(item);
  draft.log.push(`第 ${draft.day} 天：${sourceLabel}结束后回收战利品「${item.name}」（${rarity}级）。`);
  return item;
}

function estimateCombatLootOriginalPrice(item) {
  const rankIndex = Math.max(0, ["F", "E", "D", "C", "B", "A", "S"].indexOf(item.rarity ?? "F"));
  const config = economyConfig.blackMarket;
  if (item.itemCategory === "weapon" || item.slot === "weapon") return (config.baseCost.weapon ?? 58) + rankIndex * (config.perRank.weapon ?? 14);
  if (item.itemCategory === "armor" || item.slot === "armor") return (config.baseCost.armor ?? 46) + rankIndex * (config.perRank.armor ?? 14);
  return config.baseCost.fallback ?? 40;
}

function randomlyEquipDefendersDraft(draft, defenders) {
  const pool = [...(draft.inventory ?? [])].sort(() => Math.random() - 0.5);
  defenders.forEach((character) => {
    ["weapon", "armor"].forEach((slot) => {
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
    draft.gold,
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
  const unlockedIntelBonus = (mission.revealedIntel?.length ?? 0) * 2 + (mission.powerIntelLevel ?? 0);
  const intelBonus = 0;
  const skillEffectBonus = getTeamMissionChanceBonus(team, mission, {
    fullSkillMatch: skillFit.missing === 0 && (mission.requirements?.skillTags ?? []).length > 0,
  });
  const chance = clamp(
    powerChance + equipmentBonus + skillFit.bonus + unlockedIntelBonus + intelBonus + skillEffectBonus - sizePenalty - skillFit.penalty,
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
  if (randomNumber(1, 100) <= 35) return randomItem(missionIssuers);
  return randomItem(otherMissionIssuers);
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
    特殊: ["无名委托", "未知信号", "旧神经接口", "异常遗物"],
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

function createMissionRequirements() {
  const weaponTypeCount = randomNumber(1, 2);
  const damageTypeCount = randomNumber(1, 2);
  const skillTagCount = randomNumber(1, 100) <= 35 ? 2 : 1;
  return {
    weaponTypes: drawUniqueRequirements(missionRequirementPool.weaponTypes, weaponTypeCount),
    damageTypes: drawUniqueRequirements(missionRequirementPool.damageTypes, damageTypeCount),
    skillTags: drawUniqueRequirements(missionRequirementPool.skillTags, skillTagCount),
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
  delete mission.requirements.careerCategories;
  delete mission.requirements.tags;
}

function calculateMissionChanceFromPower(gap) {
  return clamp(Math.round(55 + gap * 3), 5, 96);
}

function calculateWoundRisk(gap, difficulty, success, team = []) {
  const base = success ? 18 : 34;
  const skillModifier = averageTeamModifier(team, (character) => getWoundRiskModifier(character, team, { difficulty, success }));
  return clamp(Math.round(base + difficulty * 4 - gap * 1.4 + skillModifier), 4, 88);
}

function calculateMentalConditionRisk(gap, difficulty, success, team = []) {
  const base = success ? 8 : 24;
  const skillModifier = averageTeamModifier(team, (character) => getMentalRiskModifier(character, team, { difficulty, success }));
  const raw = base + difficulty * 3 - gap * 0.9 + skillModifier;
  return clamp(Math.round(raw), 1, 75);
}

function calculateDeathRisk(gap, difficulty, character, team = [], success = true) {
  const armorReduction = getArmorDeathRiskReduction(character);
  const conditionRisk = getConditionDeathRiskModifier(character);
  const skillModifier = getDeathRiskModifier(character, team, { difficulty, success });
  return clamp(Math.round(1 + difficulty * 2 - gap * 0.6 + conditionRisk - armorReduction + skillModifier), 1, 65);
}

function getArmorDeathRiskReduction(character) {
  const armor = character.equipment?.armor;
  if (!armor) return 0;
  return armor.deathRiskReduction ?? 0;
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
  const rate = Math.min(0.95, minRate + Math.random() * (maxRate - minRate) + getAdvancePaymentRateBonus(team));
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
  const discount = Math.min(config.maxInvestigationDiscount, facilityDiscount + skillDiscount);
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
  return Boolean(armor?.protectionType && damageTypes.includes(armor.protectionType));
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
  if (mission.issuer && mission.type && mission.intel && mission.hidden) return mission;

  const fallbackTemplate = missionTemplates.find((template) => template.name === mission.name) ?? randomItem(missionTemplates);
  const fallbackType =
    missionTypes.find((type) => type.name === mission.type || type.code === mission.typeCode) ??
    randomItem(missionTypes);
  mission.issuer ??= randomIssuer();
  mission.type ??= fallbackType.name;
  mission.typeCode ??= fallbackType.code;
  mission.actionType ??= fallbackType.actionType ?? "logistics";
  mission.acquisition ??= "旧合同转录";
  mission.description ??= `${randomItem(fallbackType.verbs)}目标。${randomItem(missionBriefFragments)}`;
  mission.intel ??= createMissionIntel();
  mission.revealedIntel ??= [];
  mission.hidden ??= { twist: randomMissionHiddenTwist() };
  normalizeMissionPlanningFields(mission);
  mission.refreshCost ??= calculateRefreshCost(mission.difficulty ?? fallbackTemplate.difficulty ?? 2);
  mission.investigateCost ??= calculateInvestigateCost({ rewardGold: mission.reward?.gold, difficulty: mission.difficulty ?? fallbackTemplate.difficulty ?? 2 });
  mission.issueDay ??= 1;
  mission.expiresDay ??= mission.issueDay + 4;
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
