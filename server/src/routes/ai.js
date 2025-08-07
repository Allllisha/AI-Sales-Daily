const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');
const crypto = require('crypto');
const { redisWrapper } = require('../services/redis');

const router = express.Router();

// Redisキャッシュのプレフィックスとタイムアウト
const PRELOAD_CACHE_PREFIX = 'preload:';
const CACHE_TTL = 30 * 60; // 30分（秒単位）

// AIヒアリング用の質問生成（ビジネスマナーを保ちつつ親しみやすい）
const HEARING_QUESTIONS = [
  "お疲れ様でした。本日の商談はいかがでしたか？",
  "それは良いですね。キーパーソンの反応や、最も重要な意思決定者の様子はいかがでしたか？",
  "なるほど。商談中、特に先方の関心が高まった場面はありましたか？",
  "予算についてお話された際、先方の反応はどうでしたか？",
  "他社様との比較検討状況について、何かお話はありましたか？",
  "商談の雰囲気が変わった瞬間や、空気感が変化したタイミングはありましたか？",
  "先方が身を乗り出して聞いていた部分や、特に興味を示された機能はどこでしたか？",
  "率直なところ、今回の案件の成約可能性は何％くらいだと感じましたか？"
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

// 任意スロット（関係構築や感覚値情報）
const OPTIONAL_SLOTS = [
  'personal_info',        // 個人的な情報・趣味
  'relationship_notes',   // 関係構築メモ
  'key_person_reaction',  // キーマンの反応・温度感
  'positive_points',      // 先方が興味を持った点・前のめりになった瞬間
  'atmosphere_change',    // 雰囲気が変わった瞬間・転換点
  'competitor_info',      // 競合情報・比較検討状況
  'decision_timeline',    // 意思決定のタイミング
  'enthusiasm_level',     // 先方の熱意度（高/中/低）
  'budget_reaction',      // 予算への反応（前向き/渋い/余裕あり）
  'decision_makers',      // 決定権者・キーマン情報
  'concerns_mood',        // 懸念事項の雰囲気・温度感
  'next_step_mood',       // 次ステップへの温度感・確度
  'strongest_interest',   // 最も興味を示した機能・特徴
  'body_language',        // ボディランゲージ・身を乗り出した瞬間
  'closing_possibility',  // 成約可能性の率直な感覚（%）
  'differentiation',      // 他社と比べた優位性・評価された点
  'hidden_concerns',      // 言葉にはしないが感じた隠れた懸念
  'stakeholder_dynamics', // 参加者間の力関係・意見の相違
  'unexpected_insights',  // 商談で予想外だった発見・気づき
  'action_commitment'     // 次のアクションへのコミットメント度
];

// 初回の質問を動的に生成
async function generateInitialQuestion() {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    if (!endpoint || !apiKey || !deploymentName) {
      // AIが使えない場合のフォールバック
      const fallbackQuestions = [
        "お疲れ様でした。本日の商談はいかがでしたか？",
        "本日はどのような商談がございましたか？",
        "今日の営業活動はいかがでしたか？手応えはありましたか？",
        "本日の訪問について、お聞かせください。"
      ];
      return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    // 現在の時間帯を取得
    const hour = new Date().getHours();
    const timeContext = hour < 12 ? "午前" : hour < 17 ? "午後" : "夕方";
    
    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `あなたは営業部の経験豊富な上司です。部下が商談から戻ってきたところです。
時間帯は${timeContext}です。ビジネスマナーを保ちながら、親しみやすい雰囲気で最初の声かけをしてください。

【重要な指示】
- 必ず敬語を使用する（です・ます調）
- 最大5回の質問で完了するため、初回は基本情報を包括的に聞く
- 「お疲れ様でした」から始めて、親しみやすい雰囲気を作る
- 会社名、案件内容、商談の手応えなど、複数の基本情報を一度に聞く
- 話しやすい雰囲気で、部下の感覚と事実の両方を引き出す

良い例：
- お疲れ様でした！今日はどちらの会社とどのような商談でしたか？商談の概要と手応えを教えてください。
- 商談お疲れ様です。どちらの会社と何の案件で話されましたか？今日の成果も含めて教えてください。
- お疲れ様でした。訪問先と商談内容、そして今日の主な話題を教えてください。
- 今日の商談について、会社名・案件・主な成果を教えてください。

悪い例（初回としては情報収集が不十分）：
- 今日はどうでしたか？
- 商談の雰囲気はどうでしたか？
- 何時から何時まででしたか？

回答は質問文のみを返してください。引用符は付けないでください。`
          },
          {
            role: 'user',
            content: '営業担当者が戻ってきました。最初の声かけをお願いします。'
          }
        ],
        max_tokens: 100,
        temperature: 0.8  // バリエーションを増やすため高めに設定
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );

    // 引用符を除去
    let question = response.data.choices[0].message.content.trim();
    question = question.replace(/^["']|["']$/g, '').replace(/^「|」$/g, '');
    return question;
    
  } catch (error) {
    console.error('Error generating initial question:', error.message);
    // エラー時のフォールバック
    return "お疲れ様でした。本日の商談はいかがでしたか？";
  }
}

// 言語検出関数
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'ja';
  
  // 英語の特徴的なパターン
  const englishPatterns = /[a-zA-Z]{3,}/g;
  const japanesePatterns = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;
  
  const englishMatches = (text.match(englishPatterns) || []).length;
  const japaneseMatches = (text.match(japanesePatterns) || []).length;
  
  // 英語の単語が70%以上の場合は英語と判定
  const totalWords = englishMatches + japaneseMatches;
  if (totalWords > 0 && englishMatches / totalWords > 0.7) {
    return 'en';
  }
  
  return 'ja';
}

// AIベースの名前抽出関数
async function extractNamesWithAI(text) {
  try {
    // テキストが空または短すぎる場合は空配列を返す
    if (!text || text.trim().length < 10) {
      return [];
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting person names from business text.
Extract ONLY actual person names from the text, not action phrases, company names, job titles, or common words.
IMPORTANT: "Follow up with [name]" means to follow up with a person - extract only the person's name, not "Follow" or "Follow up".
Be very careful not to extract action verbs or phrases as names.
Return only a JSON array of names, nothing else.
Examples:
- "Follow up with Howard Jones about the project" -> ["Howard Jones"]
- "Follow up with Howard (Sample)" -> ["Howard"]
- "Meeting with Carol from Sales and David the manager" -> ["Carol", "David"]
- "Review the Marketing strategy with the team" -> []
- "Schedule a call with Dr. Smith and Ms. Johnson" -> ["Dr. Smith", "Ms. Johnson"]
- "Send email to marketing team" -> []
- "Call John tomorrow" -> ["John"]`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // レスポンスをパース
    const content = response.data.choices[0].message.content.trim();
    try {
      const names = JSON.parse(content);
      if (Array.isArray(names)) {
        // 最大5名まで、かつ妥当な名前のみを返す
        return names
          .filter(name => {
            if (typeof name !== 'string' || name.length < 2 || name.length > 50) {
              return false;
            }
            
            const lowerName = name.toLowerCase();
            
            // 除外すべきパターン
            const excludePatterns = [
              'sample',
              'follow up',
              'follow',
              'send',
              'call',
              'email',
              'schedule',
              'review',
              'update',
              'check'
            ];
            
            // 除外パターンに該当する場合は除外
            for (const pattern of excludePatterns) {
              if (lowerName.includes(pattern)) {
                return false;
              }
            }
            
            // 動詞で始まる場合は除外（一般的な動詞パターン）
            if (/^(follow|send|call|email|schedule|review|update|check|meet|discuss)/i.test(name)) {
              return false;
            }
            
            return true;
          })
          .slice(0, 5);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response for name extraction:', parseError);
    }

    return [];
  } catch (error) {
    console.error('Error in AI-based name extraction:', error.message);
    return [];
  }
}

// AIヒアリングセッション開始
router.post('/hearing/start', authMiddleware, async (req, res) => {
  try {
    const { referenceData = null, dataSource = null, crmType = 'none' } = req.body;
    const sessionId = Date.now().toString();
    
    console.log('===== HEARING START =====');
    console.log('Data source:', dataSource);
    console.log('Reference data customer:', referenceData?.customer);
    console.log('CRM type:', crmType);
    
    // CRMデータから参加者情報を抽出して初期スロットに設定
    let initialSlots = {};
    if (referenceData) {
      // 顧客名を設定
      if (referenceData.customer) {
        initialSlots.customer = referenceData.customer;
      }
      
      // 案件名を設定
      if (referenceData.project) {
        initialSlots.project = referenceData.project;
      }
      
      // 場所を設定
      if (referenceData.location) {
        initialSlots.location = referenceData.location;
      }
      
      // 予算を設定
      if (referenceData.budget) {
        initialSlots.budget = referenceData.budget;
      }
      
      // スケジュールを設定
      if (referenceData.schedule) {
        if (Array.isArray(referenceData.schedule)) {
          // 配列の場合は文字列に変換
          initialSlots.schedule = referenceData.schedule.map(item => {
            if (typeof item === 'object' && item.phase && item.due_date) {
              return `${item.phase}(${item.due_date})`;
            }
            return String(item);
          }).join(', ');
        } else {
          initialSlots.schedule = referenceData.schedule;
        }
      }
      
      // 課題を設定
      if (referenceData.issues) {
        if (Array.isArray(referenceData.issues)) {
          // オブジェクトの配列の場合は文字列に変換
          initialSlots.issues = referenceData.issues.map(item => {
            if (typeof item === 'object' && item !== null) {
              // オブジェクトの場合、issue、description、textフィールドを優先
              return item.issue || item.description || item.text || item.content || String(item);
            }
            return String(item);
          }).join(', ');
        } else {
          initialSlots.issues = referenceData.issues;
        }
      }
      
      // 次のアクションを設定
      if (referenceData.next_action) {
        if (Array.isArray(referenceData.next_action)) {
          // オブジェクトの配列の場合は文字列に変換
          initialSlots.next_action = referenceData.next_action.map(item => {
            if (typeof item === 'object' && item !== null) {
              if (item.task) {
                const parts = [item.task];
                if (item.responsible) parts.push(`担当: ${item.responsible}`);
                if (item.deadline) parts.push(`期限: ${item.deadline}`);
                return parts.join(' ');
              }
              // taskフィールドがない場合、他のフィールドを探す
              return item.action || item.text || item.content || String(item);
            }
            return String(item);
          }).join(', ');
        } else {
          initialSlots.next_action = referenceData.next_action;
        }
      }
      
      // CRMから取得した参加者情報を抽出（拡張版）
      const participantNames = [];
      
      // 1. 直接的な参加者フィールドをチェック
      if (referenceData.participants) {
        if (Array.isArray(referenceData.participants)) {
          participantNames.push(...referenceData.participants);
        } else if (typeof referenceData.participants === 'string') {
          participantNames.push(...referenceData.participants.split(/[,、]/).map(s => s.trim()).filter(s => s));
        }
      }
      
      if (referenceData.customer_participants) {
        if (Array.isArray(referenceData.customer_participants)) {
          participantNames.push(...referenceData.customer_participants.map(p => typeof p === 'string' ? p : p.name));
        } else if (typeof referenceData.customer_participants === 'string') {
          participantNames.push(...referenceData.customer_participants.split(/[,、]/).map(s => s.trim()).filter(s => s));
        }
      }
      
      if (referenceData.vendor_participants) {
        if (Array.isArray(referenceData.vendor_participants)) {
          participantNames.push(...referenceData.vendor_participants.map(p => typeof p === 'string' ? p : p.name));
        } else if (typeof referenceData.vendor_participants === 'string') {
          participantNames.push(...referenceData.vendor_participants.split(/[,、]/).map(s => s.trim()).filter(s => s));
        }
      }
      
      // 2. CRMデータのテキストフィールドから参加者名を抽出
      if (participantNames.length === 0 && 
          (referenceData.meetingContext || referenceData.selectedNotes || 
           referenceData.selectedMeetings ||
           referenceData.description || referenceData.notes)) {
        
        // すべてのテキストフィールドを結合（活動タイトルは除外）
        const contextText = referenceData.meetingContext || '';
        const notesText = referenceData.selectedNotes?.map(n => n.noteText || n.description || '').join(' ') || '';
        // 活動タイトル（selectedActivities）は参加者情報ではないので除外
        const meetingsText = referenceData.selectedMeetings?.map(m => m.description || m.subject || '').join(' ') || '';
        const descriptionText = referenceData.description || '';
        const notesFieldText = referenceData.notes || '';
        
        const allText = `${contextText} ${notesText} ${meetingsText} ${descriptionText} ${notesFieldText}`;
        
        // AIを使った英語名の抽出（活動タイトルは含まない）
        const extractedEnglishNames = await extractNamesWithAI(allText);
        participantNames.push(...extractedEnglishNames);
        
        // 日本語の人名パターン
        const japanesePatterns = [
          // 名前+敬称
          /([\u4e00-\u9fa5]{2,4})[様さん氏]/g,
          // 名前+役職
          /([\u4e00-\u9fa5]{2,4})\s*(?:部長|課長|主任|担当|マネージャー|社長|専務|常務|取締役)/g,
          // 名前+助詞（文脈から人名を推測）
          /([\u4e00-\u9fa5]{2,4})(?:様|さん|氏)(?:が|は|の|と|から|より)/g
        ];
        
        const extractedJapaneseNames = new Set();
        for (const pattern of japanesePatterns) {
          const matches = allText.matchAll(pattern);
          for (const match of matches) {
            const name = match[1];
            if (name.length >= 2 && name.length <= 4) {
              // 敬称付きで追加
              extractedJapaneseNames.add(name + '様');
            }
          }
        }
        
        participantNames.push(...Array.from(extractedJapaneseNames));
      }
      
      // 3. 活動タイトルから担当者名を抽出（"Follow up with Howard"のような形式の場合）
      if (referenceData.selectedActivities && participantNames.length === 0) {
        for (const activity of referenceData.selectedActivities) {
          const activityText = activity.description || activity.subject || '';
          // "Follow up with [name]" パターンから名前だけを抽出
          const followUpPattern = /follow up with\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i;
          const match = activityText.match(followUpPattern);
          if (match) {
            const extractedName = match[1].replace(/\s*\(.*?\)\s*/g, '').trim(); // (Sample)などを除去
            if (extractedName && extractedName.toLowerCase() !== 'sample') {
              participantNames.push(extractedName);
            }
          }
        }
      }
      
      // 重複を除去して参加者リストを保存
      const uniqueParticipants = [...new Set(participantNames)];
      if (uniqueParticipants.length > 0) {
        initialSlots.participants = uniqueParticipants.join(', ');
        console.log('Extracted participants from CRM data:', initialSlots.participants);
      }
      
      // customer_participantsとvendor_participantsがある場合も統合
      const allParticipants = [];
      if (referenceData.customer_participants) {
        if (Array.isArray(referenceData.customer_participants)) {
          allParticipants.push(...referenceData.customer_participants.map(p => {
            if (typeof p === 'object' && p !== null) {
              // オブジェクトの場合、nameフィールドを優先、なければroleとnameを組み合わせ
              return p.name || `${p.role || ''}`.trim() || JSON.stringify(p);
            }
            return String(p);
          }));
        } else if (typeof referenceData.customer_participants === 'string') {
          allParticipants.push(...referenceData.customer_participants.split(/[,、]/).map(s => s.trim()));
        }
      }
      if (referenceData.vendor_participants) {
        if (Array.isArray(referenceData.vendor_participants)) {
          allParticipants.push(...referenceData.vendor_participants.map(p => {
            if (typeof p === 'object' && p !== null) {
              // オブジェクトの場合、nameフィールドを優先、なければroleとnameを組み合わせ
              return p.name || `${p.role || ''}`.trim() || JSON.stringify(p);
            }
            return String(p);
          }));
        } else if (typeof referenceData.vendor_participants === 'string') {
          allParticipants.push(...referenceData.vendor_participants.split(/[,、]/).map(s => s.trim()));
        }
      }
      
      // 統合した参加者リストがある場合は上書き
      if (allParticipants.length > 0) {
        initialSlots.participants = [...new Set(allParticipants)].join(', ');
        console.log('Merged participants list:', initialSlots.participants);
      }
    }
    
    console.log('Initial slots from CRM data:', initialSlots);
    
    // 1番目と2番目の質問・選択肢を並行生成
    console.log(`Starting hearing session ${sessionId}, generating Q1 and Q2 in parallel`);
    console.log('CRM type:', crmType, 'User ID:', req.userId);
    
    // 実際のCRMデータと議事録を取得（questionGeneratorが未定義のため一時的に無効化）
    const dataPromise = (async () => {
      // const [crmData, meetingNotes] = await Promise.all([
      //   questionGenerator.fetchCRMData(req.userId, crmType),
      //   questionGenerator.fetchMeetingNotes(req.userId)
      // ]);
      // return questionGenerator.extractContextFromData(crmData, meetingNotes);
      return { recentCustomers: [], activeProjects: [] }; // 空のコンテキストを返す
    })();
    
    // 1番目の質問生成（データ駆動型）
    const firstQuestionPromise = (async () => {
      const context = await dataPromise;
      let question;
      let suggestions = [];
      
      // まず、参考データ（議事録/CRM）がある場合はそれを優先
      console.log('Question generation - checking conditions...');
      console.log('Has referenceData:', !!referenceData);
      console.log('dataSource:', dataSource);
      console.log('customer:', referenceData?.customer);
      
      if (referenceData && dataSource === 'meeting') {
        console.log('Using meeting mode with customer:', referenceData.customer);
        // 顧客名がある場合は含める
        if (referenceData.customer) {
          question = `お疲れ様でした。${referenceData.customer}様との${referenceData.project ? referenceData.project + 'に関する' : ''}商談の雰囲気はどうでしたか？`;
        } else {
          question = `お疲れ様でした。今日の商談の雰囲気はどうでしたか？`;
        }
        console.log('Generated question for meeting mode:', question);
        
        // 顧客側参加者の情報を選択肢生成に活用
        const enhancedReferenceData = {
          ...referenceData,
          // 顧客側参加者がいる場合は、それを優先的に使用
          relevantParticipants: referenceData.customer_participants || referenceData.participants
        };
        
        suggestions = await generateSuggestionsForQuestion(question, enhancedReferenceData, {}, dataSource);
      } else if (referenceData && (dataSource === 'dynamics365' || dataSource === 'salesforce') && referenceData.customer) {
        console.log('Using CRM mode with customer:', referenceData.customer);
        
        // 顧客名の言語を検出
        const customerLang = detectLanguage(referenceData.customer);
        const projectLang = referenceData.project ? detectLanguage(referenceData.project) : 'ja';
        
        // 英語の顧客名/案件名の場合は敬称を付けない
        const customerDisplay = customerLang === 'en' ? referenceData.customer : `${referenceData.customer}様`;
        const projectDisplay = referenceData.project ? 
          (projectLang === 'en' ? `「${referenceData.project}」` : referenceData.project) : '';
        
        // 参加者情報がある場合は、それを考慮した質問を生成
        if (initialSlots.participants) {
          const participantsList = initialSlots.participants.split(', ');
          if (participantsList.length > 0) {
            const firstParticipant = participantsList[0];
            const participantLang = detectLanguage(firstParticipant);
            const participantDisplay = participantLang === 'en' ? firstParticipant : `${firstParticipant}さん`;
            
            // 参加者名を使った具体的な質問
            question = `お疲れ様でした。${customerDisplay}との${projectDisplay ? projectDisplay + 'に関する' : ''}商談で、${participantDisplay}の反応はいかがでしたか？`;
          } else {
            question = `お疲れ様でした。${customerDisplay}との${projectDisplay ? projectDisplay + 'に関する' : ''}商談はいかがでしたか？`;
          }
        } else {
          question = `お疲れ様でした。${customerDisplay}との${projectDisplay ? projectDisplay + 'に関する' : ''}商談はいかがでしたか？`;
        }
        suggestions = await generateSuggestionsForQuestion(question, referenceData, initialSlots, dataSource);
      } else if (context.recentCustomers.length > 0 || context.activeProjects.length > 0) {
        console.log('Using context-based generation');
        // 実データがある場合はデータ駆動型質問生成
        // question = await questionGenerator.generateQuestionForSlot('customer', context) || await generateInitialQuestion();
        // suggestions = await questionGenerator.generateSuggestionsForQuestion(question, 'customer', context);
        question = await generateInitialQuestion();
        suggestions = await generateSuggestionsForQuestion(question, referenceData, {}, dataSource);
      } else {
        // データがない場合は従来の方法
        console.log('Using fallback initial question generation');
        question = await generateInitialQuestion();
        if (referenceData && dataSource) {
          try {
            suggestions = await generateSuggestionsForQuestion(question, referenceData, {}, dataSource);
          } catch (error) {
            console.error('Failed to generate Q1 suggestions:', error);
          }
        }
      }
      
      console.log('Generated question:', question);
      console.log('Generated suggestions:', suggestions);
      
      return { question, suggestions };
    })();
    
    // 2番目の質問生成（データ駆動型）
    const secondQuestionPromise = (async () => {
      try {
        const context = await dataPromise;
        let nextQuestion;
        let suggestions = [];
        
        // 実データがある場合
        if (context.recentCustomers.length > 0 || context.activeProjects.length > 0) {
          // const nextSlot = REQUIRED_SLOTS.find(slot => slot !== 'customer');
          // nextQuestion = await questionGenerator.generateQuestionForSlot(nextSlot, context);
          // if (nextQuestion) {
          //   suggestions = await questionGenerator.generateSuggestionsForQuestion(nextQuestion, nextSlot, context);
          // }
        }
        
        // データがない場合または生成できなかった場合
        if (!nextQuestion) {
          const result = await determineNextQuestionWithAI(0, initialSlots, '', []);
          nextQuestion = result.nextQuestion;
          
          if (referenceData && dataSource && nextQuestion) {
            suggestions = await generateSuggestionsForQuestion(nextQuestion, referenceData, {}, dataSource);
          }
        }
        
        if (nextQuestion) {
          // キャッシュに保存
          const cacheKey = `${PRELOAD_CACHE_PREFIX}${sessionId}_1`;
          const preloadData = {
            question: nextQuestion,
            suggestions,
            allowMultiple: checkIfMultipleChoiceQuestion(nextQuestion),
            generatedAt: Date.now()
          };
          
          await redisWrapper.set(
            cacheKey,
            JSON.stringify(preloadData),
            { EX: CACHE_TTL }
          );
          console.log(`Pre-generated Q2 and cached at ${cacheKey}`);
        }
      } catch (error) {
        console.error('Failed to pre-generate Q2:', error);
      }
    })();
    
    // 並行処理を待機
    const [firstData] = await Promise.all([firstQuestionPromise, secondQuestionPromise]);
    
    // 複数選択フラグを追加
    const allowMultiple = checkIfMultipleChoiceQuestion(firstData.question);
    
    res.json({
      sessionId,
      question: firstData.question,
      questionIndex: 0,
      totalQuestions: 5,
      suggestions: firstData.suggestions,
      allowMultiple,
      askedQuestions: [firstData.question],
      initialSlots,  // 議事録やCRMから抽出された初期スロットを追加
      referenceData  // 参照データも追加
    });
  } catch (error) {
    console.error('Start hearing error:', error);
    res.status(500).json({ error: 'AIヒアリングの開始に失敗しました' });
  }
});

// 旧エンドポイントは削除（先読み機能付きのエンドポイントに統合）

// 回答から情報を抽出（質問コンテキストも考慮）
function extractInformationFromAnswer(answer, lastQuestion = '') {
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
      extracted.customer = match[0].replace(/[{}[\]"]/g, '');
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
    // {}を除去してカンマ区切りの文字列として保存
    extracted.project = projects.map(p => p.replace(/[{}[\]"]/g, '')).join(', ');
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
      extracted.budget = (match[1] || match[0]).replace(/[{}[\]"]/g, '');
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
      extracted.schedule = (match[1] || match[0]).replace(/[{}[\]"]/g, '');
      break;
    }
  }
  
  // 参加者情報の抽出
  const participantPattern = /(部長|課長|主任|担当|マネージャー|社長|専務)[^。、]*?([さん|様|氏]?)/;
  const participantMatch = answer.match(participantPattern);
  if (participantMatch) {
    // 単一の参加者でも文字列として保存（{}除去）
    extracted.participants = participantMatch[0].replace(/[{}[\]"]/g, '');
  }
  
  // 場所情報の抽出
  const locationPattern = /(本社|支社|事務所|現場|会議室|オフィス)[^。、]*?/;
  const locationMatch = answer.match(locationPattern);
  if (locationMatch) {
    extracted.location = locationMatch[0].replace(/[{}[\]"]/g, '');
  }
  
  // 課題・問題の抽出（複数対応、より広範囲で検出）
  const issuePatterns = [
    // 直接的な課題・問題のキーワード
    /([^。、]*?(課題|問題|懸念|リスク|困って|難しい|心配|不安|厳しい|きつい|大変|対応が必要)[^。、]*)/g,
    
    // リソース関連の課題
    /([^。、]*?(コスト|費用|時間|人手|効率|予算|資金|期間|工期|納期)[^。、]*?(かかって|不足|課題|問題|足りない|厳しい|ギリギリ|タイト|オーバー)[^。、]*)/g,
    
    // 技術的な課題
    /([^。、]*?(技術|システム|設備|機能|性能|品質|精度)[^。、]*?(課題|問題|不足|対応|改善|必要|検討)[^。、]*)/g,
    
    // 人員・組織の課題
    /([^。、]*?(人員|スタッフ|担当|体制|組織|チーム)[^。、]*?(不足|課題|問題|必要|検討|調整)[^。、]*)/g,
    
    // 「〜が〜ない」「〜できない」などの否定表現
    /([^。、]*?(ない|できない|わからない|不明|未定|検討中|調整中)[^。、]*)/g,
    
    // 「〜する必要がある」「〜しなければならない」などの必要性
    /([^。、]*?(必要がある|しなければならない|する必要|検討する必要|対応する必要|改善する必要)[^。、]*)/g,
    
    // 汎用的な問題を示す表現
    /([^。、]*?(うまくいかない|スムーズにいかない|遅れて|遅延|延期|変更|修正|見直し)[^。、]*)/g
  ];
  
  const issues = [];
  
  // 質問コンテキストから課題について聞かれているかを判定
  const isIssueQuestion = lastQuestion && (
    lastQuestion.includes('課題') || 
    lastQuestion.includes('問題') || 
    lastQuestion.includes('懸念') || 
    lastQuestion.includes('リスク') ||
    lastQuestion.includes('解決したい')
  );
  
  // 課題について質問されている場合は、より積極的に抽出
  if (isIssueQuestion && answer.length > 10) {
    // 回答全体を一つの課題として扱う（明らかに課題以外の部分は除外）
    const cleanedAnswer = answer
      .replace(/^(はい|いえ|そうですね|まあ|うーん)[、。]?\s*/, '')  // 冒頭の相槌を除去
      .replace(/^(特に|特別)[はに]?[ない]?[です。]*\s*/, '')  // 「特にない」系を除去
      .trim();
    
    if (cleanedAnswer && !cleanedAnswer.match(/^(ない|ありません|特にない|問題ない)([です。]*)$/)) {
      issues.push(cleanedAnswer);
    }
  }
  
  // 通常のパターンマッチングも実行
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
    // {}を除去してカンマ区切りの文字列として保存
    extracted.issues = issues.map(i => i.replace(/[{}[\]"]/g, '')).join(', ');
  }
  
  // 業界の推測
  const industryKeywords = [
    { industry: '建設業', keywords: ['建設', '工務', '施工', '建築', '土木', 'ゼネコン', '現場', '着工', '竣工', 'BIM', 'CAD'] },
    { industry: '保険業', keywords: ['保険', '損保', '生保', '共済', '契約者', '被保険者', '保険料', '保険金', '査定'] },
    { industry: '金融業', keywords: ['銀行', '信金', '証券', '投資', '融資', '資金', '金利', '債券', '株式', 'ファンド'] },
    { industry: '製造業', keywords: ['製造', '工場', '生産', '品質', '検査', '組立', '製品', '部品', '設備', '機械'] },
    { industry: 'IT業', keywords: ['IT', 'システム', 'ソフト', 'アプリ', 'データ', 'クラウド', 'AI', 'DX', 'SaaS'] },
    { industry: '医療・介護', keywords: ['病院', '医療', '看護', '介護', '患者', '診療', '薬剤', 'カルテ', 'レセプト'] },
    { industry: '教育', keywords: ['学校', '大学', '教育', '学生', '生徒', '授業', '講義', '研修', 'e-learning'] },
    { industry: '小売業', keywords: ['店舗', '販売', '商品', '在庫', 'POS', 'レジ', 'EC', '顧客管理', '売上'] },
    { industry: '不動産業', keywords: ['不動産', '賃貸', '売買', '物件', 'マンション', 'オフィス', '仲介', '管理'] },
    { industry: '公共・自治体', keywords: ['自治体', '市役所', '県庁', '公共', '行政', '住民', '公務員', '入札'] }
  ];
  
  for (const { industry, keywords } of industryKeywords) {
    if (keywords.some(keyword => answer.includes(keyword))) {
      extracted.industry = industry;
      break;
    }
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
      // 参加者の文字列をカンマ区切り文字列として保存（{}除去）
      const participants = participantText.split(/[、,と・]/).map(p => p.trim().replace(/[{}[\]"]/g, '')).filter(p => p.length > 0);
      extracted.participants = participants.join(', ');
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
    // {}を除去してカンマ区切りの文字列として保存
    extracted.next_action = actions.map(a => a.replace(/[{}[\]"]/g, '')).join(', ');
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
      const action = match[1].trim().replace(/[{}[\]"]/g, '');
      if (action && (!extracted.next_action || !extracted.next_action.includes(action))) {
        if (!extracted.next_action) extracted.next_action = '';
        if (extracted.next_action) extracted.next_action += ', ';
        extracted.next_action += action;
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
    
    // 曖昧・抽象的な回答の検出
    isVague: /良かった|よかった|普通|まあまあ|そこそこ|まずまず|いい感じ|よい感じ|特に問題なく|順調|概ね|だいたい|まずまず|大丈夫|オーケー/.test(answer),
    isOnlyFeeling: /^(良かった|よかった|普通|まあまあ|そこそこ|順調|いい感じ|よい感じ|大丈夫|オーケー)(と思います|だと思います|です|でした|。|！|？)*\s*$/.test(answer.trim()),
    
    // 一般的なビジネスキーワード（建築・技術分野も含む）
    hasBusinessContext: /予算|コスト|費用|価格|金額|効率|時間|人手|課題|問題|目的|目標|システム|技術|AI|建築|設計|計算|導入|自動化|ソフト|プロジェクト|案件/.test(answer),
    hasPersonalDetails: /部長|課長|主任|担当|マネージャー|社長|専務|さん|様/.test(answer),
    hasNextSteps: /提案|見積|資料|検討|導入|次回|来月|来週|スケジュール|予定|打ち合わせ|提出|連絡|相談/.test(answer),
    
    // プロジェクトや技術的な話題があるかどうか
    hasProjectContent: /案件|プロジェクト|システム|技術|AI|建築|設計|計算|ソフト|ツール|業務|作業|開発/.test(answer),
    
    // 顧客や会社名が含まれているか
    hasCustomerInfo: /株式会社|会社|コーポレーション|建設|工務|工業|産業|商事|物産|不動産|電気|設備|生命|保険|銀行|信託/.test(answer),
    
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

// 次の質問を動的に決定（フォールバック用）
async function determineNextQuestion(currentIndex, slots, lastAnswer, askedQuestions = []) {
  // この関数は主にAIが利用できない場合のフォールバックとして使用
  // 通常はdetermineNextQuestionWithAIが呼ばれる
  
  // 回答の詳細度を分析
  const answerDetail = analyzeAnswerDetail(lastAnswer);
  
  console.log('Fallback: Answer analysis:', answerDetail);
  console.log('Fallback: Current slots:', slots);
  
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
  console.log('Fallback: Missing slots:', missingSlots);
  
  // 回答が曖昧・不十分な場合は深掘り質問
  if (currentIndex === 0 && (
    answerDetail.isVague || 
    answerDetail.isOnlyFeeling || 
    (!answerDetail.hasCustomerInfo && !answerDetail.hasProjectContent && !answerDetail.hasBusinessContext) ||
    lastAnswer.length < 30
  )) {
    console.log('Initial answer is vague or insufficient, asking for more details');
    console.log('Answer analysis for deep dive:', answerDetail);
    return {
      nextQuestion: "もう少し詳しく教えてください。今回はどちらの会社の方と、どのような案件についてお話されましたか？",
      isComplete: false
    };
  }
  
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
  const priorityOrder = ['customer', 'project', 'next_action', 'issues', 'budget', 'schedule', 'participants', 'location'];
  
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
  const essentialSlots = ['customer', 'project', 'next_action', 'issues', 'budget', 'schedule', 'participants', 'location'];
  const missingEssentialSlots = essentialSlots.filter(slot => !slots[slot]);
  
  // 最重要情報（customer, project, next_action, issues）が埋まっていない場合は継続
  const criticalSlots = ['customer', 'project', 'next_action', 'issues'];
  const missingCriticalSlots = criticalSlots.filter(slot => !slots[slot]);
  
  // 最低8個の質問を確保
  if (currentIndex < 8) {
    // 8個未満の場合は必ず継続
    console.log(`Question ${currentIndex + 1}/8 minimum - continuing`);
    
    // 感覚値の質問を優先的に聞く
    if (!slots.key_person_reaction && currentIndex < 4) {
      // 参加者情報がある場合とない場合で質問を変える
      if (slots.participants && slots.participants.trim()) {
        return {
          nextQuestion: "今日の商談で、特に影響力がありそうな方はどなたでしたか？その方の反応はいかがでしたか？",
          isComplete: false
        };
      } else {
        // 参加者名がない場合は「誰が」を避ける
        return {
          nextQuestion: "今日の商談で、決定権を持っていそうな方の反応や、全体的な雰囲気はいかがでしたか？",
          isComplete: false
        };
      }
    }
    
    // strongest_interestスロットが埋まっていない場合のみ質問する
    if (!slots.strongest_interest && currentIndex < 5) {
      return {
        nextQuestion: "商談の中で、先方が最も興味を示された部分はどこでしたか？",
        isComplete: false
      };
    }
    
    if (!slots.budget_reaction && currentIndex < 6) {
      return {
        nextQuestion: "予算や価格についてお話された時の先方の反応はいかがでしたか？",
        isComplete: false
      };
    }
    
    // 必須情報を確認
    if (!slots.schedule) {
      return {
        nextQuestion: "なるほど。ところで、今回の案件のスケジュール感はいつ頃までに必要とされていますか？",
        isComplete: false
      };
    }
    
    if (!slots.issues) {
      return {
        nextQuestion: "先方が現在抱えている課題や、解決したい問題について何かお話がありましたか？",
        isComplete: false
      };
    }
    
    if (!slots.location) {
      return {
        nextQuestion: "本日の商談はどちらで行われましたか？",
        isComplete: false
      };
    }
    
    // デフォルトの質問
    return {
      nextQuestion: "他に共有しておきたい重要な情報はありますか？",
      isComplete: false
    };
  } else if (missingCriticalSlots.length > 0 && currentIndex < 8) {
    // 重要スロットが未完了で10個未満なら継続
    console.log(`Critical slots missing: ${missingCriticalSlots.join(', ')} - continuing`);
    
    // 未取得の重要スロットに対する質問を生成
    const missingSlot = missingCriticalSlots[0];
    const question = generateQuestionForSlot(missingSlot, slots);
    
    return {
      nextQuestion: question || "他に重要な情報はありますか？",
      isComplete: false
    };
  } else if (missingEssentialSlots.length === 0 && currentIndex >= 3) {
    // 必須スロットがすべて埋まり、4個以上質問済みなら完了可能
    console.log(`All essential slots filled after ${currentIndex + 1} questions - can complete`);
    return { isComplete: true };
  }
  
  // より多くの情報を必須として設定
  const coreSlots = ['customer', 'project'];
  const missingCoreSlots = coreSlots.filter(slot => !slots[slot]);
  const importantSlots = ['customer', 'project', 'next_action', 'budget', 'schedule'];
  const missingImportantSlots = importantSlots.filter(slot => !slots[slot]);
  
  // 質問数が多すぎる場合は強制完了（4個を上限とする = 5問目で終了）
  if (currentIndex >= 4) {
    console.log(`Reached maximum questions (${currentIndex + 1}) - forcing completion`);
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

// スロット別の質問を生成（ビジネスライクなトーン）
function generateQuestionForSlot(slotName, existingSlots) {
  const customerName = existingSlots.customer || 'お客様';
  
  switch (slotName) {
    case 'customer':
      return "どちらの企業様を訪問されましたか？";
    
    case 'project':
      return `${customerName}様の案件について、詳しくお聞かせいただけますか？`;
    
    case 'next_action':
      return "次のアクションについて、具体的にどのようなお話になりましたか？";
    
    case 'budget':
      return "予算について何かお話はございましたか？先方の反応はいかがでしたか？";
    
    case 'schedule':
      return "スケジュールについて、いつまでに必要とおっしゃっていましたか？納期のご要望は？";
    
    case 'participants':
      return `${customerName}様からはどなたがご参加されていましたか？お名前と役職を教えてください。`;
    
    case 'location':
      return "商談はどちらで行われましたか？";
    
    case 'issues':
      return "何か課題や懸念事項はございましたか？";
    
    // 感覚値系の質問を追加（ビジネスライク）
    case 'key_person_reaction':
      return "キーパーソンの反応はいかがでしたか？ご関心は高そうでしたか？";
      
    case 'positive_points':
      return "特に先方のご関心が高かった点はどちらでしたか？";
      
    case 'atmosphere_change':
      return "商談中、雰囲気が変わった場面はございましたか？どのような変化でしたか？";
      
    case 'competitor_info':
      return "他社様との比較検討状況について、何かお話はありましたか？";
      
    case 'enthusiasm_level':
      return "全体的な商談の温度感はいかがでしたか？";
    
    default:
      return null;
  }
}

// 質問からキーワードを抽出（類似性チェック用）
function extractQuestionKeywords(question) {
  const keywords = [];
  
  // 質問タイプ別のキーワード抽出（より詳細に）
  if (question.includes('顧客') || question.includes('お客様') || question.includes('企業') || question.includes('会社')) keywords.push('customer');
  if (question.includes('案件') || question.includes('プロジェクト')) keywords.push('project');
  if (question.includes('次の') || question.includes('アクション') || question.includes('今後')) keywords.push('next_action');
  if (question.includes('予算') || question.includes('費用') || question.includes('金額')) keywords.push('budget');
  if (question.includes('スケジュール') || question.includes('期間') || question.includes('いつ')) keywords.push('schedule');
  if (question.includes('参加') || question.includes('出席') || question.includes('同席')) keywords.push('participants');
  if (question.includes('場所') || question.includes('どこ') || question.includes('会場')) keywords.push('location');
  if (question.includes('課題') || question.includes('問題') || question.includes('懸念')) keywords.push('issues');
  
  // 感覚値・温度感関連（重複防止のため詳細に分類）
  if (question.includes('興味') || question.includes('関心')) keywords.push('interest');
  if (question.includes('反応')) keywords.push('reaction');
  if (question.includes('温度感') || question.includes('感触')) keywords.push('temperature');
  if (question.includes('雰囲気')) keywords.push('atmosphere');
  if (question.includes('盛り上が') || question.includes('食いつ')) keywords.push('excitement');
  if (question.includes('キーマン') || question.includes('決定権') || question.includes('影響力')) keywords.push('keyman');
  if (question.includes('乗り気') || question.includes('前向き')) keywords.push('positive');
  if (question.includes('慎重') || question.includes('懐疑的')) keywords.push('negative');
  
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
async function extractInformationWithAI(answer, currentSlots, lastQuestion = '') {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    if (!endpoint || !apiKey || !deploymentName) {
      console.log('Azure OpenAI not configured, using fallback extraction');
      return extractInformationFromAnswer(answer, lastQuestion);
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
- customer: 顧客企業名（必ず会社名を抽出。「大成建設」「ABC株式会社」など。個人名のみの場合は空にする）
- customer_person: 顧客担当者名（個人名がある場合のみ。「田中さん」「山田部長」など）
- project: 案件名・プロジェクト内容（これまでの会話全体から推測。商談内容・提案内容・顧客の課題などから案件名を生成）
- next_action: 次のアクション・やるべきこと（「見積もり作成」「提案書準備」「次回会議設定」など、営業担当者の未来の行動のみ）
- budget: 予算・金額（「1000万円」「年間500万」「月額10万」「予算は未定」など、金額に関する情報）
- schedule: スケジュール・納期・期間（「来月まで」「3月着工」「年度内」「2025年4月から」など、時期に関する情報）
- participants: 参加者・出席者（「ABC株式会社の山田部長」「XYZ建設の田中さん」など、会社名と名前を含めて抽出。会社名が不明な場合は名前のみ）
- location: 場所・会場（必ず抽出！「新宿」「渋谷」「お客様オフィス」「〇〇で行われた」「〇〇にて」など、どこで商談したかの情報）
- issues: 課題・問題・懸念事項（「人手不足」「コスト削減が課題」「システム老朽化」など、顧客の抱える問題）
- industry: 顧客の業界・分野（会社名や会話内容から推測。建設業、保険業、製造業、IT業、金融業、医療・介護、教育、小売業、不動産業など）
- personal_info: 顧客の個人情報・趣味（「ゴルフが趣味」「釣りが好き」「コーヒー好き」など、関係構築に役立つ個人的な情報）
- relationship_notes: 関係構築メモ（「ゴルフの話で盛り上がった」「共通の知人がいた」「同じ大学出身」など、雑談や関係構築の内容）
- key_person_reaction: キーマンの反応・温度感（「乗り気だった」「渋い顔をしていた」「前のめりになった」など）
- positive_points: 先方が興味を持った点（「AIの部分で目が輝いた」「コスト削減の話で身を乗り出した」など）
- atmosphere_change: 雰囲気が変わった瞬間（「予算の話で空気が重くなった」「デモを見せたら一気に盛り上がった」など）
- competitor_info: 競合情報（「A社と比較検討中」「B社の提案も受けている」など）
- enthusiasm_level: 全体的な熱意度（「高い」「中程度」「低い」「冷めている」「熱い」など）
- budget_reaction: 予算への反応（「余裕がありそう」「渋い顔をした」「想定内の様子」など）
- decision_makers: 決定権者情報（「〇〇部長が最終決定権」「△△さんが実質的なキーマン」など）
- concerns_mood: 懸念事項の雰囲気（「深刻そうだった」「それほど心配していない様子」など）
- next_step_mood: 次ステップへの温度感（「前向き」「慎重」「積極的」「消極的」など）
- strongest_interest: 最も興味を示された部分（「データ分析機能」「コスト削減効果」「UI統一仕様」など、先方が最も関心を持った機能や側面）

既に判明している情報：
${JSON.stringify(currentSlots, null, 2)}

質問コンテキスト（直前の質問）：
${lastQuestion ? `「${lastQuestion}」` : '初回質問'}

重要な処理ルール：
1. **既に判明している情報**がある場合、その項目は抽出せず空にしてください（上書きしない）
2. 長い説明は重要なポイントを抽出して簡潔に要約してください
3. 日報として読みやすい自然な文章に変換してください
4. 「〜と話していました」「〜と言っていました」などの冗長な表現は削除してください
5. 過去の行動（「話しました」「説明しました」）は抽出しないでください
6. **next_actionは営業担当者が今後行う具体的な行動のみ**を抽出してください
7. 顧客の要望（「〜したいと言っていました」「〜が欲しいと話していました」）はnext_actionに含めないでください
8. **{}、[]、""は一切使用しないでください。純粋なテキストのみ**
9. 複数の項目がある場合はカンマ区切りで記載してください
10. **locationは必ず確認！** 「新宿で」「〇〇で行われた」「〇〇にて」などの場所を示す表現があれば必ず抽出
11. **projectは会話全体から推測** 複数の回答から案件内容を理解し、適切な案件名を生成（「AI図面読み取りシステム導入」など）
8. **課題・懸念事項・問題点の抽出方法**：
   **質問コンテキストを重視**してください。特に「課題」「問題」「懸念」「解決したい」などのキーワードが質問に含まれている場合、
   回答全体を課題の説明として扱い、積極的に抽出してください。
   
   文章を注意深く読み、以下の観点で問題となる要素を特定してください：
   - 現在困っていること、悩んでいること
   - 解決したい問題、改善したい状況
   - 不足している要素、欠けているもの
   - リスクや懸念材料、心配事
   - 制約や障害、ボトルネック
   - 難しいと感じていること、うまくいかないこと
   - 質問で課題について聞かれた場合の回答内容全般
   
9. **抽出の判断基準**：
   - ネガティブな状況や困りごとを表現している部分
   - 「〜できない」「〜がない」「〜が足りない」などの否定表現
   - 問題や課題を示唆する文脈
   - 解決や改善の必要性を示している部分
   
10. **業界推測の方法**：
   顧客の業界を会話の文脈から推測してください。以下の手がかりを活用：
   - 会社名に含まれるキーワード（「建設」「保険」「銀行」「病院」「学校」など）
   - 商談内容・システム・課題から推測される業界特性
   - 参加者の肩書きや部門名
   - 使用される専門用語や業界固有の表現
   
   主要業界カテゴリ：
   - 建設業、不動産業、製造業、IT業、金融業、保険業
   - 医療・介護、教育、小売業、運輸業、エネルギー業
   - 公共・自治体、農業、観光・宿泊業、その他サービス業

11. **抽出時の注意点**：
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
  "next_action": "具体的なアクション（複数ある場合はカンマ区切り）",
  "budget": "予算額",
  "schedule": "期間・納期",
  "participants": "参加者（複数ある場合はカンマ区切り）",
  "location": "場所",
  "issues": "課題（複数ある場合はカンマ区切り）",
  "industry": "推測される業界",
  "personal_info": "個人的な情報・趣味（複数ある場合はカンマ区切り）",
  "relationship_notes": "関係構築メモ（複数ある場合はカンマ区切り）",
  "key_person_reaction": "キーマンの反応・温度感",
  "positive_points": "先方が興味を持った点（複数ある場合はカンマ区切り）",
  "atmosphere_change": "雰囲気が変わった瞬間",
  "competitor_info": "競合情報",
  "enthusiasm_level": "全体的な熱意度",
  "budget_reaction": "予算への反応",
  "decision_makers": "決定権者情報",
  "concerns_mood": "懸念事項の雰囲気",
  "next_step_mood": "次ステップへの温度感"
}`
          },
          {
            role: 'user',
            content: `以下の回答から情報を抽出してください：

回答: "${answer}"

特に以下の点に注意してください：
1. locationが回答に含まれている場合は必ず抽出（「新宿で」「〇〇で行われました」など）
2. projectはこれまでの会話全体から案件内容を推測して生成
3. 質問が「${lastQuestion}」の場合、その質問に対応する情報を優先的に抽出`
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
      
      // 空の値をフィルタリング＆データ型を正規化し、{}[]"を除去
      const filtered = {};
      Object.keys(extracted).forEach(key => {
        const value = extracted[key];
        if (value && value !== '' && value !== null) {
          // 全フィールド共通：{}[]"を除去する関数
          const cleanValue = (val) => {
            if (typeof val === 'string') {
              return val.replace(/[{}[\]"]/g, '');
            }
            if (Array.isArray(val)) {
              return val.map(item => typeof item === 'string' ? item.replace(/[{}[\]"]/g, '') : item).join(', ');
            }
            return val;
          };
          
          // 特定のフィールドは文字列として格納すべき
          const stringFields = ['customer', 'project', 'budget', 'schedule', 'location'];
          
          if (stringFields.includes(key)) {
            // 配列の場合は最初の要素を取得、文字列はそのまま
            if (Array.isArray(value) && value.length > 0) {
              filtered[key] = cleanValue(value[0]);
            } else if (!Array.isArray(value)) {
              filtered[key] = cleanValue(value);
            }
          } else {
            // その他のフィールド（文字列として格納）
            filtered[key] = cleanValue(value);
          }
        }
      });
      
      return filtered;
      
    } catch (parseError) {
      console.error('Failed to parse AI extraction result:', parseError);
      return extractInformationFromAnswer(answer, lastQuestion);
    }
    
  } catch (error) {
    console.error('Error in AI information extraction:', error.message);
    // エラーの場合は既存の関数にフォールバック
    return extractInformationFromAnswer(answer, lastQuestion);
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
            content: `あなたは営業部の経験豊富な上司です。部下が商談から帰ってきたので、適度にリラックスした雰囲気で様子を聞いています。
丁寧さを保ちながらも、自然な会話で重要な情報を引き出してください。

【あなたのキャラクター】
- プロフェッショナルでありながら親しみやすい
- 「なるほど」「そうですか」「それはいいですね」など適度な相槌
- 感覚的な話を大切にする（「どのような感触でしたか？」「雰囲気はいかがでしたか？」）
- 部下の努力を認めながら、建設的に聞く

【超重要な方針】
- 部下の回答内容を深く理解し、その内容に基づいて次に何を聞くべきかを動的に判断する
- 機械的にスロットを埋めるのではなく、自然な会話の流れを最優先にする
- 部下が話した内容の中で、感覚値や温度感に関わる部分を特に深掘りする
- 必須情報（顧客名、次のアクション等）も自然な流れで聞き出す

【重複質問を避けるための重要なルール】
★★★同じ内容を聞かないでください★★★
- 既に回答された内容について、別の表現で再度聞かない
- 「興味を示した部分」について既に聞いている場合、「最も関心を持った点」など似た質問をしない
- 「雰囲気」「反応」「温度感」などについて、既に聞いた場合は別の観点から質問する
- 過去の質問履歴を必ず確認し、類似の質問を避ける

【質問選択の優先順位】
1. まだ聞いていない新しい観点からの質問
2. 部下の回答で言及された新しいトピックの深掘り
3. 未確認の必須情報

【特に知りたいこと（感覚値重視）】
★提案への反応・温度感
- 「今日の商談で先方は提案に対してどのような感触でしたか？」
- 「どの部分に最も興味を示されていましたか？」
- 「提案のどこに懸念を持たれていましたか？」

★価格・予算への反応
- 「見積もり金額に対してどのような感触でしたか？高いと感じていましたか、それとも予算内で収まりそうでしたか？」
- 「価格の話をした時の先方の表情や反応はどうでしたか？」
- 「予算についてどのようなコメントがありましたか？」

★キーマン・意思決定者分析
【超重要】参加者名が判明していない場合は絶対に「誰が」「どなたが」「参加されていた方」という表現を使わない
参加者名がある場合のみ使える質問：
- 「参加者のうち、提案について最も乗り気になっていた人は誰ですか？」
- 「逆に慎重または懐疑的だった方はいらっしゃいましたか？」
参加者名がない場合（必ずこちらを使用）：
- 「提案について最も関心が高かったのはどのような点でしたか？」
- 「商談の中で特に前向きな反応があった部分はどこでしたか？」
- 「慎重な検討が必要とされた部分はありましたか？」
- 「全体的な温度感はどうでしたか？」

★商談の雰囲気・転換点
- 「商談中、雰囲気が大きく変わった瞬間はありましたか？」
- 「最も盛り上がった話題は何でしたか？」
- 「先方が身を乗り出して聞いていた部分はどこでしたか？」

★競合・比較状況
- 「他社との比較検討の話は出ましたか？」
- 「当社の強みとして評価された点は何でしたか？」
- 「競合と比べて懸念されている点はありましたか？」

★成約可能性・次のステップ
- 「正直なところ、この案件の成約可能性はどの程度だと感じましたか？」
- 「次のステップについて、先方はどの程度具体的でしたか？」
- 「今後の進め方について、先方の意欲はどうでしたか？」

【会話の進め方】
1. 最初の2-3回は必ず感覚値・温度感の質問を優先する
2. キーマン、反応、雰囲気の変化など、議事録に載らない情報を重視
3. 事実確認（場所、時間、参加者名など）は中盤以降に回す
4. 部下が話しやすいように、共感的な相槌を入れながら聞く
5. 8-10回程度の会話で、感覚値と必須情報の両方を確実に収集する

【動的な質問生成の指針】
質問の優先順位（特に最初の3-4回）：

第1優先：感覚値・キーマン分析
- 「商談の中で、決定権を持っていそうな方の反応はどうでしたか？」
- 「一番乗り気な反応を示されたのはどのような点でしたか？逆に慎重な反応があった点は？」
- 「名刺交換だけではわからない、実際の力関係はどんな感じでしたか？」

第2優先：温度感・雰囲気の変化
- 「商談中、雰囲気がガラッと変わった瞬間はありましたか？何がきっかけでしたか？」
- 「先方が一番食いついた話題は何でしたか？」
- 「逆に反応が薄かったり、微妙な空気になった話題はありましたか？」

第3優先：提案への具体的な反応
- 「今日の提案で、先方が『それいいね！』という感じになった部分はどこでしたか？」
- 「価格の話をした時の空気感はどうでしたか？」
- 「正直なところ、この案件いけそうですか？何％くらいの確度だと感じました？」

後回しでOKな質問（5回目以降）：
- 場所、時間、正式な参加者名などの事実確認
- 次のアクションの詳細
- 提出物や宿題の確認

回答形式（JSON）：
{
  "isComplete": true/false,
  "nextQuestion": "質問文（完了の場合は不要）",
  "reason": "判断理由（どんな情報を引き出そうとしているか）",
  "focusArea": "keyman|temperature|competition|nextSteps|details",
  "confidenceScore": 0-100
}

【質問生成時の注意事項】
- 既に聞いた内容を別の表現で聞き直さない
- 「提案の中で最も興味を持った点」を既に聞いた場合、「具体的にどの部分に興味を示した」などと聞かない
- 各質問は明確に異なる観点から聞く
- 会話の自然な流れを重視し、部下の回答から新しい話題を引き出す`
          },
          {
            role: 'user',
            content: `現在の状況：
部下の最新の回答: "${lastAnswer}"

これまでの会話の流れ：
質問回数: ${currentIndex + 1}回目
${askedQuestions.map((q, i) => `質問${i+1}: ${q}`).join('\n')}

現在判明している情報：
- 顧客名: ${slots.customer || '未確認'}
- 案件内容: ${slots.project || '未確認'}
- 参加者: ${slots.participants || '未確認'}
- 次のアクション: ${slots.next_action || '未確認'}
- 予算感: ${slots.budget || '未確認'}
- 予算への反応: ${slots.budget_reaction || '未確認'}
- キーマン情報: ${slots.decision_makers || '未確認'}
- 懸念事項の温度感: ${slots.concerns_mood || '未確認'}
- 次ステップへの確度: ${slots.next_step_mood || '未確認'}
- 最も興味を示した点: ${slots.strongest_interest || '未確認'}

【超重要な制約 - 参加者情報の有無に基づく質問生成】
${!slots.participants || !slots.participants.trim() ? 
`★★★参加者名が判明していません★★★
絶対に以下の表現を使用しないでください：
- 「参加されていた方の中で」
- 「誰が」「どなたが」
- 「○○さんは」
- 「参加者のうち」
- 「出席者の中で」

代わりに以下のような表現を使用してください：
- 「商談の中で」
- 「提案について」
- 「全体的に」
- 「どのような点で」
- 「どの部分が」` :
`★参加者名が判明しています: ${slots.participants}
必要に応じて以下の表現を使用できます：
- 「${slots.participants.split(', ')[0]}さんの反応はどうでしたか？」
- 「参加者の中で特に前向きだったのは誰でしたか？」
- 「どなたが最も関心を示していましたか？」`}

${(!slots.customer && slots.participants) ? 
'★★★重要な確認事項★★★\n参加者の名前（' + slots.participants + '）は判明していますが、顧客企業名が不明です。必ず会社名を確認してください。' : ''}
- 身を乗り出した瞬間: ${slots.body_language || '未確認'}
- 成約可能性: ${slots.closing_possibility || '未確認'}
- 他社との差別化: ${slots.differentiation || '未確認'}
- 隠れた懸念: ${slots.hidden_concerns || '未確認'}
- 参加者間の力関係: ${slots.stakeholder_dynamics || '未確認'}
- 予想外の発見: ${slots.unexpected_insights || '未確認'}
- アクションへのコミット: ${slots.action_commitment || '未確認'}

重要な質問の確認状況：
- 提案への感触を聞いた: ${askedQuestions.some(q => q.includes('提案') && q.includes('感触')) ? '済' : '未'}
- 見積もり金額への反応を聞いた: ${askedQuestions.some(q => q.includes('見積もり') || q.includes('金額') || q.includes('予算')) ? '済' : '未'}
- 乗り気な人を特定した: ${askedQuestions.some(q => q.includes('乗り気') || q.includes('前向き')) || slots.decision_makers ? '済' : '未'}

部下の回答を分析して、次に聞くべきことを判断してください。

★★★即座に終了すべき発言の検出★★★
以下のような発言があった場合は、isComplete: true で即座に終了してください：
- 「終わりたい」「もう終わり」「もういい」
- 「質問が多すぎる」「何度も同じことを聞く」
- 「もう十分」「これで終わり」「時間がない」
- 「さっき言った」「同じ話」「繰り返し」

★★★重複質問を避けるための具体的な指示★★★
以下の質問パターンは重複とみなし、絶対に聞かないでください：
- 「興味を示した部分」と「最も関心を持った点」は同じ内容
- 「提案への反応」と「提案への温度感」は同じ内容
- 「懸念点」と「課題」について既に聞いた場合、再度聞かない
- 同じトピック（例：AI、コンクリートひび割れ）について何度も聞かない

過去の質問を分析して、以下のトピックが既に聞かれているか確認：
${askedQuestions.map((q, i) => {
  const topics = [];
  if (q.includes('興味') || q.includes('関心')) topics.push('興味・関心');
  if (q.includes('反応') || q.includes('温度感')) topics.push('反応・温度感');
  if (q.includes('懸念') || q.includes('課題')) topics.push('懸念・課題');
  if (q.includes('雰囲気')) topics.push('雰囲気');
  if (q.includes('参加者') || q.includes('キーマン')) topics.push('参加者・キーマン');
  return `Q${i+1}: ${topics.join(', ')}`;
}).join('\n')}

重要な指示：
1. 上記の「既に聞かれたトピック」は避ける
2. 新しい観点からの質問を優先する
3. 部下の回答で新しく言及されたトピックを深掘りする
4. 最低8回、最大12回の質問を行い、感覚値と必須情報の両方を確実に収集する

終了判定の基準：
- 質問回数が6回未満の場合は絶対に終了しない
- 7回以上で、必須項目（顧客名、案件内容、次のアクション）と感覚値（参加者の反応、温度感）が得られた場合は終了可能
- 質問回数が10回に達した場合は強制終了（currentIndex >= 9）
- 9問目が終わった時点で絶対に終了する
- ユーザーが「終わりたい」「もう十分」等の発言をした場合は即座に終了

質問選択の基準：
- 1-2回目：必ずキーマン分析や全体の温度感を聞く
- 3-4回目：雰囲気の変化、興味を持った点、身を乗り出した瞬間を聞く
- 5-6回目：価格反応、成約可能性（%）、競合との差別化ポイントを聞く
- 7-8回目：隠れた懸念、参加者間の力関係、予想外の発見を聞く
- 9-10回目：次のアクションへのコミットメント度、まだ聞いていない必須項目を確認
- 9-10回目：残りの未確認項目をすべて確認

必須項目の確認状況：
- 顧客名: ${slots.customer ? '✓' : '✗ 未確認'}
- 案件内容: ${slots.project ? '✓' : '✗ 未確認'} 
- 参加者: ${slots.participants ? '✓' : '✗ 未確認'}
- 次のアクション: ${slots.next_action ? '✓' : '✗ 未確認'}
- 予算: ${slots.budget ? '✓' : '✗ 未確認'}
- スケジュール: ${slots.schedule ? '✓' : '✗ 未確認'}
- 場所: ${slots.location ? '✓' : '✗ 未確認'}
- 課題: ${slots.issues ? '✓' : '✗ 未確認'}

★★★早期終了の判定★★★
7回以上の質問が完了し、以下の条件を満たす場合は isComplete: true で終了可能：
- 必須項目：顧客名(${slots.customer ? '✓' : '✗'})、案件内容(${slots.project ? '✓' : '✗'})、次のアクション(${slots.next_action ? '✓' : '✗'}) が確認済み
- 感覚値：参加者の反応やキーマン情報、温度感のうち2つ以上が確認済み
- ユーザーが「終わりたい」系の発言をした場合は即座に終了

重要：7回目以降は、上記の✗未確認の項目を必ず聞いてください。
特にスケジュール（いつまでに必要か、納期、工期等）は重要なので、未確認の場合は必ず質問してください。

以下のJSON形式で回答してください：
{
  "isComplete": false,
  "nextQuestion": "次に聞くべき質問を1つだけここに記載"
}

または終了の場合：
{
  "isComplete": true
}`
          }
        ],
        max_tokens: 400,
        temperature: 0.7  // より自然で多様な会話のために温度を上げる
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
      // JSONとしてパース（コードブロックを除去）
      const jsonMatch = resultText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                       resultText.match(/(\{[\s\S]*?\})/);
      
      const jsonText = jsonMatch ? jsonMatch[1] : resultText;
      const result = JSON.parse(jsonText);
      
      console.log('Parsed AI result:', result);
      
      // nextQuestionが空またはnullの場合、isCompleteがfalseならフォールバック質問を生成
      if (!result.isComplete && (!result.nextQuestion || result.nextQuestion.trim() === '')) {
        console.warn('AI returned incomplete status but no nextQuestion, using fallback');
        const fallbackResult = await determineNextQuestion(currentIndex, slots, lastAnswer, askedQuestions);
        return fallbackResult;
      }
      
      return {
        isComplete: result.isComplete || false,
        nextQuestion: result.nextQuestion || null,
        needsFollowUp: result.needsFollowUp || false
      };
      
    } catch (parseError) {
      console.error('Failed to parse AI question determination result:', parseError);
      console.error('Raw AI result was:', resultText);
      return await determineNextQuestion(currentIndex, slots, lastAnswer, askedQuestions);
    }
    
  } catch (error) {
    console.error('Error in AI question determination:', error.message);
    console.error('Error details:', error.response?.data);
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

// 議事録からヒアリングセッションを開始（テキストのみサポート）
router.post('/hearing/meeting', authMiddleware, async (req, res) => {
  try {
    console.log('Meeting notes session start:', { 
      userId: req.userId, 
      type: req.body.type
    });

    let meetingContent = '';

    // コンテンツの取得（テキストのみ）
    if (req.body.type === 'text') {
      meetingContent = req.body.content;
    } else {
      return res.status(400).json({ error: 'テキスト形式の議事録のみサポートしています' });
    }

    if (!meetingContent || meetingContent.trim().length === 0) {
      return res.status(400).json({ error: '議事録の内容が空です' });
    }

    // Azure OpenAIを使って議事録を解析
    const analysisPrompt = `以下の議事録から、営業日報の作成に必要な情報を抽出してください。

議事録:
${meetingContent}

【抽出ルール】
1. 複数の企業が参加している場合：
   - 最も人数が多い企業を「主催企業（顧客候補）」とする
   - 1-2名しか参加していない企業は「ベンダー/コンサルタント側」の可能性が高い
   - 営業日報は通常、少人数側（ベンダー）が多人数側（顧客）に対して書く

2. 役職・部署から判断：
   - 「コンサルタント」「営業」「ベンダー」という肩書きの企業は提案側
   - 「プロジェクトスポンサー」「事業部」などの肩書きの企業は顧客側

3. 会議の文脈から判断：
   - 提案・技術説明をしている側 = ベンダー側
   - 要件・要望を出している側 = 顧客側

以下の情報を抽出してください（存在する場合のみ）:
- customer: 顧客企業名（主催企業または要件を出している側の企業名）文字列
- vendor_company: ベンダー/提案側企業名（あれば）文字列
- project: 案件名/プロジェクト名 文字列
- participants: 参加者（企業名と役職を含めて記載）文字列（カンマ区切り）
- customer_participants: 顧客側参加者のリスト 文字列配列
- vendor_participants: ベンダー側参加者のリスト 文字列配列
- location: 場所 文字列
- budget: 予算 文字列
- schedule: スケジュール/工期 文字列
- issues: 課題/懸念事項 文字列配列（各項目は文字列）
- next_action: 次のアクション 配列形式で、各アクションは以下の形式:
  [
    {"task": "タスク内容", "responsible": "担当者名", "deadline": "期限"},
    {"task": "タスク内容2", "responsible": "担当者名2", "deadline": "期限2"}
  ]
- key_points: 重要なポイント 文字列配列

【重要】
- issuesとnext_actionは必ず配列形式で返してください
- next_actionの各要素は{"task": "...", "responsible": "...", "deadline": "..."}形式のオブジェクトにしてください
- 担当者や期限が不明な場合は、そのフィールドは省略してください

JSON形式で返してください。存在しない情報は含めないでください。`;

    const response = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`,
      {
        messages: [
          {
            role: 'system',
            content: 'あなたは営業日報作成を支援するAIアシスタントです。議事録から重要な情報を抽出し、構造化された形式で返します。'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'api-key': process.env.AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    let extractedInfo = {};
    try {
      const content = response.data.choices[0].message.content;
      console.log('AI Response for meeting notes:', content);
      
      // JSONを抽出（複数のパターンに対応）
      let jsonStr = null;
      
      // パターン1: ```json ... ``` コードブロック
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      // パターン2: 通常のJSONオブジェクト
      else {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }
      
      if (jsonStr) {
        // 改行やタブを正規化
        jsonStr = jsonStr.replace(/[\r\n\t]+/g, ' ').trim();
        extractedInfo = JSON.parse(jsonStr);
        console.log('Successfully parsed extractedInfo:', extractedInfo);
      } else {
        console.error('No JSON found in AI response');
        console.error('Full AI response:', content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', response.data.choices[0].message.content);
    }

    // セッションを作成
    const sessionId = crypto.randomUUID();
    
    // セッションデータをRedisに保存（24時間のTTL付き）
    const sessionData = {
      userId: req.userId,
      extractedInfo,
      meetingContent,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    const sessionKey = `meeting_session:${sessionId}`;
    const ttl = 24 * 60 * 60; // 24時間（秒単位）
    
    await redisWrapper.setex(sessionKey, ttl, JSON.stringify(sessionData));
    
    console.log('Meeting session created and saved to Redis:', { sessionId, ttl: '24 hours' });

    res.json({
      sessionId,
      extractedInfo,
      message: '議事録を解析しました。AIヒアリングを開始します。'
    });

  } catch (error) {
    console.error('Meeting notes processing error:', error);
    res.status(500).json({ 
      error: '議事録の処理中にエラーが発生しました',
      details: error.message 
    });
  }
});

// セッション情報を取得
router.get('/hearing/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionKey = `meeting_session:${sessionId}`;
    
    // Redisからセッションデータを取得
    const sessionDataStr = await redisWrapper.get(sessionKey);
    
    if (!sessionDataStr) {
      return res.status(404).json({ error: 'セッションが見つかりません' });
    }
    
    const sessionData = JSON.parse(sessionDataStr);
    
    // セッションの所有者チェック
    if (sessionData.userId !== req.userId) {
      return res.status(403).json({ error: 'このセッションにアクセスする権限がありません' });
    }
    
    res.json({
      sessionId,
      extractedInfo: sessionData.extractedInfo,
      meetingContent: sessionData.meetingContent,
      status: sessionData.status,
      createdAt: sessionData.createdAt
    });
    
  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({ error: 'セッション情報の取得に失敗しました' });
  }
});

// 参考データに基づく回答候補を生成
router.post('/hearing/suggestions', authMiddleware, async (req, res) => {
  try {
    const { 
      currentQuestion, 
      referenceData,  // CRM/議事録データ
      currentSlots,   // 現在のスロット情報
      dataSource,     // 'dynamics365', 'salesforce', 'meeting'
      conversationHistory = [] // 過去の会話履歴（3問目以降）
    } = req.body;

    console.log('Generating suggestions:', { 
      question: currentQuestion?.substring(0, 50), 
      dataSource,
      hasReferenceData: !!referenceData 
    });

    if (!currentQuestion) {
      return res.status(400).json({ error: '質問が指定されていません' });
    }

    // Azure OpenAI設定確認
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

    if (!endpoint || !apiKey || !deploymentName) {
      // AIが使えない場合のフォールバック
      console.error('Azure OpenAI not configured');
      return res.json({ suggestions: [], allowMultiple: true });
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    // データソースに応じた参考情報の整理
    let contextInfo = '';
    if (referenceData) {
      if (dataSource === 'meeting') {
        contextInfo = `議事録の内容:
- 顧客: ${referenceData.customer || '不明'}
- 案件: ${referenceData.project || '不明'}
- 参加者: ${referenceData.participants || '不明'}
- 場所: ${referenceData.location || '不明'}
- 予算: ${referenceData.budget || '不明'}
- 要約: ${referenceData.summary || ''}
- キーポイント: ${referenceData.key_points?.join(', ') || ''}`;
      } else if (dataSource === 'dynamics365' || dataSource === 'salesforce') {
        contextInfo = `CRMデータ:
- 顧客: ${referenceData.customer || '不明'}
- 案件: ${referenceData.project || '不明'}
- ステータス: ${referenceData.status || '不明'}
- 金額: ${referenceData.amount || '不明'}
- 最終更新: ${referenceData.lastUpdate || '不明'}`;
      }
    }

    // 会話履歴から文脈情報を生成
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = `

【現在までの会話履歴】
${conversationHistory.map((h, i) => `
Q${i + 1}: ${h.question}
A${i + 1}: ${h.answer || '（未回答）'}
前回の選択肢: ${h.suggestions?.join('、') || 'なし'}`).join('\n')}

【重要】
- 上記の会話履歴を踏まえた、より具体的で文脈に沿った選択肢を生成してください
- 既に回答された内容を踏まえ、より深い情報を引き出す選択肢を作成
- 過去の選択肢で選ばれなかった項目も参考にして、新しい角度の選択肢を提示`;
    }

    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `あなたは営業日報作成を支援するAIです。営業担当者への質問に対して、参考データと会話履歴に基づいた適切な回答候補を生成してください。

【重要な指示】
1. 質問の文脈と意図を正確に理解し、それに合った選択肢を生成する
2. 参考データがある場合は、そのデータと矛盾しない選択肢を作る
3. 過去の会話履歴がある場合は、その流れを踏まえた自然な選択肢を生成
4. 選択肢は具体的で、営業担当者が選びやすい内容にする
5. 選択肢の文体は質問の文体に合わせる（敬語なら敬語で）
6. 4〜6個の選択肢を生成する

【選択肢の種類】
- 感覚的な評価（よかった、まあまあ、微妙だった等）
- 具体的な事実（提案書を渡した、次回訪問日を決めた等）
- 温度感（前向き、慎重、消極的等）
- 数値的な情報（予算内、予算オーバー、未定等）

【生成ルール】
- 質問が「どうでしたか？」なら感覚的な選択肢を中心に
- 質問が「何をしましたか？」なら具体的な行動を中心に
- 質問が「誰が」なら人物・役職を中心に
- 参考データと整合性を保つ（顧客名、案件名等）
- 会話の流れを考慮し、次のステップに進むような選択肢を作成`
          },
          {
            role: 'user',
            content: `以下の質問に対する回答候補を生成してください。

質問: "${currentQuestion}"

${contextInfo ? `参考データ:
${contextInfo}` : ''}

現在の会話の文脈:
- 顧客: ${currentSlots?.customer || '未確定'}
- 案件: ${currentSlots?.project || '未確定'}
- 場所: ${currentSlots?.location || '未確定'}
${conversationContext}

JSON形式で選択肢の配列を返してください。例:
["とても良い反応でした", "まあまあの反応でした", "少し慎重な様子でした", "かなり消極的でした"]`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );

    let aiResponse = response.data.choices[0].message.content.trim();
    console.log('AI suggestions response:', aiResponse);

    try {
      // マークダウンのコードブロックを除去
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        aiResponse = jsonMatch[1];
      }
      
      // JSONとしてパース
      const suggestions = JSON.parse(aiResponse);
      
      if (Array.isArray(suggestions)) {
        // 複数選択を許可する質問タイプを判定
        const allowMultiple = checkIfMultipleChoiceQuestion(currentQuestion);
        
        res.json({ 
          suggestions: suggestions.slice(0, 6), // 最大6個まで
          allowMultiple // 複数選択可否フラグ
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError);
      console.error('AI Response was:', aiResponse);
      // パースエラーの場合は空の配列を返す
      res.json({ 
        suggestions: [],
        allowMultiple: checkIfMultipleChoiceQuestion(currentQuestion)
      });
    }

  } catch (error) {
    console.error('Suggestions generation error:', error);
    res.status(500).json({ error: '選択肢の生成に失敗しました' });
  }
});

// 複数選択を許可する質問タイプかどうかを判定
function checkIfMultipleChoiceQuestion(question) {
  // 複数選択が適切な質問パターン
  const multipleChoicePatterns = [
    '参加者',
    '出席者',
    'メンバー',
    '誰が',
    '誰と',
    'どのような点',
    'どんな点',
    '興味を示した',
    '関心が高',
    '課題',
    '懸念',
    '心配',
    'リスク',
    '機能',
    '特徴',
    'ポイント',
    '要素',
    '項目'
  ];
  
  // 単一選択が適切な質問パターン
  const singleChoicePatterns = [
    '可能性',
    '確率',
    'パーセント',
    '誰が一番',
    '最も',
    'キーマン',
    'キーパーソン',
    '決定権者'
  ];
  
  // 単一選択パターンが含まれる場合は false
  for (const pattern of singleChoicePatterns) {
    if (question.includes(pattern)) {
      return false;
    }
  }
  
  // 複数選択パターンが含まれる場合は true
  for (const pattern of multipleChoicePatterns) {
    if (question.includes(pattern)) {
      return true;
    }
  }
  
  // デフォルトは複数選択（ユーザーが柔軟に回答できるように）
  return true;
}

// フォールバック選択肢生成は削除 - AIが失敗したらエラーを返す

// 次の質問と選択肢を事前生成する関数
async function preloadNextQuestionAndSuggestions(sessionId, currentIndex, slots, lastAnswer, askedQuestions, referenceData = null, dataSource = null, userId = null, crmType = 'none', conversationHistory = []) {
  try {
    console.log(`Preloading next question for session ${sessionId}, index ${currentIndex + 1}`);
    
    // 実データを取得（userIdが指定されている場合）
    let context = null;
    if (userId) {
      // const [crmData, meetingNotes] = await Promise.all([
      //   questionGenerator.fetchCRMData(userId, crmType),
      //   questionGenerator.fetchMeetingNotes(userId)
      // ]);
      // context = questionGenerator.extractContextFromData(crmData, meetingNotes);
      context = { recentCustomers: [], activeProjects: [] };
    }
    
    // 次の質問を生成
    let nextQuestion;
    let suggestions = [];
    
    if (context && (context.recentCustomers.length > 0 || context.activeProjects.length > 0)) {
      // 実データがある場合はデータ駆動型質問生成
      const nextSlot = REQUIRED_SLOTS.find(slot => !slots[slot]);
      if (nextSlot) {
        // nextQuestion = await questionGenerator.generateQuestionForSlot(nextSlot, context, slots);
        // if (nextQuestion) {
        //   suggestions = await questionGenerator.generateSuggestionsForQuestion(nextQuestion, nextSlot, context) || [];
        // }
        nextQuestion = generateQuestionForSlot(nextSlot, slots);
      }
    }
    
    // データ駆動型で生成できなかった場合は従来の方法
    if (!nextQuestion) {
      const result = await determineNextQuestionWithAI(currentIndex, slots, lastAnswer, askedQuestions);
      if (result.isComplete || !result.nextQuestion) {
        return null;
      }
      nextQuestion = result.nextQuestion;
      
      // 選択肢も生成（参考データがある場合のみ）
      if (referenceData && dataSource) {
        try {
          // 3問目以降は会話履歴を含める
          const historyForSuggestions = currentIndex >= 1 ? conversationHistory : [];
          suggestions = await generateSuggestionsForQuestion(nextQuestion, referenceData, slots, dataSource, historyForSuggestions);
        } catch (error) {
          console.error('Failed to preload suggestions:', error);
          suggestions = [];
        }
      }
    }
    
    // キャッシュに保存
    const cacheKey = `${PRELOAD_CACHE_PREFIX}${sessionId}_${currentIndex + 1}`;
    const preloadData = {
      question: nextQuestion,
      suggestions,
      allowMultiple: checkIfMultipleChoiceQuestion(nextQuestion),
      generatedAt: Date.now()
    };
    
    await redisWrapper.set(
      cacheKey,
      JSON.stringify(preloadData),
      { EX: CACHE_TTL }
    );
    console.log(`Preloaded data cached for ${cacheKey}`);
    
    return preloadData;
  } catch (error) {
    console.error('Preload error:', error);
    return null;
  }
}

// 人物関連の選択肢を生成する専用関数
function generatePersonChoices(referenceData, slots) {
  const choices = [];
  
  // 1. 参加者名がある場合はそれを使用
  const participantNames = [];
  
  // slotsから参加者名を取得
  if (slots?.participants) {
    const names = slots.participants.split(/[,、]/).map(s => s.trim()).filter(s => s);
    participantNames.push(...names);
  }
  
  // referenceDataから参加者名を取得
  if (referenceData) {
    if (referenceData.customer_participants) {
      if (Array.isArray(referenceData.customer_participants)) {
        participantNames.push(...referenceData.customer_participants.map(p => 
          typeof p === 'string' ? p : p.name
        ));
      } else if (typeof referenceData.customer_participants === 'string') {
        participantNames.push(...referenceData.customer_participants.split(/[,、]/).map(s => s.trim()).filter(s => s));
      }
    }
    
    if (referenceData.vendor_participants) {
      if (Array.isArray(referenceData.vendor_participants)) {
        participantNames.push(...referenceData.vendor_participants.map(p => 
          typeof p === 'string' ? p : p.name
        ));
      } else if (typeof referenceData.vendor_participants === 'string') {
        participantNames.push(...referenceData.vendor_participants.split(/[,、]/).map(s => s.trim()).filter(s => s));
      }
    }
    
    if (referenceData.participants && !participantNames.length) {
      if (Array.isArray(referenceData.participants)) {
        participantNames.push(...referenceData.participants);
      } else if (typeof referenceData.participants === 'string') {
        participantNames.push(...referenceData.participants.split(/[,、]/).map(s => s.trim()).filter(s => s));
      }
    }
  }
  
  // 重複を除去
  const uniqueNames = [...new Set(participantNames)];
  
  // 2. 参加者名がある場合はそれを選択肢に
  if (uniqueNames.length > 0) {
    // 最大5名までを選択肢に
    const namesToUse = uniqueNames.slice(0, 5);
    for (const name of namesToUse) {
      // 敬称がない場合は「様」を付ける
      if (!name.includes('様') && !name.includes('さん') && !name.includes('氏')) {
        choices.push(`${name}様`);
      } else {
        choices.push(name);
      }
    }
    
    // 複数名からの選択オプション
    if (uniqueNames.length > 1) {
      choices.push('複数名から質問があった');
    }
  }
  
  // Azure OpenAI APIに選択肢生成を委ねる（ハードコードを削除）
  
  return choices;
}

// 選択肢のみを生成する関数（既存のロジックを切り出し）
async function generateSuggestionsForQuestion(question, referenceData, slots, dataSource, conversationHistory = []) {
  // ハードコードされた人物質問検出を削除し、Azure OpenAI APIに判断を委ねる
  
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

  console.log('Generating suggestions for question:', question);
  console.log('Data source:', dataSource);
  console.log('Reference data available:', !!referenceData);

  if (!endpoint || !apiKey || !deploymentName) {
    console.error('Azure OpenAI configuration missing:', { endpoint: !!endpoint, apiKey: !!apiKey, deploymentName: !!deploymentName });
    throw new Error('Azure OpenAI設定が不足しています');
  }

  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

  // データソースに応じた参考情報の整理
  let contextInfo = '';
  if (referenceData && dataSource === 'meeting') {
    // 議事録に実際の情報がある項目のみを含める
    const infoLines = [];
    if (referenceData.customer) infoLines.push(`- 顧客企業: ${referenceData.customer}`);
    if (referenceData.vendor_company) infoLines.push(`- 自社: ${referenceData.vendor_company}`);
    if (referenceData.project) infoLines.push(`- 案件: ${referenceData.project}`);
    if (referenceData.customer_participants) {
      infoLines.push(`- 顧客側参加者: ${Array.isArray(referenceData.customer_participants) ? referenceData.customer_participants.join(', ') : referenceData.customer_participants}`);
    }
    if (referenceData.vendor_participants) {
      infoLines.push(`- 自社側参加者: ${Array.isArray(referenceData.vendor_participants) ? referenceData.vendor_participants.join(', ') : referenceData.vendor_participants}`);
    }
    if (!referenceData.customer_participants && !referenceData.vendor_participants && referenceData.participants) {
      infoLines.push(`- 参加者: ${referenceData.participants}`);
    }
    if (referenceData.location) infoLines.push(`- 場所: ${referenceData.location}`);
    if (referenceData.budget) infoLines.push(`- 予算: ${referenceData.budget}`);
    if (referenceData.summary) infoLines.push(`- 要約: ${referenceData.summary}`);
    if (referenceData.key_points?.length > 0) infoLines.push(`- キーポイント: ${referenceData.key_points.join(', ')}`);
    
    if (infoLines.length > 0) {
      contextInfo = `議事録の内容:\n${infoLines.join('\n')}`;
    } else {
      contextInfo = '議事録はありますが、具体的な情報は抽出されていません。';
    }
  } else if (referenceData && (dataSource === 'dynamics365' || dataSource === 'salesforce')) {
    // CRMデータも同様に処理
    const infoLines = [];
    if (referenceData.customer) infoLines.push(`- 顧客: ${referenceData.customer}`);
    if (referenceData.project) infoLines.push(`- 案件: ${referenceData.project}`);
    if (referenceData.status) infoLines.push(`- ステータス: ${referenceData.status}`);
    if (referenceData.amount) infoLines.push(`- 金額: ${referenceData.amount}`);
    if (referenceData.lastUpdate) infoLines.push(`- 最終更新: ${referenceData.lastUpdate}`);
    
    if (infoLines.length > 0) {
      contextInfo = `CRMデータ:\n${infoLines.join('\n')}`;
    } else {
      contextInfo = 'CRMデータはありますが、具体的な情報は含まれていません。';
    }
  } else if (!referenceData || !dataSource) {
    contextInfo = '参考データはありません。一般的な営業活動を想定して選択肢を生成します。';
  }

  // CRMデータの場合、参加者情報がないことを確認
  // slotsに参加者情報がある場合も考慮
  const hasParticipantInfo = referenceData?.participants || 
                            referenceData?.customer_participants || 
                            referenceData?.vendor_participants ||
                            slots?.participants;
                            
  const isCRMWithoutParticipants = (dataSource === 'dynamics365' || dataSource === 'salesforce') && 
                                   !hasParticipantInfo;
  
  // 質問の種類を詳細に判定（最大限強化）
  // 「どなたでしたか」を最優先でチェック
  const isWhoQuestion = question.includes('どなたでしたか') || // 最優先パターン
                       question.includes('どなただった') ||
                       question.includes('誰でしたか') ||
                       question.includes('誰だった') ||
                       question.includes('誰が') || 
                       question.includes('どなた') ||
                       question.includes('どちらの方') ||
                       question.includes('どの方') ||
                       question.includes('参加された') ||
                       question.includes('参加者') ||
                       question.includes('どんな方') ||
                       question.includes('お名前') ||
                       question.includes('役職') ||
                       question.includes('担当者') ||
                       question.includes('責任者') ||
                       question.includes('キーマン') ||
                       question.includes('キーパーソン') ||
                       question.includes('決裁者') ||
                       question.includes('決定権') ||
                       question.includes('影響力がありそうな方') ||
                       question.includes('中心となる方') ||
                       question.includes('主導されている方') ||
                       (question.includes('質問') && question.includes('方')) ||
                       (question.includes('関心') && question.includes('方')) ||
                       (question.includes('興味') && question.includes('方')) ||
                       (question.includes('反応') && question.includes('方')) ||
                       (question.includes('意見') && question.includes('方')) ||
                       (question.includes('積極的') && question.includes('方')) ||
                       (question.includes('乗り気') && (question.includes('方') || question.includes('だった'))) ||
                       (question.includes('慎重') && (question.includes('方') || question.includes('だった'))) ||
                       (question.includes('前向き') && (question.includes('方') || question.includes('だった'))) ||
                       (question.includes('否定的') && (question.includes('方') || question.includes('だった'))) ||
                       (question.includes('参加者の中で') && (question.includes('最も') || question.includes('逆に'))) ||
                       (question.includes('の中で') && question.includes('方') && (question.includes('最も') || question.includes('特に'))) ||
                       question.match(/その方.*?(どのような|どんな|何の).*?(役職|立場|部門|部署)/);
  
  const isAtmosphereQuestion = question.includes('雰囲気') || 
                               question.includes('感触') || 
                               question.includes('様子') || 
                               question.includes('いかが') ||
                               question.includes('どうでした') ||
                               question.includes('お疲れ様');
  
  const isSpecificQuestion = question.includes('どのような') ||
                            question.includes('具体的') ||
                            question.includes('特に') ||
                            question.includes('詳しく') ||
                            question.includes('シーン') ||
                            question.includes('用途') ||
                            question.includes('イメージ');
  
  // 「誰が」質問の場合は具体的内容として扱わない
  const treatAsSpecificQuestion = isSpecificQuestion && !isWhoQuestion;

  // ハードコードされた人物質問検出を削除
  // Azure OpenAI APIに選択肢生成を委ねる
  
  let adjustedQuestion = question;

  const response = await axios.post(
    url,
    {
      messages: [
        {
          role: 'system',
          content: `あなたは営業日報作成を支援する専門AIです。営業担当者への質問に対して、データソースに応じた適切な回答候補を生成してください。

## データソース別の選択肢生成ルール

${dataSource === 'meeting' ? `
### 【議事録モード】
議事録から抽出した情報を最大限活用して、具体的で実用的な選択肢を生成してください。

**選択肢生成の原則：**
1. 議事録に含まれる具体的な単語やフレーズを活用
2. キーポイントがある場合は、それを選択肢に反映
3. 要約に含まれる重要な内容を選択肢に組み込む
4. 「興味を示された」「関心が高かった」などの質問には、議事録の内容から推測される具体的な機能や側面を選択肢にする
5. 議事録の実際の内容に基づいて選択肢を生成（架空の内容は含めない）
` : ''}

${dataSource === 'dynamics365' || dataSource === 'salesforce' ? `
### 【CRMデータモード】
${isCRMWithoutParticipants && isWhoQuestion ? `
**【重要】CRMデータに参加者情報がありません。**
- 参加者を特定する選択肢は生成しない
- 代わりに全体的な反応や雰囲気に関する選択肢を生成
- 「全体的に前向きな反応だった」
- 「技術面での質問が多かった」
- 「予算について慎重な姿勢だった」
- 「具体的な導入時期の話が出た」
` : isSpecificQuestion ? `
**具体的内容の質問の場合：**
- 案件や機能の内容に焦点を当てた選択肢を生成
- 顧客名は使うが、特定の人物への言及は避ける
- 「予算面での懸念が示された」「技術要件が明確化された」など
` : `
**雰囲気・感触の質問の場合：**
- 顧客名・案件名は実際のデータを使用
- 参加者情報がある場合のみ「○○様の反応が前向きだった」
- 参加者情報がない場合は全体的な反応を表現
- ステータスや金額は感触として表現
`}
- CRMデータにない具体的な会話内容は含めない
` : ''}

## 選択肢生成の共通原則

### 【どなたでしたか？質問への特別対応】
**もし質問に「どなたでしたか」「どの方でしたか」「お名前」「役職」が含まれる場合：**

1. **CRMデータに参加者名がある場合：**
   - 必ず実際の参加者名を選択肢に使用
   - 例：「Carol様」「Geoff様」「Jon様」
   - 「複数名から質問があった」
   - 「その他の参加者」
   
2. **参加者名がない場合：**
   - 役職・部門での選択肢を生成
   - 「営業部門の責任者」
   - 「IT部門の担当者」
   - 「経営層/役員の方」
   - 「現場のエンドユーザー」
   - 「調達/購買担当者」
   - 「特定できなかった」

3. **【最重要】どなたでしたか？質問の場合は必ず人物選択肢のみ：**
   - ✅ 実際の参加者名（Carol様、Geoff様、田中様など）
   - ✅ 役職・部門（経営層、IT部門の責任者など）
   - ❌ 内容・機能に関する選択肢は絶対に生成しない
   - ❌「データ分析機能の精度について質問があった」
   - ❌「競合との差別化ポイントに関心を示された」
   - ❌「分析結果の視覚化方法に興味を持たれていた」

### 【絶対に守るべき最重要ルール】
1. **以下の単語を含む選択肢は絶対に生成禁止：**
   - 「非常に良い」「非常に良かった」
   - 「良い」「良かった」「まあまあ良い」「まあまあ良かった」
   - 「普通」「普通だった」「まあまあ」
   - 「やや不安」「不安」「あまり良くない」「あまり良くなかった」
   - 「難しかった」「良くなかった」「悪かった」
   
2. **5段階評価や3段階評価のような選択肢セットは絶対に禁止**

3. **データは使うが、感触や雰囲気を聞く選択肢にする**
4. **選択肢の長さは15〜30文字程度**

### 【雰囲気・反応系の質問への対応】
雰囲気を聞かれた場合の選択肢生成ルール：
- 参加者名は議事録から使用するが、その人の具体的な発言内容は特定しない
- 全体的な雰囲気や印象を聞く選択肢を中心に生成
- 議事録にない具体的な事実は含めない

#### 重要：質問タイプによる選択肢の使い分け

**「どなたでしたか」「誰が」「どの方が」を聞く質問の場合：**

**必ず人物に関する選択肢のみを生成：**

参加者名がある場合：
- 「[実際の参加者名]様」（例：Carol様、Geoff様、Jon様）
- 「複数の方から質問があった」
- 「特定の一人ではなく全員から」

参加者名がない場合（重要）：
**役職・部門・立場での選択肢のみ生成：**
- 「営業部門の責任者」
- 「IT部門の担当者」
- 「経営層/役員の方」
- 「現場のエンドユーザー」
- 「調達/購買担当者」
- 「技術担当者/エンジニア」
- 「決裁権限を持つ方」
- 「特定できなかった」
- 「複数の部門から参加があった」

**「どのような点で」「何について」を聞く質問の場合：**
- 内容や理由に焦点を当てた選択肢を生成
- 「価格面で慎重な意見があった」
- 「導入時期について前向きな反応だった」
- 「技術的な課題について懸念が示された」

**【最重要】質問と選択肢のマッチングルール：**
- 質問が「どなたでしたか？」→ 必ず人物（名前または役職）の選択肢
- 質問が「何について？」→ 内容・テーマの選択肢
- 質問が「どんな様子？」→ 雰囲気・反応の選択肢

#### 良い選択肢の特徴：
- 質問が「誰が」で参加者名あり → 参加者名を含む選択肢
- 質問が「誰が」で参加者名なし → 役職/立場または「判別できない」系の選択肢
- 質問が「何について」なら → 内容に焦点を当てた選択肢
- 質問が「どんな様子」なら → 雰囲気や感触の選択肢

#### 避けるべき選択肢：
- 参加者名がないのに「誰が」質問で内容だけの選択肢
- 質問と選択肢のミスマッチ
- 議事録にない具体的行動や発言の断定

❌ 絶対に生成してはいけない例（これらは禁止）：
- 「非常に良い」「非常に良かった」
- 「良い」「良かった」「まあまあ良かった」
- 「普通」「普通だった」「まあまあ」
- 「やや不安」「不安」
- 「難しかった」「良くなかった」「悪かった」

### 【データ活用の最重要ルール】

#### 議事録データの場合：

**雰囲気・感触を聞く質問の場合：**
- 顧客側参加者（customer_participants）→ 実名に「様」を付けて使用
- 自社側参加者（vendor_participants）→ 実名を敬称なしで使用
- ✅「[顧客側の実名]様が前向きな様子だった」
- ✅「[顧客側の実名]様から質問が多かった」

**具体的内容を聞く質問の場合：**
- 参加者名は使用しない（誰が言ったかは明示しない）
- ✅「現場管理での活用を想定されていた」
- ✅「色分けの明確化を重視されていた」
- ❌「[名前]様は現場管理での活用を想定」（名前を使わない）
- ❌「[名前]様が色分けの明確化を重視」（名前を使わない）

#### CRMデータ（Dynamics365/Salesforce）の場合：
**顧客名・案件名は実際のデータを使用：**
- 顧客名がある場合 → 「[顧客名]様が前向きだった」
- 案件名がある場合 → 「[案件名]について関心が高かった」
- ステータス情報 → 感触として表現「進展している感触だった」

**選択肢の内容は感触・雰囲気に留める：**
- ✅「[顧客名]様の反応が前向きだった」
- ✅「[案件名]への期待感があった」
- ✅「予算について前向きな感触」
- ❌「[顧客名]様が○○機能を評価した」（CRMにない具体的内容）

その他の活用ポイント：
- 議題があれば → 「○○について詳しく聞かれた」
- キーポイントがあれば → 「○○の点で評価が高かった」
- 案件名があれば → 「○○案件の優先度を上げたいとのこと」
- 顧客企業と自社が明確な場合 → 顧客側の反応を中心に選択肢を生成

### 【議事録データがない/不足している場合】
- 一般的な営業活動を想定した選択肢を生成
- 業界や顧客タイプを特定しない汎用的な内容
- ただし、5段階評価のような単純な選択肢は絶対に避ける
- 具体的な反応や状況を想定した選択肢を作成

### 【選択肢のバリエーション】
同じ「前向き」でも異なる表現：
- 「具体的な質問が多く前向き」
- 「社内稟議の話まで進んだ」
- 「他部署も巻き込みたい様子」
- 「デモの追加実施を希望」
        }
4. 4〜5個の選択肢を生成する

【絶対に守るべきルール - 参加者名の取り扱い】
1. 参加者名の優先使用ルール：
   - **customer_participants や vendor_participants に実名がある場合は必ず使用**
   - 実名がある場合は、役職名（部長、課長など）での表現は避ける
   - 顧客側の名前には「様」を付ける、自社側は敬称なし

2. 名前がない場合のみ役職・部署で表現：
   - 参加者名が不明な場合のみ：「営業部門の方」「技術部門の方」「経営層の方」を使用
   - 架空の人名（田中様、佐藤様など）は絶対に創作しない

3. 実名使用の原則：
   - **「どなたでしたか？」質問で名前がある場合は必ず実名を使用**
   - customer_participantsに名前がある場合 → その実名に「様」を付けて使用
   - vendor_participantsに名前がある場合 → その実名を敬称なしで使用（自社側のため）
   - 参加者の実名がデータにある場合は、役職や部署名での表現は避ける
   - 実名がない場合のみ「営業部門の方」「技術部門の方」などの一般的表現を使用
   - **決して内容に関する選択肢を「どなたでしたか？」質問で生成しない**

JSON形式で選択肢の配列のみを返してください。説明は不要です。`
        },
        {
          role: 'user',
          content: `質問: "${adjustedQuestion}"
${contextInfo ? `\n参考データ:\n${contextInfo}` : ''}
${referenceData || slots ? `\n利用可能な具体的情報:\n${JSON.stringify({
  顧客名: referenceData?.customer || slots?.customer || null,
  顧客側参加者: referenceData?.customer_participants || null,
  自社側参加者: referenceData?.vendor_participants || null,
  参加者: referenceData?.participants || slots?.participants || null,
  案件名: referenceData?.project || slots?.project || null,
  場所: referenceData?.location || slots?.location || null,
  議題: referenceData?.agenda || null,
  キーポイント: referenceData?.key_points || null,
  要約: referenceData?.summary || null
}, null, 2)}` : ''}

現在の文脈:
- 顧客: ${slots?.customer || '未確定'}
- 案件: ${slots?.project || '未確定'}
- データソース: ${dataSource || 'なし'}
${conversationHistory && conversationHistory.length > 0 ? `

【現在までの会話履歴】
${conversationHistory.slice(-3).map((h, i) => `Q${i + 1}: ${h.question}
A${i + 1}: ${h.answer || '（未回答）'}`).join('\n')}

【重要】上記の会話履歴を踏まえ、より具体的で文脈に沿った選択肢を生成してください。` : ''}

【必須要件】
1. 以下の禁止ワードを含む選択肢は絶対に生成しない
2. 雰囲気の質問でも、必ず具体的な反応や状況を含める
3. 議事録やCRMデータの内容を必ず反映させる（特に顧客名、案件名、参加者、予算）
4. 4〜6個の選択肢を生成
5. 各選択肢は15〜30文字程度で具体的に
6. 5段階評価のような選択肢セットは絶対に作らない

【絶対禁止ワード（これらを含む選択肢は生成しない）】
「非常に良い」「非常に良かった」「良い」「良かった」「普通」「普通だった」「やや不安」「不安」「難しかった」「とても良かった」「まあまあ良かった」「あまり良くなかった」「良くなかった」「まあまあ」「悪かった」

【最重要ルール - 参加者名の使用】
${isWhoQuestion ? `
**【最重要】この質問は「誰が」を聞いています。**
${isCRMWithoutParticipants ? `
**CRMデータに参加者情報がありません。参加者を特定する選択肢は避け、全体的な反応や内容に関する選択肢を生成してください：**
- 「全体的に前向きな雰囲気だった」
- 「技術面での質問が多く関心の高さを感じた」
- 「予算について慎重な検討が必要な様子だった」
- 「導入時期について具体的な話が出た」
- 「他部署との連携を重視する姿勢だった」
` : hasParticipantInfo ? `
参加者名が判明しているので、必ず参加者名を含む選択肢を生成してください：
参加者: ${referenceData?.participants || slots?.participants || ''}
${slots?.participants ? (() => {
  // participantsが文字列か配列かを判定
  let participantsList = [];
  if (typeof slots.participants === 'string') {
    participantsList = slots.participants.split(', ');
  } else if (Array.isArray(slots.participants)) {
    participantsList = slots.participants.map(p => typeof p === 'object' ? p.name : p);
  }
  
  if (participantsList.length > 0) {
    return `
具体的な参加者名（${participantsList.join(', ')}）を使った選択肢を生成：
- 「${participantsList[0]}さんが特に前向きだった」
- 「${participantsList[1] || '技術担当の方'}さんから詳細な質問があった」
- 「${participantsList[2] || '決裁権限者'}さんは慎重な姿勢だった」
`;
  }
  return '';
})() : ''}
- 「[実際の参加者名]様が特に前向きだった」
- 「[実際の参加者名]様は慎重な姿勢だった」
- 「[実際の参加者名]様から積極的な質問があった」
- 「全員が比較的前向きだった」
- 「特に目立った人はいなかった」
` : `
参加者名が不明なので、役職や立場での選択肢、または「判別できない」系の選択肢を生成してください：
- 「決裁権限を持つ方が前向きな姿勢を示した」
- 「技術担当の方から詳細な質問があった」
- 「現場の方が実用性を評価していた」
- 「管理職層が慎重な姿勢だった」
- 「全体的に前向きな雰囲気だった」
- 「特定の人物というより全員が慎重だった」
- 「役職や立場は判別できなかったが、積極的な方がいた」
`}
` : treatAsSpecificQuestion ? `
**この質問は具体的な内容を聞いているため、参加者名は使用しません**
- 「現場管理での活用を想定されていた」（誰がとは書かない）
- 「色分けの明確化を重視されていた」（誰がとは書かない）
- 「技術面での詳細な質問があった」（誰からとは書かない）
` : `
${referenceData?.customer_participants ? `
顧客側参加者が判明しています: ${Array.isArray(referenceData.customer_participants) ? 
  referenceData.customer_participants.map(p => typeof p === 'object' && p.name ? p.name : p).join(', ') : 
  referenceData.customer_participants}
雰囲気・感触の質問なので、これらの実名を選択肢に含めてください。顧客側の名前には「様」を付けて使用してください。
` : ''}
${referenceData?.vendor_participants ? `
自社側参加者が判明しています: ${Array.isArray(referenceData.vendor_participants) ? 
  referenceData.vendor_participants.map(p => typeof p === 'object' && p.name ? p.name : p).join(', ') : 
  referenceData.vendor_participants}
` : ''}
`}

【重要】議事録にある以下の情報を積極的に使って具体的な選択肢を作る：
- 顧客名: ${referenceData?.customer || '不明'}
- 案件名: ${referenceData?.project || '不明'}
- 予算: ${referenceData?.budget || '不明'}
${referenceData?.customer_participants || referenceData?.vendor_participants ? '- 参加者の実名を必ず使用すること' : ''}

架空の人名は使用禁止。実際のデータにある名前のみ使用。JSON配列で返してください。`
        }
      ],
      max_tokens: 600,
      temperature: 0.8
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      }
    }
  );

  let aiResponse = response.data.choices[0].message.content.trim();
  console.log('AI generated suggestions response:', aiResponse);
  
  // マークダウンのコードブロックを除去
  if (aiResponse.includes('```')) {
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  
  try {
    const suggestions = JSON.parse(aiResponse);
    if (Array.isArray(suggestions)) {
      console.log('Successfully parsed suggestions:', suggestions);
      return suggestions.slice(0, 6);
    } else {
      console.error('Parsed result is not an array:', suggestions);
      throw new Error('AIが配列形式で回答を生成しませんでした');
    }
  } catch (error) {
    console.error('Failed to parse suggestions:', error);
    console.error('Raw AI response:', aiResponse);
    throw new Error('AI選択肢の生成に失敗しました');
  }
}

// 先読み機能付きの回答処理（既存のエンドポイントを修正）
router.post('/hearing/answer', authMiddleware, async (req, res) => {
  try {
    const { sessionId, questionIndex, answer, currentSlots = {}, askedQuestions = [], referenceData = null, dataSource = null, crmType = 'none' } = req.body;

    // CRMデータから初期スロットを再構築（初回の質問への回答時）
    let baseSlots = { ...currentSlots };
    if (questionIndex === 0 && referenceData) {
      // 参加者情報の抽出（初回質問への回答時のみ）
      if (!baseSlots.participants && (referenceData.meetingContext || referenceData.selectedNotes)) {
        const participantNames = [];
        const contextText = referenceData.meetingContext || '';
        const notesText = referenceData.selectedNotes?.map(n => n.noteText || '').join(' ') || '';
        const allText = `${contextText} ${notesText}`;
        
        // 英語名のパターン
        const englishNamePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
        const englishMatches = allText.matchAll(englishNamePattern);
        for (const match of englishMatches) {
          const name = match[1];
          if (!['Sample', 'Global', 'Media', 'Account', 'Strategy'].includes(name) && !participantNames.includes(name)) {
            participantNames.push(name);
          }
        }
        
        if (participantNames.length > 0) {
          baseSlots.participants = participantNames.join(', ');
          console.log('Extracted participants for answer processing:', baseSlots.participants);
        }
      }
    }

    // 回答からスロット情報を動的に抽出
    const updatedSlots = { ...baseSlots };
    
    // AIを使ってスロット情報を抽出（質問コンテキストも渡す）
    const lastQuestion = askedQuestions.length > 0 ? askedQuestions[askedQuestions.length - 1] : '';
    const extractedInfo = await extractInformationWithAI(answer, updatedSlots, lastQuestion);
    
    // 抽出された情報をスロットに追加（上書きも許可）
    Object.keys(extractedInfo).forEach(key => {
      if (extractedInfo[key]) {
        // customer_personは特別処理（participantsに含める）
        if (key === 'customer_person') {
          if (!updatedSlots.participants || !updatedSlots.participants.includes(extractedInfo[key])) {
            updatedSlots.participants = updatedSlots.participants 
              ? `${updatedSlots.participants}, ${extractedInfo[key]}` 
              : extractedInfo[key];
          }
        // projectとlocationは常に最新の情報で更新
        } else if (key === 'project' || key === 'location') {
          updatedSlots[key] = extractedInfo[key];
        } else if (!updatedSlots[key]) {
          // その他のスロットは既存の値がない場合のみ更新
          updatedSlots[key] = extractedInfo[key];
        }
      }
    });
    
    // 最初の質問の回答は要約として保存
    if (questionIndex === 0) {
      updatedSlots.summary = answer;
    }

    // 質問数の強制制限チェック（5問を超えないように）
    if (questionIndex >= 4) {
      console.log(`Force completion at question ${questionIndex + 1} - maximum reached`);
      return res.json({
        sessionId,
        completed: true,
        slots: updatedSlots,
        message: "ヒアリングが完了しました。お疲れ様でした！"
      });
    }

    // キャッシュから先読みデータを取得
    let nextQuestion, isComplete;
    let cachedSuggestions = [];
    const cacheKey = `${PRELOAD_CACHE_PREFIX}${sessionId}_${questionIndex + 1}`;
    
    let allowMultiple = false;
    const cachedDataStr = await redisWrapper.get(cacheKey);
    if (cachedDataStr) {
      const cached = JSON.parse(cachedDataStr);
      console.log(`Using preloaded data for ${cacheKey}`);
      nextQuestion = cached.question;
      cachedSuggestions = cached.suggestions || [];
      allowMultiple = cached.allowMultiple || false;
      // キャッシュを使用したら削除
      await redisWrapper.del(cacheKey);
    } else {
      // キャッシュがない場合は通常の生成
      const result = await determineNextQuestionWithAI(questionIndex, updatedSlots, answer, askedQuestions);
      nextQuestion = result.nextQuestion;
      isComplete = result.isComplete;
      allowMultiple = checkIfMultipleChoiceQuestion(nextQuestion);
    }
    
    console.log('AI determination result:', { nextQuestion, isComplete, questionIndex });
    
    if (isComplete || !nextQuestion) {
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
    
    // 現在+2番目の質問を先読み（非同期で実行）
    // 例: 現在Q1に回答中ならQ3を生成、Q2に回答中ならQ4を生成
    const nextToPreloadIndex = questionIndex + 2;
    if (nextToPreloadIndex <= 4) { // 最大質問数以内の場合
      setImmediate(() => {
        // 会話履歴を構築
        const conversationHistory = [];
        for (let i = 0; i <= questionIndex; i++) {
          if (askedQuestions[i]) {
            conversationHistory.push({
              question: askedQuestions[i],
              answer: i === questionIndex ? answer : '' // 現在の回答を含める
            });
          }
        }
        
        preloadNextQuestionAndSuggestions(
          sessionId, 
          questionIndex + 1, // 現在+1の情報を使って
          updatedSlots, 
          answer, 
          updatedAskedQuestions,
          referenceData,
          dataSource,
          req.userId,  // userIdを追加
          crmType,     // crmTypeを追加
          conversationHistory // 会話履歴を追加
        ).then(async (result) => {
          if (result) {
            // 現在+2の位置にキャッシュ
            const cacheKey = `${PRELOAD_CACHE_PREFIX}${sessionId}_${nextToPreloadIndex}`;
            await redisWrapper.set(
              cacheKey,
              JSON.stringify(result),
              { EX: CACHE_TTL }
            );
            console.log(`Pre-generated Q${nextToPreloadIndex + 1} and cached at ${cacheKey}`);
          }
        });
      });
    }
    
    // 次の質問を返す
    res.json({
      sessionId,
      question: nextQuestion,
      questionIndex: questionIndex + 1,
      totalQuestions: 5,
      slots: updatedSlots,
      askedQuestions: updatedAskedQuestions,
      suggestions: cachedSuggestions, // キャッシュされた選択肢があれば返す
      allowMultiple // 複数選択フラグ
    });
  } catch (error) {
    console.error('Process answer error:', error);
    res.status(500).json({ error: '回答の処理に失敗しました' });
  }
});

// AI補正エンドポイント（日報全体用）
router.post('/correct-report', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'テキストが必要です' });
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

    if (!endpoint || !apiKey || !deploymentName) {
      return res.status(500).json({ error: 'Azure OpenAI設定が不足しています' });
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `あなたは営業日報の補正を行うAIアシスタントです。
以下のルールに従って日報の内容を補正してください：

1. 誤字脱字の修正
2. 文法的な誤りの修正
3. 不適切な表現の修正
4. 情報の整理と構造化
5. 曖昧な表現の明確化
6. 固有名詞の表記統一

出力はJSON形式で、以下のスロットに分けて返してください：
{
  "correctedSlots": {
    "customer": "顧客名",
    "project": "案件名",
    "next_action": "次のアクション（カンマ区切り）",
    "budget": "予算",
    "schedule": "スケジュール",
    "location": "場所",
    "issues": "課題（カンマ区切り）",
    "participants": "参加者（カンマ区切り）",
    "industry": "業界"
  }
}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(aiResponse);
      res.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // フォールバックとして元のテキストを返す
      res.json({
        correctedSlots: {
          customer: '',
          project: '',
          next_action: '',
          budget: '',
          schedule: '',
          location: '',
          issues: '',
          participants: '',
          industry: ''
        }
      });
    }
  } catch (error) {
    console.error('Report correction error:', error);
    res.status(500).json({ error: 'AI補正に失敗しました' });
  }
});

module.exports = router;