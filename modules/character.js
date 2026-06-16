import {
  careerCategories,
  characterClasses,
  creeds,
  equipmentSlots,
  fears,
  genders,
  lastWords,
  mercenaryRanks,
  names,
  nameProfiles,
  origins,
  personalities,
  shortEpithetAdjectives,
  shortEpithetNouns,
  positiveConditions,
} from "../data/sampleData.js";
import { economyConfig } from "../data/economyConfig.js";
import { getPromotionCombatPowerGain } from "./combatPower.js";
import { getState, normalizeCharacterAvatars, updateState } from "../js/state.js";
import { calculateRank, identityFee } from "./faction.js";
import { createId, randomItem, randomNumber } from "../js/utils.js";

export function getCharacters() {
  return getState().roster;
}

export function getRecruitPool() {
  return getState().recruitPool;
}

export function getCharacter(id) {
  return getState().roster.find((character) => character.id === id);
}

export function getCharacterClasses() {
  return characterClasses;
}

export function createMercenary(classId = randomItem(Object.keys(characterClasses)), customName = "") {
  const resolvedClassId = characterClasses[classId] ? classId : randomItem(Object.keys(characterClasses));
  const baseClass = characterClasses[resolvedClassId];
  const category = careerCategories[baseClass.category];
  return {
    id: createId(),
    name: customName || createRandomName(),
    callsign: createCallsign(),
    classId: resolvedClassId,
    className: baseClass.name,
    careerCategory: baseClass.category,
    careerCategoryName: category?.name ?? "未分类",
    personalReputation: randomNumber(0, 2),
    rank: "无",
    dossier: createDossier(),
    contractRecord: { completed: 0, failed: 0, survived: 0 },
    bounty: randomNumber(0, 24) * 10,
    debt: randomNumber(0, 18) * 5,
    signingMultiplier: randomNumber(economyConfig.recruitment.signingMultiplierMin, economyConfig.recruitment.signingMultiplierMax),
    equipment: createEmptyEquipment(),
    combatPower: baseClass.baseCombatPower + (category?.effects?.combatPowerBonus ?? 0) + randomNumber(-3, 4),
    status: "待命",
  };
}

export function updateCharacter(id, data) {
  updateState((draft) => {
    const character = draft.roster.find((item) => item.id === id);
    if (character) {
      if (typeof data.name === "string") data.name = data.name.trim().slice(0, 32);
      if (typeof data.callsign === "string") data.callsign = data.callsign.trim().slice(0, 24);
      Object.assign(character, data);
    }
  });
}

export function hireRecruit(id) {
  let hired = null;
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const recruit = draft.recruitPool.find((character) => character.id === id);
    if (!recruit) return;
    if (getLivingMercenaryCount(draft) >= getMercenaryLimit(draft)) return;
    const cost = recruitCost(recruit);
    if (draft.gold < cost) return;

    draft.gold -= cost;
    draft.roster.push(recruit);
    draft.recruitPool = draft.recruitPool.filter((character) => character.id !== id);
    normalizeCharacterAvatars(draft);
    draft.log.push(`第 ${draft.day} 天：${recruit.name} 加入了事务所。`);
    hired = recruit;
  });
  return hired;
}

export function refreshRecruits() {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const cost = economyConfig.recruitment.refreshCost;
    if (draft.gold < cost) return;
    const poolSize = 2 + (draft.buildings.tavern ?? 0);
    draft.gold -= cost;
    draft.recruitPool = Array.from({ length: poolSize }, () => createMercenary());
    normalizeCharacterAvatars(draft);
    draft.log.push(`第 ${draft.day} 天：酒馆送来了一批新的候选人。`);
  });
}

export function equipItem(characterId, slot, itemId) {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const character = draft.roster.find((item) => item.id === characterId);
    const item = draft.inventory.find((entry) => entry.id === itemId);
    if (!character || !item || !canEquipItemToSlot(item, slot) || !canCharacterUseSlot(character, slot)) return;

    const previousItem = character.equipment[slot];
    if (previousItem) draft.inventory.push(previousItem);
    character.equipment[slot] = item;
    draft.inventory = draft.inventory.filter((entry) => entry.id !== itemId);
    draft.log.push(`第 ${draft.day} 天：${character.name} 装备了 ${item.name}。`);
  });
}

export function unequipItem(characterId, slot) {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const character = draft.roster.find((item) => item.id === characterId);
    if (!character || !character.equipment[slot]) return;
    const item = character.equipment[slot];
    character.equipment[slot] = null;
    draft.inventory.push(item);
    draft.log.push(`第 ${draft.day} 天：${character.name} 卸下了 ${item.name}。`);
  });
}

export function canEquipItemToSlot(item, slot) {
  if (slot === "weapon") return item.itemCategory === "weapon" || item.slot === "weapon";
  if (slot === "armor") return item.itemCategory === "armor" || item.slot === "armor";
  return false;
}

export function spendEnhancementPoint(characterId) {
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const character = draft.roster.find((item) => item.id === characterId);
    if (!character || isDeadStatus(character.status) || (draft.enhancementPoints ?? 0) <= 0) return;

    draft.enhancementPoints -= 1;
    const gain = getPromotionCombatPowerGain(character.rank);
    character.combatPower = (character.combatPower ?? 0) + gain;
    const condition = drawPositiveCondition(character, "enhancement");
    if (condition) {
      character.positiveConditions ??= [];
      character.positiveConditions.push(condition);
    }
    const conditionText = condition ? `，获得正面状态「${condition.name}」` : "";
    draft.log.push(`第 ${draft.day} 天：${character.name} 消耗 1 点强化点，战斗力 +${gain}${conditionText}。`);
  });
}

export function eraseMercenaryReputation(characterId) {
  let result = { ok: false, cost: 0 };
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const character = draft.roster.find((item) => item.id === characterId);
    if (!character || isDeadStatus(character.status)) return;
    const reputation = Math.max(0, character.personalReputation ?? 0);
    const cost = reputation * economyConfig.secrecy.eraseMercenaryReputationCostPerPoint;
    result = { ok: false, cost };
    if (reputation <= 0 || draft.gold < cost) return;
    draft.gold -= cost;
    character.personalReputation = 0;
    if (draft.unpaidSecrecy?.mercenaries) delete draft.unpaidSecrecy.mercenaries[character.id];
    draft.log.push(`第 ${draft.day} 天：支付 ${cost} 金抹去了 ${character.name} 的黑历史。`);
    result = { ok: true, cost };
  });
  return result;
}


export function dismissMercenary(characterId) {
  let dismissed = null;
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const character = draft.roster.find((item) => item.id === characterId);
    if (!character) return;
    if (character.status !== "待命" && !isDeadStatus(character.status)) return;

    const wasDead = isDeadStatus(character.status);
    Object.values(character.equipment ?? {})
      .filter(Boolean)
      .forEach((item) => draft.inventory.push(item));
    if (draft.unpaidSecrecy?.mercenaries) delete draft.unpaidSecrecy.mercenaries[character.id];
    draft.roster = draft.roster.filter((item) => item.id !== characterId);
    draft.log.push(wasDead
      ? `第 ${draft.day} 天：${character.name} 的尸体已被妥善处理，装备已收回仓库。`
      : `第 ${draft.day} 天：${character.name} 被解雇，装备已收回仓库。`);
    dismissed = character;
  });
  return dismissed;
}

function canCharacterUseSlot(character, slot) {
  if (slot !== "weapon") return true;
  const limbs = new Set((character.conditions ?? []).map((condition) => condition.limb).filter(Boolean));
  return !(limbs.has("leftArm") && limbs.has("rightArm"));
}

function isDeadStatus(status) {
  return status === "阵亡" || status === "闃典骸";
}

export function recruitCost(character) {
  const config = economyConfig.recruitment;
  const multiplier = character.signingMultiplier ?? config.signingMultiplierMin;
  return Math.max(1, identityFee(character) * multiplier);
}

export function getMercenaryLimit(state = getState()) {
  const barracksLevel = state.buildings?.barracks ?? 0;
  return (
    economyConfig.facilities.baseMercenaryLimit +
    barracksLevel * economyConfig.facilities.barracksMercenaryLimitPerLevel
  );
}

export function getLivingMercenaryCount(state = getState()) {
  return (state.roster ?? []).filter((character) => !isDeadStatus(character.status)).length;
}

export function getEquipmentSlots() {
  return equipmentSlots;
}

export function normalizeCharacter(character) {
  if (character.personalReputation == null && character.notoriety != null) character.personalReputation = character.notoriety;
  delete character.notoriety;
  character.personalReputation ??= 1;
  delete character.isPlayer;
  character.rank = normalizeRank(character);
  delete character.level;
  delete character.xp;
  delete character.traits;
  character.positiveConditions ??= [];
  character.dossier ??= createDossier();
  character.dossier.personality ??= randomItem(personalities);
  character.contractRecord ??= { completed: 0, failed: 0, survived: 0 };
  character.bounty ??= randomNumber(0, 24) * 10;
  character.debt ??= randomNumber(0, 18) * 5;
  character.signingMultiplier ??= randomNumber(economyConfig.recruitment.signingMultiplierMin, economyConfig.recruitment.signingMultiplierMax);
  character.status ??= "待命";
  const baseClass = characterClasses[character.classId] ?? characterClasses.assault;
  const category = careerCategories[baseClass.category];
  character.classId = characterClasses[character.classId] ? character.classId : "assault";
  character.className = baseClass.name;
  character.careerCategory = baseClass.category;
  character.careerCategoryName = category?.name ?? "未分类";
  character.combatPower ??= baseClass.baseCombatPower + (category?.effects?.combatPowerBonus ?? 0);
  delete character.maxHp;
  delete character.hp;
  character.equipment = { ...createEmptyEquipment(), ...(character.equipment ?? {}) };
  character.equipment = normalizeEquipmentSlots(character.equipment);
  return character;
}

function drawPositiveCondition(character, source = "growth") {
  const owned = new Set((character.positiveConditions ?? []).map((condition) => condition.name));
  const pool = positiveConditions.filter((condition) => !owned.has(condition.name));
  const condition = randomItem(pool.length > 0 ? pool : positiveConditions);
  return condition ? { ...condition, id: createId(), source } : null;
}

export function renderCharacterDossier(character) {
  const maintenanceRisk = identityFee(character) + character.debt + Math.floor(character.bounty / 20);
  return `
    <section class="dossier-section">
      <h3>附属身份档案</h3>
      <div class="field-list">
        <div class="field"><span>性别字段</span><strong>${character.dossier.gender}</strong></div>
        <div class="field"><span>年龄</span><strong>${character.dossier.age}</strong></div>
        <div class="field"><span>性格</span><strong>${character.dossier.personality}</strong></div>
        <div class="field"><span>出身</span><strong>${character.dossier.origin}</strong></div>
        <div class="field"><span>法理状态</span><strong>临时有效</strong></div>
      </div>
    </section>
    <section class="dossier-section">
      <h3>风险与资源状态</h3>
      <div class="field-list">
        <div class="field"><span>个人声望</span><strong>${character.personalReputation ?? 0}</strong></div>
        <div class="field"><span>身份费</span><strong>${identityFee(character)} 金/天</strong></div>
        <div class="field"><span>悬赏金额</span><strong>${character.bounty} 金</strong></div>
        <div class="field"><span>欠债</span><strong>${character.debt} 金</strong></div>
        <div class="field"><span>报废距离</span><strong>${maintenanceRisk}</strong></div>
      </div>
    </section>
    <section class="dossier-section wide">
      <h3>非必要心理噪声数据</h3>
      <p class="muted">官方定义：不影响结算。实际用途：让错误的任务看起来像命运。</p>
      <div class="field-list">
        <div class="field"><span>恐惧</span><strong>${character.dossier.fear}</strong></div>
        <div class="field"><span>信条</span><strong>${character.dossier.creed}</strong></div>
        <div class="field"><span>遗言草稿</span><strong>${character.dossier.lastWords}</strong></div>
      </div>
    </section>
  `;
}


function createDossier() {
  return {
    gender: randomItem(genders),
    age: randomNumber(19, 48),
    origin: randomItem(origins),
    personality: randomItem(personalities),
    fear: randomItem(fears),
    creed: randomItem(creeds),
    lastWords: randomItem(lastWords),
  };
}

function createEmptyEquipment() {
  return Object.fromEntries(Object.keys(equipmentSlots).map((slot) => [slot, null]));
}

function createCallsign() {
  return `${randomItem(shortEpithetAdjectives)}${randomItem(shortEpithetNouns)}`;
}

function createRandomName() {
  const profile = drawWeightedNameProfile();
  const given = randomItem(profile.given);
  if (profile.order === "single") return given;
  const surname = randomItem(profile.surnames);
  if (profile.order === "surname-first") return `${surname}${profile.joiner ?? ""}${given}`;
  return `${given}${profile.joiner ?? " "}${surname}`;
}

function drawWeightedNameProfile() {
  const total = nameProfiles.reduce((sum, profile) => sum + (profile.weight ?? 1), 0);
  let roll = randomNumber(1, total);
  for (const profile of nameProfiles) {
    roll -= profile.weight ?? 1;
    if (roll <= 0) return profile;
  }
  return nameProfiles[0];
}

function normalizeEquipmentSlots(equipment) {
  return {
    weapon: equipment.weapon ?? null,
    armor: equipment.armor ?? null,
  };
}

function normalizeRank(character) {
  if (mercenaryRanks.includes(character.rank)) return character.rank;
  return calculateRank(character);
}
