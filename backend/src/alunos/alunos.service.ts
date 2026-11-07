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
	  status: 'Fila',
	};

    // 5. Salva de forma ultra-rápida no DatabaseService com sync assíncrono
    let createdAluno: any;
    if (this.databaseService) {
      createdAluno = await this.databaseService.createAluno(normalizedDto);
    }

    // 6. Persistência no Supabase: grava primariamente na tabela lista_espera
    const supabase = this.supabaseService.getClient();
    try {
      // Prepara objeto compatível com o schema novo e legado de lista_espera
      const listaEsperaPayload: any = {
        id: createdAluno?.id || crypto.randomUUID(),
        turma_id: normalizedDto.turma_id,
        resp_nome: normalizedDto.resp_nome,
        nome_responsavel: normalizedDto.resp_nome,
        resp_cpf: normalizedDto.resp_cpf,
        resp_rg: normalizedDto.resp_rg,
        resp_parentesco: normalizedDto.resp_parentesco,
        resp_email: normalizedDto.resp_email,
        email_responsavel: normalizedDto.resp_email,
        resp_telefone: normalizedDto.resp_telefone,
        telefone_responsavel: normalizedDto.resp_telefone,
        resp_endereco: normalizedDto.resp_endereco,
        resp_cep: normalizedDto.resp_cep,
        resp_bairro: normalizedDto.resp_bairro,
        aluno_nome: normalizedDto.aluno_nome,
        nome_aluno: normalizedDto.aluno_nome,
        aluno_nascimento: normalizedDto.aluno_nascimento,
        data_nascimento: normalizedDto.aluno_nascimento,
        aluno_sexo: normalizedDto.aluno_sexo,
        aluno_cpf: normalizedDto.aluno_cpf,
        aluno_escola: normalizedDto.aluno_escola,
        aluno_experiencia: normalizedDto.aluno_experiencia,
        aluno_necessidades: normalizedDto.aluno_necessidades,
        status: 'aguardando',
      };

      const { error: leError } = await supabase
        .from('lista_espera')
        .insert([listaEsperaPayload]);

      if (leError) {
        this.logger.warn(`Tentativa com campos completos falhou em lista_espera: ${leError.message}. Tentando campos legados.`);
        // Fallback para schema legado com menos colunas
        await supabase.from('lista_espera').insert([
          {
            id: listaEsperaPayload.id,
            nome_aluno: normalizedDto.aluno_nome,
            nome_responsavel: normalizedDto.resp_nome,
            telefone_responsavel: normalizedDto.resp_telefone,
            data_nascimento: normalizedDto.aluno_nascimento,
            status: 'aguardando',
          },
        ]);
      }
    } catch (err: any) {
      this.logger.warn(`Aviso ao persistir em lista_espera do Supabase: ${err?.message}`);
    }

    if (createdAluno) {
      return createdAluno;
    }

    return {
      ...normalizedDto,
      status: 'Fila',
    };
  }

  async remove(id: string) {
    if (this.databaseService) {
      await this.databaseService.removeAluno(id);
    }

    const supabase = this.supabaseService.getClient();

    try {
      // 1. Busca aluno no Supabase se existir
      const { data: aluno } = await supabase
        .from('alunos')
        .select('id, status, turma_id')
        .eq('id', id)
        .maybeSingle();

      if (aluno && aluno.status === 'Ativo' && aluno.turma_id) {
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

      // 2. Remove frequências associadas
      await supabase.from('frequencias').delete().eq('aluno_id', id);

      // 3. Remove de alunos
      await supabase.from('alunos').delete().eq('id', id);

      // 4. Remove de lista_espera caso ainda conste
      await supabase.from('lista_espera').delete().eq('id', id);
    } catch (err: any) {
      this.logger.warn(`Aviso ao excluir aluno do Supabase: ${err?.message}`);
    }

    return { success: true, message: 'Aluno removido com sucesso do banco de dados.' };
  }

  async update(id: string, updateDto: any) {
    if (!id) {
      throw new BadRequestException('ID do aluno é obrigatório.');
    }

    let alunoAtualizado: any = null;
    if (this.databaseService) {
      alunoAtualizado = await this.databaseService.updateAluno(id, updateDto);
    }

    const supabase = this.supabaseService.getClient();
    try {
      // 1. Atualiza na tabela alunos
      const payloadAlunos: any = {};
      if (updateDto.aluno_nome !== undefined) payloadAlunos.aluno_nome = updateDto.aluno_nome.trim();
      if (updateDto.aluno_nascimento !== undefined) payloadAlunos.aluno_nascimento = updateDto.aluno_nascimento;
      if (updateDto.aluno_cpf !== undefined) payloadAlunos.aluno_cpf = updateDto.aluno_cpf;
      if (updateDto.aluno_sexo !== undefined) payloadAlunos.aluno_sexo = updateDto.aluno_sexo;
      if (updateDto.turma_id !== undefined) payloadAlunos.turma_id = updateDto.turma_id;
      if (updateDto.resp_nome !== undefined) payloadAlunos.resp_nome = updateDto.resp_nome.trim();
      if (updateDto.resp_cpf !== undefined) payloadAlunos.resp_cpf = updateDto.resp_cpf;
      if (updateDto.resp_email !== undefined) payloadAlunos.resp_email = updateDto.resp_email.trim();
      if (updateDto.resp_telefone !== undefined) payloadAlunos.resp_telefone = updateDto.resp_telefone;
      if (updateDto.resp_endereco !== undefined) payloadAlunos.resp_endereco = updateDto.resp_endereco;
      if (updateDto.resp_bairro !== undefined) payloadAlunos.resp_bairro = updateDto.resp_bairro;
      if (updateDto.resp_cep !== undefined) payloadAlunos.resp_cep = updateDto.resp_cep;
      if (updateDto.resp_parentesco !== undefined) payloadAlunos.resp_parentesco = updateDto.resp_parentesco;

      if (Object.keys(payloadAlunos).length > 0) {
        await supabase.from('alunos').update(payloadAlunos).eq('id', id);
      }

      // 2. Atualiza na tabela lista_espera (se o aluno estiver na fila)
      const payloadFila: any = {
        ...payloadAlunos,
        nome_aluno: payloadAlunos.aluno_nome,
        nome_responsavel: payloadAlunos.resp_nome,
        telefone_responsavel: payloadAlunos.resp_telefone,
        email_responsavel: payloadAlunos.resp_email,
        data_nascimento: payloadAlunos.aluno_nascimento,
      };
      // Limpa chaves undefined
      Object.keys(payloadFila).forEach((k) => payloadFila[k] === undefined && delete payloadFila[k]);
      if (Object.keys(payloadFila).length > 0) {
        await supabase.from('lista_espera').update(payloadFila).eq('id', id);
      }
    } catch (err: any) {
      this.logger.warn(`Aviso ao atualizar aluno no Supabase: ${err?.message}`);
    }

    return {
      success: true,
      message: 'Dados cadastrais atualizados com sucesso.',
      aluno: alunoAtualizado || updateDto,
    };
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

      // Persistência assíncrona no Supabase ao aprovar aluno
      if (estavaNaFila && novoStatus === 'Ativo' && aluno) {
        (async () => {
          try {
            const supabase = this.supabaseService.getClient();
            // 1. Remove da tabela lista_espera (transferido com sucesso para alunos)
            await supabase.from('lista_espera').delete().eq('id', id);

            // 2. Insere na tabela alunos com status 'Ativo'
            const alunoPayload: any = {
              id: aluno.id,
              turma_id: turma_id,
              resp_nome: aluno.resp_nome,
              resp_cpf: aluno.resp_cpf || '',
              resp_rg: aluno.resp_rg || '',
              resp_parentesco: aluno.resp_parentesco || '',
              resp_email: aluno.resp_email || '',
              resp_telefone: aluno.resp_telefone || '',
              resp_endereco: aluno.resp_endereco || '',
              resp_cep: aluno.resp_cep || '',
              resp_bairro: aluno.resp_bairro || '',
              aluno_nome: aluno.aluno_nome,
              aluno_nascimento: aluno.aluno_nascimento,
              aluno_sexo: aluno.aluno_sexo || '',
              aluno_cpf: aluno.aluno_cpf || '',
              aluno_escola: aluno.aluno_escola || '',
              aluno_experiencia: aluno.aluno_experiencia || '',
              aluno_necessidades: aluno.aluno_necessidades || '',
              status: 'Ativo',
            };

            const { error: insError } = await supabase.from('alunos').upsert([alunoPayload]);
            if (insError) {
              // Se falhar com resp_parentesco por schema desatualizado, tenta sem ele
              delete alunoPayload.resp_parentesco;
              await supabase.from('alunos').upsert([alunoPayload]);
            }

            // 3. Atualiza capacidade da turma no Supabase
            if (turma.capacidade > 0) {
              await supabase.from('turmas').update({ capacidade: turma.capacidade }).eq('id', turma_id);
            }
          } catch (e: any) {
            this.logger.warn(`Aviso ao sincronizar aprovação com Supabase: ${e?.message}`);
          }
        })();
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
