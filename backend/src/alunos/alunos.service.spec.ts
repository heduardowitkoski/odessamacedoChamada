import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AlunosService } from './alunos.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('AlunosService', () => {
  let service: AlunosService;

  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: 't-1', capacidade: 5, nome: 'Turma Juvenil A - 11 a 13 anos', idade_minima: 11, idade_maxima: 13 },
      error: null,
    }),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlunosService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<AlunosService>(AlunosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deve rejeitar inscrição com BadRequestException se os campos forem inválidos', async () => {
    const invalidDto = {
      resp_nome: '',
      resp_cpf: '000.000.000-00',
      turma_id: 't-1',
    };

    await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
  });

  it('deve permitir exclusão real de aluno através de remove()', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'a-1', status: 'Ativo', turma_id: 't-1' },
      error: null,
    });

    const result = await service.remove('a-1');
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.delete).toHaveBeenCalled();
  });
});
