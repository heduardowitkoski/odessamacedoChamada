# Relatório de Status e Documentação Técnica - Sistema de Gestão de Alunos, Turmas e Fila de Espera (CDE Odessa Macedo)

## 1. Arquitetura Tecnológica Implementada

- **Front-end:** React (v19) + TypeScript + Vite + Vanilla CSS. Aplicação SPA (Single Page Application) responsiva, estruturada em componentes modulares e páginas de navegação (`/`, `/inscrever`, `/login`, `/admin`).
- **Back-end:** NestJS (Node.js com TypeScript). API RESTful modularizada (`AlunosModule`, `TurmasModule`, `SupabaseModule` e `FrequenciasModule`).
- **Banco de Dados e Autenticação:** Supabase (PostgreSQL para dados relacionais das tabelas `alunos`, `turmas` e `frequencias`, e Supabase Auth para autenticação de gestores e professores).
- **Hospedagem:** Frontend implantado na **Vercel** (`odessamacedo-chamada.vercel.app`) e Backend implantado no **Render** (`odessamacedochamada.onrender.com`).

---

## 2. Status de Desenvolvimento e Funcionalidades Implementadas

### 2.1. Marco 1: Inscrições, Validação e Portal Público

- **Formulário de Inscrição com Validações e Máscaras de Entrada (`/inscrever`)**
  - **Status:** Concluído e Implementado.
  - **Detalhamento:** Formulário em etapas (Stepper: Responsável → Aluno → Turma → Confirmação) para cadastro de alunos e candidatos à fila de espera. Captura dados completos do responsável (nome, CPF, RG, e-mail, telefone, endereço, CEP, bairro) e do aluno (nome, data de nascimento, sexo, CPF, escola de origem, experiência artística prévia e necessidades especiais/PCD).
  - **Validações de Segurança e Formatação Implementadas:**
    - *Validação de CPF:* Algoritmo oficial de verificação dos dígitos verificadores (rejeição de CPFs inválidos ou sequências repetidas).
    - *Validação de E-mail:* Verificação de sintaxe de e-mail (`usuario@dominio.com`).
    - *Validação de Telefone:* Exigência de DDD e quantidade válida de dígitos (10 ou 11 dígitos).
    - *Validação de Data de Nascimento:* Bloqueio de datas futuras ou idades irreais (>120 anos).
    - *Máscaras em Tempo de Digitação:* Formatação automática instantânea para CPF (`000.000.000-00`), Telefone (`(00) 00000-0000`) e CEP (`00000-000`).
    - *Alertas Visuais:* Destaque de erros em vermelho abaixo dos campos e bloqueio de avanço no Stepper enquanto houver pendências.

- **Portal Público de Turmas e Exibição de Disponibilidade (`/`)**
  - **Status:** Concluído e Implementado.
  - **Detalhamento:** Apresentação das turmas disponíveis por faixa etária (Infantil, Juvenil, Adulto, Melhor Idade) e turnos. 
  - **Diretriz de Vagas ("Há Vagas"):** Conforme solicitação dos gestores, o portal público não expõe mais nenhum número de ocupação. Foram removidos os contadores de **alunos matriculados**, **fila de espera** e **vagas abertas** do portal, além da **barra de disponibilidade** de cada turma (no portal e na inscrição). O sistema exibe apenas o status amigável **"Há vagas"** ou **"Turma cheia"** (direcionando para a fila de espera). Os números absolutos e os indicadores de vagas ficam restritos à área administrativa autenticada.

---

### 2.2. Marco 2: Gestão Escolar, Frequência e Administração de Turmas

- **Painel Administrativo com Autenticação (`/admin`)**
  - **Status:** Concluído e Implementado.
  - **Detalhamento:** Autenticação segura via Supabase Auth (`/login`) para acesso restrito de gestores e professores. Painel com cards de métricas (Alunos Matriculados, Fila de Espera, Alertas de Faltas e Turmas com Vagas), busca, filtros e visualização de fichas dos alunos com contato via WhatsApp.

- **Módulo de Gestão e Criação de Novas Turmas**
  - **Status:** Concluído e Implementado.
  - **Detalhamento:** Aba dedicada no painel administrativo (`Turmas`) exibindo a lista de turmas cadastradas com nome, turno, capacidade e total de alunos ativos. 
  - **Criação de Novas Turmas:** Modal interativo (`+ Nova Turma`) que permite aos gestores cadastrar novas turmas (Nome, Turno/Horário e Capacidade Total) diretamente pela interface. Integração via `POST /turmas` com o backend NestJS e Supabase.
  - **Permissões RLS:** Configuração do `SupabaseService` no NestJS utilizando autenticação com `Service Role Key` administrativa, contornando bloqueios de RLS (*Row-Level Security*) na criação e edição de turmas.

- **Módulo de Registro e Consulta de Frequência Diária**
  - **Status:** Concluído e Implementado.
  - **Detalhamento:** 
    - *Chamada Diária:* Interface para seleção de Turma e Data da Aula, com alternância de presença (**Presente**, **Falta**, **Justificada**) e campo para lançamento de observações/justificativas.
    - *Histórico e Consulta Retroativa:* Possibilidade de selecionar qualquer data passada para visualizar ou atualizar a chamada salva naquele dia específico.
    - *Compatibilidade do Esquema:* Mapeamento preciso para a tabela `frequencias` do Supabase (campos `aluno_id`, `data`, `presente` booleano e `justificativa` texto).
    - *Auto-Seleção Inteligente:* Ao abrir a aba Frequência, a aplicação seleciona automaticamente a primeira turma que possui alunos matriculados.
    - *Alertas de Absenteísmo:* Identificação automática e destaque de alunos com 3 ou mais faltas consecutivas, disponibilizando atalhos para comunicação com o responsável ou inativação da vaga.

---

### 2.3. Marco 3: Gestão de Qualidade, Relatórios e Implantação

- **Segurança de Dados e LGPD**
  - **Status:** Concluído e Implementado.
  - **Detalhamento:** Estrutura de dados protegida por autenticação e controle de chave administrativa no backend para resguardar informações sensíveis de alunos e responsáveis.

- **Ferramentas de Exportação e Relatórios Administrativos**
  - **Status:** Concluído e Implementado.
  - **Detalhamento:** Aba dedicada de `Relatórios` no painel administrativo com indicadores consolidados (frequência média, aulas registradas, alunos ativos e alunos em risco), gráfico de frequência por turma e tabela analítica detalhada.
  - **Exportação:** Geração de relatórios em **CSV** e **PDF** tanto do histórico de frequência (com filtros por turma e período) quanto da **lista de espera** (ordenada por inscrição, com dados de contato do responsável), por meio do módulo `RelatoriosModule` do NestJS e da biblioteca `pdfkit`.

- **Formulário de Avaliação e Treinamento Final**
  - **Status:** Pendente.
  - **Detalhamento:** Coleta de feedback da comunidade escolar e treinamento oficial da equipe pedagógica do CDE Odessa Macedo.

---

## 3. Resumo dos Endpoints da API (NestJS / Render)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/alunos` | Lista todos os alunos cadastrados com suas respectivas turmas |
| `POST` | `/alunos` | Cadastra um novo aluno (define status `Ativo` ou `Fila` conforme vagas) |
| `PATCH` | `/alunos/:id/status` | Atualiza o status do aluno (`Ativo`, `Fila`, `Inativo`) e ajusta vagas |
| `GET` | `/turmas` | Retorna a lista de todas as turmas cadastradas |
| `POST` | `/turmas` | Cadastra uma nova turma (Nome, Turno e Capacidade) |
| `GET` | `/frequencias/turma/:turma_id?data=YYYY-MM-DD` | Busca os alunos de uma turma e o registro de chamada da data informada |
| `POST` | `/frequencias/batch` | Salva ou atualiza a chamada em lote de uma turma para uma data |
| `GET` | `/frequencias/alertas` | Retorna a lista de alunos ativos com 3+ faltas consecutivas |
| `GET` | `/relatorios/resumo` | Indicadores consolidados de frequência por turma e totais gerais |
| `GET` | `/relatorios/fila-espera/csv` \| `/relatorios/fila-espera/pdf` | Exporta a lista de espera em CSV ou PDF |
| `GET` | `/relatorios/frequencias/csv` \| `/relatorios/frequencias/pdf` | Exporta o relatório de frequência (filtros `turma_id`, `data_inicio`, `data_fim`) |
| `GET` | `/turmas/exportar-csv` | Exporta dados completos de todas as turmas em CSV |
| `GET` | `/frequencias/minhas-faltas` | Retorna faltas, presenças e métricas do aluno para o responsável |
| `GET` | `/admin/usuarios` \| `POST /admin/usuarios` | Listagem e criação de outros administradores |

---

## 4. Mapeamento Arquitetural: Arquivos e Responsabilidades

### 4.1. Camada de Apresentação (Frontend React SPA)
* **Ponto de Entrada e Rotas:**
  * `frontend/src/main.tsx`: Ponto de montagem React na DOM.
  * `frontend/src/App.tsx`: Configuração de rotas públicas e rotas protegidas por papel.
* **Páginas (Views):**
  * `frontend/src/pages/Portal/Portal.tsx`: Portal público com turmas, vagas e acesso rápido.
  * `frontend/src/pages/Enrollment/Enrollment.tsx`: Formulário multi-step de matrícula e fila de espera.
  * `frontend/src/pages/Auth/Login.tsx`: Autenticação por perfil (Admin, Professor, Responsável).
  * `frontend/src/pages/Auth/ResetPassword.tsx`: Redefinição e definição de senha de primeiro acesso.
  * `frontend/src/pages/Responsible/ResponsiblePortal.tsx`: Portal exclusivo do responsável para frequência.
  * `frontend/src/pages/Professor/ProfessorPortal.tsx`: Portal do professor para chamada diária e mural.
  * `frontend/src/pages/Admin/AdminDashboard.tsx`: Painel administrativo integral (alunos, fila, turmas, admins).
  * `frontend/src/pages/Admin/ReportsTab.tsx`: Aba analítica e relatórios consolidados do administrador.
  * `frontend/src/pages/Mural/MuralPage.tsx`: Galeria e mural de obras e trabalhos desenvolvidos nas aulas.
* **Segurança e Componentes Reutilizáveis:**
  * `frontend/src/components/ui/PrivateRoute.tsx`: Guardião de rotas com controle de acesso baseado em papéis (RBAC).
  * `frontend/src/components/ui/StudentHistoryModal.tsx`: Modal com histórico individual de chamadas do estudante.
  * `frontend/src/components/mural/MuralBoard.tsx`: Quadro interativo de postagens de obras.
* **Serviços de Cliente:**
  * `frontend/src/lib/supabase.ts`: Conexão com o Supabase Auth e Banco no browser.
  * `frontend/src/lib/auth.ts`: Gestão de sessões ativas e perfis.
  * `frontend/src/lib/api.ts`: Resolução dinâmica do endpoint do backend.
  * `frontend/src/lib/muralService.ts`: Comunicação com o mural de obras.

### 4.2. Camada de Serviços e Negócio (Backend NestJS)
* **Núcleo & Infraestrutura:**
  * `backend/src/main.ts`: Bootstrap da API, CORS e porta HTTP.
  * `backend/src/app.module.ts`: Módulo raiz que integra os submódulos de negócio.
  * `backend/src/supabase/supabase.service.ts`: Cliente administrativo do Supabase (`service_role`).
  * `backend/src/database/database.service.ts`: Fallback de persistência e resiliência local.
* **Módulos de Domínio:**
  * **Alunos & Fila:** `backend/src/alunos/alunos.controller.ts`, `alunos.service.ts` e `aluno-validator.ts`.
  * **Turmas & Vagas:** `backend/src/turmas/turmas.controller.ts` e `turmas.service.ts`.
  * **Frequência & Chamada:** `backend/src/frequencias/frequencias.controller.ts` e `frequencias.service.ts`.
  * **Administradores:** `backend/src/admin/admin.controller.ts` e `admin.service.ts`.
  * **E-mail Transacional:** `backend/src/email/email.service.ts` (Nodemailer e templates HTML).
  * **Mural de Obras:** `backend/src/mural/mural.controller.ts`, `mural.service.ts` e `mural.dto.ts`.
  * **Relatórios:** `backend/src/relatorios/relatorios.controller.ts` e `relatorios.service.ts` (PDFKit / CSV).

### 4.3. Camada de Dados e Migrações (PostgreSQL / Supabase)
* `backend/supabase.sql`: Estrutura de tabelas relacionais (`turmas`, `alunos`).
* `backend/frequencias.sql`: Tabela `frequencias` com restrição única por aluno e data.
* `backend/update_turmas_faixa_etaria.sql`: Migração de colunas `idade_minima` e `idade_maxima`.
* `backend/seed_turmas.sql`: Carga inicial de turmas.

---
