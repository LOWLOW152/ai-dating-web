# 题库匹配系统 V2 部署指南

## 部署步骤

### 1. 执行数据库迁移

在 Vercel 控制台或使用本地环境执行：

```bash
# 方法1: Vercel CLI (推荐)
vercel --prod

# 然后进入 Vercel 控制台 -> Storage -> 你的数据库 -> Query
# 执行 migrations/004_question_system.sql 中的 SQL
```

### 2. 迁移现有数据

部署后，访问以下 API 触发迁移：

```
POST /api/admin/migrate-to-v2
Authorization: Bearer {admin_token}
```

或者本地执行：

```bash
cd ai-dating-web
node scripts/migrate-to-v2.js
```

### 3. 验证迁移结果

1. 登录后台 `/admin`
2. 点击导航栏「题库管理」查看30题是否正确导入
3. 点击「类别权重」查看6大维度
4. 点击「算法测试」测试匹配算法

---

## 新系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      题库管理 V2                          │
├─────────────────────────────────────────────────────────┤
│  问题分类 (6大维度)                                        │
│  ├── 基础条件 (权重7) - 年龄、城市、异地                   │
│  ├── 兴趣话题 (权重6) - 爱好、旅行                        │
│  ├── 生活方式 (权重6) - 消费、作息、整洁                   │
│  ├── 价值观   (权重8) - 家庭、人生选择                     │
│  ├── 情感核心 (权重9) - 依恋、需求、冲突                   │
│  └── 社交模式 (权重5) - 圈子、角色                         │
├─────────────────────────────────────────────────────────┤
│  匹配算法 (8种)                                           │
│  ├── must_match        - 必须相同 (硬条件)                 │
│  ├── set_similarity    - 集合相似度 (兴趣)                 │
│  ├── level_similarity  - 等级相似 (消费观)                 │
│  ├── level_complementary - 等级互补 (社交角色)             │
│  ├── range_compatible  - 范围相容 (年龄)                   │
│  ├── keyword_blocker   - 关键词红线 (deal breakers)        │
│  ├── semantic_similarity - 语义相似 (AI)                   │
│  └── no_match          - 不参与匹配                        │
├─────────────────────────────────────────────────────────┤
│  偏好问题 (可选)                                          │
│  ├── 相同 - 相似度越高越好                                 │
│  ├── 互补 - 40-70%相似度最佳                               │
│  └── 无所谓 - 固定70分                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 新增后台页面

| 页面 | 路径 | 功能 |
|-----|------|------|
| 题库管理 | `/admin/questions` | 查看/新增/编辑问题 |
| 问题编辑 | `/admin/questions/[id]` | 4个Tab：基本信息/匹配设置/偏好问题/AI追问 |
| 类别权重 | `/admin/categories` | 6大维度权重设置 |
| 算法测试 | `/admin/match-test` | 实时测试匹配算法 |

---

## 扩展新算法

在 `lib/match-algorithms/index.js` 中注册：

```javascript
import { registerAlgorithm } from './index';

registerAlgorithm('my_algorithm', 
  function myAlgo(answerA, answerB, config) {
    // 计算逻辑
    return { score: 80, details: {...} };
  },
  {
    displayName: '我的算法',
    description: '算法说明',
    paramsSchema: {
      param1: { type: 'number', default: 10, label: '参数1' }
    }
  }
);
```

---

## 回滚方案

如需回滚到 V1：

1. 备份 `questions`, `user_answers` 表
2. 代码回滚到上一版本
3. 数据仍在 `question_bank` 和 `profiles` 表中
