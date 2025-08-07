const CRMAdapterFactory = require('../crm/CRMAdapterFactory');
const pool = require('../../db/pool');

/**
 * データ駆動型質問生成サービス
 * 実際のCRMデータ、議事録から文脈に応じた質問を生成
 */
class DataDrivenQuestionGenerator {
  constructor() {
    this.questionTemplates = {
      // 顧客情報関連
      customer: {
        dataRequired: ['accounts', 'opportunities'],
        templates: [
          { 
            pattern: '今日は{customerName}様との商談でしたが、どのような内容でしたか？',
            requiredFields: ['customerName']
          },
          {
            pattern: '{projectName}案件について、{customerName}様の反応はいかがでしたか？',
            requiredFields: ['projectName', 'customerName']
          }
        ]
      },
      // 参加者関連
      participants: {
        dataRequired: ['meetings', 'notes'],
        templates: [
          {
            pattern: '今日の商談には{participantsList}が参加されていましたが、それぞれどのような役割でしたか？',
            requiredFields: ['participantsList']
          }
        ]
      },
      // 次のアクション関連
      nextAction: {
        dataRequired: ['activities', 'opportunities'],
        templates: [
          {
            pattern: '{lastActivity}の後、次のステップとして何を予定していますか？',
            requiredFields: ['lastActivity']
          }
        ]
      },
      // 予算関連
      budget: {
        dataRequired: ['opportunities'],
        templates: [
          {
            pattern: '{projectName}案件の予算感について、お客様からどのような情報を得られましたか？',
            requiredFields: ['projectName']
          }
        ]
      }
    };
  }

  /**
   * CRMデータを取得
   */
  async fetchCRMData(userId, crmType) {
    if (!crmType || crmType === 'none') {
      return {
        accounts: [],
        opportunities: [],
        activities: [],
        notes: [],
        meetings: []
      };
    }

    try {
      const adapter = await CRMAdapterFactory.createForUser(crmType, userId);
      if (!adapter) return {};

      // 並列でデータ取得
      const [accounts, opportunities, activities, notes, meetings] = await Promise.allSettled([
        adapter.getAccounts(10),
        adapter.getOpportunities(null, 10),
        adapter.getActivities(null, 10),
        adapter.getNotes(null, 10),
        adapter.getMeetings(null, 10)
      ]);

      return {
        accounts: accounts.status === 'fulfilled' ? accounts.value : [],
        opportunities: opportunities.status === 'fulfilled' ? opportunities.value : [],
        activities: activities.status === 'fulfilled' ? activities.value : [],
        notes: notes.status === 'fulfilled' ? notes.value : [],
        meetings: meetings.status === 'fulfilled' ? meetings.value : []
      };
    } catch (error) {
      console.error('Error fetching CRM data:', error);
      return {
        accounts: [],
        opportunities: [],
        activities: [],
        notes: [],
        meetings: []
      };
    }
  }

  /**
   * 議事録データを取得
   */
  async fetchMeetingNotes(userId) {
    try {
      const result = await pool.query(
        `SELECT mn.*, u.file_path 
         FROM meeting_notes mn
         LEFT JOIN uploads u ON mn.upload_id = u.id
         WHERE mn.user_id = $1 
         ORDER BY mn.created_at DESC 
         LIMIT 5`,
        [userId]
      );

      return result.rows.map(note => ({
        id: note.id,
        title: note.title,
        transcription: note.transcription,
        summary: note.summary,
        keyPoints: note.key_points,
        participants: note.participants,
        createdAt: note.created_at
      }));
    } catch (error) {
      console.error('Error fetching meeting notes:', error);
      return [];
    }
  }

  /**
   * データから文脈情報を抽出
   */
  extractContextFromData(crmData, meetingNotes) {
    const context = {
      recentCustomers: [],
      activeProjects: [],
      recentParticipants: [],
      lastActivities: [],
      upcomingMeetings: []
    };

    // 最近の顧客を抽出
    if (crmData.accounts?.length > 0) {
      context.recentCustomers = crmData.accounts.slice(0, 5).map(acc => ({
        id: acc.id,
        name: acc.name
      }));
    }

    // アクティブな案件を抽出
    if (crmData.opportunities?.length > 0) {
      context.activeProjects = crmData.opportunities
        .filter(opp => opp.status === 'Open')
        .slice(0, 5)
        .map(opp => ({
          id: opp.id,
          name: opp.name,
          customer: opp.customer,
          stage: opp.stage
        }));
    }

    // 議事録から参加者を抽出
    const participantSet = new Set();
    meetingNotes.forEach(note => {
      if (note.participants) {
        note.participants.forEach(p => participantSet.add(p));
      }
    });
    context.recentParticipants = Array.from(participantSet).slice(0, 10);

    // 最近の活動を抽出
    if (crmData.activities?.length > 0) {
      context.lastActivities = crmData.activities.slice(0, 3).map(act => ({
        subject: act.subject,
        date: act.createdOn
      }));
    }

    // 予定されている会議を抽出
    if (crmData.meetings?.length > 0) {
      const now = new Date();
      context.upcomingMeetings = crmData.meetings
        .filter(m => new Date(m.scheduledStart) > now)
        .slice(0, 3);
    }

    return context;
  }

  /**
   * スロットに基づいて適切な質問を生成
   */
  async generateQuestionForSlot(slot, context, previousAnswers = {}) {
    const templates = this.questionTemplates[slot];
    if (!templates) {
      return null;
    }

    // 利用可能なテンプレートをフィルタリング
    const availableTemplates = templates.templates.filter(template => {
      // 必要なフィールドが文脈に存在するかチェック
      return template.requiredFields.every(field => {
        switch (field) {
          case 'customerName':
            return context.recentCustomers.length > 0;
          case 'projectName':
            return context.activeProjects.length > 0;
          case 'participantsList':
            return context.recentParticipants.length > 0;
          case 'lastActivity':
            return context.lastActivities.length > 0;
          default:
            return false;
        }
      });
    });

    if (availableTemplates.length === 0) {
      // データがない場合の汎用質問
      return this.getGenericQuestionForSlot(slot);
    }

    // ランダムにテンプレートを選択
    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    
    // テンプレートに実データを埋め込む
    let question = template.pattern;
    
    if (question.includes('{customerName}')) {
      const customer = context.recentCustomers[0];
      question = question.replace('{customerName}', customer.name);
    }
    
    if (question.includes('{projectName}')) {
      const project = context.activeProjects[0];
      question = question.replace('{projectName}', project.name);
    }
    
    if (question.includes('{participantsList}')) {
      const participants = context.recentParticipants.slice(0, 3).join('様、') + '様';
      question = question.replace('{participantsList}', participants);
    }
    
    if (question.includes('{lastActivity}')) {
      const activity = context.lastActivities[0];
      question = question.replace('{lastActivity}', activity.subject);
    }

    return question;
  }

  /**
   * データがない場合の汎用質問
   */
  getGenericQuestionForSlot(slot) {
    const genericQuestions = {
      customer: '本日はどちらのお客様との商談でしたか？',
      project: '今回の案件名や商談の主な内容を教えてください。',
      participants: '商談にはどなたが参加されていましたか？',
      location: '商談はどちらで行われましたか？',
      budget: '予算感についてお客様から何か情報は得られましたか？',
      schedule: '納期やスケジュールについて何か決まりましたか？',
      next_action: '次のアクションとして何を予定していますか？',
      issues: '課題や懸念点はありましたか？'
    };

    return genericQuestions[slot] || '詳細を教えてください。';
  }

  /**
   * 回答候補を生成
   */
  async generateSuggestionsForQuestion(question, slot, context) {
    const suggestions = [];

    switch (slot) {
      case 'customer':
        // 実際の顧客名から選択肢を生成
        if (context.recentCustomers.length > 0) {
          context.recentCustomers.slice(0, 3).forEach(customer => {
            suggestions.push(`${customer.name}様との商談でした`);
          });
        }
        break;

      case 'project':
        // 実際の案件名から選択肢を生成
        if (context.activeProjects.length > 0) {
          context.activeProjects.slice(0, 3).forEach(project => {
            suggestions.push(`${project.name}について話し合いました`);
          });
        }
        break;

      case 'participants':
        // 実際の参加者から選択肢を生成
        if (context.recentParticipants.length > 0) {
          const participantGroups = [];
          for (let i = 0; i < context.recentParticipants.length; i += 2) {
            const group = context.recentParticipants.slice(i, i + 2);
            participantGroups.push(group.join('様と') + '様が参加されました');
          }
          suggestions.push(...participantGroups.slice(0, 3));
        }
        break;

      case 'next_action':
        // 一般的なアクションに実データを組み合わせる
        const actions = ['見積書を作成', '技術資料を送付', '次回打ち合わせを設定'];
        if (context.activeProjects.length > 0) {
          suggestions.push(`${context.activeProjects[0].name}の${actions[0]}をします`);
          suggestions.push(`${actions[1]}して詳細を詰めます`);
          suggestions.push(`来週${actions[2]}する予定です`);
        } else {
          suggestions.push(...actions.map(a => `${a}する予定です`));
        }
        break;

      default:
        // その他のスロットでは汎用的な選択肢
        return null;
    }

    // 選択肢が生成できなかった場合
    if (suggestions.length === 0) {
      return null;
    }

    return suggestions;
  }
}

module.exports = DataDrivenQuestionGenerator;