import { createId, randomItem, randomNumber } from "../js/utils.js";
import { rollDamageType } from "./weaponGenerator.js";

const armorTypes = ["轻型护甲", "战术护甲", "重型护甲", "绝缘护甲", "防火护甲", "密封护甲"];
const rankDeathReduction = { F: [1, 2], E: [2, 3], D: [3, 5], C: [5, 7], B: [7, 10], A: [10, 14], S: [14, 20] };

export function generateArmor(options = {}) {
  const rarity = options.rarity ?? rollRarity();
  const type = options.type ?? randomItem(armorTypes);
  const reductionRange = rankDeathReduction[rarity] ?? rankDeathReduction.F;
  return {
    id: createId(),
    name: `${rarity}级 ${type}`,
    rarity,
    type,
    slot: "armor",
    deathRiskReduction: options.deathRiskReduction ?? randomNumber(...reductionRange),
    protectionType: options.protectionType ?? rollDamageType(),
    itemCategory: "armor",
    tags: [type],
    note: "简化防具：只降低死亡率并标记防护类型。",
  };
}

export function generateArmorItem(options = {}) {
  return generateArmor(options);
}

export function getArmorTagNames(armor) {
  return [armor.type, armor.protectionType, ...(armor.tags ?? [])].filter(Boolean);
}

function rollRarity() {
  const roll = randomNumber(1, 100);
  if (roll <= 3) return "S";
  if (roll <= 10) return "A";
  if (roll <= 24) return "B";
  if (roll <= 48) return "C";
  if (roll <= 70) return "D";
  if (roll <= 88) return "E";
  return "F";
}
