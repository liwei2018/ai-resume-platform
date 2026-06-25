import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// 从环境变量中读取后端 API 根地址，若未配置则优雅兜底本地 8000 端口
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// 统一响应格式接口
interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg: string;
}

class HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 120000, // 120秒超时，适配大模型调用等耗时操作
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 如果是 FormData，删除 Content-Type 让浏览器自动设置
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        return config;
      },
      (error) => {
        console.error('请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // 检查业务状态码
        if (response.data.code !== 0 && response.data.code !== 200) {
          // 业务错误，抛出带有业务错误信息的 Error
          const error = new Error(response.data.msg || '操作失败');
          (error as any).code = response.data.code;
          (error as any).response = response.data;
          return Promise.reject(error);
        }
        return response;
      },
      (error) => {
        // 处理错误响应
        if (error.response) {
          // 服务器返回错误状态码
          const errorMessage = error.response.data?.msg || 
                              error.response.data?.error || 
                              `请求失败，状态码: ${error.response.status}`;
          console.error(`请求错误 [${error.response.status}]:`, errorMessage);
          const customError = new Error(errorMessage);
          (customError as any).code = error.response.status;
          (customError as any).response = error.response.data;
          return Promise.reject(customError);
        } else if (error.request) {
          // 请求已发出但没有收到响应
          console.error('网络错误: 未收到服务器响应');
          throw new Error('网络连接失败，请检查网络或服务器状态');
        } else {
          // 请求配置出错
          console.error('请求配置错误:', error.message);
          throw error;
        }
      }
    );
  }

  /**
   * 封装 GET 请求
   */
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(endpoint, config);
    return response.data.data;
  }

  /**
   * 封装 POST 请求
   */
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(endpoint, data, config);
    return response.data.data;
  }

  /**
   * 封装 PATCH 请求
   */
  async patch<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(endpoint, data, config);
    return response.data.data;
  }

  /**
   * 封装 DELETE 请求
   */
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(endpoint, config);
    return response.data.data;
  }
}

// 导出单例，确保全局共用同一个网络配置实例
export const http = new HttpClient();
