import { getInventory } from "../modules/inventory.js";
import { renderArmorCard, renderArmorSummaryLine } from "./armorUI.js";
import { renderWeaponCard, renderWeaponSummaryLine } from "./weaponUI.js";

export function initInventoryUI() {}

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
      if (item.itemCategory === "weapon" || item.damageDice) return renderWeaponCard(item);
      if (item.itemCategory === "armor" && typeof item.armor === "number") return renderArmorCard(item);
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
  if (item.itemCategory === "weapon" || item.damageDice) return renderWeaponSummaryLine(item);
  if (item.itemCategory === "armor" && typeof item.armor === "number") return renderArmorSummaryLine(item);
  const rarity = item.rarity ? `${item.rarity}级 · ` : "";
  const quantity = item.quantity ? ` · 数量 ${item.quantity}` : "";
  return `${rarity}${item.type ?? item.itemCategory}${quantity} · ${(item.tags ?? []).join(" / ") || "无标签"}`;
}
