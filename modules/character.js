import {
  callsigns,
  characterClasses,
  creeds,
  equipmentSlots,
  fears,
  genders,
  lastWords,
  mercenaryRanks,
  names,
  origins,
  personalities,
} from "../data/sampleData.js";
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

export function hasPlayerCharacter() {
  return getState().roster.some((character) => character.isPlayer);
}

export function createMercenary(classId = randomItem(Object.keys(characterClasses)), isPlayer = false, customName = "") {
  const baseClass = characterClasses[classId];
  const maxHp = baseClass.maxHp + randomNumber(-2, 3);
  return {
    id: createId(),
    name: customName || `${randomItem(names)} · ${randomItem(callsigns)}`,
    classId,
    className: baseClass.name,
    level: 0,
    xp: 0,
    hp: maxHp,
    maxHp,
    notoriety: isPlayer ? 3 : randomNumber(0, 2),
    rank: "无",
    traits: [],
    dossier: createDossier(),
    contractRecord: { completed: 0, failed: 0, survived: 0 },
    bounty: randomNumber(0, 24) * 10,
    debt: randomNumber(0, 18) * 5,
    stress: randomNumber(0, 8),
    wound: 0,
    isPlayer,
    tags: [...baseClass.tags],
    equipment: createEmptyEquipment(),
    combatPower: baseClass.baseCombatPower + randomNumber(-3, 4),
    status: "待命",
  };
}

export function createCharacter(data) {
  const character = createMercenary(data.classId, Boolean(data.isPlayer), data.name);
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    draft.roster.unshift(character);
    normalizeCharacterAvatars(draft);
    draft.log.push(`第 ${draft.day} 天：${character.name} 成为了你的代表角色。`);
  });
  return character;
}

export function updateCharacter(id, data) {
  updateState((draft) => {
    const character = draft.roster.find((item) => item.id === id);
    if (character) Object.assign(character, data);
  });
}

export function hireRecruit(id) {
  let hired = null;
  updateState((draft) => {
    if (draft.gameStatus !== "active") return;
    const recruit = draft.recruitPool.find((character) => character.id === id);
    if (!recruit) return;
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
    const cost = 15;
    if (draft.gold < cost) {
      draft.log.push(`第 ${draft.day} 天：资金不足，无法刷新招募名单。`);
      return;
    }
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
    if (!character || !item || !canEquipItemToSlot(item, slot)) return;

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

export function recruitCost(character) {
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(character.rank));
  return 42 + rankIndex * 10 + character.tags.length * 4;
}

export function getEquipmentSlots() {
  return equipmentSlots;
}

export function normalizeCharacter(character) {
  character.notoriety ??= character.isPlayer ? 3 : 1;
  character.rank = normalizeRank(character);
  character.level = Math.max(0, mercenaryRanks.indexOf(character.rank));
  character.xp ??= 0;
  character.traits ??= [];
  character.dossier ??= createDossier();
  character.dossier.personality ??= randomItem(personalities);
  character.contractRecord ??= { completed: 0, failed: 0, survived: 0 };
  character.bounty ??= randomNumber(0, 24) * 10;
  character.debt ??= randomNumber(0, 18) * 5;
  character.wound ??= 0;
  character.stress ??= 0;
  character.status ??= "待命";
  character.tags ??= [];
  character.combatPower ??= character.classId && characterClasses[character.classId] ? characterClasses[character.classId].baseCombatPower : 20;
  character.maxHp ??= character.classId && characterClasses[character.classId] ? characterClasses[character.classId].maxHp : 24;
  character.hp ??= Math.max(1, character.maxHp - character.wound * 4);
  character.equipment = { ...createEmptyEquipment(), ...(character.equipment ?? {}) };
  character.equipment = normalizeEquipmentSlots(character.equipment);
  return character;
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
        <div class="field"><span>法理状态</span><strong>${character.isPlayer ? "被重点伪造" : "临时有效"}</strong></div>
      </div>
    </section>
    <section class="dossier-section">
      <h3>风险与资源状态</h3>
      <div class="field-list">
        <div class="field"><span>知名度</span><strong>${character.notoriety}</strong></div>
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

function normalizeEquipmentSlots(equipment) {
  return {
    weapon: equipment.weapon ?? null,
    armor: equipment.armor ?? null,
  };
}

function normalizeRank(character) {
  if (mercenaryRanks.includes(character.rank)) return character.rank;
  if (typeof character.level === "number") return mercenaryRanks[Math.min(character.level, mercenaryRanks.length - 1)] ?? "无";
  return calculateRank(character);
}
