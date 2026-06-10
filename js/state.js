import {
  buildings,
  callsigns,
  characterClasses,
  contractBriefFragments,
  contractHiddenTwists,
  contractIntelFields,
  contractIntelPool,
  contractIssuers,
  contractTypes,
  creeds,
  equipmentSlots,
  fears,
  genders,
  lastWords,
  missionTemplates,
  names,
  otherContractIssuers,
  origins,
  personalities,
  sampleItems,
} from "../data/sampleData.js";
import { createId, randomItem, randomNumber } from "./utils.js";

const STORAGE_KEY = "gun-core-demo-state";

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

  savedState.roster = savedState.roster.map(normalizeCharacterState);
  savedState.recruitPool = savedState.recruitPool.map(normalizeCharacterState);
  savedState.missions = savedState.missions.map(normalizeMissionState);
  savedState.inventory = savedState.inventory.map(normalizeItemState);
  return savedState;
}

function createInitialMercenary(classId = randomItem(Object.keys(characterClasses)), isPlayer = false, customName = "") {
  const baseClass = characterClasses[classId];
  const maxHp = baseClass.maxHp + randomNumber(-2, 3);
  return {
    id: createId(),
    name: customName || `${randomItem(names)} · ${randomItem(callsigns)}`,
    classId,
    className: baseClass.name,
    level: 1,
    xp: 0,
    hp: maxHp,
    maxHp,
    notoriety: isPlayer ? 3 : randomNumber(0, 2),
    rank: "F",
    dossier: createDossier(),
    contractRecord: { completed: 0, failed: 0, survived: 0 },
    bounty: randomNumber(0, 24) * 10,
    debt: randomNumber(0, 18) * 5,
    stress: randomNumber(0, 8),
    wound: 0,
    isPlayer,
    tags: [...baseClass.tags],
    equipment: createEmptyEquipment(),
    stats: addVariance(baseClass.stats),
    status: "待命",
  };
}

function createInitialMission() {
  const type = randomItem(contractTypes);
  const issuer = randomIssuer();
  const difficulty = randomNumber(2, 5);
  const duration = randomNumber(1, 3 + Math.floor(difficulty / 2));
  return {
    id: createId(),
    name: `${type.name}契约：${randomContractSubject(type)}`,
    issuer,
    type: type.name,
    typeCode: type.code,
    acquisition: "广撒网",
    difficulty,
    duration,
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

function normalizeCharacterState(character) {
  character.notoriety ??= character.isPlayer ? 3 : 1;
  character.rank ??= calculateRank(character);
  character.dossier ??= createDossier();
  character.dossier.personality ??= randomItem(personalities);
  character.contractRecord ??= { completed: 0, failed: 0, survived: 0 };
  character.bounty ??= randomNumber(0, 24) * 10;
  character.debt ??= randomNumber(0, 18) * 5;
  character.wound ??= 0;
  character.stress ??= 0;
  character.status ??= "待命";
  character.tags ??= [];
  character.stats ??= { might: 1, agility: 1, wits: 1, resolve: 1 };
  character.maxHp ??= 24 + character.stats.resolve;
  character.hp ??= Math.max(1, character.maxHp - character.wound * 4);
  character.equipment = { ...createEmptyEquipment(), ...(character.equipment ?? {}) };
  character.rank = calculateRank(character);
  return character;
}

function normalizeMissionState(mission) {
  upgradeMissionToContract(mission);
  mission.remaining ??= mission.duration;
  mission.assigned ??= [];
  mission.status ??= "available";
  mission.tags ??= [];
  return mission;
}

function normalizeItemState(item) {
  item.id ??= createId();
  item.tags ??= [];
  item.note ??= "";
  return item;
}

function createEmptyEquipment() {
  return Object.fromEntries(Object.keys(equipmentSlots).map((slot) => [slot, null]));
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
  if (character.level >= 8) return "S";
  if (character.level >= 6) return "A";
  if (character.level >= 4) return "B";
  if (character.level >= 3) return "C";
  if (character.level >= 2) return "D";
  return "F";
}

function addVariance(stats) {
  return Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, Math.max(1, value + randomNumber(-1, 1))]));
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

function upgradeMissionToContract(mission) {
  if (mission.issuer && mission.type && mission.intel && mission.hidden) return mission;

  const fallbackTemplate = missionTemplates.find((template) => template.name === mission.name) ?? randomItem(missionTemplates);
  const fallbackTags = mission.tags ?? fallbackTemplate.tags;
  const fallbackType = contractTypes.find((type) => type.tags.some((tag) => fallbackTags.includes(tag))) ?? randomItem(contractTypes);
  mission.issuer ??= randomIssuer();
  mission.type ??= fallbackType.name;
  mission.typeCode ??= fallbackType.code;
  mission.acquisition ??= "旧合同转录";
  mission.description ??= `${randomItem(fallbackType.verbs)}目标。${randomItem(contractBriefFragments)}`;
  mission.intel ??= createContractIntel();
  mission.revealedIntel ??= [];
  mission.hidden ??= { twist: randomItem(contractHiddenTwists) };
  mission.refreshCost ??= 12 + (mission.difficulty ?? fallbackTemplate.difficulty ?? 2) * 4;
  mission.investigateCost ??= 14 + (mission.difficulty ?? fallbackTemplate.difficulty ?? 2) * 5 + mission.revealedIntel.length * 6;
  return mission;
}
