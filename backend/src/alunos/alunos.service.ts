import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { validateAlunoPayload, parseDateString, calculateAge } from './aluno-validator';
import { extractAgeRange } from '../turmas/turmas.service';

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

    // 1. Buscar a turma selecionada para verificar vagas e faixa etária
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('*')
      .eq('id', createAlunoDto.turma_id)
      .single();

    if (turmaError || !turma) {
      throw new BadRequestException('Turma selecionada não encontrada.');
    }

    const fallbackAge = extractAgeRange(turma.nome || '');
    const turmaWithAge = {
      ...turma,
      idade_minima: turma.idade_minima != null ? Number(turma.idade_minima) : fallbackAge.idade_minima,
      idade_maxima: turma.idade_maxima != null ? Number(turma.idade_maxima) : fallbackAge.idade_maxima,
    };

    // 2. Validação rigorosa dos campos e faixa etária da turma
    const validationErrors = validateAlunoPayload(createAlunoDto, turmaWithAge);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Existem campos inválidos ou não preenchidos na inscrição.',
        errors: validationErrors,
      });
    }

    // 3. Normalização da data de nascimento para ISO (YYYY-MM-DD)
    const { date, iso } = parseDateString(createAlunoDto.aluno_nascimento);
    const aluno_nascimento = iso || createAlunoDto.aluno_nascimento;

    // 4. Se for maior de idade, duplica nome e CPF para o responsável se não informados
    const isAdult = date ? calculateAge(date) >= 18 : false;
    const resp_nome = createAlunoDto.resp_nome?.trim() || (isAdult ? createAlunoDto.aluno_nome?.trim() : '');
    const resp_cpf = createAlunoDto.resp_cpf?.trim() || (isAdult ? createAlunoDto.aluno_cpf?.trim() : '');
    const aluno_nome = createAlunoDto.aluno_nome?.trim();

    // 5. Definir status baseado na capacidade
    let status = 'Ativo';
    if (turma.capacidade <= 0) {
      status = 'Fila';
    }

    // 6. Inserir aluno
    const { data, error } = await supabase
      .from('alunos')
      .insert([
        {
          ...createAlunoDto,
          aluno_nome,
          aluno_nascimento,
          resp_nome,
          resp_cpf,
          status,
        },
      ])
      .select();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // 7. Se o aluno foi Ativo, subtrai 1 vaga da turma
    if (status === 'Ativo') {
      await supabase
        .from('turmas')
        .update({ capacidade: turma.capacidade - 1 })
        .eq('id', createAlunoDto.turma_id);
    }

    return data;
  }

  async remove(id: string) {
    const supabase = this.supabaseService.getClient();

    // 1. Buscar o aluno para saber sua turma e status atual
    const { data: aluno, error: findError } = await supabase
      .from('alunos')
      .select('id, status, turma_id')
      .eq('id', id)
      .single();

    if (findError || !aluno) {
      throw new BadRequestException('Aluno não encontrado para exclusão.');
    }

    // 2. Se o aluno estava Ativo, devolve 1 vaga para a turma correspondente
    if (aluno.status === 'Ativo' && aluno.turma_id) {
      const { data: turma } = await supabase
        .from('turmas')
        .select('capacidade')
        .eq('id', aluno.turma_id)
        .single();

      if (turma) {
        await supabase
          .from('turmas')
          .update({ capacidade: turma.capacidade + 1 })
          .eq('id', aluno.turma_id);
      }
    }

    // 3. Excluir frequências vinculadas ao aluno
    await supabase
      .from('frequencias')
      .delete()
      .eq('aluno_id', id);

    // 4. Excluir definitivamente o aluno do banco de dados
    const { error: deleteError } = await supabase
      .from('alunos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new InternalServerErrorException('Erro ao excluir aluno do banco: ' + deleteError.message);
    }

    return { success: true, message: 'Aluno removido com sucesso do banco de dados.' };
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
      throw new BadRequestException('Turma não encontrada.');
    }

    if (novoStatus === 'Ativo' && turma.capacidade <= 0) {
      throw new BadRequestException('Não há vagas disponíveis nesta turma.');
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
      await supabase.from('turmas').update({ capacidade: turma.capacidade + 1 }).eq('id', turma_id);
    } else if (novoStatus === 'Ativo') {
      await supabase.from('turmas').update({ capacidade: turma.capacidade - 1 }).eq('id', turma_id);
    }

    return aluno;
  }
}
