import { getMechs } from "../modules/mecha.js";

export function initMechaUI() {}

export function renderMechaUI() {
  const container = document.querySelector("#mech-list");
  const mechs = getMechs();
  if (mechs.length === 0) {
    container.innerHTML = `
      <article class="placeholder-card">
        <p class="card-title">机体登记册</p>
        <p class="muted">后续用于显示机甲型号、状态、武装配置、同步率、维修费用和驾驶员适配。</p>
      </article>
      <article class="placeholder-card">
        <p class="card-title">设计占位</p>
        <p class="muted">当前任务结算暂未要求机甲。下一阶段可以先做“机甲提供任务标签与维护压力”。</p>
      </article>
    `;
    return;
  }
  container.innerHTML = mechs
    .map(
      (mech) => `
        <article class="card">
          <div class="card-header">
            <div>
              <p class="card-title">${mech.name}</p>
              <p class="muted">${mech.rarity ?? "未知"}级 · ${mech.role ?? "通用"} · 维护费 ${mech.maintenance ?? 0} 金/天</p>
            </div>
            <span class="badge">${mech.condition ?? 100}%</span>
          </div>
          <p class="muted">${(mech.tags ?? []).join(" / ") || "无标签"}</p>
          <p class="muted">${mech.note ?? "暂无机体备注。"}</p>
        </article>
      `
    )
    .join("");
}
