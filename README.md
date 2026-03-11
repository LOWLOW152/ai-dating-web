# AI 相亲助手 - 狗蛋

一个温暖、对话式的AI相亲档案生成器。

## 🎨 特点

- 💬 聊天式交互，轻松自然
- 🐶 狗蛋深度追问，了解真实的你
- 📊 30道精心设计的问题
- 📄 生成专属相亲档案
- 🔊 **语音对话模式** - 像打电话一样交流

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

创建 `.env.local` 文件：

```
KIMI_API_KEY=your_api_key_here
```

> 获取 API Key: https://platform.moonshot.cn/
> 
> 如果不配置，使用本地追问逻辑也能正常运行

### 3. 本地开发

```bash
npm run dev
```

打开 http://localhost:3000

### 4. 构建部署

```bash
npm run build
```

构建完成后，`dist` 文件夹可以直接部署到 Vercel/Netlify/任何静态托管。

## 🔊 语音功能使用说明

### 支持的浏览器
- Chrome / Edge / Safari（最新版）
- 需要麦克风权限

### 如何使用
1. 进入聊天页面，点击右上角 "🔊 语音开" 按钮开启语音模式
2. 点击麦克风按钮 🎤 开始说话
3. 说完后松开，或等待自动识别
4. 狗蛋会用语音回复你，同时显示文字

### 语音功能特点
- 🎤 **语音识别**：把你说的话转成文字
- 🔊 **语音合成**：AI回复自动播报
- 📝 **文字记录**：同时显示文字，方便回看
- ⚡ **实时交互**：像打电话一样自然

## 📦 部署到 Vercel（推荐）

1. 把代码推送到 GitHub
2. 登录 https://vercel.com
3. 导入项目
4. 添加环境变量 `KIMI_API_KEY`（可选）
5. 部署完成！

## 📝 项目结构

```
ai-dating-web/
├── components/          # React组件
│   ├── ChatMessage.js   # 聊天消息气泡（含语音播放指示）
│   ├── ProgressBar.js   # 进度条
│   └── ResultCard.js    # 结果卡片
├── pages/               # 页面
│   ├── index.js         # 首页
│   ├── chat.js          # 聊天页面（含语音功能）
│   └── result.js        # 结果页面
├── lib/                 # 核心逻辑
│   ├── questions.js     # 30道问题库
│   ├── logic.js         # 追问逻辑
│   └── api.js           # Kimi API封装
└── styles/              # 样式
    └── globals.css      # 全局样式
```

## 🎨 自定义

### 修改问题
编辑 `lib/questions.js` 中的 `questions` 数组。

### 修改样式
编辑 `tailwind.config.js` 和 `styles/globals.css`。

### 接入真实AI
目前追问逻辑使用本地规则，如需接入Kimi API：

1. 在 `chat.js` 中调用 `callKimiAPI` 替代本地追问
2. 配置 `KIMI_API_KEY` 环境变量

## 📄 License

MIT