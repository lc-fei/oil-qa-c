use std::ffi::{CStr, CString, c_char};
use std::sync::{Mutex, OnceLock};

use oil_qa_core::SdkError;
use serde::{Deserialize, Serialize};

#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use jni::objects::{JClass, JString};
#[cfg(target_os = "android")]
use jni::sys::jstring;

type EventCallback = extern "C" fn(*const c_char);

static EVENT_CALLBACK: OnceLock<Mutex<Option<EventCallback>>> = OnceLock::new();
static AUTH_TOKEN: OnceLock<Mutex<Option<String>>> = OnceLock::new();
static CURRENT_USER: OnceLock<Mutex<Option<serde_json::Value>>> = OnceLock::new();

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InvokeRequest {
    method: String,
    #[serde(default)]
    payload: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InvokeResponse {
    ok: bool,
    method: String,
    data: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InvokeError {
    ok: bool,
    code: String,
    message: String,
}

fn callback_slot() -> &'static Mutex<Option<EventCallback>> {
    EVENT_CALLBACK.get_or_init(|| Mutex::new(None))
}

fn auth_token_slot() -> &'static Mutex<Option<String>> {
    AUTH_TOKEN.get_or_init(|| Mutex::new(None))
}

fn current_user_slot() -> &'static Mutex<Option<serde_json::Value>> {
    CURRENT_USER.get_or_init(|| Mutex::new(None))
}

fn to_c_string(value: String) -> *mut c_char {
    match CString::new(value) {
        Ok(text) => text.into_raw(),
        Err(_) => CString::new("{\"ok\":false,\"code\":\"SDK_STRING_ERROR\",\"message\":\"响应包含非法空字符\"}")
            .expect("static error json is valid")
            .into_raw(),
    }
}

fn sdk_error(code: &str, message: impl Into<String>) -> String {
    let error = InvokeError {
        ok: false,
        code: code.to_string(),
        message: message.into(),
    };

    serde_json::to_string(&error).expect("invoke error should serialize")
}

fn parse_request(method: &str, payload_json: &str) -> Result<InvokeRequest, SdkError> {
    let payload = if payload_json.trim().is_empty() {
        serde_json::Value::Null
    } else {
        serde_json::from_str(payload_json).map_err(|error| {
            SdkError::new(
                "SDK_PAYLOAD_PARSE_ERROR",
                format!("payloadJson 不是合法 JSON: {error}"),
            )
        })?
    };

    Ok(InvokeRequest {
        method: method.to_string(),
        payload,
    })
}

fn emit_event(event: serde_json::Value) {
    let callback = callback_slot().lock().ok().and_then(|slot| *slot);

    if let Some(callback) = callback {
        if let Ok(payload) = CString::new(event.to_string()) {
            callback(payload.as_ptr());
        }
    }
}

fn invoke_success(method: String, data: serde_json::Value) -> String {
    serde_json::to_string(&InvokeResponse {
        ok: true,
        method,
        data,
    })
    .expect("invoke response should serialize")
}

fn handle_auth_login(request: InvokeRequest) -> String {
    let account = request
        .payload
        .get("account")
        .and_then(|value| value.as_str())
        .unwrap_or("client");
    let token = format!("mobile-rust-token-{account}");
    let user = serde_json::json!({
        "userId": 1,
        "username": account,
        "account": account,
        "nickname": "杨博飞",
        "roles": ["CLIENT_USER"],
        "status": 1,
    });

    if let Ok(mut slot) = auth_token_slot().lock() {
        *slot = Some(token.clone());
    }
    if let Ok(mut slot) = current_user_slot().lock() {
        *slot = Some(user);
    }

    emit_event(serde_json::json!({
        "type": "AuthLoggedIn",
        "payload": {
            "account": account,
        },
    }));

    invoke_success(
        request.method,
        serde_json::json!({
            "token": token,
            "userId": 1,
            "username": account,
            "account": account,
            "roles": ["CLIENT_USER"],
        }),
    )
}

fn handle_auth_current_user(request: InvokeRequest) -> String {
    let has_token = auth_token_slot()
        .lock()
        .ok()
        .and_then(|slot| slot.clone())
        .is_some();

    if !has_token {
        return sdk_error("SDK_AUTH_ANONYMOUS", "未登录");
    }

    let user = current_user_slot()
        .lock()
        .ok()
        .and_then(|slot| slot.clone())
        .unwrap_or_else(|| {
            serde_json::json!({
                "userId": 1,
                "username": "client",
                "account": "client",
                "nickname": "杨博飞",
                "roles": ["CLIENT_USER"],
                "status": 1,
            })
        });

    invoke_success(request.method, user)
}

fn handle_auth_restore_session(request: InvokeRequest) -> String {
    let token = request
        .payload
        .get("token")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string());

    let Some(token) = token.filter(|value| !value.is_empty()) else {
        return sdk_error("SDK_AUTH_ANONYMOUS", "未登录");
    };

    let user = request
        .payload
        .get("currentUser")
        .cloned()
        .unwrap_or_else(|| {
            serde_json::json!({
                "userId": 1,
                "username": "client",
                "account": "client",
                "nickname": "杨博飞",
                "roles": ["CLIENT_USER"],
                "status": 1,
            })
        });

    if let Ok(mut slot) = auth_token_slot().lock() {
        *slot = Some(token);
    }
    if let Ok(mut slot) = current_user_slot().lock() {
        *slot = Some(user.clone());
    }

    emit_event(serde_json::json!({
        "type": "AuthRestored",
        "payload": {
            "user": user,
        },
    }));

    invoke_success(request.method, user)
}

fn handle_auth_logout(request: InvokeRequest) -> String {
    if let Ok(mut slot) = auth_token_slot().lock() {
        *slot = None;
    }
    if let Ok(mut slot) = current_user_slot().lock() {
        *slot = None;
    }
    emit_event(serde_json::json!({
        "type": "AuthLoggedOut",
        "payload": {},
    }));

    invoke_success(request.method, serde_json::Value::Null)
}

fn handle_stream_start(request: InvokeRequest) -> String {
    let timestamp = request
        .payload
        .get("clientMessageId")
        .and_then(|value| value.as_u64())
        .unwrap_or(0);
    emit_event(serde_json::json!({
        "type": "start",
        "payload": request.payload,
    }));
    invoke_success(
        request.method,
        serde_json::json!({
            "clientMessageId": timestamp,
            "accepted": true,
        }),
    )
}

fn handle_stream_finish(request: InvokeRequest) -> String {
    emit_event(serde_json::json!({
        "type": "done",
        "payload": request.payload,
    }));
    invoke_success(request.method, serde_json::Value::Null)
}

fn handle_stream_fail(request: InvokeRequest) -> String {
    emit_event(serde_json::json!({
        "type": "error",
        "payload": request.payload,
    }));
    invoke_success(request.method, serde_json::Value::Null)
}

/// Native-safe invoke entry used by Android/iOS bridges.
///
/// The first mobile layer keeps the stable method + payload boundary in Rust.
/// Business methods can be connected incrementally without changing the RN API.
pub fn invoke_json(method: &str, payload_json: &str) -> String {
    match parse_request(method, payload_json) {
        Ok(request) => {
            let method = request.method.clone();
            emit_event(serde_json::json!({
                "type": "sdk.invoke",
                "method": method,
            }));

            match method.as_str() {
                "auth.login" => handle_auth_login(request),
                "auth.current_user" => handle_auth_current_user(request),
                "auth.logout" => handle_auth_logout(request),
                "auth.restore_session" => handle_auth_restore_session(request),
                "chat.stream.start" => handle_stream_start(request),
                "chat.stream.finish" => handle_stream_finish(request),
                "chat.stream.fail" => handle_stream_fail(request),
                _ => invoke_success(
                    request.method,
                    serde_json::json!({
                        "mobileBinding": "ready",
                        "payload": request.payload,
                    }),
                ),
            }
        }
        Err(error) => sdk_error(&error.code, error.message),
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn oil_qa_mobile_invoke(
    method_ptr: *const c_char,
    payload_ptr: *const c_char,
) -> *mut c_char {
    if method_ptr.is_null() {
        return to_c_string(sdk_error("SDK_METHOD_MISSING", "method 不能为空"));
    }

    let method = unsafe { CStr::from_ptr(method_ptr) }
        .to_string_lossy()
        .to_string();
    let payload = if payload_ptr.is_null() {
        String::new()
    } else {
        unsafe { CStr::from_ptr(payload_ptr) }
            .to_string_lossy()
            .to_string()
    };

    to_c_string(invoke_json(&method, &payload))
}

#[unsafe(no_mangle)]
pub extern "C" fn oil_qa_mobile_free_string(ptr: *mut c_char) {
    if ptr.is_null() {
        return;
    }

    unsafe {
        let _ = CString::from_raw(ptr);
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn oil_qa_mobile_register_event_callback(callback: Option<EventCallback>) {
    if let Ok(mut slot) = callback_slot().lock() {
        *slot = callback;
    }
}

#[cfg(target_os = "android")]
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_oilqac_sdk_OilQaSdkModule_nativeInvoke(
    mut env: JNIEnv,
    _class: JClass,
    method: JString,
    payload_json: JString,
) -> jstring {
    let method: String = env
        .get_string(&method)
        .map(|value| value.into())
        .unwrap_or_else(|_| String::new());
    let payload_json: String = env
        .get_string(&payload_json)
        .map(|value| value.into())
        .unwrap_or_else(|_| "{}".to_string());
    let response = invoke_json(&method, &payload_json);

    env.new_string(response)
        .map(|value| value.into_raw())
        .unwrap_or(std::ptr::null_mut())
}

#[cfg(test)]
mod tests {
    use super::invoke_json;

    #[test]
    fn invoke_returns_json_response() {
        let response = invoke_json("auth.login", "{\"account\":\"client\"}");

        assert!(response.contains("\"ok\":true"));
        assert!(response.contains("\"method\":\"auth.login\""));
    }
}
