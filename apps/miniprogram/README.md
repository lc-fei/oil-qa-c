# 油井工程智能问答微信小程序端

## 打开方式

1. 使用微信开发者工具打开 `apps/miniprogram`。
2. 首次本地联调可在开发者工具中关闭“校验合法域名”。
3. 正式预览或上传前，将 `project.config.json` 中的 `appid` 从 `touristappid` 替换为真实小程序 AppID。

## 接口配置

小程序页面统一通过 `apps/miniprogram/sdk/miniprogramSdk.js` 接入业务能力。SDK 接入层再通过 `sdkTransport.js` 分发到 `services/*Api.js`，`services` 仅作为小程序平台 transport，不作为页面业务入口。

小程序默认请求 `http://localhost:8080`。需要配置其他后端地址时，可在调试控制台写入：

```js
wx.setStorageSync('oil_qa_base_url', 'https://your-api.example.com')
```

重新进入小程序后会自动读取该地址。接口默认遵循 C 端文档：

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/client/qa/sessions`
- `POST /api/client/qa/chat/stream`
- `POST /api/client/qa/messages/{messageId}/cancel`
- `GET /api/client/qa/messages/{messageId}/evidence`
- `GET /api/client/favorites`
- `POST /api/client/messages/{messageId}/favorite`
- `POST /api/client/messages/{messageId}/feedback`

## 流式联调说明

小程序端先通过 SDK façade 创建本地 stream 状态，再使用 `wx.request` 的 `enableChunked` 和 `onChunkReceived` 消费 SSE。若基础库、开发者工具或网关不透传 chunk，页面会经 SDK façade 降级调用非流式 `POST /api/client/qa/chat`，用于保证问答闭环可验证。

正式环境需要确认：

- 后端域名已加入小程序 request 合法域名。
- 网关未缓冲 `text/event-stream`。
- 后端返回 `start`、`stage`、`tool_call`、`chunk`、`done`、`error` 事件格式与接口文档一致。

## 本地检查

```bash
pnpm --filter @oil-qa-c/miniprogram typecheck
```

该命令检查关键小程序文件存在，并校验核心 JSON 配置可解析。
