# GlowFit Pro — GitHub에서 APK 자동 빌드

이 폴더는 기존 GitHub Pages 웹앱을 그대로 유지하면서, 같은 저장소에서 **Capacitor Android APK**를 자동으로 만들도록 구성되어 있습니다.

## 포함된 기능

- 기존 운동 기록/캘린더/5시간 자동 마감/하루 여러 세션 합산 유지
- 기존 PWA(GitHub Pages)도 계속 사용 가능
- Android APK에서는 앱을 YouTube 등으로 내려놓았을 때 휴식 타이머 종료 시 **OS 로컬 알림** 사용
- GitHub에 커밋할 때마다 Actions에서 APK 자동 빌드
- `v1.0.0` 같은 태그를 푸시하면 GitHub Releases에도 APK 자동 첨부

## 기존 저장소에 넣는 방법

이 ZIP의 내용을 현재 웹앱 저장소 루트에 덮어씁니다.

특히 아래 파일/폴더가 추가됩니다.

- `package.json`
- `capacitor.config.json`
- `native-notifications.js`
- `assets/icon.png`
- `.github/workflows/build-android.yml`

`index.html`, `manifest.json`, `sw.js`, 아이콘 파일은 이번 최신 버전으로 교체됩니다.

## GitHub에서 APK 받는 방법

1. 파일을 Commit / Push 합니다.
2. 저장소의 **Actions** 탭으로 이동합니다.
3. `Build GlowFit Android APK` 실행이 끝날 때까지 기다립니다.
4. 실행 결과 하단의 **Artifacts → GlowFit-Pro-APK**를 다운로드합니다.
5. 압축 안의 APK를 휴대폰에 설치합니다.

서명 비밀키를 아직 설정하지 않았다면 `GlowFit-Pro-debug.apk`가 만들어집니다. 테스트 설치는 가능하지만, 장기적으로 업데이트하면서 기존 앱 데이터를 유지하려면 아래의 고정 서명 설정을 권장합니다.

## 중요: 앱 업데이트 시 운동 기록을 유지하려면 고정 서명 설정

Android는 같은 패키지(`com.glowfit.workout`)를 업데이트할 때 **같은 서명키**를 요구합니다. GitHub Actions의 임시 debug 키만 쓰면 빌드 환경이 바뀌었을 때 재설치가 필요해질 수 있습니다.

함께 제공한 `GITHUB_SIGNING_SECRETS.txt`에 있는 4개 값을 GitHub 저장소의:

**Settings → Secrets and variables → Actions → New repository secret**

에서 각각 등록하세요.

등록할 이름:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

등록 후 다음 빌드부터 `GlowFit-Pro.apk`라는 고정 서명된 APK가 생성됩니다. 이후 APK를 새 버전으로 설치해도 앱 내부 `localStorage` 운동 기록이 유지됩니다.

> `GITHUB_SIGNING_SECRETS.txt`와 원본 keystore는 외부에 공개하거나 GitHub 파일로 커밋하지 마세요.

## 휴식 타이머 백그라운드 알림

Android 13 이상에서는 첫 실행 시 알림 권한을 묻습니다. 허용해야 합니다.

정확한 초 단위 알림을 위해 Android가 `알람 및 리마인더` 설정을 요구할 수 있습니다. 앱에서 안내가 뜨면 설정 화면을 열어 GlowFit의 권한을 허용하세요. Capacitor 공식 Local Notifications는 Android 12+에서 exact alarm 권한이 없으면 예약 알림이 정확하지 않을 수 있습니다.

웹/PWA에서는 `native-notifications.js`가 아무 동작도 하지 않으므로 기존 사용 방식에는 영향을 주지 않습니다.

## APK 빌드만 수동으로 다시 하고 싶을 때

GitHub 저장소에서:

**Actions → Build GlowFit Android APK → Run workflow**

를 누르면 코드 변경 없이도 다시 빌드할 수 있습니다.

## 버전 배포(선택)

Git tag를 `v1.0.0`, `v1.0.1` 식으로 만들어 Push하면 GitHub Releases에 APK가 자동 등록됩니다.

예:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 앱 ID 변경

현재 Android 패키지 ID는:

```text
com.glowfit.workout
```

입니다. Play Store에 올릴 생각이라면 최초 배포 전에 `capacitor.config.json`의 `appId`를 본인 고유 ID로 바꾸는 것을 권장합니다. 한 번 설치/배포한 뒤 appId를 바꾸면 Android에서는 다른 앱으로 취급됩니다.
