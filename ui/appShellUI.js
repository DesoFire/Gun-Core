export function renderAppShell(root) {
  root.innerHTML = `
    <header class="topbar">
      <div>
        <p class="eyebrow">佣兵事务所短局 Demo</p>
        <h1>Gun Core</h1>
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
      <button class="tab-button" data-tab-target="schedule" type="button">日程</button>
      <button class="tab-button" data-tab-target="facilities" type="button">基础设施</button>
      <button class="tab-button temporary-hidden" data-tab-target="mechs" type="button" hidden>机甲</button>
      <button class="tab-button temporary-hidden" data-tab-target="warehouse" type="button" hidden>仓库</button>
    </nav>

    <aside id="global-resource-strip" class="global-resource-strip" aria-label="基地关键状态"></aside>

    <main class="dashboard">
      <section class="tab-page active" data-tab-page="overview">
        <div class="overview-layout">
          <section class="panel command-panel">
            <div class="section-heading">
              <div>
                <h2>局势指挥台</h2>
                <p id="objective-text" class="muted">读取目标中...</p>
              </div>
              <span id="game-status" class="badge">进行中</span>
            </div>
            <div id="command-grid" class="command-grid"></div>
            <div class="button-row">
              <button id="buy-supplies" class="ghost-button" type="button">黑市补给 36 金</button>
              <button id="reduce-heat" class="ghost-button" type="button">清理痕迹 42 金</button>
            </div>
          </section>

          <section class="panel overview-panel">
            <div class="section-heading">
              <h2>基地运营</h2>
              <span id="current-day" class="badge">第 1 天</span>
            </div>
            <div id="resource-grid" class="resource-grid"></div>
          </section>

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
              <button id="create-player" class="ghost-button" type="button">创建玩家角色</button>
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

      <section class="tab-page" data-tab-page="schedule">
        <section class="panel calendar-panel calendar-page-panel">
          <div class="section-heading">
            <h2>行动日程</h2>
            <span class="badge">按天</span>
          </div>
          <div id="calendar-list" class="calendar-list calendar-list-large"></div>
        </section>
      </section>

      <section class="panel log-panel">
        <div class="section-heading">
          <h2>行动记录</h2>
          <button id="clear-log" class="ghost-button" type="button">清空</button>
        </div>
        <div id="event-log" class="event-log"></div>
      </section>
    </main>

    <dialog id="player-dialog" class="dialog">
      <form method="dialog" id="player-form">
        <h2>创建你的代表角色</h2>
        <label>
          名字
          <input id="player-name" name="name" maxlength="16" placeholder="输入角色名" required />
        </label>
        <label>
          职业
          <select id="player-class" name="class"></select>
        </label>
        <div class="dialog-actions">
          <button class="ghost-button" value="cancel" type="submit">取消</button>
          <button class="primary-button" value="confirm" type="submit">创建</button>
        </div>
      </form>
    </dialog>

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
  `;
}
