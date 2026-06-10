import { attributeLabels, attributeScaleLabels } from "../data/weaponData.js";
import { getInventoryItem } from "../modules/inventory.js";

let lastWeapon = null;

export function initWeaponUI() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-weapon]");
    if (openButton) {
      openWeaponDialog(openButton.dataset.openWeapon);
      return;
    }

    const closeButton = event.target.closest("[data-close-weapon]");
    if (closeButton) {
      document.querySelector("#weapon-dialog").close();
    }
  });
}

export function renderWeaponCard(weapon) {
  return `
    <article class="weapon-card rarity-${weapon.rarity}" data-open-weapon="${weapon.id}">
      <div class="card-header">
        <div>
          <p class="card-title">${weapon.name}</p>
          <p class="muted">${weapon.rarity}级 · ${weapon.type} · ${weapon.damageType}</p>
        </div>
        <span class="badge">${weapon.damageDice}</span>
      </div>
      <div class="stat-line">
        ${renderCompactAttribute("weight", weapon)}
        ${renderCompactAttribute("size", weapon)}
        ${renderCompactAttribute("range", weapon)}
        ${renderCompactAttribute("power", weapon)}
        <span>维护费 ${weapon.maintenance}</span>
      </div>
      <div class="badge-row">${renderTagBadges(weapon)}</div>
      <button class="link-button" data-open-weapon="${weapon.id}" type="button">查看武器详情</button>
    </article>
  `;
}

export function renderWeaponSummaryLine(weapon) {
  return `${weapon.type} · ${weapon.rarity}级 · ${weapon.damageType} · ${weapon.damageDice}`;
}

function openWeaponDialog(id) {
  const weapon = getInventoryItem(id) ?? (lastWeapon?.id === id ? lastWeapon : null);
  if (!weapon) return;

  const dialog = document.querySelector("#weapon-dialog");
  document.querySelector("#weapon-dossier").innerHTML = renderWeaponDetail(weapon);
  dialog.showModal();
}

function renderWeaponDetail(weapon) {
  return `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">SSS-GUILD ARMORY / RANDOM WEAPON RECORD</div>
        <h2 class="dossier-title">${weapon.name}</h2>
        <p class="muted">${weapon.rarity}级 · ${weapon.type} · ${weapon.damageType} · ${weapon.damageDice}</p>
      </div>
      <button class="ghost-button" data-close-weapon type="button">关闭</button>
    </div>

    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>作战参数</h3>
        <div class="field-list">
          ${renderAttributeField("weight", weapon)}
          ${renderAttributeField("size", weapon)}
          ${renderAttributeField("range", weapon)}
          ${renderAttributeField("power", weapon)}
          <div class="field"><span>维护费</span><strong>${weapon.maintenance}</strong></div>
        </div>
      </section>

      <section class="dossier-section">
        <h3>伤害</h3>
        <div class="field-list">
          <div class="field"><span>伤害类型</span><strong>${weapon.damageType}</strong></div>
          <div class="field"><span>伤害骰</span><strong>${weapon.damageDice}</strong></div>
          <div class="field"><span>武器类型</span><strong>${weapon.type}</strong></div>
          <div class="field"><span>稀有度</span><strong>${weapon.rarity}</strong></div>
        </div>
      </section>

      <section class="dossier-section wide">
        <h3>稀有度修正</h3>
        ${renderModifierList(weapon)}
      </section>

      <section class="dossier-section wide">
        <h3>标签</h3>
        <div class="badge-row">${renderTagBadges(weapon)}</div>
      </section>
    </div>
  `;
}

function renderCompactAttribute(attribute, weapon) {
  const value = weapon[attribute];
  return `<span>${attributeLabels[attribute]} ${value}（${getScaleLabel(attribute, value)}）${renderAttributeModifier(attribute, weapon)}</span>`;
}

function renderAttributeField(attribute, weapon) {
  const value = weapon[attribute];
  return `
    <div class="field">
      <span>${attributeLabels[attribute]}</span>
      <strong>${value}（${getScaleLabel(attribute, value)}）${renderAttributeModifier(attribute, weapon)}</strong>
    </div>
  `;
}

function renderAttributeModifier(attribute, weapon) {
  const total = (weapon.modifiers ?? [])
    .filter((modifier) => modifier.kind === "attribute" && modifier.attribute === attribute)
    .reduce((sum, modifier) => sum + modifier.delta, 0);
  if (total === 0) return "";
  const tone = getAttributeDeltaTone(attribute, total);
  const sign = total > 0 ? "+" : "";
  return ` <span class="delta ${tone}">${sign}${total}</span>`;
}

function renderModifierList(weapon) {
  const modifiers = weapon.modifiers ?? [];
  if (modifiers.length === 0) return `<p class="muted">没有稀有度修正记录。</p>`;
  return `
    <div class="modifier-list">
      ${modifiers
        .map((modifier) => {
          if (modifier.kind === "tag") {
            return `<span class="modifier ${modifier.tone}">标签：${modifier.tag}</span>`;
          }
          const sign = modifier.delta > 0 ? "+" : "";
          return `<span class="modifier ${modifier.tone}">${attributeLabels[modifier.attribute]} ${sign}${modifier.delta}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderTagBadges(weapon) {
  const tags = normalizeTags(weapon.tags);
  if (tags.length === 0) return `<span class="badge">无标签</span>`;
  return tags.map((tag) => `<span class="badge tag-${tag.tone}">${tag.name}</span>`).join("");
}

function normalizeTags(tags = []) {
  return tags.map((tag) => (typeof tag === "string" ? { name: tag, tone: "neutral" } : { tone: "neutral", ...tag }));
}

function getAttributeDeltaTone(attribute, delta) {
  if (attribute === "weight" || attribute === "size") return delta < 0 ? "positive" : "negative";
  return delta > 0 ? "positive" : "negative";
}

function getScaleLabel(attribute, value) {
  return attributeScaleLabels[attribute]?.[value] ?? String(value);
}
