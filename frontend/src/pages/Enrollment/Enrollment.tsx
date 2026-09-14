import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Pencil, ArrowRight } from "lucide-react";
import { COLOR_MAP } from "../../lib/mock";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

type FormStep = 0 | 1 | 2 | 3;

interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
}

const INITIAL_TURMAS: Turma[] = [
  { id: "e0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c", nome: "Turma Infantil A (5 a 7 anos)", turno: "Tarde (14h às 15h)", capacidade: 12 },
  { id: "f1b2c3d4-e5f6-4a7b-8c9d-1e2f3a4b5c6d", nome: "Turma Infantil B (8 a 10 anos)", turno: "Tarde (14h às 15h30)", capacidade: 15 },
  { id: "a2c3d4e5-f6a7-4b8c-9d0e-2f3a4b5c6d7e", nome: "Turma Juvenil A (11 a 13 anos)", turno: "Tarde (14h às 15h30)", capacidade: 10 },
  { id: "b3d4e5f6-a7b8-4c9d-0e1f-3a4b5c6d7e8f", nome: "Turma Juvenil B (14 a 17 anos)", turno: "Tarde (14h às 16h)", capacidade: 8 },
  { id: "c4e5f6a7-b8c9-4d0e-1f2a-4b5c6d7e8f9a", nome: "Turma Adulto (18 anos ou mais)", turno: "Noite (18h30 às 20h)", capacidade: 14 },
  { id: "d5f6a7b8-c9d0-4e1f-2a3b-5c6d7e8f9a0b", nome: "Turma Melhor Idade (60 anos ou mais)", turno: "Manhã (9h às 10h30)", capacidade: 12 },
];

export default function EnrollmentScreen() {
  const [step, setStep] = useState<FormStep>(0);
  const [turmasDb, setTurmasDb] = useState<Turma[]>(INITIAL_TURMAS);
  const navigate = useNavigate();

  // Estados do Formulário
  const [formData, setFormData] = useState({
    resp_nome: '',
    resp_cpf: '',
    resp_rg: '',
    resp_email: '',
    resp_telefone: '',
    resp_endereco: '',
    resp_cep: '',
    resp_bairro: '',
    aluno_nome: '',
    aluno_nascimento: '',
    aluno_sexo: '',
    aluno_cpf: '',
    aluno_escola: '',
    aluno_experiencia: '',
    aluno_necessidades: '',
    turma_id: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/turmas`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTurmasDb(data);
          if (!formData.turma_id) {
            setFormData(prev => ({ ...prev, turma_id: data[0].id }));
          }
        }
      })
      .catch(err => {
        console.error("Erro ao buscar turmas:", err);
      });
  }, []);

  const steps = ["Responsável", "Aluno", "Turma", "Confirmação"];
  const safeTurmas = (Array.isArray(turmasDb) && turmasDb.length > 0) ? turmasDb : INITIAL_TURMAS;
  const selectedTurma = safeTurmas.find((t) => t.id === formData.turma_id) || safeTurmas[0];

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleExperiencia = (exp: string) => {
    setFormData({ ...formData, aluno_experiencia: exp });
  };

  const handleSubmit = async () => {
    if (!formData.aluno_nome || !formData.resp_nome) {
      alert("Por favor, preencha os dados do responsável e do aluno antes de confirmar.");
      return;
    }

    setLoading(true);
    const turmaIdToSend = formData.turma_id || selectedTurma?.id || safeTurmas[0]?.id;
    const payload = {
      ...formData,
      turma_id: turmaIdToSend,
    };

    try {
      const res = await fetch(`${API_BASE}/alunos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Inscrição realizada com sucesso! O cadastro foi salvo e já consta na Área Administrativa.");
        navigate("/admin");
      } else {
        const err = await res.json().catch(() => ({}));
        alert("Erro ao confirmar inscrição: " + (err.message || "Tente novamente."));
      }
    } catch (e) {
      console.error("Erro ao enviar:", e);
      alert("Não foi possível comunicar com o servidor backend (http://localhost:3000). Certifique-se de executar o arquivo iniciar.bat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Pencil size={15} className="text-white" />
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm block">CDE Odessa Macedo</span>
              <span className="text-amber-500 text-xs font-medium">Formulário de Inscrição · Desenho</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 font-medium">← Voltar ao portal</Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-8 py-10">
        <div className="mb-7">
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-extrabold text-[#1C1300] mb-1">Inscrição nas Aulas de Desenho</h1>
          <p className="text-gray-500 text-sm">Preencha os dados abaixo para cadastrar o aluno nas turmas de desenho artístico.</p>
        </div>

        {/* Alerta gratuidade */}
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5 mb-8 max-w-xl">
          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Inscrição e aulas totalmente gratuitas</p>
            <p className="text-xs text-emerald-700">Materiais de desenho fornecidos pelo Centro. Vagas abertas para toda a comunidade.</p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Form */}
          <div className="flex-1 max-w-3xl">
            {/* Stepper */}
            <div className="flex items-center mb-8">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center">
                  <button onClick={() => setStep(i as FormStep)} className="flex flex-col items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i < step ? "bg-green-500 text-white" : i === step ? "bg-amber-500 text-white shadow-md shadow-amber-200" : "bg-gray-100 text-gray-400"
                    }`}>
                      {i < step ? <CheckCircle size={17} /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${i === step ? "text-amber-700" : "text-gray-400"}`}>{s}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 min-w-[40px] ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-7">
              {/* Step 0 — Responsável */}
              {step === 0 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Dados do responsável</h2>
                  <p className="text-xs text-gray-400 mb-5">Para alunos menores de 18 anos, preencha os dados do responsável legal. Para adultos e melhor idade, preencha seus próprios dados.</p>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: "Nome completo *", name: "resp_nome", placeholder: "Nome do responsável ou próprio aluno (adulto)", col: 2 },
                      { label: "CPF", name: "resp_cpf", placeholder: "000.000.000-00", col: 1 },
                      { label: "RG", name: "resp_rg", placeholder: "0000000000", col: 1 },
                      { label: "E-mail", name: "resp_email", placeholder: "email@exemplo.com", col: 1 },
                      { label: "Telefone / WhatsApp *", name: "resp_telefone", placeholder: "(53) 99999-0000", col: 1 },
                      { label: "Endereço", name: "resp_endereco", placeholder: "Rua, número", col: 2 },
                      { label: "CEP", name: "resp_cep", placeholder: "96400-000", col: 1 },
                      { label: "Bairro / Cidade", name: "resp_bairro", placeholder: "Bagé/RS", col: 1 },
                    ].map(({ label, name, placeholder, col }) => (
                      <div key={label} className={col === 2 ? "col-span-2" : ""}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                        <input name={name} value={(formData as any)[name]} onChange={handleChange} placeholder={placeholder} className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1 — Aluno */}
              {step === 1 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Dados do aluno</h2>
                  <p className="text-xs text-gray-400 mb-5">Preencha os dados de quem vai frequentar as aulas de desenho.</p>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: "Nome completo do aluno *", name: "aluno_nome", placeholder: "Nome completo", type: "text", col: 2 },
                      { label: "Data de nascimento *", name: "aluno_nascimento", placeholder: "AAAA-MM-DD", type: "date", col: 1 },
                      { label: "Sexo", name: "aluno_sexo", placeholder: "Ex: Masculino, Feminino...", type: "text", col: 1 },
                      { label: "CPF do aluno (se tiver)", name: "aluno_cpf", placeholder: "000.000.000-00", type: "text", col: 1 },
                      { label: "Escola / Instituição de ensino", name: "aluno_escola", placeholder: "Nome da escola", type: "text", col: 1 },
                    ].map(({ label, name, placeholder, type, col }) => (
                      <div key={label} className={col === 2 ? "col-span-2" : ""}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                        <input type={type} name={name} value={(formData as any)[name]} onChange={handleChange} placeholder={placeholder} className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors" />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Possui experiência prévia em desenho?</label>
                      <div className="flex gap-2">
                        {["Nenhuma", "Um pouco", "Sim, tenho prática"].map((v) => (
                          <button key={v} onClick={() => handleExperiencia(v)} className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${formData.aluno_experiencia === v ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Necessidades especiais ou observações</label>
                      <textarea name="aluno_necessidades" value={formData.aluno_necessidades} onChange={handleChange} rows={2} placeholder="Alergias, observações pedagógicas..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white resize-none transition-colors" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Turma */}
              {step === 2 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Escolha da turma</h2>
                  <p className="text-xs text-gray-400 mb-5">Selecione a turma desejada para a realização das aulas.</p>
                  
                  <div className="space-y-3 mb-6">
                    {safeTurmas.map((t) => {
                      const isSelected = formData.turma_id === t.id;
                      const c = COLOR_MAP['amber'];
                      return (
                        <button
                          key={t.id}
                          onClick={() => setFormData({ ...formData, turma_id: t.id })}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                            isSelected
                              ? `${c.accent} bg-amber-50 shadow-xs`
                              : "border-gray-200 hover:border-amber-200 bg-white"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${c.badge}`}>
                            <Pencil size={16} className={c.badgeText} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">{t.nome}</p>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge} ${c.badgeText}`}>{t.turno}</span>
                            </div>
                            <p className="text-xs text-gray-400">Turma de Desenho · CDE Odessa Macedo</p>
                          </div>
                          {isSelected && (
                            <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg font-bold whitespace-nowrap flex-shrink-0">
                              Selecionada ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3 — Confirmação */}
              {step === 3 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-2">Revisão da inscrição</h2>
                  <p className="text-gray-500 text-sm mb-6">Verifique os dados antes de confirmar.</p>
                  <div className="space-y-3">
                    {[
                      { section: "Responsável", items: [formData.resp_nome, `Telefone: ${formData.resp_telefone}`], ok: !!formData.resp_nome && !!formData.resp_telefone },
                      { section: "Aluno", items: [formData.aluno_nome, `Nascimento: ${formData.aluno_nascimento}`], ok: !!formData.aluno_nome },
                      { section: "Turma selecionada", items: [
                        selectedTurma ? selectedTurma.nome : "Nenhuma turma selecionada",
                      ].filter(Boolean), ok: !!selectedTurma },
                    ].map(({ section, items, ok }) => (
                      <div key={section} className={`rounded-xl border p-4 ${ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {ok ? <CheckCircle size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-600" />}
                          <span className="font-semibold text-sm text-gray-800">{section}</span>
                        </div>
                        <ul className="ml-5 space-y-0.5">
                          {items.map((item) => <li key={item} className="text-xs text-gray-600">{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs text-gray-500 bg-gray-50 rounded-xl p-4 leading-relaxed">
                    Ao confirmar, o aluno será cadastrado oficialmente no sistema do Centro de Desenvolvimento da Expressão Odessa Macedo.
                  </p>
                </div>
              )}
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1) as FormStep)}
                disabled={step === 0 || loading}
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-40 transition-colors"
              >
                Voltar
              </button>
              <div className="flex items-center gap-3">
                {step < 3 ? (
                  <button
                    onClick={() => {
                      if (step === 0 && !formData.resp_nome) {
                        alert("Por favor, preencha o nome do responsável.");
                        return;
                      }
                      if (step === 1 && !formData.aluno_nome) {
                        alert("Por favor, preencha o nome do aluno.");
                        return;
                      }
                      if (step === 2 && !formData.turma_id) {
                        setFormData(prev => ({ ...prev, turma_id: selectedTurma?.id || safeTurmas[0]?.id }));
                      }
                      setStep((s) => Math.min(3, s + 1) as FormStep)
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2"
                  >
                    Próxima etapa <ArrowRight size={16} />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
                    {loading ? "Gravando Inscrição..." : "Confirmar Inscrição"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar resumo */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6 sticky top-24">
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300] mb-4">Resumo da Inscrição</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Aluno:</span>
                  <span className="font-semibold text-gray-800">{formData.aluno_nome || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Responsável:</span>
                  <span className="font-semibold text-gray-800">{formData.resp_nome || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Turma:</span>
                  <span className="font-semibold text-gray-800">{selectedTurma?.nome || "Não selecionada"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
