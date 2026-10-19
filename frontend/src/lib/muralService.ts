export interface MuralItem {
  id: string;
  titulo: string;
  descricao: string;
  turma_id?: string;
  turma_nome?: string;
  autor_nome: string;
  autor_role?: 'admin' | 'professor';
  tecnica?: string;
  imagens: string[]; // Múltiplas imagens para carrossel
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'cde_mural_obras_v2';

const INITIAL_OBRAS: MuralItem[] = [
  {
    id: 'obra-1',
    titulo: 'Estudos de Aguadas em Nanquim e Pincel Oriental',
    descricao: 'Durante as oficinas práticas, os estudantes exercitaram as gradações tonais e técnicas de aguada com nanquim sobre papel de alta gramatura, explorando a expressividade da linha e o contraste dramático de luz e sombra.',
    turma_id: 'juvenil-a',
    turma_nome: 'Turma Juvenil A',
    autor_nome: 'Prof. Carlos Eduardo',
    autor_role: 'professor',
    tecnica: 'Nanquim sobre papel Canson 200g',
    imagens: [
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1000&auto=format&fit=crop&q=80',
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'obra-2',
    titulo: 'Oficina de Aquarela: Botânica e Pássaros do Pampa',
    descricao: 'Trabalhos vibrantes produzidos pelas crianças inspirados na flora nativa e aves dos campos de Bagé. Muita mistura de cores primárias, transparências e criatividade livre!',
    turma_id: 'infantil-a',
    turma_nome: 'Turma Infantil A',
    autor_nome: 'Profª. Mariana Luz',
    autor_role: 'professor',
    tecnica: 'Aquarela e lápis de cor aquarelável',
    imagens: [
      'https://images.unsplash.com/photo-1582561424760-0321d75e81fa?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1000&auto=format&fit=crop&q=80',
    ],
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'obra-3',
    titulo: 'Croquis de Figura Humana com Carvão e Giz Pastel',
    descricao: 'Exercícios de desenho gestual rápido e captura das proporções anatômicas em poses dinâmicas com pranchetas e cavaletes da oficina de desenho.',
    turma_id: 'juvenil-b',
    turma_nome: 'Turma Juvenil B',
    autor_nome: 'Prof. Carlos Eduardo',
    autor_role: 'professor',
    tecnica: 'Carvão vegetal e pastel seco sobre papel Kraft',
    imagens: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1569172122301-bc500f309134?w=1000&auto=format&fit=crop&q=80',
    ],
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'obra-4',
    titulo: 'Pintura Livre e Técnicas Mistas em Painel',
    descricao: 'Composições que mesclam texturas com espátula, pinceladas secas e camadas sobrepostas com tinta acrílica e colagens artísticas.',
    turma_id: 'adulto',
    turma_nome: 'Turma Adulto',
    autor_nome: 'Profª. Mariana Luz',
    autor_role: 'professor',
    tecnica: 'Tinta acrílica e técnica mista sobre tela',
    imagens: [
      'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1000&auto=format&fit=crop&q=80',
    ],
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
];

function getStoredItems(): MuralItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_OBRAS));
      return INITIAL_OBRAS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_OBRAS;
  } catch {
    return INITIAL_OBRAS;
  }
}

function saveStoredItems(items: MuralItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('cde_mural_change'));
  } catch (e) {
    console.error('Erro ao salvar mural localmente:', e);
  }
}

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }
  return (import.meta as any).env?.VITE_API_URL || 'https://odessamacedochamada.onrender.com';
}

export async function fetchMural(turmaId?: string): Promise<MuralItem[]> {
  try {
    const params = new URLSearchParams();
    if (turmaId && turmaId !== 'todas') params.append('turma_id', turmaId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${getApiBase()}/mural?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveStoredItems(data);
        return data;
      }
    }
  } catch (err) {
    // API offline ou timeout -> fallback local
  }

  let local = getStoredItems();
  if (turmaId && turmaId !== 'todas') {
    local = local.filter((item) => !item.turma_id || item.turma_id === turmaId);
  }
  return local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createMural(item: Omit<MuralItem, 'id' | 'created_at'>): Promise<MuralItem> {
  const newItem: MuralItem = {
    ...item,
    id: 'obra-' + Date.now(),
    imagens: Array.isArray(item.imagens) && item.imagens.length > 0
      ? item.imagens.filter((url) => url.trim().length > 0)
      : ['https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80'],
    created_at: new Date().toISOString(),
  };

  const current = getStoredItems();
  const updated = [newItem, ...current];
  saveStoredItems(updated);

  try {
    fetch(`${getApiBase()}/mural`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  } catch {}

  return newItem;
}

export async function updateMural(id: string, changes: Partial<MuralItem>): Promise<MuralItem | null> {
  const current = getStoredItems();
  const idx = current.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  current[idx] = {
    ...current[idx],
    ...changes,
    imagens: Array.isArray(changes.imagens) && changes.imagens.length > 0
      ? changes.imagens.filter((url) => url.trim().length > 0)
      : current[idx].imagens,
  };

  saveStoredItems([...current]);

  try {
    fetch(`${getApiBase()}/mural/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(current[idx]),
    }).catch(() => {});
  } catch {}

  return current[idx];
}

export async function deleteMural(id: string): Promise<boolean> {
  const current = getStoredItems();
  const filtered = current.filter((i) => i.id !== id);
  saveStoredItems(filtered);

  try {
    fetch(`${getApiBase()}/mural/${id}`, { method: 'DELETE' }).catch(() => {});
  } catch {}

  return true;
}
