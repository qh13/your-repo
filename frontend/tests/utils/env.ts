/**
 * 环境变量配置文件
 * 用于测试环境变量管理
 */

export const testEnv = {
  // 前端 URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Worker API URL
  WORKER_URL: process.env.WORKER_URL || 'https://jable-video-proxy.qh13.workers.dev',
  
  // 源视频网站域名
  ORIGIN_DOMAIN: 'jable.tv',
  
  // 测试超时时间
  TEST_TIMEOUT: 30000,
  
  // 页面加载超时
  PAGE_LOAD_TIMEOUT: 15000,
  
  // API 超时
  API_TIMEOUT: 10000,
};

/**
 * 获取环境配置
 */
export function getEnvConfig() {
  return {
    frontend: {
      url: testEnv.FRONTEND_URL,
      port: new URL(testEnv.FRONTEND_URL).port || '3000'
    },
    worker: {
      url: testEnv.WORKER_URL,
      origin: testEnv.ORIGIN_DOMAIN
    },
    timeouts: {
      test: testEnv.TEST_TIMEOUT,
      page: testEnv.PAGE_LOAD_TIMEOUT,
      api: testEnv.API_TIMEOUT
    }
  };
}

/**
 * 验证环境变量
 */
export function validateEnv() {
  const errors: string[] = [];
  
  if (!testEnv.FRONTEND_URL) {
    errors.push('FRONTEND_URL is not set');
  }
  
  if (!testEnv.WORKER_URL) {
    errors.push('WORKER_URL is not set');
  }
  
  if (errors.length > 0) {
    throw new Error(`Missing environment variables:\n${errors.join('\n')}`);
  }
}
