const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// AIヒアリング用の質問生成
const HEARING_QUESTIONS = [
  "お疲れ様です。今日はどんな商談がありましたか？",
  "どちらのお客様とお会いしましたか？",
  "どのような案件についてお話しされましたか？",
  "次のアクションは何になりますか？",
  "何か課題や懸念事項はありましたか？"
];

// 必須スロット
const REQUIRED_SLOTS = [
  'customer',
  'project', 
  'next_action',
  'budget',
  'schedule',
  'participants',
  'location',
  'issues'
];

// 任意スロット（関係構築に役立つ情報）
const OPTIONAL_SLOTS = [
  'personal_info',
  'relationship_notes'
];

// AIヒアリングセッション開始
router.post('/hearing/start', authMiddleware, async (req, res) => {
  try {
    // 初回の質問を返す
    res.json({
      sessionId: Date.now().toString(),
      question: HEARING_QUESTIONS[0],
      questionIndex: 0,
      totalQuestions: HEARING_QUESTIONS.length
    });
  } catch (error) {
    console.error('Start hearing error:', error);
    res.status(500).json({ error: 'AIヒアリングの開始に失敗しました' });
  }
});

// AIヒアリング回答処理
router.post('/hearing/answer', authMiddleware, async (req, res) => {
  try {
    const { sessionId, questionIndex, answer, currentSlots = {}, askedQuestions = [] } = req.body;

    // 回答からスロット情報を動的に抽出
    const updatedSlots = { ...currentSlots };
    
    // AIを使ってスロット情報を抽出
    const extractedInfo = await extractInformationWithAI(answer, updatedSlots);
    
    // 抽出された情報をスロットに追加
    Object.keys(extractedInfo).forEach(key => {
      if (extractedInfo[key] && !updatedSlots[key]) {
        updatedSlots[key] = extractedInfo[key];
      }
    });
    
    // 最初の質問の回答は要約として保存
    if (questionIndex === 0) {
      updatedSlots.summary = answer;
    }

    // 次の質問を動的に決定（質問履歴も渡す）
    const { nextQuestion, isComplete } = await determineNextQuestionWithAI(questionIndex, updatedSlots, answer, askedQuestions);
    
    if (isComplete) {
      // ヒアリング完了
      return res.json({
        sessionId,
        completed: true,
        slots: updatedSlots,
        message: "ヒアリングが完了しました。お疲れ様でした！"
      });
    }

    // 新しい質問を履歴に追加
    const updatedAskedQuestions = [...askedQuestions, nextQuestion];
    
    // 次の質問を返す
    res.json({
      sessionId,
      question: nextQuestion,
      questionIndex: questionIndex + 1,
      totalQuestions: 5, // 動的に変わるため固定値
      slots: updatedSlots,
      askedQuestions: updatedAskedQuestions
    });
  } catch (error) {
    console.error('Process answer error:', error);
    res.status(500).json({ error: '回答の処理に失敗しました' });
  }
});

// 回答から情報を抽出
function extractInformationFromAnswer(answer) {
  const extracted = {};
  
  // 顧客名の抽出（「建設」「コーポレーション」「株式会社」などが含まれる場合）
  const customerPatterns = [
    /(株式会社[\u4e00-\u9fa5]+|（株）[\u4e00-\u9fa5]+|[\u4e00-\u9fa5]+株式会社)/,
    /([\u4e00-\u9fa5]+(建設|工務|工業|産業|商事|物産|不動産|ハウス|ホーム|電気|設備))/,
    /([\u4e00-\u9fa5]+コーポレーション)/
  ];
  
  for (const pattern of customerPatterns) {
    const match = answer.match(pattern);
    if (match) {
      extracted.customer = match[0];
      break;
    }
  }
  
  // プロジェクト/案件情報の抽出（複数対応）
  const projectPatterns = [
    /([\u4e00-\u9fa5]+(システム|AI|ツール|アプリ|ソフト))/g,
    /(日影計算|BIM|CAD|設計|建築)/g,
    /([^。、]*?(導入|開発|構築|設計)[^。、]*)/g
  ];
  
  const projects = [];
  for (const pattern of projectPatterns) {
    const matches = [...answer.matchAll(pattern)];
    for (const match of matches) {
      const project = match[0].trim();
      if (project && !projects.some(p => p.includes(project) || project.includes(p))) {
        projects.push(project);
      }
    }
  }
  
  if (projects.length > 0) {
    extracted.project = projects;
  }
  
  // 予算情報の抽出
  const budgetPatterns = [
    /(約?[\d,]+億円?)/,
    /(約?[\d,]+千万円?)/,
    /(約?[\d,]+万円?)/,
    /(\$[\d,]+)/,
    /(予算|金額|費用|コスト)[^。、]*?(約?[\d,]+万?千?円|￥[\d,]+|億|千万)/
  ];
  
  for (const pattern of budgetPatterns) {
    const match = answer.match(pattern);
    if (match) {
      extracted.budget = match[1] || match[0];
      break;
    }
  }
  
  // スケジュール情報の抽出
  const schedulePatterns = [
    /(\d+ヶ月[ぐ程度]*)/,
    /(\d+週間[ぐ程度]*)/,
    /(\d+日[以内程度]*)/, 
    /(来月|来年|今年|\d+月|\d+年|\d+日以内)[^。、]*?(着工|完成|納期|予定|開始|提出)/,
    /(スケジュール|納期)[^。、]*?(\d+[ヶ週日月年]+)/
  ];
  
  for (const pattern of schedulePatterns) {
    const match = answer.match(pattern);
    if (match) {
      extracted.schedule = match[1] || match[0];
      break;
    }
  }
  
  // 参加者情報の抽出
  const participantPattern = /(部長|課長|主任|担当|マネージャー|社長|専務)[^。、]*?([さん|様|氏]?)/;
  const participantMatch = answer.match(participantPattern);
  if (participantMatch) {
    // 単一の参加者でも配列形式で保存（PostgreSQL TEXT[]用）
    extracted.participants = [participantMatch[0]];
  }
  
  // 場所情報の抽出
  const locationPattern = /(本社|支社|事務所|現場|会議室|オフィス)[^。、]*?/;
  const locationMatch = answer.match(locationPattern);
  if (locationMatch) {
    extracted.location = locationMatch[0];
  }
  
  // 課題・問題の抽出（複数対応）
  const issuePatterns = [
    /([^。、]*?(課題|問題|懸念|リスク|困って|難しい)[^。、]*)/g,
    /([^。、]*?(コスト|費用|時間|人手|効率)[^。、]*?(かかって|不足|課題|問題)[^。、]*)/g
  ];
  
  const issues = [];
  for (const pattern of issuePatterns) {
    const matches = [...answer.matchAll(pattern)];
    for (const match of matches) {
      const issue = match[1] || match[0];
      if (issue && !issues.some(i => i.includes(issue) || issue.includes(i))) {
        issues.push(issue.trim());
      }
    }
  }
  
  if (issues.length > 0) {
    extracted.issues = issues;
  }
  
  // 参加者の抽出
  const participantsPatterns = [
    /([^。、]*様[^。、]*と[^。、]*様[^。、]*)/,  // 〜様と〜様
    /参加者[は：:]\s*([^。、]+)/,
    /((?:[^、。]+(?:様|さん|氏|部長|課長|社長|専務|常務|取締役|マネージャー|リーダー|主任|係長)(?:、|と|・)*)+)/,
    /出席者[は：:]\s*([^。、]+)/,
    /([^。、]*[がも](?:同席|参加|出席)[^。、]*)/
  ];
  
  for (const pattern of participantsPatterns) {
    const match = answer.match(pattern);
    if (match) {
      const participantText = match[1] || match[0];
      // 参加者の文字列を配列に変換（PostgreSQL TEXT[]用）
      const participants = participantText.split(/[、,と・]/).map(p => p.trim()).filter(p => p.length > 0);
      extracted.participants = participants;
      break;
    }
  }
  
  // 次のアクションの抽出（複数対応）
  const actionKeywords = ['提案', '見積', '資料', '打ち合わせ', '検討', '確認', '連絡', '相談', '進める', 'NDA', '締結', '送ってもらう', '決まり', 'アポ', 'アポイント', '面談', '電話', '送る', '作成', '準備', '持参'];
  const actions = [];
  
  for (const keyword of actionKeywords) {
    if (answer.includes(keyword)) {
      const actionPattern = new RegExp(`[^。、]*${keyword}[^。、]*`, 'g');
      const matches = [...answer.matchAll(actionPattern)];
      for (const match of matches) {
        const action = match[0].trim();
        if (action && !actions.some(a => a.includes(action) || action.includes(a))) {
          actions.push(action);
        }
      }
    }
  }
  
  if (actions.length > 0) {
    extracted.next_action = actions;
  }
  
  // 「〜することになりました」「〜予定です」などの表現も抽出
  const actionExpressionPatterns = [
    /([^。、]*?(ことになりました|予定です|することになり|決まりました)[^。、]*)/g,
    /([^。、]*?(次回までに|来週までに|今度)[^。、]*)/g,
    /([^。、]*?(なきゃいけない|なければならない|する必要がある|しないといけない)[^。、]*)/g,
    /([^。、]*?(取らなきゃ|持参する|送る|作る|準備する)[^。、]*)/g
  ];
  
  for (const pattern of actionExpressionPatterns) {
    const matches = [...answer.matchAll(pattern)];
    for (const match of matches) {
      const action = match[1].trim();
      if (action && (!extracted.next_action || !extracted.next_action.some(a => a.includes(action) || action.includes(a)))) {
        if (!extracted.next_action) extracted.next_action = [];
        extracted.next_action.push(action);
      }
    }
  }
  
  return extracted;
}

// 回答の詳細度を分析（汎用的な指標）
function analyzeAnswerDetail(answer) {
  const detailIndicators = {
    // 文字数で基本的な詳細度を判定
    isDetailed: answer.length > 80,
    isVeryDetailed: answer.length > 150,
    
    // 一般的なビジネスキーワード（建築・技術分野も含む）
    hasBusinessContext: /予算|コスト|費用|価格|金額|効率|時間|人手|課題|問題|目的|目標|システム|技術|AI|建築|設計|計算|導入|自動化|ソフト|プロジェクト|案件/.test(answer),
    hasPersonalDetails: /部長|課長|主任|担当|マネージャー|社長|専務|さん|様/.test(answer),
    hasNextSteps: /提案|見積|資料|検討|導入|次回|来月|来週|スケジュール|予定|打ち合わせ|提出|連絡|相談/.test(answer),
    
    // プロジェクトや技術的な話題があるかどうか
    hasProjectContent: /案件|プロジェクト|システム|技術|AI|建築|設計|計算|ソフト|ツール|業務|作業|開発/.test(answer),
    
    // 文の構造で詳細度を判定
    hasMultipleTopics: (answer.match(/。/g) || []).length >= 2,
    hasSpecificExamples: /例えば|具体的|特に|実際|現在|現在の|最近|今回|今日/.test(answer),
    
    // 商談の具体的な内容があるかどうか
    hasMeetingContent: /商談|話|話し合い|会議|打ち合わせ|相談|説明|提案|質問|回答/.test(answer),
    
    // 情報の実質的な内容の割合
    hasSubstantialContent: function() {
      // フィラーワードや接続詞を除いた実質的な内容の割合
      const fillerPattern = /えっと|あのー|あの|うーん|えー|まあ|まぁ|そのー|その|ですます|でした|けれども|また|ん/g;
      const contentWords = answer.replace(fillerPattern, '').replace(/[、。]/g, '').length;
      return contentWords / answer.length > 0.6;
    }
  };
  
  // hasSubstantialContentを実行
  detailIndicators.hasSubstantialContent = detailIndicators.hasSubstantialContent();
  
  return detailIndicators;
}

// 次の質問を動的に決定
async function determineNextQuestion(currentIndex, slots, lastAnswer, askedQuestions = []) {
  // 回答の詳細度を分析
  const answerDetail = analyzeAnswerDetail(lastAnswer);
  
  console.log('Answer analysis:', answerDetail);
  console.log('Current slots:', slots);
  
  // AIを使って「決まっていない」かどうかを文脈で判断
  const isUndecidedAnswer = await analyzeIfUndecidedAnswer(lastAnswer);
  
  // 不足しているスロットを特定（空の文字列や配列も未定として扱う）
  const missingSlots = REQUIRED_SLOTS.filter(slot => {
    const value = slots[slot];
    if (!value) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  });
  console.log('Missing slots:', missingSlots);
  
  // 「決まっていない」系の回答の場合は、その情報を記録してスキップ
  if (isUndecidedAnswer) {
    console.log('User indicated information is undecided, recording as undecided');
    
    // 現在の質問に対応するスロットに「未定」として記録
    const currentSlotName = getCurrentSlotBeingAsked(currentIndex, slots);
    if (currentSlotName && !slots[currentSlotName]) {
      slots[currentSlotName] = '未定';
    }
    
    // 基本情報があっても他の重要な情報を収集する
    const coreSlots = ['customer', 'project', 'next_action'];
    const missingCoreSlots = coreSlots.filter(slot => !slots[slot]);
    // コアスロットが埋まっていても、他の重要な情報がある場合は続ける
  }
  
  // 必須スロットのうち、まだ聞いていない重要な項目を優先的に質問
  const priorityOrder = ['customer', 'project', 'next_action', 'budget', 'schedule', 'participants', 'location', 'issues'];
  
  for (const slotName of priorityOrder) {
    if (missingSlots.includes(slotName)) {
      // スロットが既に埋まっているかダブルチェック
      const slotValue = slots[slotName];
      const isSlotFilled = slotValue && 
        !(Array.isArray(slotValue) && slotValue.length === 0) && 
        !(typeof slotValue === 'string' && slotValue.trim() === '');
      
      if (isSlotFilled) {
        console.log(`Slot ${slotName} is already filled with:`, slotValue);
        continue;
      }
      
      // スロット別の質問を生成
      const question = generateQuestionForSlot(slotName, slots);
      if (question) {
        // 質問の重複チェック
        const isQuestionSimilar = askedQuestions.some(askedQ => {
          // 質問の類似性をチェック（キーワードベース）
          const questionKeywords = extractQuestionKeywords(question);
          const askedKeywords = extractQuestionKeywords(askedQ);
          return questionKeywords.some(keyword => askedKeywords.includes(keyword));
        });
        
        if (!isQuestionSimilar) {
          console.log(`Generating question for missing slot ${slotName}: ${question}`);
          return {
            nextQuestion: question,
            isComplete: false
          };
        } else {
          console.log(`Skipping similar question for ${slotName}: ${question}`);
          // 類似質問をスキップして次のスロットへ
          continue;
        }
      }
    } else {
      console.log(`Slot ${slotName} is already filled, skipping`);
    }
  }
  
  // 重要なスロットがすべて埋まっている場合にのみ完了を検討
  const essentialSlots = ['customer', 'project', 'next_action', 'budget', 'schedule', 'participants', 'location'];
  const missingEssentialSlots = essentialSlots.filter(slot => !slots[slot]);
  
  // 必須情報がすべて埋まり、かつ十分な質問数を行った場合は完了
  if (missingEssentialSlots.length === 0 || (missingEssentialSlots.length <= 2 && currentIndex >= 8)) {
    return { isComplete: true };
  }
  
  // より多くの情報を必須として設定
  const coreSlots = ['customer', 'project'];
  const missingCoreSlots = coreSlots.filter(slot => !slots[slot]);
  const importantSlots = ['customer', 'project', 'next_action', 'budget', 'schedule'];
  const missingImportantSlots = importantSlots.filter(slot => !slots[slot]);
  
  // 質問数が多すぎる場合は強制完了
  if (currentIndex >= 12) { // 質問の上限を12に増やす
    return { isComplete: true };
  }
  
  // フォールバック: 特定のスロットに焦点を当てた質問
  if (missingSlots.includes('budget')) {
    return {
      nextQuestion: "今回の商談で予算や費用に関する話は出ましたか？",
      isComplete: false
    };
  }
  
  if (missingSlots.includes('schedule')) {
    return {
      nextQuestion: "プロジェクトの時期やスケジュールについて何かお聞きしましたか？",
      isComplete: false
    };
  }
  
  if (missingSlots.includes('participants')) {
    return {
      nextQuestion: "お客様側からは何名の方が参加されていましたか？",
      isComplete: false
    };
  }
  
  if (missingSlots.includes('location')) {
    return {
      nextQuestion: "商談はお客様のオフィスで行われましたか？",
      isComplete: false
    };
  }
  
  if (missingSlots.includes('issues')) {
    return {
      nextQuestion: "お客様が抱えている課題や困りごとはありましたか？",
      isComplete: false
    };
  }
  
  // 最終的なフォールバック
  return {
    nextQuestion: "今回の商談で特に印象に残ったことがあれば教えてください。",
    isComplete: false
  };
}

// スロット別の質問を生成
function generateQuestionForSlot(slotName, existingSlots) {
  const customerName = existingSlots.customer || 'お客様';
  
  switch (slotName) {
    case 'customer':
      return "どちらのお客様とお会いしましたか？";
    
    case 'project':
      return `${customerName}との商談では、どのような案件やプロジェクトについてお話されましたか？`;
    
    case 'next_action':
      return "今回の商談を受けて、次に何をする予定になりましたか？";
    
    case 'budget':
      return "予算や金額についてのお話はありましたか？";
    
    case 'schedule':
      return "スケジュールや納期についてはいかがでしたか？";
    
    case 'participants':
      return `${customerName}からは、どなたが参加されていましたか？`;
    
    case 'location':
      return "商談はどちらで行われましたか？";
    
    case 'issues':
      return "何か課題や懸念事項、解決したい問題などはありましたか？";
    
    default:
      return null;
  }
}

// 質問からキーワードを抽出（類似性チェック用）
function extractQuestionKeywords(question) {
  const keywords = [];
  
  // 質問タイプ別のキーワード抽出
  if (question.includes('顧客') || question.includes('お客様')) keywords.push('customer');
  if (question.includes('案件') || question.includes('プロジェクト')) keywords.push('project');
  if (question.includes('次の') || question.includes('アクション') || question.includes('今後')) keywords.push('next_action');
  if (question.includes('予算') || question.includes('費用') || question.includes('金額')) keywords.push('budget');
  if (question.includes('スケジュール') || question.includes('期間') || question.includes('いつ')) keywords.push('schedule');
  if (question.includes('参加') || question.includes('出席') || question.includes('同席')) keywords.push('participants');
  if (question.includes('場所') || question.includes('どこ') || question.includes('会場')) keywords.push('location');
  if (question.includes('課題') || question.includes('問題') || question.includes('懸念')) keywords.push('issues');
  
  return keywords;
}

// 現在の質問に対応するスロット名を取得
function getCurrentSlotBeingAsked(currentIndex, slots) {
  // 質問の順序に基づいてスロットを特定
  const priorityOrder = ['customer', 'project', 'next_action', 'budget', 'schedule', 'participants', 'location', 'issues'];
  const missingSlots = priorityOrder.filter(slot => !slots[slot]);
  
  // 現在の質問がnext_actionに関する質問で、すでにnext_actionが抽出されている場合は次に進む
  if (missingSlots.length > 0) {
    const nextSlot = missingSlots[0];
    if (nextSlot === 'next_action' && slots.next_action) {
      // next_actionが既に埋まっている場合、次のスロットを返す
      return missingSlots[1] || null;
    }
    return nextSlot;
  }
  
  return null;
}

// AIを使ってスロット情報を抽出する新しい関数
async function extractInformationWithAI(answer, currentSlots) {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    if (!endpoint || !apiKey || !deploymentName) {
      console.log('Azure OpenAI not configured, using fallback extraction');
      return extractInformationFromAnswer(answer);
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `あなたは営業日報作成支援AIです。ユーザーの回答から重要な情報を抽出し、日報として適切な形に要約・構造化してJSON形式で返してください。

抽出する情報：
- customer: 顧客名・会社名（「大成建設」「ABC株式会社」「田中さん」「山田部長」など、会社名や個人名を抽出）
- project: 案件名・プロジェクト内容（「AIと建築」「在庫管理システム」「新社屋建設」など、商談内容を簡潔に要約）
- next_action: 次のアクション・やるべきこと（「見積もり作成」「提案書準備」「次回会議設定」など、営業担当者の未来の行動のみ）
- budget: 予算・金額（「1000万円」「年間500万」「月額10万」「予算は未定」など、金額に関する情報）
- schedule: スケジュール・納期・期間（「来月まで」「3月着工」「年度内」「2025年4月から」など、時期に関する情報）
- participants: 参加者・出席者（「山田部長」「田中さん」「先方3名」など、商談参加者の名前や人数）
- location: 場所・会場（「新宿」「渋谷」「お客様オフィス」「弊社会議室」「〇〇ビル」など、商談場所）
- issues: 課題・問題・懸念事項（「人手不足」「コスト削減が課題」「システム老朽化」など、顧客の抱える問題）
- personal_info: 顧客の個人情報・趣味（「ゴルフが趣味」「釣りが好き」「コーヒー好き」など、関係構築に役立つ個人的な情報）
- relationship_notes: 関係構築メモ（「ゴルフの話で盛り上がった」「共通の知人がいた」「同じ大学出身」など、雑談や関係構築の内容）

既に判明している情報：
${JSON.stringify(currentSlots, null, 2)}

重要な処理ルール：
1. **既に判明している情報**がある場合、その項目は抽出せず空にしてください（上書きしない）
2. 長い説明は重要なポイントを抽出して簡潔に要約してください
3. 日報として読みやすい自然な文章に変換してください
4. 「〜と話していました」「〜と言っていました」などの冗長な表現は削除してください
5. 過去の行動（「話しました」「説明しました」）は抽出しないでください
6. **next_actionは営業担当者が今後行う具体的な行動のみ**を抽出してください
7. 顧客の要望（「〜したいと言っていました」「〜が欲しいと話していました」）はnext_actionに含めないでください
8. **課題・懸念事項・問題点の抽出方法**：
   文章を注意深く読み、以下の観点で問題となる要素を特定してください：
   - 現在困っていること、悩んでいること
   - 解決したい問題、改善したい状況
   - 不足している要素、欠けているもの
   - リスクや懸念材料、心配事
   - 制約や障害、ボトルネック
   - 難しいと感じていること、うまくいかないこと
   
9. **抽出の判断基準**：
   - ネガティブな状況や困りごとを表現している部分
   - 「〜できない」「〜がない」「〜が足りない」などの否定表現
   - 問題や課題を示唆する文脈
   - 解決や改善の必要性を示している部分
   
10. **抽出時の注意点**：
   - 文脈から問題の本質を理解し、簡潔にまとめる
   - 複数の課題が含まれている場合は、それぞれを分けて抽出する
   - 業界や技術を問わず、あらゆる種類の課題を見逃さない
11. **全てのスロットを必ず確認し、情報があれば抽出してください**：特にlocation, participants, budget, schedule, issuesは見落としがちなので注意

next_actionの判定基準：
- ✅ 営業担当者の行動：「見積もりを作成する」「提案書を準備する」「次回打ち合わせを設定する」
- ❌ 顧客の要望：「アプリを開発したいと言っていました」「システムが欲しいと話していました」
- ❌ 過去の行動：「提案しました」「説明しました」

抽出の具体例：
- 元：「〇〇会社の△△さんとの商談」→customer: "会社名", participants: ["担当者名"]
- 元：「〜システムの導入について話し合いました」→project: "システム導入案件"
- 元：「見積もりを作成して提出する予定です」→next_action: ["見積もり作成・提出"]
- 元：「予算は〜万円程度を想定」→budget: "予算額"
- 元：「〜月までに完成させたい」→schedule: "納期・期限"
- 元：「〜で打ち合わせを行いました」→location: "場所"
- 元：「〜が課題となっています」→issues: ["具体的な課題内容"]
- 元：「〜が不足している」「〜が足りない」→issues: ["リソース不足系の課題"]
- 元：「把握できていない」「分からない」→issues: ["情報・理解不足系の課題"]  
- 元：「ボトルネック」「制約がある」→issues: ["制約・障害系の課題"]
- 元：「心配」「懸念」「不安」→issues: ["リスク・懸念系の課題"]
- 元：「〜さんは〇〇が好き」「〜が趣味」→personal_info: ["趣味・嗜好に関する情報"]
- 元：「〇〇の話で盛り上がった」「共通点がある」→relationship_notes: ["関係構築に関するメモ"]

回答形式：
{
  "customer": "会社名",
  "project": "案件内容（要約）",
  "next_action": ["具体的なアクション"],
  "budget": "予算額",
  "schedule": "期間・納期",
  "participants": ["参加者"],
  "location": "場所",
  "issues": ["課題（要約）"],
  "personal_info": ["個人的な情報・趣味"],
  "relationship_notes": ["関係構築メモ"]
}`
          },
          {
            role: 'user',
            content: `以下の回答から情報を抽出してください：\n\n"${answer}"`
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );

    const extractedText = response.data.choices[0].message.content.trim();
    console.log('AI extraction result:', extractedText);
    
    // JSONとしてパース
    try {
      // コードブロックを除去してJSONのみ抽出
      const jsonMatch = extractedText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                       extractedText.match(/(\{[\s\S]*?\})/);
      
      const jsonText = jsonMatch ? jsonMatch[1] : extractedText;
      const extracted = JSON.parse(jsonText);
      
      // 空の値をフィルタリング＆データ型を正規化
      const filtered = {};
      Object.keys(extracted).forEach(key => {
        const value = extracted[key];
        if (value && value !== '' && value !== null) {
          // 特定のフィールドは文字列として格納すべき
          const stringFields = ['customer', 'project', 'budget', 'schedule', 'location'];
          
          if (stringFields.includes(key)) {
            // 配列の場合は最初の要素を取得、文字列はそのまま
            if (Array.isArray(value) && value.length > 0) {
              filtered[key] = String(value[0]);
            } else if (!Array.isArray(value)) {
              filtered[key] = String(value);
            }
          } else {
            // その他のフィールド（配列として格納すべきもの）
            if (Array.isArray(value) && value.length > 0) {
              filtered[key] = value;
            } else if (!Array.isArray(value)) {
              filtered[key] = value;
            }
          }
        }
      });
      
      return filtered;
      
    } catch (parseError) {
      console.error('Failed to parse AI extraction result:', parseError);
      return extractInformationFromAnswer(answer);
    }
    
  } catch (error) {
    console.error('Error in AI information extraction:', error.message);
    // エラーの場合は既存の関数にフォールバック
    return extractInformationFromAnswer(answer);
  }
}

// AIを使って次の質問を決定する新しい関数
async function determineNextQuestionWithAI(currentIndex, slots, lastAnswer, askedQuestions = []) {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    if (!endpoint || !apiKey || !deploymentName) {
      console.log('Azure OpenAI not configured, using fallback question determination');
      return await determineNextQuestion(currentIndex, slots, lastAnswer, askedQuestions);
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    // スロットの埋まり具合を分析
    const missingSlots = REQUIRED_SLOTS.filter(slot => !slots[slot]);
    
    // 過去の行動と未来のアクションを区別する分析を追加
    const actionAnalysis = await analyzeActionType(lastAnswer);
    
    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `あなたは営業日報作成のヒアリング専門AIです。現在の状況を分析して、次の質問を決定してください。

必要な情報項目：
- customer: 顧客名・会社名
- project: 案件名・プロジェクト内容
- next_action: 次のアクション・やるべきこと（未来の行動のみ）
- budget: 予算・金額
- schedule: スケジュール・納期
- participants: 参加者・出席者
- location: 場所・会場
- issues: 課題・懸念事項

重要な判断基準：
1. next_actionは「営業担当者が今後やるべき具体的な行動」のみ。過去に行ったことや顧客の要望は含まない
2. ユーザーが過去の行動（「提案しました」「説明しました」など）を答えた場合は、「それを受けて次に何をする予定ですか？」と追加質問する
3. 顧客の要望（「〜したいと言っていました」）が回答された場合も、「その要望を受けて、あなたが次に何をする予定ですか？」と追加質問する
4. 未入力の項目があれば、最も重要な項目から質問する
5. ユーザーが「決まっていない」「未定」「わからない」と答えた場合は、その項目をスキップして次に進む
6. **next_actionが空の場合は、必ず追加質問して営業アクションを確認する**
7. 基本情報（customer, project, next_action）が揃えば、他の項目が未定でも完了可能
8. 質問が5回を超えた場合は完了とする
9. 既に聞いた質問と似た内容は避ける

特別な処理：
- 過去の行動が回答された場合：「その提案を受けて、次に何をする予定になりましたか？」
- 顧客の要望が回答された場合：「そのご要望を受けて、あなたが次に取るアクションは何ですか？」
- next_actionが見つからない場合：「今回の商談を受けて、次に何をする予定になりましたか？」

回答形式（JSON）：
{
  "isComplete": true/false,
  "nextQuestion": "質問文（完了の場合は不要）",
  "reason": "判断理由",
  "needsFollowUp": true/false
}`
          },
          {
            role: 'user',
            content: `現在の状況：
質問回数: ${currentIndex + 1}
最新の回答: "${lastAnswer}"

アクション分析結果：
${JSON.stringify(actionAnalysis, null, 2)}

現在判明している情報：
${JSON.stringify(slots, null, 2)}

未入力の項目：
${missingSlots.join(', ')}

これまでの質問履歴：
${askedQuestions.join('\n')}

次の質問を決定してください。`
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );

    const resultText = response.data.choices[0].message.content.trim();
    console.log('AI question determination result:', resultText);
    
    try {
      const result = JSON.parse(resultText);
      
      return {
        isComplete: result.isComplete,
        nextQuestion: result.nextQuestion || null,
        needsFollowUp: result.needsFollowUp || false
      };
      
    } catch (parseError) {
      console.error('Failed to parse AI question determination result:', parseError);
      return await determineNextQuestion(currentIndex, slots, lastAnswer, askedQuestions);
    }
    
  } catch (error) {
    console.error('Error in AI question determination:', error.message);
    // エラーの場合は既存の関数にフォールバック
    return await determineNextQuestion(currentIndex, slots, lastAnswer, askedQuestions);
  }
}

// 過去の行動と未来のアクションを区別する分析関数
async function analyzeActionType(answer) {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    if (!endpoint || !apiKey || !deploymentName) {
      console.log('Azure OpenAI not configured, using simple action analysis');
      return {
        isPastAction: /しました|行いました|提案しました|説明しました|話しました|伝えました/.test(answer),
        isFutureAction: /する予定|します|予定です|することになりました|する必要があります/.test(answer),
        actionType: 'unknown'
      };
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `以下の回答を分析して、過去の行動か未来のアクションかを判定してください。

判定基準：
- 過去の行動：既に実行された行動（「提案しました」「説明しました」「話しました」など）
- 未来のアクション：これから行う予定の行動（「見積もりを作成します」「資料を送付する予定です」など）
- 現状報告：現在の状況説明（「検討中です」「決まっていません」など）

回答形式（JSON）：
{
  "isPastAction": true/false,
  "isFutureAction": true/false,
  "actionType": "past/future/status/mixed",
  "extractedActions": ["行動1", "行動2"],
  "needsNextActionQuestion": true/false
}`
          },
          {
            role: 'user',
            content: `回答を分析してください：\n\n"${answer}"`
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );

    const resultText = response.data.choices[0].message.content.trim();
    console.log('Action type analysis result:', resultText);
    
    try {
      // コードブロックを除去してJSONのみ抽出
      const jsonMatch = resultText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                       resultText.match(/(\{[\s\S]*?\})/);
      
      const jsonText = jsonMatch ? jsonMatch[1] : resultText;
      return JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse action analysis result:', parseError);
      return {
        isPastAction: /しました|行いました|提案しました|説明しました|話しました|伝えました/.test(answer),
        isFutureAction: /する予定|します|予定です|することになりました|する必要があります/.test(answer),
        actionType: 'unknown',
        needsNextActionQuestion: /しました|行いました/.test(answer)
      };
    }
    
  } catch (error) {
    console.error('Error in action type analysis:', error.message);
    return {
      isPastAction: /しました|行いました|提案しました|説明しました|話しました|伝えました/.test(answer),
      isFutureAction: /する予定|します|予定です|することになりました|する必要があります/.test(answer),
      actionType: 'unknown',
      needsNextActionQuestion: /しました|行いました/.test(answer)
    };
  }
}

// AIを使って回答が「決まっていない」系かどうかを判断
async function analyzeIfUndecidedAnswer(answer) {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    if (!endpoint || !apiKey || !deploymentName) {
      console.log('Azure OpenAI not configured, using simple check');
      return /決まっていない|未定|わからない|不明|まだ|検討中/.test(answer);
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `以下の回答を分析して、ユーザーが「その情報は決まっていない」「未定」「わからない」という意味で回答しているかどうかを判断してください。
            
判断基準：
- 情報が確定していない、決まっていない
- まだ検討段階、相談中
- 詳細は不明、わからない
- 具体的なことは言えない
- 今の段階では何も決まっていない

回答は "YES" または "NO" のみで答えてください。`
          },
          {
            role: 'user',
            content: `回答: "${answer}"`
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );

    const result = response.data.choices[0].message.content.trim().toUpperCase();
    console.log('AI undecided analysis:', { answer: answer.substring(0, 50), result });
    return result === 'YES';
    
  } catch (error) {
    console.error('Error analyzing undecided answer:', error.message);
    // エラーの場合は簡易チェックにフォールバック
    return /決まっていない|未定|わからない|不明|まだ|検討中/.test(answer);
  }
}

// 音声認識テキストの補正
router.post('/correct-text', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    console.log('Correction request received:', { text });
    
    if (!text || text.trim() === '') {
      return res.json({ correctedText: text });
    }

    // Azure OpenAI APIの設定
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    console.log('Azure OpenAI config:', { 
      hasEndpoint: !!endpoint, 
      hasApiKey: !!apiKey, 
      hasDeploymentName: !!deploymentName 
    });

    if (!endpoint || !apiKey || !deploymentName) {
      console.log('Azure OpenAI not configured, using simple correction');
      
      // 簡易的な補正を実施
      let corrected = text;
      
      // フィラーの除去（より幅広く対応）
      corrected = corrected.replace(/(えっと|えーと|あのー|あの|うーん|えー|ええっと|まあ|まぁ|そのー|その|ええと|えと|んーと|なんか|ちょっと)/g, '');
      
      // 重複する言葉の削除
      corrected = corrected.replace(/(です){2,}/g, 'です');
      corrected = corrected.replace(/(ます){2,}/g, 'ます');
      corrected = corrected.replace(/(ました){2,}/g, 'ました');
      
      // 句読点の追加ロジックを改善
      // 「ました」「です」「ます」の後に句点を追加
      corrected = corrected.replace(/(ました|でした)(?!。|、|！|？)/g, '$1。');
      corrected = corrected.replace(/(です|ます)(?!。|、|！|？|が|けれど|し)/g, '$1。');
      
      // 「がありました」の後に句点
      corrected = corrected.replace(/がありました(?!。|、)/g, 'がありました。');
      
      // 「ですね」「ですよ」の後に句点
      corrected = corrected.replace(/(ですね|ですよ)(?!。|、)/g, '$1。');
      
      // 重複する句読点の除去
      corrected = corrected.replace(/、{2,}/g, '、');
      corrected = corrected.replace(/。{2,}/g, '。');
      
      // スペースの整理
      corrected = corrected.replace(/\s+/g, ' ').trim();
      
      // 最後に句点がない場合は追加
      if (!corrected.endsWith('。') && !corrected.endsWith('！') && !corrected.endsWith('？')) {
        corrected += '。';
      }
      
      // 連続するスペースを削除
      corrected = corrected.replace(/\s{2,}/g, ' ');
      
      // 句点の後にスペースがない場合は追加
      corrected = corrected.replace(/。(?!\s|$)/g, '。 ');
      
      console.log('Simple correction applied:', { 
        original: text.substring(0, 50), 
        corrected: corrected.substring(0, 50) 
      });
      
      return res.json({ correctedText: corrected });
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    console.log('Calling Azure OpenAI:', { endpoint: endpoint.substring(0, 30) + '...', deploymentName });

    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `あなたは音声認識の結果を補正する専門家です。以下のルールに従って、音声認識テキストを自然で読みやすい文章に補正してください：
1. 句読点を適切に追加する
2. 「えっと」「あのー」などのフィラー（つなぎ言葉）を除去する
3. 重複した言葉を整理する
4. 話し言葉を書き言葉に変換する（例：「です、ます」調に統一）
5. 誤認識されやすい単語を文脈から推測して修正する
6. 数字は半角に統一する
7. 建築・営業用語は適切な表記に修正する

重要：
- 元の意味を変えずに、読みやすく整理することが目的です
- 補正後のテキストのみを返してください
- 「以下のように補正しました」などの説明文は不要です
- 「---」などの区切り線も不要です
- 「以上です」などの終了文も不要です`
          },
          {
            role: 'user',
            content: `以下の文章を読みやすく補正してください。補正した文章のみを返してください。\n\n${text}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );

    const correctedText = response.data.choices[0].message.content.trim();
    console.log('Correction successful:', { original: text.substring(0, 50), corrected: correctedText.substring(0, 50) });
    res.json({ correctedText });

  } catch (error) {
    console.error('Text correction error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config?.data
    });
    // エラーの場合は元のテキストを返す
    res.json({ correctedText: req.body.text });
  }
});

module.exports = router;