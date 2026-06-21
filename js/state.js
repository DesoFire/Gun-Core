import {
  facilities,
  missionBriefFragments,
  missionHiddenTwists,
  missionIntelFields,
  missionIntelPool,
  missionIssuers,
  missionRequirementPool,
  missionTypes,
  creeds,
  equipmentSlots,
  shortEpithetAdjectives,
  shortEpithetNouns,
  fears,
  genders,
  lastWords,
  mercenaryRanks,
  missionTemplates,
  names,
  nameProfiles,
  otherMissionIssuers,
  origins,
  personalities,
  sampleItems,
  wealthCollections,
} from "../data/sampleData.js";
import { economyConfig } from "../data/economyConfig.js";
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
}


export function createInitialState() {
  return {
    gameStatus: "active",
    ending: null,
    objective: {
      title: "填满私人收藏室",
      targetReputation: 60,
    },
    day: 1,
    organizationName: "Gun Core",
    introSeen: false,
    gold: economyConfig.initialState.gold,
    debtReliefUsed: false,
    enhancementPoints: 0,
    reputation: 0,
    unpaidSecrecy: { base: 0, mercenaries: {} },
    stealth: economyConfig.initialState.stealth,
    roster: [createInitialMercenary(), createInitialMercenary()],
    recruitPool: [createInitialMercenary(), createInitialMercenary(), createInitialMercenary()],
    missions: Array.from({ length: economyConfig.missions.missionBoard.availableLimit }, () => createInitialMission()),
    facilities: { tavern: 1, barracks: 0, defenses: 0, entertainmentCenter: 0, intel: 0 },
    mechs: [],
    inventory: sampleItems.map((item) => ({ ...item })),
    inventorySeeded: true,
    wealth: { owned: {} },
    factions: [],
    factionBalance: createInitialFactionBalance(),
    storyRoutes: createInitialStoryRoutes(),
    lastSettlement: null,
    log: ["事务所挂牌营业。目标：把战争财搬进私人收藏室，同时别让隐秘值归零。"],
  };
}

function createInitialFactionBalance() {
  return {
    war: { SSS: 70, FOF: 24, 天人残余: 5, 锈蚀部队: 1 },
    economy: { 黑市商会: 50, 企业财团: 50 },
    order: { 民生秩序: 90, 地方暴力: 10 },
    xenotech: { 纯净社区: 34, 科研机构: 33, 异源教会: 33 },
  };
}

function createInitialStoryRoutes() {
  return {
    // lockedRoute：主线锁定。null 表示尚未站队；SSS/FOF/rust/heaven 表示对应路线已锁定。
    lockedRoute: null,
    // progress：四条主线已完成的阶段数。达到各路线配置的 endingStage 后触发结局。
    progress: { SSS: 0, FOF: 0, rust: 0, heaven: 0 },
    // exposure/attention：锈蚀路线的灰色接触变量。attention 高了才更容易出现锈蚀接触任务。
    exposure: { rust: 0 },
    attention: { rust: 0 },
    // matrixDamage：锈蚀路线造成的矩阵破坏度。后续可用于影响机甲、通信、医疗、设施等系统。
    matrixDamage: 0,
    // alienSupport：天人路线积累的异源支援等级。当前用于提高天人契约收益与调查折扣。
    alienSupport: 0,
    // heavenPact：是否公开接受过天人残余契约。触发后永久切断其他明确人类势力契约。
    heavenPact: false,
  };
}

function normalizeStoryRoutes(routes) {
  const defaults = createInitialStoryRoutes();
  routes ??= {};
  routes.lockedRoute ??= defaults.lockedRoute;
  routes.progress ??= {};
  routes.progress.SSS ??= 0;
  routes.progress.FOF ??= 0;
  routes.progress.rust ??= 0;
  routes.progress.heaven ??= 0;
  routes.exposure ??= {};
  routes.exposure.rust ??= 0;
  routes.attention ??= {};
  routes.attention.rust ??= 0;
  routes.matrixDamage ??= 0;
  routes.alienSupport ??= 0;
  routes.heavenPact ??= false;
  return routes;
}

function normalizeFactionBalance(balance) {
  balance.war ??= { SSS: 70, FOF: 24, 天人残余: 5, 锈蚀部队: 1 };
  if (balance.war.错误信号 != null) {
    balance.war.锈蚀部队 = balance.war.锈蚀部队 ?? balance.war.错误信号;
    delete balance.war.错误信号;
  }
  balance.war.天人残余 ??= balance.commonThreat?.天人残余 ?? 5;
  balance.war.锈蚀部队 ??= balance.commonThreat?.错误信号 ?? 1;
  balance.economy ??= { 黑市商会: 50, 企业财团: 50 };
  balance.order ??= { 民生秩序: 90, 地方暴力: 10 };
  if (balance.order.地方政府 != null || balance.order.割据武装 != null || balance.order.响马强人 != null) {
    balance.order = {
      民生秩序: balance.order.民生秩序 ?? balance.order.地方政府 ?? 90,
      地方暴力: balance.order.地方暴力 ?? (balance.order.割据武装 ?? 5) + (balance.order.响马强人 ?? 5),
    };
  }
  balance.xenotech ??= { 纯净社区: 34, 科研机构: 33, 异源教会: 33 };
  delete balance.commonThreat;
  delete balance.hidden;
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
  savedState.ending ??= null;
  savedState.objective ??= { title: "填满私人收藏室", targetReputation: 60 };
  savedState.objective.title ??= "填满私人收藏室";
  savedState.objective.targetReputation ??= 60;
  delete savedState.objective.deadline;
  savedState.day ??= 1;
  savedState.organizationName ??= "Gun Core";
  savedState.introSeen ??= false;
  savedState.gold ??= economyConfig.initialState.gold;
  savedState.debtReliefUsed ??= false;
  delete savedState.supplies;
  savedState.enhancementPoints ??= 0;
  savedState.reputation ??= 0;
  savedState.unpaidSecrecy ??= { base: 0, mercenaries: {} };
  savedState.unpaidSecrecy.base ??= 0;
  savedState.unpaidSecrecy.mercenaries ??= {};
  savedState.stealth ??= economyConfig.initialState.stealth;
  savedState.facilities ??= { tavern: 1, barracks: 0, defenses: 0, entertainmentCenter: 0, intel: 0 };
  savedState.roster ??= [];
  savedState.recruitPool ??= [];
  savedState.missions ??= Array.from({ length: economyConfig.missions.missionBoard.availableLimit }, () => createInitialMission());
  delete savedState.timeline;
  savedState.mechs ??= [];
  savedState.inventory ??= sampleItems.map((item) => ({ ...item }));
  savedState.wealth ??= { owned: {} };
  savedState.wealth.owned ??= {};
  savedState.factionBalance ??= createInitialFactionBalance();
  normalizeFactionBalance(savedState.factionBalance);
  savedState.storyRoutes = normalizeStoryRoutes(savedState.storyRoutes);
  savedState.lastSettlement ??= null;
  normalizeWealthState(savedState);
  if (!savedState.inventorySeeded) {
    const existingIds = new Set(savedState.inventory.map((item) => item.id));
    sampleItems.forEach((item) => {
      if (!existingIds.has(item.id)) savedState.inventory.push({ ...item });
    });
    savedState.inventorySeeded = true;
  }
  savedState.factions ??= [];
  savedState.log ??= [];

  Object.keys(facilities).forEach((id) => {
    savedState.facilities[id] ??= 0;
  });

  const usedAvatarKeys = new Set();
  savedState.roster = savedState.roster.map((character) => normalizeCharacterState(character, usedAvatarKeys));
  savedState.recruitPool = savedState.recruitPool.map((character) => normalizeCharacterState(character, usedAvatarKeys));
  savedState.enhancementPoints += collectLegacyEnhancementPoints(savedState.roster);
  savedState.enhancementPoints += collectLegacyEnhancementPoints(savedState.recruitPool);
  savedState.missions = savedState.missions.map(normalizeMissionState);
  savedState.inventory = savedState.inventory.map(normalizeItemState);
  return savedState;
}

function createInitialMercenary(customName = "") {
  const mercenary = {
    id: createId(),
    name: customName || createRandomName(),
    callsign: createCallsign(),
    personalReputation: randomNumber(0, 2),
    rank: "\u65e0",
    dossier: createDossier(),
    missionRecord: { completed: 0, failed: 0, survived: 0 },
    bounty: randomNumber(0, 24) * 10,
    debt: randomNumber(0, 18) * 5,
    signingMultiplier: randomNumber(economyConfig.recruitment.signingMultiplierMin, economyConfig.recruitment.signingMultiplierMax),
    skills: [],
    equipment: createEmptyEquipment(),
    combatPower: randomNumber(17, 28),
    status: "\u5f85\u547d",
  };
  mercenary.avatar = createUniqueAvatar(mercenary);
  return mercenary;
}

function createInitialMission() {
  const type = randomItem(missionTypes);
  const issuer = randomIssuer();
  const routeInfo = createInitialMissionRouteInfo(issuer, type);
  const difficulty = randomNumber(1, 3);
  const duration = randomNumber(1, 3 + Math.floor(difficulty / 2));
  const issueDay = 1;
  const expiresDay = issueDay + randomNumber(2, 4) + Math.floor(difficulty / 2);
  const powerRequirement = calculateInitialPowerRequirement(difficulty, 0);
  const recommendedTeamSize = createInitialRecommendedTeamSize(difficulty);
  const requirements = createInitialMissionRequirements(difficulty);
  const reward = createInitialMissionReward(difficulty);
  return {
    id: createId(),
    name: `${type.name}契约：${randomMissionSubject(type)}`,
    issuer,
    storyRoute: routeInfo.storyRoute,
    isStoryMission: false,
    storyStage: null,
    routeLocking: false,
    moralBrief: routeInfo.moralBrief,
    type: type.name,
    typeCode: type.code,
    actionType: type.actionType,
    acquisition: "广播网",
    difficulty,
    powerRequirement,
    powerIntelLevel: 0,
    recommendedTeamSize,
    requirements,
    duration,
    issueDay,
    expiresDay,
    reward,
    description: `${randomItem(type.verbs)}目标。${randomItem(missionBriefFragments)}`,
    intel: createMissionIntel(),
    revealedIntel: [],
    hidden: { twist: randomMissionHiddenTwist() },
    refreshCost: calculateInitialRefreshCost(difficulty),
    investigateCost: calculateInitialInvestigateCost({ rewardGold: reward.gold, difficulty }),
    remaining: duration,
    assigned: [],
    status: "available",
  };
}

function normalizeCharacterState(character, usedAvatarKeys = new Set()) {
  if (character.personalReputation == null && character.notoriety != null) character.personalReputation = character.notoriety;
  delete character.notoriety;
  character.personalReputation ??= 1;
  delete character.isPlayer;
  splitLegacyName(character);
  character.name = (character.name || createRandomName()).trim().slice(0, 32);
  character.callsign ??= createCallsign();
  if (character.callsign.length > 12) character.callsign = createCallsign();
  character.callsign = character.callsign.trim().slice(0, 24);
  character.conditions ??= [];
  character.conditions = character.conditions.map(normalizeConditionState);
  delete character.positiveConditions;
  delete character.classId;
  delete character.className;
  delete character.careerCategory;
  delete character.careerCategoryName;
  delete character.tags;
  character.skills ??= [];
  character.rank = normalizeRank(character);
  delete character.level;
  delete character.xp;
  delete character.traits;
  character.dossier ??= createDossier();
  character.dossier.personality ??= randomItem(personalities);
  character.missionRecord ??= { completed: 0, failed: 0, survived: 0 };
  character.bounty ??= randomNumber(0, 24) * 10;
  character.debt ??= randomNumber(0, 18) * 5;
  character.signingMultiplier ??= randomNumber(economyConfig.recruitment.signingMultiplierMin, economyConfig.recruitment.signingMultiplierMax);
  character.status = normalizeCharacterStatus(character.status);
  character.combatPower ??= estimateBaseCombatPower(character);
  delete character.maxHp;
  delete character.hp;
  character.equipment = { ...createEmptyEquipment(), ...(character.equipment ?? {}) };
  character.equipment = normalizeEquipmentSlots(character.equipment);
  character.avatar = normalizeAvatar(character, usedAvatarKeys);
  return character;
}

function collectLegacyEnhancementPoints(characters = []) {
  return characters.reduce((sum, character) => {
    const points = character.enhancementPoints ?? 0;
    delete character.enhancementPoints;
    return sum + points;
  }, 0);
}

function normalizeMissionState(mission) {
  normalizeLegacyMission(mission);
  mission.remaining ??= mission.duration;
  mission.assigned ??= [];
  mission.status ??= "available";
  mission.issueDay ??= 1;
  mission.expiresDay ??= mission.issueDay + 4;
  mission.powerRequirement ??= calculateInitialPowerRequirement(mission.difficulty ?? 2, 0);
  mission.powerIntelLevel ??= Math.min(3, mission.revealedIntel?.length ?? 0);
  mission.recommendedTeamSize ??= createInitialRecommendedTeamSize(mission.difficulty ?? 2);
  mission.requirements ??= createInitialMissionRequirements(mission.difficulty ?? 2);
  mission.requirements.weaponTypes ??= [];
  mission.requirements.damageTypes ??= [];
  mission.requirements.skillTags ??= mission.requirements.careerCategories ?? [];
  mission.requirements.enemyMecha ??= false;
  delete mission.requirements.careerCategories;
  delete mission.requirements.tags;
  mission.storyRoute ??= null;
  mission.isStoryMission ??= false;
  mission.storyStage ??= null;
  mission.routeLocking ??= false;
  mission.moralBrief ??= createMissionMoralBrief(mission);
  return mission;
}

function createMissionMoralBrief(mission) {
  return {
    visible: mission?.moralBrief?.visible ?? "明面上，这仍是一份可以结算的契约。",
    hiddenCost: mission?.moralBrief?.hiddenCost ?? "暗地里，它会把一些人的名字从公开记录里擦掉。",
  };
}

function normalizeItemState(item) {
  item.id ??= createId();
  item.note ??= "";
  item.tags ??= [];
  if (item.itemCategory === "mecha" || item.slot === "mecha") {
    item.slot = "mecha";
    item.itemCategory = "mecha";
    item.damageType ??= randomItem(economyConfig.blackMarket.mechaDamageTypes ?? ["动能", "电磁", "爆风", "能量"]);
    item.protectionType ??= randomItem(economyConfig.blackMarket.mechaProtectionTypes ?? ["动能", "电磁", "爆风", "能量"]);
  }
  return item;
}

function normalizeConditionState(condition) {
  condition.category ??= "physical";
  condition.severity ??= "light";
  condition.tags ??= [];
  condition.deathRiskModifier ??= 0;
  return condition;
}

function normalizeWealthState(savedState) {
  const validIds = new Set(wealthCollections.flatMap((room) => room.items.map((item) => item.id)));
  Object.keys(savedState.wealth.owned).forEach((itemId) => {
    if (!validIds.has(itemId)) delete savedState.wealth.owned[itemId];
  });
}

function createEmptyEquipment() {
  return Object.fromEntries(Object.keys(equipmentSlots).map((slot) => [slot, null]));
}

function normalizeEquipmentSlots(equipment) {
  return {
    weapon: equipment.weapon ? normalizeItemState(equipment.weapon) : null,
    armor: equipment.armor ? normalizeItemState(equipment.armor) : null,
    mecha: equipment.mecha ? normalizeItemState(equipment.mecha) : null,
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
  return calculateRank(character);
}

function normalizeCharacterStatus(status) {
  if (status !== "??" && status !== "??" && String(status).includes("?")) return "??";
  if (status !== "??" && status !== "??" && String(status).includes("?")) return "??";
  return status ?? "??";
}

function randomIssuer() {
  if (randomNumber(1, 100) <= 35) return randomItem(missionIssuers);
  return randomItem(otherMissionIssuers.filter((issuer) => issuer !== "锈蚀部队"));
}

function createInitialMissionRouteInfo(issuer, type) {
  const storyRoute =
    issuer === "SSS" ? "SSS" :
    issuer === "FOF" ? "FOF" :
    issuer === "天人残余" ? "heaven" :
    null;
  return {
    storyRoute,
    isStoryMission: storyRoute === "heaven" || ((storyRoute === "SSS" || storyRoute === "FOF") && randomNumber(1, 100) <= 18),
    storyStage: storyRoute ? 1 : null,
    routeLocking: storyRoute === "heaven" && issuer === "天人残余",
    moralBrief: createInitialMissionMoralBrief(storyRoute, type),
  };
}

function createInitialMissionMoralBrief(route, type) {
  const briefs = {
    SSS: {
      visible: "恢复秩序、供电和调度，让红色系统重新把失控地区接回账本。",
      hiddenCost: "审查和清洗会跟着后勤车一起抵达，部分证词会在秩序恢复前消失。",
    },
    FOF: {
      visible: "保护证词、联络地方力量，让蓝色改革派获得继续作战的理由。",
      hiddenCost: "革命也需要诱饵、保密名单和不会被写进宣言的外包处决。",
    },
    heaven: {
      visible: "接受天人残余的异常支援，处理人类技术无法解释的问题。",
      hiddenCost: "从这一刻起，人类社会会把你的组织视为异源代理。",
    },
  };
  if (type?.name === "破坏") {
    return {
      visible: "破坏目标设施，让某套战争机器暂时停摆。",
      hiddenCost: "同一条线路也可能连着医院、净水泵和普通人的明天。",
    };
  }
  return briefs[route] ?? {
    visible: "明面上，这仍是一份可以结算的契约。",
    hiddenCost: "暗地里，它会把一些人的名字从公开记录里擦掉。",
  };
}


function randomMissionSubject(type) {
  const subjects = {
    护送: ["补给车队", "边境医生", "失联证人", "净水芯片"],
    运输: ["封存货箱", "机兵零件", "加密药剂", "旧联邦账本"],
    侦察: ["坠落哨站", "敌方前哨", "异常信号", "空港残骸"],
    搜索: ["失踪信使", "地下档案", "污染源头", "遗迹入口"],
    回收: ["黑匣子", "样本罐", "无人机残骸", "债务芯片"],
    歼灭: ["异源兽巢", "劫掠队", "叛逃安保组", "失控机兵"],
    突袭: ["走私仓库", "临时据点", "火控节点", "黑市拍卖场"],
    破坏: ["中继塔", "采矿钻机", "追踪网络", "军火流水线"],
    营救: ["被困工程师", "欠债线人", "伤员小队", "劫持目标"],
    防御: ["边境诊所", "补给站", "临时营地", "净水设施"],
    占领: ["转运站", "通讯楼", "矿区闸门", "列车站台"],
    特殊: ["无名委托", "错误回波", "旧神经接口", "异常遗物"],
  };
  return randomItem(subjects[type.name] ?? ["未分类目标"]);
}

function createMissionIntel() {
  return Object.fromEntries(missionIntelFields.map((field) => [field.key, randomItem(missionIntelPool[field.key])]));
}

function calculateInitialPowerRequirement(difficulty, reputation = 0) {
  const config = economyConfig.missions.requirement;
  return (
    config.basePower +
    difficulty * randomNumber(config.powerPerDifficultyMin, config.powerPerDifficultyMax) +
    Math.floor(reputation / config.reputationStep) * config.reputationPressure +
    randomNumber(config.randomOffsetMin, config.randomOffsetMax)
  );
}

function createInitialMissionReward(difficulty) {
  const config = economyConfig.missions.reward;
  return {
    gold: config.baseGold + difficulty * randomNumber(config.goldPerDifficultyMin, config.goldPerDifficultyMax),
    reputation: Math.max(
      config.minReputation,
      difficulty * config.reputationPerDifficulty + randomNumber(config.reputationRandomMin, config.reputationRandomMax)
    ),
  };
}

function calculateInitialRefreshCost(difficulty) {
  const config = economyConfig.missions.costs;
  return config.refreshBase + difficulty * config.refreshPerDifficulty;
}

function calculateInitialInvestigateCost({ rewardGold = 0, difficulty = 2 } = {}) {
  const config = economyConfig.missions.costs;
  const fallbackReward =
    rewardGold > 0
      ? rewardGold
      : economyConfig.missions.reward.baseGold + difficulty * economyConfig.missions.reward.goldPerDifficultyMin;
  const rate = config.investigationRewardRateMin + Math.random() * (config.investigationRewardRateMax - config.investigationRewardRateMin);
  return Math.max(config.investigationMinCost, Math.round(fallbackReward * rate));
}

function createInitialRecommendedTeamSize(difficulty) {
  if (difficulty <= 1) return { min: 1, max: 2 };
  if (difficulty <= 3) return { min: 2, max: 3 };
  return { min: 3, max: 4 };
}

function createInitialMissionRequirements(difficulty = 1) {
  const mechaConfig = economyConfig.missions.mechaThreat ?? {};
  const chanceTable = mechaConfig.enemyPresenceChanceByDifficulty ?? [];
  const chance = chanceTable[Math.max(0, Math.min(chanceTable.length - 1, difficulty))] ?? 0;
  return {
    weaponTypes: drawInitialRequirements(missionRequirementPool.weaponTypes, randomNumber(1, 2)),
    damageTypes: drawInitialRequirements(missionRequirementPool.damageTypes, randomNumber(1, 2)),
    skillTags: drawInitialRequirements(missionRequirementPool.skillTags, randomNumber(1, 100) <= 35 ? 2 : 1),
    enemyMecha: randomNumber(1, 100) <= chance,
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
    .reduce((sum, character) => sum + Math.max(0, character.personalReputation ?? 0), 0);
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

function splitLegacyName(character) {
  if (character.callsign || typeof character.name !== "string" || !character.name.includes(" · ")) return;
  const [name, ...callsignParts] = character.name.split(" · ");
  character.name = name.trim();
  character.callsign = callsignParts.join(" · ").trim() || createCallsign();
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
  const difficulty = mission.difficulty ?? fallbackTemplate.difficulty ?? 2;
  mission.refreshCost ??= calculateInitialRefreshCost(difficulty);
  mission.investigateCost ??= calculateInitialInvestigateCost({ rewardGold: mission.reward?.gold, difficulty });
  mission.issueDay ??= 1;
  mission.expiresDay ??= mission.issueDay + 4;
  return mission;
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
