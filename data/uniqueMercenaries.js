// Gun-Core 独特佣兵配置
// ------------------------------------------------------------
// 这个文件用于手写独一无二的佣兵。后续接入招募池时，逻辑代码可以读取
// uniqueMercenaryConfigs，根据 appearance 条件决定这些角色是否混入候选池。
//
// 设计约定：
// - id：稳定唯一 ID。不要改已有角色的 id，否则存档和出现记录无法对应。
// - enabled：是否启用。草稿角色可以先设为 false。
// - unique：固定为 true，表示同一存档中只应出现一次。
// - appearance：出现条件。当前先作为数据约定，后续接入逻辑时读取。
// - template：佣兵本体数据，字段尽量对齐普通佣兵。
//
// appearance 字段建议：
// - mode："recruitPool" 表示混入招募池；"event" 表示后续由事件加入。
// - weight：混入候选池时的权重。数值越高越容易出现。
// - minDay / maxDay：允许出现的日期范围。
// - minReputation：基地声望最低要求。
// - requiredLockedRoute：需要已锁定路线，例如 "SSS" / "FOF" / "rust" / "heaven"。
// - blockedLockedRoutes：这些路线锁定后不出现。
// - requiredFlags / blockedFlags：预留给事件旗标。
// - notes：给编辑者看的说明，不参与逻辑。
//
// template 常用字段：
// - name / callsign：姓名与外号。
// - rank："无" / "F" / "E" / "D" / "C" / "B" / "A" / "S"。
// - combatPower：基础战力，不含装备、伤势和压力修正。
// - personalReputation：个人声望，会影响隐秘成本。
// - bounty / debt / signingMultiplier：悬赏、欠债、签约费倍率。
// - skills：技能列表。id 建议使用 data/trainingPools.js 里的技能 ID。
// - conditions：初始负面状态，可为空数组。
// - dossier：人物档案文本。
// - story：独特佣兵专用文本，当前只作为配置保留，后续可显示到人物卡或事件里。

export const uniqueMercenaryConfigs = [
  {
    id: "unique-nia-ash-survey",
    enabled: true,
    unique: true,
    appearance: {
      mode: "recruitPool",
      weight: 6,
      minDay: 1,
      minReputation: 0,
      blockedLockedRoutes: ["heaven"],
      notes: "早期可出现的情报/生存型独特佣兵。公开接受天人残余后不再出现。",
    },
    template: {
      name: "Nia Ash",
      callsign: "灰线",
      rank: "E",
      combatPower: 36,
      personalReputation: 2,
      bounty: 180,
      debt: 45,
      signingMultiplier: 2,
      status: "待命",
      dossier: {
        gender: "女",
        age: 31,
        origin: "红区边境测绘队",
        personality: "冷静、厌恶即兴发挥",
        fear: "地图上没有标注的白色区域",
        creed: "能撤离的路线才算路线。",
        lastWords: "别按导航走，导航已经被买过一次了。",
      },
      skills: [
        {
          id: "intel-route",
          name: "路线规划",
          tags: ["情报", "潜入"],
          description: "用于标记路线、撤离点与盲区规划。",
        },
        {
          id: "surv-after-review",
          name: "战后复盘",
          tags: ["生存", "情报"],
          description: "用于标记战后问题复盘。",
        },
        {
          id: "common-low-profile",
          name: "低存在感",
          tags: ["通用", "隐秘"],
          description: "用于标记不容易被记录。",
        },
      ],
      conditions: [],
      equipment: {
        weapon: null,
        armor: null,
        mecha: null,
      },
      missionRecord: { completed: 0, failed: 0, survived: 0 },
      story: {
        shortHook: "前测绘队员，能在失效地图里找撤离路线。",
        recruitText: "她带来的不是地图，而是一套关于地图为什么会撒谎的经验。",
        hiddenNote: "曾为 SSS 与 FOF 都标过线，因此她更害怕没有线的地方。",
      },
    },
  },
];

export function getEnabledUniqueMercenaryConfigs() {
  return uniqueMercenaryConfigs.filter((config) => config.enabled !== false);
}