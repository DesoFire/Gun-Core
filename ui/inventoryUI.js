import { getInventory } from "../modules/inventory.js";
import { getInventoryItem, getItemSellValue, sellInventoryItem } from "../modules/inventory.js";
import { confirmResourceSpend, showSpendFailure, showToast } from "../js/notifications.js";
import { renderArmorCard, renderArmorSummaryLine } from "./armorUI.js";
import { renderWeaponCard, renderWeaponSummaryLine } from "./weaponUI.js";

export function initInventoryUI() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-mecha]");
    if (openButton) openMechaDetail(openButton.dataset.openMecha);
    const closeButton = event.target.closest("[data-close-mecha]");
    if (closeButton) document.querySelector("#mecha-dialog")?.close();
    const sellButton = event.target.closest("[data-sell-mecha]");
    if (sellButton) handleSellMecha(sellButton.dataset.sellMecha);
  });
}

export function renderInventoryUI() {
  const container = document.querySelector("#warehouse-list");
  const inventory = getInventory();
  container.innerHTML = `
    <section class="panel">
      <div class="section-heading">
        <h2>库存清单</h2>
        <span class="badge">${inventory.length} 件</span>
      </div>
      <div class="placeholder-grid">${renderInventoryItems(inventory)}</div>
    </section>
  `;
}

function renderInventoryItems(inventory) {
  if (inventory.length === 0) {
    return `
      <article class="placeholder-card">
        <p class="card-title">仓库为空</p>
        <p class="muted">人物装备界面卸下装备后，会回到这里。</p>
      </article>
    `;
  }

  return inventory
    .map((item) => {
      if (item.itemCategory === "weapon" || item.slot === "weapon") return renderWeaponCard(item);
      if (item.itemCategory === "armor" || item.slot === "armor") return renderArmorCard(item);
      if (item.itemCategory === "mecha" || item.slot === "mecha") return renderMechaCard(item);
      const tags = (item.tags ?? []).join(" / ") || "无标签";
      const rarity = item.rarity ? `${item.rarity}级 · ` : "";
      const quantity = item.quantity ? ` · 数量 ${item.quantity}` : "";
      return `
        <article class="card">
          <div class="card-header">
            <div>
              <p class="card-title">${item.name}</p>
              <p class="muted">${rarity}${item.type ?? item.itemCategory}${quantity} · ${tags}</p>
            </div>
          </div>
          <p class="muted">${item.note}</p>
        </article>
      `;
    })
    .join("");
}

export function renderInventoryItemSummary(item) {
  if (item.itemCategory === "weapon" || item.slot === "weapon") return renderWeaponSummaryLine(item);
  if (item.itemCategory === "armor" || item.slot === "armor") return renderArmorSummaryLine(item);
  if (item.itemCategory === "mecha" || item.slot === "mecha") return renderMechaSummaryLine(item);
  const rarity = item.rarity ? `${item.rarity}级 · ` : "";
  const quantity = item.quantity ? ` · 数量 ${item.quantity}` : "";
  return `${rarity}${item.type ?? item.itemCategory}${quantity} · ${(item.tags ?? []).join(" / ") || "无标签"}`;
}

function renderMechaCard(item) {
  return `
    <article class="weapon-card rarity-${item.rarity}" data-open-mecha="${item.id}">
      <div class="card-header">
        <div>
          <p class="card-title">${item.name}</p>
          <p class="muted">${renderMechaSummaryLine(item)}</p>
        </div>
        <span class="badge">+${item.power ?? 0}</span>
      </div>
      <p class="muted">${item.note ?? "黑市拒绝提供完整维修记录。"}</p>
      <button class="link-button" data-open-mecha="${item.id}" type="button">查看机动兵器详情</button>
    </article>
  `;
}

function renderMechaSummaryLine(item) {
  return `${item.rarity}级 · 战斗力 +${item.power ?? 0} · 死亡率 -${item.deathRiskReduction ?? 0}% · ${item.role ?? "通用"}`;
}

function openMechaDetail(id) {
  const mecha = getInventoryItem(id);
  if (!mecha) return;
  const dialog = document.querySelector("#mecha-dialog");
  if (!dialog) return;
  const sellValue = getItemSellValue(mecha);
  dialog.innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">MOBILE WEAPON / ${mecha.rarity}</div>
        <h2 class="dossier-title">${mecha.name}</h2>
        <p class="muted">${renderMechaSummaryLine(mecha)}</p>
      </div>
      <button class="ghost-button dialog-close-button" data-close-mecha aria-label="关闭" title="关闭" type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>简化属性</h3>
        <div class="field-list">
          <div class="field"><span>等级</span><strong>${mecha.rarity}</strong></div>
          <div class="field"><span>战斗力</span><strong>+${mecha.power ?? 0}</strong></div>
          <div class="field"><span>降低死亡率</span><strong>${mecha.deathRiskReduction ?? 0}%</strong></div>
          <div class="field"><span>维护费</span><strong>${mecha.maintenance ?? 0} 金/天</strong></div>
          <div class="field"><span>回收价</span><strong>${sellValue} 金</strong></div>
        </div>
        <p class="muted">${mecha.note ?? "黑市拒绝提供完整维修记录。"}</p>
        <button class="danger-button full-width-button" data-sell-mecha="${mecha.id}" type="button">回收机动兵器</button>
      </section>
    </div>
  `;
  dialog.showModal();
}

function handleSellMecha(id) {
  const mecha = getInventoryItem(id);
  if (!mecha) return;
  const value = getItemSellValue(mecha);
  if (!confirmResourceSpend(`回收机动兵器：${mecha.name}`, value, "可获得金币")) return;
  const result = sellInventoryItem(id);
  if (!result.ok) {
    showSpendFailure("回收机动兵器", "回收没有完成。");
    return;
  }
  document.querySelector("#mecha-dialog")?.close();
  showToast(`回收完成：获得 ${result.value} 金。`, "good");
}
