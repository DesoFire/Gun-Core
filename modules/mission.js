import {
  contractBriefFragments,
  contractHiddenTwists,
  contractIntelFields,
  contractIntelPool,
  contractIssuers,
  contractRequirementPool,
  contractTypes,
  mercenaryRanks,
  missionTemplates,
  negativeConditions,
  otherContractIssuers,
  positiveTraits,
  promotionChances,
} from "../data/sampleData.js";
import { getState, updateState } from "../js/state.js";
import { identityFee, payDailyUpkeep, resolveRestAttack } from "./faction.js";
import { evaluateGameOverDraft } from "./game.js";
import { calculateTeamCombatPower, getPromotionCombatPowerGain } from "./combatPower.js";
import { clamp, createId, randomItem, randomNumber } from "../js/utils.js";

export function getMissions() {
  return getState().missions;
}

export function createMission() {
  return createContract();
}

export function createContract(options = {}) {
  const state = getState();
  const type = options.type ?? randomItem(contractTypes);
  const issuer = options.issuer ?? randomIssuer();
  const reputationTier = Math.floor((state.reputation ?? 0) / 15);
  const difficulty = options.difficulty ?? clamp(randomNumber(1, 3) + reputationTier, 1, 8);
  const duration = options.duration ?? randomNumber(1, 3 + Math.floor(difficulty / 2));
  const issueDay = options.issueDay ?? state.day ?? 1;
  const expiresDay = options.expiresDay ?? issueDay + randomNumber(2, 4) + Math.floor(difficulty / 2);
  const rewardGold = Math.round((35 + difficulty * randomNumber(16, 24)) * (options.rewardMultiplier ?? 1));
  const rewardReputation = Math.max(5, Math.round(difficulty * 3 + randomNumber(0, 5)));
  const tags = [...new Set(type.tags)];
  const name = `${type.name}契约：${randomContractSubject(type)}`;
  const powerRequirement = options.powerRequirement ?? calculateContractPowerRequirement(difficulty, state.reputation ?? 0);
  const recommendedTeamSize = options.recommendedTeamSize ?? createRecommendedTeamSize(difficulty);
  const requirements = options.requirements ?? createContractRequirements(tags);

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
    description: `${randomItem(type.verbs)}目标。${randomItem(contractBriefFragments)}`,
    intel: createContractIntel(),
    revealedIntel: options.freeIntel ? [randomItem(contractIntelFields).key] : [],
    hidden: { twist: randomItem(contractHiddenTwists) },
    tags,
    refreshCost: calculateRefreshCost(difficulty),
    investigateCost: calculateInvestigateCost(difficulty),
    assigned: [],
    remaining: duration,
    status: "available",
  };
}

export function normalizeMission(mission) {
  upgradeMissionToContract(mission);
  mission.remaining ??= mission.duration;
  mission.assigned ??= [];
  mission.status ??= "available";
  mission.tags ??= [];
  normalizeContractPlanningFields(mission);
  return mission;
}

export function refreshMission(id) {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const index = draft.missions.findIndex((item) => item.id === id);
    const mission = draft.missions[index];
    if (!mission || mission.status !== "available") return;

    const cost = mission.refreshCost ?? calculateRefreshCost(mission.difficulty ?? 2);
    if (draft.gold < cost) {
      draft.log.push(`第 ${draft.day} 天：资金不足，无法刷新契约。`);
      return;
    }

    draft.gold -= cost;
    draft.missions[index] = createContract();
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金刷新了一份契约。`);
  });
}

export function investigateMission(id) {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const mission = draft.missions.find((item) => item.id === id);
    if (!mission || mission.status !== "available") return;

    normalizeContractPowerFields(mission, draft.reputation ?? 0);
    upgradeMissionToContract(mission);
    const lockedFields = contractIntelFields.filter((field) => !mission.revealedIntel.includes(field.key));
    const canRefinePowerIntel = (mission.powerIntelLevel ?? 0) < 3;
    if (lockedFields.length === 0 && !canRefinePowerIntel) return;

    const cost = mission.investigateCost ?? calculateInvestigateCost(mission.difficulty ?? 2);
    if (draft.gold < cost) {
      draft.log.push(`第 ${draft.day} 天：资金不足，无法调查「${mission.name}」。`);
      return;
    }

    draft.gold -= cost;
    let detail = "战斗力需求区间";
    if (canRefinePowerIntel) {
      mission.powerIntelLevel += 1;
    } else if (lockedFields.length > 0) {
      const field = randomItem(lockedFields);
      mission.revealedIntel.push(field.key);
      detail = field.label;
    }
    mission.investigateCost = calculateInvestigateCost(mission.difficulty ?? 2, mission.revealedIntel.length + (mission.powerIntelLevel ?? 0));
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
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      endDay: mission.endDay,
      type: "contract",
      title: mission.name,
      status: "active",
      detail: `执行 ${mission.duration} 天。队伍：${validMemberIds.length} 人。`,
      missionId: mission.id,
    });
    draft.log.push(`第 ${draft.day} 天：小队已出发履行契约「${mission.name}」。`);
  });
}

export function advanceDay() {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    draft.day += 1;
    payDailyUpkeep(draft);
    draft.supplies = Math.max(0, draft.supplies - Math.ceil(draft.roster.length / 3));

    if (draft.buildings.infirmary > 0) {
      draft.roster.filter((character) => character.status !== "阵亡").forEach((character) => {
        if (character.wound > 0 || character.stress > 0) {
          character.stress = Math.max(0, character.stress - draft.buildings.infirmary);
        }
      });
    }

    draft.missions
      .filter((mission) => mission.status === "active")
      .forEach((mission) => {
        mission.remaining -= 1;
        if (mission.remaining <= 0) resolveMissionDraft(draft, mission);
      });

    const expiredMissions = draft.missions.filter((mission) => mission.status === "available" && mission.expiresDay < draft.day);
    expiredMissions.forEach((mission) => {
      draft.timeline.push({
        id: createId(),
        day: draft.day,
        type: "contract",
        title: mission.name,
        status: "missed",
        detail: "契约截止，发布方撤回委托。",
        missionId: mission.id,
      });
      draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」超过截止日，已从列表撤下。`);
    });
    draft.missions = draft.missions.filter((mission) => mission.status !== "available" || mission.expiresDay >= draft.day);

    while (draft.missions.filter((mission) => mission.status === "available").length < 4) {
      draft.missions.push(createContract({ issueDay: draft.day }));
    }

    if (draft.supplies === 0) {
      draft.roster.filter((character) => character.status !== "阵亡").forEach((character) => {
        character.stress += 2;
      });
      draft.log.push(`第 ${draft.day} 天：补给耗尽，所有佣兵压力上升。`);
    }

    resolveRestAttack(draft);

    evaluateGameOverDraft(draft);
  });
}

export function calculateMissionChance(memberIds, mission) {
  const state = getState();
  return calculateMissionChanceFromRoster(state.roster, state.buildings, memberIds, mission);
}

export function getMissionRisk(memberIds, mission) {
  return getRiskLabel(calculateMissionChance(memberIds, mission));
}

export function getContractRiskTag(mission) {
  const roughChance = clamp(104 - (mission.difficulty ?? 2) * 11 - (mission.duration ?? 1) * 3, 18, 92);
  return getRiskLabel(roughChance);
}

export function evaluateMissionFit(memberIds, mission) {
  const state = getState();
  return evaluateMissionFitFromRoster(state.roster, state.buildings, memberIds, mission);
}

export function getMissionPowerRange(mission) {
  normalizeContractPowerFields(mission, getState().reputation ?? 0);
  const level = mission.powerIntelLevel ?? 0;
  const spread = [28, 18, 10, 4][Math.min(level, 3)];
  const low = Math.max(1, mission.powerRequirement - spread);
  const high = mission.powerRequirement + spread;
  return { low, high, level };
}

export function getTeamCombatPower(memberIds) {
  const state = getState();
  return calculateTeamCombatPower(state.roster, memberIds);
}

function resolveMissionDraft(draft, mission) {
  normalizeContractPowerFields(mission, draft.reputation ?? 0);
  normalizeContractPlanningFields(mission);
  const fit = evaluateMissionFitFromRoster(draft.roster, draft.buildings, mission.assigned, mission);
  const teamPower = fit.teamPower;
  const gap = teamPower - mission.powerRequirement;
  const chance = fit.chance;
  const success = randomNumber(1, 100) <= chance;
  const team = draft.roster.filter((character) => mission.assigned.includes(character.id));
  const outcome = applyHiddenTwistDraft(draft, mission, team, success);

  team.forEach((character) => {
    character.contractRecord.survived += 1;
    if (success) character.contractRecord.completed += 1;
    if (!success) character.contractRecord.failed += 1;
    character.stress += success ? randomNumber(1, 4) : randomNumber(5, 12);
    const deathRisk = calculateDeathRisk(gap, mission.difficulty, character);
    const woundRisk = calculateWoundRisk(gap, mission.difficulty, success);
    if (randomNumber(1, 100) <= deathRisk) {
      character.status = "阵亡";
      character.hp = 0;
      character.wound += 3;
      draft.log.push(`第 ${draft.day} 天：${character.name} 在「${mission.name}」中阵亡。`);
      return;
    }
    character.status = "待命";
    if (randomNumber(1, 100) <= woundRisk) {
      character.wound += 1;
      character.hp = Math.max(1, character.hp - randomNumber(4, 10));
    }
    if (success) {
      resolveGrowthDraft(draft, character, mission.actionType ?? "logistics");
    } else {
      applyNegativeConditionDraft(draft, character);
    }
  });

  if (success) {
    const gold = Math.max(0, mission.reward.gold + outcome.goldDelta);
    const reputation = Math.max(0, mission.reward.reputation + outcome.reputationDelta);
    distributeMercenaryReputationDraft(team.filter((character) => character.status !== "阵亡"), reputation);
    draft.gold += gold;
    syncBaseReputationDraft(draft);
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」成功。队伍战斗力 ${teamPower} / 需求 ${mission.powerRequirement}，获得 ${gold} 金，队员瓜分 ${reputation} 声望。${outcome.text}`);
  } else {
    team.filter((character) => character.status !== "阵亡").forEach((character) => {
      character.notoriety = Math.max(0, (character.notoriety ?? 0) - 1);
    });
    if (outcome.reputationDelta > 0) distributeMercenaryReputationDraft(team.filter((character) => character.status !== "阵亡"), outcome.reputationDelta);
    syncBaseReputationDraft(draft);
    draft.gold = Math.max(0, draft.gold + outcome.goldDelta);
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」失败。队伍战斗力 ${teamPower} / 需求 ${mission.powerRequirement}，伤亡风险上升。${outcome.text}`);
  }

  settleReturningWagesDraft(draft, mission, team.filter((character) => character.status !== "阵亡"));

  const timelineEntry = draft.timeline.find((entry) => entry.missionId === mission.id && entry.status === "active");
  if (timelineEntry) {
    timelineEntry.status = success ? "done" : "failed";
    timelineEntry.day = mission.startDay ?? timelineEntry.day;
    timelineEntry.endDay = draft.day;
    timelineEntry.detail = success ? "契约完成并结算。" : "契约失败，队伍返回。";
  }
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
  const stealthLoss = clamp(Math.ceil(shortage / 5) + 3, 3, 18);
  draft.stealth = clamp(draft.stealth - stealthLoss, 0, 100);
  returningTeam.forEach((character) => {
    character.stress += 2;
  });
  draft.log.push(`第 ${draft.day} 天：外勤薪资需要 ${totalWages} 金，但资金缺口 ${shortage} 金。返队佣兵压力上升，隐秘值下降 ${stealthLoss}。`);
}

function calculateMissionChanceFromRoster(roster, buildings, memberIds, mission) {
  return evaluateMissionFitFromRoster(roster, buildings, memberIds, mission).chance;
}

function evaluateMissionFitFromRoster(roster, buildings, memberIds, mission) {
  if (memberIds.length === 0) {
    return {
      chance: 0,
      teamPower: 0,
      powerGap: -(mission.powerRequirement ?? 0),
      risk: getRiskLabel(0),
      teamSizePenalty: 0,
      matchingTags: 0,
      matchingWeapons: 0,
      matchingDamageTypes: 0,
      unlockedIntelBonus: 0,
      intelBonus: 0,
    };
  }

  normalizeContractPowerFields(mission, getState().reputation ?? 0);
  normalizeContractPlanningFields(mission);
  const team = roster.filter((character) => memberIds.includes(character.id));
  const teamPower = calculateTeamCombatPower(roster, memberIds);
  const powerChance = calculateMissionChanceFromPower(teamPower - mission.powerRequirement);
  const sizePenalty = calculateTeamSizePenalty(memberIds.length, mission.recommendedTeamSize);
  const tagBonus = calculateTagFitBonus(team, mission);
  const equipmentBonus = calculateEquipmentFitBonus(team, mission);
  const unlockedIntelBonus = (mission.revealedIntel?.length ?? 0) * 2 + (mission.powerIntelLevel ?? 0);
  const intelBonus = (buildings.intel ?? 0) * 4;
  const chance = clamp(powerChance + tagBonus + equipmentBonus + unlockedIntelBonus + intelBonus - sizePenalty, 2, 98);

  return {
    chance,
    teamPower,
    powerGap: teamPower - mission.powerRequirement,
    risk: getRiskLabel(chance),
    teamSizePenalty: sizePenalty,
    matchingTags: countMatchingTags(team, mission.tags ?? []),
    matchingWeapons: countMatchingEquipmentTags(team, mission.requirements?.weaponTypes ?? []),
    matchingDamageTypes: countMatchingEquipmentTags(team, mission.requirements?.damageTypes ?? []),
    unlockedIntelBonus,
    intelBonus,
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

function calculateTagFitBonus(team, mission) {
  return Math.min(18, countMatchingTags(team, mission.tags ?? []) * 4);
}

function calculateEquipmentFitBonus(team, mission) {
  const weaponMatches = countMatchingEquipmentTags(team, mission.requirements?.weaponTypes ?? []);
  const damageMatches = countMatchingEquipmentTags(team, mission.requirements?.damageTypes ?? []);
  return Math.min(20, weaponMatches * 5 + damageMatches * 4);
}

function countMatchingTags(team, tags) {
  return team.reduce((sum, character) => sum + (character.tags ?? []).filter((tag) => tags.includes(tag)).length, 0);
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
  if (randomNumber(1, 100) <= 35) return randomItem(contractIssuers);
  return randomItem(otherContractIssuers);
}

function randomContractSubject(type) {
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

function createContractIntel() {
  return Object.fromEntries(contractIntelFields.map((field) => [field.key, randomItem(contractIntelPool[field.key])]));
}

function createRecommendedTeamSize(difficulty) {
  if (difficulty <= 1) return { min: 1, max: 2 };
  if (difficulty <= 3) return { min: 2, max: 3 };
  return { min: 3, max: 4 };
}

function createContractRequirements(tags = []) {
  const weaponTypeCount = randomNumber(1, 2);
  const damageTypeCount = randomNumber(1, 2);
  return {
    weaponTypes: drawUniqueRequirements(contractRequirementPool.weaponTypes, weaponTypeCount),
    damageTypes: drawUniqueRequirements(contractRequirementPool.damageTypes, damageTypeCount),
    tags: tags.slice(0, 2),
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

function calculateContractPowerRequirement(difficulty, reputation) {
  const reputationPressure = Math.floor(reputation / 10) * 3;
  return 18 + difficulty * randomNumber(8, 12) + reputationPressure + randomNumber(-5, 8);
}

function normalizeContractPowerFields(mission, reputation = 0) {
  mission.powerRequirement ??= calculateContractPowerRequirement(mission.difficulty ?? 2, reputation);
  mission.powerIntelLevel ??= Math.min(3, mission.revealedIntel?.length ?? 0);
}

function normalizeContractPlanningFields(mission) {
  mission.recommendedTeamSize ??= createRecommendedTeamSize(mission.difficulty ?? 2);
  mission.requirements ??= createContractRequirements(mission.tags ?? []);
  mission.requirements.weaponTypes ??= [];
  mission.requirements.damageTypes ??= [];
  mission.requirements.tags ??= mission.tags?.slice(0, 2) ?? [];
}

function calculateMissionChanceFromPower(gap) {
  return clamp(Math.round(55 + gap * 3), 5, 96);
}

function calculateWoundRisk(gap, difficulty, success) {
  const base = success ? 18 : 34;
  return clamp(Math.round(base + difficulty * 4 - gap * 1.4), 4, 88);
}

function calculateDeathRisk(gap, difficulty, character) {
  const armorReduction = getArmorDeathRiskReduction(character);
  return clamp(Math.round(1 + difficulty * 2 - gap * 0.6 - armorReduction), 1, 55);
}

function getArmorDeathRiskReduction(character) {
  const armor = character.equipment?.armor;
  if (!armor) return 0;
  return armor.deathRiskReduction ?? 0;
}

function calculateRefreshCost(difficulty = 2) {
  return 12 + difficulty * 4;
}

function calculateInvestigateCost(difficulty = 2, revealedCount = 0) {
  return 14 + difficulty * 5 + revealedCount * 6;
}

function resolveGrowthDraft(draft, character, actionType) {
  const currentRank = mercenaryRanks.includes(character.rank) ? character.rank : "无";
  const chance = promotionChances[currentRank] ?? 0;
  if (randomNumber(1, 100) > chance) return;

  if (randomNumber(1, 100) <= 50) {
    resolvePromotionDraft(draft, character, actionType);
    return;
  }

  const points = 1 + (randomNumber(1, 100) <= 15 ? 1 : 0);
  character.enhancementPoints = (character.enhancementPoints ?? 0) + points;
  draft.log.push(`第 ${draft.day} 天：${character.name} 从契约里攒下 ${points} 点强化点。`);
}

function resolvePromotionDraft(draft, character, actionType) {
  const currentRank = mercenaryRanks.includes(character.rank) ? character.rank : "无";
  const currentIndex = mercenaryRanks.indexOf(currentRank);
  if (currentIndex < 0 || currentIndex >= mercenaryRanks.length - 1) return;

  const nextRank = mercenaryRanks[currentIndex + 1];
  const trait = drawPositiveTrait(character, actionType);
  const powerGain = getPromotionCombatPowerGain(nextRank);
  character.rank = nextRank;
  character.level = currentIndex + 1;
  character.combatPower = (character.combatPower ?? 0) + powerGain;
  character.traits ??= [];
  if (trait) character.traits.push(trait);

  const traitText = trait ? `，获得特性「${trait.name}」` : "";
  draft.log.push(`第 ${draft.day} 天：${character.name} 晋升为 ${nextRank} 级佣兵，战斗力 +${powerGain}${traitText}。`);
}

function applyNegativeConditionDraft(draft, character) {
  character.conditions ??= [];
  const condition = { ...randomItem(negativeConditions), id: createId(), day: draft.day };
  character.conditions.push(condition);
  character.wound += condition.wound ?? 0;
  character.stress += condition.stress ?? 0;
  character.hp = Math.max(1, character.hp - Math.max(3, (condition.wound ?? 0) * 5));
  draft.log.push(`第 ${draft.day} 天：${character.name} 获得负面状态「${condition.name}」。`);
}

function distributeMercenaryReputationDraft(team, reputation) {
  if (team.length === 0 || reputation <= 0) return;
  for (let point = 0; point < reputation; point += 1) {
    const target = randomItem(team);
    target.notoriety = (target.notoriety ?? 0) + 1;
  }
}

function syncBaseReputationDraft(draft) {
  draft.reputation = draft.roster
    .filter((character) => character.status !== "阵亡")
    .reduce((sum, character) => sum + Math.max(0, character.notoriety ?? 0), 0);
}

function drawPositiveTrait(character, actionType) {
  const pool = positiveTraits[actionType] ?? positiveTraits.logistics;
  const owned = new Set((character.traits ?? []).map((trait) => trait.name));
  const candidates = pool.filter((trait) => !owned.has(trait.name));
  const trait = randomItem(candidates.length > 0 ? candidates : pool);
  return { ...trait, source: actionType };
}

function applyHiddenTwistDraft(draft, mission, team, success) {
  const twist = mission.hidden?.twist ?? "";
  const revealedCount = mission.revealedIntel?.length ?? 0;
  const mitigated = revealedCount >= 3;
  const result = { goldDelta: 0, reputationDelta: 0, text: `隐藏情报：${twist}` };

  if (twist.includes("情报错误")) {
    const stress = mitigated ? 1 : 3;
    team.forEach((character) => {
      character.stress += stress;
    });
    result.text += mitigated ? " 事前调查降低了混乱。" : " 错误情报让队伍压力上升。";
  } else if (twist.includes("第三方介入")) {
    const loss = mitigated ? 6 : 16;
    result.goldDelta -= loss;
    draft.stealth = clamp(draft.stealth - (mitigated ? 1 : 4), 0, 100);
    result.text += mitigated ? " 第三方被提前识别，只损失少量收益。" : " 第三方截走部分收益并留下追踪痕迹。";
  } else if (twist.includes("伏击")) {
    const target = randomItem(team);
    if (target && !mitigated) {
      target.wound += 1;
      target.hp = Math.max(1, target.hp - randomNumber(4, 9));
      target.stress += 4;
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
    team.forEach((character) => {
      character.stress += mitigated ? 1 : 2;
    });
    result.text += mitigated ? " 背叛被控制，反而提高了业内评价。" : " 目标背叛让委托评价受损。";
  }

  return result;
}

function upgradeMissionToContract(mission) {
  if (mission.issuer && mission.type && mission.intel && mission.hidden) return mission;

  const fallbackTemplate = missionTemplates.find((template) => template.name === mission.name) ?? randomItem(missionTemplates);
  const fallbackType = contractTypes.find((type) => type.tags.some((tag) => (mission.tags ?? fallbackTemplate.tags).includes(tag))) ?? randomItem(contractTypes);
  mission.issuer ??= randomIssuer();
  mission.type ??= fallbackType.name;
  mission.typeCode ??= fallbackType.code;
  mission.actionType ??= fallbackType.actionType ?? "logistics";
  mission.acquisition ??= "旧合同转录";
  mission.description ??= `${randomItem(fallbackType.verbs)}目标。${randomItem(contractBriefFragments)}`;
  mission.intel ??= createContractIntel();
  mission.revealedIntel ??= [];
  mission.hidden ??= { twist: randomItem(contractHiddenTwists) };
  normalizeContractPlanningFields(mission);
  mission.refreshCost ??= calculateRefreshCost(mission.difficulty ?? fallbackTemplate.difficulty ?? 2);
  mission.investigateCost ??= calculateInvestigateCost(mission.difficulty ?? fallbackTemplate.difficulty ?? 2, mission.revealedIntel.length);
  mission.issueDay ??= 1;
  mission.expiresDay ??= mission.issueDay + 4;
  return mission;
}
