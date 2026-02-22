; Custom NSIS: add Startup shortcut (launch Rephrase at Windows startup)

!macro customInstall
  ; Startup folder is per-user; ensure current user context
  SetShellVarContext current
  SetOutPath $INSTDIR
  CreateShortCut "$SMSTARTUP\Rephrase.lnk" "$appExe" "" "$appExe" 0 "" "" "Rephrase"
  ClearErrors
!macroend

!macro customUnInstall
  ; Remove Startup shortcut
  SetShellVarContext current
  Delete "$SMSTARTUP\Rephrase.lnk"
  ClearErrors
!macroend
