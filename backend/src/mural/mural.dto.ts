export class CriarMuralDto {
  titulo: string;
  descricao: string;
  turma_id?: string;
  turma_nome?: string;
  autor_nome?: string;
  autor_role?: 'admin' | 'professor';
  tecnica?: string;
  imagens?: string[];
  imagem_url?: string;
}

export class AtualizarMuralDto {
  titulo?: string;
  descricao?: string;
  turma_id?: string;
  turma_nome?: string;
  tecnica?: string;
  imagens?: string[];
  imagem_url?: string;
}
