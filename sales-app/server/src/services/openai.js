const axios = require('axios');
const pool = require('../db/pool');

// Azure OpenAI設定（環境変数から取得）
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';

// OpenAI API呼び出し
async function callOpenAI(prompt, model = 'gpt-4', options = {}) {
  try {
    const temperature = options.temperature || 0.7;
    const responseFormat = options.response_format;

    console.log('Azure OpenAI Config:', {
      hasEndpoint: !!AZURE_OPENAI_ENDPOINT,
      hasKey: !!AZURE_OPENAI_KEY,
      deployment: AZURE_OPENAI_DEPLOYMENT,
      apiVersion: AZURE_OPENAI_API_VERSION,
      responseFormat: responseFormat?.type
    });

    // Azure OpenAIを使用する場合
    if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_KEY) {
      console.log('Using Azure OpenAI API for script generation');
      return await callAzureOpenAI(prompt, temperature, responseFormat);
    }

    // 開発環境用のモックレスポンス
    console.log('OpenAI Mock Mode - Prompt:', prompt.substring(0, 200));
    return await getMockResponse(prompt);

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

// Azure OpenAI API呼び出し
async function callAzureOpenAI(prompt, temperature = 0.7, responseFormat = null) {
  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  try {
    const requestBody = {
      messages: [
        {
          role: 'system',
          content: 'あなたは営業支援のエキスパートです。日本のビジネス文化に精通し、効果的な営業トークスクリプトを作成できます。重要：個人名は一切使用せず、会社名様または御社という表現を使用してください。参加者の個人名も記載しないでください。JSON形式での出力を求められた場合は、必ず有効なJSONオブジェクトのみを返してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: 2000,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    // response_formatが指定されている場合は追加
    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }

    const response = await axios.post(
      url,
      requestBody,
      {
        headers: {
          'api-key': AZURE_OPENAI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Azure OpenAI API error:', error.response?.data || error.message);
    throw error;
  }
}

// モックレスポンス生成（開発用）
async function getMockResponse(prompt) {
  // トークスクリプト生成の場合
  if (prompt.includes('営業トークスクリプト')) {
    // プロンプトから情報を抽出
    const purposeMatch = prompt.match(/【(.+?)】に最適化された/);
    const customerMatch = prompt.match(/顧客: (.+)/);
    const projectMatch = prompt.match(/案件: (.+)/);
    const issuesMatch = prompt.match(/課題: (.+)/);
    const nextActionMatch = prompt.match(/次アクション: (.+)/);
    
    const visitPurpose = purposeMatch ? purposeMatch[1] : 'フォローアップ';
    const customer = customerMatch ? customerMatch[1].trim() : '御社';
    const project = projectMatch ? projectMatch[1].trim() : '案件';
    const issues = issuesMatch ? issuesMatch[1].trim() : '課題';
    const nextAction = nextActionMatch ? nextActionMatch[1].trim() : '次のステップ';

    const script = await generatePurposeBasedScript(visitPurpose, customer, project, issues, nextAction);
    return JSON.stringify(script);
  }

  // AIヒアリング応答の場合
  if (prompt.includes('共感') || prompt.includes('フォローアップ')) {
    return "なるほど、それは大変でしたね。もう少し詳しくお聞かせいただけますか？";
  }

  // デフォルトのレスポンス
  return "ご質問ありがとうございます。詳しくお答えさせていただきます。";
}

// データベースからテンプレートを取得
async function getTemplateFromDatabase(visitPurpose, industry = null) {
  try {
    const query = `
      SELECT * FROM script_templates 
      WHERE sales_stage = $1 
      ${industry ? 'AND (industry = $2 OR industry IS NULL)' : 'AND industry IS NULL'}
      AND is_public = true
      ORDER BY avg_success_rate DESC NULLS LAST, usage_count DESC
      LIMIT 1
    `;
    const params = industry ? [visitPurpose, industry] : [visitPurpose];
    const result = await pool.query(query, params);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching template from database:', error);
    return null;
  }
}

// 訪問目的に応じたスクリプト生成
async function generatePurposeBasedScript(visitPurpose, customer, project, issues, nextAction) {
  // まずデータベースからテンプレートを取得
  const dbTemplate = await getTemplateFromDatabase(visitPurpose);
  
  if (dbTemplate && dbTemplate.template_sections) {
    // データベースのテンプレートを使用して動的に生成
    const template = typeof dbTemplate.template_sections === 'string' 
      ? JSON.parse(dbTemplate.template_sections) 
      : dbTemplate.template_sections;
    
    // 変数を置換（文法的に自然な日本語になるよう調整）
    const replaceVariables = (text) => {
      if (typeof text !== 'string') return text;
      
      // プロジェクトとアクションを適切に処理
      let processedText = text;
      
      // 顧客名の置換
      processedText = processedText.replace(/\{\{customer\}\}/g, 
        customer !== '未設定' ? customer : '御社');
      
      // プロジェクトの置換（「の件」「について」などの文脈に応じて）
      if (project !== '未設定' && project) {
        // 「{{project}}の件について」パターン
        processedText = processedText.replace(/\{\{project\}\}の件/g, 
          `${project}の件`);
        // 「{{project}}に関して」パターン  
        processedText = processedText.replace(/\{\{project\}\}に関して/g, 
          `${project}に関して`);
        // 「{{project}}について」パターン
        processedText = processedText.replace(/\{\{project\}\}について/g, 
          `${project}について`);
        // その他の{{project}}
        processedText = processedText.replace(/\{\{project\}\}/g, project);
      } else {
        processedText = processedText.replace(/\{\{project\}\}/g, 'ご相談の件');
      }
      
      // 課題の置換（文法的に自然になるよう調整）
      if (issues !== '特になし' && issues !== '未設定' && issues) {
        // 「{{issues}}について」パターンの場合、課題をそのまま使用
        processedText = processedText.replace(/\{\{issues\}\}について/g, 
          `${issues}という点について`);
        // 「{{issues}}の解決」パターン
        processedText = processedText.replace(/\{\{issues\}\}の解決/g, 
          `${issues}という課題の解決`);
        // その他の{{issues}}
        processedText = processedText.replace(/\{\{issues\}\}/g, 
          `${issues}という課題`);
      } else {
        processedText = processedText.replace(/\{\{issues\}\}/g, 'ご相談いただいた課題');
      }
      
      // 次のアクションの置換（動詞として自然に）
      if (nextAction !== '未設定' && nextAction) {
        // 「{{nextAction}}を確認」パターン
        processedText = processedText.replace(/\{\{nextAction\}\}を確認/g, 
          `${nextAction}という点を確認`);
        // 「{{nextAction}}について」パターン  
        processedText = processedText.replace(/\{\{nextAction\}\}について/g, 
          `${nextAction}ことについて`);
        // その他の{{nextAction}}
        processedText = processedText.replace(/\{\{nextAction\}\}/g, nextAction);
      } else {
        processedText = processedText.replace(/\{\{nextAction\}\}/g, '次のステップ');
      }
      
      return processedText;
    };
    
    // テンプレート内の全ての文字列を再帰的に置換
    const processTemplate = (obj) => {
      if (typeof obj === 'string') {
        return replaceVariables(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(item => processTemplate(item));
      } else if (typeof obj === 'object' && obj !== null) {
        const result = {};
        for (const key in obj) {
          result[key] = processTemplate(obj[key]);
        }
        return result;
      }
      return obj;
    };
    
    return processTemplate(template);
  }
  
  // データベースにテンプレートがない場合はデフォルトを生成
  const baseScript = {
    opening: {},
    needs_discovery: {},
    value_proposition: {},
    objection_handling: {},
    closing: {}
  };

  switch (visitPurpose) {
    case '初回訪問':
      return {
        ...baseScript,
        opening: {
          main: `はじめまして。本日はお忙しい中、お時間をいただきありがとうございます。${customer !== '未設定' ? customer + '様の' : '御社の'}事業について、まずはお聞かせいただければと思います。`,
          alternatives: [
            "初めてお伺いさせていただきます。本日はよろしくお願いいたします。",
            "お時間をいただきありがとうございます。御社のお役に立てることがないか、まずはお話を伺わせてください。"
          ],
          key_points: [
            "第一印象を大切に、信頼関係の構築を重視",
            "会社紹介は簡潔に、顧客の話を聞く姿勢を示す",
            "オープンクエスチョンで幅広く情報収集"
          ]
        },
        needs_discovery: {
          questions: [
            "御社の事業内容について、改めてお聞かせいただけますでしょうか？",
            "現在、どのような課題や目標をお持ちでしょうか？",
            "競合他社と比較して、差別化されている点はどちらになりますか？",
            "今後の事業展開について、どのようなビジョンをお持ちですか？",
            "現在お使いのシステムやサービスで、改善したい点はございますか？"
          ],
          response_patterns: {
            "課題が不明確": "なるほど、様々な観点があるかと思いますが、特に優先度が高いものはどちらになりますか？",
            "決裁プロセス確認": "このような導入案件の場合、通常どのような流れで検討されることが多いですか？",
            "予算感の探り": "参考までに、このような投資はどの程度の規模感をイメージされていますか？"
          }
        }
      };

    case '提案':
      return {
        ...baseScript,
        opening: {
          main: `お忙しい中、お時間をいただきありがとうございます。前回${customer !== '未設定' ? customer + '様で' : ''}お伺いした${issues !== '未設定' ? issues : '課題'}の解決に向けて、具体的なご提案をお持ちしました。`,
          alternatives: [
            `本日は、${project !== '未設定' ? project : '案件'}について、詳細なプランをご説明させていただきます。`,
            "前回のお話を踏まえて、最適なソリューションをご用意させていただきました。"
          ],
          key_points: [
            "提案の全体像を最初に示す",
            "期待値の設定と本日のゴールの明確化",
            "前回の課題との紐付けを明確に"
          ]
        },
        needs_discovery: {
          questions: [
            "ご提案の前に、前回から何か状況の変化はございましたか？",
            "優先的に解決したい課題の順位に変更はございませんか？",
            "導入時期について、具体的なご希望はございますか？"
          ],
          response_patterns: {
            "詳細確認": "その点について、もう少し詳しくお聞かせいただけますか？",
            "懸念事項": "ご心配な点について、詳しくご説明させていただきます。"
          }
        }
      };

    case 'クロージング':
      return {
        ...baseScript,
        opening: {
          main: `本日は最終的なご判断をいただく機会をいただき、ありがとうございます。${project !== '未設定' ? project + 'について' : ''}これまでの内容を整理させていただきます。`,
          alternatives: [
            "いよいよ決定の段階ですね。最終確認をさせていただければと思います。",
            "ご検討いただきありがとうございます。本日、前向きなお返事をいただければ幸いです。"
          ],
          key_points: [
            "決断を促す雰囲気作り",
            "これまでの合意事項の確認",
            "残る懸念の完全解消"
          ]
        },
        needs_discovery: {
          questions: [
            "ご検討いただく中で、まだ不明な点はございますか？",
            "導入にあたって、最後に確認したい点はございますか？",
            "社内での合意形成について、何かサポートが必要でしょうか？"
          ],
          response_patterns: {
            "最終懸念": "その点は重要ですね。具体的にどのような対応をご希望でしょうか？",
            "条件交渉": "ご要望を踏まえて、どのような条件であれば前に進められそうでしょうか？"
          }
        }
      };

    case '価格交渉':
      return {
        ...baseScript,
        opening: {
          main: `本日は価格についてのご相談ということで、お時間をいただきありがとうございます。まず、弊社ソリューションの価値について改めて確認させてください。`,
          alternatives: [
            "価格のご相談ですね。投資対効果を含めて、詳しくご説明させていただきます。",
            "ご予算のご相談、承知いたしました。Win-Winの条件を一緒に探らせていただければと思います。"
          ],
          key_points: [
            "価値の再確認から開始",
            "相手の立場への理解を示す",
            "柔軟な姿勢をアピール"
          ]
        }
      };

    case 'アフターフォロー':
      return {
        ...baseScript,
        opening: {
          main: `ご導入いただいてから${customer !== '未設定' ? customer + '様で' : ''}どのような状況か、確認させていただきたくお伺いしました。`,
          alternatives: [
            "その後、ご活用状況はいかがでしょうか？",
            "導入後のフォローアップにお伺いさせていただきました。"
          ],
          key_points: [
            "感謝の気持ちを表現",
            "利用状況の確認",
            "追加ニーズの発掘"
          ]
        }
      };

    default: // フォローアップ
      return {
        ...baseScript,
        opening: {
          main: `お忙しい中、お時間をいただきありがとうございます。前回${customer !== '未設定' ? customer + '様で' : ''}お話しいただいた${project !== '未設定' ? project + 'の件' : '件'}について、${nextAction !== '未設定' ? nextAction : '進展'}を確認させていただければと思います。`,
          alternatives: [
            `本日はありがとうございます。前回お伺いした${issues !== '特になし' && issues !== '未設定' ? issues : '内容'}について、その後いかがでしょうか。`,
            `先日は貴重なお話をありがとうございました。${project !== '未設定' ? project + 'について' : ''}進捗を確認させてください。`
          ],
          key_points: [
            "前回の内容との継続性",
            "進展状況の確認",
            "次のステップへの誘導"
          ]
        },
        needs_discovery: {
          questions: [
            `前回お伺いした${issues !== '特になし' && issues !== '未設定' ? issues : '課題'}について、その後何か進展はございましたか？`,
            `${project !== '未設定' ? project + 'に関して' : ''}現状で一番優先的に解決したい点はどちらでしょうか？`,
            "理想的には、いつ頃までにこの課題を解決したいとお考えですか？",
            "予算についてはどの程度をお考えでしょうか？",
            "導入にあたって、社内でクリアすべき条件などはございますか？"
          ],
          response_patterns: {
            "予算不明時": "参考までに、同規模の企業様では〇〇万円程度でご導入いただいています。御社のご予算感はいかがでしょうか？",
            "決裁者不明時": "ちなみに、このような案件の最終的なご判断は、どちらの部署・どなたがされることが多いですか？",
            "競合確認": "他にも比較検討されているサービスはございますか？差し支えなければお教えいただけますと、より御社に合ったご提案ができます。"
          }
        },
        value_proposition: {
          main_benefits: [
            "導入により月間の業務時間を30%削減できます",
            "ミスや手戻りが減ることで、品質が向上します",
            "データの一元管理により、意思決定スピードが向上します"
          ],
          proof_points: [
            "同業界で既に50社以上の導入実績があります",
            "平均的な投資回収期間は1.5年です",
            "導入企業の95%が効果を実感しています"
          ],
          differentiators: [
            "業界特化型なので、カスタマイズが最小限で済みます",
            "専任のカスタマーサクセスチームが導入から運用まで支援します",
            "24時間365日のサポート体制を整えています"
          ]
        },
        objection_handling: {
          "価格が高い": "確かに初期投資は必要ですが、削減できるコストを考えると1.5年で回収可能です。また、分割払いもご用意しています。",
          "時期尚早": "確かに慎重にご検討いただくことも大切ですが、競合他社が既に導入を始めています。早期導入により競争優位性を確保できます。",
          "他社検討中": "ぜひ比較検討していただければと思います。弊社の強みは〇〇でして、特に御社の課題に対しては最適なソリューションだと考えています。",
          "社内調整が必要": "承知いたしました。社内説明用の資料をご用意させていただきます。必要であれば、私から直接ご説明させていただくことも可能です。"
        },
        closing: {
          trial_close: "ここまでのお話で、弊社のサービスが御社の課題解決に貢献できそうでしょうか？",
          next_action: "次回、技術担当も同席させていただき、より詳細なデモをご覧いただければと思いますが、いかがでしょうか？",
          commitment: "まずは2週間の無料トライアルから始めていただくことも可能ですが、ご興味はございますか？",
          follow_up: "本日の資料をメールでお送りさせていただきます。来週の水曜日頃に、改めてご連絡させていただいてもよろしいでしょうか？"
        }
      };
  }
}

module.exports = {
  callOpenAI
};