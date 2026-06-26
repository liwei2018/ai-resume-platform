'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { candidateService } from '@/services/candidate';
import { Candidate, CandidateStatus } from '@/types/resume';

const statusConfig: Record<CandidateStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待筛选', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  passed: { label: '初筛通过', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  interviewing: { label: '面试中', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  hired: { label: '已录用', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  rejected: { label: '已淘汰', color: 'text-red-600', bgColor: 'bg-red-50' },
};

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCandidate(id);
    }
  }, [id]);

  const fetchCandidate = async (id: string) => {
    try {
      setLoading(true);
      const result = await candidateService.getCandidateById(id);
      setCandidate(result);
    } catch (error) {
      console.error('获取候选人详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-sm text-slate-500">候选人不存在</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm"
          >
            返回看板
          </button>
        </div>
      </div>
    );
  }

  const latestScore = candidate.scores[candidate.scores.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/20">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">返回人才看板</span>
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[candidate.status as CandidateStatus].bgColor} ${statusConfig[candidate.status as CandidateStatus].color}`}>
            {statusConfig[candidate.status as CandidateStatus].label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50/30">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  个人信息
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                    <label className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">姓名</label>
                    <div className="mt-2 text-lg font-bold text-slate-800">{candidate.name || '未填写'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                    <label className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">邮箱</label>
                    <div className="mt-2 text-sm font-medium text-slate-700">{candidate.email || '未填写'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                    <label className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">电话</label>
                    <div className="mt-2 text-sm font-medium text-slate-700">{candidate.phone || '未填写'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <label className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">城市</label>
                    <div className="mt-2 text-sm font-medium text-slate-700">{candidate.city || '未填写'}</div>
                  </div>
                </div>
              </div>
            </div>

            {candidate.skills?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">🏷️</span>
                    核心技能标签
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200 hover:shadow-md transition-shadow"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {candidate.experiences?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">💼</span>
                    工作履历
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  {candidate.experiences.map((exp, i) => (
                    <div
                      key={i}
                      className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-sm font-bold text-slate-800">{exp.company}</span>
                          <span className="text-slate-400 mx-2">·</span>
                          <span className="text-sm font-medium text-slate-600">{exp.position}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{exp.timeRange}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{exp.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {candidate.educations?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">🎓</span>
                    教育背景
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  {candidate.educations.map((edu, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-600">
                        🎓
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">{edu.school}</span>
                        <span className="text-slate-400 mx-2">·</span>
                        <span className="text-slate-500">{edu.major}</span>
                        {edu.degree && <span className="text-slate-400 mx-2">·</span>}
                        {edu.degree && <span className="text-slate-500">{edu.degree}</span>}
                        {edu.graduationTime && <span className="text-slate-400 mx-2">·</span>}
                        {edu.graduationTime && <span className="text-slate-400 text-xs">({edu.graduationTime})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {latestScore && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50/30">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    匹配评分详情
                  </h2>
                </div>
                <div className="p-6">
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="12"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${latestScore.totalScore * 3.52} 352`}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-800">{latestScore.totalScore}</span>
                      <span className="text-[10px] text-slate-400">匹配度</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">技能匹配</span>
                        <span className="font-medium text-indigo-600">{latestScore.skillScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${latestScore.skillScore}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">经验匹配</span>
                        <span className="font-medium text-blue-600">{latestScore.expScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${latestScore.expScore}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">学历匹配</span>
                        <span className="font-medium text-emerald-600">{latestScore.eduScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${latestScore.eduScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {latestScore.aiComment && (
                    <div className="mt-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-xl border border-indigo-100">
                      <label className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider block mb-2">
                        🤖 AI 评价
                      </label>
                      <p className="text-xs text-slate-600 leading-relaxed">{latestScore.aiComment}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  原始简历预览
                </h2>
              </div>
              <div className="p-4">
                <div className="aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[300px]">
                  <button
                    onClick={() => window.open(candidate.resumeUrl, '_blank')}
                    className="flex flex-col items-center gap-3 px-6 py-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <span className="text-3xl">📄</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">点击查看 PDF 简历</span>
                    <span className="text-xs text-slate-400">在新窗口中打开</span>
                  </button>
                </div>
                <div className="mt-3 text-center">
                  <a
                    href={candidate.resumeUrl}
                    download
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    下载简历
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  创建时间
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600">
                  {new Date(candidate.createdAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}