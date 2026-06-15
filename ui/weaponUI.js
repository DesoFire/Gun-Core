import { getInventoryItem } from "../modules/inventory.js";

export function initWeaponUI() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-weapon]");
    if (openButton) openWeaponDetail(openButton.dataset.openWeapon);
    const closeButton = event.target.closest("[data-close-weapon]");
    if (closeButton) document.querySelector("#weapon-dialog").close();
  });
}

export function renderWeaponCard(weapon) {
  return `
    <article class="weapon-card rarity-${weapon.rarity}" data-open-weapon="${weapon.id}">
      <div class="card-header">
        <div>
          <p class="card-title">${weapon.name}</p>
          <p class="muted">${renderWeaponSummaryLine(weapon)}</p>
        </div>
        <span class="badge">+${weapon.power ?? 0}</span>
      </div>
      <button class="link-button" data-open-weapon="${weapon.id}" type="button">查看武器详情</button>
    </article>
  `;
}

export function renderWeaponSummaryLine(weapon) {
  return `${weapon.rarity}级 · 战斗力 +${weapon.power ?? 0} · ${weapon.damageType ?? "未知"}伤害`;
}

function openWeaponDetail(id) {
  const weapon = getInventoryItem(id);
  if (!weapon) return;
  document.querySelector("#weapon-dossier").innerHTML = `
    <div class="dossier-top">
      <div>
        <div class="dossier-code">WEAPON / ${weapon.rarity}</div>
        <h2 class="dossier-title">${weapon.name}</h2>
        <p class="muted">${renderWeaponSummaryLine(weapon)}</p>
      </div>
      <button class="ghost-button dialog-close-button" data-close-weapon aria-label="关闭" title="关闭" type="button">关闭</button>
    </div>
    <div class="dossier-grid">
      <section class="dossier-section">
        <h3>简化属性</h3>
        <div class="field-list">
          <div class="field"><span>等级</span><strong>${weapon.rarity}</strong></div>
          <div class="field"><span>战斗力</span><strong>+${weapon.power ?? 0}</strong></div>
          <div class="field"><span>伤害类型</span><strong>${weapon.damageType ?? "未知"}</strong></div>
        </div>
      </section>
    </div>
  `;
  document.querySelector("#weapon-dialog").showModal();
}
