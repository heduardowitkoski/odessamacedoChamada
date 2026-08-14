import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Pencil, ArrowRight } from "lucide-react";
import { SpotBar } from "../../components/ui/SpotBar";
import { COLOR_MAP } from "../../lib/mock"; // TURMAS não é mais mock, vem da API

type FormStep = 0 | 1 | 2 | 3;

interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
}

export default function EnrollmentScreen() {
  const [step, setStep] = useState<FormStep>(0);
  const [turmasDb, setTurmasDb] = useState<Turma[]>([]);
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
    fetch("http://localhost:3000/turmas")
      .then(res => res.json())
      .then(data => setTurmasDb(data))
      .catch(err => console.error(err));
  }, []);

  const steps = ["Responsável", "Aluno", "Turma", "Confirmação"];
  const selectedTurma = turmasDb.find((t) => t.id === formData.turma_id);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleExperiencia = (exp: string) => {
    setFormData({ ...formData, aluno_experiencia: exp });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Inscrição confirmada com sucesso!");
        navigate("/admin");
      } else {
        const err = await res.json();
        alert("Erro ao confirmar: " + (err.message || "Tente novamente."));
      }
    } catch (e) {
      alert("Erro de conexão.");
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
          <p className="text-gray-500 text-sm">Preencha os dados abaixo. Se a turma escolhida não tiver vagas, você será incluído(a) na fila de espera automaticamente.</p>
        </div>

        {/* Alerta gratuidade */}
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5 mb-8 max-w-xl">
          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Inscrição e aulas totalmente gratuitas</p>
            <p className="text-xs text-emerald-700">Materiais de desenho fornecidos pelo Centro. Frequência obrigatória.</p>
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
                      { label: "Nome completo", name: "resp_nome", placeholder: "Nome do responsável ou próprio aluno (adulto)", col: 2 },
                      { label: "CPF", name: "resp_cpf", placeholder: "000.000.000-00", col: 1 },
                      { label: "RG", name: "resp_rg", placeholder: "0000000000", col: 1 },
                      { label: "E-mail", name: "resp_email", placeholder: "email@exemplo.com", col: 1 },
                      { label: "Telefone / WhatsApp", name: "resp_telefone", placeholder: "(53) 99999-0000", col: 1 },
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
                  <p className="text-xs text-gray-400 mb-5">Preencha os dados de quem vai frequentar as aulas.</p>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: "Nome completo do aluno", name: "aluno_nome", placeholder: "Nome completo", type: "text", col: 2 },
                      { label: "Data de nascimento", name: "aluno_nascimento", placeholder: "DD/MM/AAAA", type: "date", col: 1 },
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
                          <button key={v} onClick={() => handleExperiencia(v)} className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${formData.aluno_experiencia === v ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Necessidades especiais ou observações</label>
                      <textarea name="aluno_necessidades" value={formData.aluno_necessidades} onChange={handleChange} rows={2} placeholder="Alergias, etc..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white resize-none transition-colors" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Turma */}
              {step === 2 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Escolha da turma</h2>
                  <p className="text-xs text-gray-400 mb-5">Selecione a turma correspondente. Turmas cheias o colocarão na fila.</p>
                  
                  {turmasDb.length === 0 && <p className="text-sm text-gray-500">Buscando turmas...</p>}
                  
                  <div className="space-y-3 mb-6">
                    {turmasDb.map((t) => {
                      const c = COLOR_MAP['amber'];
                      const isFull = t.capacidade <= 0;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setFormData({ ...formData, turma_id: t.id })}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                            formData.turma_id === t.id
                              ? `${c.accent} bg-amber-50`
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
                            <SpotBar spots={t.capacidade} total={Math.max(t.capacidade, 15)} />
                          </div>
                          {isFull && (
                            <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap flex-shrink-0">→ Fila</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedTurma?.capacidade === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                      <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Esta turma está sem vagas no momento</p>
                        <p className="text-xs text-amber-700 mt-0.5">Ao confirmar, você será incluído(a) na lista de espera. Entraremos em contato assim que surgir uma vaga.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Confirmação */}
              {step === 3 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-2">Revisão da inscrição</h2>
                  <p className="text-gray-500 text-sm mb-6">Verifique os dados antes de confirmar.</p>
                  <div className="space-y-3">
                    {[
                      { section: "Responsável", items: [formData.resp_nome, `Telefone: ${formData.resp_telefone}`], ok: formData.resp_nome && formData.resp_telefone },
                      { section: "Aluno", items: [formData.aluno_nome, `Nascimento: ${formData.aluno_nascimento}`], ok: formData.aluno_nome && formData.aluno_nascimento },
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
                    Ao confirmar, você declara que as informações são verdadeiras e concorda com as normas do Centro de Desenvolvimento da Expressão Odessa Macedo.
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
                      if (step === 2 && !formData.turma_id) {
                        alert("Por favor, selecione uma turma antes de prosseguir.");
                        return;
                      }
                      setStep((s) => Math.min(3, s + 1) as FormStep)
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2"
                  >
                    Próxima etapa <ArrowRight size={16} />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
                    {loading ? "Confirmando..." : (
                       <><CheckCircle size={16} /> {selectedTurma?.capacidade === 0 ? "Entrar na fila de espera" : "Confirmar matrícula"}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview lateral */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Resumo</p>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-100">
                <div className="h-24 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Pencil size={32} className="text-white/60" />
                </div>
                <div className="p-4">
                  <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm mb-0.5">{formData.aluno_nome || "Novo Aluno"}</p>
                  <p className="text-xs text-gray-400 mb-3">{formData.aluno_nascimento || "---"}</p>
                  {selectedTurma && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-800">{selectedTurma.nome}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{selectedTurma.turno}</p>
                      {selectedTurma.capacidade <= 0 && (
                        <p className="text-xs font-bold text-red-600 mt-1.5">⚠ Entrará na fila</p>
                      )}
                    </div>
                  )}
                  <div className={`w-full h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${step === 3 ? "bg-green-500" : "bg-gray-300"}`}>
                    {step === 3 ? "Pronto para confirmar" : "Preenchendo..."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
