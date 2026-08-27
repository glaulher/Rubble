Tempo Fechado v8.21.39 - Modo Servidor Central

Ajustes desta versao:
- Criado modo servidor central no launcher via --server/--servidor.
- Adicionado suporte a pasta central configuravel via --data-dir ou TEMPO_FECHADO_PONTO_PDFS_DIR.
- Backend, Processamento Manual e Script Launcher passam a respeitar a mesma base ponto_pdfs configurada.
- Diagnostico e APIs de versao passam a informar modo de operacao e pasta ponto_pdfs ativa.
- Adicionado script iniciar_modo_servidor_central.bat como modelo operacional.
- Mantida compatibilidade com o modo local padrao ja usado nos notebooks.

Exemplo de uso no servidor:
TempoFechado.exe --server --data-dir "D:\TempoFechado\dados\ponto_pdfs"

Exemplo por variaveis de ambiente:
set TEMPO_FECHADO_MODO_SERVIDOR=1
set TEMPO_FECHADO_PONTO_PDFS_DIR=D:\TempoFechado\dados\ponto_pdfs
TempoFechado.exe --server

Validacoes realizadas:
- Compilacao dos principais scripts Python com py_compile.
- Validacao sintatica de static/app.js com Node.js.
- Teste funcional leve confirmando que a base ponto_pdfs muda para o diretorio configurado.
