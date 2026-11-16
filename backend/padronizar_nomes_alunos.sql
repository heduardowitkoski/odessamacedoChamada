-- Script de migração para padronizar nomes de alunos existentes
-- Padrão: "Primeiro Nome A. B. C." (apenas primeira letra de cada sobrenome em maiúscula com ponto)

CREATE OR REPLACE FUNCTION formatar_nome_aluno(nome_completo text)
RETURNS text AS $$
DECLARE
    partes text[];
    primeiro_nome text;
    iniciais text := '';
    i int;
    palavra_limpa text;
BEGIN
    IF nome_completo IS NULL OR trim(nome_completo) = '' THEN
        RETURN nome_completo;
    END IF;

    partes := regexp_split_to_array(trim(nome_completo), '\s+');
    
    IF array_length(partes, 1) <= 1 THEN
        RETURN partes[1];
    END IF;

    primeiro_nome := partes[1];

    FOR i IN 2..array_length(partes, 1) LOOP
        palavra_limpa := replace(partes[i], '.', '');
        IF length(palavra_limpa) > 0 THEN
            iniciais := iniciais || ' ' || upper(substring(palavra_limpa from 1 for 1)) || '.';
        END IF;
    END LOOP;

    RETURN primeiro_nome || iniciais;
END;
$$ LANGUAGE plpgsql;

-- Executar a padronização em todos os registros da tabela alunos
UPDATE alunos
SET aluno_nome = formatar_nome_aluno(aluno_nome)
WHERE aluno_nome IS NOT NULL;
