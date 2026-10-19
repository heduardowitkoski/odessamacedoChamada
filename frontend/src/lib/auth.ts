export type UserRole = 'admin' | 'professor' | 'responsavel';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  turmaId?: string;
  turmaNome?: string;
  alunoId?: string;
  alunoNome?: string;
  avatarUrl?: string;
  cargo?: string;
}

export const DEMO_USERS: Record<UserRole, UserProfile> = {
  admin: {
    id: 'usr-admin-1',
    email: 'admin@cultura.bage.rs.gov.br',
    name: 'Coordenação CDE Odessa Macedo',
    role: 'admin',
    cargo: 'Administrador Geral',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
  },
  professor: {
    id: 'usr-prof-1',
    email: 'carlos.eduardo@cultura.bage.rs.gov.br',
    name: 'Prof. Carlos Eduardo',
    role: 'professor',
    cargo: 'Professor de Artes Visuais e Desenho',
    turmaId: 'infantil-a',
    turmaNome: 'Turma Infantil A & Juvenil A',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
  },
  responsavel: {
    id: 'usr-resp-1',
    email: 'maria.souza@email.com',
    name: 'Maria Souza',
    role: 'responsavel',
    cargo: 'Mãe / Responsável Legal',
    alunoId: '1',
    alunoNome: 'Ana Beatriz Souza',
    turmaId: 'infantil-a',
    turmaNome: 'Turma Infantil A',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format',
  },
};

const SESSION_KEY = 'cde_user_session';

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserSession(user: UserProfile): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('cde_auth_change'));
  } catch (e) {
    console.error('Erro ao salvar sessão local:', e);
  }
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('cde_auth_change'));
  } catch (e) {
    console.error('Erro ao remover sessão:', e);
  }
}

export function loginWithRole(role: UserRole, customEmail?: string): UserProfile {
  const base = DEMO_USERS[role];
  const profile: UserProfile = {
    ...base,
    email: customEmail?.trim() || base.email,
  };
  saveUserSession(profile);
  return profile;
}
