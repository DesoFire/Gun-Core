import {
  buildings,
  callsigns,
  characterClasses,
  contractBriefFragments,
  contractHiddenTwists,
  contractIntelFields,
  contractIntelPool,
  contractIssuers,
  contractRequirementPool,
  contractTypes,
  creeds,
  equipmentSlots,
  fears,
  genders,
  lastWords,
  mercenaryRanks,
  missionTemplates,
  names,
  otherContractIssuers,
  origins,
  personalities,
  sampleItems,
} from "../data/sampleData.js";
import { estimateBaseCombatPower } from "../modules/combatPower.js";
import { createId, randomItem, randomNumber } from "./utils.js";

const STORAGE_KEY = "gun-core-demo-state";
const avatarPalettes = [
  { bg: "#263a4f", fg: "#f3f7fb", ring: "#6da4c8" },
  { bg: "#3d324f", fg: "#fbf7ff", ring: "#a88bd8" },
  { bg: "#29463b", fg: "#f4fbf6", ring: "#79b892" },
  { bg: "#4b3828", fg: "#fff8ef", ring: "#d49b63" },
  { bg: "#4d2f37", fg: "#fff5f7", ring: "#d98293" },
  { bg: "#2d4448", fg: "#eefbfc", ring: "#70bac2" },
  { bg: "#4a4230", fg: "#fff9e8", ring: "#d6bd6f" },
  { bg: "#2f334f", fg: "#f4f5ff", ring: "#8793dc" },
  { bg: "#3b4630", fg: "#f7fbef", ring: "#9eba74" },
  { bg: "#4a303f", fg: "#fff3fb", ring: "#cd7eb5" },
  { bg: "#253f3a", fg: "#f0fffb", ring: "#67bea9" },
  { bg: "#473333", fg: "#fff3f0", ring: "#c78376" },
];

let state = normalizeState(loadState() ?? createInitialState());
const listeners = new Set();

export function getState() {
  return state;
}

export function updateState(mutator, options = {}) {
  mutator(state);
  state = normalizeState(state);
  if (options.save !== false) saveState();
  if (options.notify !== false) notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addLog(message) {
  updateState((draft) => {
    draft.log.push(`第 ${draft.day} 天：${message}`);
  });
}

export function saveState() {
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  getStorage()?.removeItem(STORAGE_KEY);
  state = normalizeState(createInitialState());
  saveState();
  notify();
}

export function normalizeCharacterAvatars(draft = state) {
  const usedAvatarKeys = new Set();
  draft.roster = (draft.roster ?? []).map((character) => normalizeCharacterState(character, usedAvatarKeys));
  draft.recruitPool = (draft.recruitPool ?? []).map((character) => normalizeCharacterState(character, usedAvatarKeys));
  draft.reputation = calculateRosterReputation(draft.roster ?? []);
}

export function createInitialState() {
  return {
    gameStatus: "active",
    objective: {
      title: "21天打响名号",
      targetReputation: 60,
      deadline: 21,
    },
    day: 1,
    gold: 180,
    supplies: 24,
    reputation: 0,
    stealth: 78,
    roster: [createInitialMercenary("vanguard"), createInitialMercenary("scout")],
    recruitPool: [createInitialMercenary(), createInitialMercenary(), createInitialMercenary()],
    missions: Array.from({ length: 4 }, () => createInitialMission()),
    timeline: [
      { id: createId(), day: 1, type: "system", title: "事务所挂牌", status: "done", detail: "第一批契约送达。短局开始。" },
    ],
    buildings: { tavern: 1, infirmary: 0, intel: 0 },
    mechs: [],
    inventory: sampleItems.map((item) => ({ ...item })),
    inventorySeeded: true,
    factions: [],
    log: ["事务所挂牌营业。目标：在第 21 天结束前把声望提升到 60，同时别让隐秘值归零。"],
  };
}

function notify() {
  listeners.forEach((listener) => listener(state));
}

function loadState() {
  const storage = getStorage();
  const saved = storage?.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    storage?.removeItem(STORAGE_KEY);
    return null;
  }
}

function getStorage() {
  return typeof globalThis.localStorage !== "undefined" &&
    typeof globalThis.localStorage.getItem === "function" &&
    typeof globalThis.localStorage.setItem === "function"
    ? globalThis.localStorage
    : null;
}

function normalizeState(savedState) {
  savedState.gameStatus ??= "active";
  savedState.objective ??= { title: "21天打响名号", targetReputation: 60, deadline: 21 };
  savedState.objective.title ??= "21天打响名号";
  savedState.objective.targetReputation ??= 60;
  savedState.objective.deadline ??= 21;
  savedState.day ??= 1;
  savedState.gold ??= 160;
  savedState.supplies ??= 28;
  savedState.reputation ??= 0;
  savedState.stealth ??= 78;
  savedState.buildings ??= { tavern: 1, infirmary: 0, intel: 0 };
  savedState.roster ??= [];
  savedState.recruitPool ??= [];
  savedState.missions ??= Array.from({ length: 4 }, () => createInitialMission());
  savedState.timeline ??= [];
  savedState.mechs ??= [];
  savedState.inventory ??= sampleItems.map((item) => ({ ...item }));
  if (!savedState.inventorySeeded) {
    const existingIds = new Set(savedState.inventory.map((item) => item.id));
    sampleItems.forEach((item) => {
      if (!existingIds.has(item.id)) savedState.inventory.push({ ...item });
    });
    savedState.inventorySeeded = true;
  }
  savedState.factions ??= [];
  savedState.log ??= [];

  Object.keys(buildings).forEach((id) => {
    savedState.buildings[id] ??= 0;
  });

  const usedAvatarKeys = new Set();
  savedState.roster = savedState.roster.map((character) => normalizeCharacterState(character, usedAvatarKeys));
  savedState.recruitPool = savedState.recruitPool.map((character) => normalizeCharacterState(character, usedAvatarKeys));
  savedState.reputation = calculateRosterReputation(savedState.roster);
  savedState.missions = savedState.missions.map(normalizeMissionState);
  savedState.timeline = savedState.timeline.map(normalizeTimelineEntry);
  savedState.inventory = savedState.inventory.map(normalizeItemState);
  return savedState;
}

function createInitialMercenary(classId = randomItem(Object.keys(characterClasses)), isPlayer = false, customName = "") {
  const baseClass = characterClasses[classId];
  const maxHp = baseClass.maxHp + randomNumber(-2, 3);
  const mercenary = {
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
  mercenary.avatar = createUniqueAvatar(mercenary);
  return mercenary;
}

function createInitialMission() {
  const type = randomItem(contractTypes);
  const issuer = randomIssuer();
  const difficulty = randomNumber(1, 3);
  const duration = randomNumber(1, 3 + Math.floor(difficulty / 2));
  const issueDay = 1;
  const expiresDay = issueDay + randomNumber(2, 4) + Math.floor(difficulty / 2);
  const powerRequirement = calculateInitialPowerRequirement(difficulty, 0);
  const recommendedTeamSize = createInitialRecommendedTeamSize(difficulty);
  const requirements = createInitialContractRequirements(type.tags);
  return {
    id: createId(),
    name: `${type.name}契约：${randomContractSubject(type)}`,
    issuer,
    type: type.name,
    typeCode: type.code,
    actionType: type.actionType,
    acquisition: "广撒网",
    difficulty,
    powerRequirement,
    powerIntelLevel: 0,
    recommendedTeamSize,
    requirements,
    duration,
    issueDay,
    expiresDay,
    reward: { gold: 35 + difficulty * randomNumber(16, 24), reputation: Math.max(5, difficulty * 3 + randomNumber(0, 5)) },
    description: `${randomItem(type.verbs)}目标。${randomItem(contractBriefFragments)}`,
    intel: createContractIntel(),
    revealedIntel: [],
    hidden: { twist: randomItem(contractHiddenTwists) },
    tags: [...new Set(type.tags)],
    refreshCost: 12 + difficulty * 4,
    investigateCost: 14 + difficulty * 5,
    remaining: duration,
    assigned: [],
    status: "available",
  };
}

function normalizeCharacterState(character, usedAvatarKeys = new Set()) {
  character.notoriety ??= character.isPlayer ? 3 : 1;
  character.enhancementPoints ??= 0;
  character.conditions ??= [];
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
  character.combatPower ??= estimateBaseCombatPower(character);
  character.maxHp ??= character.classId && characterClasses[character.classId] ? characterClasses[character.classId].maxHp : 24;
  character.hp ??= Math.max(1, character.maxHp - character.wound * 4);
  if (character.hp <= 0) character.status = "阵亡";
  character.equipment = { ...createEmptyEquipment(), ...(character.equipment ?? {}) };
  character.equipment = normalizeEquipmentSlots(character.equipment);
  character.avatar = normalizeAvatar(character, usedAvatarKeys);
  return character;
}

function normalizeMissionState(mission) {
  upgradeMissionToContract(mission);
  mission.remaining ??= mission.duration;
  mission.assigned ??= [];
  mission.status ??= "available";
  mission.tags ??= [];
  mission.issueDay ??= 1;
  mission.expiresDay ??= mission.issueDay + 4;
  mission.powerRequirement ??= calculateInitialPowerRequirement(mission.difficulty ?? 2, 0);
  mission.powerIntelLevel ??= Math.min(3, mission.revealedIntel?.length ?? 0);
  mission.recommendedTeamSize ??= createInitialRecommendedTeamSize(mission.difficulty ?? 2);
  mission.requirements ??= createInitialContractRequirements(mission.tags ?? []);
  mission.requirements.weaponTypes ??= [];
  mission.requirements.damageTypes ??= [];
  mission.requirements.tags ??= mission.tags?.slice(0, 2) ?? [];
  return mission;
}

function normalizeTimelineEntry(entry) {
  entry.id ??= createId();
  entry.day ??= 1;
  entry.type ??= "system";
  entry.title ??= "未命名记录";
  entry.status ??= "done";
  entry.detail ??= "";
  return entry;
}

function normalizeItemState(item) {
  item.id ??= createId();
  item.note ??= "";
  item.tags ??= [];
  return item;
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

function calculateRank(character) {
  return mercenaryRanks.includes(character.rank) ? character.rank : "无";
}

function normalizeRank(character) {
  if (mercenaryRanks.includes(character.rank)) return character.rank;
  if (typeof character.level === "number") return mercenaryRanks[Math.min(character.level, mercenaryRanks.length - 1)] ?? "无";
  return calculateRank(character);
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

function calculateInitialPowerRequirement(difficulty, reputation = 0) {
  return 18 + difficulty * randomNumber(8, 12) + Math.floor(reputation / 10) * 3 + randomNumber(-5, 8);
}

function createInitialRecommendedTeamSize(difficulty) {
  if (difficulty <= 1) return { min: 1, max: 2 };
  if (difficulty <= 3) return { min: 2, max: 3 };
  return { min: 3, max: 4 };
}

function createInitialContractRequirements(tags = []) {
  return {
    weaponTypes: drawInitialRequirements(contractRequirementPool.weaponTypes, randomNumber(1, 2)),
    damageTypes: drawInitialRequirements(contractRequirementPool.damageTypes, randomNumber(1, 2)),
    tags: tags.slice(0, 2),
  };
}

function drawInitialRequirements(pool, count) {
  const result = [];
  while (result.length < count && result.length < pool.length) {
    const item = randomItem(pool);
    if (!result.includes(item)) result.push(item);
  }
  return result;
}

function calculateRosterReputation(roster) {
  return roster
    .filter((character) => character.status !== "阵亡")
    .reduce((sum, character) => sum + Math.max(0, character.notoriety ?? 0), 0);
}

function normalizeAvatar(character, usedKeys) {
  const initial = getNameInitial(character.name);
  const currentIndex = Number.isInteger(character.avatar?.paletteIndex) ? character.avatar.paletteIndex : null;
  if (currentIndex !== null) {
    const key = `${initial}-${currentIndex}`;
    const palette = avatarPalettes[currentIndex % avatarPalettes.length];
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      return { initial, paletteIndex: currentIndex, ...palette };
    }
  }
  return createUniqueAvatar(character, usedKeys);
}

function createUniqueAvatar(character, usedKeys = new Set()) {
  const initial = getNameInitial(character.name);
  const seed = hashString(`${character.id ?? ""}-${character.name ?? ""}`);
  for (let offset = 0; offset < avatarPalettes.length * 4; offset += 1) {
    const paletteIndex = (seed + offset) % avatarPalettes.length;
    const key = `${initial}-${paletteIndex}`;
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      return { initial, paletteIndex, ...avatarPalettes[paletteIndex] };
    }
  }

  const paletteIndex = (seed + usedKeys.size) % avatarPalettes.length;
  usedKeys.add(`${initial}-${paletteIndex}-${character.id}`);
  return { initial, paletteIndex, ...avatarPalettes[paletteIndex] };
}

function getNameInitial(name = "?") {
  const compact = String(name).trim().replace(/\s+/g, "");
  return compact.slice(0, 1) || "?";
}

function hashString(value) {
  return [...String(value)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function upgradeMissionToContract(mission) {
  if (mission.issuer && mission.type && mission.intel && mission.hidden) return mission;

  const fallbackTemplate = missionTemplates.find((template) => template.name === mission.name) ?? randomItem(missionTemplates);
  const fallbackTags = mission.tags ?? fallbackTemplate.tags;
  const fallbackType = contractTypes.find((type) => type.tags.some((tag) => fallbackTags.includes(tag))) ?? randomItem(contractTypes);
  mission.issuer ??= randomIssuer();
  mission.type ??= fallbackType.name;
  mission.typeCode ??= fallbackType.code;
  mission.actionType ??= fallbackType.actionType ?? "logistics";
  mission.acquisition ??= "旧合同转录";
  mission.description ??= `${randomItem(fallbackType.verbs)}目标。${randomItem(contractBriefFragments)}`;
  mission.intel ??= createContractIntel();
  mission.revealedIntel ??= [];
  mission.hidden ??= { twist: randomItem(contractHiddenTwists) };
  mission.refreshCost ??= 12 + (mission.difficulty ?? fallbackTemplate.difficulty ?? 2) * 4;
  mission.investigateCost ??= 14 + (mission.difficulty ?? fallbackTemplate.difficulty ?? 2) * 5 + mission.revealedIntel.length * 6;
  mission.issueDay ??= 1;
  mission.expiresDay ??= mission.issueDay + 4;
  return mission;
}
