const SKILL_EFFECT_TEXT = {
  "combat-fire-suppression": "战力 +4；契约成功率 +2。",
  "combat-weapon-drill": "装备武器时，武器战力额外 +10%。",
  "combat-breach-rhythm": "突袭、破坏、占领类契约成功率 +5。",
  "combat-close-kill": "歼灭、突袭类契约成功率 +4。",
  "combat-steady-shot": "战力 +3；受伤时额外 +3。",
  "combat-numb-nerves": "精神负面风险 -3；压力惩罚下仍保留少量战力。",
  "combat-two-hand": "装备武器时战力 +6。",
  "combat-one-hand": "肢体受损时战力 +8。",
  "combat-cold-execution": "精神负面风险 -2；契约成功率 +2。",
  "combat-kill-experience": "歼灭、防御类契约成功率 +5。",
  "combat-cleanup": "战斗掉落率 +5%。",
  "combat-anti-armor": "高难度契约成功率 +5。",
  "combat-fireline-reflex": "伤病风险 -3；死亡率 -2。",
  "combat-addiction": "契约成功率 +4；精神负面风险 +2。",
  "combat-pressure-advance": "小队人数不足惩罚 -6。",

  "intel-informants": "调查费用 -5%。",
  "intel-rapid-assessment": "缩小战力区间调查费用额外 -10%。",
  "intel-blackbox": "特殊契约成功率 +5。",
  "intel-counter-surveil": "负面突发事件权重 -8%；隐秘损失类事件影响降低。",
  "intel-validation": "每条已调查情报的成功率收益 +1。",
  "intel-enemy-profile": "已知敌方伤害类型时，契约成功率 +4。",
  "intel-route": "侦察、搜索、营救类契约成功率 +4。",
  "intel-risk-plan": "契约失败时伤病与精神负面风险 -4。",
  "intel-noise-filter": "随机调查费用 -8%。",
  "intel-fake-id": "契约突发事件造成的隐秘损失降低。",
  "intel-target-portrait": "推荐能力匹配成功率 +3。",
  "intel-wire-fragment": "负面突发事件权重 -6%。",
  "intel-extract-route": "契约失败时死亡率 -3。",
  "intel-evidence-burn": "契约突发事件造成的隐秘损失降低。",
  "intel-deep-dive": "负面突发事件权重 -10%；调查费用 -3%。",

  "log-war-accountant": "契约金币结算 +5%。",
  "log-advance": "契约预付款比例 +8%。",
  "log-supply": "每日补给消耗 -1，最低 1。",
  "log-warehouse": "仓库装备维护费 -1，最低 0。",
  "log-equipment-ledger": "装备维护费 -10%。",
  "log-gray-channel": "刷新契约费用 -10%。",
  "log-black-market": "黑市武器和防具购买费用 -10%。",
  "log-loot-appraisal": "战斗掉落率 +5%。",
  "log-wage-delay": "外勤工资结算压力降低。",
  "log-cheap-sign": "招募签字费 -10%。",
  "log-bad-debt": "隐秘费用 -5%。",
  "log-commission-split": "契约失败声望损失 -1。",
  "log-empty-glove": "预付款比例 +12%，但精神负面风险 +2。",
  "log-temp-buy": "装备匹配带来的成功率 +2。",
  "log-war-insurance": "契约失败金币损失与死亡率小幅降低。",

  "surv-first-aid": "伤病风险 -4。",
  "surv-bleed": "伤病风险 -3；死亡率 -1。",
  "surv-stitch": "伤病风险 -2。",
  "surv-bone": "物理负面状态死亡率修正 -2。",
  "surv-amputation": "重伤时死亡率 -3。",
  "surv-sedation": "精神负面风险 -4。",
  "surv-collapse": "精神负面风险 -3；崩溃风险降低。",
  "surv-fear": "契约失败时精神负面风险 -5。",
  "surv-bodybag": "队伍死亡后的精神连带风险降低。",
  "surv-anesthesia": "伤病风险 -2；治疗相关技能预留。",
  "surv-entertain": "精神负面风险 -2。",
  "surv-triage": "伤病风险 -3；死亡率 -2。",
  "surv-gray-comfort": "精神负面风险 -2。",
  "surv-usability": "受伤时战力 +4。",
  "surv-after-review": "契约成功率 +2；失败时精神负面风险 -2。",

  "common-survivor": "死亡率 -3。",
  "common-silent": "负面突发事件权重 -4%。",
  "common-infamous": "契约金币结算 +3%，但隐秘相关风险略高。",
  "common-limb-comp": "肢体受损时战力 +6。",
  "common-unarmed": "没有武器时战力 +5。",
  "common-armor": "装备防具时死亡率 -2。",
  "common-weapon": "装备武器时战力 +4。",
  "common-asset": "契约金币结算 +2%。",
  "common-low-profile": "负面突发事件权重 -4%；隐秘损失类事件影响降低。",
  "common-learn": "晋升获得强化点概率略高。",
  "common-hardlife": "伤病风险 -2；死亡率 -2。",
  "common-contract-clean": "契约失败声望损失 -1。",
  "common-scavenge": "战斗掉落率 +5%。",
  "common-drug": "精神负面风险 -2；伤病风险 +1。",
  "common-bad-debt-life": "招募和工资相关效果预留。",

  "pilot-aptitude": "机甲系统预留；当前装备武器时战力 +3。",
  "pilot-sync": "机甲系统预留；精神负面风险 -2。",
  "pilot-armor-empathy": "装备防具时伤病风险 -2。",
  "pilot-overdrive": "高难度契约成功率 +4，但伤病风险 +2。",
  "pilot-conservative": "死亡率 -2。",
  "pilot-evasion": "伤病风险 -3。",
  "pilot-fire-control": "装备武器时战力 +5。",
  "pilot-melee": "歼灭、突袭类契约成功率 +3。",
  "pilot-support": "队伍契约成功率 +2。",
  "pilot-repair": "装备维护费 -5%。",
  "pilot-clean": "装备维护费 -5%。",
  "pilot-delusion": "精神负面风险 +2；高难度契约成功率 +3。",
  "pilot-eject": "死亡率 -4。",
  "pilot-scrap": "战斗掉落率 +4%。",
  "pilot-ace": "高难度契约成功率 +4；死亡率 +1。",

  "special-pollution": "异源、腐蚀类伤病风险 -4。",
  "special-affinity": "特殊契约成功率 +4；负面突发事件权重 -4%。",
  "special-dream": "每条已调查情报的成功率收益 +1。",
  "special-whisper": "精神负面风险 -3。",
  "special-sample": "战斗掉落率 +4%。",
  "special-gray-instinct": "契约成功率 +3。",
  "special-unclean-luck": "死亡率 -3；战斗掉落率 +3%。",
  "special-blackbox-body": "伤病风险 -3。",
  "special-carrier": "精神负面风险 +2；特殊契约成功率 +3。",
  "special-calm": "精神负面风险 -4。",
  "special-container": "死亡率 -2；伤病风险 +2。",
  "special-recover": "伤病与精神负面风险 -2。",
  "special-memory-gap": "精神负面风险 -2。",
  "special-zone-guide": "侦察、特殊类契约成功率 +4。",
  "special-disappear": "负面突发事件权重 -6%；隐秘损失类事件影响降低。",
};

export function hasSkill(character, skillId) {
  return (character?.skills ?? []).some((skill) => skill.id === skillId);
}

export function countTeamSkill(team = [], skillId) {
  return team.reduce((sum, character) => sum + (hasSkill(character, skillId) ? 1 : 0), 0);
}

export function getSkillEffectText(skillId) {
  return SKILL_EFFECT_TEXT[skillId] ?? "当前技能主要用于契约推荐能力匹配。";
}

export function getSkillCombatPowerBonus(character) {
  const weaponPower = getEquippedWeaponPower(character);
  const hasWeapon = weaponPower > 0;
  const hasArmor = Boolean(character?.equipment?.armor);
  const wounded = hasPhysicalCondition(character);
  const limbDamaged = hasLimbCondition(character);
  let bonus = 0;

  if (hasSkill(character, "combat-fire-suppression")) bonus += 4;
  if (hasSkill(character, "combat-weapon-drill") && hasWeapon) bonus += Math.max(1, Math.round(weaponPower * 0.1));
  if (hasSkill(character, "combat-steady-shot")) bonus += wounded ? 6 : 3;
  if (hasSkill(character, "combat-two-hand") && hasWeapon) bonus += 6;
  if (hasSkill(character, "combat-one-hand") && limbDamaged) bonus += 8;
  if (hasSkill(character, "surv-usability") && wounded) bonus += 4;
  if (hasSkill(character, "common-limb-comp") && limbDamaged) bonus += 6;
  if (hasSkill(character, "common-unarmed") && !hasWeapon) bonus += 5;
  if (hasSkill(character, "common-weapon") && hasWeapon) bonus += 4;
  if (hasSkill(character, "pilot-aptitude") && hasWeapon) bonus += 3;
  if (hasSkill(character, "pilot-fire-control") && hasWeapon) bonus += 5;
  if (hasSkill(character, "combat-numb-nerves") && hasMentalCondition(character)) bonus += 3;
  if (hasSkill(character, "common-armor") && hasArmor) bonus += 1;

  return bonus;
}

export function getTeamMissionChanceBonus(team = [], mission = {}, context = {}) {
  const typeCode = mission.typeCode ?? "";
  const actionType = mission.actionType ?? "";
  const difficulty = mission.difficulty ?? 1;
  let bonus = 0;

  bonus += countTeamSkill(team, "combat-fire-suppression") * 2;
  bonus += countTeamSkill(team, "combat-cold-execution") * 2;
  bonus += countTeamSkill(team, "surv-after-review") * 2;
  bonus += countTeamSkill(team, "pilot-support") * 2;
  bonus += countTeamSkill(team, "special-gray-instinct") * 3;

  if (["Raid", "Sabotage", "Occupation"].includes(typeCode)) bonus += countTeamSkill(team, "combat-breach-rhythm") * 5;
  if (["Hunt", "Raid"].includes(typeCode)) bonus += countTeamSkill(team, "combat-close-kill") * 4;
  if (["Hunt", "Defense"].includes(typeCode)) bonus += countTeamSkill(team, "combat-kill-experience") * 5;
  if (["Recon", "Search", "Extraction"].includes(typeCode)) bonus += countTeamSkill(team, "intel-route") * 4;
  if (typeCode === "Special") {
    bonus += countTeamSkill(team, "intel-blackbox") * 5;
    bonus += countTeamSkill(team, "special-affinity") * 4;
    bonus += countTeamSkill(team, "special-carrier") * 3;
  }
  if (["Recon", "Special"].includes(typeCode)) bonus += countTeamSkill(team, "special-zone-guide") * 4;
  if ((mission.requirements?.damageTypes ?? []).length > 0) bonus += countTeamSkill(team, "intel-enemy-profile") * 4;
  if (difficulty >= 5) {
    bonus += countTeamSkill(team, "combat-anti-armor") * 5;
    bonus += countTeamSkill(team, "pilot-overdrive") * 4;
    bonus += countTeamSkill(team, "pilot-delusion") * 3;
  }
  if (context.fullSkillMatch) bonus += countTeamSkill(team, "intel-target-portrait") * 3;
  if ((mission.revealedIntel?.length ?? 0) > 0 || (mission.powerIntelLevel ?? 0) > 0) {
    bonus += countTeamSkill(team, "special-dream") * 1;
    bonus += countTeamSkill(team, "intel-validation") * 1;
  }

  return Math.min(24, bonus);
}

export function getTeamSizePenaltyReduction(team = [], penalty = 0) {
  if (penalty <= 0) return 0;
  return Math.min(penalty, countTeamSkill(team, "combat-pressure-advance") * 6);
}

export function getInvestigationSkillDiscount(draft, mode = "targeted") {
  const roster = draft?.roster ?? [];
  let discount = 0;
  discount += countAvailableRosterSkill(roster, "intel-informants") * 0.05;
  discount += countAvailableRosterSkill(roster, "intel-deep-dive") * 0.03;
  if (mode === "random") discount += countAvailableRosterSkill(roster, "intel-noise-filter") * 0.08;
  if (mode === "power") discount += countAvailableRosterSkill(roster, "intel-rapid-assessment") * 0.1;
  return Math.min(0.25, discount);
}

export function getRewardGoldMultiplier(team = []) {
  let multiplier = 1;
  multiplier += countTeamSkill(team, "log-war-accountant") * 0.05;
  multiplier += countTeamSkill(team, "common-infamous") * 0.03;
  multiplier += countTeamSkill(team, "common-asset") * 0.02;
  return Math.min(1.25, multiplier);
}

export function getAdvancePaymentRateBonus(team = []) {
  return Math.min(0.25, countTeamSkill(team, "log-advance") * 0.08 + countTeamSkill(team, "log-empty-glove") * 0.12);
}

export function getLootChanceBonus(team = []) {
  return Math.min(
    35,
    countTeamSkill(team, "combat-cleanup") * 5 +
      countTeamSkill(team, "log-loot-appraisal") * 5 +
      countTeamSkill(team, "common-scavenge") * 5 +
      countTeamSkill(team, "pilot-scrap") * 4 +
      countTeamSkill(team, "special-sample") * 4 +
      countTeamSkill(team, "special-unclean-luck") * 3
  );
}

export function getWoundRiskModifier(character, team = [], context = {}) {
  let modifier = 0;
  modifier -= countTeamSkill(team, "surv-first-aid") * 4;
  modifier -= countTeamSkill(team, "surv-bleed") * 3;
  modifier -= countTeamSkill(team, "surv-stitch") * 2;
  modifier -= countTeamSkill(team, "surv-triage") * 3;
  modifier -= countTeamSkill(team, "combat-fireline-reflex") * 3;
  modifier -= countTeamSkill(team, "common-hardlife") * 2;
  modifier -= countTeamSkill(team, "pilot-evasion") * 3;
  modifier -= countTeamSkill(team, "special-blackbox-body") * 3;
  modifier -= countTeamSkill(team, "special-recover") * 2;
  if (hasSkill(character, "surv-anesthesia")) modifier -= 2;
  if (hasSkill(character, "pilot-armor-empathy") && character.equipment?.armor) modifier -= 2;
  if (hasSkill(character, "common-drug")) modifier += 1;
  if (hasSkill(character, "pilot-overdrive") && (context.difficulty ?? 1) >= 5) modifier += 2;
  if (hasSkill(character, "special-container")) modifier += 2;
  return clampModifier(modifier, -22, 12);
}

export function getMentalRiskModifier(character, team = [], context = {}) {
  let modifier = 0;
  modifier -= countTeamSkill(team, "surv-sedation") * 4;
  modifier -= countTeamSkill(team, "surv-collapse") * 3;
  modifier -= countTeamSkill(team, "surv-entertain") * 2;
  modifier -= countTeamSkill(team, "surv-gray-comfort") * 2;
  modifier -= countTeamSkill(team, "combat-numb-nerves") * 3;
  modifier -= countTeamSkill(team, "combat-cold-execution") * 2;
  modifier -= countTeamSkill(team, "special-whisper") * 3;
  modifier -= countTeamSkill(team, "special-calm") * 4;
  modifier -= countTeamSkill(team, "special-recover") * 2;
  modifier -= countTeamSkill(team, "special-memory-gap") * 2;
  if (!context.success) {
    modifier -= countTeamSkill(team, "surv-fear") * 5;
    modifier -= countTeamSkill(team, "surv-after-review") * 2;
    modifier -= countTeamSkill(team, "intel-risk-plan") * 4;
  }
  if (hasSkill(character, "pilot-sync")) modifier -= 2;
  if (hasSkill(character, "common-drug")) modifier -= 2;
  if (hasSkill(character, "combat-addiction")) modifier += 2;
  if (hasSkill(character, "log-empty-glove")) modifier += 2;
  if (hasSkill(character, "pilot-delusion")) modifier += 2;
  if (hasSkill(character, "special-carrier")) modifier += 2;
  return clampModifier(modifier, -24, 12);
}

export function getDeathRiskModifier(character, team = [], context = {}) {
  let modifier = 0;
  modifier -= (hasSkill(character, "common-survivor") ? 3 : 0);
  modifier -= (hasSkill(character, "common-hardlife") ? 2 : 0);
  modifier -= (hasSkill(character, "combat-fireline-reflex") ? 2 : 0);
  modifier -= (hasSkill(character, "surv-bleed") ? 1 : 0);
  modifier -= (hasSkill(character, "surv-triage") ? 2 : 0);
  modifier -= (hasSkill(character, "pilot-conservative") ? 2 : 0);
  modifier -= (hasSkill(character, "pilot-eject") ? 4 : 0);
  modifier -= (hasSkill(character, "special-unclean-luck") ? 3 : 0);
  modifier -= (hasSkill(character, "special-container") ? 2 : 0);
  modifier -= (hasSkill(character, "common-armor") && character.equipment?.armor ? 2 : 0);
  if (!context.success) {
    modifier -= (hasSkill(character, "intel-extract-route") ? 3 : 0);
    modifier -= countTeamSkill(team, "log-war-insurance") * 1;
  }
  if (hasSkill(character, "surv-amputation") && hasHeavyPhysicalCondition(character)) modifier -= 3;
  if (hasSkill(character, "surv-bone")) modifier -= Math.min(2, countPhysicalConditions(character));
  if (hasSkill(character, "pilot-ace") && (context.difficulty ?? 1) >= 5) modifier += 1;
  return clampModifier(modifier, -18, 8);
}

export function getNegativeEventWeightMultiplier(team = []) {
  let reduction = 0;
  reduction += countTeamSkill(team, "intel-counter-surveil") * 0.08;
  reduction += countTeamSkill(team, "intel-wire-fragment") * 0.06;
  reduction += countTeamSkill(team, "intel-deep-dive") * 0.1;
  reduction += countTeamSkill(team, "common-silent") * 0.04;
  reduction += countTeamSkill(team, "common-low-profile") * 0.04;
  reduction += countTeamSkill(team, "special-affinity") * 0.04;
  reduction += countTeamSkill(team, "special-disappear") * 0.06;
  return Math.max(0.55, 1 - reduction);
}

export function getStealthEventImpactMultiplier(team = []) {
  let reduction = 0;
  reduction += countTeamSkill(team, "intel-counter-surveil") * 0.12;
  reduction += countTeamSkill(team, "intel-fake-id") * 0.1;
  reduction += countTeamSkill(team, "intel-evidence-burn") * 0.12;
  reduction += countTeamSkill(team, "common-low-profile") * 0.08;
  reduction += countTeamSkill(team, "special-disappear") * 0.14;
  if (countTeamSkill(team, "common-infamous") > 0) reduction -= 0.08;
  return Math.max(0.45, 1 - reduction);
}

export function getSupplyCostReduction(character) {
  return hasSkill(character, "log-supply") ? 1 : 0;
}

export function getEquipmentMaintenanceMultiplier(roster = []) {
  let multiplier = 1;
  multiplier -= countAvailableRosterSkill(roster, "log-equipment-ledger") * 0.1;
  multiplier -= countAvailableRosterSkill(roster, "pilot-repair") * 0.05;
  multiplier -= countAvailableRosterSkill(roster, "pilot-clean") * 0.05;
  return Math.max(0.65, multiplier);
}

export function getWarehouseMaintenanceReduction(roster = []) {
  return countAvailableRosterSkill(roster, "log-warehouse");
}

function countAvailableRosterSkill(roster = [], skillId) {
  return roster
    .filter((character) => character.status !== "阵亡" && character.status !== "闃典骸")
    .reduce((sum, character) => sum + (hasSkill(character, skillId) ? 1 : 0), 0);
}

function getEquippedWeaponPower(character) {
  const weapon = character?.equipment?.weapon;
  if (!weapon) return 0;
  return Math.max(0, Number(weapon.power ?? 0));
}

function hasPhysicalCondition(character) {
  return (character?.conditions ?? []).some((condition) => condition.category === "physical");
}

function hasMentalCondition(character) {
  return (character?.conditions ?? []).some((condition) => condition.category === "mental");
}

function hasHeavyPhysicalCondition(character) {
  return (character?.conditions ?? []).some((condition) => condition.category === "physical" && condition.severity === "heavy");
}

function countPhysicalConditions(character) {
  return (character?.conditions ?? []).filter((condition) => condition.category === "physical").length;
}

function hasLimbCondition(character) {
  return (character?.conditions ?? []).some((condition) => condition.limb || (condition.tags ?? []).some((tag) => ["断肢", "肢体", "左手", "右手", "左脚", "右脚"].includes(tag)));
}

function clampModifier(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
