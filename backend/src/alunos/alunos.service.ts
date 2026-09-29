import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
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
  ) {}

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
      .select('*')
      .eq('id', turma_id)
      .single();

    if (!turma) {
      throw new BadRequestException('Turma não encontrada.');
    }

    if (novoStatus === 'Ativo' && turma.capacidade <= 0) {
      throw new BadRequestException('Não há vagas disponíveis nesta turma.');
    }

    // 2. Buscar o aluno atual para saber seu status anterior e dados de contato
    const { data: alunoAtual } = await supabase
      .from('alunos')
      .select('*')
      .eq('id', id)
      .single();

    if (!alunoAtual) {
      throw new BadRequestException('Aluno não encontrado.');
    }

    const estavaNaFila = alunoAtual.status === 'Fila';

    // 3. Atualizar o status do aluno (e turma vinculada)
    const { data: aluno, error } = await supabase
      .from('alunos')
      .update({ status: novoStatus, turma_id })
      .eq('id', id)
      .select('*, turmas(*)')
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // 4. Ajustar vagas da turma
    if (novoStatus === 'Inativo') {
      await supabase.from('turmas').update({ capacidade: turma.capacidade + 1 }).eq('id', turma_id);
    } else if (novoStatus === 'Ativo') {
      await supabase.from('turmas').update({ capacidade: turma.capacidade - 1 }).eq('id', turma_id);
    }

    // 5. Se estava na fila e virou Ativo, cria o usuário e envia o e-mail
    let action_link: string | null = null;
    let email_enviado = false;

    if (estavaNaFila && novoStatus === 'Ativo' && aluno.resp_email) {
      try {
        const respEmail = aluno.resp_email.trim().toLowerCase();

        // Verifica se usuário já existe no Supabase Auth
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

        // Gera o link de primeiro acesso / definição de senha
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

        if (linkError) {
          this.logger.error(
            `Erro ao gerar link de recovery para ${respEmail}: ${linkError.message}`,
          );
        } else {
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
        this.logger.error(
          `Falha ao processar criação de usuário ou e-mail para ${aluno.resp_email}: ${err.message}`,
        );
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

  async findByRespEmail(email: string) {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
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
