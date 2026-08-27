@echo off
setlocal
cd /d "%~dp0"
set TEMPO_FECHADO_MODO_SERVIDOR=1
set TEMPO_FECHADO_HOST=0.0.0.0
set TEMPO_FECHADO_PORT=5050
if "%TEMPO_FECHADO_PONTO_PDFS_DIR%"=="" set TEMPO_FECHADO_PONTO_PDFS_DIR=%USERPROFILE%\TempoFechadoServidor\ponto_pdfs
if not exist "%TEMPO_FECHADO_PONTO_PDFS_DIR%" mkdir "%TEMPO_FECHADO_PONTO_PDFS_DIR%"
echo Tempo Fechado - Modo Servidor Central
echo Pasta central: %TEMPO_FECHADO_PONTO_PDFS_DIR%
echo Porta: %TEMPO_FECHADO_PORT%
echo.
if exist "%~dp0..\TempoFechado.exe" (
  "%~dp0..\TempoFechado.exe" --server --data-dir "%TEMPO_FECHADO_PONTO_PDFS_DIR%" --open-browser
) else (
  TempoFechado.exe --server --data-dir "%TEMPO_FECHADO_PONTO_PDFS_DIR%" --open-browser
)
pause
