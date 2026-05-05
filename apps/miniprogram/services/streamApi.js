const { buildUrl } = require('../utils/config');
const { getToken } = require('../utils/tokenStorage');
const { post } = require('./request');

function createChunkDecoder() {
  if (typeof TextDecoder !== 'undefined') {
    const decoder = new TextDecoder('utf-8');
    return (chunk) => decoder.decode(chunk, { stream: true });
  }

  return (chunk) => decodeChunkFallback(chunk);
}

function decodeChunkFallback(chunk) {
  const uint8 = new Uint8Array(chunk);
  let result = '';
  for (let index = 0; index < uint8.length; index += 1) {
    result += String.fromCharCode(uint8[index]);
  }
  return decodeURIComponent(escape(result));
}

function parseEventBlock(block) {
  const lines = block.split(/\r?\n/);
  const eventType = lines
    .find((line) => line.startsWith('event:'))
    ?.slice(6)
    .trim();
  const dataText = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');

  if (!dataText) return null;

  const data = JSON.parse(dataText);
  return {
    type: eventType || data.type || 'chunk',
    data: data.data || data,
  };
}

function consumeSseBuffer(buffer, handlers) {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop() || '';

  blocks.forEach((block) => {
    const event = parseEventBlock(block);
    if (!event) return;

    if (event.type === 'start') handlers.onStart && handlers.onStart(event.data);
    else if (event.type === 'stage' || event.type === 'tool_call') handlers.onWorkflow && handlers.onWorkflow(event.data);
    else if (event.type === 'done' || event.type === 'final') handlers.onFinal && handlers.onFinal(event.data);
    else if (event.type === 'error') handlers.onError && handlers.onError(event.data);
    else handlers.onChunk && handlers.onChunk(event.data);
  });

  return rest;
}

function startQaStream(payload, handlers = {}) {
  const token = getToken();
  const decodeChunk = createChunkDecoder();
  let buffer = '';
  let finished = false;

  const task = wx.request({
    url: buildUrl('/api/client/qa/chat/stream'),
    method: 'POST',
    data: payload,
    enableChunked: true,
    responseType: 'arraybuffer',
    header: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    success(response) {
      if (finished) return;

      if (response.statusCode < 200 || response.statusCode >= 300) {
        handlers.onError && handlers.onError({ errorMessage: `流式问答请求失败：${response.statusCode}` });
        return;
      }

      // 部分环境不会触发 onChunkReceived，此时尝试把最终响应作为非流式结果处理。
      if (response.data && response.data.byteLength) {
        try {
          buffer = consumeSseBuffer(buffer + decodeChunk(response.data), handlers);
        } catch (error) {
          handlers.onError && handlers.onError({ errorMessage: error.message });
        }
      }
    },
    fail(error) {
      if (!finished) {
        handlers.onError && handlers.onError({ errorMessage: error.errMsg || '流式问答失败' });
      }
    },
    complete() {
      finished = true;
      handlers.onComplete && handlers.onComplete();
    },
  });

  if (task && typeof task.onChunkReceived === 'function') {
    task.onChunkReceived((event) => {
      try {
        buffer = consumeSseBuffer(buffer + decodeChunk(event.data), handlers);
      } catch (error) {
        handlers.onError && handlers.onError({ errorMessage: error.message });
      }
    });
  }

  return {
    abort() {
      finished = true;
      if (task && typeof task.abort === 'function') task.abort();
    },
  };
}

function sendQuestionFallback(payload) {
  return post('/api/client/qa/chat', payload);
}

module.exports = {
  startQaStream,
  sendQuestionFallback,
};
