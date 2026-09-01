# Rubble — Manual de Uso e Documentação Técnica

SPA de gestão de manutenção de equipamentos de climatização (HVAC). Desenvolvido em PHP 8.4 puro + Vanilla JS + MariaDB 11.4 com Tailwind CSS v4 e microserviço de IA para auditoria de laudos em PDF.

---

## 1. Visão Geral do Sistema

### 1.1. O que é o Rubble

O **Rubble** é uma plataforma integrada para planejamento, execução, controle orçamentário e auditoria técnica de serviços de manutenção em equipamentos de ar condicionado e refrigeração (HVAC). A plataforma unifica em uma única interface:
- Cadastro e inventário de máquinas e endereços técnicos (sites/HUBs).
- Gestão e acompanhamento operacional de ordens de serviço corretivas (OS).
- Planejamento diário e cronograma de manutenções preventivas e corretivas.
- Gestão de ciclos periódicos de preventiva e controle de medição (SCM).
- Elaboração, envio de e-mails e aprovação automática de propostas de venda (PV / orçamentos LPU e FLPU).
- Registro e controle de trocas de filtros de ar.
- Auditoria automatizada de laudos técnicos em PDF via Inteligência Artificial (CLIP).
- Painéis gerenciais com indicadores operacionais, financeiros e mapas de calor (Treemaps).

### 1.2. Stack Tecnológica

| Camada | Tecnologia | Descrição |
|--------|-----------|-----------|
| **Backend** | PHP 8.4 puro | Sem frameworks pesados; arquitetura estruturada em Controller → Service → Repository → Entity |
| **Frontend** | Vanilla JS (ES Modules) | SPA hash-based, Tailwind CSS v4, Chart.js, html2canvas, jsPDF |
| **Banco de Dados**| MariaDB 11.4 | Charset `utf8mb4`, índices otimizados e suporte a FULLTEXT search |
| **Microserviço IA**| Python 3.12 + FastAPI + CLIP | Comparação visual de laudos em PDF (`rubble-pdf-checker/`) |
| **E-mails & IMAP**| PHPMailer + PHP IMAP | Disparo SMTP e robô (*Mail Watcher*) de leitura de respostas e aprovação automática |
| **Cache & Polling**| APCu / Arquivo local | Invalidação por prefixo e polling incremental (30s com jitter) |
| **Servidor & Deploy**| Docker Compose + Traefik | SSL automático via Let's Encrypt e proxy reverso |
| **Testes** | PHPUnit 11 + Bun | Testes unitários PHP e testes de interface/módulos JS |

### 1.3. Arquitetura do Backend

```
HTTP Request → CorsMiddleware → AuthMiddleware → RateLimitMiddleware → Router → Controller → Service → Repository → MariaDB
```

- **Controllers (`app/api/Controllers/`):** Recebem requisições HTTP, validam parâmetros de entrada e delegam a execução para os Services.
- **Services (`app/api/Services/`):** Contêm **todas** as regras de negócio, cálculos, validações e integrações externas (e-mail, IA, IMAP).
- **Repositories (`app/api/Repositories/`):** Camada de acesso a dados exclusiva. Executam queries SQL seguras via prepared statements (`safePrepare`). Não contêm regras de negócio.
- **Entities (`app/api/Entities/`):** Objetos de transferência de dados com propriedades tipadas.

---

## 2. Perfis de Acesso & Permissões

O controle de acesso é baseado em papéis (RBAC). O token JWT emitido no login carrega a role do usuário, validada em cada requisição pelo `AuthMiddleware` e refletida na interface pelo `applyRoleVisibility()`.

| Módulo / Recurso | Admin | Coordenador | Supervisor | Administrativo | Cliente |
|-------------------|:-----:|:-----------:|:----------:|:--------------:|:-------:|
| **Home (Equipamentos & Chamados)** | CRUD | CRUD | CRUD | R/O | R/O |
| **Gestão de OS (Pending Tickets)** | CRUD | CRUD | CRUD | R/O | R/O |
| **Atividades Planejadas** | CRUD | CRUD (sem delete) | R/O | R/O | R/O |
| **Ciclo de Preventiva** | CRUD (save) | R/O | R/O | ❌ | ❌ |
| **Propostas de Venda (PV)** | CRUD | CRUD (sem delete) | ❌ | ❌ | ❌ |
| **Controle de Medição (SCM)** | CRUD | CRUD (sem delete) | ❌ | ❌ | ❌ |
| **Troca de Filtros** | CRUD | CRUD | CRUD | R/O | R/O |
| **Auditoria de Laudos (PDF Audit)**| CRUD | R/O | ❌ | R/O | ❌ |
| **Equipment Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **OS Dashboard** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Preventiva Dashboard** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **PV Dashboard** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Gestão de Equipamentos** | CRUD | CRUD (sem delete) | ❌ | ❌ | ❌ |
| **Tabela de Preços** | CRUD | ❌ | ❌ | ❌ | ❌ |
| **Gestão de Usuários** | CRUD | ❌ | ❌ | ❌ | ❌ |

> **Legenda:**
> - **CRUD:** Criar, Consultar, Editar e Excluir.
> - **R/O:** Somente Leitura (*Read-Only* / Consulta e exportação).
> - **✅ / ❌:** Acesso permitido / bloqueado aos dashboards gerenciais.

---

## 3. Manual de Uso & Guia Operacional

Este capítulo apresenta o passo a passo prático para utilização de cada módulo do sistema.

### 3.1. Home — Consulta de Equipamentos & Atendimentos (`#/home`)

A Home é a tela inicial do sistema, projetada para visualização rápida do parque de máquinas e dos atendimentos técnicos.

```
+-----------------------------------------------------------------------------------+
|  [Logo Rubble]  [Contador de Máquinas / Valor]  [Campo de Busca...]  [+ Registrar]  |
+-----------------------------------------------------------------------------------+
|  Site: VITORIA - HUB PRAIA DO CANTO — Rua Exemplo, 123                            |
|  +-------------------------------------+  +-------------------------------------+ |
|  | Máquina: WM 01 - 10 TR              |  | Máquina: FANCOIL 02 - 15 TR         | |
|  | Badges: [10 TR] [MERCADO 1] [R$ 450]|  | Badges: [15 TR] [MERCADO 2] [R$ 600]| |
|  | Última OS: 123456 [Concluído] (P1)  |  | Última OS: 123457 [Pendente] (P0)   | |
|  | Técnico: João Silva                 |  | Técnico: Carlos Souza               | |
|  | [Registrar OS] [Editar Máquina]     |  | [Registrar OS] [Editar Máquina]     | |
|  +-------------------------------------+  +-------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

#### Funcionalidades da Home:
1. **Agrupamento por Site:** Os equipamentos são agrupados por localidade e HUB. O nome do HUB é formatado automaticamente em Title Case.
2. **Cards de Máquinas:** Cada card exibe:
   - Identificação do equipamento e capacidade em TR.
   - Tag Infratel (se cadastrada).
   - Badge de mercado e valor de manutenção calculado com base na tabela de preços.
   - Histórico resumido das ordens de serviço (OS) associadas, com badge colorido por status e prioridade (P0 vermelho a P5 cinza).
3. **Ações no Card:**
   - **Registrar Atendimento:** Abre o modal/formulário para abertura de uma nova OS vinculada àquela máquina específica.
   - **Histórico:** Permite expandir os tickets anteriores para consultar data, causa, solução e técnico responsável.
4. **Busca em Tempo Real:** Campo de busca no cabeçalho com suporte a busca textual por nome de site, máquina, endereço ou número de OS.
5. **Exportação CSV:** Botão no canto superior direito para gerar uma planilha com todos os equipamentos e seus respectivos tickets filtrados.

---

### 3.2. Gestão de OS — Ordens de Serviço Corretivas (`#/pending-tickets`)

Módulo dedicado ao acompanhamento operacional minucioso de todas as ordens de serviço corretivas.

```
+-----------------------------------------------------------------------------------+
| Gestão de OS | [Badge: 42 OS] | [Registrar] [Busca...] [Gerar CSV]                |
| Filtros: [Coluna Data: Abertura ▼] [De: 01/08/2026] [Até: 31/08/2026] [Status ▼] |
+-----------------------------------------------------------------------------------+
| OS     | Site / Localidade | Máquina | Prioridade | Status     | Técnico | PV Status  |
| 260101 | VITORIA - CENTRO  | WM 01   | P1 (Alta)  | Em Andam.  | João S. | Aprovado   |
| ▶ Detalhes da OS (Clique para expandir observações, causas, peças e datas)       |
+-----------------------------------------------------------------------------------+
```

#### Como Utilizar:
1. **Filtro por Coluna de Data:** Selecione qual data deseja filtrar:
   - *Data Abertura*
   - *Data PV Enviada*
   - *Data PV Aprovada*
   - *Data Programada*
   - *Data Real Início*
   - *Data Prevista Conclusão*
   - *Data Conclusão*
2. **Filtro Multi-Select de Status:** Permite selecionar múltiplos status simultaneamente (Pendente, Planejado, Em Andamento, Concluído, Projeto Clean Up).
3. **Linhas Expansíveis de Detalhes:** Clique no ícone de seta (`▶`) ao lado da OS para abrir o painel com observações técnicas completas, materiais necessários, localidade e histórico.
4. **Edição Rápida de Campos:** Campos como responsável, etapa e observação podem ser atualizados diretamente na listagem.

---

### 3.3. Atividades Planejadas — Cronograma & Planejamento (`#/planned-activity`)

Módulo para programação diária das equipes de campo, combinando atividades preventivas e corretivas.

#### Tipos de Atividades:
- **Preventiva:** Agendada em **nível de Site** (sem amarrar a uma máquina específica, associada ao ticket de preventiva).
- **Corretiva:** Agendada em **nível de Equipamento** (associada à máquina e número de OS).

```
+-----------------------------------------------------------------------------------+
| [Planejamento]  [+ Planejar Atividade]  [Busca...]  [Filtros de Data]  [Exportar] |
+-----------------------------------------------------------------------------------+
| 📅 Segunda-feira, 7 de julho de 2026                      [Duplicar Dia]         |
| --------------------------------------------------------------------------------- |
| [Prev] Site: VITORIA - PRAIA DO CANTO | Equipe: Equipe Alfa ✏️ | Status: Planejado |
|        Obs: Verificar filtros e condensadoras ✏️          [Alterar Status] [Excluir] |
| --------------------------------------------------------------------------------- |
| [Corr] OS: 260102 - WM 02 (10 TR)     | Equipe: Carlos/Marcos ✏️| Status: Em Andam. |
+-----------------------------------------------------------------------------------+
```

#### Operações no Planejamento:
1. **Filtros da Barra Superior:**
   - *Data Início / Data Fim:* Seleciona o período de agendamento (com limpeza ao clicar).
   - *Tipo:* Filtro dropdown para exibir **Todos**, apenas **Preventiva** ou apenas **Corretiva**.
   - *Status:* Filtro por situação (*Todos*, *Planejado*, *Concluído*, *Pendente*, *Em Andamento*, *Projeto Clean Up*).
   - *Buscar:* Busca textual com debounce por site, máquina, OS, equipe ou observação.
2. **Nova Atividade:** Clique em `+ Planejar Atividade` e escolha o tipo (*Preventiva* ou *Corretiva*):
   - *Preventiva:* Selecione o Site, Ticket, Data Planejada e Equipe.
   - *Corretiva:* Selecione o Equipamento, OS, Data Planejada e Equipe.
3. **Edição Rápida Inline (Ícone do Lápis ✏️):** Clique no lápis ao lado do nome da Equipe ou da Observação para editar o texto imediatamente sem abrir modais. Pressione `Enter` ou clique fora para salvar.
4. **Transição de Status:**
   - Clique no botão de status para abrir o modal de transição: `Planejado` → `Em Andamento` → `Concluído` ou `Cancelado`.
   - Permite reagendar a data diretamente no modal caso a atividade precise ser postergada.
5. **Duplicar Dia Inteiro:** Clique em `Duplicar Dia` no cabeçalho da data para clonar toda a programação de um dia para uma nova data de destino.

---

### 3.4. Ciclo de Manutenção Preventiva (`#/preventive-cycle`)

Módulo para controle mensal do cumprimento do plano de manutenção preventiva e vinculação com o SCM.

#### Regra do Ciclo de Medição:
O ciclo operacional de medição compreende do **dia 16 do mês anterior até o dia 15 do mês atual** (ex: Ciclo de Agosto/2026 = 16/07/2026 a 15/08/2026).

```
+-----------------------------------------------------------------------------------+
| Ciclo Preventiva: [Ciclo: 2026-08 ▼]                                              |
| Resumo: [R$ 145.200,00 · 82 sites · 320 máq. | Enviado: 12 · Aprovado: 308]      |
| Filtros: (o) Todos  ( ) Com Obs  ( ) Selecionados  ( ) Sem SCM  ( ) Lançados       |
| Ações: [Marcar Todos no Filtro]  [Desmarcar Todos no Filtro]  [Salvar Ciclo]      |
+-----------------------------------------------------------------------------------+
| [✓] Site: CARIACICA - HUB CAMPO GRANDE — WM 01 (10 TR)                            |
|     SCM: [ 26004512 ] (Status: SCM aprovado ✅) | Obs: [ Concluído no prazo ]     |
+-----------------------------------------------------------------------------------+
```

#### Passo a Passo:
1. **Selecionar Ciclo:** Escolha o ano/mês de referência no dropdown superior.
2. **Filtros Rápidos:**
   - *Todos:* Exibe todo o parque de máquinas.
   - *Com Obs:* Apenas equipamentos com anotações manuais.
   - *Selecionados:* Apenas equipamentos marcados no ciclo.
   - *Sem SCM:* Equipamentos marcados que ainda não possuem número SCM preenchido.
   - *Lançados:* Equipamentos cujo SCM já foi processado/aprovado.
3. **Validação de SCM em Tempo Real:** Ao digitar o número do SCM no card, o sistema valida automaticamente e exibe o badge de status retornado da base do SCM.
4. **Ações em Lote:** Utilize `Marcar Todos` ou `Desmarcar Todos` para atualizar em bloco os itens visíveis no filtro atual.
5. **Salvar Ciclo:** Clique no botão verde para persistir as marcações e observações.

---

### 3.5. Propostas de Venda (PV) & Aprovação Automática (`#/pv`)

Módulo completo para elaboração de orçamentos de serviços e materiais, envio de e-mails para o cliente e faturamento.

```
+-----------------------------------------------------------------------------------+
| Propostas de Venda (PV) | [+ Nova PV] [Busca...] [Exportar CSV]                   |
+-----------------------------------------------------------------------------------+
| Nº PV  | Local / Site      | Valor Total  | Status             | Ações             |
| 260085 | VITORIA - CENTRO  | R$ 3.450,00  | Aguardando envio   | [PDF] [✉️] [✏️] [❌]|
| 260084 | SERRA - CIVIT II  | R$ 12.800,00 | Aprovado aquisição | [PDF] [✉️] [✏️] [❌]|
+-----------------------------------------------------------------------------------+
```

#### 1. Criação de Nova PV:
- Acesse `+ Nova PV`.
- Selecione o **Local / Site** (com autocomplete).
- Adicione os itens da proposta:
  - **LPU:** Digite o código ou descrição do item para buscar nos catálogos oficiais (Civil, Materiais Clima/Chiller, Serviços Clima/Chiller). Ao selecionar um item LPU, o campo de fatura é definido automaticamente como "LPU".
  - **FLPU (Fora de Tabela):** Para itens sob medida, insira descrição livre, valor sem BDI e taxa de BDI (%).
  - **Calculadora de Filtros de Ar:** Para itens de troca de elemento filtrante, marque a opção de filtro para abrir a calculadora automática: informe largura (cm), altura (cm), quantidade de peças e espessura para gerar o **Memorial de Cálculo** formatado.

#### 2. Envio de E-mail:
- Clique no ícone de envelope (`✉️`) na PV desejada ou selecione múltiplas PVs para **Envio em Lote (Batch Email)**.
- Escolha o tipo de assunto: *Materiais*, *Serviços* ou *Contratação*.
- O sistema monta um e-mail com design corporativo contendo a tabela de itens, memorial de cálculo e anexa automaticamente os PDFs de OS e Laudos Técnicos salvos nas pastas `OS/` e `LAUDO/`.
- Os destinatários (*Para* e *Cc*) são preenchidos automaticamente conforme a UF do site (`PV_EMAILS_ES` ou `PV_EMAILS_RJ`).
- O cabeçalho `Reply-To` do e-mail é configurado para a caixa de monitoramento (`rubbleaprovacoes@gmail.com`).

#### 3. Aprovação Automática por E-mail (Mail Watcher):
- Quando o cliente responde ao e-mail contendo no assunto o número da PV (ex: `PV: 260085`) e no corpo termos de aprovação (ex: *"Aprovado"*, *"Aprovo o faturamento"*), o robô de leitura IMAP em background processa a mensagem.
- O sistema atualiza automaticamente todos os itens daquela PV para o status `Aprovado aquisição/serviço`, eliminando intervenção manual.
- O controle de duplicidade armazena os UIDs das mensagens processadas na tabela `email_processed`.

---

### 3.6. Controle de Medição (SCM) (`#/scm`)

Módulo de importação e auditoria das planilhas de medição fornecidas pelo cliente.

```
+-----------------------------------------------------------------------------------+
| Controle SCM | [Importar CSV] | [Segmento: Todos ▼] [Site: Todos ▼] [Status ▼]     |
+-----------------------------------------------------------------------------------+
| SCM Nº   | Site / Cidade     | Segmento | Status SCM       | Validação Mercado    |
| 26009812 | VITORIA - CENTRO  | ACESSO   | SCM aprovado ✅  | Mercado Correto ✅   |
| 26009813 | LINHARES - RURAL  | CORE     | SCM negado ❌    | Erro no mercado ⚠️  |
+-----------------------------------------------------------------------------------+
```

#### Operações:
1. **Importação de CSV:** Clique em `Importar CSV`. O sistema detecta automaticamente o delimitador (vírgula ou ponto-e-vírgula), converte encoding (UTF-8 com suporte a Latin-1/BOM) e realiza o parse dos registros.
2. **Mapeamento de Status:** Converte os status brutos da planilha (`GERADO` → `SCM aprovado`, `NEGADO` → `SCM negado`, `CONFERIDO` → `SCM verificado`, `EXECUTADO` → `SCM enviado`).
3. **Sincronização com PV:** Propaga os status do SCM para os itens de PV vinculados pelo número SCM.
4. **Diagnóstico de Mercado:** Realiza a conferência cruzada entre o campo `origem` do SCM e o `mercado` cadastrado no equipamento. Exibe badge de alerta vermelho caso haja divergência de faturamento.

---

### 3.7. Troca de Filtros (`#/filter-exchanges`)

Controle histórico do ciclo de vida dos elementos filtrantes de ar condicionado.

- **Listagem e Registro:** Acompanhamento por equipamento, data de instalação, tipo de filtro e técnico executor.
- **Filtros Rápidos:** Botões de rádio para visualização por status (*Todos*, *Pendente*, *Planejado*, *Concluído*).
- **Seletor de Colunas:** Dropdown dinâmico que permite ocultar ou exibir colunas na tabela conforme a necessidade do usuário.
- **Exportação:** Geração de planilha CSV formatada.

---

### 3.8. Auditoria de Laudos com IA (PDF Audit) (`#/pdf-audit`)

Módulo avançado de inteligência artificial para garantia de qualidade de relatórios técnicos e laudos fotográficos em PDF.

```
+-----------------------------------------------------------------------------------+
| Auditoria PDF com IA | [Modo: CLIP IA (ViT-B/32)] | Referência: [Modelo_Padrao.pdf]|
| [Carregar Nova Referência]  [Auditar Lote de Laudos (PDFs)]  [Exportar Resultados]|
+-----------------------------------------------------------------------------------+
| Resultado da Auditoria: [48 Aprovados - 2 Rejeitados]                             |
| --------------------------------------------------------------------------------- |
| [▼] Laudo_OS_260105.pdf — STATUS: REPROVADO ❌ (Score: 0.62 / Mínimo: 0.78)     |
|     - Foto 3 (Placa do Motor): Inconforme / Ângulo Incorreto                      |
|     - Campo obrigatório ausente: "Pressão de Sucção"                              |
+-----------------------------------------------------------------------------------+
```

#### Modos de Auditoria:
1. **Modo IA (CLIP - OpenAI ViT-B/32):**
   - Utiliza rede neural de visão computacional para comparar semanticamente as fotos do laudo enviado contra as fotos do PDF de referência.
   - O limiar (*threshold*) de aprovação é calibrado dinamicamente com base no score de qualidade da própria referência.
2. **Modo OCR:**
   - Validação textual e estrutural sem IA pesada, indicada para conferência rápida de preenchimento de campos e cabeçalhos em lotes de até 30 arquivos.

#### Como Executar a Auditoria:
1. Defina um PDF de referência através de `Carregar Referência` (armazenado com segurança no microserviço).
2. Selecione os arquivos de laudo a serem auditados e clique em `Auditar`.
3. Acompanhe a barra de progresso em tempo real.
4. Analise o relatório com cards colapsáveis contendo fotos comparadas lado a lado, itens NOK e exporte o resultado em CSV.

---

### 3.9. Dashboards Gerenciais

O Rubble disponibiliza 4 dashboards interativos focados em métricas operacionais e financeiras:

1. **Equipment Dashboard (`#/equipament-dashboard`):**
   - Gráficos de Pareto com ranking de localidades e máquinas mais críticas.
   - Análise de produtividade e volume de atendimentos por técnico.
   - Indicador de Tempo Médio de Resolução (MTTR).
2. **OS Dashboard (`#/os-dashboard`):**
   - Visão gerencial consolidada das ordens de serviço corretivas.
   - Distribuição de chamados por faixa de prioridade (P0 emergencial a P5 preventiva).
   - Divisão percentual de responsabilidade de atendimento (Prestador vs Claro).
   - Botão para exportação do painel formatado em PDF.
3. **Preventiva Dashboard (`#/preventiva-dashboard`):**
   - Indicadores-chave (KPIs): Total de Máquinas, Concluídas, Em Andamento e Pendentes.
   - Gráfico de barras com distribuição de status.
   - **Treemap Proporcional por Site:** Gráfico de áreas onde o tamanho do bloco representa o volume de máquinas do site e a cor indica o status predominante (Verde = Concluído, Amarelo = Em Andamento, Vermelho = Pendente).
   - **Navegação por Ciclo de Medição:** Botões rápidos para avançar ou retroceder entre ciclos mensais de medição (16 a 15).
   - Exportação do dashboard em PDF gerencial.
4. **PV Dashboard (`#/pv-dashboard`):**
   - Análise financeira com volume total orçado e faturado.
   - Funil de propostas de venda por status de aprovação.
   - Ranking de localidades com maior faturamento.

---

### 3.10. Módulos Administrativos

1. **Gestão de Usuários (`#/users`):**
   - Criação de contas de acesso com definição de perfil de permissão (`admin`, `coordenador`, `supervisor`, `administrativo`, `cliente`).
   - Redefinição de senhas com criptografia `password_hash` (bcrypt).
   - Proteção contra auto-exclusão do administrador logado.
2. **Gestão de Equipamentos (`#/equipment-manager`):**
   - Cadastro e edição de máquinas HVAC (capacidade TR, fabricante, modelo, tag Infratel).
   - Associação de endereços com criação automática de registros vinculados.
   - Configuração de HUBs/local_scm e mercados de faturamento.
3. **Tabela de Preços (`#/equipment-prices`):**
   - Cadastro de regras de precificação por TR (fórmulas `capacidade × valor`) ou valor fixo (Chillers).
   - Filtros de aplicação por mercado e locais especiais.

---

## 4. Referência Técnica de API

Todas as rotas (exceto `auth/login` e `config`) exigem cabeçalho `Authorization: Bearer <token_jwt>`.

### Formato Padrão de Resposta

```json
{
  "success": true,
  "message": "Operação realizada com sucesso",
  "data": {}
}
```

Em caso de erro:
```json
{
  "success": false,
  "message": "Descrição amigável do erro"
}
```

### Principais Endpoints

| Rota | Método | Descrição |
|------|--------|-----------|
| `?route=auth&action=login` | POST | Autentica usuário e retorna token JWT |
| `?route=auth&action=me` | GET | Retorna os dados do usuário logado |
| `?route=auth&action=logout` | POST | Revoga o token atual inserindo-o na blacklist |
| `?route=auth&action=active-count`| GET | Retorna a quantidade de usuários ativos |
| `?route=equipment&action=listAll`| GET | Listagem paginada de equipamentos (keyset pagination) |
| `?route=tickets&action=save` | POST | Cria um novo ticket / OS |
| `?route=tickets&action=import` | POST | Importa lote de OS via CSV |
| `?route=pending-tickets` | GET | Listagem de OS corretivas com filtros avançados |
| `?route=planned-activities` | GET, POST | Gestão do cronograma de planejamento |
| `?route=preventiva&action=plan` | POST | Planeja atividade preventiva em nível de site |
| `?route=preventive-cycle` | GET, POST | Operações do ciclo de preventiva |
| `?route=pv` | GET, POST, PUT, DELETE | CRUD completo de Propostas de Venda |
| `?route=pv&action=send-email` | POST | Dispara e-mail de PV com anexos |
| `?route=pv&action=send-batch-email`| POST| Dispara lote de e-mails de PV |
| `?route=scm` | GET, POST | Listagem e importação de medições SCM |
| `?route=filter-exchanges` | GET, POST, PATCH | Gestão de trocas de filtros de ar |
| `?route=pdf-audit&action=audit`| POST | Executa auditoria de PDFs via microserviço |
| `?route=dashboard` | GET | Dados do Dashboard de Equipamentos |
| `?route=os-dashboard` | GET | Dados do Dashboard de Gestão de OS |
| `?route=preventiva-dashboard` | GET | Dados do Dashboard de Preventiva e Treemap |
| `?route=pv-dashboard` | GET | Dados do Dashboard Financeiro de PV |
| `?route=equipment-management` | GET, POST, PUT, DELETE | CRUD de equipamentos (Admin/Coordenador) |
| `?route=equipment-prices` | GET, POST, PUT, DELETE | CRUD de regras de preço (Admin) |
| `?route=users` | GET, POST, PUT, DELETE | CRUD de usuários (Admin) |

---

## 5. Banco de Dados & Schema

### Tabelas Principais

- **`equipamentos`:** Inventário de máquinas de ar condicionado.
- **`enderecos`:** Cadastro de locais físicos, cidades, UFs e HUBs.
- **`registros`:** Ordens de serviço, tickets corretivos e preventivos de máquina.
- **`atividades_preventivas`:** Atividades planejadas preventivas em nível de site.
- **`pv` & `pv_item`:** Cabeçalho e itens detalhados das propostas de venda.
- **`pv_os`:** Relacionamento N:N entre propostas e ordens de serviço.
- **`scm` & `scm_items`:** Dados de controle de medição importados.
- **`preventive_cycle_items`:** Registro de equipamentos executados por ciclo mensal.
- **`filter_exchanges`:** Histórico de trocas de elementos filtrantes.
- **`equipamento_precos`:** Regras de cálculo de valor de manutenção.
- **`usuarios`:** Contas de acesso, senhas com hash e roles.
- **`user_activity`:** Rastreamento de última atividade e IP dos usuários logados.
- **`token_blacklist`:** Tokens JWT revogados por logout.
- **`email_processed`:** UIDs de e-mails processados pelo watcher para evitar duplicidade.
- **`rate_limits` & `login_attempts`:** Controle de rate limiting e proteção de força bruta.

---

## 6. Automações em Background (Crons & Watchers)

As rotinas automáticas rodam via container CLI com `supercronic`:

1. **Notificação de Atividades (`app/api/Cron/check_notification.php`):**
   - Executado diariamente para identificar atividades agendadas para o dia seguinte e enviar e-mails de alerta aos supervisores e técnicos.
2. **Aprovação de PV por E-mail (`app/api/Cron/check_pv_approval.php`):**
   - Executado periodicamente às 09:00 e 16:00.
   - Conecta via IMAP SSL na caixa de aprovação (`rubbleaprovacoes@gmail.com`), busca mensagens não lidas com assunto contendo `PV:`, decodifica o corpo procurando termos de aprovação e atualiza os itens no banco de dados automaticamente.

---

## 7. Instalação, Configuração & Deploy

### 7.1. Configuração do `.env`

Copie `.env.example` para `.env` e preencha as variáveis:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`: Dados de conexão ao MariaDB.
- `JWT_SECRET`: Chave hexadecimal de 64 caracteres para assinatura dos tokens.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Credenciais para envio de e-mails.
- `PV_REPLY_TO`: Endereço da caixa de aprovação (`rubbleaprovacoes@gmail.com`).
- `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`: Configurações IMAP (com senha de aplicativo do Gmail).
- `PV_EMAILS_ES`, `PV_EMAILS_RJ`, `PV_EMAILS_ES_CC`, `PV_EMAILS_RJ_CC`: Listas de destinatários padrão de PV.

### 7.2. Deploy em Produção (Docker Compose + Traefik)

```bash
# 1. Clonar o projeto
git clone https://github.com/glaulher/Rubble.git /opt/rubble
cd /opt/rubble

# 2. Configurar o .env de produção
cp .env.example .env
nano .env

# 3. Inicializar todos os serviços
docker compose up -d --build
```

O Traefik provisiona automaticamente os certificados SSL via Let's Encrypt para o domínio configurado.

---

## 8. Segurança & Hardening

- **CORS Estrito:** Em produção (`APP_DEBUG=false`), apenas as origens definidas em `ALLOWED_ORIGINS` são aceitas.
- **Rate Limiting:** Proteção contra força bruta no login (máximo 5 tentativas por 5 minutos) e limites por IP em rotas de mutação de dados.
- **Revogação de Sessão:** Tokens revogados no logout são armazenados na `token_blacklist` e invalidados no cache.
- **Sanitização de Erros:** Erros internos de banco e servidor são gravados em log protegido e nunca expostos na resposta JSON.
- **Headers HTTP de Segurança:** CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy`.

---

## 9. Armadilhas Conhecidas & Troubleshooting

- **Formato do Número de PV:** Padrão `YYNNNN` (ex: `260085`).
- **Autoload PHP:** O runtime da aplicação utiliza o `config/autoloader.php`. O autoloader do Composer existe apenas para o ambiente de testes (PHPUnit).
- **Tailwind CDN vs CSS Cascade:** O Tailwind CSS v4 injeta estilos dinamicamente. Para elementos com injeção HTML dinâmica, overrides em `default.css` com regras específicas e `!important` garantem a consistência visual em modo escuro.
- **Página de Login Imune ao Dark Mode:** A tela de login (`#/login`) é mantida estritamente em modo claro para clareza visual; a classe `dark` é removida temporariamente e restaurada na autenticação.
- **Filtros Multi-Select do SCM:** Ao desmarcar o primeiro item de uma seleção com a opção "Todos" marcada, o conjunto de dados é populado com os itens restantes e a flag de "Todos" é desativada.
- **Timezone Padronizado:** A aplicação é configurada globalmente para `America/Sao_Paulo` (`date_default_timezone_set`). Todas as datas operacionais seguem o horário de Brasília.
- **Aprovação via IMAP:** A caixa Gmail de aprovação requer o uso de **senha de aplicativo** (com 2FA ativo). Certifique-se de configurar filtros no Gmail para que mensagens de resposta de PV nunca caiam na pasta de Spam.
