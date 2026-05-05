import { NativeEventEmitter, NativeModules } from 'react-native';

type NativeOilQaSdk = {
  invoke: (method: string, payloadJson: string) => Promise<string>;
};

export interface NativeSdkEvent {
  type: string;
  method?: string;
  payload?: unknown;
}

const nativeModule = NativeModules.OilQaSdk as NativeOilQaSdk | undefined;
const eventEmitter = nativeModule ? new NativeEventEmitter(NativeModules.OilQaSdk) : null;

export async function invokeNative(method: string, payload: unknown) {
  if (!nativeModule) {
    return JSON.stringify({
      ok: true,
      method,
      data: {
        mobileBinding: 'mock',
        payload,
      },
    });
  }

  return nativeModule.invoke(method, JSON.stringify(payload ?? null));
}

export function subscribeSdkEvent(listener: (event: unknown) => void) {
  if (!eventEmitter) {
    return () => undefined;
  }

  const subscription = eventEmitter.addListener('oilQaSdkEvent', (event) => {
    if (typeof event !== 'string') {
      listener(event);
      return;
    }

    try {
      listener(JSON.parse(event) as NativeSdkEvent);
    } catch {
      listener({ type: 'sdk.raw_event', payload: event } satisfies NativeSdkEvent);
    }
  });
  return () => subscription.remove();
}
