import {
  baseDamageDiceByPower,
  damageTypes,
  negativeTags,
  positiveTags,
  rarityMaintenance,
  rarityModifiers,
  rarityWeights,
  rocketDamageDiceByPower,
  specialDamageDiceByPower,
  specialWeaponChance,
  weaponNamePrefixes,
  weaponNameSuffixes,
  weaponTags,
  weaponTemplates,
  weaponTypes,
} from "../data/weaponData.js";
import { clamp, createId, randomItem, randomNumber } from "../js/utils.js";

const firearmDamageTypes = damageTypes.filter((type) => type !== "切割");

export function generateWeapon(options = {}) {
  const type = options.type ?? rollWeaponType();
  const rarity = options.rarity ?? rollRarity();
  const template = weaponTemplates[type];
  const weapon = {
    id: createId(),
    name: generateWeaponName(type, rarity),
    rarity,
    type,
    slot: "rightHand",
    weight: randomNumber(...template.weight),
    size: randomNumber(...template.size),
    range: randomNumber(...template.range),
    power: randomNumber(...template.power),
    damageType: rollDamageType(type),
    damageDice: "",
    maintenance: rarityMaintenance[rarity],
    tags: rollBaseTags().map((tag) => ({ name: tag, tone: "neutral", source: "base" })),
    modifiers: [],
    note: "随机生成武器。可由商店、任务掉落或测试按钮调用。",
  };

  applyRarityModifiers(weapon);
  weapon.damageDice = calculateDamageDice(weapon.type, weapon.power);
  return weapon;
}

export function generateWeaponItem(options = {}) {
  return { ...generateWeapon(options), itemCategory: "weapon" };
}

export function getWeaponTagNames(weapon) {
  return (weapon.tags ?? []).map((tag) => (typeof tag === "string" ? tag : tag.name));
}

function rollWeaponType() {
  if (randomNumber(1, 100) <= specialWeaponChance) return "特殊";
  return randomItem(weaponTypes.filter((type) => type !== "特殊"));
}

function rollRarity() {
  const roll = randomNumber(1, 100);
  let cursor = 0;
  for (const entry of rarityWeights) {
    cursor += entry.weight;
    if (roll <= cursor) return entry.rarity;
  }
  return "C";
}

function rollBaseTags() {
  const count = randomNumber(0, 2);
  const result = new Set();
  while (result.size < count) result.add(randomItem(weaponTags));
  return [...result];
}

function applyRarityModifiers(weapon) {
  const plan = rarityModifiers[weapon.rarity];
  for (let index = 0; index < plan.positive; index += 1) applyRecordedModifier(weapon, "positive");
  for (let index = 0; index < plan.negative; index += 1) applyRecordedModifier(weapon, "negative");
}

function applyRecordedModifier(weapon, tone) {
  const before = weapon.modifiers.length;
  for (let attempt = 0; attempt < 12 && weapon.modifiers.length === before; attempt += 1) {
    if (tone === "positive") applyPositiveModifier(weapon);
    if (tone === "negative") applyNegativeModifier(weapon);
  }
}

function applyPositiveModifier(weapon) {
  const modifier = randomItem(["weight-", "size-", "range+", "power+", "tag"]);
  if (modifier === "weight-") return applyAttributeModifier(weapon, "weight", -1, "positive");
  if (modifier === "size-") return applyAttributeModifier(weapon, "size", -1, "positive");
  if (modifier === "range+") return applyAttributeModifier(weapon, "range", 1, "positive");
  if (modifier === "power+") return applyAttributeModifier(weapon, "power", 1, "positive");
  return addTag(weapon, randomItem(positiveTags), "positive");
}

function applyNegativeModifier(weapon) {
  const modifier = randomItem(["weight+", "size+", "range-", "power-", "tag"]);
  if (modifier === "weight+") return applyAttributeModifier(weapon, "weight", 1, "negative");
  if (modifier === "size+") return applyAttributeModifier(weapon, "size", 1, "negative");
  if (modifier === "range-") return applyAttributeModifier(weapon, "range", -1, "negative");
  if (modifier === "power-") return applyAttributeModifier(weapon, "power", -1, "negative");
  return addTag(weapon, randomItem(negativeTags), "negative");
}

function applyAttributeModifier(weapon, attribute, delta, tone) {
  const before = weapon[attribute];
  weapon[attribute] = clamp(weapon[attribute] + delta, 0, 5);
  const actualDelta = weapon[attribute] - before;
  if (actualDelta === 0) return;
  weapon.modifiers.push({ kind: "attribute", attribute, delta: actualDelta, tone });
}

function addTag(weapon, tag, tone) {
  if (getWeaponTagNames(weapon).includes(tag)) return;
  weapon.tags.push({ name: tag, tone, source: "rarity" });
  weapon.modifiers.push({ kind: "tag", tag, tone });
}

function rollDamageType(type) {
  if (type === "特殊") return randomItem(damageTypes);
  const roll = randomNumber(1, 100);
  if (roll <= 75) return "动能";
  if (roll <= 77) return "异源";
  return randomItem(firearmDamageTypes.filter((damageType) => damageType !== "动能" && damageType !== "异源"));
}

function calculateDamageDice(type, power) {
  if (type === "火箭筒") return rocketDamageDiceByPower[power];
  if (type === "特殊") return specialDamageDiceByPower[power];

  const base = baseDamageDiceByPower[power];
  if (type === "手枪") return `${base}-2`;
  if (type === "微型冲锋枪") return `${base.replace(/^1d/, "2d")}-2`;
  if (type === "狙击步枪") return `${base}+2`;
  if (type === "机枪") return base.replace(/^1d/, "2d");
  return base;
}

function generateWeaponName(type, rarity) {
  return `${rarity}级 ${randomItem(weaponNamePrefixes)}${type} · ${randomItem(weaponNameSuffixes)}`;
}
