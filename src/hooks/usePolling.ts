import { useState, useEffect } from 'react';
import { Task } from '@/types';

/**
 * 轮询任务状态的Hook
 * @param taskId 任务ID
 * @param interval 轮询间隔（毫秒），默认2000ms
 * @returns 包含任务和错误的对象
 */
export function usePolling(taskId: string, interval = 2000) {
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    /**
     * 执行一次轮询请求
     * @returns 是否应该继续轮询
     */
    async function poll(): Promise<boolean> {
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error.message);
        }

        if (!cancelled) {
          setTask(result.data);

          // 如果任务完成或失败，停止轮询
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            return false;
          }

          // 继续轮询
          return true;
        }

        return false;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '查询失败');
        }
        return false;
      }
    }

    // 开始轮询
    poll().then((continuePolling) => {
      if (continuePolling && !cancelled) {
        const intervalId = setInterval(() => {
          poll().then((shouldContinue) => {
            if (!shouldContinue || cancelled) {
              clearInterval(intervalId);
            }
          });
        }, interval);

        // 清理函数
        return () => {
          clearInterval(intervalId);
        };
      }
    });

    // 取消所有操作
    return () => {
      cancelled = true;
    };
  }, [taskId, interval]);

  return { task, error };
}
