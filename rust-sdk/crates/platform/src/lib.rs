use std::cell::RefCell;

use js_sys::{Function, Promise, Reflect};
use oil_qa_core::{SdkError, SdkResult};
use serde::{Serialize, de::DeserializeOwned};
use serde_json::Value;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;

thread_local! {
    static TRANSPORT_HANDLER: RefCell<Option<Function>> = const { RefCell::new(None) };
    static STORAGE_HANDLER: RefCell<Option<Function>> = const { RefCell::new(None) };
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransportInvokeRequest {
    pub method: String,
    pub payload: Value,
    pub auth_token: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInvokeRequest {
    pub action: String,
    pub key: String,
    pub value: Option<String>,
}

fn map_js_error(prefix: &str, error: JsValue) -> SdkError {
    let message = error
        .as_string()
        .unwrap_or_else(|| format!("{prefix}失败，且错误对象不可直接转为字符串"));
    SdkError::new("SDK_PLATFORM_ERROR", format!("{prefix}: {message}"))
}

async fn call_registered_handler(handler: &Function, payload: JsValue, action_name: &str) -> SdkResult<JsValue> {
    let result = handler
        .call1(&JsValue::NULL, &payload)
        .map_err(|error| map_js_error(action_name, error))?;
    let promise = result
        .dyn_into::<Promise>()
        .map_err(|_| SdkError::new("SDK_PLATFORM_ERROR", format!("{action_name}未返回 Promise")))?;

    JsFuture::from(promise)
        .await
        .map_err(|error| map_js_error(action_name, error))
}

/// bindings 在初始化阶段注册平台 transport，后续业务模块只依赖这里的统一调用入口。
pub fn register_transport(handler: Function) {
    TRANSPORT_HANDLER.with(|slot| {
        slot.replace(Some(handler));
    });
}

/// bindings 在初始化阶段注册平台 storage，SDK 再通过 key-value 语义读写持久化数据。
pub fn register_storage(handler: Function) {
    STORAGE_HANDLER.with(|slot| {
        slot.replace(Some(handler));
    });
}

/// SDK 内部统一通过 method + payload 调 transport，业务模块不直接感知 JS 平台实现细节。
pub async fn invoke_transport<TResponse>(
    method: &str,
    payload: Value,
    auth_token: Option<String>,
) -> SdkResult<TResponse>
where
    TResponse: DeserializeOwned,
{
    let handler = TRANSPORT_HANDLER
        .with(|slot| slot.borrow().clone())
        .ok_or_else(|| SdkError::new("SDK_TRANSPORT_MISSING", "尚未注册平台 transport"))?;
    let request = serde_wasm_bindgen::to_value(&TransportInvokeRequest {
        method: method.to_string(),
        payload,
        auth_token,
    })
    .map_err(|error| SdkError::new("SDK_TRANSPORT_SERIALIZE_ERROR", format!("transport 请求序列化失败: {error}")))?;
    let response = call_registered_handler(&handler, request, "transport 调用").await?;

    serde_wasm_bindgen::from_value(response)
        .map_err(|error| SdkError::new("SDK_TRANSPORT_PARSE_ERROR", format!("transport 响应解析失败: {error}")))
}

/// storage 抽象统一以 key-value 形式暴露，后续可平滑映射到浏览器、本地数据库或移动端存储。
pub async fn storage_get(key: &str) -> SdkResult<Option<String>> {
    let handler = STORAGE_HANDLER
        .with(|slot| slot.borrow().clone())
        .ok_or_else(|| SdkError::new("SDK_STORAGE_MISSING", "尚未注册平台 storage"))?;
    let payload = serde_wasm_bindgen::to_value(&StorageInvokeRequest {
        action: "get".to_string(),
        key: key.to_string(),
        value: None,
    })
    .map_err(|error| SdkError::new("SDK_STORAGE_SERIALIZE_ERROR", format!("storage get 请求序列化失败: {error}")))?;
    let response = call_registered_handler(&handler, payload, "storage get").await?;

    if response.is_null() || response.is_undefined() {
        return Ok(None);
    }

    if let Some(text) = response.as_string() {
        return Ok(Some(text));
    }

    if Reflect::has(&response, &JsValue::from_str("value")).unwrap_or(false) {
        let value = Reflect::get(&response, &JsValue::from_str("value"))
            .map_err(|error| map_js_error("storage value 读取", error))?;
        return Ok(value.as_string());
    }

    Err(SdkError::new(
        "SDK_STORAGE_PARSE_ERROR",
        "storage get 响应格式不正确",
    ))
}

pub async fn storage_set(key: &str, value: &str) -> SdkResult<()> {
    let handler = STORAGE_HANDLER
        .with(|slot| slot.borrow().clone())
        .ok_or_else(|| SdkError::new("SDK_STORAGE_MISSING", "尚未注册平台 storage"))?;
    let payload = serde_wasm_bindgen::to_value(&StorageInvokeRequest {
        action: "set".to_string(),
        key: key.to_string(),
        value: Some(value.to_string()),
    })
    .map_err(|error| SdkError::new("SDK_STORAGE_SERIALIZE_ERROR", format!("storage set 请求序列化失败: {error}")))?;

    let _ = call_registered_handler(&handler, payload, "storage set").await?;
    Ok(())
}

pub async fn storage_remove(key: &str) -> SdkResult<()> {
    let handler = STORAGE_HANDLER
        .with(|slot| slot.borrow().clone())
        .ok_or_else(|| SdkError::new("SDK_STORAGE_MISSING", "尚未注册平台 storage"))?;
    let payload = serde_wasm_bindgen::to_value(&StorageInvokeRequest {
        action: "remove".to_string(),
        key: key.to_string(),
        value: None,
    })
    .map_err(|error| SdkError::new("SDK_STORAGE_SERIALIZE_ERROR", format!("storage remove 请求序列化失败: {error}")))?;

    let _ = call_registered_handler(&handler, payload, "storage remove").await?;
    Ok(())
}

/// 平台模块当前已提供 transport / storage 注册与调用能力。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
