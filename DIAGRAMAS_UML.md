# Diagramas UML - Sistema de Gestão de Alunos, Turmas e Fila de Espera (CDE Odessa Macedo)

Este documento reúne a especificação em código **PlantUML** dos principais diagramas de modelagem do sistema de gestão do CDE Odessa Macedo. Os códigos abaixo podem ser copiados e colados em ferramentas como o [PlantText](https://www.planttext.com/) ou o servidor oficial do [PlantUML](http://www.plantuml.com/plantuml/).

---

## 1. Diagrama de Casos de Uso

```plantuml
@startuml Diagrama_de_Casos_de_Uso_Odessa_Macedo
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Aluno / Responsável" as aluno
actor "Professor / Educador" as professor
actor "Gestor Escolar (CDE Odessa Macedo)" as gestor

rectangle "Sistema de Gestão Escolar - CDE Odessa Macedo" {
  usecase "Realizar Inscrição com Validação de Dados" as UC1
  usecase "Consultar Turmas e Disponibilidade ('Há Vagas')" as UC2
  usecase "Consultar Posição na Fila de Espera" as UC3
  usecase "Autenticar-se no Painel Administrativo" as UC4
  usecase "Registrar e Consultar Frequência Diária / Histórico" as UC5
  usecase "Visualizar Alertas de Faltas Consecutivas" as UC6
  usecase "Gerenciar Ficha do Aluno e Fila de Espera" as UC7
  usecase "Criar e Gerenciar Novas Turmas e Vagas" as UC8
  usecase "Exportar Relatórios Administrativos" as UC9
}

aluno --> UC1
aluno --> UC2
aluno --> UC3

professor --> UC4
professor --> UC5
professor --> UC6

gestor --> UC4
gestor --> UC5
gestor --> UC6
gestor --> UC7
gestor --> UC8
gestor --> UC9

UC1 .> UC7 : <<include>>
@enduml
```

---

## 2. Diagrama de Classes (Domínio e Serviços)

```plantuml
@startuml Diagrama_de_Classes_Odessa_Macedo
skinparam classAttributeIconSize 0
skinparam shadowing false

enum StatusAluno {
  ATIVO
  FILA
  INATIVO
}

enum StatusPresenca {
  PRESENTE
  FALTA
  JUSTIFICADA
}

class Turma {
  +id: string
  +nome: string
  +turno: string
  +capacidade: number
  +created_at: Date
}

class Aluno {
  +id: string
  +turma_id: string
  +resp_nome: string
  +resp_cpf: string
  +resp_rg: string
  +resp_email: string
  +resp_telefone: string
  +resp_endereco: string
  +resp_cep: string
  +resp_bairro: string
  +aluno_nome: string
  +aluno_nascimento: Date
  +aluno_sexo: string
  +aluno_cpf: string
  +aluno_escola: string
  +aluno_experiencia: string
  +aluno_necessidades: string
  +status: StatusAluno
  +created_at: Date
}

class Frequencia {
  +id: string
  +aluno_id: string
  +data: string
  +presente: boolean
  +justificativa: string
  +created_at: Date
}

class AlunosController {
  -alunosService: AlunosService
  +findAll(): Promise<Aluno[]>
  +create(body: Record<string, unknown>): Promise<Aluno>
  +updateStatus(id: string, body: { status: string }): Promise<Aluno>
}

class AlunosService {
  -supabaseService: SupabaseService
  +findAll(): Promise<Aluno[]>
  +create(createDto: Record<string, unknown>): Promise<Aluno>
  +updateStatus(id: string, status: string): Promise<Aluno>
}

class TurmasController {
  -turmasService: TurmasService
  +findAll(): Promise<Turma[]>
  +create(body: { nome: string, turno: string, capacidade: number }): Promise<Turma>
}

class TurmasService {
  -supabaseService: SupabaseService
  +findAll(): Promise<Turma[]>
  +create(createDto: { nome: string, turno: string, capacidade: number }): Promise<Turma>
}

class FrequenciasController {
  -frequenciasService: FrequenciasService
  +buscarPorTurmaEData(turma_id: string, data: string): Promise<any[]>
  +salvarLote(body: any): Promise<any>
  +buscarAlertasFaltas(): Promise<any[]>
}

class FrequenciasService {
  -supabaseService: SupabaseService
  +buscarPorTurmaEData(turma_id: string, data: string): Promise<any[]>
  +salvarLote(turma_id: string, data: string, registros: any[]): Promise<any>
  +buscarAlertasFaltas(): Promise<any[]>
}

class SupabaseService {
  -supabase: SupabaseClient
  +getClient(): SupabaseClient
}

AlunosController --> AlunosService : utiliza
TurmasController --> TurmasService : utiliza
FrequenciasController --> FrequenciasService : utiliza

AlunosService --> SupabaseService : utiliza
TurmasService --> SupabaseService : utiliza
FrequenciasService --> SupabaseService : utiliza

AlunosService ..> Aluno : manipula
TurmasService ..> Turma : manipula
FrequenciasService ..> Frequencia : manipula

Aluno --> StatusAluno
Frequencia --> StatusPresenca
Aluno "0..*" -- "1" Turma : pertence_a
Frequencia "0..*" -- "1" Aluno : registrada_para
@enduml
```

---

## 3. Diagrama de Sequência: Criação de Nova Turma e Registro de Chamada

```plantuml
@startuml Diagrama_de_Sequencia_Odessa_Macedo
autonumber
skinparam shadowing false

actor "Gestor / Professor" as Gestor
participant "Frontend (React / Admin)" as Front
participant "Backend (NestJS API)" as Back
database "Supabase (PostgreSQL)" as DB

== Fluxo 1: Criação de Nova Turma pelo Gestor ==
Gestor -> Front: Clica em "+ Nova Turma" e preenche os dados (Nome, Turno, Capacidade)
Front -> Back: POST /turmas (dados da turma)
Back -> DB: INSERT INTO turmas (via Service Role Key)
DB --> Back: Retorna objeto da turma criada (HTTP 201)
Back --> Front: HTTP 201 Created (Turma criada)
Front --> Gestor: Atualiza a lista de turmas no painel

== Fluxo 2: Lançamento e Consulta de Chamada Diária ==
Gestor -> Front: Seleciona Turma e Data da Aula
Front -> Back: GET /frequencias/turma/:id?data=YYYY-MM-DD
Back -> DB: SELECT alunos WHERE turma_id AND status != 'Inativo'
DB --> Back: Lista de alunos da turma
Back -> DB: SELECT frequencias WHERE aluno_id IN (...) AND data = date
DB --> Back: Registros de chamada existentes
Back --> Front: HTTP 200 OK (Alunos com status de presença)

Gestor -> Front: Altera presencia/faltas e clica em "Salvar Chamada"
Front -> Back: POST /frequencias/batch (registros)
Back -> DB: UPSERT INTO frequencias (aluno_id, data, presente, justificativa)
DB --> Back: Registros salvos
Back --> Front: HTTP 200 OK
Front --> Gestor: Exibe mensagem de sucesso
@enduml
```

---

## 4. Diagrama de Implantação / Arquitetura

```plantuml
@startuml Diagrama_de_Implantacao_Odessa_Macedo
skinparam nodeAttributeIconSize 0
skinparam shadowing false

node "Dispositivo do Usuário (Pais / Professores / Gestores)" {
  artifact "Navegador Web (Chrome / Firefox / Edge)" {
    component "React SPA App (Vercel)" as SPA
  }
}

node "Nuvem Vercel (Hospedagem Frontend)" {
  folder "Estáticos & Assets" {
    [HTML5 / TSX / CSS / Vite]
  }
}

node "Nuvem Render.com (Hospedagem Backend)" {
  node "Container Node.js / NestJS" {
    component "REST API Service (Porta 3001)" as API
  }
}

node "Nuvem Supabase (BaaS)" {
  database "PostgreSQL Database" as DB_Postgres {
    storage "Tabelas: alunos, turmas, frequencias" as Tables
  }
  component "Supabase Auth Service" as Auth
}

SPA -- API : HTTP / REST (HTTPS)
SPA -- Auth : Autenticação de Gestores (HTTPS)
API -- DB_Postgres : Supabase Client (Service Role / PostgREST API)
@enduml
```
