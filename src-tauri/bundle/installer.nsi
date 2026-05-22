!include "MUI2.nsh"

Name "FocusFlow"
OutFile "${EXEPATH}\FocusFlow-Installer.exe"
InstallDir "$PROGRAMFILES\\FocusFlow"
SetCompress off

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "${PROJECT_DIR}/dist/*"
  ; Copy the tauri bundle produced by cargo to installer output
  File "${PROJECT_DIR}/src-tauri/target/release/bundle/msi/*" ; placeholder
  CreateShortcut "$SMPROGRAMS\\FocusFlow\\FocusFlow.lnk" "$INSTDIR\\focusflow.exe"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\\focusflow.exe"
  RMDir /r "$INSTDIR"
  Delete "$SMPROGRAMS\\FocusFlow\\FocusFlow.lnk"
SectionEnd
