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
    // 新开局补给。补给不足会影响基地日常运转，但不会直接生成精神负面状态。
    supplies: 24,
    // 新开局隐秘值。隐秘值归零会直接失败。
    stealth: 100,
  },

  contracts: {
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
      // 契约成功与基地防守成功后的战斗掉落概率。掉落装备等级等同于本次契约等级。
      baseChance: 25,
      // 契约难度每提高 1 级，额外增加的掉落概率。
      perDifficulty: 3,
      // 掉落时生成武器的概率；剩余概率生成防具。
      weaponChance: 50,
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
      // 情报、职业等折扣最多减免 40%，避免调查完全免费。
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
        "第三方介入：另一支小队试图截胡。": 0.3,
        "伏击：撤离路线被提前布置火力点。": 1,
        "客户欺骗：发布方隐瞒了真实目标。": 0.3,
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
      // 每名未阵亡佣兵每日消耗补给份数。按评级走从 1, 2 开始的斐波那契：
      // 无=1，F=2，E=3，D=5，C=8，B=13，A=21，S=34。
      rankDailySupply: [1, 2, 3, 5, 8, 13, 21, 34],
      // 支出界面购买补给库存的批发价格。
      purchaseTiers: [
        { quantity: 1, cost: 1 },
        { quantity: 20, cost: 19 },
        { quantity: 50, cost: 45 },
        { quantity: 100, cost: 85 },
      ],
    },
    equipmentMaintenance: {
      // 武器/防具养护费：base + rankIndex * perRank。
      weaponBase: 2,
      armorBase: 1,
      perRank: 2,
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
    // 在佣兵详情中“抹去黑历史”的价格：每 1 点个人声望 2 金，且必须一次付清清零。
    eraseMercenaryReputationCostPerPoint: 2,
  },

  recruitment: {
    // 刷新招募池费用。
    refreshCost: 15,
    // 签字费 = 该佣兵当前日薪 * signingMultiplier。倍率在生成佣兵时固定，通常为 3-7 倍。
    signingMultiplierMin: 3,
    signingMultiplierMax: 7,
    // 招募费用：baseCost + rankIndex * perRank + tagCount * perTag。
    baseCost: 24,
    perRank: 6,
    perTag: 2,
  },

  facilities: {
    // 升级费用：建筑基础 cost + 当前等级 * upgradePerCurrentLevel。解锁 F 级使用建筑 unlockCost/cost。
    upgradePerCurrentLevel: 55,
    // 基础设施日维护费全局倍率。用于整体压低设施维护压力。
    upkeepMultiplier: 0.35,
    // 初始佣兵上限。兵营每提升 1 级，上限 +1。
    baseMercenaryLimit: 4,
    barracksMercenaryLimitPerLevel: 1,
    // 情报室每级降低调查费用的比例，最高不超过 contracts.costs.maxInvestigationDiscount。
    intelInvestigationDiscountPerLevel: 0.08,
    // 医疗中心按“单个物理负面状态”收费并尝试移除。等级越高，可处理的伤势点数越高，成功率越高。
    hospitalTreatment: {
      baseCost: 8,
      costPerPoint: 5,
      severityMultiplier: { light: 1, medium: 1.25, heavy: 1.6 },
      maxPointsByLevel: [2, 4, 6, 8, 10, 12, 99],
      successChanceByLevel: [72, 80, 86, 91, 95, 98, 100],
    },
    // 娱乐中心按“单个精神负面状态”收费并尝试移除。等级越高，可处理的压力点数越高，成功率越高。
    infirmaryTreatment: {
      baseCost: 6,
      costPerPoint: 6,
      severityMultiplier: { light: 1, medium: 1.3, heavy: 1.75 },
      maxPointsByLevel: [2, 4, 6, 8, 10, 12, 99],
      successChanceByLevel: [68, 76, 83, 89, 94, 98, 100],
    },
    // 防御设施在基地遇袭时提供固定基地战斗力。
    defensePowerPerLevel: 18,
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
  },

  baseRaid: {
    // 每日开始时遇袭率 = 100 - 隐秘值。隐秘值 100 时不会遇袭，隐秘值 0 时必定遇袭。
    minUnpaidReputationForRaid: 1,
    // 未支付声望换算袭击级别。未支付声望越高，袭击越接近高级契约。
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
