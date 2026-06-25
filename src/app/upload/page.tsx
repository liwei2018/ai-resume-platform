'use client';

import React, { useState, useCallback, useRef } from 'react';
import { candidateService } from '@/services/candidate';
import { ResumeData } from '@/types/resume';

interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'parsing' | 'success' | 'error';
  parsedData?: ResumeData;
}

export default function UploadPage() {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerSSERead = (taskId: string, remoteFileUrl: string) => {
    const sseUrl = candidateService.getStreamUrl(remoteFileUrl);
    const eventSource = new EventSource(sseUrl);
    
    let accumulatedData: Partial<ResumeData> = { skills: [], education: [], experience: [] };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'start':
            // 开始解析
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'parsing', progress: 30 } : t));
            break;
            
          case 'parsing':
            // 正在解析，显示进度
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 50 } : t));
            break;
            
          case 'received':
            // 接收完成
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 70 } : t));
            break;
            
          case 'field':
            // 字段解析完成
            accumulatedData = {
              ...accumulatedData,
              [data.field]: data.data,
              skills: data.field === 'skills' ? data.data : accumulatedData.skills,
              experience: data.field === 'experience' ? data.data : accumulatedData.experience
            };
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, parsedData: { ...accumulatedData as ResumeData }, progress: 85 } : t));
            break;
            
          case 'saving':
            // 保存数据
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 95 } : t));
            break;
            
          case 'done':
            // 完成
            eventSource.close();
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'success', progress: 100 } : t));
            break;
            
          case 'fallback':
            // 使用后备数据
            console.log('使用模拟数据:', data.message);
            break;
            
          case 'error':
            // 错误
            eventSource.close();
            console.error('解析错误:', data.error);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t));
            break;
        }
      } catch (e) {
        console.error("解析流数据失败", e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t));
    };
  };

  const handleFiles = useCallback(async (files: File[]) => {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) return;

    const newTasks: UploadTask[] = pdfFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }));
    setTasks(prev => [...prev, ...newTasks]);

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const currentTask = newTasks[i];

      try {
        const uploadResult = await candidateService.uploadResumes([file]);
        const remoteUrl = uploadResult.urls[0];
        setTasks(prev => prev.map(t => t.id === currentTask.id ? { ...t, progress: 10 } : t));
        setActiveTaskId(currentTask.id);
        triggerSSERead(currentTask.id, remoteUrl);
      } catch (err) {
        setTasks(prev => prev.map(t => t.id === currentTask.id ? { ...t, status: 'error' } : t));
      }
    }
  }, [triggerSSERead]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = '';
  }, [handleFiles]);

  const activeTask = tasks.find(t => t.id === activeTaskId);

  const getStatusIcon = (status: UploadTask['status']) => {
    switch (status) {
      case 'uploading': return '⬆️';
      case 'parsing': return '🤖';
      case 'success': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusColor = (status: UploadTask['status']) => {
    switch (status) {
      case 'uploading': return 'text-blue-500';
      case 'parsing': return 'text-purple-500';
      case 'success': return 'text-emerald-500';
      case 'error': return 'text-red-500';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleClick}
          className="relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 bg-gradient-to-br from-white to-slate-50 hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-400 hover:shadow-lg group"
        >
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-indigo-500/5 to-purple-500/5" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-3xl">📥</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">拖拽 PDF 简历到此处</h3>
            <p className="text-xs text-slate-400">或点击选择文件</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">📋 解析任务队列</h3>
            <span className="text-[10px] text-slate-400 font-mono">{tasks.length} 个任务</span>
          </div>
          
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-xs text-slate-400">暂无任务，拖拽文件开始解析</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setActiveTaskId(task.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                    activeTaskId === task.id 
                      ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${getStatusColor(task.status)}`}>{getStatusIcon(task.status)}</span>
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{task.fileName}</span>
                    </div>
                    <span className={`text-[10px] font-mono ${getStatusColor(task.status)}`}>
                      {task.status === 'uploading' ? `${task.progress}%` : task.status === 'parsing' ? '解析中' : task.status === 'success' ? '完成' : '失败'}
                    </span>
                  </div>
                  
                  {task.status !== 'success' && task.status !== 'error' && (
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.status === 'uploading' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`} 
                        style={{ width: `${task.progress}%` }} 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="text-xl">🤖</span>
                大模型语义流提取终端
              </h2>
              {activeTask && (
                <span className={`text-xs font-mono ${getStatusColor(activeTask.status)}`}>
                  {activeTask.status === 'parsing' ? '🔄 实时解析中...' : '✓ 解析完成'}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {activeTask?.parsedData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                    <label className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">👤 姓名</label>
                    <div className="mt-2 text-lg font-bold text-slate-800">{activeTask.parsedData.name || '解析中...'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                    <label className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">📧 邮箱</label>
                    <div className="mt-2 text-sm font-medium text-slate-700">{activeTask.parsedData.email || '解析中...'}</div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-3">🏷️ 核心技能标签</label>
                  <div className="flex flex-wrap gap-2">
                    {activeTask.parsedData.skills?.map((skill, i) => (
                      <span 
                        key={i} 
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200 hover:shadow-md transition-shadow"
                      >
                        {skill}
                      </span>
                    ))}
                    {!activeTask.parsedData.skills?.length && (
                      <span className="text-xs text-slate-400">解析中...</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-3">💼 工作履历</label>
                  <div className="space-y-3">
                    {activeTask.parsedData.experience?.map((exp, i) => (
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
                    {!activeTask.parsedData.experience?.length && (
                      <div className="text-center py-8 text-xs text-slate-400">解析中...</div>
                    )}
                  </div>
                </div>

                {activeTask.parsedData.education?.length > 0 && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-3">🎓 教育背景</label>
                    <div className="space-y-2">
                      {activeTask.parsedData.education.map((edu, i) => (
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(activeTask.parsedData.projects?.length ?? 0) > 0 && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-3">📦 项目经验</label>
                    <div className="space-y-3">
                      {(activeTask.parsedData.projects || []).map((project, i) => (
                        <div key={i} className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📦</span>
                            <span className="font-bold text-slate-800">{project.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {project.techStack?.map((tech, j) => (
                              <span key={j} className="text-[10px] bg-amber-200/50 text-amber-700 px-2 py-0.5 rounded">{tech}</span>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{project.responsibility}</p>
                          {project.highlights && (
                            <div className="text-xs bg-amber-100/50 rounded p-2">
                              <span className="font-medium text-amber-700">✨ 亮点：</span>
                              {project.highlights}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <span className="text-4xl">👆</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-600 mb-2">选择一个任务查看详情</h3>
                <p className="text-xs text-slate-400">或拖拽新文件开始解析</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}