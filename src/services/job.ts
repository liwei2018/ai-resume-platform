import { http } from '@/lib/httpClient';
import { MatchScore } from '@/types/resume';

// 统一使用相对路径 /api，由 Next.js rewrites 转发到后端
const BASE_URL = '/api';

// 严格约束前端输入框的数据结构
export interface JobDescriptionInput {
  title: string;          // 岗位名称
  description: string;    // 详细岗位描述 (JD)
  requiredSkills: string[]; // 核心硬性技能指标
}

export interface MatchStreamCallback {
  onStart?: (message: string) => void;
  onThinking?: (message: string) => void;
  onGenerating?: (content: string) => void;
  onSaving?: (message: string) => void;
  onDone?: (data: MatchScore) => void;
  onError?: (error: string) => void;
  onFallback?: (message: string) => void;
}

export const jobService = {
  /**
   * 模块三：调用 AI 模型对指定简历与岗位需求进行双向匹配度打分
   */
  matchCandidate: (candidateId: string, jdData: JobDescriptionInput) => {
    return http.post<MatchScore>('/match', {
      candidateId,
      jd: jdData
    });
  },

  /**
   * 模块三：SSE 流式岗位匹配
   */
  matchCandidateStream: (candidateId: string, jdData: JobDescriptionInput, callbacks: MatchStreamCallback) => {
    const url = `${BASE_URL}/match/stream`;
    
    // 使用 fetch API 支持 POST 请求的 SSE
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ candidateId, jd: jdData })
    }).then(response => {
      if (!response.ok) {
        throw new Error('请求失败');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      function read() {
        reader?.read().then(({ done, value }) => {
          if (done) return;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'start':
                    callbacks.onStart?.(data.message);
                    break;
                  case 'thinking':
                    callbacks.onThinking?.(data.message);
                    break;
                  case 'generating':
                    callbacks.onGenerating?.(data.content);
                    break;
                  case 'saving':
                    callbacks.onSaving?.(data.message);
                    break;
                  case 'done':
                    callbacks.onDone?.(data.data);
                    break;
                  case 'fallback':
                    callbacks.onFallback?.(data.message);
                    break;
                  case 'error':
                    callbacks.onError?.(data.error);
                    break;
                }
              } catch (e) {
                console.error('解析SSE数据失败', e);
              }
            }
          }
          
          read();
        });
      }
      
      read();
    }).catch(error => {
      callbacks.onError?.('连接失败: ' + error.message);
    });
  }
};