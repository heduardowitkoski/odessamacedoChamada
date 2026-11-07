import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { AdminService, CriarAdminDto } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('usuarios')
  async listarAdmins() {
    return this.adminService.listarAdmins();
  }

  @Post('usuarios')
  async criarAdmin(@Body() dto: CriarAdminDto) {
    return this.adminService.criarAdmin(dto);
  }

  @Patch('usuarios/:id')
  async atualizarAdmin(@Param('id') id: string, @Body() dto: { nome?: string; email?: string }) {
    return this.adminService.atualizarAdmin(id, dto);
  }

  @Delete('usuarios/:id')
  async removerAdmin(@Param('id') id: string) {
    return this.adminService.removerAdmin(id);
  }

  // Rotas de Professores
  @Get('professores')
  async listarProfessores() {
    return this.adminService.listarProfessores();
  }

  @Post('professores')
  async criarProfessor(
    @Body()
    dto: {
      nome: string;
      email: string;
      telefone?: string;
      especialidade?: string;
      turma_ids?: string[];
    },
  ) {
    return this.adminService.criarProfessor(dto);
  }

  @Patch('professores/:id')
  async atualizarProfessor(
    @Param('id') id: string,
    @Body()
    dto: {
      nome?: string;
      email?: string;
      telefone?: string;
      especialidade?: string;
      turma_ids?: string[];
    },
  ) {
    return this.adminService.atualizarProfessor(id, dto);
  }

  @Delete('professores/:id')
  async removerProfessor(@Param('id') id: string) {
    return this.adminService.removerProfessor(id);
  }
}
