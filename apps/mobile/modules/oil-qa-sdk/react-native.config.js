module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.oilqac.sdk.OilQaSdkPackage;',
        packageInstance: 'new OilQaSdkPackage()',
      },
      ios: {
        podspecPath: './OilQaSdk.podspec',
      },
    },
  },
};
