require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'OilQaSdk'
  s.version = package['version']
  s.summary = 'React Native bridge for Oil QA Rust SDK'
  s.description = 'iOS native module that exposes the compiled Oil QA Rust SDK to React Native through a single invoke boundary.'
  s.homepage = 'https://example.invalid/oil-qa-c'
  s.license = { :type => 'UNLICENSED' }
  s.author = { 'oil-qa-c' => 'oil-qa-c' }
  s.platforms = { :ios => '13.4' }
  s.source = { :path => '.' }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.vendored_frameworks = '../../../../rust-sdk/bindings/mobile/dist/ios/OilQaSdk.xcframework'
  s.swift_version = '5.0'
  s.dependency 'React-Core'
end
