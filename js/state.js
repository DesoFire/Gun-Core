import {
  buildings,
  callsigns,
  characterClasses,
  creeds,
  equipmentSlots,
  fears,
  genders,
  lastWords,
  missionTemplates,
  names,
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
    day: 1,
    gold: 160,
    supplies: 28,
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
    log: ["事务所挂牌营业。第一批合同已经送达。"],
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
