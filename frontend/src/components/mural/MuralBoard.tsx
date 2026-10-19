import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchMural,
  createMural,
  updateMural,
  deleteMural,
  type MuralItem,
} from '../../lib/muralService';
import { getCurrentUser } from '../../lib/auth';
import {
  Plus,
  Trash2,
  Filter,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Edit3,
  X,
  Palette,
  Eye,
  Calendar,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';

interface MuralBoardProps {
  embedded?: boolean;
  fixedTurmaId?: string;
  allowPublish?: boolean;
}

// Função utilitária para compactar fotos enviadas do computador (evita travar o navegador ou exceder limites)
async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 1600;
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Gera JPEG com 85% de qualidade
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Falha ao processar arquivo de imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

// Sub-componente: Carrossel de Fotos do Card da Obra
function ArtworkCarousel({
  imagens,
  titulo,
  onOpenFullscreen,
}: {
  imagens: string[];
  titulo: string;
  onOpenFullscreen: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeImages =
    Array.isArray(imagens) && imagens.length > 0
      ? imagens
      : ['https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80'];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      onClick={() => onOpenFullscreen(currentIndex)}
      className="relative h-56 sm:h-64 w-full bg-neutral-900 overflow-hidden group cursor-pointer"
      title="Clique para ver a foto completa e dar zoom"
    >
      <img
        src={safeImages[currentIndex]}
        alt={`${titulo} - foto ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80';
        }}
      />

      {/* Overlay com botão explícito de expandir tela */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
        <span className="text-[11px] font-semibold text-white/90 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
          <Maximize2 size={12} className="text-amber-400" />
          Ver foto completa & Zoom
        </span>
      </div>

      {/* Botão de Expandir na parte superior esquerda */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenFullscreen(currentIndex);
        }}
        className="absolute top-3 left-3 bg-black/60 hover:bg-black/85 text-white p-1.5 rounded-full backdrop-blur-xs transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 shadow-md cursor-pointer z-10"
        title="Expandir para tela cheia e dar zoom"
      >
        <Maximize2 size={14} />
      </button>

      {/* Controles de Navegação (se houver mais de 1 foto) */}
      {safeImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 shadow-md cursor-pointer z-10"
            title="Foto anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 shadow-md cursor-pointer z-10"
            title="Próxima foto"
          >
            <ChevronRight size={18} />
          </button>

          {/* Badge Indicador de Fotos do Carrossel */}
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <ImageIcon size={12} />
            <span>
              {currentIndex + 1} / {safeImages.length}
            </span>
          </div>

          {/* Indicadores em Bolinha (Dots) */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-auto">
            {safeImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx ? 'bg-amber-400 w-4' : 'bg-white/60 hover:bg-white'
                }`}
                title={`Ir para foto ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Sub-componente: Visualizador em Tela Cheia com Zoom Completo
function FullscreenLightbox({
  obra,
  initialIndex,
  onClose,
}: {
  obra: MuralItem;
  initialIndex: number;
  onClose: () => void;
}) {
  const images =
    Array.isArray(obra.imagens) && obra.imagens.length > 0
      ? obra.imagens
      : ['https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80'];

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Reseta o zoom e posição quando troca de imagem
  const handleSelectImage = useCallback((index: number) => {
    setCurrentIndex(index);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    handleSelectImage(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  }, [currentIndex, images.length, handleSelectImage]);

  const handleNext = useCallback(() => {
    handleSelectImage(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, images.length, handleSelectImage]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.35, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.35, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleZoom = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      handleResetZoom();
    }
  };

  // Controles de teclado (Esc, setas, +, -)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-') handleZoomOut();
      else if (e.key === '0') handleResetZoom();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  // Arrastar imagem quando ampliada com zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Barra Superior de Controles */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between bg-black/60 border-b border-white/10 shrink-0 z-20">
        <div className="flex items-center gap-3 overflow-hidden pr-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Palette size={16} />
          </div>
          <div className="truncate">
            <h3 className="text-white text-sm font-bold truncate">
              {obra.titulo}
            </h3>
            <p className="text-white/60 text-xs truncate">
              {obra.tecnica || 'Produção artística'} • {obra.turma_nome || 'Todas as Turmas'}
            </p>
          </div>
        </div>

        {/* Ferramentas de Zoom & Ações */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Indicador de fotos */}
          {images.length > 1 && (
            <span className="text-xs font-semibold text-white/70 bg-white/10 px-2.5 py-1 rounded-lg mr-1 hidden sm:inline-block">
              Foto {currentIndex + 1} de {images.length}
            </span>
          )}

          {/* Botão Diminuir Zoom */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.6}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer disabled:opacity-30"
            title="Reduzir Zoom (-)"
          >
            <ZoomOut size={18} />
          </button>

          {/* Nível de Zoom Atual */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2.5 py-1 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg transition-colors cursor-pointer"
            title="Clique para voltar para 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Botão Aumentar Zoom */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer disabled:opacity-30"
            title="Aumentar Zoom (+)"
          >
            <ZoomIn size={18} />
          </button>

          {/* Botão Restaurar 100% */}
          {zoom !== 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Restaurar tamanho original"
            >
              <RotateCcw size={17} />
            </button>
          )}

          <div className="w-[1px] h-6 bg-white/15 mx-1" />

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-red-500/80 rounded-xl transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Área Central: Foto Completa sem Cortes com Suporte a Zoom & Pan */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 sm:p-8"
        onMouseDown={handleMouseDown}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={images[currentIndex]}
          alt={`${obra.titulo} - tela cheia`}
          onDoubleClick={handleToggleZoom}
          draggable={false}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
            transformOrigin: 'center center',
          }}
          className="max-w-full max-h-[82vh] object-contain shadow-2xl rounded-sm transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Botão Navegação Anterior */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black/95 text-white flex items-center justify-center transition-all shadow-xl cursor-pointer z-10 border border-white/10"
            title="Foto anterior (Seta esquerda)"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Botão Navegação Próxima */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black/95 text-white flex items-center justify-center transition-all shadow-xl cursor-pointer z-10 border border-white/10"
            title="Próxima foto (Seta direita)"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Barra Inferior: Miniaturas e Dica de Uso */}
      <div className="p-3 bg-black/70 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-20">
        <p className="text-[11px] text-white/50 text-center sm:text-left">
          Dica: Dê duplo clique na imagem para alternar o zoom • Use as setas do teclado para navegar
        </p>

        {/* Faixa de Miniaturas quando há mais de 1 foto */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectImage(idx)}
                className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  currentIndex === idx
                    ? 'border-amber-400 scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={imgUrl} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MuralBoard({
  embedded = false,
  fixedTurmaId,
  allowPublish,
}: MuralBoardProps) {
  const [items, setItems] = useState<MuralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [turmaFilter, setTurmaFilter] = useState<string>(fixedTurmaId || 'todas');

  // Modais
  const [showModalNovo, setShowModalNovo] = useState(false);
  const [editingItem, setEditingItem] = useState<MuralItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Visualizador em Tela Cheia / Zoom
  const [fullscreenData, setFullscreenData] = useState<{
    obra: MuralItem;
    index: number;
  } | null>(null);

  // Estados do Formulário (Criação / Edição)
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formTurmaNome, setFormTurmaNome] = useState('Todas as Turmas');
  const [formTecnica, setFormTecnica] = useState('');
  const [formImagens, setFormImagens] = useState<string[]>([]);
  const [novoLinkInput, setNovoLinkInput] = useState('');
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = getCurrentUser();
  const canPublish =
    allowPublish !== undefined
      ? allowPublish
      : currentUser?.role === 'admin' || currentUser?.role === 'professor';

  const turmasList = [
    'Todas as Turmas',
    'Turma Infantil A',
    'Turma Infantil B',
    'Turma Juvenil A',
    'Turma Juvenil B',
    'Turma Adulto',
    'Turma Melhor Idade',
  ];

  const loadData = async () => {
    setLoading(true);
    const data = await fetchMural(turmaFilter !== 'todas' ? turmaFilter : undefined);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('cde_mural_change', handleUpdate);
    return () => window.removeEventListener('cde_mural_change', handleUpdate);
  }, [turmaFilter]);

  // Abre modal para criação
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitulo('');
    setFormDescricao('');
    setFormTurmaNome('Todas as Turmas');
    setFormTecnica('');
    setFormImagens([]);
    setNovoLinkInput('');
    setShowModalNovo(true);
  };

  // Abre modal para edição
  const handleOpenEdit = (item: MuralItem) => {
    setEditingItem(item);
    setFormTitulo(item.titulo);
    setFormDescricao(item.descricao);
    setFormTurmaNome(item.turma_nome || 'Todas as Turmas');
    setFormTecnica(item.tecnica || '');
    setFormImagens(item.imagens && item.imagens.length > 0 ? [...item.imagens] : []);
    setNovoLinkInput('');
    setShowModalNovo(true);
  };

  // Upload direto de arquivos de fotos do computador
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      const novasFotos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImageFile(file);
          novasFotos.push(compressed);
        }
      }

      if (novasFotos.length > 0) {
        setFormImagens((prev) => [...prev, ...novasFotos]);
      }
    } catch {
      alert('Houve um problema ao carregar as fotos do computador.');
    } finally {
      setIsUploadingFiles(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente se quiser
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Adicionar foto por link URL
  const handleAddLinkUrl = () => {
    const url = novoLinkInput.trim();
    if (!url) return;
    setFormImagens((prev) => [...prev, url]);
    setNovoLinkInput('');
  };

  // Remover foto da lista
  const handleRemoveImage = (index: number) => {
    setFormImagens((prev) => prev.filter((_, i) => i !== index));
  };

  // Salvar (Criar ou Atualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formDescricao.trim()) {
      alert('Por favor, informe o título da obra e uma descrição sobre o que foi produzido.');
      return;
    }

    const cleanImagens = formImagens.map((url) => url.trim()).filter((url) => url.length > 0);
    if (cleanImagens.length === 0) {
      alert('Por favor, selecione ou informe ao menos uma foto da obra.');
      return;
    }

    setSaving(true);
    try {
      const turmaIdCalculado =
        formTurmaNome === 'Todas as Turmas'
          ? ''
          : formTurmaNome.toLowerCase().replace(/\s+/g, '-');

      if (editingItem) {
        // Modo Edição
        await updateMural(editingItem.id, {
          titulo: formTitulo.trim(),
          descricao: formDescricao.trim(),
          turma_id: turmaIdCalculado,
          turma_nome: formTurmaNome,
          tecnica: formTecnica.trim() || 'Técnica Mista',
          imagens: cleanImagens,
        });
      } else {
        // Modo Criação
        await createMural({
          titulo: formTitulo.trim(),
          descricao: formDescricao.trim(),
          turma_id: turmaIdCalculado,
          turma_nome: formTurmaNome,
          autor_nome: currentUser?.name || (currentUser?.role === 'professor' ? 'Professor' : 'Coordenação CDE'),
          autor_role: currentUser?.role === 'professor' ? 'professor' : 'admin',
          tecnica: formTecnica.trim() || 'Técnica Mista',
          imagens: cleanImagens,
        });
      }

      setShowModalNovo(false);
      setEditingItem(null);
      loadData();
    } catch {
      alert('Erro ao salvar obra no mural.');
    } finally {
      setSaving(false);
    }
  };

  // Excluir Obra
  const handleDelete = async (id: string, titulo: string) => {
    if (confirm(`Tem certeza que deseja excluir a obra "${titulo}" do mural?`)) {
      await deleteMural(id);
      loadData();
    }
  };

  return (
    <div className={embedded ? '' : 'p-6 max-w-7xl mx-auto'}>
      {/* Top Header & Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300]">
              Galeria de Obras & Produções dos Alunos
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {items.length} {items.length === 1 ? 'obra' : 'obras'}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            Espaço de exposição dedicado às criações, desenhos, pinturas e projetos desenvolvidos nas oficinas
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!fixedTurmaId && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
              <Filter size={14} className="text-gray-400 shrink-0" />
              <select
                value={turmaFilter}
                onChange={(e) => setTurmaFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="todas">Todas as Turmas</option>
                {turmasList
                  .filter((t) => t !== 'Todas as Turmas')
                  .map((t) => (
                    <option key={t} value={t.toLowerCase().replace(/\s+/g, '-')}>
                      {t}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {canPublish && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              Publicar Nova Obra
            </button>
          )}
        </div>
      </div>

      {/* Grid de Obras */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-xs font-medium">
          Carregando obras do mural...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-amber-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3 text-amber-500">
            <Palette size={24} />
          </div>
          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-gray-800 text-base">
            Nenhuma obra publicada no momento
          </h3>
          <p className="text-gray-500 text-xs max-w-sm mx-auto mt-1 mb-4">
            {canPublish
              ? 'Compartilhe as fotos e registros das produções artísticas realizadas pelos alunos nas aulas de desenho.'
              : 'Em breve as criações dos alunos serão expostas aqui.'}
          </p>
          {canPublish && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} /> Publicar Primeira Obra
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((obra) => {
            return (
              <div
                key={obra.id}
                className="bg-white rounded-3xl border border-amber-100/90 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                {/* Carrossel de Fotos da Obra com Clique para Tela Cheia */}
                <ArtworkCarousel
                  imagens={obra.imagens}
                  titulo={obra.titulo}
                  onOpenFullscreen={(index) => setFullscreenData({ obra, index })}
                />

                {/* Conteúdo Descritivo da Obra */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Tags: Turma e Técnica */}
                    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {obra.turma_nome && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                            {obra.turma_nome}
                          </span>
                        )}
                        {obra.tecnica && (
                          <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Palette size={10} className="text-amber-600" />
                            {obra.tecnica}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(obra.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Título da Obra */}
                    <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300] leading-snug mb-2">
                      {obra.titulo}
                    </h3>

                    {/* Descrição do que foi feito */}
                    <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line mb-4">
                      {obra.descricao}
                    </p>
                  </div>

                  {/* Rodapé: Autor e Ações (Visualizar / Editar / Excluir) */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                        {obra.autor_nome?.charAt(0) || 'P'}
                      </div>
                      <span className="text-[11px] font-medium text-gray-600 truncate max-w-[120px]">
                        {obra.autor_nome}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Botão de Ver Completa / Zoom */}
                      <button
                        type="button"
                        onClick={() => setFullscreenData({ obra, index: 0 })}
                        title="Ver foto completa com zoom"
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Maximize2 size={13} />
                        <span className="hidden sm:inline">Expandir</span>
                      </button>

                      {/* Ações de Edição e Exclusão para Administradores e Professores */}
                      {canPublish && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(obra)}
                            title="Editar obra"
                            className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                          >
                            <Edit3 size={13} />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(obra.id, obra.titulo)}
                            title="Excluir obra"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Publicar / Editar Obra com Upload do Computador + Link */}
      {showModalNovo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
                  {editingItem ? <Edit3 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                    {editingItem ? 'Editar Obra do Mural' : 'Publicar Nova Obra dos Alunos'}
                  </h3>
                  <p className="text-gray-500 text-xs">
                    Compartilhe as produções artísticas, técnicas utilizadas e fotos dos trabalhos
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModalNovo(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título da Obra */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Título da Obra / Atividade Artística
                </label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Estudos de Aguadas em Nanquim e Pincel Oriental"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                  required
                />
              </div>

              {/* Turma & Técnica em 2 colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Turma Vinculada
                  </label>
                  <select
                    value={formTurmaNome}
                    onChange={(e) => setFormTurmaNome(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                  >
                    {turmasList.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Técnica / Materiais Utilizados
                  </label>
                  <input
                    type="text"
                    value={formTecnica}
                    onChange={(e) => setFormTecnica(e.target.value)}
                    placeholder="Ex: Aquarela, Carvão vegetal, Grafite 2B"
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>

              {/* Descrição do que foi feito */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descrição da Obra e do Processo Criativo
                </label>
                <textarea
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  rows={3}
                  placeholder="Descreva o que os alunos produziram, a inspiração, técnicas abordadas em aula e detalhes da produção..."
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                  required
                />
              </div>

              {/* Seção de Upload de Fotos (Direto do PC + Opção de Link) */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-amber-500" />
                    Fotos da Obra (Upload do PC ou Link)
                  </label>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {formImagens.length} {formImagens.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                  </span>
                </div>

                {/* 1. Botão / Zona de Upload Direto do Computador */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50 transition-colors rounded-2xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 group mb-3"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 group-hover:bg-amber-200 text-amber-700 flex items-center justify-center transition-colors">
                    {isUploadingFiles ? (
                      <Loader2 size={18} className="animate-spin text-amber-600" />
                    ) : (
                      <Upload size={18} />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">
                      {isUploadingFiles
                        ? 'Processando e otimizando fotos...'
                        : 'Clique para escolher fotos direto do seu computador'}
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      JPG, PNG ou WEBP — Você pode selecionar várias imagens de uma só vez
                    </p>
                  </div>
                </div>

                {/* 2. Opção de Adicionar por Link URL (Mantida conforme solicitado) */}
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200/80 mb-3">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                    <LinkIcon size={12} className="text-gray-400" />
                    Ou adicione por link da web (URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={novoLinkInput}
                      onChange={(e) => setNovoLinkInput(e.target.value)}
                      placeholder="https://exemplo.com/foto-do-desenho.jpg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLinkUrl();
                        }
                      }}
                      className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddLinkUrl}
                      disabled={!novoLinkInput.trim()}
                      className="h-9 px-3.5 bg-neutral-800 hover:bg-black text-white rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Plus size={14} /> Adicionar Link
                    </button>
                  </div>
                </div>

                {/* 3. Galeria de Miniaturas das Fotos Já Selecionadas */}
                {formImagens.length > 0 ? (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 mb-2 block">
                      Fotos adicionadas ({formImagens.length}) — elas formarão o carrossel da obra:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                      {formImagens.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-gray-200 bg-neutral-900 aspect-video shadow-2xs"
                        >
                          <img
                            src={imgUrl}
                            alt={`Foto selecionada ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80';
                            }}
                          />
                          {/* Badge de Índice */}
                          <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>

                          {/* Origem: PC ou Web */}
                          <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white/90 text-[9px] font-medium px-1.5 py-0.5 rounded">
                            {imgUrl.startsWith('data:') ? 'Do PC' : 'Link Web'}
                          </span>

                          {/* Ações: Visualizar e Remover */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFullscreenData({
                                  obra: {
                                    id: 'preview',
                                    titulo: formTitulo || 'Pré-visualização da Obra',
                                    descricao: formDescricao,
                                    imagens: formImagens,
                                    autor_nome: currentUser?.name || 'Autor',
                                    created_at: new Date().toISOString(),
                                  },
                                  index: idx,
                                });
                              }}
                              className="p-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-lg shadow-sm cursor-pointer"
                              title="Ver foto completa com zoom"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm cursor-pointer"
                              title="Remover foto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-gray-400 text-xs">
                    Nenhuma foto selecionada ainda. Escolha fotos do computador ou insira links acima.
                  </div>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModalNovo(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || isUploadingFiles}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Salvando...
                    </>
                  ) : editingItem ? (
                    'Salvar Alterações'
                  ) : (
                    'Publicar Obra'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visualizador Lightbox em Tela Cheia com Zoom Interativo */}
      {fullscreenData && (
        <FullscreenLightbox
          obra={fullscreenData.obra}
          initialIndex={fullscreenData.index}
          onClose={() => setFullscreenData(null)}
        />
      )}
    </div>
  );
}
