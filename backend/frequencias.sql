-- Criar a tabela de frequencias/chamada
CREATE TABLE IF NOT EXISTS frequencias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id uuid REFERENCES alunos(id) ON DELETE CASCADE NOT NULL,
  turma_id uuid REFERENCES turmas(id) ON DELETE CASCADE NOT NULL,
  data date NOT NULL,
  status text NOT NULL CHECK (status IN ('PRESENTE', 'FALTA', 'JUSTIFICADA')),
  observacao text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(aluno_id, data)
);

-- Habilitar RLS e criar políticas públicas para acesso da API
ALTER TABLE frequencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura publica em frequencias" ON frequencias FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica em frequencias" ON frequencias FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update publico em frequencias" ON frequencias FOR UPDATE USING (true);
CREATE POLICY "Permitir delete publico em frequencias" ON frequencias FOR DELETE USING (true);
