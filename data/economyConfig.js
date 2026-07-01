// Gun Core 经济参数总表
// ------------------------------------------------------------
// 这个文件既是“数值设计文档”，也是游戏实际读取的配置。
// 调整经济逻辑时，优先修改这里的数字；除非要新增机制，否则尽量不要去模块里找硬编码。
//
// 设计口径：
// - 金钱：基地现金，也是所有支出、收益、私人财富消费的统一货币。
// - 补给：抽象的日常消耗物资。每日按佣兵等级消耗，可在支出界面批量购买囤积。
// - 隐秘值：身份暴露程度。主要由每月隐秘费、未支付声望和少量特殊事件影响，隐秘值归零则失败。
// - 声望：分为基地声望与佣兵个人声望。基地声望决定契约级别；个人声望用于隐秘费与角色履历。

export const economyConfig = {
  initialState: {
    // 新开局资金。过低会导致玩家无法承担前几天试错，过高会让支出压力变钝。
    gold: 300,
    // 新开局隐秘值。隐秘值归零会直接失败。
    stealth: 100,
  },

  missions: {
    missionBoard: {
      // 初始/常驻契约面板上限。可接契约过期后会被新契约替代，保持该数量。
      availableLimit: 3,
    },
    advancePaymentRates: {
      // 接取契约时立刻获得预付款。这里配置的是“占总金钱报酬的随机比例区间”。
      // 预付款会从成功结算尾款中扣除，不额外放大总收益。
      Escort: [0.25, 0.45],
      Transport: [0.35, 0.6],
      Recon: [0.15, 0.3],
      Search: [0.15, 0.35],
      Recovery: [0.2, 0.45],
      Hunt: [0.1, 0.25],
      Raid: [0.1, 0.3],
      Sabotage: [0.2, 0.4],
      Extraction: [0.25, 0.5],
      Defense: [0.3, 0.55],
      Occupation: [0.2, 0.4],
      Special: [0.05, 0.25],
      fallback: [0.2, 0.4],
    },
    reward: {
      // 契约基础金钱奖励：baseGold + difficulty * random(goldPerDifficultyMin, goldPerDifficultyMax)。
      baseGold: 105,
      goldPerDifficultyMin: 48,
      goldPerDifficultyMax: 72,
      // 契约基础声望池：max(minReputation, difficulty * reputationPerDifficulty + random(reputationRandomMin, reputationRandomMax))。
      minReputation: 5,
      reputationPerDifficulty: 3,
      reputationRandomMin: 0,
      reputationRandomMax: 5,
    },
    loot: {
      // 契约成功与基地防守成功后的战斗掉落概率。掉落装备等级会在契约等级上下浮动 1 级。
      baseChance: 25,
      // 契约难度每提高 1 级，额外增加的掉落概率。
      perDifficulty: 3,
      // 常规掉落池：未确认敌方机动兵器时，只掉武器或防具。
      weaponChance: 50,
      armorChance: 50,
      // 机动兵器掉落池：只有情报确认敌方存在机动兵器时才启用。
      mechaChanceWhenEnemyMecha: 10,
      armorChanceWhenEnemyMecha: 45,
      weaponChanceWhenEnemyMecha: 45,
    },
    mechaThreat: {
      // 敌方机动兵器出现率。按契约难度读取，下标 0 不使用，1=F级低难，8=S级高难。
      enemyPresenceChanceByDifficulty: [0, 4, 8, 14, 22, 32, 45, 58, 72],
      // 敌方有机动兵器，而我方没有出动机动兵器时，直接扣减成功率。
      noFriendlyMechaChancePenalty: 30,
      // 同一情况下，额外提高死亡率与物理伤病概率。
      noFriendlyMechaDeathRiskPenalty: 14,
      noFriendlyMechaWoundRiskPenalty: 26,
    },
    reputationFailure: {
      // 契约失败时每个实体扣除的声望：floor(successReputation * rate / (teamSize + 1))。
      // 这里按“单体扣除 * (n+1) < 成功声望池”设计，避免一次失败扣掉超过成功收益的总声望。
      // minLoss 让低级契约失败也有代价；maxRate 必须小于 1。
      maxRate: 0.55,
      minLoss: 1,
    },
    requirement: {
      // 契约真实战斗力需求：basePower + difficulty * random(powerPerDifficultyMin, powerPerDifficultyMax)
      // + floor(baseReputation / reputationStep) * reputationPressure + random(randomOffsetMin, randomOffsetMax)。
      basePower: 18,
      powerPerDifficultyMin: 8,
      powerPerDifficultyMax: 12,
      reputationStep: 10,
      reputationPressure: 3,
      randomOffsetMin: -5,
      randomOffsetMax: 8,
    },
    difficulty: {
      // 可刷新契约的基础难度：random(baseMin, baseMax) + floor(baseReputation / reputationTierStep)，再限制到 min/max。
      min: 1,
      max: 8,
      baseMin: 1,
      baseMax: 3,
      reputationTierStep: 15,
    },
    costs: {
      // 刷新契约费用：refreshBase + difficulty * refreshPerDifficulty。
      refreshBase: 12,
      refreshPerDifficulty: 4,
      // 调查费用：每份契约生成时按契约总金钱报酬 * random(investigationRewardRateMin, investigationRewardRateMax) 固定。
      investigationRewardRateMin: 0.1,
      investigationRewardRateMax: 0.2,
      // 每份情报的最低费用，避免低报酬契约调查费过低。
      investigationMinCost: 8,
      // 随机调查更便宜；战力区间细化介于随机和定向之间。
      randomInvestigationMultiplier: 0.65,
      powerInvestigationMultiplier: 0.85,
      // 情报室等折扣最多减免 40%，避免调查完全免费。
      maxInvestigationDiscount: 0.4,
    },
    display: {
      // 战斗力需求区间的模糊程度。调查等级 0-3 分别使用这里的扩散值。
      powerIntelSpreads: [28, 18, 10, 4],
      // 外部风险标签的粗略估算，不读取实际小队配置。
      roughRiskBase: 104,
      roughRiskDifficultyPenalty: 11,
      roughRiskDurationPenalty: 3,
      roughRiskMin: 18,
      roughRiskMax: 92,
    },
    hiddenTwists: {
      // 隐藏事件带来的额外金钱/隐秘值变化。调查足够多时使用 mitigated 数值。
      // weights 控制各类突发事件出现权重。会降低隐秘的事件权重较低，让隐秘值主要由月费和未支付声望驱动。
      weights: {
        "情报错误：目标规模比公开简报更大。": 1,
        "第三方介入：另一支小队试图截胡。": 0.12,
        "伏击：撤离路线被提前布置火力点。": 1,
        "客户欺骗：发布方隐瞒了真实目标。": 0.12,
        "隐藏奖励：目标现场存在额外可回收物资。": 1,
        "目标背叛：被营救或护送对象临时变更立场。": 1,
      },
      thirdPartyGoldLoss: 16,
      thirdPartyGoldLossMitigated: 6,
      thirdPartyStealthLoss: 4,
      thirdPartyStealthLossMitigated: 1,
      clientFraudStealthLoss: 6,
      clientFraudStealthLossMitigated: 2,
      hiddenBonusGold: 14,
      hiddenBonusGoldMitigated: 24,
      // 契约执行随机事件基础触发率。一次契约可能触发多次，每次独立判定。
      randomEventChance: 55,
      // 根据契约难度决定最多触发几次随机事件：1-2 级最多 1 次，3-5 级最多 2 次，6-S 级最多 3 次。
      randomEventRollsByDifficulty: [
        { maxDifficulty: 2, rolls: 1 },
        { maxDifficulty: 5, rolls: 2 },
        { maxDifficulty: 8, rolls: 3 },
      ],
      // 高等级契约会略微提高每次事件判定概率。
      randomEventChancePerDifficulty: 3,
      // 情报室每级降低契约负面随机事件权重。F 级开始生效。
      negativeEventWeightReductionPerIntelLevel: 0.12,
      // 负面事件权重最低保留比例，避免高等级情报室完全消除事故。
      negativeEventMinWeightMultiplier: 0.25,
    },
  },

  dailyExpenses: {
    // 基地固定开销。无论有没有佣兵都会支付。
    baseUpkeep: 10,
    wages: {
      // 佣兵基础日薪按评级走从 1, 2 开始的斐波那契：无=1，F=2，E=3，D=5，C=8，B=13，A=21，S=34。
      rankDailyWage: [1, 2, 3, 5, 8, 13, 21, 34],
      // 佣兵日薪：当前只由评级决定；个人声望不额外提高日薪。
      base: 3,
      perRank: 2,
      perPersonalReputation: 0,
      playerBonus: 0,
    },
    livingSupplies: {
      // 每名未阵亡佣兵每日生活补给费用。按评级走从 1, 2 开始的斐波那契：
      // 无=1，F=2，E=3，D=5，C=8，B=13，A=21，S=34。
      rankDailySupply: [1, 2, 3, 5, 8, 13, 21, 34],
      // 生活补给不再作为库存资源购买，直接在每日支出中按 1 份=1 金自动结算。
      costPerSupply: 1,
    },
    equipmentMaintenance: {
      // 武器/防具养护费：base + rankIndex * perRank。机动兵器按常规装备维护费的倍数计算。
      weaponBase: 2,
      armorBase: 1,
      mechaBase: 20,
      perRank: 2,
      mechaMultiplier: 2,
    },
    debtRelief: {
      // 第一次日常结算把资金扣成负数时，给玩家一次黑色幽默式救济。
      compensationGold: 100,
    },
  },

  secrecy: {
    // 隐秘费用每 30 天结算一次。第 1 天不收，第 31/61/91...天触发。
    billingCycleDays: 30,
    firstBillingDay: 31,
    // 佣兵每 1 点个人声望，每月需要支付 1 金隐秘费。
    mercenaryMonthlyCostPerReputation: 1,
    // 基地每 1 点基地声望，每月需要支付 2 金隐秘费。
    baseMonthlyCostPerReputation: 2,
    // 未支付隐秘费时，每 1 点未支付声望永久累计，并立即降低 1 点隐秘值。
    stealthLossPerUnpaidReputation: 1,
    // 紧急隐蔽：随时花钱购买一点生存空间。不会超过 100 隐秘值。
    emergencyStealthCost: 500,
    emergencyStealthGain: 5,
    // 在佣兵详情中“抹去黑历史”的价格：每 1 点个人声望 2 金，且必须一次付清清零。
    eraseMercenaryReputationCostPerPoint: 2,
  },

  recruitment: {
    // 招募池刷新费用。按酒馆等级读取，下标 0=未解锁，1=F级，依次到 7=S级。
    refreshCost: 15,
    refreshCostByTavernLevel: [15, 20, 28, 40, 58, 82, 115, 160],
    // 签字费 = 该佣兵当前日薪 * signingMultiplier。倍率在生成佣兵时固定，通常为 3-7 倍。
    signingMultiplierMin: 3,
    signingMultiplierMax: 7,
    // 招募费用：baseCost + rankIndex * perRank + tagCount * perTag。
    baseCost: 24,
    perRank: 6,
    perTag: 2,
    // 招募生成模板。基础战斗力不包含武器、防具、伤势、压力和技能修正。
    rankTemplates: {
      无: { combatPower: [18, 28], skillCount: 0 },
      F: { combatPower: [30, 42], skillCount: 1 },
      E: { combatPower: [46, 62], skillCount: 2 },
      D: { combatPower: [70, 90], skillCount: 3 },
      C: { combatPower: [106, 134], skillCount: 4 },
      B: { combatPower: [166, 210], skillCount: 5 },
      A: { combatPower: [280, 360], skillCount: 6 },
      S: { combatPower: [480, 620], skillCount: 7 },
    },
    // 酒馆等级对应不同评级佣兵的刷新权重。数组下标 0=未解锁，1=F级，依次到 7=S级。
    tavernRankWeightsByLevel: [
      { 无: 100 },
      { 无: 80, F: 20 },
      { 无: 55, F: 35, E: 10 },
      { 无: 35, F: 35, E: 22, D: 8 },
      { 无: 20, F: 30, E: 28, D: 16, C: 6 },
      { 无: 12, F: 22, E: 28, D: 22, C: 12, B: 4 },
      { 无: 8, F: 15, E: 22, D: 25, C: 18, B: 9, A: 3 },
      { 无: 5, F: 10, E: 17, D: 24, C: 22, B: 14, A: 6, S: 2 },
    ],
  },

  facilities: {
    // 默认升级费用兜底：未单独配置的设施使用建筑基础 cost + 当前等级 * upgradePerCurrentLevel。
    upgradePerCurrentLevel: 55,
    // 不同基础设施的升级费用表。数组下标 0=解锁到F级，1=升到E级，依次到 6=升到S级。
    // 防御设施不使用评级，表格代表第 1、2、3...座的修建费用，超出后按最后一档递增。
    upgradeCostsByFacility: {
      tavern: [70, 115, 185, 295, 470, 750, 1200],
      barracks: [85, 130, 195, 290, 430, 640, 950],
      blackMarket: [95, 155, 250, 400, 640, 1020, 1600],
      hospital: [110, 180, 295, 475, 760, 1220, 1950],
      entertainmentCenter: [80, 125, 195, 305, 480, 760, 1200],
      intel: [90, 150, 245, 395, 635, 1020, 1640],
      defenses: [100, 145, 210, 305, 445, 650, 950],
      shelter: [120],
    },
    // 基础设施日维护费全局倍率。用于整体压低设施维护压力。
    upkeepMultiplier: 0.35,
    // 初始佣兵上限。兵营每提升 1 级，上限 +1。
    baseMercenaryLimit: 4,
    barracksMercenaryLimitPerLevel: 1,
    // 情报室每级降低调查费用的比例，最高不超过 missions.costs.maxInvestigationDiscount。
    intelInvestigationDiscountPerLevel: 0.08,
    // 医疗中心按“单个物理负面状态”收费并尝试移除。
    // 规则读取 woundPoints：先看设施等级能否处理该点数，再按点数查治疗费和成功率。
    hospitalTreatment: {
      maxPointsByLevel: [1, 2, 4, 5, 7, 8, 9],
      costByPoint: {
        1: 4,
        2: 9,
        3: 16,
        4: 25,
        5: 49,
        6: 64,
        7: 128,
        8: 256,
        9: 512,
      },
      successChanceByPointByLevel: [
        { 1: 72 },
        { 1: 80, 2: 76 },
        { 1: 86, 2: 82, 3: 78, 4: 74 },
        { 1: 91, 2: 87, 3: 83, 4: 79, 5: 75 },
        { 1: 95, 2: 91, 3: 87, 4: 83, 5: 79, 6: 75, 7: 71 },
        { 1: 98, 2: 94, 3: 90, 4: 86, 5: 82, 6: 78, 7: 74, 8: 70 },
        { 1: 100, 2: 96, 3: 92, 4: 88, 5: 84, 6: 80, 7: 76, 8: 72, 9: 68 },
      ],
    },
    // 娱乐中心按“单个精神负面状态”收费并尝试移除。
    // 规则读取 stressPoints，配置方式与医疗中心相同。
    entertainmentCenterTreatment: {
      maxPointsByLevel: [1, 2, 4, 5, 7, 8, 11],
      costByPoint: {
        1: 4,
        2: 9,
        3: 16,
        4: 25,
        5: 49,
        6: 64,
        7: 128,
        8: 256,
        9: 512,
        10: 1024,
        11: 2048,
      },
      successChanceByPointByLevel: [
        { 1: 68 },
        { 1: 76, 2: 72 },
        { 1: 83, 2: 79, 3: 75, 4: 71 },
        { 1: 89, 2: 85, 3: 81, 4: 77, 5: 73 },
        { 1: 94, 2: 90, 3: 86, 4: 82, 5: 78, 6: 74, 7: 70 },
        { 1: 98, 2: 94, 3: 90, 4: 86, 5: 82, 6: 78, 7: 74, 8: 70 },
        { 1: 100, 2: 96, 3: 92, 4: 88, 5: 84, 6: 80, 7: 76, 8: 72, 9: 68, 10: 64, 11: 60 },
      ],
    },
    // 防御设施在基地遇袭时提供固定基地战斗力。
    defensePowerPerLevel: 18,
    shelterCapacityPerBuild: 20,
  },

  blackMarket: {
    // 黑市物品价格：base[kind] + rankIndex * perRank[kind]。
    baseCost: {
      weapon: 58,
      armor: 46,
      mecha: 150,
      fallback: 40,
    },
    perRank: {
      weapon: 14,
      armor: 14,
      mecha: 45,
      fallback: 14,
    },
    // 黑市武器战斗力：参考同级佣兵战力，再乘 0.5-1.5。
    weaponPowerReferenceByRank: { F: 24, E: 28, D: 36, C: 52, B: 84, A: 148, S: 276 },
    weaponPowerMultiplierMin: 0.3,
    weaponPowerMultiplierMax: 1.2,
    // 机动兵器购买规则：黑市 C 级才解锁。常规货源比黑市等级低两档，偶尔出现高级货。
    mechaUnlockRank: "C",
    mechaCommonRankByMarketRank: { C: "F", B: "E", A: "D", S: "C" },
    mechaRareChance: 5,
    mechaRareRankOffset: 1,
    mechaDamageTypes: ["动能", "腐蚀", "电磁", "爆风", "能量", "燃烧", "异源", "切割"],
    mechaProtectionTypes: ["动能", "腐蚀", "电磁", "爆风", "能量", "燃烧", "异源", "切割"],
  },

  baseRaid: {
    // 每日开始时遇袭率 = 100 - 隐秘值。隐秘值 100 时不会遇袭，隐秘值 0 时必定遇袭。
    // 没有未遮掩声望时，仍然可以遇袭；这里仅作为袭击强度的最低声望压力。
    minUnpaidReputationForRaid: 1,
    // 未支付声望 + 基地声望共同换算袭击级别。声望越高，袭击越接近高级契约。
    unpaidReputationPerDifficulty: 10,
    minDifficulty: 1,
    maxDifficulty: 8,
    // 基地防守失败时，损失金币约等于同级契约报酬。
    facilityDamageChance: 35,
    facilityDowngradeAmount: 1,
    // 基地防守失败时，小幅降低隐秘值。主要隐秘压力仍来自月费和未支付声望。
    failureStealthLossMin: 1,
    failureStealthLossMax: 3,
  },
};
