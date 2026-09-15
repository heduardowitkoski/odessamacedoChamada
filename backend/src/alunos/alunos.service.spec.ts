import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AlunosService } from './alunos.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('AlunosService', () => {
  let service: AlunosService;

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { capacidade: 5 }, error: null }),
    }),
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
      resp_nome: '', // inválido
      resp_cpf: '000.000.000-00', // inválido
    };

    await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
  });
});
