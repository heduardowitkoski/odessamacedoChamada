-- =========================================================================
-- ATUALIZAÇÃO DO BANCO SUPABASE: TABELAS LISTA_ESPERA E ALUNOS
-- =========================================================================

-- 1. Criação/Atualização da tabela lista_espera
CREATE TABLE IF NOT EXISTS lista_espera (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id uuid REFERENCES turmas(id) ON DELETE SET NULL,

  -- Dados do Responsável / Contato
  resp_nome text,
  nome_responsavel text, -- compatibilidade com schema legado
  resp_cpf text,
  resp_rg text,
  resp_parentesco text,
  resp_email text,
  email_responsavel text,
  resp_telefone text,
  telefone_responsavel text, -- compatibilidade com schema legado
  resp_endereco text,
  resp_cep text,
  resp_bairro text,

  -- Dados do Aluno
  aluno_nome text,
  nome_aluno text, -- compatibilidade com schema legado
  aluno_nascimento date,
  data_nascimento date, -- compatibilidade com schema legado
  aluno_sexo text,
  aluno_cpf text,
  aluno_escola text,
  aluno_experiencia text,
  aluno_necessidades text,

  -- Controle
  status text NOT NULL DEFAULT 'aguardando', -- 'aguardando', 'aprovado', 'recusado'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar colunas se a tabela lista_espera já existia anteriormente com menos campos
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES turmas(id) ON DELETE SET NULL;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_nome text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_cpf text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_rg text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_parentesco text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_email text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS email_responsavel text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_telefone text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_endereco text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_cep text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS resp_bairro text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS aluno_nome text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS aluno_nascimento date;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS aluno_sexo text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS aluno_cpf text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS aluno_escola text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS aluno_experiencia text;
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS aluno_necessidades text;

-- Desativar restrições NOT NULL em colunas antigas caso existam
ALTER TABLE lista_espera ALTER COLUMN nome_aluno DROP NOT NULL;
ALTER TABLE lista_espera ALTER COLUMN nome_responsavel DROP NOT NULL;
ALTER TABLE lista_espera ALTER COLUMN telefone_responsavel DROP NOT NULL;
ALTER TABLE lista_espera ALTER COLUMN data_nascimento DROP NOT NULL;

-- 2. Garantir coluna resp_parentesco na tabela alunos
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS resp_parentesco text;

-- 3. Políticas de Segurança (RLS) para lista_espera
ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura publica lista_espera" ON lista_espera;
CREATE POLICY "Permitir leitura publica lista_espera" ON lista_espera FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao publica lista_espera" ON lista_espera;
CREATE POLICY "Permitir insercao publica lista_espera" ON lista_espera FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update publico lista_espera" ON lista_espera;
CREATE POLICY "Permitir update publico lista_espera" ON lista_espera FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete publico lista_espera" ON lista_espera;
CREATE POLICY "Permitir delete publico lista_espera" ON lista_espera FOR DELETE USING (true);
