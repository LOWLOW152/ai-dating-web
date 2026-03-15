# 照片颜值打分功能设计

## 功能概述
用户上传照片，通过 AI 进行颜值评分，作为档案的可选展示信息。

## 技术方案对比

| 方案 | 优点 | 缺点 | 成本 |
|:---|:---|:---|:---|
| 阿里云人脸识别 | 准确率高，文档完善 | 需要阿里云账号 | 按调用次数 |
| 腾讯云人脸分析 | 功能丰富 | 需要腾讯云账号 | 按调用次数 |
| 百度 AI 人脸 | 有免费额度 | 准确率一般 | 有免费额度 |
| 开源模型 | 免费 | 部署复杂，准确率不确定 | 服务器成本 |

**推荐方案**：阿里云人脸识别（已有阿里云账号）

## 阿里云 API 对接

### 1. API 选择
- **人脸属性检测**（DetectFace）
- 返回：颜值分数（0-100）、年龄、性别、表情等

### 2. 接口文档
```
Endpoint: https://face.cn-shanghai.aliyuncs.com/
Action: DetectFace
Parameters:
  - ImageURL: 照片URL
  - MaxFaceNum: 1
  - Attributes: FaceAttribute（包含颜值）
```

### 3. 响应示例
```json
{
  "FaceAttributes": [{
    "FaceRectangle": {"Left": 100, "Top": 100, "Width": 200, "Height": 200},
    "FaceAttribute": {
      "Gender": {"Value": "Male", "Confidence": 99.9},
      "Age": {"Value": 25},
      "Smile": {"Value": 80},
      "Attractiveness": {"Value": 75.5}  // 颜值分数
    }
  }]
}
```

## 功能设计

### 1. 上传流程
```
用户选择照片 → 前端压缩 → 上传到图床/OSS → 调用 API → 返回分数
```

### 2. 页面设计
- **入口**：问卷最后一页 或 档案页面
- **界面**：
  - 照片预览框
  - 上传按钮
  - 评分结果显示（可选）
  - 重新上传按钮

### 3. 隐私处理
- 明确告知用户照片用途
- 提供"不打分"选项
- 照片仅用于评分，不公开显示（可选）

### 4. 分数展示
| 分数区间 | 等级 | 描述 |
|:---:|:---|:---|
| 90-100 | S | 颜值担当 |
| 80-89 | A | 魅力出众 |
| 70-79 | B | 颜值在线 |
| 60-69 | C | 阳光健康 |
| <60 | D | 气质独特 |

## 数据库设计

```sql
-- 在 profiles 表添加字段
ALTER TABLE profiles ADD COLUMN photo_url TEXT;
ALTER TABLE profiles ADD COLUMN attractiveness_score DECIMAL(4,1);
ALTER TABLE profiles ADD COLUMN photo_analyzed_at TIMESTAMP;

-- 或新建表
CREATE TABLE profile_photos (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id),
  photo_url TEXT NOT NULL,
  attractiveness_score DECIMAL(4,1),
  age_estimate INTEGER,
  gender_confidence DECIMAL(5,2),
  analyzed_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

## API 设计

```javascript
// POST /api/upload-photo
// Content-Type: multipart/form-data
{
  "photo": File,
  "invite_code": "string"
}

// Response
{
  "success": true,
  "photo_url": "https://...",
  "analysis": {
    "attractiveness": 78.5,
    "age": 26,
    "gender": "Male",
    "level": "B"
  }
}
```

## 实现步骤

1. 配置阿里云 AK/SK
2. 实现图片上传到 OSS（或 Base64 直接调用）
3. 封装 DetectFace API 调用
4. 前端上传组件
5. 结果展示页面

## 费用估算

阿里云人脸属性检测：
- 价格：约 0.001-0.01 元/次
- 1000 次 = 1-10 元

## 备选方案

如果阿里云审核不通过或成本高，可用：
- 百度 AI 人脸（有免费额度 5万/天）
- 去掉颜值打分，只做人脸检测（确保上传的是真人照片）
