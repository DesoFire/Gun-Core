import {
  contractBriefFragments,
  contractHiddenTwists,
  contractIntelFields,
  contractIntelPool,
  contractIssuers,
  contractTypes,
  missionTemplates,
  otherContractIssuers,
} from "../data/sampleData.js";
import { getState, updateState } from "../js/state.js";
import { calculateRank, payDailyUpkeep, resolveRestAttack } from "./faction.js";
import { getWeaponTagNames } from "./weaponGenerator.js";
import { clamp, createId, randomItem, randomNumber } from "../js/utils.js";

export function getMissions() {
  return getState().missions;
}

export function createMission() {
  return createContract();
}

export function createContract(options = {}) {
  const type = options.type ?? randomItem(contractTypes);
  const issuer = options.issuer ?? randomIssuer();
  const difficulty = options.difficulty ?? randomNumber(2, 5);
  const duration = options.duration ?? randomNumber(1, 3 + Math.floor(difficulty / 2));
  const rewardGold = Math.round((35 + difficulty * randomNumber(16, 24)) * (options.rewardMultiplier ?? 1));
  const rewardReputation = Math.max(5, Math.round(difficulty * 3 + randomNumber(0, 5)));
  const tags = [...new Set(type.tags)];
  const name = `${type.name}契约：${randomContractSubject(type)}`;

  return {
    id: createId(),
    name,
    issuer,
    type: type.name,
    typeCode: type.code,
    acquisition: options.acquisition ?? "广撒网",
    difficulty,
    duration,
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
  return mission;
}

export function refreshMission(id) {
  updateState((draft) => {
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
    const mission = draft.missions.find((item) => item.id === id);
    if (!mission || mission.status !== "available") return;

    upgradeMissionToContract(mission);
    const lockedFields = contractIntelFields.filter((field) => !mission.revealedIntel.includes(field.key));
    if (lockedFields.length === 0) return;

    const cost = mission.investigateCost ?? calculateInvestigateCost(mission.difficulty ?? 2);
    if (draft.gold < cost) {
      draft.log.push(`第 ${draft.day} 天：资金不足，无法调查「${mission.name}」。`);
      return;
    }

    const field = randomItem(lockedFields);
    draft.gold -= cost;
    mission.revealedIntel.push(field.key);
    mission.investigateCost = calculateInvestigateCost(mission.difficulty ?? 2, mission.revealedIntel.length);
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金调查「${mission.name}」，解锁：${field.label}。`);
  });
}

export function startMission(id, memberIds) {
  updateState((draft) => {
    const mission = draft.missions.find((item) => item.id === id);
    if (!mission || memberIds.length === 0) return;

    mission.status = "active";
    mission.assigned = [...memberIds];
    mission.remaining = mission.duration;
    draft.roster.forEach((character) => {
      if (memberIds.includes(character.id)) character.status = `履行「${mission.name}」`;
    });
    draft.log.push(`第 ${draft.day} 天：小队已出发履行契约「${mission.name}」。`);
  });
}

export function advanceDay() {
  updateState((draft) => {
    draft.day += 1;
    payDailyUpkeep(draft);
    draft.supplies = Math.max(0, draft.supplies - Math.ceil(draft.roster.length / 3));

    if (draft.buildings.infirmary > 0) {
      draft.roster.forEach((character) => {
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

    while (draft.missions.filter((mission) => mission.status === "available").length < 4) {
      draft.missions.push(createMission());
    }

    if (draft.supplies === 0) {
      draft.roster.forEach((character) => {
        character.stress += 2;
      });
      draft.log.push(`第 ${draft.day} 天：补给耗尽，所有佣兵压力上升。`);
    }

    resolveRestAttack(draft);

    if (draft.reputation >= 100) {
      draft.log.push(`第 ${draft.day} 天：声望达到 100。这个原型的胜利目标已经完成。`);
    }
  });
}

export function calculateMissionChance(memberIds, mission) {
  const state = getState();
  return calculateMissionChanceFromRoster(state.roster, state.buildings, memberIds, mission);
}

function resolveMissionDraft(draft, mission) {
  const chance = calculateMissionChanceFromRoster(draft.roster, draft.buildings, mission.assigned, mission);
  const success = randomNumber(1, 100) <= chance;
  const team = draft.roster.filter((character) => mission.assigned.includes(character.id));

  team.forEach((character) => {
    character.status = "待命";
    character.xp += success ? 35 : 18;
    character.notoriety += success ? 1 : 0;
    character.contractRecord.survived += 1;
    if (success) character.contractRecord.completed += 1;
    if (!success) character.contractRecord.failed += 1;
    character.stress += success ? randomNumber(1, 4) : randomNumber(5, 12);
    if (!success || randomNumber(1, 100) < 18 + mission.difficulty * 4) {
      character.wound += 1;
      character.hp = Math.max(1, character.hp - randomNumber(3, 8));
    }
    if (character.xp >= 100) {
      character.level += 1;
      character.xp -= 100;
      character.stats.resolve += 1;
      character.stats.wits += 1;
      character.maxHp += 2;
      character.hp = Math.min(character.maxHp, character.hp + 2);
      character.rank = calculateRank(character);
    }
  });

  if (success) {
    draft.gold += mission.reward.gold;
    draft.reputation += mission.reward.reputation;
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」成功。获得 ${mission.reward.gold} 金与 ${mission.reward.reputation} 声望。`);
  } else {
    draft.reputation = Math.max(0, draft.reputation - 3);
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」失败。队伍带着伤势和坏消息回来了。`);
  }

  draft.missions = draft.missions.filter((item) => item.id !== mission.id);
}

function calculateMissionChanceFromRoster(roster, buildings, memberIds, mission) {
  const team = roster.filter((character) => memberIds.includes(character.id));
  if (team.length === 0) return 0;

  const totalStats = team.reduce(
    (sum, character) => sum + character.stats.might + character.stats.agility + character.stats.wits + character.stats.resolve,
    0
  );
  const equipmentTags = team.flatMap((character) =>
    Object.values(character.equipment ?? {})
      .filter(Boolean)
      .flatMap((item) => getWeaponTagNames(item))
  );
  const matchingTags = team.reduce(
    (sum, character) => sum + character.tags.filter((tag) => mission.tags.includes(tag)).length,
    0
  );
  const matchingEquipmentTags = equipmentTags.filter((tag) => mission.tags.includes(tag)).length;
  const stressPenalty = Math.floor(team.reduce((sum, character) => sum + character.stress + character.wound * 8, 0) / 8);
  const intelBonus = (buildings.intel ?? 0) * 5;
  const chance =
    34 + totalStats * 1.2 + matchingTags * 11 + matchingEquipmentTags * 5 + intelBonus - mission.difficulty * 14 - stressPenalty;
  return clamp(Math.round(chance), 12, 92);
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

function calculateRefreshCost(difficulty = 2) {
  return 12 + difficulty * 4;
}

function calculateInvestigateCost(difficulty = 2, revealedCount = 0) {
  return 14 + difficulty * 5 + revealedCount * 6;
}

function upgradeMissionToContract(mission) {
  if (mission.issuer && mission.type && mission.intel && mission.hidden) return mission;

  const fallbackTemplate = missionTemplates.find((template) => template.name === mission.name) ?? randomItem(missionTemplates);
  const fallbackType = contractTypes.find((type) => type.tags.some((tag) => (mission.tags ?? fallbackTemplate.tags).includes(tag))) ?? randomItem(contractTypes);
  mission.issuer ??= randomIssuer();
  mission.type ??= fallbackType.name;
  mission.typeCode ??= fallbackType.code;
  mission.acquisition ??= "旧合同转录";
  mission.description ??= `${randomItem(fallbackType.verbs)}目标。${randomItem(contractBriefFragments)}`;
  mission.intel ??= createContractIntel();
  mission.revealedIntel ??= [];
  mission.hidden ??= { twist: randomItem(contractHiddenTwists) };
  mission.refreshCost ??= calculateRefreshCost(mission.difficulty ?? fallbackTemplate.difficulty ?? 2);
  mission.investigateCost ??= calculateInvestigateCost(mission.difficulty ?? fallbackTemplate.difficulty ?? 2, mission.revealedIntel.length);
  return mission;
}
