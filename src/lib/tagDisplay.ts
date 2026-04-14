// 标签有趣化映射表
export const tagDisplayMap: Record<string, Record<string, { text: string; emoji: string; color: string }>> = {
  "生活方式_消费观": {
    "节俭存钱型": { text: "人间清醒存钱罐", emoji: "🐷", color: "green" },
    "量入为出型": { text: "消费主义逆行者", emoji: "🚶", color: "blue" },
    "适度享受型": { text: "该花就花型选手", emoji: "💳", color: "amber" },
    "品质优先型": { text: "精致穷 but 体面", emoji: "✨", color: "purple" },
    "未提及": { text: "消费观待解锁", emoji: "❓", color: "gray" },
  },
  "生活方式_作息类型": {
    "早睡早起(7点前起)": { text: "晨型人类", emoji: "🌅", color: "orange" },
    "正常作息(8-9点起)": { text: "正常人类", emoji: "😊", color: "blue" },
    "弹性作息": { text: "时间自由人", emoji: "🌀", color: "purple" },
    "夜猫子(12点后睡)": { text: "午夜修仙党", emoji: "🌙", color: "indigo" },
    "未提及": { text: "作息神秘人", emoji: "❓", color: "gray" },
  },
  "生活方式_周末偏好": {
    "居家休息型": { text: "被窝探险家", emoji: "🛌", color: "blue" },
    "外出社交型": { text: "社交永动机", emoji: "🎉", color: "pink" },
    "平衡型": { text: "动静皆宜型", emoji: "⚖️", color: "amber" },
    "户外/运动型": { text: "周末野人", emoji: "🏃", color: "green" },
    "未提及": { text: "周末薛定谔", emoji: "❓", color: "gray" },
  },
  "生活方式_兴趣爱好大类": {
    "文艺类(书/影/音/展)": { text: "文艺细胞过剩", emoji: "📚", color: "purple" },
    "运动健身类": { text: "多巴胺分泌爱好者", emoji: "💪", color: "green" },
    "游戏/动漫类": { text: "二次元居民", emoji: "🎮", color: "blue" },
    "户外/旅行类": { text: "山川湖海收藏家", emoji: "🏔️", color: "green" },
    "未提及": { text: "兴趣待开发", emoji: "❓", color: "gray" },
  },
  "情感模式_依恋类型": {
    "安全型": { text: "情绪稳定的成年人", emoji: "🧘", color: "green" },
    "焦虑型(需要频繁确认)": { text: "需要被反复确认的小朋友", emoji: "💌", color: "pink" },
    "回避型(需要独处空间)": { text: "亲密关系里的蜗牛", emoji: "🐌", color: "blue" },
    "恐惧型(既渴望又害怕)": { text: "想爱又怂的矛盾体", emoji: "😰", color: "purple" },
    "未明确": { text: "依恋模式探索中", emoji: "❓", color: "gray" },
  },
  "情感模式_情感需求等级": {
    "高(需要大量陪伴)": { text: "高浓度情感需求者", emoji: "🔥", color: "red" },
    "中高": { text: "情感浓度偏高", emoji: "🌡️", color: "orange" },
    "中等": { text: "情感浓度适中", emoji: "🍵", color: "amber" },
    "较低": { text: "低功耗运行型", emoji: "🔋", color: "blue" },
    "未提及": { text: "情感需求待探测", emoji: "❓", color: "gray" },
  },
  "情感模式_冲突处理风格": {
    "直接沟通型": { text: "有话直说型选手", emoji: "🥊", color: "red" },
    "冷静后沟通型": { text: "隔夜仇不存在的冷处理大师", emoji: "❄️", color: "blue" },
    "回避退让型": { text: "和平主义退让者", emoji: "🕊️", color: "green" },
    "需要调解型": { text: "需要外援的冲突小白", emoji: "🆘", color: "amber" },
    "未提及": { text: "冲突处理方式未知", emoji: "❓", color: "gray" },
  },
};

// 灵魂ID卡组合规则
export function generateSoulIdCard(tags: Record<string, string | string[]>): string {
  const interest = tags["生活方式_兴趣爱好大类"] || "未知";
  const attachment = tags["情感模式_依恋类型"] || "未知";
  const weekend = tags["生活方式_周末偏好"] || "未知";
  const consumption = tags["生活方式_消费观"] || "未知";
  const emotion = tags["情感模式_情感需求等级"] || "未知";

  // 获取有趣化标签
  const getDisplay = (key: string, val: string) => tagDisplayMap[key]?.[val]?.text || val;

  const i = getDisplay("生活方式_兴趣爱好大类", interest as string);
  const a = getDisplay("情感模式_依恋类型", attachment as string);
  const w = getDisplay("生活方式_周末偏好", weekend as string);
  const c = getDisplay("生活方式_消费观", consumption as string);
  const e = getDisplay("情感模式_情感需求等级", emotion as string);

  // 组合策略：根据特征生成最有画面感的一句话
  const patterns = [
    `一个${w}的${c}`,
    `表面${a}，实则是${e}`,
    `爱好${i}的${w}`,
    `${c}兼${a}`,
    `周末${w}，平时${c}`,
  ];

  // 简单组合成一句话
  if (weekend !== "未提及" && consumption !== "未提及" && attachment !== "未提及") {
    return `${w}的${c}，${a}`;
  }
  if (weekend !== "未提及" && consumption !== "未提及") {
    return `${w}的${c}`;
  }
  if (attachment !== "未提及" && emotion !== "未提及") {
    return `${a}，${e}`;
  }
  if (consumption !== "未提及") {
    return `${c}`;
  }
  if (attachment !== "未提及") {
    return `${a}`;
  }

  return "一个正在自我探索的有趣灵魂";
}

// 获取标签的展示信息
export function getTagDisplay(dimension: string, value: string) {
  return tagDisplayMap[dimension]?.[value] || { text: value, emoji: "🏷️", color: "gray" };
}

// 颜色映射到 Tailwind 类名
export const colorMap: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  green: { bg: "bg-green-500", text: "text-green-700", border: "border-green-200", lightBg: "bg-green-50" },
  blue: { bg: "bg-blue-500", text: "text-blue-700", border: "border-blue-200", lightBg: "bg-blue-50" },
  amber: { bg: "bg-amber-500", text: "text-amber-700", border: "border-amber-200", lightBg: "bg-amber-50" },
  purple: { bg: "bg-purple-500", text: "text-purple-700", border: "border-purple-200", lightBg: "bg-purple-50" },
  pink: { bg: "bg-pink-500", text: "text-pink-700", border: "border-pink-200", lightBg: "bg-pink-50" },
  indigo: { bg: "bg-indigo-500", text: "text-indigo-700", border: "border-indigo-200", lightBg: "bg-indigo-50" },
  red: { bg: "bg-red-500", text: "text-red-700", border: "border-red-200", lightBg: "bg-red-50" },
  orange: { bg: "bg-orange-500", text: "text-orange-700", border: "border-orange-200", lightBg: "bg-orange-50" },
  gray: { bg: "bg-gray-500", text: "text-gray-700", border: "border-gray-200", lightBg: "bg-gray-50" },
};
