// Gun Core 经济参数总表
// ------------------------------------------------------------
// 这个文件既是“数值设计文档”，也是游戏实际读取的配置。
// 调整经济逻辑时，优先修改这里的数字；除非要新增机制，否则尽量不要去模块里找硬编码。
//
// 设计口径：
// - 金钱：基地现金，也是所有支出、收益、私人财富消费的统一货币。
// - 补给：抽象的日常消耗物资。当前主要作为压力惩罚触发器，不直接等同于金钱。
// - 隐秘值：经营失败的安全阀。资金链断裂会损伤隐秘值，隐秘值归零则失败。
// - 声望：由被雇佣佣兵的知名度汇总而来，会推高契约难度，也会推高佣兵工资。

export const economyConfig = {
  initialState: {
    // 新开局资金。过低会导致玩家无法承担前几天试错，过高会让支出压力变钝。
    gold: 180,
    // 新开局补给。补给为 0 时，所有未阵亡佣兵每天增加压力。
    supplies: 24,
    // 新开局隐秘值。隐秘值归零会直接失败。
    stealth: 78,
    // 短局目标期限。超过该天数仍未完成财富收藏则失败。
    deadline: 60,
  },

  contracts: {
    reward: {
      // 契约基础金钱奖励：baseGold + difficulty * random(goldPerDifficultyMin, goldPerDifficultyMax)。
      baseGold: 35,
      goldPerDifficultyMin: 16,
      goldPerDifficultyMax: 24,
      // 契约基础声望池：max(minReputation, difficulty * reputationPerDifficulty + random(reputationRandomMin, reputationRandomMax))。
      minReputation: 5,
      reputationPerDifficulty: 3,
      reputationRandomMin: 0,
      reputationRandomMax: 5,
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
      // 调查费用：investigateBase + difficulty * investigatePerDifficulty + revealedCount * investigatePerIntel。
      investigateBase: 14,
      investigatePerDifficulty: 5,
      investigatePerIntel: 6,
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
    execution: {
      // 每天消耗补给：ceil(rosterSize / divisor)。
      dailySupplyDivisor: 3,
      // 补给为 0 时，每名未阵亡佣兵每天增加的压力。
      noSupplyStress: 2,
      // 外勤归来补发工资不足时的隐秘值损失：ceil(shortage / wageShortageDivisor) + wageShortageBaseLoss。
      wageShortageDivisor: 5,
      wageShortageBaseLoss: 3,
      wageShortageMinLoss: 3,
      wageShortageMaxLoss: 18,
      // 欠薪会让返队佣兵额外增加压力。
      wageShortageStress: 2,
    },
    hiddenTwists: {
      // 隐藏事件带来的额外金钱/隐秘值变化。调查足够多时使用 mitigated 数值。
      thirdPartyGoldLoss: 16,
      thirdPartyGoldLossMitigated: 6,
      thirdPartyStealthLoss: 4,
      thirdPartyStealthLossMitigated: 1,
      clientFraudStealthLoss: 6,
      clientFraudStealthLossMitigated: 2,
      hiddenBonusGold: 14,
      hiddenBonusGoldMitigated: 24,
    },
  },

  dailyExpenses: {
    // 基地固定开销。无论有没有佣兵都会支付。
    baseUpkeep: 10,
    wages: {
      // 佣兵日薪：base + rankIndex * perRank + notoriety * perNotoriety + playerBonus。
      base: 3,
      perRank: 2,
      perNotoriety: 2,
      playerBonus: 2,
    },
    livingSupplies: {
      // 每名未阵亡佣兵的生活补给费：base + ceil(rankIndex / rankDivisor)。
      base: 2,
      rankDivisor: 2,
    },
    equipmentMaintenance: {
      // 武器/防具养护费：base + rankIndex * perRank。
      weaponBase: 2,
      armorBase: 1,
      perRank: 2,
    },
    shortage: {
      // 每日支出无法付清时，资金清零，并损失隐秘值：ceil(shortage / divisor) + baseLoss。
      divisor: 4,
      baseLoss: 5,
      minLoss: 5,
      maxLoss: 22,
      // 维护费缺口会让所有未阵亡佣兵增加压力。
      stress: 1,
    },
  },

  recruitment: {
    // 刷新招募池费用。
    refreshCost: 15,
    // 招募费用：baseCost + rankIndex * perRank + tagCount * perTag。
    baseCost: 42,
    perRank: 10,
    perTag: 4,
  },

  facilities: {
    // 升级费用：建筑基础 cost + 当前等级 * upgradePerCurrentLevel。解锁 F 级使用建筑 unlockCost/cost。
    upgradePerCurrentLevel: 55,
    // 医疗中心一次治疗所有伤病佣兵的费用。
    hospitalTreatCost: 32,
  },

  blackMarket: {
    // 黑市物品价格：base[kind] + rankIndex * perRank[kind]。
    baseCost: {
      supplies: 26,
      weapon: 58,
      armor: 46,
      mecha: 150,
      fallback: 40,
    },
    perRank: {
      supplies: 14,
      weapon: 14,
      armor: 14,
      mecha: 45,
      fallback: 14,
    },
    // 黑市补给/杂物的数量。F 级较少，E-S 级较多。
    supplyQuantityLowRank: [2, 4],
    supplyQuantityHighRank: [4, 8],
  },

  baseActions: {
    // 总览页的“黑市补给”快捷行动。花钱换补给，但会降低隐秘值。
    buySupplies: {
      cost: 36,
      amount: 8,
      stealthLoss: 2,
    },
    // 旧的地下医疗快捷行动。医疗中心建成后，主要使用 facilities.hospitalTreatCost。
    treatWounds: {
      cost: 28,
      stressRecovery: 6,
      woundRecovery: 1,
      hpRecovery: 8,
    },
    // 清理痕迹：花钱恢复隐秘值。
    reduceHeat: {
      cost: 42,
      stealthGain: 12,
    },
  },

  restAttack: {
    // 隐秘值越低，休整期遇袭概率越高：baseChance + max(0, triggerStealth - stealth) * pressureMultiplier。
    baseChance: 4,
    triggerStealth: 72,
    pressureMultiplier: 0.75,
    minChance: 4,
    maxChance: 58,
    // 遇袭时损失金钱与隐秘值。
    goldLossMin: 12,
    goldLossMax: 32,
    stealthLossMin: 3,
    stealthLossMax: 8,
    woundStressMin: 4,
    woundStressMax: 8,
  },
};

