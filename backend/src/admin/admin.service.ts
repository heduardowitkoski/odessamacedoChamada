import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export class CriarAdminDto {
  email: string;
  password: string;
  nome?: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listarAdmins() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      throw new InternalServerErrorException('Erro ao listar usuários: ' + error.message);
    }

    // Retorna todos os administradores cadastrados (ou usuários sem role específica que atuam como admin)
    const admins = data.users
      .filter((u) => !u.user_metadata?.role || u.user_metadata.role === 'admin')
      .map((u) => ({
        id: u.id,
        email: u.email,
        nome: u.user_metadata?.nome || u.user_metadata?.name || 'Administrador',
        role: u.user_metadata?.role || 'admin',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

    return admins;
  }

  async criarAdmin(dto: CriarAdminDto) {
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('E-mail inválido.');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('A senha deve ter no mínimo 6 caracteres.');
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

  async removerAdmin(id: string) {
    if (!id) {
      throw new BadRequestException('ID do usuário é obrigatório.');
    }

    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      throw new InternalServerErrorException('Erro ao excluir administrador: ' + error.message);
    }

    return { success: true, message: 'Administrador removido com sucesso.' };
  }
}
