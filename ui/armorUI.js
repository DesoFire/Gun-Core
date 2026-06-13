import { getInventoryItem } from "../modules/inventory.js";

export function initArmorUI() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-armor]");
    if (openButton) openArmorDetail(openButton.dataset.openArmor);
    const closeButton = event.target.closest("[data-close-armor]");
    if (closeButton) document.querySelector("#armor-dialog").close();
  });
}

export function renderArmorCard(armor) {
  return `
    <article class="weapon-card rarity-${armor.rarity}" data-open-armor="${armor.id}">
      <div class="card-header">
        <div>
          <p class="card-title">${armor.name}</p>
          <p class="muted">${renderArmorSummaryLine(armor)}</p>
        </div>
        <span class="badge">-${armor.deathRiskReduction ?? 0}%</span>
      </div>
      <button class="link-button" data-open-armor="${armor.id}" type="button">查看防具详情</button>
    </article>
  `;
}

export function renderArmorSummaryLine(armor) {
  return `${armor.rarity}级 · 死亡率 -${armor.deathRiskReduction ?? 0}% · ${armor.protectionType ?? "未知"}防护`;
}

function openArmorDetail(id) {
  const armor = getInventoryItem(id);
  if (!armor) return;
  document.querySelector("#armor-dossier").innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">ARMOR / ${armor.rarity}</div>
        <h2 class="dossier-title">${armor.name}</h2>
        <p class="muted">${renderArmorSummaryLine(armor)}</p>
      </div>
      <button class="ghost-button" data-close-armor type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>简化属性</h3>
        <div class="field-list">
          <div class="field"><span>等级</span><strong>${armor.rarity}</strong></div>
          <div class="field"><span>降低死亡率</span><strong>${armor.deathRiskReduction ?? 0}%</strong></div>
          <div class="field"><span>防护类型</span><strong>${armor.protectionType ?? "未知"}</strong></div>
        </div>
      </section>
    </div>
  `;
  document.querySelector("#armor-dialog").showModal();
}
