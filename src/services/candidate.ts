import { http } from '@/lib/httpClient';
import { Candidate, CandidateStatus } from '@/types/resume';

export const candidateService = {
  /**
   * 模块四：从 PostgreSQL 中获取候选人列表（支持模糊搜索与状态过滤）
   * @param params.keyword 搜索关键字（模糊匹配姓名、邮箱、技能）
   * @param params.status  人才招聘状态筛选
   */
  getList: (params: { keyword?: string; status?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.append('keyword', params.keyword);
    if (params.status && params.status !== 'all') searchParams.append('status', params.status);
    
    // 返回带有完整级联打分信息的 Candidate 数组
    return http.get<Candidate[]>(`/candidates?${searchParams.toString()}`);
  },

  /**
   * 模块四：更新候选人在 PostgreSQL 中的招聘状态
   * @param id     候选人 UUID
   * @param status 目标状态
   */
  updateStatus: (id: string, status: CandidateStatus) => {
    return http.patch<{ success: boolean; currentStatus: CandidateStatus }>(
      `/candidates/${id}/status`, 
      { status }
    );
  },

  /**
   * 模块一：批量上传物理 PDF 简历（采用 Multipart/FormData 二进制流）
   * @param files 拖拽投入的 File 数组
   * @returns 后端持久化存储后的物理 URL 集合
   */
  uploadResumes: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    return http.post<{ urls: string[] }>('/upload', formData);
  },

  /**
   * 模块二：生成大模型 SSE (Server-Sent Events) 流式解析的原生原生 URL
   * @param fileUrl 简历在服务器上的可访问物理路径
   * @note 因为 SSE 需要走浏览器的原生 EventSource 对象，不走标准 Fetch 拦截，故在此暴露只读地址
   */
  getStreamUrl: (fileUrl: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    return `${baseUrl}/extract/stream?fileUrl=${encodeURIComponent(fileUrl)}`;
  }
};