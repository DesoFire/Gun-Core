import { damageTypes } from "../data/weaponData.js";
import { economyConfig } from "../data/economyConfig.js";
import { createId, randomItem, randomNumber } from "../js/utils.js";

const weaponTypes = ["步枪", "霰弹", "手枪", "狙击", "近战", "爆破", "医疗器械", "电子战"];

export function generateWeapon(options = {}) {
  const rarity = options.rarity ?? rollRarity();
  const type = options.type ?? randomItem(weaponTypes);
  const powerRange = getRankPowerRange(rarity);
  return {
    id: createId(),
    name: `${rarity}级 ${type}`,
    rarity,
    type,
    slot: "weapon",
    power: options.power ?? randomNumber(...powerRange),
    damageType: options.damageType ?? rollDamageType(),
    itemCategory: "weapon",
    tags: [type],
    note: "简化武器：只提供战斗力和伤害类型。",
  };
}

function getRankPowerRange(rarity) {
  const reference =
    economyConfig.blackMarket.weaponPowerReferenceByRank?.[rarity] ??
    economyConfig.blackMarket.weaponPowerReferenceByRank?.F ??
    22;
  const min = Math.max(1, Math.round(reference * economyConfig.blackMarket.weaponPowerMultiplierMin));
  const max = Math.max(min, Math.round(reference * economyConfig.blackMarket.weaponPowerMultiplierMax));
  return [min, max];
}


export function generateWeaponItem(options = {}) {
  return generateWeapon(options);
}

export function getWeaponTagNames(weapon) {
  return [weapon.type, weapon.damageType, ...(weapon.tags ?? [])].filter(Boolean);
}

export function rollDamageType() {
  return randomItem(damageTypes);
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
