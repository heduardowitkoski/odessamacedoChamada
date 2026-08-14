import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TurmasService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('turmas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async create(createTurmaDto: { nome: string; turno: string; capacidade: number }) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('turmas')
      .insert([createTurmaDto])
      .select();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }
}
