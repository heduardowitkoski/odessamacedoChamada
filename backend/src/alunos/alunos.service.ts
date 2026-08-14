import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AlunosService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('alunos')
      .select('*, turmas(*)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async create(createAlunoDto: any) {
    const supabase = this.supabaseService.getClient();

    // 1. Checar lotação da turma selecionada
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('capacidade')
      .eq('id', createAlunoDto.turma_id)
      .single();

    if (turmaError || !turma) {
      throw new InternalServerErrorException("Erro ao buscar a turma: " + (turmaError?.message || "Não encontrada"));
    }

    // 2. Definir status baseado na capacidade
    let status = 'Ativo';
    if (turma.capacidade <= 0) {
      status = 'Fila';
    }

    // 3. Inserir aluno
    const { data, error } = await supabase
      .from('alunos')
      .insert([{ ...createAlunoDto, status }])
      .select();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // 4. Se o aluno foi Ativo, subtrai 1 vaga da turma
    if (status === 'Ativo') {
      await supabase
        .from('turmas')
        .update({ capacidade: turma.capacidade - 1 })
        .eq('id', createAlunoDto.turma_id);
    }

    return data;
  }

  async updateStatus(id: string, novoStatus: string, turma_id: string) {
    const supabase = this.supabaseService.getClient();

    // 1. Buscar a turma atual para verificação de vagas se for mudar para Ativo
    const { data: turma } = await supabase
      .from('turmas')
      .select('capacidade')
      .eq('id', turma_id)
      .single();

    if (!turma) {
      throw new BadRequestException("Turma não encontrada.");
    }

    if (novoStatus === 'Ativo' && turma.capacidade <= 0) {
      throw new BadRequestException("Não há vagas disponíveis nesta turma.");
    }

    // 2. Atualizar o status do aluno
    const { data: aluno, error } = await supabase
      .from('alunos')
      .update({ status: novoStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // 3. Ajustar vagas da turma
    if (novoStatus === 'Inativo') {
      // Devolve 1 vaga
      await supabase.from('turmas').update({ capacidade: turma.capacidade + 1 }).eq('id', turma_id);
    } else if (novoStatus === 'Ativo') {
      // Consome 1 vaga
      await supabase.from('turmas').update({ capacidade: turma.capacidade - 1 }).eq('id', turma_id);
    }

    return aluno;
  }
}
