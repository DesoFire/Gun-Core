import { getInventoryItem, getItemSellValue, sellInventoryItem } from "../modules/inventory.js";
import { confirmResourceSpend, showSpendFailure, showToast } from "../js/notifications.js";

export function initArmorUI() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-armor]");
    if (openButton) openArmorDetail(openButton.dataset.openArmor);
    const closeButton = event.target.closest("[data-close-armor]");
    if (closeButton) document.querySelector("#armor-dialog").close();
    const sellButton = event.target.closest("[data-sell-armor]");
    if (sellButton) handleSellArmor(sellButton.dataset.sellArmor);
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
  const sellValue = getItemSellValue(armor);
  document.querySelector("#armor-dossier").innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">ARMOR / ${armor.rarity}</div>
        <h2 class="dossier-title">${armor.name}</h2>
        <p class="muted">${renderArmorSummaryLine(armor)}</p>
      </div>
      <button class="ghost-button dialog-close-button" data-close-armor aria-label="关闭" title="关闭" type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>简化属性</h3>
        <div class="field-list">
          <div class="field"><span>等级</span><strong>${armor.rarity}</strong></div>
          <div class="field"><span>降低死亡率</span><strong>${armor.deathRiskReduction ?? 0}%</strong></div>
          <div class="field"><span>防护类型</span><strong>${armor.protectionType ?? "未知"}</strong></div>
          <div class="field"><span>回收价</span><strong>${sellValue} 金</strong></div>
        </div>
        <button class="danger-button full-width-button" data-sell-armor="${armor.id}" type="button">回收防具</button>
      </section>
    </div>
  `;
  document.querySelector("#armor-dialog").showModal();
}

function handleSellArmor(id) {
  const armor = getInventoryItem(id);
  if (!armor) return;
  const value = getItemSellValue(armor);
  if (!confirmResourceSpend(`回收防具：${armor.name}`, value, "可获得金币")) return;
  const result = sellInventoryItem(id);
  if (!result.ok) {
    showSpendFailure("回收防具", "回收没有完成。");
    return;
  }
  document.querySelector("#armor-dialog").close();
  showToast(`回收完成：获得 ${result.value} 金。`, "good");
}
