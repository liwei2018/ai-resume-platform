'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { candidateService } from '@/services/candidate';
import { Candidate, CandidateStatus } from '@/types/resume';

const statusConfig: Record<CandidateStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待筛选', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  passed: { label: '初筛通过', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  interviewing: { label: '面试中', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  hired: { label: '已录用', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  rejected: { label: '已淘汰', color: 'text-red-600', bgColor: 'bg-red-50' },
};

type ViewMode = 'card' | 'table';
type SortField = 'createdAt' | 'name' | 'score';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 12;

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 搜索和筛选
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | 'all'>('all');
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  
  // 视图切换
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  
  // 排序
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  
  // 防抖定时器
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await candidateService.getList({});
      setCandidates(data);
    } catch (err) {
      console.error("看板数据加载失败", err);
    } finally {
      setLoading(false);
    }
  };

  // 防抖搜索
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1); // 重置到第一页
    }, 300);
  }, []);

  // 获取所有技能标签
  const allSkills = useMemo(() => {
    const skillSet = new Set<string>();
    candidates.forEach(c => {
      c.skills?.forEach(s => skillSet.add(s));
    });
    return Array.from(skillSet).sort();
  }, [candidates]);

  // 筛选和排序后的数据
  const filteredCandidates = useMemo(() => {
    let result = [...candidates];
    
    // 关键字筛选
    if (debouncedSearch) {
      const keyword = debouncedSearch.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(keyword) ||
        c.email?.toLowerCase().includes(keyword) ||
        c.skills?.some(s => s.toLowerCase().includes(keyword))
      );
    }
    
    // 状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }
    
    // 技能筛选
    if (skillFilter.length > 0) {
      result = result.filter(c => 
        skillFilter.every(skill => c.skills?.includes(skill))
      );
    }
    
    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'score':
          // 假设从 matchScores 获取分数，这里简化处理
          const scoreA = (a as any).matchScore?.totalScore || 0;
          const scoreB = (b as any).matchScore?.totalScore || 0;
          comparison = scoreA - scoreB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [candidates, debouncedSearch, statusFilter, skillFilter, sortField, sortOrder]);

  // 分页数据
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCandidates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCandidates, currentPage]);

  // 总页数
  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);

  // 状态统计
  const statusCounts = useMemo(() => ({
    all: candidates.length,
    pending: candidates.filter(c => c.status === 'pending').length,
    passed: candidates.filter(c => c.status === 'passed').length,
    interviewing: candidates.filter(c => c.status === 'interviewing').length,
    hired: candidates.filter(c => c.status === 'hired').length,
    rejected: candidates.filter(c => c.status === 'rejected').length,
  }), [candidates]);

  const handleStatusChange = async (id: string, newStatus: CandidateStatus) => {
    try {
      await candidateService.updateStatus(id, newStatus);
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert("数据库状态更新失败，请检查后端服务");
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSkillFilter = (skill: string) => {
    setSkillFilter(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
    setCurrentPage(1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 顶部查询控制区 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
        <div className="flex items-center gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="搜索姓名、邮箱或技能..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>
          
          {/* 视图切换 */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'card' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ◫ 卡片
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ☰ 表格
            </button>
          </div>
          
          {/* 排序按钮 */}
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1">
            <span className="text-[10px] text-slate-400 mr-1">排序:</span>
            {[
              { field: 'createdAt' as SortField, label: '时间' },
              { field: 'name' as SortField, label: '姓名' },
            ].map(({ field, label }) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  sortField === field
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                {label} {sortField === field && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            ))}
          </div>
          
          {/* 技能筛选下拉 */}
          {allSkills.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setFilterMenuOpen(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-2 text-sm bg-slate-50 rounded-xl hover:bg-slate-100 transition-all ${
                  skillFilter.length > 0
                    ? 'ring-2 ring-indigo-300 text-indigo-600'
                    : 'text-slate-600'
                }`}
              >
                <span>🏷️</span>
                <span>技能</span>
                {skillFilter.length > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {skillFilter.length}
                  </span>
                )}
                <svg className={`w-4 h-4 transition-transform ${filterMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {filterMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 max-h-64 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30">
                  {skillFilter.length > 0 && (
                    <>
                      <button
                        onClick={() => setSkillFilter([])}
                        className="w-full px-3 py-2 text-left text-xs text-indigo-600 hover:bg-indigo-50 flex items-center justify-between"
                      >
                        <span>清除全部</span>
                        <span className="text-indigo-400">×</span>
                      </button>
                      <div className="border-t border-slate-100" />
                    </>
                  )}
                  {allSkills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkillFilter(skill)}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        skillFilter.includes(skill) ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'
                      }`}
                    >
                      <span>{skill}</span>
                      {skillFilter.includes(skill) && <span className="text-indigo-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 状态标签筛选 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          <span className="text-xs text-slate-400 shrink-0">状态:</span>
          {(['all', 'pending', 'passed', 'interviewing', 'hired', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === status
                  ? status === 'all'
                    ? 'bg-slate-800 text-white'
                    : `${statusConfig[status].bgColor} ${statusConfig[status].color} ring-2 ring-offset-1`
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? '全部' : statusConfig[status].label} ({statusCounts[status]})
            </button>
          ))}
        </div>
        
        {/* 已选技能标签 */}
        {skillFilter.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">已选技能:</span>
            {skillFilter.map(skill => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-600 flex items-center gap-1"
              >
                {skill}
                <button
                  onClick={() => toggleSkillFilter(skill)}
                  className="hover:text-indigo-800 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={() => setSkillFilter([])}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              清除
            </button>
          </div>
        )}
      </div>

      {/* 结果统计 */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          共找到 <span className="font-semibold text-indigo-600">{filteredCandidates.length}</span> 个候选人
          {skillFilter.length > 0 && ` (筛选自 ${candidates.length} 个)`}
        </span>
      </div>

      {/* 卡片视图 */}
      {viewMode === 'card' ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                <div className="h-6 bg-slate-100 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
                <div className="flex gap-2">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-5 bg-slate-100 rounded px-3" />
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="h-7 bg-slate-100 rounded px-4" />
                  <div className="h-4 bg-slate-100 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-slate-500 text-sm font-medium">没有找到符合条件的候选人</p>
            <p className="text-slate-400 text-xs mt-1">尝试调整搜索条件或状态筛选</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCandidates.map(candidate => {
              const statusInfo = statusConfig[candidate.status];
              return (
                <div
                  key={candidate.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {candidate.name || '未命名'}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{candidate.email || '无邮箱记录'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {candidate.skills.slice(0, 5).map((skill, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium border border-indigo-100"
                      >
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 5 && (
                      <span className="text-[10px] bg-slate-50 text-slate-400 px-2.5 py-1 rounded-full font-medium">
                        +{candidate.skills.length - 5}
                      </span>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <select
                      value={candidate.status}
                      onChange={(e) => handleStatusChange(candidate.id, e.target.value as CandidateStatus)}
                      className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {(Object.keys(statusConfig) as CandidateStatus[]).map(status => (
                        <option key={status} value={status} className="bg-white">
                          {statusConfig[status].label}
                        </option>
                      ))}
                    </select>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(candidate.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* 表格视图 */
        loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-slate-100 rounded" />
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-100 rounded" />
              ))}
            </div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-slate-500 text-sm font-medium">没有找到符合条件的候选人</p>
            <p className="text-slate-400 text-xs mt-1">尝试调整搜索条件或状态筛选</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-indigo-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">姓名</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">邮箱</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">技能</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">上传时间</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCandidates.map(candidate => {
                    const statusInfo = statusConfig[candidate.status];
                    return (
                      <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          {candidate.name || '未命名'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                          {candidate.email || '无'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 3).map((skill, i) => (
                              <span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                {skill}
                              </span>
                            ))}
                            {candidate.skills.length > 3 && (
                              <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full">
                                +{candidate.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                          {new Date(candidate.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={candidate.status}
                            onChange={(e) => handleStatusChange(candidate.id, e.target.value as CandidateStatus)}
                            className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            {(Object.keys(statusConfig) as CandidateStatus[]).map(status => (
                              <option key={status} value={status} className="bg-white">
                                {statusConfig[status].label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            上一页
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            下一页
          </button>
          
          <span className="text-xs text-slate-400 ml-2">
            第 {currentPage} / {totalPages} 页
          </span>
        </div>
      )}
    </div>
  );
}
