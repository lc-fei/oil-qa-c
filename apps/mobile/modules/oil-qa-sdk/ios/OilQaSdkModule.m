#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(OilQaSdk, RCTEventEmitter)

RCT_EXTERN_METHOD(invoke:(NSString *)method
                  payloadJson:(NSString *)payloadJson
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
