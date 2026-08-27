Tempo Fechado - Guia de Atualizacao Segura

Quando usar
-----------
Use este procedimento quando o Tempo Fechado ja estiver instalado em um notebook e voce quiser instalar uma versao nova por cima.

Regra principal
---------------
Atualizar o sistema, preservar os dados locais.

Dados que devem ser preservados
-------------------------------
- Usuarios cadastrados
- Configuracoes do Robo
- Configuracoes de Outlook
- Historico operacional
- Logs
- Banco de Horas
- Pastas entrada, saida, processados e erro
- Arquivos de controle local

Procedimento recomendado
------------------------
1. Feche o Tempo Fechado no notebook.
2. Confirme que nao ha processamento em andamento.
3. Execute o instalador da nova versao.
4. Abra o Tempo Fechado.
5. Confira a pasta:
   %USERPROFILE%\ponto_pdfs\backup_atualizacao
6. Verifique se foi criado um backup com manifesto.
7. Rode o checklist de atualizacao segura.

Onde ficam os backups defensivos
--------------------------------
%USERPROFILE%\ponto_pdfs\backup_atualizacao

Cada backup possui nome semelhante a:
backup_20260115_093000

Dentro dele deve existir:
MANIFESTO_ATUALIZACAO_SEGURA.json

Boa pratica
-----------
Antes de atualizar varios notebooks, atualize primeiro um notebook piloto. Depois de homologar, replique para os demais.
