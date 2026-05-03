import type { MessageChunk, QaWorkflow, SendQuestionPayload, SendQuestionResponse } from '@oil-qa-c/shared';
import { getTokenStorage } from '@oil-qa-c/shared';
import { getApiRuntimeBaseUrl } from '../client';

export interface QaStreamHandlers {
  onStart?: (chunk: MessageChunk) => void;
  onWorkflow?: (chunk: MessageChunk) => void;
  onChunk: (chunk: MessageChunk) => void;
  onFinal: (response: SendQuestionResponse) => void;
}

export interface QaStreamController {
  abort: () => void;
  done: Promise<void>;
}

interface QaStreamEvent {
  type?: string;
  data?: unknown;
}

interface QaStreamResultPayload {
  requestNo: string;
  sessionId: number;
  sessionNo: string;
  messageId: number;
  messageNo: string;
  sequence: number;
  delta: string;
  done: boolean;
  errorMessage: string | null;
  result?: {
    question: string;
    answer: string;
    followUps: string[];
    status: SendQuestionResponse['status'];
    timings: SendQuestionResponse['timings'];
    evidenceSummary: SendQuestionResponse['evidenceSummary'];
    workflow?: QaWorkflow | null;
  };
  workflow?: QaWorkflow | null;
}

function buildUrl(path: string) {
  const baseURL = getApiRuntimeBaseUrl();

  if (!baseURL) {
    return path;
  }

  return `${baseURL.replace(/\/$/, '')}${path}`;
}

function parseEventPayload(raw: string, eventType?: string): QaStreamEvent {
  const parsed = JSON.parse(raw) as QaStreamEvent | MessageChunk | SendQuestionResponse;

  if (typeof parsed === 'object' && parsed !== null && 'type' in parsed && 'data' in parsed) {
    return parsed as QaStreamEvent;
  }

  if (eventType) {
    return {
      type: eventType,
      data: parsed,
    };
  }

  if (typeof parsed === 'object' && parsed !== null && 'answer' in parsed) {
    return {
      type: 'done',
      data: parsed,
    };
  }

  return {
    type: 'chunk',
    data: parsed,
  };
}

function mapStreamResultToResponse(payload: QaStreamResultPayload): SendQuestionResponse {
  if (!payload.result) {
    throw new Error('流式结束事件缺少 result 字段');
  }

  return {
    sessionId: payload.sessionId,
    sessionNo: payload.sessionNo,
    messageId: payload.messageId,
    messageNo: payload.messageNo,
    requestNo: payload.requestNo,
    question: payload.result.question,
    answer: payload.result.answer,
    followUps: payload.result.followUps,
    status: payload.result.status,
    timings: payload.result.timings,
    evidenceSummary: payload.result.evidenceSummary,
    workflow: payload.result.workflow ?? payload.workflow ?? null,
  };
}

function consumeSseBlock(block: string, handlers: QaStreamHandlers) {
  const eventType = block
    .split('\n')
    .map((line) => line.trimEnd())
    .find((line) => line.startsWith('event:'))
    ?.slice(6)
    .trim();
  const dataLines = block
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length === 0) {
    return;
  }

  const event = parseEventPayload(dataLines.join('\n'), eventType);

  if (event.type === 'start') {
    handlers.onStart?.(event.data as MessageChunk);
    return;
  }

  if (event.type === 'stage' || event.type === 'tool_call') {
    // stage/tool_call 不追加回答正文，只推动流程 UI 的最新快照。
    handlers.onWorkflow?.(event.data as MessageChunk);
    return;
  }

  if (event.type === 'done' || event.type === 'final') {
    handlers.onFinal(mapStreamResultToResponse(event.data as QaStreamResultPayload));
    return;
  }

  if (event.type === 'error') {
    const payload = event.data as QaStreamResultPayload;

    if (payload.result) {
      handlers.onFinal(mapStreamResultToResponse(payload));
    }

    const message =
      typeof event.data === 'object' && event.data !== null && 'message' in event.data
        ? String((event.data as { message?: unknown }).message)
        : payload.errorMessage
          ? payload.errorMessage
        : '流式问答失败';
    throw new Error(message);
  }

  handlers.onChunk(event.data as MessageChunk);
}

export async function cancelQaStreamMessage(messageId: number, requestNo?: string) {
  const token = getTokenStorage().getToken();
  const response = await fetch(buildUrl(`/api/client/qa/messages/${messageId}/cancel`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      requestNo,
      reason: 'USER_CANCEL',
    }),
  });

  if (!response.ok) {
    throw new Error(`取消流式生成失败：${response.status}`);
  }

  return response.json() as Promise<{
    code?: number;
    message?: string;
    data?: {
      messageId: number;
      requestNo: string;
      status: 'INTERRUPTED' | 'PARTIAL_SUCCESS';
      answer: string;
      interruptedReason: string;
    };
  }>;
}

export function startQaStream(payload: SendQuestionPayload, handlers: QaStreamHandlers): QaStreamController {
  const abortController = new AbortController();

  const done = (async () => {
    const token = getTokenStorage().getToken();
    const response = await fetch(buildUrl('/api/client/qa/chat/stream'), {
      method: 'POST',
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      throw new Error(`流式问答请求失败：${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done: streamDone } = await reader.read();

      if (streamDone) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        // SSE 网络读取属于客户端平台能力，业务最终归并仍交给 SDK。
        consumeSseBlock(block, handlers);
      }
    }

    if (buffer.trim()) {
      consumeSseBlock(buffer, handlers);
    }
  })();

  return {
    abort: () => abortController.abort(),
    done,
  };
}
