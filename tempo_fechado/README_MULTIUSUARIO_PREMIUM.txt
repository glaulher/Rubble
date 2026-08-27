ROBÔ DE PONTO WEB - FASE MULTIUSUÁRIO PREMIUM

O que entrou nesta versão:

1) Login obrigatório
- Todos os usuários precisam autenticar antes de acessar o Robô.

2) Perfis
- admin: acesso total.
  Pode importar Excel do Robô, enviar alertas de jornada manualmente, baixar Excel e consultar auditoria.
- consulta: acesso de leitura.
  Pode visualizar painéis, alertas, extratos e baixar Excel. Não pode importar Excel nem disparar alertas.

3) Interface por perfil
- Usuários de consulta não visualizam botões administrativos.
- Administradores visualizam Importar Excel do Robô, Enviar alertas agora e Administração.

4) Bloqueio no servidor
- Mesmo que alguém tente acessar a rota diretamente, ações críticas exigem perfil admin.

5) Auditoria
- O sistema registra login, logout, importação de Excel, envio manual de alertas, download de Excel e tentativas negadas.
- Arquivo: data/auditoria_multiusuario.log
- Tela: menu Administração, disponível para admin.

6) Configuração de usuários
- Edite o arquivo usuarios_config.py.
- Troque as senhas padrão antes de liberar o sistema.

Usuários iniciais:
- admin / admin123 / admin
- max / ponto123 / admin
- consulta / consulta123 / consulta

Como rodar:
python robo_ponto_web.py

Acesso local:
http://127.0.0.1:5050

Acesso na rede:
http://IP-DA-MAQUINA:5050

Observação importante:
Esta fase usa configuração simples em arquivo Python. Para uma camada corporativa futura, o próximo passo seria salvar usuários em banco SQLite com troca de senha pela interface e senha criptografada.


ATUALIZAÇÃO v8.10.0 - CAMADA SQLITE
-----------------------------------
A configuração simples em arquivo Python evoluiu para uma camada corporativa:
- usuários em data/usuarios.db;
- senha criptografada;
- criação/edição/desativação pela interface;
- troca de senha pelo botão Minha senha;
- auditoria preservada.

O arquivo usuarios_config.py fica apenas como fonte de migração inicial, caso o banco ainda não exista.
