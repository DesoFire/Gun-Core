import { armorAttributeLabels, armorAttributeScaleLabels } from "../data/armorData.js";
import { getInventoryItem } from "../modules/inventory.js";

const armorAttributes = ["armor", "payload", "weight", "mobility"];

export function initArmorUI() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-armor]");
    if (openButton) {
      openArmorDialog(openButton.dataset.openArmor);
      return;
    }

    const closeButton = event.target.closest("[data-close-armor]");
    if (closeButton) {
      document.querySelector("#armor-dialog").close();
    }
  });
}

export function renderArmorCard(armor) {
  return `
    <article class="weapon-card rarity-${armor.rarity}" data-open-armor="${armor.id}">
      <div class="card-header">
        <div>
          <p class="card-title">${armor.name}</p>
          <p class="muted">${armor.rarity}级 · ${armor.type}</p>
        </div>
        <span class="badge">护甲 ${armor.armor}</span>
      </div>
      <div class="stat-line">
        ${armorAttributes.map((attribute) => renderCompactAttribute(attribute, armor)).join("")}
        <span>维护费 ${armor.maintenance}</span>
      </div>
      <div class="badge-row">${renderTagBadges(armor)}</div>
      <button class="link-button" data-open-armor="${armor.id}" type="button">查看防具详情</button>
    </article>
  `;
}

export function renderArmorSummaryLine(armor) {
  return `${armor.type} · ${armor.rarity}级 · 护甲 ${armor.armor} · 载荷 ${armor.payload}`;
}

function openArmorDialog(id) {
  const armor = getInventoryItem(id);
  if (!armor) return;

  const dialog = document.querySelector("#armor-dialog");
  document.querySelector("#armor-dossier").innerHTML = renderArmorDetail(armor);
  dialog.showModal();
}

function renderArmorDetail(armor) {
  return `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">SSS-GUILD ARMORY / RANDOM ARMOR RECORD</div>
        <h2 class="dossier-title">${armor.name}</h2>
        <p class="muted">${armor.rarity}级 · ${armor.type}</p>
      </div>
      <button class="ghost-button" data-close-armor type="button">关闭</button>
    </div>

    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>防护参数</h3>
        <div class="field-list">
          ${armorAttributes.map((attribute) => renderAttributeField(attribute, armor)).join("")}
          <div class="field"><span>维护费</span><strong>${armor.maintenance}</strong></div>
        </div>
      </section>

      <section class="dossier-section">
        <h3>装备记录</h3>
        <div class="field-list">
          <div class="field"><span>防具类型</span><strong>${armor.type}</strong></div>
          <div class="field"><span>稀有度</span><strong>${armor.rarity}</strong></div>
          <div class="field"><span>装备槽位</span><strong>${armor.slot ?? "chest"}</strong></div>
          <div class="field"><span>物品类别</span><strong>防具</strong></div>
        </div>
      </section>

      <section class="dossier-section wide">
        <h3>稀有度修正</h3>
        ${renderModifierList(armor)}
      </section>

      <section class="dossier-section wide">
        <h3>标签</h3>
        <div class="badge-row">${renderTagBadges(armor)}</div>
      </section>
    </div>
  `;
}

function renderCompactAttribute(attribute, armor) {
  const value = armor[attribute];
  return `<span>${armorAttributeLabels[attribute]} ${value}：${getScaleLabel(attribute, value)}${renderAttributeModifier(attribute, armor)}</span>`;
}

function renderAttributeField(attribute, armor) {
  const value = armor[attribute];
  return `
    <div class="field">
      <span>${armorAttributeLabels[attribute]}</span>
      <strong>${value}：${getScaleLabel(attribute, value)}${renderAttributeModifier(attribute, armor)}</strong>
    </div>
  `;
}

function renderAttributeModifier(attribute, armor) {
  const total = (armor.modifiers ?? [])
    .filter((modifier) => modifier.kind === "attribute" && modifier.attribute === attribute)
    .reduce((sum, modifier) => sum + modifier.delta, 0);
  if (total === 0) return "";
  const sign = total > 0 ? "+" : "";
  return ` <span class="delta ${total > 0 ? "positive" : "negative"}">${sign}${total}</span>`;
}

function renderModifierList(armor) {
  const modifiers = armor.modifiers ?? [];
  if (modifiers.length === 0) return `<p class="muted">没有稀有度修正记录。</p>`;
  return `
    <div class="modifier-list">
      ${modifiers
        .map((modifier) => {
          if (modifier.kind === "tag") {
            return `<span class="modifier ${modifier.tone}">标签：${modifier.tag}</span>`;
          }
          const sign = modifier.delta > 0 ? "+" : "";
          return `<span class="modifier ${modifier.tone}">${armorAttributeLabels[modifier.attribute]} ${sign}${modifier.delta}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderTagBadges(armor) {
  const tags = normalizeTags(armor.tags);
  if (tags.length === 0) return `<span class="badge">无标签</span>`;
  return tags.map((tag) => `<span class="badge tag-${tag.tone}">${tag.name}</span>`).join("");
}

function normalizeTags(tags = []) {
  return tags.map((tag) => (typeof tag === "string" ? { name: tag, tone: "neutral" } : { tone: "neutral", ...tag }));
}

function getScaleLabel(attribute, value) {
  return armorAttributeScaleLabels[attribute]?.[value] ?? String(value);
}
