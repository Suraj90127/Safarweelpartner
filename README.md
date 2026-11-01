cd android
.\gradlew.bat clean
./gradlew assembleRelease
./gradlew bundleRelease
npx react-native start --reset-cache --port 8081

npx react-native run-android --device IBR8X8YD4HYXUKIJ --port 8081

adb reverse tcp:5001 tcp:5001


