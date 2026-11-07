import { Injectable, BadRequestException, InternalServerErrorException, Optional } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DatabaseService } from '../database/database.service';

export class CriarAdminDto {
  email: string;
  password: string;
  nome?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Optional() private readonly databaseService?: DatabaseService,
  ) {}

  async listarAdmins() {
    if (this.databaseService) {
      return this.databaseService.getAdmins();
    }

    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase.auth.admin.listUsers();

      if (error) {
        throw new InternalServerErrorException('Erro ao listar usuários: ' + error.message);
      }

      return data.users
        .filter((u) => !u.user_metadata?.role || u.user_metadata.role === 'admin')
        .map((u) => ({
          id: u.id,
          email: u.email,
          nome: u.user_metadata?.nome || u.user_metadata?.name || 'Administrador',
          role: u.user_metadata?.role || 'admin',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }));
    } catch {
      return [];
    }
  }

  async criarAdmin(dto: CriarAdminDto) {
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('E-mail inválido.');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('A senha deve ter no mínimo 6 caracteres.');
    }

    if (this.databaseService) {
      const res = await this.databaseService.createAdmin(dto);
      await this.databaseService.addLog({
        acao: 'Criação de Administrador',
        categoria: 'admin',
        detalhes: `Administrador "${dto.nome || dto.email}" (${dto.email}) foi cadastrado no sistema.`,
      });
      return res;
    }

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: dto.email.trim(),
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        nome: dto.nome?.trim() || 'Administrador',
      },
    });

    if (error) {
      throw new BadRequestException('Não foi possível criar o administrador: ' + error.message);
    }

    return {
      id: data.user.id,
      email: data.user.email,
      nome: data.user.user_metadata?.nome,
      role: 'admin',
      created_at: data.user.created_at,
    };
  }

  async atualizarAdmin(id: string, dto: { nome?: string; email?: string }) {
    if (!id) {
      throw new BadRequestException('ID do usuário é obrigatório.');
    }

    if (this.databaseService) {
      const adm = await this.databaseService.updateAdmin(id, dto);
      if (!adm) throw new BadRequestException('Administrador não encontrado.');
      await this.databaseService.addLog({
        acao: 'Alteração de Dados de Administrador',
        categoria: 'admin',
        detalhes: `Dados cadastrais do administrador "${adm.nome}" (${adm.email}) foram atualizados.`,
      });
      return { success: true, message: 'Dados atualizados com sucesso.', admin: adm };
    }

    const supabase = this.supabaseService.getClient();
    const updatePayload: any = {};
    if (dto.email) updatePayload.email = dto.email.trim();
    if (dto.nome) {
      updatePayload.user_metadata = { nome: dto.nome.trim(), role: 'admin' };
    }

    const { data, error } = await supabase.auth.admin.updateUserById(id, updatePayload);
    if (error) {
      throw new BadRequestException('Não foi possível atualizar o administrador: ' + error.message);
    }

    return {
      success: true,
      message: 'Administrador atualizado com sucesso.',
      admin: {
        id: data.user.id,
        email: data.user.email,
        nome: data.user.user_metadata?.nome,
        role: 'admin',
      },
    };
  }

  async removerAdmin(id: string) {
    if (!id) {
      throw new BadRequestException('ID do usuário é obrigatório.');
    }

    if (this.databaseService) {
      const ok = await this.databaseService.removeAdmin(id);
      if (ok) {
        await this.databaseService.addLog({
          acao: 'Remoção de Administrador',
          categoria: 'admin',
          detalhes: `Administrador ID ${id} foi removido do sistema.`,
        });
      }
      return { success: ok, message: ok ? 'Administrador removido com sucesso.' : 'Administrador não encontrado.' };
    }

    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      throw new InternalServerErrorException('Erro ao excluir administrador: ' + error.message);
    }

    return { success: true, message: 'Administrador removido com sucesso.' };
  }

  // --- GESTÃO DE PROFESSORES ---
  async listarProfessores() {
    if (this.databaseService) {
      return this.databaseService.getProfessores();
    }
    return [];
  }

  async criarProfessor(dto: {
    nome: string;
    email: string;
    telefone?: string;
    especialidade?: string;
    turma_ids?: string[];
  }) {
    if (!dto.nome || !dto.nome.trim()) {
      throw new BadRequestException('Nome do professor é obrigatório.');
    }
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('E-mail inválido.');
    }

    if (this.databaseService) {
      const prof = await this.databaseService.createProfessor(dto);
      await this.databaseService.addLog({
        acao: 'Criação de Professor',
        categoria: 'professor',
        detalhes: `Professor "${prof.nome}" (${prof.email}) foi cadastrado com especialidade "${prof.especialidade || 'Geral'}".`,
      });
      return prof;
    }

    throw new BadRequestException('Serviço de banco de dados não disponível.');
  }

  async atualizarProfessor(
    id: string,
    dto: {
      nome?: string;
      email?: string;
      telefone?: string;
      especialidade?: string;
      turma_ids?: string[];
    },
  ) {
    if (!id) {
      throw new BadRequestException('ID do professor é obrigatório.');
    }

    if (this.databaseService) {
      const prof = await this.databaseService.updateProfessor(id, dto);
      if (!prof) throw new BadRequestException('Professor não encontrado.');
      await this.databaseService.addLog({
        acao: 'Alteração de Dados do Professor',
        categoria: 'professor',
        detalhes: `Dados do professor "${prof.nome}" (${prof.email}) foram atualizados.`,
      });
      return { success: true, message: 'Professor atualizado com sucesso.', professor: prof };
    }

    throw new BadRequestException('Serviço de banco de dados não disponível.');
  }

  async removerProfessor(id: string) {
    if (!id) {
      throw new BadRequestException('ID do professor é obrigatório.');
    }

    if (this.databaseService) {
      const ok = await this.databaseService.removeProfessor(id);
      if (ok) {
        await this.databaseService.addLog({
          acao: 'Remoção de Professor',
          categoria: 'professor',
          detalhes: `Professor ID ${id} foi removido do sistema.`,
        });
      }
      return { success: ok, message: ok ? 'Professor removido com sucesso.' : 'Professor não encontrado.' };
    }

    return { success: true, message: 'Professor removido com sucesso.' };
  }

  // --- LOGS DE AUDITORIA ---
  async listarLogs(limite?: number, categoria?: string) {
    if (this.databaseService) {
      return this.databaseService.getLogs(limite || 300, categoria);
    }
    return [];
  }

  async registrarLog(logData: {
    acao: string;
    detalhes: string;
    autor_nome?: string;
    autor_email?: string;
    autor_role?: string;
    categoria?: 'turma' | 'aluno' | 'fila' | 'frequencia' | 'professor' | 'admin' | 'sistema';
    ip?: string;
  }) {
    if (this.databaseService) {
      return this.databaseService.addLog(logData);
    }
    return null;
  }

  async exportarLogsCSV(): Promise<string> {
    const logs = await this.listarLogs(5000);
    const headers = ['ID', 'Data/Hora', 'Ação', 'Categoria', 'Detalhes', 'Autor', 'E-mail do Autor', 'Perfil'];
    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.created_at).toLocaleString('pt-BR')}"`,
      `"${(l.acao || '').replace(/"/g, '""')}"`,
      `"${(l.categoria || 'sistema').toUpperCase()}"`,
      `"${(l.detalhes || '').replace(/"/g, '""')}"`,
      `"${(l.autor_nome || '').replace(/"/g, '""')}"`,
      `"${(l.autor_email || '').replace(/"/g, '""')}"`,
      `"${(l.autor_role || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  }
}
