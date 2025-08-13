import { useEffect } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// AIヒアリングの初期質問を事前取得するカスタムフック
export const usePrefetchHearing = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // ホーム画面表示時に初期質問を事前取得
    const prefetchInitialQuestion = async () => {
      try {
        // キャッシュキーを生成
        const cacheKey = `hearing_initial_${user.id}`;
        
        // 既にキャッシュがある場合はスキップ
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          // 1時間以内のキャッシュなら有効
          if (Date.now() - data.timestamp < 3600000) {
            return;
          }
        }

        // 初期質問を事前取得（実際にはセッションを開始しない）
        const response = await aiAPI.prefetchInitialQuestion();
        
        // キャッシュに保存
        sessionStorage.setItem(cacheKey, JSON.stringify({
          question: response.question,
          suggestions: response.suggestions || [],
          timestamp: Date.now()
        }));
        
        console.log('Prefetched initial hearing question');
      } catch (error) {
        console.error('Failed to prefetch hearing question:', error);
      }
    };

    // 少し遅延させて実行（画面描画を優先）
    const timer = setTimeout(prefetchInitialQuestion, 500);
    
    return () => clearTimeout(timer);
  }, [user]);
};

export const getCachedInitialQuestion = (userId) => {
  const cacheKey = `hearing_initial_${userId}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    const data = JSON.parse(cached);
    // 1時間以内のキャッシュなら返す
    if (Date.now() - data.timestamp < 3600000) {
      // 使用後はキャッシュをクリア
      sessionStorage.removeItem(cacheKey);
      return data;
    }
  }
  
  return null;
};