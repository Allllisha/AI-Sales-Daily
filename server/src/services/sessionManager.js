const Redis = require('ioredis');

class SessionManager {
  constructor() {
    // Redis接続（オプション - なくても動作）
    try {
      // REDIS_URLを優先的に使用、なければホスト/ポートを使用
      const redisUrl = process.env.REDIS_URL;
      
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          retryStrategy: (times) => {
            if (times > 3) {
              console.log('Redis connection failed - using in-memory storage');
              return null;
            }
            return Math.min(times * 100, 3000);
          }
        });
      } else {
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          retryStrategy: (times) => {
            if (times > 3) {
              console.log('Redis connection failed - using in-memory storage');
              return null;
            }
            return Math.min(times * 100, 3000);
          }
        });
      }

      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
        this.useInMemory = true;
      });

      this.redis.on('connect', () => {
        console.log('Connected to Redis');
        this.useInMemory = false;
      });
    } catch (error) {
      console.log('Redis not available - using in-memory storage');
      this.useInMemory = true;
    }

    // メモリ内ストレージ（フォールバック）
    this.sessions = new Map();
  }

  async createSession(sessionId, userId, initialData = {}) {
    const session = {
      id: sessionId,
      userId,
      status: 'active',
      startTime: new Date().toISOString(),
      slots: {
        // 必須スロット
        customer: '',
        project: '',
        next_action: '',
        budget: '',
        schedule: '',
        participants: '',
        location: '',
        issues: '',
        // 任意スロット（深掘り情報）
        key_person_reaction: '',  // キーマンの反応・温度感
        positive_points: '',      // 先方が興味を持った点
        atmosphere_change: '',    // 雰囲気が変わった瞬間
        competitor_info: '',      // 競合情報
        enthusiasm_level: '',     // 先方の熱意度
        budget_reaction: '',      // 予算への反応
        concerns_mood: '',        // 懸念事項の雰囲気
        next_step_mood: '',       // 次ステップへの温度感
        closing_possibility: ''   // 成約可能性（%）
      },
      questionsAnswers: [],
      currentQuestionIndex: 0,
      ...initialData
    };

    if (this.useInMemory) {
      this.sessions.set(sessionId, session);
    } else {
      try {
        await this.redis.set(
          `session:${sessionId}`,
          JSON.stringify(session),
          'EX',
          3600 // 1時間で自動削除
        );
      } catch (error) {
        console.error('Failed to save session to Redis:', error);
        this.sessions.set(sessionId, session);
      }
    }

    return session;
  }

  async getSession(sessionId) {
    if (this.useInMemory) {
      return this.sessions.get(sessionId);
    }

    try {
      const data = await this.redis.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get session from Redis:', error);
      return this.sessions.get(sessionId);
    }
  }

  async updateSession(sessionId, updates) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = { ...session, ...updates };

    if (this.useInMemory) {
      this.sessions.set(sessionId, updatedSession);
    } else {
      try {
        await this.redis.set(
          `session:${sessionId}`,
          JSON.stringify(updatedSession),
          'EX',
          3600
        );
      } catch (error) {
        console.error('Failed to update session in Redis:', error);
        this.sessions.set(sessionId, updatedSession);
      }
    }

    return updatedSession;
  }

  async deleteSession(sessionId) {
    if (this.useInMemory) {
      this.sessions.delete(sessionId);
    } else {
      try {
        await this.redis.del(`session:${sessionId}`);
      } catch (error) {
        console.error('Failed to delete session from Redis:', error);
        this.sessions.delete(sessionId);
      }
    }
  }

  async addQuestionAnswer(sessionId, question, answer) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.questionsAnswers.push({
      question,
      answer,
      timestamp: new Date().toISOString()
    });

    return await this.updateSession(sessionId, session);
  }

  async updateSlots(sessionId, slots) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.slots = { ...session.slots, ...slots };
    return await this.updateSession(sessionId, session);
  }

  isSlotsFilled(slots) {
    // 必須スロットのチェック
    const requiredSlots = ['customer', 'project', 'next_action'];
    return requiredSlots.every(slot => slots[slot] && slots[slot].trim() !== '');
  }

  /**
   * セッション終了を判定する改善版メソッド
   * 必須スロット + 情報の質を評価
   */
  shouldCompleteSession(session) {
    const { slots, questionsAnswers } = session;
    
    // 最低3回は質問する（挨拶含む）
    if (questionsAnswers.length < 3) {
      return false;
    }
    
    // 必須スロットチェック
    const requiredSlots = ['customer', 'project', 'next_action'];
    const hasRequired = requiredSlots.every(slot => slots[slot] && slots[slot].trim() !== '');
    
    if (!hasRequired) {
      // 12回質問しても必須情報が埋まらない場合は終了
      return questionsAnswers.length >= 12;
    }
    
    // 情報の質を評価（必須スロットが埋まっている場合）
    const qualitySlots = [
      'budget', 'schedule', 'participants', 'location',
      'key_person_reaction', 'positive_points', 'atmosphere_change',
      'enthusiasm_level', 'closing_possibility'
    ];
    
    const filledQualitySlots = qualitySlots.filter(
      slot => slots[slot] && slots[slot].trim() !== ''
    );
    
    // 情報の充実度を計算
    const informationScore = {
      required: hasRequired ? 1 : 0,
      quality: filledQualitySlots.length / qualitySlots.length,
      depth: 0
    };
    
    // 回答の詳細度を評価（最近3つの回答の平均文字数）
    const recentAnswers = questionsAnswers.slice(-3);
    const avgAnswerLength = recentAnswers.reduce((sum, qa) => 
      sum + qa.answer.length, 0
    ) / recentAnswers.length;
    
    // 詳細な回答をしている場合は深掘り情報も評価
    if (avgAnswerLength > 50) {
      informationScore.depth = 0.5;
    }
    
    // 総合スコア計算
    const totalScore = informationScore.required * 0.4 + 
                      informationScore.quality * 0.4 + 
                      informationScore.depth * 0.2;
    
    // 判定ロジック
    if (questionsAnswers.length >= 5) {
      // 5回以上質問した場合
      if (totalScore >= 0.7) {
        // 情報が十分に充実している
        return true;
      }
      if (filledQualitySlots.length >= 4) {
        // 質の高い情報が4つ以上ある
        return true;
      }
    }
    
    if (questionsAnswers.length >= 8) {
      // 8回以上質問した場合
      if (totalScore >= 0.5) {
        // ある程度の情報がある
        return true;
      }
    }
    
    // 12回質問したら終了
    if (questionsAnswers.length >= 12) {
      return true;
    }
    
    return false;
  }

  /**
   * 追加で聞くべき重要な情報があるかチェック
   */
  hasImportantMissingInfo(slots, questionsAnswers) {
    // 直近の回答で重要なキーワードが出た場合
    const lastAnswer = questionsAnswers.length > 0 
      ? questionsAnswers[questionsAnswers.length - 1].answer 
      : '';
    
    // 競合や予算の話が出たのに詳細がない
    if (lastAnswer.match(/競合|他社/) && !slots.competitor_info) {
      return true;
    }
    
    // 予算の話が出たのに詳細がない
    if (lastAnswer.match(/予算|金額|円/) && !slots.budget) {
      return true;
    }
    
    // ポジティブな反応があったのに成約可能性が不明
    if (lastAnswer.match(/前向き|好感触|良い/) && !slots.closing_possibility) {
      return true;
    }
    
    // 課題があったのに詳細がない
    if (lastAnswer.match(/課題|問題|懸念/) && !slots.issues) {
      return true;
    }
    
    return false;
  }

  getEmptySlots(slots) {
    const allSlots = Object.keys(slots);
    return allSlots.filter(slot => !slots[slot] || slots[slot].trim() === '');
  }
}

module.exports = new SessionManager();