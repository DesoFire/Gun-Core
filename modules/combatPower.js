import { characterClasses, mercenaryRanks } from "../data/sampleData.js";
import { clamp } from "../js/utils.js";

export function estimateBaseCombatPower(character) {
  const basePower = character.combatPower ?? 20;
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(character.rank));
  return Math.max(10, Math.round(basePower + rankIndex * 3));
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
  const injuryPenalty = Math.round((character.wound ?? 0) * 4 * (1 - getWoundPenaltyReduction(character)));
  const stressPenalty = Math.floor((character.stress ?? 0) / 5);
  const conditionPenalty = getNegativeConditionCombatPowerPenalty(character);
  const rawTotal = Math.max(1, Math.round(base + equipment + positive + classBonus));
  const final = Math.max(1, Math.round(rawTotal - injuryPenalty - stressPenalty - conditionPenalty));
  return {
    base,
    equipment,
    positive,
    classBonus,
    injuryPenalty,
    stressPenalty,
    conditionPenalty,
    rawTotal,
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

function getNegativeConditionCombatPowerPenalty(character) {
  return (character.conditions ?? []).reduce((sum, condition) => sum + (condition.powerPenalty ?? 0), 0);
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
