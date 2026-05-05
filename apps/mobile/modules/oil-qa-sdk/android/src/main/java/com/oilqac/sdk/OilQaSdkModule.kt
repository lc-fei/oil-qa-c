package com.oilqac.sdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class OilQaSdkModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "OilQaSdk"

    init {
        // Native library 名称来自 Rust mobile binding 的 crate 名，后续构建产物统一放到 jniLibs。
        runCatching { System.loadLibrary("oil_qa_mobile") }
    }

    @ReactMethod
    fun invoke(method: String, payloadJson: String, promise: Promise) {
        try {
            promise.resolve(nativeInvoke(method, payloadJson))
        } catch (error: Throwable) {
            promise.reject("OIL_QA_SDK_INVOKE_FAILED", error.message, error)
        }
    }

    private fun emitSdkEvent(eventJson: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("oilQaSdkEvent", eventJson)
    }

    private external fun nativeInvoke(method: String, payloadJson: String): String
}
