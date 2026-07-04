# aiChat-frontend

基于 Vue3 + Vite + Element Plus 的 AI 对话前端应用。

## 功能特性

- 对话窗口：支持与 AI 进行实时对话
- 模型选择：可选择不同的 AI 模型
- 流式响应：支持 SSE 流式输出，实时显示 AI 回复
- 美观界面：现代化 UI 设计

## 技术栈

- Vue 3.4
- Vite 5
- Element Plus 2.6
- Axios

## 项目结构

```
aiChat-frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js
    ├── App.vue
    ├── api/
    │   └── chat.js
    ├── components/
    │   └── ChatWindow.vue
    └── styles/
        └── main.css
```

## 后端接口

项目对接 aiChat 后端服务，主要接口：

- `GET /api/chat/models` - 获取可用模型列表
- `POST /api/chat/message` - 发送对话消息（SSE 流式响应）

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

默认访问地址：http://localhost:5173

### 构建生产版本

```bash
npm run build
```

## 配置

后端 API 代理配置在 `vite.config.js` 中，默认代理到 `http://localhost:9001`。

## 使用说明

1. 启动后端 aiChat 服务（端口 9001）
2. 启动前端开发服务器
3. 在页面上方选择 AI 模型
4. 输入消息并发送，即可与 AI 对话