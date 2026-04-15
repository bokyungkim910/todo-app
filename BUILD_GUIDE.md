# Todo App - Android APK 빌드 가이드

## 사전 요구사항

### 필수 설치
1. **Node.js** (v18 이상)
2. **Android Studio** (최신 버전 권장)
3. **Java JDK** (17 이상)
4. **Android SDK** (API 34 이상)

### 환경 변수 설정
```bash
# Windows
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools

# macOS/Linux
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## 빌드 명령어

### 1. 개발 모드 (Live Reload)
```bash
npm run android:live
```
- 개발 서버와 연결된 상태로 앱 실행
- 코드 변경 시 자동 리로드

### 2. Debug APK 빌드
```bash
# 1. 웹 앱 빌드
npm run build

# 2. Capacitor 동기화
npx cap sync android

# 3. Android Studio에서 열기
npx cap open android

# 또는 CLI로 빌드
npx cap build android
```

### 3. Release APK 빌드
```bash
# 1. 웹 앱 빌드
npm run build

# 2. Capacitor 동기화
npx cap sync android

# 3. Android Studio에서 Release 빌드
# Build → Generate Signed App Bundle or APK
```

---

## Android Studio에서 빌드

### Debug APK
1. Android Studio에서 프로젝트 열기
2. `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
3. 출력 위치: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (서명 필요)
1. `Build` → `Generate Signed App Bundle or APK`
2. `APK` 선택 → `Next`
3. 키스토어 생성 또는 선택:
   - **Create new**: 새 키스토어 생성
   - **Choose existing**: 기존 키스토어 사용
4. 키 정보 입력:
   - Key store path: `my-release-key.keystore`
   - Key store password: 비밀번호
   - Key alias: 별칭
   - Key password: 키 비밀번호
5. `release` 선택 → `Finish`
6. 출력 위치: `android/app/build/outputs/apk/release/app-release.apk`

---

## 키스토어 생성 (Release용)

```bash
# 키스토어 생성
keytool -genkey -v -keystore my-release-key.keystore -alias my-alias -keyalg RSA -keysize 2048 -validity 10000

# 키스토어 정보 확인
keytool -list -v -keystore my-release-key.keystore
```

---

## Firebase 설정 (선택사항)

### google-services.json 추가
1. Firebase Console에서 Android 앱 등록
2. `google-services.json` 파일 다운로드
3. `android/app/google-services.json` 위치에 복사
4. 자동으로 Firebase 플러그인이 적용됩니다

---

## 문제 해결

### Gradle 동기화 실패
```bash
cd android
./gradlew clean
./gradlew build
```

### Capacitor 동기화 오류
```bash
npx cap sync android --verbose
```

### 빌드 캐시 삭제
```bash
cd android
./gradlew cleanBuildCache
```

---

## 스크립트 요약

| 명령어 | 설명 |
|--------|------|
| `npm run android` | 빌드 + 동기화 + Android Studio 열기 |
| `npm run android:live` | Live reload 모드로 실행 |
| `npm run cap:sync` | Capacitor 동기화만 |
| `npm run cap:build:android` | 빌드 + 동기화 |
| `npx cap open android` | Android Studio 열기 |
| `npx cap run android` | 기기에서 직접 실행 |

---

## 파일 구조

```
todo-app/
├── android/                    # Android 프로젝트
│   ├── app/
│   │   ├── build.gradle        # 앱 빌드 설정
│   │   ├── google-services.json # Firebase 설정 (선택)
│   │   └── src/main/
│   │       └── AndroidManifest.xml  # 권한 설정
│   └── ...
├── capacitor.config.ts         # Capacitor 설정
├── vite.config.ts              # Vite 설정
└── dist/                       # 웹 빌드 출력
```

---

## 참고

- **Debug APK**: 테스트용, 서명 없이 설치 가능
- **Release APK**: 배포용, 키스토어 서명 필요
- **Firebase**: 웹 SDK가 모바일에서도 작동 (별도 설정 불필요)
