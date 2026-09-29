import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
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

  @Delete('usuarios/:id')
  async removerAdmin(@Param('id') id: string) {
    return this.adminService.removerAdmin(id);
  }
}
