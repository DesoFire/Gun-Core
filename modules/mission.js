import { missionTemplates } from "../data/sampleData.js";
import { getState, updateState } from "../js/state.js";
import { calculateRank, payDailyUpkeep, resolveRestAttack } from "./faction.js";
import { getWeaponTagNames } from "./weaponGenerator.js";
import { clamp, createId, randomItem, randomNumber } from "../js/utils.js";

export function getMissions() {
  return getState().missions;
}

export function createMission() {
  const template = randomItem(missionTemplates);
  return {
    id: createId(),
    ...template,
    tags: [...template.tags],
    remaining: template.duration,
    assigned: [],
    status: "available",
  };
}

export function normalizeMission(mission) {
  mission.remaining ??= mission.duration;
  mission.assigned ??= [];
  mission.status ??= "available";
  mission.tags ??= [];
  return mission;
}

export function startMission(id, memberIds) {
  updateState((draft) => {
    const mission = draft.missions.find((item) => item.id === id);
    if (!mission || memberIds.length === 0) return;

    mission.status = "active";
    mission.assigned = [...memberIds];
    mission.remaining = mission.duration;
    draft.roster.forEach((character) => {
      if (memberIds.includes(character.id)) character.status = `执行「${mission.name}」`;
    });
    draft.log.push(`第 ${draft.day} 天：小队已出发执行「${mission.name}」。`);
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
    draft.log.push(`第 ${draft.day} 天：任务「${mission.name}」成功。获得 ${mission.reward.gold} 金与 ${mission.reward.reputation} 声望。`);
  } else {
    draft.reputation = Math.max(0, draft.reputation - 3);
    draft.log.push(`第 ${draft.day} 天：任务「${mission.name}」失败。队伍带着伤势和坏消息回来了。`);
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
