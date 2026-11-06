import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Phone,
  AlertTriangle,
  Loader2,
  Save,
  MessageCircle,
  Send,
  BookOpen
} from 'lucide-react';
import { fetchHistoricoAluno, justificarFalta, getApiBase, type AlunoHistoricoResponse } from '../../lib/api';

interface StudentHistoryModalProps {
  alunoId: string | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function StudentHistoryModal({ alunoId, onClose, onUpdate }: StudentHistoryModalProps) {
  const [data, setData] = useState<AlunoHistoricoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'faltas' | 'ficha'>('faltas');

  // Estado para justificar falta
  const [justifyingDate, setJustifyingDate] = useState<string | null>(null);
  const [justificativaTexto, setJustificativaTexto] = useState('');
  const [savingJust, setSavingJust] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  useEffect(() => {
    if (alunoId) {
      carregarHistorico();
    }
  }, [alunoId]);

  const carregarHistorico = async () => {
    if (!alunoId) return;
    setLoading(true);
    try {
      const res = await fetchHistoricoAluno(alunoId);
      setData(res);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarJustificativa = async (dataStr: string) => {
    if (!alunoId || !justificativaTexto.trim()) return;
    setSavingJust(true);
    try {
      await justificarFalta(alunoId, dataStr, justificativaTexto.trim());
      setJustifyingDate(null);
      setJustificativaTexto('');
      await carregarHistorico();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert('Erro ao salvar justificativa: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSavingJust(false);
    }
  };

  const handleEnviarAlertaEmail = async () => {
    if (!alunoId || !data?.aluno.resp_email) {
      alert('Responsável não possui e-mail cadastrado.');
      return;
    }
    if (!window.confirm(`Deseja enviar um e-mail de alerta de faltas para ${data.aluno.resp_email}?`)) return;

    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`${getApiBase()}/frequencias/alertas/enviar-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aluno_id: alunoId }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setEmailStatus('E-mail enviado com sucesso!');
        setTimeout(() => setEmailStatus(null), 4000);
      } else {
        alert('Erro ao enviar e-mail: ' + (resJson.error || 'Verifique o serviço de e-mail'));
      }
    } catch {
      alert('Erro de conexão ao enviar alerta de e-mail.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (!alunoId) return null;

  const aluno = data?.aluno;
  const stats = data?.stats;
  const historico = data?.historico || [];
  const cleanPhone = aluno?.resp_telefone?.replace(/\D/g, '') || '';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-amber-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabeçalho do Modal */}
        <div className="p-6 bg-gradient-to-r from-[#1C1300] to-[#302100] text-white flex items-start justify-between relative shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
              {aluno?.aluno_nome?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg sm:text-xl text-white">
                  {aluno?.aluno_nome || 'Carregando aluno...'}
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  aluno?.status === 'Ativo'
                    ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                    : aluno?.status === 'Fila'
                    ? 'bg-orange-500/20 border border-orange-400 text-orange-300'
                    : 'bg-gray-500/20 border border-gray-400 text-gray-300'
                }`}>
                  {aluno?.status || 'Carregando...'}
                </span>
              </div>
              <p className="text-amber-200/80 text-xs mt-1 flex items-center gap-2">
                <BookOpen size={13} className="text-amber-400" />
                <span>{aluno?.turmas?.nome || 'Turma não informada'}</span>
                {aluno?.turmas?.turno && <span>· {aluno?.turmas?.turno}</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center justify-between px-6 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('faltas')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'faltas'
                  ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Calendar size={15} />
              Histórico Individual de Faltas & Chamadas
            </button>
            <button
              onClick={() => setActiveTab('ficha')}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'ficha'
                  ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <User size={15} />
              Ficha Completa & Contato do Responsável
            </button>
          </div>

          {/* Ações Rápidas de Contato */}
          <div className="hidden sm:flex items-center gap-2">
            {cleanPhone && (
              <a
                href={`https://wa.me/55${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <MessageCircle size={13} />
                WhatsApp Resp.
              </a>
            )}
            {aluno?.resp_email && (
              <button
                onClick={handleEnviarAlertaEmail}
                disabled={sendingEmail}
                className="text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Alerta por E-mail
              </button>
            )}
          </div>
        </div>

        {/* Feedback de envio de e-mail */}
        {emailStatus && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-600" />
            <span>{emailStatus}</span>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-amber-500" />
              <p className="text-xs text-gray-400 font-medium">Buscando histórico do aluno no banco...</p>
            </div>
          ) : !aluno ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Aluno não encontrado ou excluído do banco de dados.
            </div>
          ) : (
            <>
              {/* Resumo Estatístico de Frequência do Aluno */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-[11px] text-gray-500 block mb-0.5 font-medium">Aulas Registradas</span>
                  <p className="text-xl font-extrabold text-gray-900">{stats?.totalAulas || 0}</p>
                </div>

                <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/60">
                  <span className="text-[11px] text-emerald-700 block mb-0.5 font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> Presenças
                  </span>
                  <p className="text-xl font-extrabold text-emerald-800">{stats?.presencas || 0}</p>
                </div>

                <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200/60">
                  <span className="text-[11px] text-red-700 block mb-0.5 font-bold flex items-center gap-1">
                    <XCircle size={12} /> Faltas (Não Just.)
                  </span>
                  <p className="text-xl font-extrabold text-red-800">{stats?.faltas || 0}</p>
                </div>

                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/60">
                  <span className="text-[11px] text-amber-700 block mb-0.5 font-bold flex items-center gap-1">
                    <Clock size={12} /> Justificadas
                  </span>
                  <p className="text-xl font-extrabold text-amber-800">{stats?.justificadas || 0}</p>
                </div>

                <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200/60 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-purple-700 block mb-0.5 font-bold">% Frequência</span>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-xl font-extrabold text-purple-900">{stats?.frequenciaPercentual || 100}%</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${(stats?.frequenciaPercentual || 100) >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {(stats?.frequenciaPercentual || 100) >= 75 ? 'Ok' : 'Baixa'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alerta de Absenteísmo se tiver 3+ faltas seguidas */}
              {(stats?.faltasConsecutivas || 0) >= 3 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-red-950 text-sm">Atenção: Aluno em Risco de Evasão!</p>
                    <p className="text-red-800 mt-0.5">
                      Este aluno possui <strong>{stats?.faltasConsecutivas} faltas consecutivas</strong> sem justificativa aceita. 
                      Última ausência: <strong>{stats?.ultimaFalta || 'Recente'}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* ABA 1: TABELA DE FALTAS & DIÁRIO DE AULAS */}
              {activeTab === 'faltas' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">
                        Registro Aula a Aula de Cada Falta e Presença
                      </h3>
                      <p className="text-xs text-gray-500">
                        Consulte as datas específicas de cada ausência e registre justificativas
                      </p>
                    </div>

                    <button
                      onClick={carregarHistorico}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 hover:underline"
                    >
                      Atualizar histórico
                    </button>
                  </div>

                  {historico.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <Calendar size={28} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-600">Nenhuma chamada lançada para este aluno ainda.</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Assim que o professor registrar a primeira frequência da turma, os detalhes aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">Data da Aula</th>
                            <th className="py-3 px-4">Situação</th>
                            <th className="py-3 px-4">Observação / Justificativa</th>
                            <th className="py-3 px-4 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {historico.map((item) => {
                            const dateFormatted = item.data.split('-').reverse().join('/');
                            const isBeingJustified = justifyingDate === item.data;

                            return (
                              <React.Fragment key={item.id || item.data}>
                                <tr className="hover:bg-amber-50/30 transition-colors">
                                  <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <Calendar size={13} className="text-gray-400" />
                                      <span>{dateFormatted}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    {item.status === 'PRESENTE' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle size={11} /> Presente
                                      </span>
                                    )}
                                    {item.status === 'FALTA' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                        <XCircle size={11} /> Falta
                                      </span>
                                    )}
                                    {item.status === 'JUSTIFICADA' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        <Clock size={11} /> Falta Justificada
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-gray-600">
                                    {item.observacao ? (
                                      <span className="text-gray-800 font-medium italic">
                                        "{item.observacao}"
                                      </span>
                                    ) : (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    {item.status === 'FALTA' ? (
                                      <button
                                        onClick={() => {
                                          setJustifyingDate(isBeingJustified ? null : item.data);
                                          setJustificativaTexto(item.observacao || 'Atestado / Justificativa familiar');
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                                      >
                                        {isBeingJustified ? 'Cancelar' : 'Justificar Falta'}
                                      </button>
                                    ) : item.status === 'JUSTIFICADA' ? (
                                      <button
                                        onClick={() => {
                                          setJustifyingDate(isBeingJustified ? null : item.data);
                                          setJustificativaTexto(item.observacao || '');
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 hover:underline"
                                      >
                                        Editar motivo
                                      </button>
                                    ) : null}
                                  </td>
                                </tr>

                                {/* Formulário Inline para Justificar a Falta */}
                                {isBeingJustified && (
                                  <tr className="bg-amber-50/50">
                                    <td colSpan={4} className="p-3">
                                      <div className="flex flex-col sm:flex-row items-center gap-2 max-w-2xl">
                                        <input
                                          type="text"
                                          placeholder="Informe o motivo da justificativa (ex: Consulta médica, atestado...)"
                                          value={justificativaTexto}
                                          onChange={(e) => setJustificativaTexto(e.target.value)}
                                          className="flex-1 w-full h-8 px-3 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                                          autoFocus
                                        />
                                        <div className="flex gap-1.5 w-full sm:w-auto">
                                          <button
                                            onClick={() => handleSalvarJustificativa(item.data)}
                                            disabled={savingJust || !justificativaTexto.trim()}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                          >
                                            {savingJust ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                            Salvar Justificativa
                                          </button>
                                          <button
                                            onClick={() => setJustifyingDate(null)}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-xs rounded-lg"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: FICHA COMPLETA DO ALUNO & RESPONSÁVEL */}
              {activeTab === 'ficha' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Informações do Aluno */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <User size={16} className="text-amber-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">Dados do Aluno</h4>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Nome Completo</span>
                        <span className="font-semibold text-gray-900">{aluno.aluno_nome}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Nascimento</span>
                          <span className="font-semibold text-gray-900">
                            {aluno.aluno_nascimento ? aluno.aluno_nascimento.split('-').reverse().join('/') : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Sexo</span>
                          <span className="font-semibold text-gray-900">{aluno.aluno_sexo || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">CPF do Aluno</span>
                        <span className="font-semibold text-gray-900">{aluno.aluno_cpf || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Escola onde estuda</span>
                        <span className="font-semibold text-gray-900">{aluno.aluno_escola || 'Não informada'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Experiência anterior com desenho</span>
                        <span className="font-semibold text-gray-900">{aluno.aluno_experiencia || 'Nenhuma'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Necessidades especiais / Observações de saúde</span>
                        <span className="font-semibold text-gray-900">{aluno.aluno_necessidades || 'Nenhuma declarada'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Informações do Responsável */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Phone size={16} className="text-amber-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">Responsável Legal</h4>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Nome do Responsável</span>
                        <span className="font-semibold text-gray-900">{aluno.resp_nome}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-400 block text-[11px]">CPF</span>
                          <span className="font-semibold text-gray-900">{aluno.resp_cpf || '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">RG</span>
                          <span className="font-semibold text-gray-900">{aluno.resp_rg || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Telefone de Contato</span>
                        <a href={`tel:${aluno.resp_telefone}`} className="font-semibold text-blue-600 hover:underline">
                          {aluno.resp_telefone}
                        </a>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">E-mail</span>
                        <span className="font-semibold text-gray-900">{aluno.resp_email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Endereço / Bairro</span>
                        <span className="font-semibold text-gray-900">
                          {aluno.resp_endereco ? `${aluno.resp_endereco} ${aluno.resp_bairro ? `· ${aluno.resp_bairro}` : ''}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">CEP</span>
                        <span className="font-semibold text-gray-900">{aluno.resp_cep || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-gray-50 border-t border-gray-200/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400">
            ID do Cadastro: <code className="text-gray-600">{aluno?.id?.slice(0, 8)}...</code>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
