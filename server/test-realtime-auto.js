#!/usr/bin/env node

/**
 * リアルタイムAPI 自動テストクライアント
 * 予め設定した回答で全スロットを埋めるまでの流れを自動テスト
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002/api';

// テスト用の回答を事前に定義
const predefinedAnswers = {
  // 質問パターンとそれに対する回答
  '顧客': 'ABC建設の田中部長を訪問しました',
  '客様': 'ABC建設の田中部長を訪問しました',
  'どなた': 'ABC建設の田中部長を訪問しました',
  '会社': 'ABC建設の田中部長を訪問しました',
  '企業': 'ABC建設の田中部長を訪問しました',
  
  '案件': '新社屋建設プロジェクトの打ち合わせでした',
  'プロジェクト': '新社屋建設プロジェクトの打ち合わせでした',
  '内容': '新社屋建設プロジェクトの打ち合わせでした',
  '商談': '新社屋建設プロジェクトの打ち合わせでした',
  '話': '新社屋建設プロジェクトの打ち合わせでした',
  
  '次': '来週月曜日に見積書を提出します',
  'アクション': '来週月曜日に見積書を提出します',
  '予定': '来週月曜日に見積書を提出します',
  'ステップ': '来週月曜日に見積書を提出します',
  
  '予算': '予算は約5000万円とのことでした',
  '金額': '予算は約5000万円とのことでした',
  'コスト': '予算は約5000万円とのことでした',
  
  'スケジュール': '来年3月着工、12月完成予定です',
  '納期': '来年3月着工、12月完成予定です',
  '工期': '来年3月着工、12月完成予定です',
  '期限': '来年3月着工、12月完成予定です',
  
  '参加': '先方は田中部長と山田課長、当社は私と鈴木が参加しました',
  'メンバー': '先方は田中部長と山田課長、当社は私と鈴木が参加しました',
  '出席': '先方は田中部長と山田課長、当社は私と鈴木が参加しました',
  
  '場所': 'ABC建設の本社会議室で実施しました',
  'どこ': 'ABC建設の本社会議室で実施しました',
  '会場': 'ABC建設の本社会議室で実施しました',
  
  '課題': '予算の調整と、設計変更への対応が必要です',
  'リスク': '予算の調整と、設計変更への対応が必要です',
  '懸念': '予算の調整と、設計変更への対応が必要です',
  '問題': '予算の調整と、設計変更への対応が必要です',
  
  // デフォルト回答
  'default': 'その点については特に話し合いませんでした'
};

// 質問に対する適切な回答を選択
function selectAnswer(question) {
  // 質問文から関連するキーワードを探す
  for (const [keyword, answer] of Object.entries(predefinedAnswers)) {
    if (keyword !== 'default' && question.includes(keyword)) {
      return answer;
    }
  }
  return predefinedAnswers.default;
}

async function main() {
  console.log('=' .repeat(60));
  console.log('リアルタイムAPI 自動テスト');
  console.log('全スロットが自動的に埋まるまでのテスト');
  console.log('=' .repeat(60));

  const startTime = Date.now();
  const conversationLog = [];

  try {
    // 1. ログイン
    console.log('\n[1] ログイン');
    console.log('─' .repeat(40));
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'yamada@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ ログイン成功');

    // 2. セッション作成
    console.log('\n[2] セッション作成');
    console.log('─' .repeat(40));
    const sessionResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions`,
      { platform: 'auto-test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, initialQuestion } = sessionResponse.data;
    console.log(`✅ セッションID: ${sessionId}`);
    console.log(`📝 初期質問: "${initialQuestion}"`);

    // 3. 自動対話ループ
    console.log('\n[3] 自動対話開始');
    console.log('=' .repeat(60));

    let currentQuestion = initialQuestion;
    let isComplete = false;
    let questionCount = 0;

    while (!isComplete && questionCount < 20) { // 最大20回で打ち切り
      questionCount++;
      
      // 回答を選択
      const answer = selectAnswer(currentQuestion);
      
      console.log(`\n【質問 ${questionCount}】`);
      console.log(`Q: ${currentQuestion}`);
      console.log(`A: ${answer}`);
      
      // ログに記録
      conversationLog.push({
        number: questionCount,
        question: currentQuestion,
        answer: answer,
        timestamp: new Date().toISOString()
      });

      // 回答を送信
      const answerResponse = await axios.post(
        `${API_BASE_URL}/realtime/sessions/${sessionId}/answers`,
        { answer },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const {
        aiResponse,
        nextQuestion,
        isComplete: complete,
        summary,
        slots
      } = answerResponse.data;

      // AI応答
      if (aiResponse) {
        console.log(`💭 ${aiResponse}`);
      }

      // 現在のスロット状態
      console.log('\n現在の収集状況:');
      const filledSlots = Object.entries(slots)
        .filter(([_, value]) => value && value.trim() !== '')
        .map(([key, value]) => {
          const label = {
            customer: '顧客',
            project: '案件',
            next_action: '次アクション',
            budget: '予算',
            schedule: 'スケジュール',
            participants: '参加者',
            location: '場所',
            issues: '課題'
          }[key] || key;
          return `  ✓ ${label}: ${value}`;
        });
      
      console.log(filledSlots.join('\n'));

      isComplete = complete;

      if (isComplete) {
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 ヒアリング完了！');
        console.log('=' .repeat(60));
        
        if (summary) {
          console.log('\n【生成されたサマリー】');
          console.log(summary);
        }

        // 最終結果
        const sessionDetails = await axios.get(
          `${API_BASE_URL}/realtime/sessions/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('\n【最終的に収集された全情報】');
        console.log('─' .repeat(40));
        Object.entries(sessionDetails.data.slots).forEach(([key, value]) => {
          if (value && value.trim() !== '') {
            const label = {
              customer: '顧客名',
              project: '案件名',
              next_action: '次のアクション',
              budget: '予算',
              schedule: 'スケジュール',
              participants: '参加者',
              location: '場所',
              issues: '課題・リスク'
            }[key] || key;
            console.log(`${label}: ${value}`);
          }
        });
      } else {
        currentQuestion = nextQuestion;
      }
    }

    // 統計情報
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 テスト統計');
    console.log('=' .repeat(60));
    console.log(`総質問数: ${questionCount}`);
    console.log(`所要時間: ${elapsedTime}秒`);
    console.log(`セッションID: ${sessionId}`);
    
    // 完全な会話ログ
    console.log('\n' + '=' .repeat(60));
    console.log('💬 完全な会話ログ');
    console.log('=' .repeat(60));
    conversationLog.forEach((log) => {
      console.log(`\n[${log.number}] ${log.timestamp}`);
      console.log(`Q: ${log.question}`);
      console.log(`A: ${log.answer}`);
    });

    console.log('\n✅ テスト成功！');

  } catch (error) {
    console.error('\n❌ テスト失敗:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('サーバーエラーの詳細:', error.response.data);
    }
    process.exit(1);
  }
}

// 実行
console.log('\n⚡ 自動テストを開始します...\n');
main().then(() => {
  console.log('\n👍 全テスト完了\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});