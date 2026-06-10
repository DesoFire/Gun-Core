import {
  contractBriefFragments,
  contractHiddenTwists,
  contractIntelFields,
  contractIntelPool,
  contractIssuers,
  contractTypes,
  mercenaryRanks,
  missionTemplates,
  otherContractIssuers,
  positiveTraits,
  promotionChances,
} from "../data/sampleData.js";
import { getState, updateState } from "../js/state.js";
import { payDailyUpkeep, resolveRestAttack } from "./faction.js";
import { evaluateGameOverDraft } from "./game.js";
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
  const issueDay = options.issueDay ?? getState().day ?? 1;
  const expiresDay = options.expiresDay ?? issueDay + randomNumber(2, 4) + Math.floor(difficulty / 2);
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
    actionType: type.actionType,
    acquisition: options.acquisition ?? "广撒网",
    difficulty,
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
    if (draft.gameStatus !== "active") return;
    const mission = draft.missions.find((item) => item.id === id);
    if (!mission || memberIds.length === 0) return;

    mission.status = "active";
    mission.assigned = [...memberIds];
    mission.remaining = mission.duration;
    mission.startDay = draft.day;
    mission.endDay = draft.day + mission.duration;
    draft.roster.forEach((character) => {
      if (memberIds.includes(character.id)) character.status = `履行「${mission.name}」`;
    });
    draft.timeline.push({
      id: createId(),
      day: draft.day,
      endDay: mission.endDay,
      type: "contract",
      title: mission.name,
      status: "active",
      detail: `执行 ${mission.duration} 天。队伍：${memberIds.length} 人。`,
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
      draft.roster.forEach((character) => {
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

function resolveMissionDraft(draft, mission) {
  const chance = calculateMissionChanceFromRoster(draft.roster, draft.buildings, mission.assigned, mission);
  const success = randomNumber(1, 100) <= chance;
  const team = draft.roster.filter((character) => mission.assigned.includes(character.id));
  const outcome = applyHiddenTwistDraft(draft, mission, team, success);

  team.forEach((character) => {
    character.status = "待命";
    character.notoriety += success ? 1 : 0;
    character.contractRecord.survived += 1;
    if (success) character.contractRecord.completed += 1;
    if (!success) character.contractRecord.failed += 1;
    character.stress += success ? randomNumber(1, 4) : randomNumber(5, 12);
    if (!success || randomNumber(1, 100) < 18 + mission.difficulty * 4) {
      character.wound += 1;
      character.hp = Math.max(1, character.hp - randomNumber(3, 8));
    }
    resolvePromotionDraft(draft, character, mission.actionType ?? "logistics", success);
  });

  if (success) {
    const gold = Math.max(0, mission.reward.gold + outcome.goldDelta);
    const reputation = Math.max(0, mission.reward.reputation + outcome.reputationDelta);
    draft.gold += gold;
    draft.reputation += reputation;
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」成功。获得 ${gold} 金与 ${reputation} 声望。${outcome.text}`);
  } else {
    draft.reputation = Math.max(0, draft.reputation - 3 + outcome.reputationDelta);
    draft.gold = Math.max(0, draft.gold + outcome.goldDelta);
    draft.log.push(`第 ${draft.day} 天：契约「${mission.name}」失败。队伍带着伤势和坏消息回来了。${outcome.text}`);
  }

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

function resolvePromotionDraft(draft, character, actionType, success) {
  const currentRank = mercenaryRanks.includes(character.rank) ? character.rank : "无";
  const currentIndex = mercenaryRanks.indexOf(currentRank);
  if (currentIndex < 0 || currentIndex >= mercenaryRanks.length - 1) return;

  const chance = success ? promotionChances[currentRank] ?? 0 : 1;
  if (randomNumber(1, 100) > chance) return;

  const nextRank = mercenaryRanks[currentIndex + 1];
  const trait = drawPositiveTrait(character, actionType);
  character.rank = nextRank;
  character.level = currentIndex + 1;
  character.traits ??= [];
  if (trait) character.traits.push(trait);

  const traitText = trait ? `，获得特性「${trait.name}」` : "";
  draft.log.push(`第 ${draft.day} 天：${character.name} 晋升为 ${nextRank} 级佣兵${traitText}。`);
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
  mission.refreshCost ??= calculateRefreshCost(mission.difficulty ?? fallbackTemplate.difficulty ?? 2);
  mission.investigateCost ??= calculateInvestigateCost(mission.difficulty ?? fallbackTemplate.difficulty ?? 2, mission.revealedIntel.length);
  mission.issueDay ??= 1;
  mission.expiresDay ??= mission.issueDay + 4;
  return mission;
}
