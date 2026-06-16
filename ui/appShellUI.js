export function renderAppShell(root) {
  root.innerHTML = `
    <header class="topbar">
      <div>
        <p class="eyebrow">佣兵事务所 Demo</p>
        <button id="organization-name" class="organization-name" title="点击修改佣兵组织名称" type="button">Gun Core</button>
      </div>
      <div class="top-actions">
        <button id="save-game" class="ghost-button" type="button">保存</button>
        <button id="reset-game" class="danger-button" type="button">重开</button>
        <button id="advance-day" class="primary-button" type="button">推进一天</button>
      </div>
    </header>

    <nav class="tabbar" aria-label="主功能切换">
      <button class="tab-button active" data-tab-target="overview" type="button">总览</button>
      <button class="tab-button" data-tab-target="personnel" type="button">人员</button>
      <button class="tab-button" data-tab-target="missions" type="button">契约</button>
      <button class="tab-button" data-tab-target="expenses" type="button">支出</button>
      <button class="tab-button" data-tab-target="wealth" type="button">财富</button>
      <button class="tab-button" data-tab-target="facilities" type="button">基础设施</button>
      <button class="tab-button temporary-hidden" data-tab-target="mechs" type="button" hidden>机甲</button>
      <button class="tab-button" data-tab-target="warehouse" type="button">仓库</button>
    </nav>

    <aside id="global-status-drawer" class="global-status-drawer" aria-label="基地关键状态">
      <button id="global-status-toggle" class="global-status-toggle" type="button">状态</button>
      <div id="global-status-panel" class="global-status-panel" hidden>
        <div class="card-header">
          <div>
            <strong>基地关键状态</strong>
            <p class="muted">随时查看现金流和暴露风险。</p>
          </div>
          <button id="global-status-close" class="ghost-button" type="button">关闭</button>
        </div>
        <div id="global-resource-strip" class="global-resource-strip"></div>
      </div>
    </aside>

    <aside id="global-log-drawer" class="global-status-drawer global-log-drawer" aria-label="行动日志">
      <button id="global-log-toggle" class="global-status-toggle" type="button">日志</button>
      <div id="global-log-panel" class="global-status-panel global-log-panel" hidden>
        <div class="card-header">
          <div>
            <strong>行动日志</strong>
            <p class="muted">记录操作、契约结算和突发事件。</p>
          </div>
          <button id="global-log-close" class="ghost-button" type="button">关闭</button>
        </div>
        <div id="global-log-list" class="global-log-list"></div>
      </div>
    </aside>

    <main class="dashboard">
      <section class="tab-page active" data-tab-page="overview">
        <div class="overview-layout">
          <section class="panel overview-panel">
            <div class="section-heading">
              <h2>契约执行</h2>
              <span id="contract-overview-badge" class="badge">读取中</span>
            </div>
            <div id="contract-overview" class="overview-list"></div>
          </section>

          <section class="panel overview-panel">
            <div class="section-heading">
              <h2>人员状态</h2>
              <span id="personnel-overview-badge" class="badge">读取中</span>
            </div>
            <div id="personnel-overview" class="overview-list"></div>
          </section>
        </div>
      </section>

      <section class="tab-page" data-tab-page="personnel">
        <div class="tab-layout two-column">
          <section class="panel roster-panel">
            <div class="section-heading">
              <h2>佣兵名册</h2>
            </div>
            <div id="roster-list" class="card-grid"></div>
          </section>

          <section class="panel recruit-panel">
            <div class="section-heading">
              <h2>招募</h2>
              <button id="refresh-recruits" class="ghost-button" type="button">刷新</button>
            </div>
            <div id="recruit-list" class="stack"></div>
          </section>
        </div>
      </section>

      <section class="tab-page" data-tab-page="mechs">
        <section class="panel">
          <div class="section-heading">
            <h2>机甲</h2>
            <span class="badge">待设计</span>
          </div>
          <div id="mech-list" class="placeholder-grid"></div>
        </section>
      </section>

      <section class="tab-page" data-tab-page="warehouse">
        <div id="warehouse-list" class="stack"></div>
      </section>

      <section class="tab-page" data-tab-page="missions">
        <section class="panel mission-panel">
          <div class="section-heading">
            <h2>契约</h2>
            <span id="selected-count" class="badge">未选择队伍</span>
          </div>
          <div class="contract-toolbar">
            <p class="muted">公开情报只显示发布方、报酬和简报；可花费资金调查更多细节，或刷新不合适的契约。</p>
          </div>
          <div id="mission-list" class="mission-grid"></div>
        </section>
      </section>

      <section class="tab-page" data-tab-page="facilities">
        <section class="panel facility-panel">
          <div class="section-heading">
            <h2>基础设施</h2>
            <span class="badge">点开查看详情</span>
          </div>
          <div id="building-list" class="facility-grid"></div>
        </section>
      </section>

      <section class="tab-page" data-tab-page="expenses">
        <section class="panel expense-panel">
          <div class="section-heading">
            <div>
              <h2>基地支出</h2>
              <p class="muted">当前每日金钱消耗明细。外出佣兵不支付日薪，平安归来后补发。</p>
            </div>
            <span id="expense-total-badge" class="badge">0 金/天</span>
          </div>
          <div id="expense-summary-grid" class="expense-summary-grid"></div>
          <div id="expense-list" class="expense-grid"></div>
        </section>
      </section>

      <section class="tab-page" data-tab-page="wealth">
        <section class="panel wealth-panel">
          <div class="section-heading">
            <div>
              <h2>财富</h2>
              <p class="muted">把 GMS 的战争财转化成私人欲望、收藏室和体面工程。</p>
            </div>
            <span id="wealth-progress-badge" class="badge">0/0</span>
          </div>
          <div id="wealth-list" class="wealth-grid"></div>
        </section>
      </section>

    </main>

    <dialog id="mercenary-dialog" class="dialog dossier-dialog">
      <div class="dossier" id="mercenary-dossier"></div>
    </dialog>

    <dialog id="weapon-dialog" class="dialog weapon-dialog">
      <div class="dossier" id="weapon-dossier"></div>
    </dialog>

    <dialog id="armor-dialog" class="dialog weapon-dialog">
      <div class="dossier" id="armor-dossier"></div>
    </dialog>

    <dialog id="contract-dialog" class="dialog contract-dialog">
      <div class="dossier" id="contract-dossier"></div>
    </dialog>

    <dialog id="facility-dialog" class="dialog dossier-dialog">
      <div class="dossier" id="facility-dossier"></div>
    </dialog>

    <dialog id="intro-dialog" class="dialog intro-dialog">
      <div class="intro-card">
        <p class="eyebrow">GMS 接入确认</p>
        <h2>欢迎来到可控范围内</h2>
        <div class="intro-copy">
          <p>SSS 内战爆发后，所有新闻频道终于统一了口径：局势仍在可控范围内。</p>
          <p>于是粮价上涨，军火脱销，边境关门，尸体开始影响交通。</p>
          <p>你没有战斗力，不能亲自上战场。更准确地说，你从未认真考虑过亲自上战场。幸运的是，你有钱，有人脉，还有一套远程佣兵管理系统：GMS。</p>
          <p>通过 GMS，你将在 SSS 境内招募被称为 Gun 的佣兵，建立隐秘基地，接取契约，购买装备，并从战争中获得一笔体面的收入。</p>
          <p>这些 Gun 是非法入境的行动人员。为了确保他们在官方记录中继续保持“不存在”的良好状态，你需要按月缴纳隐秘费用。未支付的声望会降低隐秘值；隐秘值越低，基地越容易被找上门。</p>
        </div>
        <div class="intro-steps">
          <article>
            <strong>1. 看总览</strong>
            <span>资金、基地声望、隐秘值、日支出和人员状态会决定你今天能犯多大的错。</span>
          </article>
          <article>
            <strong>2. 招募 Gun</strong>
            <span>在人员页雇佣佣兵。便宜的人通常很便宜，贵的人通常会活着回来要求你付钱。</span>
          </article>
          <article>
            <strong>3. 调查契约</strong>
            <span>契约页只显示模糊风险。花钱调查敌方伤害、推荐武器、职业需求、人数和战力区间，再决定派谁去。</span>
          </article>
          <article>
            <strong>4. 批准支出</strong>
            <span>推进一天前需要在支出页确认开销。外出佣兵暂不支付日薪，平安归来后会一并补发。</span>
          </article>
          <article>
            <strong>5. 花掉战争财</strong>
            <span>财富页用于把 GMS 的利润变成私人收藏、体面工程和更容易入睡的借口。</span>
          </article>
        </div>
        <div class="intro-footer">
          <p class="muted">欢迎使用 GMS。愿战争早日结束，但不要太早。</p>
          <button id="intro-confirm" class="primary-button" type="button">开始经营</button>
        </div>
      </div>
    </dialog>
  `;
}
