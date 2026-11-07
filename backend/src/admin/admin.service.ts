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
      return this.databaseService.createAdmin(dto);
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
      return { success: ok, message: ok ? 'Administrador removido com sucesso.' : 'Administrador não encontrado.' };
    }

    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      throw new InternalServerErrorException('Erro ao excluir administrador: ' + error.message);
    }

    return { success: true, message: 'Administrador removido com sucesso.' };
  }
}
