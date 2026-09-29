import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockUsers = [
    {
      id: 'admin-1',
      email: 'admin@cultura.bage.rs.gov.br',
      user_metadata: { role: 'admin', nome: 'Gestor Cultural' },
      created_at: '2026-09-01T00:00:00Z',
      last_sign_in_at: '2026-09-20T00:00:00Z',
    },
    {
      id: 'resp-1',
      email: 'pai@gmail.com',
      user_metadata: { role: 'responsavel', nome: 'Pai do Aluno' },
      created_at: '2026-09-10T00:00:00Z',
      last_sign_in_at: null,
    },
  ];

  const mockSupabaseAdmin = {
    listUsers: jest.fn().mockResolvedValue({
      data: { users: mockUsers },
      error: null,
    }),
    createUser: jest.fn().mockImplementation(({ email, user_metadata }) =>
      Promise.resolve({
        data: {
          user: {
            id: 'new-admin-id',
            email,
            user_metadata,
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      }),
    ),
    deleteUser: jest.fn().mockResolvedValue({ error: null }),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue({
      auth: {
        admin: mockSupabaseAdmin,
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deve listar apenas usuários com perfil de admin', async () => {
    const admins = await service.listarAdmins();
    expect(admins.length).toBe(1);
    expect(admins[0].email).toBe('admin@cultura.bage.rs.gov.br');
    expect(admins[0].role).toBe('admin');
  });

  it('deve criar um novo administrador com sucesso', async () => {
    const novoAdmin = await service.criarAdmin({
      email: 'novo.admin@cultura.bage.rs.gov.br',
      password: 'senhaSegura123',
      nome: 'Novo Gestor',
    });

    expect(novoAdmin.email).toBe('novo.admin@cultura.bage.rs.gov.br');
    expect(mockSupabaseAdmin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'novo.admin@cultura.bage.rs.gov.br',
        user_metadata: { role: 'admin', nome: 'Novo Gestor' },
      }),
    );
  });

  it('deve rejeitar criação de admin com senha muito curta', async () => {
    await expect(
      service.criarAdmin({
        email: 'admin@cultura.bage.rs.gov.br',
        password: '123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve remover administrador com sucesso', async () => {
    const res = await service.removerAdmin('admin-1');
    expect(res.success).toBe(true);
    expect(mockSupabaseAdmin.deleteUser).toHaveBeenCalledWith('admin-1');
  });
});
