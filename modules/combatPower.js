import { mercenaryRanks } from "../data/sampleData.js";
import { clamp } from "../js/utils.js";

export function estimateBaseCombatPower(character) {
  const basePower = character.combatPower ?? 20;
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(character.rank));
  const traitPower = (character.traits?.length ?? 0) * 2;
  return Math.max(10, Math.round(basePower + rankIndex * 3 + traitPower));
}

export function calculateEquipmentCombatPower(character) {
  return Object.values(character.equipment ?? {})
    .filter(Boolean)
    .reduce((sum, item) => sum + getItemCombatPower(item), 0);
}

export function calculateCharacterCombatPower(character) {
  const basePower = character.combatPower ?? estimateBaseCombatPower(character);
  return Math.max(1, Math.round(basePower + calculateEquipmentCombatPower(character)));
}

export function calculateEffectiveCharacterCombatPower(character) {
  const injuryPenalty = (character.wound ?? 0) * 4;
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
  if (item.itemCategory === "weapon" || item.slot === "weapon") return clamp(item.power ?? 0, 0, 50);
  return 0;
}

export function getPromotionCombatPowerGain(nextRank) {
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(nextRank));
  return 3 + Math.ceil(rankIndex / 2);
}

function rarityBonus(rarity) {
  return Math.max(0, ["F", "E", "D", "C", "B", "A", "S"].indexOf(rarity));
}
