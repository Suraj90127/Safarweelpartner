cd android

Remove-Item -Recurse -Force .gradle -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force app\.cxx -ErrorAction SilentlyContinue

./gradlew clean

cd ..

npx react-native start --reset-cache --port 8081