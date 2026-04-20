import type { LoginRequest } from '@oil-qa-c/shared';

export interface ApiClientOptions {
  baseURL?: string;
  getToken?: () => string | null;
}

export interface ApiClient {
  options: ApiClientOptions;
  post<TRequest, TResponse>(url: string, payload: TRequest): Promise<TResponse>;
  get<TResponse>(url: string): Promise<TResponse>;
  put<TRequest>(url: string, payload: TRequest): Promise<void>;
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
  apiRuntimeConfig.baseURL = options.baseURL ?? '';
}

function buildUrl(baseURL: string, url: string) {
  if (!baseURL) {
    return url;
  }

  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${baseURL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

async function parseResponse<TResponse>(response: Response): Promise<TResponse> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }

    return undefined as TResponse;
  }

  const payload = (await response.json()) as ApiResultEnvelope<TResponse> | TResponse;

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
    put(url, payload) {
      return request<void>(url, {
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
