ROBÔ DE PONTO WEB - MULTIUSUÁRIO CORPORATIVO SQLITE
Versão v8.10.0

O que mudou nesta fase
----------------------
1. Os usuários não ficam mais salvos em usuarios_config.py como senha aberta.
2. O sistema cria e usa o banco local:

   data/usuarios.db

3. As senhas são armazenadas como hash criptográfico, usando Werkzeug/Flask.
4. A interface Administração permite:
   - listar usuários;
   - criar usuários;
   - alterar nome/perfil/status;
   - redefinir senha;
   - exigir troca de senha;
   - consultar auditoria.
5. A barra superior ganhou o botão "Minha senha".
6. Usuários com senha inicial são orientados a trocar a senha no login.

Usuários iniciais
-----------------
No primeiro uso, se data/usuarios.db ainda não existir ou estiver vazio, o sistema migra os usuários do usuarios_config.py.
Se o arquivo usuarios_config.py não existir, cria estes usuários padrão:

admin / admin123
max / ponto123
consulta / consulta123

Recomendação: trocar imediatamente essas senhas pela interface.

Perfis
------
admin:
- importa Excel;
- envia alertas de jornada;
- gerencia usuários;
- acessa auditoria;
- visualiza tudo.

consulta:
- visualiza dashboards, alertas, extratos e tabelas;
- baixa Excel;
- não importa base;
- não dispara alertas;
- não acessa administração.

Backup importante
-----------------
Para preservar usuários e senhas, inclua este arquivo no backup:

data/usuarios.db

A auditoria continua em:

data/auditoria_multiusuario.log

Observação técnica
------------------
O arquivo usuarios_config.py foi mantido apenas por compatibilidade/migração inicial.
Depois que o banco SQLite for criado, a fonte oficial de usuários passa a ser:

data/usuarios.db
