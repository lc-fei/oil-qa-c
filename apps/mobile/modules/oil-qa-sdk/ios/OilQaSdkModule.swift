import Foundation
import React

@_silgen_name("oil_qa_mobile_invoke")
private func oilQaMobileInvoke(_ method: UnsafePointer<CChar>, _ payload: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>?

@_silgen_name("oil_qa_mobile_free_string")
private func oilQaMobileFreeString(_ pointer: UnsafeMutablePointer<CChar>?)

private typealias OilQaMobileEventCallback = @convention(c) (UnsafePointer<CChar>?) -> Void

@_silgen_name("oil_qa_mobile_register_event_callback")
private func oilQaMobileRegisterEventCallback(_ callback: OilQaMobileEventCallback?)

private func oilQaMobileHandleEvent(_ eventPointer: UnsafePointer<CChar>?) {
  guard let eventPointer else {
    return
  }

  let eventJson = String(cString: eventPointer)
  OilQaSdkModule.activeEmitter?.sendEvent(withName: "oilQaSdkEvent", body: eventJson)
}

@objc(OilQaSdk)
final class OilQaSdkModule: RCTEventEmitter {
  fileprivate static weak var activeEmitter: OilQaSdkModule?

  override init() {
    super.init()
    // Rust SDK 的 SSE/领域事件统一转发到 RN，JS 侧只订阅 oilQaSdkEvent。
    OilQaSdkModule.activeEmitter = self
    oilQaMobileRegisterEventCallback(oilQaMobileHandleEvent)
  }

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["oilQaSdkEvent"]
  }

  @objc(invoke:payloadJson:resolver:rejecter:)
  func invoke(_ method: String, payloadJson: String, resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    // Swift 层只做桥接，业务分发和状态维护必须留在 Rust SDK。
    let result = method.withCString { methodPointer in
      payloadJson.withCString { payloadPointer -> String in
        guard let responsePointer = oilQaMobileInvoke(methodPointer, payloadPointer) else {
          return "{\"ok\":false,\"code\":\"SDK_EMPTY_POINTER\",\"message\":\"Rust SDK 返回空指针\"}"
        }

        defer { oilQaMobileFreeString(responsePointer) }
        return String(cString: responsePointer)
      }
    }

    resolver(result)
  }
}
