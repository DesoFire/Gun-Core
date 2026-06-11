import { mercenaryRanks } from "../data/sampleData.js";
import { clamp } from "../js/utils.js";

export function estimateBaseCombatPower(character) {
  const stats = character.stats ?? { might: 3, agility: 3, wits: 3, resolve: 3 };
  const statPower = stats.might * 2.2 + stats.agility * 1.7 + stats.wits * 1.2 + stats.resolve * 1.5;
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(character.rank));
  const traitPower = (character.traits?.length ?? 0) * 2;
  return Math.max(10, Math.round(statPower + rankIndex * 5 + traitPower));
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
  return Math.max(1, calculateCharacterCombatPower(character) - injuryPenalty - stressPenalty);
}

export function calculateTeamCombatPower(roster, memberIds) {
  return roster
    .filter((character) => memberIds.includes(character.id))
    .reduce((sum, character) => sum + calculateEffectiveCharacterCombatPower(character), 0);
}

export function getItemCombatPower(item) {
  if (item.itemCategory === "weapon" || item.damageDice) return clamp((item.power ?? 1) * 3 + rarityBonus(item.rarity), 1, 28);
  if (item.itemCategory === "armor" && typeof item.armor === "number") {
    return clamp((item.armor ?? 0) * 2 + (item.mobility ?? 0) + rarityBonus(item.rarity), 0, 24);
  }
  return 0;
}

export function getPromotionCombatPowerGain(nextRank) {
  const rankIndex = Math.max(0, mercenaryRanks.indexOf(nextRank));
  return 3 + Math.ceil(rankIndex / 2);
}

function rarityBonus(rarity) {
  return Math.max(0, ["F", "E", "D", "C", "B", "A", "S"].indexOf(rarity));
}
