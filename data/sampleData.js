export const equipmentSlots = {
  head: "头部",
  chest: "胸部",
  back: "背部",
  leftHand: "左手",
  rightHand: "右手",
  waist: "腰挂",
};

export const characterClasses = {
  vanguard: {
    name: "先锋",
    tags: ["战斗", "守卫"],
    stats: { might: 7, agility: 4, wits: 3, resolve: 6 },
    maxHp: 34,
  },
  scout: {
    name: "斥候",
    tags: ["侦察", "潜入"],
    stats: { might: 4, agility: 7, wits: 5, resolve: 4 },
    maxHp: 26,
  },
  medic: {
    name: "医师",
    tags: ["医疗", "支援"],
    stats: { might: 3, agility: 4, wits: 7, resolve: 6 },
    maxHp: 24,
  },
  scholar: {
    name: "学者",
    tags: ["调查", "神秘"],
    stats: { might: 2, agility: 4, wits: 8, resolve: 6 },
    maxHp: 22,
  },
};

export const buildings = {
  tavern: { name: "酒馆", description: "提高招募池规模。", cost: 70, upkeep: 5, unlockCost: 70 },
  blackMarket: { name: "黑市", description: "花钱购买当前评级的补给、武器、防具和机甲。", cost: 95, upkeep: 6, unlockCost: 95 },
  hospital: { name: "医院", description: "花钱治疗受伤或高压佣兵。", cost: 110, upkeep: 9, unlockCost: 110 },
  infirmary: { name: "医务室", description: "每日降低受伤佣兵的压力。", cost: 80, upkeep: 7, unlockCost: 80 },
  intel: { name: "情报室", description: "提高契约成功率。", cost: 90, upkeep: 8, unlockCost: 90 },
};

export const facilityRanks = ["F", "E", "D", "C", "B", "A", "S"];

export const facilityUpgradeRequirements = [
  { rank: "F", reputation: 0, day: 1 },
  { rank: "E", reputation: 5, day: 2 },
  { rank: "D", reputation: 12, day: 4 },
  { rank: "C", reputation: 22, day: 7 },
  { rank: "B", reputation: 34, day: 10 },
  { rank: "A", reputation: 48, day: 14 },
  { rank: "S", reputation: 60, day: 18 },
];

export const blackMarketSupplyPool = [
  { name: "压缩饮水包", type: "水", tags: ["补给", "生存"], note: "口感像塑料管道里的雨，但至少能喝。" },
  { name: "高热量糊砖", type: "食物", tags: ["补给", "生存"], note: "三口一顿，五顿开始怀疑人生。" },
  { name: "旧式战术背包", type: "背包", tags: ["支援", "生存"], note: "带血迹的地方已经礼貌性洗过。" },
  { name: "战利品封装箱", type: "战利品", tags: ["交易", "黑市"], note: "内容不保证合法，但保证有人愿意收。" },
  { name: "一次性滤水芯", type: "杂物", tags: ["补给"], note: "能过滤水，也能过滤一部分乐观。" },
];

export const armorPool = [
  { name: "拼接防弹胸甲", slot: "chest", type: "护具", tags: ["守卫"], note: "由三种标准和一种误会拼成。" },
  { name: "陶瓷插板背心", slot: "chest", type: "护具", tags: ["战斗"], note: "正面抗得住，侧面看运气。" },
  { name: "封闭式防暴头盔", slot: "head", type: "护具", tags: ["守卫"], note: "视野变窄，胆子变大。" },
  { name: "轻型外骨骼腰挂", slot: "waist", type: "装备", tags: ["支援"], note: "降低搬运时骂人的频率。" },
  { name: "折叠复合盾", slot: "leftHand", type: "装备", tags: ["守卫"], note: "展开速度取决于使用者的求生欲。" },
];

export const mechaFrames = [
  { name: "矿区搬运改机", role: "工程", tags: ["支援", "生存"], note: "原本用于搬矿，现在偶尔搬敌人。" },
  { name: "轻型侦察机体", role: "侦察", tags: ["侦察", "潜入"], note: "跑得快，装甲薄，账单很诚实。" },
  { name: "旧军规突击骨架", role: "突击", tags: ["战斗", "守卫"], note: "退役原因被黑市卖家略过了。" },
  { name: "移动医疗舱", role: "医疗", tags: ["医疗", "支援"], note: "能救命，也能制造非常昂贵的安慰。" },
];

export const missionTemplates = [
  { name: "护送补给车", tags: ["战斗", "守卫"], difficulty: 2, duration: 2, reward: { gold: 55, reputation: 8 } },
  { name: "调查废弃矿井", tags: ["调查", "神秘"], difficulty: 3, duration: 3, reward: { gold: 75, reputation: 12 } },
  { name: "追踪失踪信使", tags: ["侦察", "潜入"], difficulty: 2, duration: 2, reward: { gold: 50, reputation: 10 } },
  { name: "清理边境诊所", tags: ["医疗", "支援"], difficulty: 2, duration: 1, reward: { gold: 40, reputation: 7 } },
  { name: "突袭走私仓库", tags: ["战斗", "潜入"], difficulty: 4, duration: 3, reward: { gold: 110, reputation: 16 } },
];

export const contractIssuers = ["SSS", "FOF自由邦联"];

export const otherContractIssuers = [
  "未知信号",
  "流亡组织",
  "割据武装",
  "企业财团",
  "科研机构",
  "运输公司",
  "采矿集团",
  "安保公司",
  "新闻媒体",
  "地方政府",
  "纯净社区",
  "黑市商会",
  "佣兵工会",
  "个人委托",
  "突发事件",
  "天人残余",
  "响马强人",
  "天人残余",
  "天人残余",
  "天人残余",
];

export const contractTypes = [
  { name: "护送", code: "Escort", actionType: "combat", tags: ["守卫", "生存"], verbs: ["护送", "掩护"] },
  { name: "运输", code: "Transport", actionType: "logistics", tags: ["守卫", "支援"], verbs: ["转运", "押运"] },
  { name: "侦察", code: "Recon", actionType: "logistics", tags: ["侦察", "潜入"], verbs: ["侦察", "标记"] },
  { name: "搜索", code: "Search", actionType: "logistics", tags: ["调查", "侦察"], verbs: ["搜索", "定位"] },
  { name: "回收", code: "Recovery", actionType: "logistics", tags: ["调查", "生存"], verbs: ["回收", "封存"] },
  { name: "歼灭", code: "Hunt", actionType: "combat", tags: ["战斗", "守卫"], verbs: ["清剿", "猎杀"] },
  { name: "突袭", code: "Raid", actionType: "combat", tags: ["战斗", "潜入"], verbs: ["突袭", "夺取"] },
  { name: "破坏", code: "Sabotage", actionType: "combat", tags: ["潜入", "调查"], verbs: ["破坏", "瘫痪"] },
  { name: "营救", code: "Extraction", actionType: "logistics", tags: ["医疗", "支援"], verbs: ["营救", "撤离"] },
  { name: "防御", code: "Defense", actionType: "combat", tags: ["战斗", "守卫"], verbs: ["防御", "固守"] },
  { name: "占领", code: "Occupation", actionType: "combat", tags: ["战斗", "支援"], verbs: ["占领", "接管"] },
  { name: "特殊", code: "Special", actionType: "logistics", tags: ["神秘", "调查"], verbs: ["接触", "处理"] },
];

export const mercenaryRanks = ["无", "F", "E", "D", "C", "B", "A", "S"];

export const promotionChances = {
  "无": 60,
  F: 50,
  E: 40,
  D: 30,
  C: 20,
  B: 10,
  A: 5,
  S: 0,
};

export const positiveTraits = {
  combat: [
    { name: "交叉火力", description: "更擅长在混战中寻找射界。", tags: ["战斗"] },
    { name: "近距压制", description: "贴近目标时更稳定。", tags: ["战斗", "守卫"] },
    { name: "撤离本能", description: "知道什么时候该拖着队友离开火线。", tags: ["生存"] },
    { name: "破门专家", description: "对突袭、破坏类行动更有经验。", tags: ["战斗", "潜入"] },
    { name: "战地胆识", description: "枪声越近，手越稳。", tags: ["守卫"] },
  ],
  logistics: [
    { name: "路线规划", description: "能提前发现更省补给的行进路线。", tags: ["支援"] },
    { name: "情报洁癖", description: "会反复核对来源和时间戳。", tags: ["调查"] },
    { name: "灰市谈判", description: "懂得如何让中间人多吐出一点真话。", tags: ["支援"] },
    { name: "静默行动", description: "擅长让行动少留下可追踪痕迹。", tags: ["潜入"] },
    { name: "现场分拣", description: "知道哪些物资值得带回基地。", tags: ["生存"] },
  ],
};

export const contractIntelFields = [
  { key: "enemy", label: "预计敌人" },
  { key: "location", label: "行动区域" },
  { key: "target", label: "目标详情" },
  { key: "timeLimit", label: "时限" },
  { key: "specialRisk", label: "特殊风险" },
];

export const contractIntelPool = {
  enemy: ["地方武装小队", "黑市雇佣枪手", "异源兽群", "失控安保机兵", "身份不明的第三方小队"],
  location: ["废弃矿井外环", "盐碱高速补给线", "旧城区地下站", "低轨坠落带", "边境诊所防线"],
  target: ["带有旧联邦封条的货箱", "失联信使的终端", "被劫持的技术员", "异常广播源", "客户拒绝公开的样本"],
  timeLimit: ["24小时内窗口关闭", "两天后目标转移", "夜间行动风险降低", "雨季前必须完成", "发布方随时可能撤约"],
  specialRisk: ["情报来源未核验", "可能遭遇伏击", "客户隐瞒了竞争委托", "撤离点不稳定", "目标具有污染风险"],
};

export const contractHiddenTwists = [
  "情报错误：目标规模比公开简报更大。",
  "第三方介入：另一支小队试图截胡。",
  "伏击：撤离路线被提前布置火力点。",
  "客户欺骗：发布方隐瞒了真实目标。",
  "隐藏奖励：目标现场存在额外可回收物资。",
  "目标背叛：被营救或护送对象临时变更立场。",
];

export const contractBriefFragments = [
  "发布方只愿意支付定金，细节被拆成几段加密简报。",
  "这份契约来得太快，像是有人在掩盖另一件事。",
  "公开说明干净得过分，反而让老佣兵觉得不舒服。",
  "客户承诺报销损耗，但没有说明损耗的定义。",
  "中间人强调不要追问来源，也不要把问题带回基地。",
];

export const sampleItems = [
  { id: "item-helmet-1", name: "过期防暴头盔", slot: "head", type: "护具", tags: ["守卫"], note: "生产批次已被召回，召回原因被重新分类。" },
  { id: "item-vest-1", name: "复合胸甲", slot: "chest", type: "护具", tags: ["战斗"], note: "能挡住大多数合理报价以内的弹药。" },
  { id: "item-pack-1", name: "战地背包", slot: "back", type: "支援", tags: ["生存"], note: "塞得下补给、赃物和一份不完整的撤离计划。" },
  { id: "item-rifle-1", name: "短管自动步枪", slot: "rightHand", type: "武器", tags: ["战斗"], note: "序列号经过礼貌性擦除。" },
  { id: "item-shield-1", name: "折叠防盾", slot: "leftHand", type: "装备", tags: ["守卫"], note: "折叠后像公文包，展开后像事故报告。" },
  { id: "item-medkit-1", name: "灰市医疗包", slot: "waist", type: "消耗支援", tags: ["医疗"], note: "标签写着民用。里面没有任何民用内容。" },
];

export const names = ["林烬", "邵岚", "维克", "阿黛", "秦砾", "诺拉", "赫森", "陆鸦", "米娅", "石泉"];
export const callsigns = ["灰刃", "短灯", "冷针", "旧钟", "黑箱", "铁账", "雾眼", "赤线"];
export const genders = ["未申报", "男", "女", "字段冲突", "档案损坏"];
export const personalities = ["谨慎", "冲动", "冷漠", "合群但只在付款后", "习惯性乐观", "对表格有敌意"];
export const origins = ["第七军区难民带", "旧联邦轨道港", "北境农业安置区", "沿海自治废墟", "矩阵断线城区", "军工企业附属镇"];
export const fears = ["被正式承认存在", "账单准时抵达", "干净的医院", "没有枪声的夜晚", "被老雇主记住真名", "系统弹出实名校验"];
export const creeds = [
  "合同之外不主动开枪，除非对方也懂合同。",
  "只要佣金到账，道德可以稍后同步。",
  "身份是租来的，命暂时还是自己的。",
  "别相信口头撤离点。",
  "能活着报销就是胜利。",
];
export const lastWords = [
  "请把我的欠款标成争议账目。",
  "我申请重新分类为设备损耗。",
  "告诉工会，我这次确实出勤了。",
  "别用真名写战损报告。",
  "如果赔偿太低，就说我从未存在。",
];
