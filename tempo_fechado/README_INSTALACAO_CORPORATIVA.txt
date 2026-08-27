Tempo Fechado v8.20.1 - Guia de Instalacao Corporativa

Objetivo
Instalar o Tempo Fechado em multiplos notebooks mantendo um procedimento padrao e reduzindo risco de divergencia entre maquinas.

Arquivos principais
- Setup_TempoFechado_v8_20_1.exe: instalador oficial gerado pelo Inno Setup.
- configuracoes_robo.modelo.json: modelo de configuracao inicial do robo.
- CHECKLIST_HOMOLOGACAO_NOTEBOOK.txt: roteiro de conferencia apos instalar.

Procedimento recomendado
1. Escolha um notebook piloto.
2. Instale o Tempo Fechado usando Setup_TempoFechado_v8_20_1.exe.
3. Abra o sistema pelo atalho criado.
4. Acesse Administracao do Robo e confira os caminhos locais.
5. Configure Outlook, remetente, assunto, pasta de PDFs e Excel do Robo.
6. Salve as configuracoes.
7. Execute o checklist de homologacao.
8. Somente depois replique para os demais notebooks.

Local de instalacao
A v8.20.1 usa instalacao por usuario em:
%LOCALAPPDATA%\Tempo Fechado

Dados operacionais do usuario
O Tempo Fechado usa a estrutura:
%USERPROFILE%\ponto_pdfs

Pastas esperadas
- ponto_pdfs\entrada
- ponto_pdfs\saida
- ponto_pdfs\processados
- ponto_pdfs\erro
- ponto_pdfs\logs
- ponto_pdfs\backup
- ponto_pdfs\config

Arquivo de configuracao preservado
%USERPROFILE%\ponto_pdfs\config\configuracoes_robo.json

Regra de ouro de atualizacao
Atualizar o programa, preservar os dados locais.
Nao apagar manualmente a pasta ponto_pdfs durante atualizacoes.

Observacoes
- O instalador deve ser gerado apos executar GERAR_TempoFechado_EXE.bat.
- O caminho do Inno Setup pode precisar ser ajustado em GERAR_Instalador_TempoFechado.bat.
- Em ambientes com politicas de TI restritivas, pode ser necessario liberar execucao local do aplicativo.


Nota v8.20.1 - Atualizacao Segura
----------------------------------
Para notebooks ja instalados, use tambem README_ATUALIZACAO_SEGURA.txt e CHECKLIST_ATUALIZACAO_SEGURA.txt.
A abertura do aplicativo cria backup defensivo em %USERPROFILE%\ponto_pdfs\backup_atualizacao.
