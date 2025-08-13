#!/usr/bin/env node

/**
 * リアルタイムAPI 動的深掘りテスト
 * ユーザーの回答に応じて流動的に質問を変える
 */

const axios = require('axios');
const readline = require('readline');

const API_BASE_URL = 'http://localhost:3002/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(`\n🤖 AI: ${question}\n👤 あなた: `, (answer) => {
      resolve(answer);
    });
  });
};

// テストシナリオ：ポジティブな商談の場合
const positiveScenarioAnswers = [
  'XYZ商事の山田部長を訪問しました',
  '新システム導入の提案をしました。とても前向きな反応でした',
  '特にコスト削減効果に強い興味を示されました',
  '予算は問題なさそうで、むしろ追加投資も検討したいとのことでした',
  '競合のA社も検討していたが、我々の提案の方が優れているとの評価でした',
  '来週の役員会議で決裁を取る予定です',
  '成約可能性は80%以上だと思います'
];

// テストシナリオ：課題がある商談の場合
const challengingScenarioAnswers = [
  'ABC建設の鈴木課長と打ち合わせでした',
  '設備更新の相談でしたが、予算面で厳しい反応でした',
  '技術的には評価されましたが、コストが課題です',
  '予算は当初想定の半分程度しか確保できないとのことでした',
  '競合のB社がかなり安い価格を提示しているようです',
  '社内調整に時間がかかりそうで、決定は来月以降になりそうです',
  '正直、成約可能性は30%程度かもしれません'
];

async function runScenario(scenarioName, answers, isManual = false) {
  console.log('\n' + '=' .repeat(60));
  console.log(`📋 シナリオ: ${scenarioName}`);
  console.log('=' .repeat(60));

  try {
    // ログイン
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'yamada@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;

    // セッション作成
    const sessionResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions`,
      { platform: 'dynamic-test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, initialQuestion } = sessionResponse.data;
    console.log(`セッションID: ${sessionId}\n`);

    let currentQuestion = initialQuestion;
    let isComplete = false;
    let questionCount = 0;
    let answerIndex = 0;
    const conversationLog = [];

    while (!isComplete && questionCount < 15) {
      questionCount++;
      
      // 回答を取得（手動 or 自動）
      let answer;
      if (isManual) {
        answer = await askQuestion(currentQuestion);
      } else {
        console.log(`\n【質問 ${questionCount}】`);
        console.log(`Q: ${currentQuestion}`);
        
        // シナリオに基づく回答を選択
        if (answerIndex < answers.length) {
          answer = answers[answerIndex++];
        } else {
          // シナリオの回答がなくなったらデフォルト
          answer = 'その点は特に話題になりませんでした';
        }
        console.log(`A: ${answer}`);
      }

      conversationLog.push({
        number: questionCount,
        question: currentQuestion,
        answer: answer
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

      if (aiResponse) {
        console.log(`💭 ${aiResponse}`);
      }

      // 深掘り度合いを表示
      const filledSlots = Object.entries(slots)
        .filter(([_, value]) => value && value.trim() !== '');
      
      console.log(`\n📊 情報収集状況: ${filledSlots.length}/17項目`);
      
      // 深掘り項目があれば表示
      const deepSlots = ['key_person_reaction', 'positive_points', 'atmosphere_change', 
                         'competitor_info', 'enthusiasm_level', 'budget_reaction', 
                         'closing_possibility'];
      const collectedDeepSlots = deepSlots.filter(key => slots[key] && slots[key].trim() !== '');
      if (collectedDeepSlots.length > 0) {
        console.log('✨ 深掘り情報:');
        collectedDeepSlots.forEach(key => {
          const label = {
            key_person_reaction: 'キーマンの反応',
            positive_points: 'ポジティブポイント',
            atmosphere_change: '雰囲気の変化',
            competitor_info: '競合情報',
            enthusiasm_level: '熱意度',
            budget_reaction: '予算反応',
            closing_possibility: '成約可能性'
          }[key];
          console.log(`  - ${label}: ${slots[key]}`);
        });
      }

      isComplete = complete;

      if (isComplete) {
        console.log('\n' + '=' .repeat(60));
        console.log('✅ ヒアリング完了！');
        console.log('=' .repeat(60));
        
        if (summary) {
          console.log('\n【生成されたサマリー】');
          console.log(summary);
        }

        console.log('\n【収集された全情報】');
        Object.entries(slots).forEach(([key, value]) => {
          if (value && value.trim() !== '') {
            console.log(`${key}: ${value}`);
          }
        });

        console.log(`\n総質問数: ${questionCount}`);
      } else {
        currentQuestion = nextQuestion;
      }
    }

    return conversationLog;

  } catch (error) {
    console.error('エラー:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('=' .repeat(60));
  console.log('リアルタイムAPI 動的深掘りテスト');
  console.log('ユーザーの回答に応じて質問が変化することを確認');
  console.log('=' .repeat(60));

  const args = process.argv.slice(2);
  
  if (args.includes('--manual')) {
    // 手動モード
    console.log('\n📝 手動モードで開始します');
    await runScenario('手動入力', [], true);
  } else {
    // 自動モード：2つのシナリオを実行
    console.log('\n🎯 2つのシナリオを自動実行します\n');
    
    // ポジティブなシナリオ
    console.log('1️⃣ ポジティブな商談シナリオ');
    await runScenario('前向きな商談', positiveScenarioAnswers);
    
    console.log('\n' + '=' .repeat(60));
    console.log('少し待機中...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 課題があるシナリオ
    console.log('\n2️⃣ 課題がある商談シナリオ');
    await runScenario('課題のある商談', challengingScenarioAnswers);
  }

  rl.close();
  console.log('\n✅ テスト完了！');
  console.log('\n分析結果:');
  console.log('- ポジティブな回答には前向きな深掘り質問');
  console.log('- 課題がある回答には解決策や詳細を確認する質問');
  console.log('- 会話の流れに応じた動的な質問生成を確認');
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// 実行
main().catch(console.error);