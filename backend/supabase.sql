-- 1. Se a tabela alunos existir, precisamos descartá-la para recriar com a estrutura correta (Atenção: apagará dados de alunos existentes)
DROP TABLE IF EXISTS alunos CASCADE;

-- 2. Criar a tabela de alunos com todos os campos do formulário
CREATE TABLE alunos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id uuid REFERENCES turmas(id) ON DELETE RESTRICT,
  
  -- Dados do Responsável / Contato
  resp_nome text NOT NULL,
  resp_cpf text,
  resp_rg text,
  resp_email text,
  resp_telefone text NOT NULL,
  resp_endereco text,
  resp_cep text,
  resp_bairro text,

  -- Dados do Aluno
  aluno_nome text NOT NULL,
  aluno_nascimento date NOT NULL,
  aluno_sexo text,
  aluno_cpf text,
  aluno_escola text,
  aluno_experiencia text,
  aluno_necessidades text,

  -- Sistema
  status text NOT NULL DEFAULT 'Ativo', -- Pode ser 'Ativo', 'Fila', 'Inativo'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (opcional para projeto de testes, deixamos public)
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura publica" ON alunos FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica" ON alunos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update publico" ON alunos FOR UPDATE USING (true);
CREATE POLICY "Permitir delete publico" ON alunos FOR DELETE USING (true);
