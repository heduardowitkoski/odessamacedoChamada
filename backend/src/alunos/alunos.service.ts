import { Injectable, InternalServerErrorException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { validateAlunoPayload, parseDateString, calculateAge } from './aluno-validator';
import { extractAgeRange } from '../turmas/turmas.service';

@Injectable()
export class AlunosService {
  private readonly logger = new Logger(AlunosService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Optional() private readonly databaseService?: DatabaseService,
  ) {}

  async findAll() {
    // 1. Resposta Instantânea da RAM via DatabaseService (< 1ms)
    if (this.databaseService) {
      return this.databaseService.getAlunos();
    }

    // Fallback direto ao Supabase
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
    let turmaWithAge: any;

    if (this.databaseService) {
      const turma = await this.databaseService.getTurmaById(createAlunoDto.turma_id);
      if (!turma) {
        throw new BadRequestException('Turma selecionada não encontrada.');
      }
      turmaWithAge = turma;
    } else {
      const { data: turma, error: turmaError } = await this.supabaseService
        .getClient()
        .from('turmas')
        .select('*')
        .eq('id', createAlunoDto.turma_id)
        .single();

      if (turmaError || !turma) {
        throw new BadRequestException('Turma selecionada não encontrada.');
      }

      const fallbackAge = extractAgeRange(turma.nome || '');
      turmaWithAge = {
        ...turma,
        idade_minima: turma.idade_minima != null ? Number(turma.idade_minima) : fallbackAge.idade_minima,
        idade_maxima: turma.idade_maxima != null ? Number(turma.idade_maxima) : fallbackAge.idade_maxima,
      };
    }

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

    const normalizedDto = {
      ...createAlunoDto,
      aluno_nome,
      aluno_nascimento,
      resp_nome,
      resp_cpf,
    };

    // 5. Salva de forma ultra-rápida no DatabaseService com sync assíncrono
    if (this.databaseService) {
      return this.databaseService.createAluno(normalizedDto);
    }

    // Fallback direto ao Supabase
    const supabase = this.supabaseService.getClient();
    let status = 'Ativo';
    if (turmaWithAge.capacidade <= 0) {
      status = 'Fila';
    }

    const { data, error } = await supabase
      .from('alunos')
      .insert([
        {
          ...normalizedDto,
          status,
        },
      ])
      .select();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (status === 'Ativo') {
      await supabase
        .from('turmas')
        .update({ capacidade: turmaWithAge.capacidade - 1 })
        .eq('id', createAlunoDto.turma_id);
    }

    return data;
  }

  async remove(id: string) {
    if (this.databaseService) {
      return this.databaseService.removeAluno(id);
    }

    const supabase = this.supabaseService.getClient();

    const { data: aluno, error: findError } = await supabase
      .from('alunos')
      .select('id, status, turma_id')
      .eq('id', id)
      .single();

    if (findError || !aluno) {
      throw new BadRequestException('Aluno não encontrado para exclusão.');
    }

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

    await supabase
      .from('frequencias')
      .delete()
      .eq('aluno_id', id);

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
    if (this.databaseService) {
      const alunoAtual = (await this.databaseService.getAlunos()).find((a) => a.id === id);
      if (!alunoAtual) {
        throw new BadRequestException('Aluno não encontrado.');
      }
      const estavaNaFila = alunoAtual.status === 'Fila';
      const turma = await this.databaseService.getTurmaById(turma_id);

      if (!turma) {
        throw new BadRequestException('Turma não encontrada.');
      }

      if (novoStatus === 'Ativo' && turma.capacidade <= 0) {
        throw new BadRequestException('Não há vagas disponíveis nesta turma.');
      }

      const aluno = await this.databaseService.updateAlunoStatus(id, novoStatus, turma_id);

      let action_link: string | null = null;
      let email_enviado = false;

      if (estavaNaFila && novoStatus === 'Ativo' && aluno?.resp_email) {
        try {
          const respEmail = aluno.resp_email.trim().toLowerCase();
          const supabase = this.supabaseService.getClient();

          const { data: usersData } = await supabase.auth.admin.listUsers();
          const existingUser = (usersData?.users || []).find(
            (u: any) => u.email?.toLowerCase() === respEmail,
          );

          if (!existingUser) {
            await supabase.auth.admin.createUser({
              email: respEmail,
              password: crypto.randomUUID(),
              email_confirm: true,
              user_metadata: {
                role: 'responsavel',
                nome: aluno.resp_nome,
                aluno_id: aluno.id,
                aluno_nome: aluno.aluno_nome,
              },
            });
          }

          const frontendUrl =
            this.configService.get<string>('FRONTEND_URL') ||
            'https://odessamacedo-chamada.vercel.app';

          const { data: linkData, error: linkError } =
            await supabase.auth.admin.generateLink({
              type: 'recovery',
              email: respEmail,
              options: {
                redirectTo: `${frontendUrl}/redefinir-senha`,
              },
            });

          if (!linkError) {
            action_link = linkData?.properties?.action_link || null;
          }

          if (action_link) {
            const emailRes = await this.emailService.enviarEmailAlunoChamado({
              resp_nome: aluno.resp_nome,
              resp_email: respEmail,
              aluno_nome: aluno.aluno_nome,
              turma_nome: turma.nome,
              turma_turno: turma.turno,
              action_link,
            });
            email_enviado = emailRes.success;
          }
        } catch (err: any) {
          this.logger.error(`Falha ao processar e-mail de ativação: ${err?.message}`);
        }
      }

      return {
        aluno,
        action_link,
        email_enviado,
        message:
          estavaNaFila && novoStatus === 'Ativo'
            ? 'Aluno chamado da fila com sucesso!'
            : 'Status do aluno atualizado com sucesso.',
      };
    }

    // Fallback direto ao Supabase
    const supabase = this.supabaseService.getClient();

    const { data: turma } = await supabase
      .from('turmas')
      .select('*')
      .eq('id', turma_id)
      .single();

    if (!turma) {
      throw new BadRequestException('Turma não encontrada.');
    }

    if (novoStatus === 'Ativo' && turma.capacidade <= 0) {
      throw new BadRequestException('Não há vagas disponíveis nesta turma.');
    }

    const { data: alunoAtual } = await supabase
      .from('alunos')
      .select('*')
      .eq('id', id)
      .single();

    if (!alunoAtual) {
      throw new BadRequestException('Aluno não encontrado.');
    }

    const estavaNaFila = alunoAtual.status === 'Fila';

    const { data: aluno, error } = await supabase
      .from('alunos')
      .update({ status: novoStatus, turma_id })
      .eq('id', id)
      .select('*, turmas(*)')
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (novoStatus === 'Inativo') {
      await supabase.from('turmas').update({ capacidade: turma.capacidade + 1 }).eq('id', turma_id);
    } else if (novoStatus === 'Ativo') {
      await supabase.from('turmas').update({ capacidade: turma.capacidade - 1 }).eq('id', turma_id);
    }

    return {
      aluno,
      action_link: null,
      email_enviado: false,
      message:
        estavaNaFila && novoStatus === 'Ativo'
          ? 'Aluno chamado da fila com sucesso!'
          : 'Status do aluno atualizado com sucesso.',
    };
  }

  async findByRespEmail(email: string) {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();

    // 1. Resposta Instantânea da RAM via DatabaseService (< 1ms)
    if (this.databaseService) {
      const todos = await this.databaseService.getAlunos();
      return todos.filter(
        (a) => a.resp_email && a.resp_email.trim().toLowerCase() === cleanEmail && a.status !== 'Inativo'
      );
    }

    // Fallback direto ao Supabase
    const { data, error } = await this.supabaseService
      .getClient()
      .from('alunos')
      .select('*, turmas(*)')
      .ilike('resp_email', cleanEmail)
      .neq('status', 'Inativo')
      .order('aluno_nome', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data || [];
  }
}
