'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { candidateService } from '@/services/candidate';
import { ResumeData } from '@/types/resume';

interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'parsing' | 'success' | 'error';
  parsedData?: ResumeData;
  currentField?: string;
  currentFieldLabel?: string;
  fieldsLoaded: string[];
}

const fieldConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  name: { label: '姓名', icon: '👤', color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  phone: { label: '电话', icon: '📞', color: 'text-green-500', bgColor: 'bg-green-50' },
  email: { label: '邮箱', icon: '📧', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  city: { label: '城市', icon: '🌍', color: 'text-orange-500', bgColor: 'bg-orange-50' },
  skills: { label: '技能', icon: '🏷️', color: 'text-purple-500', bgColor: 'bg-purple-50' },
  education: { label: '教育背景', icon: '🎓', color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  experience: { label: '工作履历', icon: '💼', color: 'text-cyan-500', bgColor: 'bg-cyan-50' },
  projects: { label: '项目经验', icon: '📦', color: 'text-amber-500', bgColor: 'bg-amber-50' },
};

export default function UploadPage() {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerSSERead = (taskId: string, remoteFileUrl: string) => {
    const sseUrl = candidateService.getStreamUrl(remoteFileUrl);
    const eventSource = new EventSource(sseUrl);
    
    let accumulatedData: Partial<ResumeData> = { skills: [], education: [], experience: [] };
    let fieldsLoaded: string[] = [];

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'start':
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'parsing', progress: 5 } : t));
            break;
            
          case 'parsing':
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 15 } : t));
            break;
            
          case 'received':
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 25 } : t));
            break;
            
          case 'parsing_field':
            setTasks(prev => prev.map(t => t.id === taskId ? { 
              ...t, 
              progress: data.progress,
              currentField: data.field,
              currentFieldLabel: data.label 
            } : t));
            break;
            
          case 'field':
            accumulatedData = {
              ...accumulatedData,
              [data.field]: data.data,
              skills: data.field === 'skills' ? data.data : accumulatedData.skills,
              experience: data.field === 'experience' ? data.data : accumulatedData.experience,
              education: data.field === 'education' ? data.data : accumulatedData.education,
              projects: data.field === 'projects' ? data.data : accumulatedData.projects
            };
            fieldsLoaded = [...fieldsLoaded, data.field];
            setTasks(prev => prev.map(t => t.id === taskId ? { 
              ...t, 
              parsedData: { ...accumulatedData as ResumeData },
              fieldsLoaded: fieldsLoaded,
              currentField: undefined
            } : t));
            break;
            
          case 'field_done':
            setTasks(prev => prev.map(t => t.id === taskId ? { 
              ...t, 
              progress: data.progress 
            } : t));
            break;
            
          case 'saving':
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 95, currentFieldLabel: '正在保存...' } : t));
            break;
            
          case 'done':
            eventSource.close();
            setTasks(prev => prev.map(t => t.id === taskId ? { 
              ...t, 
              status: 'success', 
              progress: 100,
              currentField: undefined,
              currentFieldLabel: undefined
            } : t));
            break;
            
          case 'fallback':
            console.log('使用模拟数据:', data.message);
            break;
            
          case 'error':
            eventSource.close();
            console.error('解析错误:', data.error);
            setTasks(prev => prev.map(t => t.id === taskId ? { 
              ...t, 
              status: 'error',
              currentField: undefined,
              currentFieldLabel: undefined
            } : t));
            break;
        }
      } catch (e) {
        console.error("解析流数据失败", e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setTasks(prev => prev.map(t => t.id === taskId ? { 
        ...t, 
        status: 'error',
        currentField: undefined,
        currentFieldLabel: undefined
      } : t));
    };
  };

  const handleFiles = useCallback(async (files: File[]) => {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) return;

    const newTasks: UploadTask[] = pdfFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      fieldsLoaded: []
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
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">{task.fileName}</span>
                    </div>
                    <span className={`text-[10px] font-mono ${getStatusColor(task.status)}`}>
                      {task.status === 'uploading' ? `${task.progress}%` : task.status === 'parsing' ? `${task.progress}%` : task.status === 'success' ? '完成' : '失败'}
                    </span>
                  </div>
                  
                  {task.status !== 'success' && task.status !== 'error' && (
                    <>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            task.status === 'uploading' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                          }`} 
                          style={{ width: `${task.progress}%` }} 
                        />
                      </div>
                      {task.currentFieldLabel && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                          {task.currentFieldLabel}
                        </div>
                      )}
                    </>
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
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono ${getStatusColor(activeTask.status)}`}>
                    {activeTask.status === 'parsing' ? '🔄 实时解析中...' : '✓ 解析完成'}
                  </span>
                  {activeTask.status === 'parsing' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">{activeTask.progress}%</span>
                      <div className="w-20 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                          style={{ width: `${activeTask.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {activeTask?.parsedData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCard 
                    field="name" 
                    icon="👤" 
                    label="姓名"
                    value={activeTask.parsedData.name}
                    isLoading={activeTask.currentField === 'name'}
                    isLoaded={activeTask.fieldsLoaded.includes('name')}
                  />
                  <FieldCard 
                    field="email" 
                    icon="📧" 
                    label="邮箱"
                    value={activeTask.parsedData.email}
                    isLoading={activeTask.currentField === 'email'}
                    isLoaded={activeTask.fieldsLoaded.includes('email')}
                  />
                  <FieldCard 
                    field="phone" 
                    icon="📞" 
                    label="电话"
                    value={activeTask.parsedData.phone}
                    isLoading={activeTask.currentField === 'phone'}
                    isLoaded={activeTask.fieldsLoaded.includes('phone')}
                  />
                  <FieldCard 
                    field="city" 
                    icon="🌍" 
                    label="城市"
                    value={activeTask.parsedData.city}
                    isLoading={activeTask.currentField === 'city'}
                    isLoaded={activeTask.fieldsLoaded.includes('city')}
                  />
                </div>

                <div className={`transition-all duration-500 ${activeTask.fieldsLoaded.includes('skills') ? 'opacity-100' : 'opacity-60'}`}>
                  <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-3 flex items-center gap-1 ${activeTask.fieldsLoaded.includes('skills') ? 'text-purple-500' : 'text-slate-400'}`}>
                    🏷️ 核心技能标签
                    {activeTask.currentField === 'skills' && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeTask.parsedData.skills?.map((skill, i) => (
                      <SkillTag key={i} skill={skill} index={i} />
                    ))}
                    {!activeTask.parsedData.skills?.length && !activeTask.fieldsLoaded.includes('skills') && (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-slate-400">提取技能中...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`transition-all duration-500 ${activeTask.fieldsLoaded.includes('experience') ? 'opacity-100' : 'opacity-60'}`}>
                  <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-3 flex items-center gap-1 ${activeTask.fieldsLoaded.includes('experience') ? 'text-cyan-500' : 'text-slate-400'}`}>
                    💼 工作履历
                    {activeTask.currentField === 'experience' && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    )}
                  </label>
                  <div className="space-y-3">
                    {activeTask.parsedData.experience?.map((exp, i) => (
                      <ExperienceCard key={i} experience={exp} index={i} />
                    ))}
                    {!activeTask.parsedData.experience?.length && !activeTask.fieldsLoaded.includes('experience') && (
                      <div className="flex items-center justify-center py-8">
                        <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-slate-400 ml-2">提取工作履历中...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`transition-all duration-500 ${activeTask.fieldsLoaded.includes('education') ? 'opacity-100' : 'opacity-60'}`}>
                  <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-3 flex items-center gap-1 ${activeTask.fieldsLoaded.includes('education') ? 'text-emerald-500' : 'text-slate-400'}`}>
                    🎓 教育背景
                    {activeTask.currentField === 'education' && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    )}
                  </label>
                  <div className="space-y-2">
                    {activeTask.parsedData.education?.map((edu, i) => (
                      <EducationCard key={i} education={edu} index={i} />
                    ))}
                    {!activeTask.parsedData.education?.length && !activeTask.fieldsLoaded.includes('education') && (
                      <div className="flex items-center justify-center py-8">
                        <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-slate-400 ml-2">提取教育背景中...</span>
                      </div>
                    )}
                  </div>
                </div>

                {(activeTask.parsedData.projects?.length ?? 0) > 0 && (
                  <div className={`transition-all duration-500 ${activeTask.fieldsLoaded.includes('projects') ? 'opacity-100' : 'opacity-60'}`}>
                    <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-3 flex items-center gap-1 ${activeTask.fieldsLoaded.includes('projects') ? 'text-amber-500' : 'text-slate-400'}`}>
                      📦 项目经验
                      {activeTask.currentField === 'projects' && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      )}
                    </label>
                    <div className="space-y-3">
                      {(activeTask.parsedData.projects || []).map((project, i) => (
                        <ProjectCard key={i} project={project} index={i} />
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

function FieldCard({ field, icon, label, value, isLoading, isLoaded }: {
  field: string;
  icon: string;
  label: string;
  value: string | undefined;
  isLoading: boolean;
  isLoaded: boolean;
}) {
  const config = fieldConfig[field] || { color: 'text-indigo-500', bgColor: 'bg-indigo-50' };
  
  return (
    <div className={`rounded-xl p-4 border transition-all duration-500 ${
      isLoaded 
        ? `${config.bgColor} border-${config.color.replace('text-', '')}-100` 
        : 'bg-slate-50 border-slate-100'
    } ${isLoading ? 'animate-pulse' : ''}`}>
      <label className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${isLoaded ? config.color : 'text-slate-400'}`}>
        {icon} {label}
      </label>
      <div className="mt-2">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 border-2 ${config.color.replace('text-', 'border-')} border-t-transparent rounded-full animate-spin`} />
            <span className="text-xs text-slate-400">解析中...</span>
          </div>
        ) : value ? (
          <AnimatedText text={value} className={`text-lg font-bold text-slate-800`} />
        ) : (
          <span className="text-xs text-slate-400">未找到</span>
        )}
      </div>
    </div>
  );
}

function SkillTag({ skill, index }: { skill: string; index: number }) {
  return (
    <span 
      key={index}
      className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200 hover:shadow-md transition-all"
      style={{ 
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
      }}
    >
      {skill}
    </span>
  );
}

function ExperienceCard({ experience, index }: { 
  experience: { company: string; position: string; timeRange: string; summary: string }; 
  index: number;
}) {
  return (
    <div 
      key={index}
      className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all"
      style={{ 
        animation: `fadeInUp 0.5s ease-out ${index * 0.15}s both`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-sm font-bold text-slate-800">{experience.company}</span>
          <span className="text-slate-400 mx-2">·</span>
          <span className="text-sm font-medium text-slate-600">{experience.position}</span>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{experience.timeRange}</span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{experience.summary}</p>
    </div>
  );
}

function EducationCard({ education, index }: { 
  education: { school: string; major: string; degree: string; graduationTime: string }; 
  index: number;
}) {
  return (
    <div 
      key={index}
      className="flex items-center gap-3 text-sm"
      style={{ 
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
      }}
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-600">
        🎓
      </div>
      <div>
        <span className="font-medium text-slate-700">{education.school}</span>
        <span className="text-slate-400 mx-2">·</span>
        <span className="text-slate-500">{education.major}</span>
        {education.degree && <span className="text-slate-400 mx-2">·</span>}
        {education.degree && <span className="text-slate-500">{education.degree}</span>}
        {education.graduationTime && <span className="text-slate-400 mx-2">·</span>}
        {education.graduationTime && <span className="text-slate-400 text-xs">{education.graduationTime}</span>}
      </div>
    </div>
  );
}

function ProjectCard({ project, index }: { 
  project: { name: string; techStack: string[]; responsibility: string; highlights: string }; 
  index: number;
}) {
  return (
    <div 
      key={index}
      className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100"
      style={{ 
        animation: `fadeInUp 0.5s ease-out ${index * 0.2}s both`,
      }}
    >
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
  );
}

function AnimatedText({ text, className }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!text || !isAnimating) return;
    
    let index = 0;
    const timer = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.substring(0, index));
        index++;
      } else {
        clearInterval(timer);
        setIsAnimating(false);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [text, isAnimating]);

  return <span className={className}>{displayText}</span>;
}
