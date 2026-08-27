#define MyAppName "Tempo Fechado"
#define MyAppVersion "8.21.67"
#define MyAppPublisher "Tempo Fechado"

[Setup]
AppId={{9F4F8C77-7A53-4B3E-9AA0-TEMPOFECHADO81720}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Tempo Fechado
DefaultGroupName=Tempo Fechado
DisableProgramGroupPage=yes
OutputDir=installer_output
OutputBaseFilename=Setup_TempoFechado_v8_21_67
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
; SetupIconFile comentado: em alguns notebooks o Inno falha com EndUpdateResource 110 ao atualizar o icone do instalador.
; O aplicativo instalado continua usando o icone embarcado no TempoFechado.exe.
; SetupIconFile=assets\tempo_fechado_app_icon.ico
CloseApplications=yes
CloseApplicationsFilter=TempoFechado.exe
RestartApplications=no
; v8.21.66: instalacao por usuario para notebooks corporativos sem exigir administrador.
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\TempoFechado.exe

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Atalhos:"; Flags: unchecked
Name: "startmenuicon"; Description: "Criar atalho no Menu Iniciar"; GroupDescription: "Atalhos:"; Flags: checkedonce
Name: "serverstartup"; Description: "Iniciar modo servidor central junto com o Windows"; GroupDescription: "Servidor central:"; Flags: unchecked

[Files]
Source: "dist\TempoFechado\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Tempo Fechado"; Filename: "{app}\TempoFechado.exe"; Tasks: startmenuicon
Name: "{group}\Tempo Fechado Servidor"; Filename: "{app}\_internal\iniciar_tempo_fechado_servidor.bat"; WorkingDir: "{app}\_internal"; Tasks: startmenuicon
Name: "{autodesktop}\Tempo Fechado"; Filename: "{app}\TempoFechado.exe"; Tasks: desktopicon
Name: "{userstartup}\Tempo Fechado Servidor"; Filename: "{app}\_internal\iniciar_tempo_fechado_servidor.bat"; WorkingDir: "{app}\_internal"; Tasks: serverstartup

[Run]
Filename: "{app}\TempoFechado.exe"; Description: "Abrir Tempo Fechado"; Flags: nowait postinstall skipifsilent

[Code]
procedure EncerrarTempoFechadoEmExecucao();
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/IM TempoFechado.exe /F /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  EncerrarTempoFechadoEmExecucao();
  Result := '';
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    EncerrarTempoFechadoEmExecucao();
end;



