# 抖音内容选择功能设计

## 功能概述
通过让用户选择感兴趣的抖音内容类型，推断其兴趣标签，补充或验证 hobby_type 题目的答案。

## 页面设计

### 1. 新增题目：douyin_interests
- **位置**：第三部分（兴趣爱好）
- **类型**：多选题（卡片式网格）
- **题目**：刷抖音时，你最容易被哪些内容吸引？（可多选）

### 2. 内容分类（10类）
| 分类 | 图标 | 描述 | 映射兴趣 |
|:---|:---|:---|:---|
| 😂 搞笑段子 | 笑脸 | 幽默视频、段子、meme | 幽默/娱乐 |
| 🍜 美食探店 | 餐具 | 美食制作、探店、吃播 | 烹饪烘焙 |
| ✈️ 旅行风景 | 飞机 | 旅游vlog、风景、打卡 | 旅行户外 |
| 📚 知识科普 | 书本 | 科普、历史、技能教学 | 阅读写作 |
| 💄 美妆时尚 | 口红 | 化妆、穿搭、潮流 | 逛街购物 |
| 🎮 游戏电竞 | 手柄 | 游戏、电竞、直播 | 游戏电竞 |
| 🐱 萌宠动物 | 爪印 | 猫狗、萌宠、动物 | （新增标签） |
| 🎵 音乐舞蹈 | 音符 | 音乐、舞蹈、翻唱 | 音乐乐器 |
| 🎬 影视剪辑 | 电影 | 影视解说、剪辑、二创 | 看电影追剧 |
| 📷 生活Vlog | 相机 | 日常、记录、生活方式 | 摄影拍照 |

### 3. 交互设计
- 卡片网格布局（2列或3列）
- 点击选中/取消选中
- 选中状态有视觉反馈（边框高亮）
- 底部显示已选数量
- 至少选3个，最多不限

### 4. 数据映射
```javascript
const douyinToHobbyMap = {
  'funny': ['幽默风趣'],
  'food': ['烹饪烘焙', '美食探索'],
  'travel': ['旅行户外', '摄影拍照'],
  'knowledge': ['阅读写作', '学习成长'],
  'beauty': ['逛街购物', '时尚穿搭'],
  'gaming': ['游戏电竞'],
  'pets': ['萌宠动物'],
  'music': ['音乐乐器', '唱歌跳舞'],
  'movie': ['看电影追剧'],
  'vlog': ['摄影拍照', '生活记录']
};
```

### 5. 后端逻辑
- 保存用户选择
- 自动映射到兴趣标签
- 与 hobby_type 答案交叉验证
- 如果差异大，提示用户确认

### 6. 匹配算法
- 相同内容类型越多 → 兴趣匹配度越高
- 映射后的标签与 hobby_type 叠加计算

## 数据库设计

```sql
-- 新增题目
INSERT INTO questions (question_key, category_key, part, display_order, main_text, main_type, main_options, has_preference, is_active)
VALUES (
  'douyin_interests',
  'interest',
  3,
  16,
  '刷抖音时，你最容易被哪些内容吸引？',
  'multiple',
  '[...]'::jsonb,
  false,
  true
);

-- 新增标签表（用于映射）
CREATE TABLE content_to_tags (
  content_type VARCHAR(50) PRIMARY KEY,
  tags TEXT[]
);
```

## API 设计

```javascript
// POST /api/analyze-interests
{
  "douyin_selections": ["food", "travel", "vlog"],
  "hobby_answers": ["摄影拍照", "旅行户外"]
}

// Response
{
  "inferred_tags": ["美食探索", "旅行户外", "生活记录", "摄影拍照"],
  "consistency_score": 75,  // 与 hobby_type 的一致性
  "suggestions": ["您选择了美食内容，但 hobby 没选烹饪，是否添加？"]
}
```
