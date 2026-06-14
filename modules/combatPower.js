import { characterClasses, mercenaryRanks } from "../data/sampleData.js";
import { clamp } from "../js/utils.js";

export function estimateBaseCombatPower(character) {
  const basePower = character.combatPower ?? 20;
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(character.rank));
  const traitPower = (character.traits?.length ?? 0) * 2;
  return Math.max(10, Math.round(basePower + rankIndex * 3 + traitPower));
}

export function calculateEquipmentCombatPower(character) {
  if (hasLostBothArms(character)) return 0;
  return Object.values(character.equipment ?? {})
    .filter(Boolean)
    .reduce((sum, item) => sum + getItemCombatPower(item), 0);
}

export function calculateCharacterCombatPower(character) {
  const basePower = character.combatPower ?? estimateBaseCombatPower(character);
  return Math.max(1, Math.round(basePower + calculateEquipmentCombatPower(character) + getPositiveConditionCombatPower(character) + getClassDamagePowerBonus(character)));
}

export function calculateEffectiveCharacterCombatPower(character) {
  const injuryPenalty = Math.round((character.wound ?? 0) * 4 * (1 - getWoundPenaltyReduction(character)));
  const stressPenalty = Math.floor((character.stress ?? 0) / 5);
  const conditionPenalty = (character.conditions ?? []).reduce((sum, condition) => sum + (condition.powerPenalty ?? 0), 0);
  return Math.max(1, calculateCharacterCombatPower(character) - injuryPenalty - stressPenalty - conditionPenalty);
}

export function calculateTeamCombatPower(roster, memberIds) {
  return roster
    .filter((character) => memberIds.includes(character.id))
    .reduce((sum, character) => sum + calculateEffectiveCharacterCombatPower(character), 0);
}

export function getItemCombatPower(item) {
  if (item.itemCategory === "weapon" || item.slot === "weapon") return clamp(item.power ?? 0, 0, 160);
  return 0;
}

export function getPromotionCombatPowerGain(nextRank) {
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(nextRank));
  return 3 + Math.ceil(rankIndex / 2);
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
