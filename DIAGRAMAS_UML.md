# Diagramas UML - Sistema de Gestão de Alunos e Fila de Espera (CDE Odessa Macedo)

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
  usecase "Realizar Inscrição / Matrícula" as UC1
  usecase "Consultar Turmas e Vagas Disponíveis" as UC2
  usecase "Consultar Posição na Fila de Espera" as UC3
  usecase "Autenticar-se no Painel Administrativo" as UC4
  usecase "Registrar Frequência Diária dos Alunos" as UC5
  usecase "Visualizar Alertas de Faltas Consecutivas" as UC6
  usecase "Gerenciar Ficha do Aluno e Fila de Espera" as UC7
  usecase "Exportar Relatórios Administrativos" as UC8
}

aluno --> UC1
aluno --> UC2
aluno --> UC3

professor --> UC4
professor --> UC5
professor --> UC6

gestor --> UC4
gestor --> UC6
gestor --> UC7
gestor --> UC8

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

class Turma {
  +id: string
  +nome: string
  +turno: string
  +capacidade: number
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
}

class TurmasService {
  -supabaseService: SupabaseService
  +findAll(): Promise<Turma[]>
}

class SupabaseService {
  -supabase: SupabaseClient
  +getClient(): SupabaseClient
}

AlunosController --> AlunosService : utiliza
TurmasController --> TurmasService : utiliza
AlunosService --> SupabaseService : utiliza
TurmasService --> SupabaseService : utiliza
AlunosService ..> Aluno : manipula
TurmasService ..> Turma : manipula
Aluno --> StatusAluno
Aluno "0..*" -- "1" Turma : pertence_a
@enduml
```

---

## 3. Diagrama de Sequência: Inscrição e Gestão de Vagas

```plantuml
@startuml Diagrama_de_Sequencia_Odessa_Macedo
autonumber
skinparam shadowing false

actor "Responsável" as Resp
participant "Frontend (React / Vite)" as Front
participant "Backend (NestJS API)" as Back
database "Supabase (PostgreSQL)" as DB
actor "Gestor Escolar" as Gestor

== Fluxo de Inscrição de Aluno / Fila de Espera ==
Resp -> Front: Preenche formulário de inscrição
Front -> Back: GET /turmas (verifica vagas disponíveis)
Back -> DB: SELECT * FROM turmas
DB --> Back: Retorna lista de turmas e capacidades
Back --> Front: HTTP 200 OK (Dados das turmas)

alt Turma com vaga disponível
  Front -> Back: POST /alunos (status: 'Ativo')
  Back -> DB: INSERT INTO alunos (status = 'Ativo')
else Turma lotada
  Front -> Back: POST /alunos (status: 'Fila')
  Back -> DB: INSERT INTO alunos (status = 'Fila')
end

DB --> Back: Confirmação de inserção
Back --> Front: HTTP 201 Created (Objeto Aluno)
Front --> Resp: Exibe confirmação de matrícula ou inclusão na fila de espera

== Fluxo de Gestão pelo Painel ==
Gestor -> Front: Realiza login no sistema (/login)
Front -> DB: Auth via Supabase Client (signInWithPassword)
DB --> Front: Sessão autenticada
Front -> Back: GET /alunos
Back -> DB: SELECT * FROM alunos ORDER BY created_at DESC
DB --> Back: Retorna lista de alunos registrados
Back --> Front: HTTP 200 OK
Front --> Gestor: Exibe alunos divididos em 'Ativos', 'Fila de Espera' e 'Inativos'
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
    [HTML5 / JS / CSS]
  }
}

node "Nuvem Render.com (Hospedagem Backend)" {
  node "Container Node.js / NestJS" {
    component "REST API Service (Porta 3001)" as API
  }
}

node "Nuvem Supabase (BaaS)" {
  database "PostgreSQL Database" as DB_Postgres {
    storage "Tabelas: alunos e turmas" as TabAlunos
  }
  component "Supabase Auth Service" as Auth
}

SPA -- API : HTTP / REST (HTTPS)
SPA -- Auth : Autenticação de Gestores (HTTPS)
API -- DB_Postgres : Supabase Client (PostgREST API / HTTPS)
@enduml
```
