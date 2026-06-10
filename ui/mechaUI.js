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
  }
}
