export const dialogues = {
  intro: {
    id: "intro",
    title: "你好，老朋友！",
    channel: "Private / GMS DEV LINK",
    frequency: "140.85",
    security: "SCRAMBLE: ON",
    speaker: {
      name: "YNA",
      role: "GMS 开发者 / 黑客",
      portrait: null,
      initial: "Y",
    },
    start: "signal",
    nodes: {
      signal: {
        text: "听得到吗？我是 YNA。GMS 已经上线了。私人链路、支付通道、佣兵数据库都接好了。简单说，你出钱，我写系统，我们不用入境，也能在 SSS 内战期间远程做佣兵生意。",
        choices: [
          { text: "先说现在的局势。", next: "war" },
          { text: "为什么我们不能直接入境？", next: "remote" },
          { text: "先说 GMS 是什么。", next: "gms" },
        ],
      },
      war: {
        text: "现在主要是 SSS 和 FOF 两边在打。天人残余也在边缘活动，但目前不是主战场。据说甚至连那支部队也参与其中了。",
        choices: [
          { text: "所以到处都缺人手。", next: "market" },
          { text: "这和我们有什么关系？", next: "money" },
        ],
      },
      remote: {
        text: "我们没办法，也没必要亲自入境。边境封锁、检查站、临时军政府、路边武装，任何一关都可能让我们从老板变成失踪人口。无论是自己还是别人的血，溅到身上都是一样的脏————远程管理才是正确做法。",
        choices: [
          { text: "所以才需要 GMS。", next: "gms" },
          { text: "那谁替我们进去办事？", next: "guns" },
        ],
      },
      market: {
        text: "对。SSS 和 FOF 打得越久，护送、侦察、清理据点、救人、灭口、运货这些活就越多。正规军有政治限制，正规公司怕担责，临时武装不稳定。中间这块空档，就是我们赚钱的地方。",
        choices: [
          { text: "但佣兵自己不会接活吗？", next: "mercProblem" },
          { text: "我们提供什么？", next: "gms" },
        ],
      },
      mercProblem: {
        text: "很多人确实去当佣兵赚钱，但他们也有问题：没组织、没渠道、找不到稳定活、拿不到靠谱情报、没有装备和医疗支持，出了事也没人结算。说白了，他们有枪，但没有生意。GMS 就是把这些散兵游勇接进一个能派活、能结账、能追踪状态的系统。",
        choices: [
          { text: "所以 GMS 同时解决雇主和佣兵的问题。", next: "platform" },
          { text: "Gun 是什么？", next: "guns" },
        ],
      },
      platform: {
        text: "没错。雇主找不到可靠的人，佣兵找不到可靠的活，我们不想也不能亲自入境。GMS 把三件事接起来：远程管理、佣兵组织、契约分发。听起来像平台经济，只是平台上的差评一般会流血。",
        choices: [
          { text: "具体说说 GMS。", next: "gms" },
          { text: "说说 Gun。", next: "guns" },
        ],
      },
      gms: {
        text: "GMS，全名 Gun Management System。它是一套远程管理佣兵的系统。它能登记 Gun、筛选契约、估算风险、编组小队、管理装备、跟踪外勤，还能处理支付和身份痕迹。我们人在境外，靠它把佣兵当成一家公司来调度。",
        choices: [
          { text: "Gun 是什么？", next: "guns" },
          { text: "我们俩怎么分工？", next: "roles" },
          { text: "它怎么解决佣兵找不到活的问题？", next: "mercProblem" },
        ],
      },
      guns: {
        text: "Gun（枪）。Gun是佣兵的俗称，不是一个正式组织。佣兵里很多人不想报真名，也没人愿意在合同上写自己是‘非法武装人员’，所以大家干脆叫他们 Gun。一个 Gun 可能是逃兵、前安保、走私飞行员、无证医生、机师，也可能只是一个会开枪、缺钱、愿意签短约的人。",
        choices: [
          { text: "他们算士兵吗？", next: "gunStatus" },
          { text: "为什么叫 Gun？", next: "gunName" },
          { text: "他们怎么接到活？", next: "mercProblem" },
        ],
      },
      gunName: {
        text: "因为简单、好记、方便装傻。客户说‘我需要三把 Gun’，意思就是需要三个人去解决问题。把人比喻成物品可以减少负罪感。",
        choices: [
          { text: "他们算士兵吗？", next: "gunStatus" },
          { text: "继续说管理。", next: "control" },
        ],
      },
      gunStatus: {
        text: "大多数 Gun 不算士兵，至少纸面上不算。他们没有稳定编制，没有可靠后勤，也没有人替他们写漂亮的阵亡通知。GMS 会把他们按技能、价格、装备和精神状态登记起来，临时编成小队，派遣他们执行契约。",
        choices: [
          { text: "那怎么管住他们？", next: "control" },
          { text: "他们死了怎么办？", next: "risk" },
        ],
      },
      control: {
        text: "靠钱、合同、装备、记录和一点威胁。GMS 会记下他们的工资、技能、伤病、压力和任务表现。我们不靠感情管理佣兵，感情很贵，而且无法量化。",
        choices: [
          { text: "我们俩怎么分工？", next: "roles" },
          { text: "风险有哪些？", next: "risk" },
        ],
      },
      roles: {
        text: "你是出资人，也是事务所的老板。你决定招谁、接什么契约、钱花到哪里。我是技术员，负责 维护GMS、通讯、假身份、支付拆分、日志清理和各种见不得光的后端工作。你管生意，我管系统别炸。",
        choices: [
          { text: "系统会炸吗？", next: "system" },
          { text: "说说怎么赚钱。", next: "money" },
        ],
      },
      system: {
        text: "不会马上炸。这已经是我能给出的最高保证。只要我们按时付服务器、线人和清洗渠道的钱，GMS 就能继续运行。",
        choices: [
          { text: "说说隐秘。", next: "secrecy" },
          { text: "说说怎么赚钱。", next: "money" },
        ],
      },
      money: {
        text: "赚钱方式很直接：我们接契约，派 Gun 去完成任务，收钱。低风险任务养现金流，高风险任务赚大钱或换关系。装备、情报、医疗、基地设施都是成本。SSS 和 FOF 打得越久，需求越多，我们就把需求变成账单。很难听，但很有效。",
        choices: [
          { text: "基地是什么？", next: "base" },
          { text: "隐秘是什么？", next: "secrecy" },
        ],
      },
      base: {
        text: "基地不是一个漂亮总部，而是一个临时据点。你可以花钱扩建设施，比如酒馆、兵营、情报室、黑市、防御设施、避难所。设施越多，生意越大，维护费也越高。",
        choices: [
          { text: "避难所也算生意？", next: "shelter" },
          { text: "继续说隐秘。", next: "secrecy" },
        ],
      },
      shelter: {
        text: "避难所能收容战争难民。听起来像良心项目，实际上也能带来人脉、消息、劳力和一点名声。做好事总是有好报的。",
        choices: [
          { text: "说说隐秘。", next: "secrecy" },
          { text: "风险有哪些？", next: "risk" },
        ],
      },
      secrecy: {
        text: "隐秘就是我们不被找上门的能力。Gun 的身份、基地位置、支付记录、客户关系，都要花钱处理。隐秘太低，可能会有人顺着线索找到基地。到时候他们通常不会先预约。",
        choices: [
          { text: "谁会找上门？", next: "threats" },
          { text: "明白，隐秘也是成本。", next: "risk" },
        ],
      },
      threats: {
        text: "可能是宪兵，可能是竞争对手，可能是被我们惹过的军阀，也可能是觉得尾款太贵的客户。内战里最便宜的售后方案通常是灭口，所以我们最好别成为售后对象。",
        choices: [
          { text: "风险有哪些？", next: "risk" },
          { text: "那第一步做什么？", next: "start" },
        ],
      },
      dirty: {
        text: "是很脏。但我们不是来拯救战争的，我们是来从战争里活下来，顺便赚钱。你要是想找干净生意，现在能开的店大概只剩棺材铺，而且竞争也挺激烈。",
        choices: [
          { text: "好吧，继续。", next: "gms" },
          { text: "直接说风险。", next: "risk" },
        ],
      },
      risk: {
        text: "风险很明确：佣兵会死，客户会赖账，装备会坏，伤病会拖垮队伍，隐秘会下降，基地可能被袭击，现金流可能断掉。我们的目标不是没有风险，而是每次冒险都知道自己在赌什么。",
        choices: [
          { text: "运营细节之后看页面说明。", next: "start" },
          { text: "我们为什么非做这个？", next: "why" },
        ],
      },
      why: {
        text: "因为你有启动资金，我有系统和渠道，SSS 和 FOF 正在把需求推到天上。等战争结束，价格会掉，机会会被大公司和军方吃掉。我们现在进场，是因为现在够乱。",
        choices: [
          { text: "那就开始。", next: "start" },
        ],
      },
      start: {
        text: "GMS的操作并不复杂，具体操作不用现在全记。你第一次打开某个页面时，我会弹出说明，告诉你那一页该看什么、怎么用。现在你只要记住：我们不入境，用 GMS 远程组织 Gun，接 SSS 内战里的活，管支出，保隐秘，别让基地被端。准备好了就启动 GMS。",
        choices: [
          { text: "结束通讯，启动 GMS。", action: "complete" },
        ],
      },
    },
  },
};