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

    <div class="app-layout">
      <aside class="side-nav">
        <nav class="tabbar" aria-label="主功能切换">
          <button class="tab-button active" data-tab-target="overview" type="button">总览</button>
          <button class="tab-button" data-tab-target="personnel" type="button">人员</button>
          <button class="tab-button" data-tab-target="missions" type="button">契约</button>
          <button class="tab-button" data-tab-target="situation" type="button">局势</button>
          <button class="tab-button" data-tab-target="expenses" type="button">支出</button>
          <button class="tab-button" data-tab-target="wealth" type="button">财富</button>
          <button class="tab-button" data-tab-target="facilities" type="button">基础设施</button>
          <button class="tab-button temporary-hidden" data-tab-target="mechs" type="button" hidden>机甲</button>
          <button class="tab-button" data-tab-target="warehouse" type="button">仓库</button>
          <button class="tab-button" data-tab-target="help" type="button">帮助</button>
        </nav>
      </aside>

    <button id="global-log-toggle" class="global-log-toggle" type="button" aria-controls="global-log-sidebar" aria-expanded="false">日志</button>
    <button id="base-status-toggle" class="base-status-toggle" type="button" aria-controls="base-status-sidebar" aria-expanded="false">状态</button>
    <aside id="global-log-sidebar" class="global-log-sidebar" aria-label="行动日志" hidden>
      <div class="global-log-header">
        <div>
          <strong>行动日志</strong>
          <p class="muted">记录操作、契约结算和突发事件。</p>
        </div>
        <button id="global-log-close" class="ghost-button" type="button">关闭</button>
      </div>
      <div id="global-log-list" class="global-log-list"></div>
    </aside>

    <aside id="base-status-sidebar" class="base-status-sidebar" aria-label="基地状态" hidden>
      <div class="global-log-header">
        <div>
          <strong>基地状态</strong>
          <p class="muted">随时查看基地的关键运营数据。</p>
        </div>
        <button id="base-status-close" class="ghost-button" type="button">关闭</button>
      </div>
      <div class="base-status-header">
        <strong>基地状态</strong>
        <span id="base-status-day" class="badge">第 1 天</span>
      </div>
      <div id="base-status-grid" class="base-status-grid"></div>
    </aside>

    <main class="dashboard">
      <section class="tab-page active" data-tab-page="overview">
        <button class="page-help-button" data-page-help="overview" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
        <div class="overview-layout">
          <section class="panel overview-panel">
            <div class="section-heading">
              <h2>契约执行</h2>
              <span id="mission-overview-badge" class="badge">读取中</span>
            </div>
            <div id="mission-overview" class="overview-list"></div>
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
        <button class="page-help-button" data-page-help="personnel" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
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
        <button class="page-help-button" data-page-help="mechs" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
        <section class="panel">
          <div class="section-heading">
            <h2>机甲</h2>
            <span class="badge">待设计</span>
          </div>
          <div id="mech-list" class="placeholder-grid"></div>
        </section>
      </section>

      <section class="tab-page" data-tab-page="warehouse">
        <button class="page-help-button" data-page-help="warehouse" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
        <div id="warehouse-list" class="stack"></div>
      </section>

      <section class="tab-page" data-tab-page="missions">
        <button class="page-help-button" data-page-help="missions" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
        <section class="panel mission-panel">
          <div class="section-heading">
            <h2>契约</h2>
            <span id="selected-count" class="badge">未选择队伍</span>
          </div>
          <div class="mission-toolbar">
            <p class="muted">公开情报只显示发布方、报酬和简报；可花费资金调查更多细节，或刷新不合适的契约。</p>
          </div>
          <div id="mission-list" class="mission-grid"></div>
        </section>
      </section>

      <section class="tab-page" data-tab-page="situation">
        <button class="page-help-button" data-page-help="situation" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
        <section class="panel situation-panel">
          <div class="section-heading">
            <div>
              <h2>局势</h2>
              <p class="muted">战场不是地图，是各方账本互相涂改后的样子。</p>
            </div>
            <span id="situation-badge" class="badge">读取中</span>
          </div>
          <div id="situation-map" class="situation-map"></div>
          <div id="situation-relations" class="situation-relations"></div>
        </section>
      </section>

      <section class="tab-page" data-tab-page="facilities">
        <button class="page-help-button" data-page-help="facilities" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
        <section class="panel facility-panel">
          <div class="section-heading">
            <h2>基础设施</h2>
            <span class="badge">点开查看详情</span>
          </div>
          <div id="facility-list" class="facility-grid"></div>
        </section>
      </section>

      <section class="tab-page" data-tab-page="expenses">
        <button class="page-help-button" data-page-help="expenses" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
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
        <button class="page-help-button" data-page-help="wealth" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
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


    <section class="tab-page" data-tab-page="help">
      <button class="page-help-button" data-page-help="help" aria-label="查看本页帮助" title="查看本页帮助" type="button">?</button>
      <section class="panel help-page-panel">
      <div class="global-log-header">
        <div>
          <strong>玩法帮助</strong>
          <p class="muted">GMS祝您工作顺利、身体健康。</p>
        </div>
      </div>
      <div class="help-content">
        <section class="help-section">
          <h3>核心目标</h3>
          <p>你经营一个非法入境的佣兵组织。短期目标是让资金为正、队伍能打、隐秘值别归零；长期目标是靠契约收益购买财富收藏，把内战变成私人资产负债表。</p>
        </section>
        <section class="help-section">
          <h3>每日循环</h3>
          <ol>
            <li>在人员页招募或解雇佣兵，他们是为你挣钱的工具。</li>
            <li>在契约页查看契约，花钱调查情报，再派遣合适的小队。</li>
            <li>在支出页检查工资、生活补给、装备养护、设施维持和隐秘费用。</li>
            <li>点击推进一天，确认收支简报，等待契约返回、突发事件和基地遇袭判定。</li>
          </ol>
        </section>
        <section class="help-section">
          <h3>契约与情报</h3>
          <p>契约等级由需求战力除以需求人数得到的人均战力决定，再和佣兵标准模板对比。调查情报会揭示战力区间、敌方伤害类型、推荐武器、推荐能力、需求人数和敌方机动兵器。</p>
          <p>不要只看总战力。敌方伤害类型需要防具或机动兵器防护类型抵抗；推荐武器和推荐能力会影响成功率；敌方有机动兵器而我方没有机体时，成功率和伤亡都会变难看。</p>
        </section>
        <section class="help-section">
          <h3>佣兵状态</h3>
          <p>战力先计算基础战力、技能和装备，再扣除伤势固定惩罚，最后按压力百分比折减。物理负面状态累计为伤势，心理负面状态累计为压力。</p>
          <p>医疗中心处理物理负面状态，娱乐中心处理心理负面状态。等级越高，能处理的标签点数越高，成功率也更好；每次按单个佣兵身上的单个标签收费。</p>
        </section>
        <section class="help-section">
          <h3>隐秘与遇袭</h3>
          <p>隐秘值从 100 开始，归零即失败。遇袭率等于 100 - 当前隐秘值。月初需要支付隐秘费用；未支付的个人声望和基地声望会造成隐秘压力。</p>
          <p>基地遇袭本质上是一场防守契约。防御设施会提供基地战斗力，留守佣兵会自动尝试装备仓库里的武器、防具和机动兵器。</p>
        </section>
        <section class="help-section">
          <h3>装备与机动兵器</h3>
          <p>武器提供战力和伤害类型；防具提供防护类型和死亡率降低；机动兵器只能由拥有“机师”标签的佣兵装备，提供大量战力、死亡率降低、伤害类型和防护类型。</p>
          <p>装备无论是否正在使用都要维护。黑市 C 级才解锁机动兵器购买，且常规货源等级低于黑市等级；契约掉落会在契约等级上下浮动 1 级。</p>
        </section>
        <section class="help-section">
          <h3>设施优先级</h3>
          <p>酒馆影响招募质量和刷新价格；兵营提高佣兵上限；情报室降低调查费用并压低负面随机事件权重；黑市提供装备；医疗中心和娱乐中心处理状态；防御设施增强基地防守。</p>
        </section>
        <section class="help-section">
          <h3>资金建议</h3>
          <p>负资产不会直接失败，只会限制购买；真正的失败是隐秘值归零。高声望佣兵会带来月度隐秘成本，月底解雇或清黑历史都可能是经营选择，不一定体面，但很 GMS。</p>
        </section>
      </div>
      </section>
    </section>

    </main>
    </div>

    <dialog id="mercenary-dialog" class="dialog dossier-dialog">
      <div class="dossier" id="mercenary-dossier"></div>
    </dialog>

    <dialog id="weapon-dialog" class="dialog weapon-dialog">
      <div class="dossier" id="weapon-dossier"></div>
    </dialog>

    <dialog id="armor-dialog" class="dialog weapon-dialog">
      <div class="dossier" id="armor-dossier"></div>
    </dialog>

    <dialog id="mission-dialog" class="dialog mission-dialog">
      <div class="dossier" id="mission-dossier"></div>
    </dialog>

    <dialog id="facility-dialog" class="dialog dossier-dialog">
      <div class="dossier" id="facility-dossier"></div>
    </dialog>

    <dialog id="page-help-dialog" class="dialog page-help-dialog">
      <div class="page-help-card">
        <div class="dossier-top">
          <div>
            <p id="page-help-eyebrow" class="eyebrow">PAGE BRIEF</p>
            <h2 id="page-help-title" class="dossier-title">页面说明</h2>
            <p id="page-help-summary" class="muted">等待说明。</p>
          </div>
          <button id="page-help-close" class="ghost-button dialog-close-button" aria-label="关闭" title="关闭" type="button">关闭</button>
        </div>
        <div id="page-help-content" class="page-help-content"></div>
      </div>
    </dialog>
    <dialog id="communication-dialog" class="dialog communication-dialog">
      <div class="comm-panel">
        <div class="comm-frame">
          <div class="comm-header">
            <div>
              <p id="comm-channel" class="comm-channel">CODEC / ENCRYPTED</p>
              <h2 id="comm-title" class="comm-title">加密通讯</h2>
            </div>
            <div class="comm-signal" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="comm-body">
            <aside class="comm-portrait" aria-label="通讯人物立绘区域">
              <div id="comm-portrait-image" class="comm-portrait-image">
                <div class="comm-portrait-placeholder">
                  <span id="comm-portrait-initial">?</span>
                </div>
              </div>
              <div class="comm-portrait-meta">
                <strong id="comm-speaker">UNKNOWN</strong>
                <span id="comm-speaker-role">身份未确认</span>
              </div>
            </aside>
            <section class="comm-transcript">
              <div class="comm-line-meta">
                <span id="comm-frequency">140.85</span>
                <span id="comm-security">SCRAMBLE: ON</span>
              </div>
              <p id="comm-text" class="comm-text">等待信号。</p>
              <div id="comm-choices" class="comm-choices"></div>
            </section>
          </div>
        </div>
      </div>
    </dialog>

    <dialog id="settlement-dialog" class="dialog settlement-dialog">
      <div class="settlement-card">
        <div class="dossier-top settlement-top">
          <div>
            <div class="dossier-code">CONTRACT SETTLEMENT</div>
            <h2 class="dossier-title">契约结算</h2>
            <p id="settlement-summary" class="muted">等待结算。</p>
          </div>
          <button id="settlement-close" class="ghost-button dialog-close-button" aria-label="关闭" title="关闭" type="button">关闭</button>
        </div>
        <div id="settlement-content" class="settlement-content"></div>
      </div>
    </dialog>

    <dialog id="expense-approval-dialog" class="dialog settlement-dialog">
      <div class="settlement-card">
        <div class="dossier-top settlement-top">
          <div>
            <div class="dossier-code">DAILY EXPENSE BRIEF</div>
            <h2 class="dossier-title">收支简报</h2>
            <p id="expense-approval-summary" class="muted">等待结算。</p>
          </div>
          <button id="expense-approval-close" class="ghost-button dialog-close-button" aria-label="关闭" title="关闭" type="button">关闭</button>
        </div>
        <div id="expense-approval-content" class="settlement-content"></div>
      </div>
    </dialog>
  `;
}
