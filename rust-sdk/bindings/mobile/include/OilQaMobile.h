#ifndef OIL_QA_MOBILE_H
#define OIL_QA_MOBILE_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// iOS/RN 原生层只通过统一 invoke 入口访问 Rust SDK，业务分发留在 Rust 内部。
char *oil_qa_mobile_invoke(const char *method, const char *payload_json);

// Swift 读取 Rust 返回字符串后必须调用该方法释放内存，避免跨 FFI 内存泄漏。
void oil_qa_mobile_free_string(char *ptr);

typedef void (*OilQaMobileEventCallback)(const char *event_json);

// 事件回调用于后续把 Rust SDK SSE/领域事件转发到 RN NativeEventEmitter。
void oil_qa_mobile_register_event_callback(OilQaMobileEventCallback callback);

#ifdef __cplusplus
}
#endif

#endif
