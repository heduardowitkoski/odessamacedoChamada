-- Adicionar colunas de idade mínima e máxima na tabela turmas se ainda não existirem
ALTER TABLE turmas 
ADD COLUMN IF NOT EXISTS idade_minima integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS idade_maxima integer DEFAULT 120;

-- Atualizar turmas existentes com base no padrão pedagógico do CDE Odessa Macedo
UPDATE turmas SET idade_minima = 5, idade_maxima = 7 WHERE nome ILIKE '%Infantil A%' OR nome ILIKE '%5 a 7%';
UPDATE turmas SET idade_minima = 8, idade_maxima = 10 WHERE nome ILIKE '%Infantil B%' OR nome ILIKE '%8 a 10%';
UPDATE turmas SET idade_minima = 11, idade_maxima = 13 WHERE nome ILIKE '%Juvenil A%' OR nome ILIKE '%11 a 13%';
UPDATE turmas SET idade_minima = 14, idade_maxima = 17 WHERE nome ILIKE '%Juvenil B%' OR nome ILIKE '%14 a 17%';
UPDATE turmas SET idade_minima = 18, idade_maxima = 59 WHERE nome ILIKE '%Adulto%' OR nome ILIKE '%18+%';
UPDATE turmas SET idade_minima = 60, idade_maxima = 120 WHERE nome ILIKE '%Melhor Idade%' OR nome ILIKE '%Idoso%' OR nome ILIKE '%60+%';
