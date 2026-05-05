import { NativeEventEmitter, NativeModules } from 'react-native';

const nativeModule = NativeModules.OilQaSdk;

export function invoke(method: string, payloadJson: string): Promise<string> {
  if (!nativeModule?.invoke) {
    throw new Error('OilQaSdk native module 未注册');
  }

  return nativeModule.invoke(method, payloadJson);
}

export function createEventEmitter() {
  // 所有 Rust SDK 事件通过同一个 emitter 进入 JS，避免每个业务接口暴露独立原生方法。
  return new NativeEventEmitter(nativeModule);
}
