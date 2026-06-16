import { characterClasses, mercenaryRanks } from "../data/sampleData.js";
import { clamp } from "../js/utils.js";

export function estimateBaseCombatPower(character) {
  const basePower = character.combatPower ?? 20;
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(character.rank));
  const gains = [0, 2, 6, 14, 30, 62, 126, 254];
  return Math.max(10, Math.round(basePower + (gains[rankIndex] ?? 0)));
}

export function calculateEquipmentCombatPower(character) {
  if (hasLostBothArms(character)) return 0;
  return Object.values(character.equipment ?? {})
    .filter(Boolean)
    .reduce((sum, item) => sum + getItemCombatPower(item), 0);
}

export function calculateCharacterCombatPower(character) {
  return getCombatPowerBreakdown(character).rawTotal;
}

export function calculateEffectiveCharacterCombatPower(character) {
  return getCombatPowerBreakdown(character).final;
}

export function getCombatPowerBreakdown(character) {
  const base = character.combatPower ?? estimateBaseCombatPower(character);
  const equipment = calculateEquipmentCombatPower(character);
  const positive = getPositiveConditionCombatPower(character);
  const classBonus = getClassDamagePowerBonus(character);
  const injuryState = getInjuryState(character);
  const pressureState = getPressureState(character);
  const injuryPenalty = Math.round(injuryState.penalty * (1 - getWoundPenaltyReduction(character)));
  const rawTotal = Math.max(1, Math.round(base + equipment + positive + classBonus));
  const physicalTotal = Math.max(0, Math.round(rawTotal - injuryPenalty));
  const final = Math.max(0, Math.round(physicalTotal * (1 - pressureState.penaltyRate)));
  const pressurePenalty = Math.max(0, physicalTotal - final);
  return {
    base,
    equipment,
    positive,
    classBonus,
    injuryPoints: injuryState.points,
    injuryLabel: injuryState.label,
    injuryPenalty,
    pressurePoints: pressureState.points,
    pressureLabel: pressureState.label,
    pressurePenaltyRate: pressureState.penaltyRate,
    pressurePenalty,
    rawTotal,
    physicalTotal,
    final,
  };
}

export function calculateTeamCombatPower(roster, memberIds) {
  return roster
    .filter((character) => memberIds.includes(character.id))
    .reduce((sum, character) => sum + calculateEffectiveCharacterCombatPower(character), 0);
}

export function getItemCombatPower(item) {
  if (item.itemCategory === "weapon" || item.slot === "weapon") return clamp(item.power ?? 0, 0, 400);
  return 0;
}

export function getPromotionCombatPowerGain(nextRank) {
  const gains = {
    F: 2,
    E: 4,
    D: 8,
    C: 16,
    B: 32,
    A: 64,
    S: 128,
  };
  return gains[nextRank] ?? 0;
}

function rarityBonus(rarity) {
  return Math.max(0, ["F", "E", "D", "C", "B", "A", "S"].indexOf(rarity));
}

function hasLostBothArms(character) {
  const limbs = new Set((character.conditions ?? []).map((condition) => condition.limb).filter(Boolean));
  return limbs.has("leftArm") && limbs.has("rightArm");
}

function getPositiveConditionCombatPower(character) {
  return (character.positiveConditions ?? []).reduce((sum, condition) => sum + (condition.powerBonus ?? 0), 0);
}

function getClassDamagePowerBonus(character) {
  const career = getCareer(character);
  const bonus = career?.effects?.damageTypePowerBonus;
  const weapon = character.equipment?.weapon;
  if (!bonus || !weapon || weapon.damageType !== bonus.type) return 0;
  return bonus.value ?? 0;
}

function getWoundPenaltyReduction(character) {
  const career = getCareer(character);
  return career?.effects?.woundPenaltyReduction ?? 0;
}

function getCareer(character) {
  return characterClasses[character.classId];
}

export function getInjuryState(character) {
  const points = getPhysicalWoundPoints(character);
  if (points <= 0) return { points, label: "无伤", level: "none", penalty: 0 };
  if (points === 1) return { points, label: "微伤", level: "low", penalty: 5 };
  if (points <= 4) return { points, label: "轻伤", level: "medium", penalty: 20 };
  if (points <= 7) return { points, label: "中伤", level: "high", penalty: 50 };
  if (points <= 10) return { points, label: "重伤", level: "extreme", penalty: 100 };
  return { points, label: "濒死", level: "collapse", penalty: 200 };
}

export function getPressureState(character) {
  const points = getMentalStressPoints(character);
  if (points <= 0) return { points, label: "无压", level: "none", penaltyRate: 0 };
  if (points === 1) return { points, label: "低压", level: "low", penaltyRate: 0.05 };
  if (points <= 4) return { points, label: "中压", level: "medium", penaltyRate: 0.2 };
  if (points <= 7) return { points, label: "高压", level: "high", penaltyRate: 0.5 };
  if (points <= 10) return { points, label: "极限", level: "extreme", penaltyRate: 0.8 };
  return { points, label: "崩溃", level: "collapse", penaltyRate: 1 };
}

export function getPhysicalWoundPoints(character) {
  return (character.conditions ?? [])
    .filter((condition) => condition.category === "physical")
    .reduce((sum, condition) => sum + getConditionWoundPoints(condition), 0);
}

export function getMentalStressPoints(character) {
  return (character.conditions ?? [])
    .filter((condition) => condition.category === "mental")
    .reduce((sum, condition) => sum + getConditionStressPoints(condition), 0);
}

export function getConditionWoundPoints(condition) {
  if (condition.woundPoints != null) return Math.max(0, condition.woundPoints);
  if (condition.severity === "heavy") return 7;
  if (condition.severity === "medium") return 4;
  return 1;
}

export function getConditionStressPoints(condition) {
  if (condition.stressPoints != null) return Math.max(0, condition.stressPoints);
  if (condition.severity === "heavy") return 6;
  if (condition.severity === "medium") return 3;
  return 1;
}
