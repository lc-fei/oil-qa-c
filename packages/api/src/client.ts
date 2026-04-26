import type { LoginRequest } from '@oil-qa-c/shared';

export interface ApiClientOptions {
  baseURL?: string;
  getToken?: () => string | null;
}

export interface ApiClient {
  options: ApiClientOptions;
  post<TRequest, TResponse>(url: string, payload: TRequest): Promise<TResponse>;
  get<TResponse>(url: string): Promise<TResponse>;
  put<TRequest, TResponse = void>(url: string, payload: TRequest): Promise<TResponse>;
  delete(url: string): Promise<void>;
}

interface ApiResultEnvelope<TData> {
  code?: number | string;
  message?: string;
  data?: TData;
}

const apiRuntimeConfig: Required<Pick<ApiClientOptions, 'baseURL'>> = {
  baseURL: '',
};

export function configureApiRuntime(options: Pick<ApiClientOptions, 'baseURL'>) {
  // 运行时 baseURL 由应用启动阶段注入，避免各业务模块各自读取环境变量。
  apiRuntimeConfig.baseURL = options.baseURL ?? '';
}

export function getApiRuntimeBaseUrl() {
  return apiRuntimeConfig.baseURL;
}

function buildUrl(baseURL: string, url: string) {
  // 未配置 baseURL 时走 Vite 代理或同源部署，便于本地开发和生产部署复用同一套请求代码。
  if (!baseURL) {
    return url;
  }

  // 绝对地址不再拼接 baseURL，保留后续接入外部服务的能力。
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${baseURL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

async function parseResponse<TResponse>(response: Response): Promise<TResponse> {
  const contentType = response.headers.get('content-type') ?? '';

  // 删除、登出等接口可能没有 JSON body，只要 HTTP 状态成功就视为完成。
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }

    return undefined as TResponse;
  }

  const payload = (await response.json()) as ApiResultEnvelope<TResponse> | TResponse;

  // HTTP 层失败优先透传后端 message，方便页面展示真实业务错误。
  if (!response.ok) {
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      throw new Error(String(payload.message ?? `请求失败：${response.status}`));
    }

    throw new Error(`请求失败：${response.status}`);
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    ('data' in payload || 'code' in payload || 'message' in payload)
  ) {
    const envelope = payload as ApiResultEnvelope<TResponse>;

    // 后端统一 Result 中 code 非成功时，前端直接抛错，让调用方进入统一 catch 流程。
    if (typeof envelope.code !== 'undefined' && envelope.code !== 0 && envelope.code !== 200) {
      throw new Error(envelope.message ?? '请求失败');
    }

    return envelope.data as TResponse;
  }

  return payload as TResponse;
}

// API 客户端统一负责请求构造、token 注入和 Result 包装结构解包。
export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  async function request<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
    const token = options.getToken?.();
    // token 注入收口在客户端 transport 层，SDK 只表达调用语义，不直接操作浏览器请求头。
    const response = await fetch(buildUrl(options.baseURL ?? apiRuntimeConfig.baseURL, url), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    return parseResponse<TResponse>(response);
  }

  return {
    options,
    post(url, payload) {
      return request(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    get(url) {
      return request(url, {
        method: 'GET',
      });
    },
    put<TRequest, TResponse = void>(url: string, payload: TRequest) {
      return request<TResponse>(url, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    delete(url) {
      return request<void>(url, {
        method: 'DELETE',
      });
    },
  };
}

// 保留一个强类型示例，方便后续接入真实请求时快速替换。
export type LoginApiContract = (payload: LoginRequest) => Promise<unknown>;
