import {
  armorNamePrefixes,
  armorNegativeTags,
  armorPositiveTags,
  armorRarityMaintenance,
  armorRarityModifiers,
  armorRarityWeights,
  armorTags,
  armorTemplates,
  armorTypes,
} from "../data/armorData.js";
import { clamp, createId, randomItem, randomNumber } from "../js/utils.js";

const armorAttributes = ["armor", "payload", "weight", "mobility"];

export function generateArmor(options = {}) {
  const type = options.type ?? rollArmorType();
  const rarity = options.rarity ?? rollArmorRarity();
  const template = armorTemplates[type];
  const armor = {
    id: createId(),
    name: generateArmorName(type, rarity),
    rarity,
    type,
    slot: "chest",
    armor: randomNumber(...template.armor),
    payload: randomNumber(...template.payload),
    weight: randomNumber(...template.weight),
    mobility: randomNumber(...template.mobility),
    maintenance: armorRarityMaintenance[rarity],
    tags: rollBaseTags().map((tag) => ({ name: tag, tone: "neutral", source: "base" })),
    modifiers: [],
    note: "随机生成防具。可由黑市、任务掉落或测试按钮调用。",
  };

  applyRarityModifiers(armor);
  return armor;
}

export function generateArmorItem(options = {}) {
  return { ...generateArmor(options), itemCategory: "armor" };
}

export function getArmorTagNames(armor) {
  return (armor.tags ?? []).map((tag) => (typeof tag === "string" ? tag : tag.name));
}

function rollArmorType() {
  return randomItem(armorTypes);
}

function rollArmorRarity() {
  const roll = randomNumber(1, 100);
  let cursor = 0;
  for (const entry of armorRarityWeights) {
    cursor += entry.weight;
    if (roll <= cursor) return entry.rarity;
  }
  return "C";
}

function rollBaseTags() {
  const count = randomNumber(0, 2);
  const result = new Set();
  while (result.size < count) result.add(randomItem(armorTags));
  return [...result];
}

function applyRarityModifiers(armor) {
  const plan = armorRarityModifiers[armor.rarity];
  for (let index = 0; index < plan.positive; index += 1) applyRecordedModifier(armor, "positive");
  for (let index = 0; index < plan.negative; index += 1) applyRecordedModifier(armor, "negative");
}

function applyRecordedModifier(armor, tone) {
  const before = armor.modifiers.length;
  for (let attempt = 0; attempt < 12 && armor.modifiers.length === before; attempt += 1) {
    if (tone === "positive") applyPositiveModifier(armor);
    if (tone === "negative") applyNegativeModifier(armor);
  }
}

function applyPositiveModifier(armor) {
  const modifier = randomItem([...armorAttributes, "tag"]);
  if (modifier === "tag") return addTag(armor, randomItem(armorPositiveTags), "positive");
  return applyAttributeModifier(armor, modifier, 1, "positive");
}

function applyNegativeModifier(armor) {
  const modifier = randomItem([...armorAttributes, "tag"]);
  if (modifier === "tag") return addTag(armor, randomItem(armorNegativeTags), "negative");
  return applyAttributeModifier(armor, modifier, -1, "negative");
}

function applyAttributeModifier(armor, attribute, delta, tone) {
  const before = armor[attribute];
  armor[attribute] = clamp(armor[attribute] + delta, 0, 5);
  const actualDelta = armor[attribute] - before;
  if (actualDelta === 0) return;
  armor.modifiers.push({ kind: "attribute", attribute, delta: actualDelta, tone });
}

function addTag(armor, tag, tone) {
  if (getArmorTagNames(armor).includes(tag)) return;
  armor.tags.push({ name: tag, tone, source: "rarity" });
  armor.modifiers.push({ kind: "tag", tag, tone });
}

function generateArmorName(type, rarity) {
  return `${rarity}级 ${randomItem(armorNamePrefixes)}${type}`;
}
