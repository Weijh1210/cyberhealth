export type EvidenceSource={id:string;title:string;organization:string;url:string;activityIds:string[];supportedClaim:string;reviewStatus:'verified-2026-10-13'|'unverified';scope:'general-context'|'technique';copyrightNote:string};

// Links and claims are reviewed separately from action instructions. No source images or prose are copied.
export const evidenceSources:EvidenceSource[]=[
 {id:'who-sedentary-2020',title:'WHO guidelines on physical activity and sedentary behaviour',organization:'World Health Organization',url:'https://www.who.int/publications/i/item/9789240015128',activityIds:[],supportedClaim:'提供身体活动与久坐行为的公共卫生背景；不证明本 App 的 30 秒动作、提醒间隔或治疗效果。',reviewStatus:'verified-2026-10-13',scope:'general-context',copyrightNote:'仅链接和概述，不复制原文、图片或视频。'},
 {id:'whh-chin-tuck',title:'Neck range of motion exercises — patient advice sheet',organization:'Warrington and Halton Teaching Hospitals NHS Foundation Trust',url:'https://www.whh.nhs.uk/media/emlfdohl/neck-range-of-motion-exercises-patient-advice-sheet.pdf',activityIds:['chin-tuck'],supportedClaim:'支持坐直、平视、轻柔水平收下巴以及避免仰头低头的动作方向；不支持治疗宣传或本产品的 30 秒剂量。该资料提示康复人群应先得到专业指导。',reviewStatus:'verified-2026-10-13',scope:'technique',copyrightNote:'仅用自写步骤概述，不复制患者手册原文和配图。'},
 {id:'dynamic-health-neck',title:'Neck pain — exercises',organization:'Dynamic Health NHS',url:'https://www.dynamichealth.nhs.uk/help-and-advice/neck-pain/',activityIds:['chin-tuck','scapular-squeeze'],supportedClaim:'页面列出轻收下巴与坐姿肩胛靠拢动作；不证明对所有人有效，也不验证本产品的重复次数和时长。',reviewStatus:'verified-2026-10-13',scope:'technique',copyrightNote:'仅提供链接与自写说明，不使用页面图片或视频。'},
 {id:'nhs-flexibility',title:'Flexibility exercises',organization:'NHS',url:'https://www.nhs.uk/live-well/exercise/flexibility-exercises/',activityIds:[],supportedClaim:'包含颈部缓转和侧倾等动作指导；本版未据此激活相关动作。',reviewStatus:'verified-2026-10-13',scope:'general-context',copyrightNote:'仅提供链接，不复制原文和图片。'},
];
export const sourcesFor=(activityId:string)=>evidenceSources.filter(s=>s.activityIds.includes(activityId));
