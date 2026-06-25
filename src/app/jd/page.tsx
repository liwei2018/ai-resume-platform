'use client';

import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/job';
import { candidateService } from '@/services/candidate';
import { MatchScore, Candidate } from '@/types/resume';

export default function JobMatchPage() {
  const [jd, setJd] = useState({
    title: '高级前端开发工程师',
    description: '熟练掌握 React, TypeScript, Next.js 框架，具有大模型全栈平台开发经验者优先。',
    requiredSkills: ['React', 'Next.js']
  });
  const [candidateId, setCandidateId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreResult, setScoreResult] = useState<MatchScore | null>(null);
  const [matching, setMatching] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiThinking, setAiThinking] = useState('');

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const data = await candidateService.getList({});
        setCandidates(data);
        if (data.length > 0) {
          setCandidateId(data[0].id);
        }
      } catch (err) {
        console.error('获取候选人列表失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const handleAIMatch = () => {
    if (!candidateId) {
      alert("请选择候选人");
      return;
    }

    setMatching(true);
    setScoreResult(null);
    setAiStatus('🤖 大模型引擎启动中...');
    setAiThinking('');

    jobService.matchCandidateStream(candidateId, jd, {
      onStart: (message) => {
        setAiStatus('🚀 ' + message);
      },
      onThinking: (message) => {
        setAiStatus('🧠 ' + message);
      },
      onGenerating: (content) => {
        setAiThinking(prev => prev + content);
        // 限制显示长度
        if (aiThinking.length > 200) {
          setAiThinking(prev => prev.slice(-200));
        }
      },
      onSaving: (message) => {
        setAiStatus('💾 ' + message);
      },
      onDone: (data) => {
        setScoreResult(data);
        setMatching(false);
        setAiStatus('✅ 匹配完成');
        setAiThinking('');
      },
      onError: (error) => {
        alert("AI 匹配引擎返回异常: " + error);
        setMatching(false);
        setAiStatus('');
        setAiThinking('');
      },
      onFallback: (message) => {
        setAiStatus('⚠️ ' + message);
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    if (score >= 60) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    return 'bg-gradient-to-r from-red-500 to-rose-500';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'ring-emerald-300';
    if (score >= 60) return 'ring-amber-300';
    return 'ring-red-300';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左轴：岗位 JD 配置编辑器 */}
        <div className="space-y-6">
          {/* 候选人选择器 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>👤</span>
                选择候选人
              </h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-slate-500">加载候选人列表...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm text-slate-500">暂无候选人</p>
                  <p className="text-xs text-slate-400 mt-1">请先上传并解析简历</p>
                </div>
              ) : (
                <select
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-medium appearance-none cursor-pointer hover:border-indigo-300 transition-all"
                >
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} - {candidate.email} ({candidate.skills?.slice(0, 2).join(', ')})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 岗位需求配置 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>📝</span>
                岗位需求配置 (JD)
              </h2>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                  🔤 岗位名称
                </label>
                <input
                  type="text"
                  value={jd.title}
                  onChange={e => setJd({...jd, title: e.target.value})}
                  className="w-full text-sm px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="输入岗位名称"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                  📋 需求详情描述
                </label>
                <textarea
                  rows={4}
                  value={jd.description}
                  onChange={e => setJd({...jd, description: e.target.value})}
                  className="w-full text-sm px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="详细描述岗位要求和职责..."
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                  🏷️ 核心技能要求
                </label>
                <div className="flex flex-wrap gap-2">
                  {jd.requiredSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAIMatch}
                disabled={matching || !candidateId}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
              >
                {matching ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    🤖 大模型算力高速评估中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🎯 启动 AI 智能画像匹配
                  </span>
                )}
              </button>

              {/* AI 状态显示 */}
              {matching && (
                <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl p-4 border border-slate-200">
                  <div className="text-xs text-slate-600 mb-2">
                    {aiStatus}
                  </div>
                  {aiThinking && (
                    <div className="text-xs text-slate-500 font-mono bg-slate-100 rounded p-2 max-h-20 overflow-y-auto">
                      {aiThinking}...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右轴：结构化评分报告仪表盘 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-emerald-50/30 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>📊</span>
              匹配度大模型结构化回执
            </h2>
          </div>

          <div className="p-6">
            {scoreResult ? (
              <div className="space-y-6">
                {/* 综合得分 */}
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                    综合匹配契合度
                  </span>
                  <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBgColor(scoreResult.totalScore)} shadow-xl ${getScoreRingColor(scoreResult.totalScore)} ring-4 ring-offset-4`}>
                    <span className="text-4xl font-extrabold text-white font-mono">
                      {scoreResult.totalScore}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">满分 100 分</p>
                </div>

                {/* 分项得分 */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-100 flex items-center justify-center">
                        <span className="text-lg">🛠️</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">技能匹配</span>
                      <span className={`text-xl font-bold ${getScoreColor(scoreResult.subScores.skills)} font-mono mt-1 block`}>
                        {scoreResult.subScores.skills}
                      </span>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-purple-100 flex items-center justify-center">
                        <span className="text-lg">💼</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">履历匹配</span>
                      <span className={`text-xl font-bold ${getScoreColor(scoreResult.subScores.experience)} font-mono mt-1 block`}>
                        {scoreResult.subScores.experience}
                      </span>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <span className="text-lg">🎓</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">学历匹配</span>
                      <span className={`text-xl font-bold ${getScoreColor(scoreResult.subScores.education)} font-mono mt-1 block`}>
                        {scoreResult.subScores.education}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI 评语 */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl p-4 border border-amber-100">
                  <label className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider block mb-2">
                    💬 AI 面试官终审评语
                  </label>
                  <div className="flex gap-3">
                    <span className="text-xl flex-shrink-0">🤖</span>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      "{scoreResult.aiComment}"
                    </p>
                  </div>
                </div>

                {/* 匹配建议 */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                    💡 匹配建议
                  </label>
                  <ul className="space-y-2 text-xs text-slate-500">
                    {scoreResult.totalScore >= 80 && (
                      <>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500">✓</span>
                          候选人与岗位高度匹配，建议优先安排面试
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500">✓</span>
                          核心技能完全满足岗位要求
                        </li>
                      </>
                    )}
                    {scoreResult.totalScore >= 60 && scoreResult.totalScore < 80 && (
                      <>
                        <li className="flex items-center gap-2">
                          <span className="text-amber-500">~</span>
                          候选人基本符合要求，建议进一步沟通了解
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-amber-500">~</span>
                          部分技能有待进一步评估
                        </li>
                      </>
                    )}
                    {scoreResult.totalScore < 60 && (
                      <>
                        <li className="flex items-center gap-2">
                          <span className="text-red-500">✗</span>
                          候选人与岗位匹配度较低
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-red-500">✗</span>
                          建议考虑其他候选人
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <span className="text-4xl">🎯</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-600 mb-2">等待 AI 匹配分析</h3>
                <p className="text-xs text-slate-400">
                  填写岗位需求后，点击左侧按钮启动 AI 智能匹配
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">
                    当前候选人 ID: {candidateId}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
