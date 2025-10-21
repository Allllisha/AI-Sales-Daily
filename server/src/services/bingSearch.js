const axios = require('axios');
const { ClientSecretCredential } = require('@azure/identity');

// Azure AI Foundry設定
const AZURE_AI_FOUNDRY_ENDPOINT = process.env.AZURE_AI_FOUNDRY_ENDPOINT || '';
const AZURE_BING_SEARCH_AGENT_ID = process.env.AZURE_BING_SEARCH_AGENT_ID || '';
const AZURE_AI_FOUNDRY_API_KEY = process.env.AZURE_AI_FOUNDRY_API_KEY || process.env.AZURE_OPENAI_API_KEY || '';
const AZURE_AI_FOUNDRY_API_VERSION = process.env.AZURE_AI_FOUNDRY_API_VERSION || '2025-05-01';

// Azure認証情報
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || '';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';

// Azure Credentialを作成（Service Principal認証）
let azureCredential = null;
if (AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET) {
  azureCredential = new ClientSecretCredential(
    AZURE_TENANT_ID,
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET
  );
  console.log('[Bing Search] Azure Credential initialized with Service Principal');
}

/**
 * Azure AI Foundry用のアクセストークンを取得
 */
async function getAzureToken() {
  if (!azureCredential) {
    // Credentialがない場合は、API Keyを使用
    return AZURE_AI_FOUNDRY_API_KEY;
  }

  try {
    // Azure AI Foundry用のスコープでトークンを取得
    const tokenResponse = await azureCredential.getToken('https://ai.azure.com/.default');
    return tokenResponse.token;
  } catch (error) {
    console.error('[Bing Search] Failed to get Azure token, falling back to API key:', error.message);
    return AZURE_AI_FOUNDRY_API_KEY;
  }
}

/**
 * レート制限エラーかどうかを判定
 */
function isRateLimitError(error) {
  if (error.response?.status === 429) {
    return true;
  }
  const errorMessage = error.message || '';
  return errorMessage.toLowerCase().includes('rate limit');
}

/**
 * 指数バックオフでリトライするラッパー関数
 */
async function withRetry(fn, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (isRateLimitError(error) && attempt < maxRetries - 1) {
        // レート制限エラーの場合、指数バックオフで待機
        const waitTime = Math.pow(2, attempt) * 1000; // 1秒, 2秒, 4秒...
        console.log(`[Bing Search] Rate limit hit, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // レート制限以外のエラー、または最後の試行の場合はそのまま投げる
      throw error;
    }
  }

  throw lastError;
}

/**
 * Bing Search Agentを使用して企業情報を検索
 * @param {string} companyName - 企業名
 * @returns {Promise<Object>} 検索結果
 */
async function searchCompanyInfo(companyName) {
  return withRetry(async () => {
  try {
    console.log('[Bing Search] Searching for:', companyName);

    if (!AZURE_AI_FOUNDRY_ENDPOINT || !AZURE_BING_SEARCH_AGENT_ID) {
      throw new Error('Azure AI Foundry configuration missing');
    }

    // アクセストークンを取得
    const token = await getAzureToken();
    const useBearer = !!azureCredential; // Credentialがある場合はBearer認証

    console.log('[Bing Search] Using authentication:', useBearer ? 'Bearer Token' : 'API Key');

    // 1. スレッドを作成
    const headers = {
      'Content-Type': 'application/json'
    };

    if (useBearer) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['api-key'] = token;
    }

    const threadResponse = await axios.post(
      `${AZURE_AI_FOUNDRY_ENDPOINT}/threads?api-version=${AZURE_AI_FOUNDRY_API_VERSION}`,
      {},
      { headers }
    );

    const threadId = threadResponse.data.id;
    console.log('[Bing Search] Thread created:', threadId);

    // 2. メッセージを送信
    const query = `「${companyName}」について以下の情報を調べてください：
1. 企業概要（設立年、本社所在地、事業内容、従業員数など）
2. 最新ニュース（最近3ヶ月以内のニュース記事を3-5件）
3. 主要な関係者（経営陣、キーパーソン）
4. 最近の取り組みや注目トピック

各情報には必ず出典URLを含めてください。`;

    await axios.post(
      `${AZURE_AI_FOUNDRY_ENDPOINT}/threads/${threadId}/messages?api-version=${AZURE_AI_FOUNDRY_API_VERSION}`,
      {
        role: 'user',
        content: query
      },
      { headers }
    );

    console.log('[Bing Search] Message sent');

    // 3. Runを作成して実行
    const runResponse = await axios.post(
      `${AZURE_AI_FOUNDRY_ENDPOINT}/threads/${threadId}/runs?api-version=${AZURE_AI_FOUNDRY_API_VERSION}`,
      {
        assistant_id: AZURE_BING_SEARCH_AGENT_ID
      },
      { headers }
    );

    const runId = runResponse.data.id;
    console.log('[Bing Search] Run created:', runId);

    // 4. Runの完了を待つ（ポーリング）
    let runStatus = 'queued';
    let runData = null;
    let attempts = 0;
    const maxAttempts = 60; // 最大60秒待機

    while (['queued', 'in_progress', 'requires_action'].includes(runStatus) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機

      const statusResponse = await axios.get(
        `${AZURE_AI_FOUNDRY_ENDPOINT}/threads/${threadId}/runs/${runId}?api-version=${AZURE_AI_FOUNDRY_API_VERSION}`,
        { headers: useBearer ? { 'Authorization': `Bearer ${token}` } : { 'api-key': token } }
      );

      runData = statusResponse.data;
      runStatus = runData.status;
      console.log('[Bing Search] Run status:', runStatus);
      attempts++;
    }

    if (runStatus !== 'completed') {
      console.error('[Bing Search] Run failed details:', JSON.stringify(runData, null, 2));
      const errorMessage = runData?.last_error?.message || `Run failed with status: ${runStatus}`;
      throw new Error(errorMessage);
    }

    // 5. メッセージを取得
    const messagesResponse = await axios.get(
      `${AZURE_AI_FOUNDRY_ENDPOINT}/threads/${threadId}/messages?api-version=${AZURE_AI_FOUNDRY_API_VERSION}`,
      { headers: useBearer ? { 'Authorization': `Bearer ${token}` } : { 'api-key': token } }
    );

    const messages = messagesResponse.data.data;

    // アシスタントの最新メッセージを取得
    const assistantMessage = messages
      .filter(m => m.role === 'assistant')
      .sort((a, b) => b.created_at - a.created_at)[0];

    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    // レスポンステキストとannotations（citations）を抽出
    let responseText = '';
    const citations = [];

    if (assistantMessage.content && assistantMessage.content.length > 0) {
      assistantMessage.content
        .filter(c => c.type === 'text')
        .forEach(c => {
          responseText += c.text.value + '\n';

          // annotationsからURLを抽出
          if (c.text.annotations && Array.isArray(c.text.annotations)) {
            c.text.annotations.forEach(ann => {
              if (ann.type === 'url_citation' && ann.url_citation) {
                citations.push({
                  index: ann.start_index,
                  url: ann.url_citation.url,
                  title: ann.url_citation.title || ''
                });
              }
            });
          }
        });
    }

    console.log('[Bing Search] Response received, length:', responseText.length);
    console.log('[Bing Search] Citations found:', citations.length);

    // レスポンスをパース（citationsも渡す）
    const parsedInfo = parseSearchResponse(responseText, citations);

    return {
      success: true,
      company_name: companyName,
      ...parsedInfo,
      raw_response: responseText,
      citations: citations,
      fetched_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('[Bing Search] Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      endpoint: AZURE_AI_FOUNDRY_ENDPOINT,
      hasApiKey: !!AZURE_AI_FOUNDRY_API_KEY,
      hasCredentials: !!(AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET)
    });

    // エラーオブジェクトを返す（throwではなくreturn）
    let errorMessage = '';
    if (error.response?.status === 401) {
      errorMessage = 'Azure AI Foundry認証エラー: API キーが無効または期限切れです';
    } else if (error.response?.status === 404) {
      errorMessage = 'Azure AI Foundry リソースが見つかりません: エンドポイントまたはエージェントIDを確認してください';
    } else if (error.response?.status === 403) {
      errorMessage = 'Azure AI Foundry アクセス拒否: 権限を確認してください';
    } else if (error.response?.status === 429 || isRateLimitError(error)) {
      errorMessage = 'Azure AI Foundry レート制限エラー: しばらく待ってから再試行してください';
    } else {
      errorMessage = `Azure AI Foundry エラー: ${error.message}`;
    }

    return {
      success: false,
      error: errorMessage,
      details: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        endpoint: AZURE_AI_FOUNDRY_ENDPOINT
      }
    };
  }
  }, 3); // withRetryで最大3回リトライ
}

/**
 * 検索レスポンスをパースして構造化データに変換
 * @param {string} responseText - AIからのレスポンステキスト
 * @param {Array} citations - URLのcitation配列
 * @returns {Object} 構造化された情報
 */
function parseSearchResponse(responseText, citations = []) {
  // AIのレスポンスから情報を抽出
  // シンプルなパターンマッチングで各セクションを抽出

  const result = {
    company_info: null,
    latest_news: [],
    related_people: [],
    recent_topics: []
  };

  try {
    // ソース参照を削除する関数
    const removeSourceReferences = (text) => {
      // 【数字:数字†source】のパターンを削除
      return text.replace(/【\d+:\d+†source】/g, '').trim();
    };

    // URLを抽出する共通関数
    const extractUrls = (text) => {
      // URLのパターン: http(s)://から始まり、スペース、改行、括弧、角括弧まで
      const urlRegex = /https?:\/\/[^\s\)\]\「\」\【\】\n]+/g;
      const urls = text.match(urlRegex) || [];

      // URLの末尾のカンマやピリオドを削除
      return urls.map(url => url.replace(/[,\.]+$/, ''));
    };

    // citationsをstart_indexでソートしてURLマップを作成
    const citationMap = new Map();
    citations.forEach(c => {
      if (c.url && c.index !== undefined) {
        citationMap.set(c.index, c.url);
      }
    });

    // citationマーカーからURLを取得する関数
    const getCitationUrl = (text) => {
      // 【数字:数字†source】のパターンを探す
      const markerMatch = text.match(/【(\d+):(\d+)†source】/);
      if (markerMatch) {
        // マーカーが元のresponseText内のどこにあるかを検索
        const markerText = markerMatch[0];
        const positionInResponse = responseText.indexOf(markerText);
        if (positionInResponse !== -1) {
          // この位置に最も近いcitationを探す
          let closestCitation = null;
          let minDistance = Infinity;
          citations.forEach(c => {
            const distance = Math.abs(c.index - positionInResponse);
            if (distance < minDistance) {
              minDistance = distance;
              closestCitation = c;
            }
          });
          if (closestCitation && minDistance < 50) { // 50文字以内なら対応
            return closestCitation.url;
          }
        }
      }
      return null;
    };

    // 企業概要セクションを抽出（### 1. の形式）
    const companyInfoMatch = responseText.match(/###\s*1\.\s*企業概要[\s\S]*?(?=###\s*2\.|$)/i);
    if (companyInfoMatch) {
      const rawDescription = companyInfoMatch[0].replace(/###\s*1\.\s*企業概要\s*/, '').trim();
      result.company_info = {
        description: removeSourceReferences(rawDescription),
        extracted_at: new Date().toISOString()
      };
    }

    // 最新ニュースセクションを抽出（### 2. の形式）
    const newsMatch = responseText.match(/###\s*2\.\s*最新ニュース[\s\S]*?(?=###\s*3\.|$)/i);
    if (newsMatch) {
      const newsText = newsMatch[0];
      // 番号付きリスト（1. **タイトル**）を抽出
      const newsItems = newsText.match(/\d+\.\s*\*\*[^*]+\*\*[\s\S]*?(?=\n\d+\.\s*\*\*|\n###|\n---|\n\n$|$)/g);

      if (newsItems) {
        result.latest_news = newsItems.slice(0, 5).map((item) => {
          // タイトルを抽出（**で囲まれた部分）
          const titleMatch = item.match(/\*\*([^*]+)\*\*/);
          const title = titleMatch ? titleMatch[1].trim() : item.split('\n')[0].trim();

          // URLの優先順位: citation marker > text URL > null
          const citationUrl = getCitationUrl(item);
          const urls = extractUrls(item);
          const url = citationUrl || urls[0] || null;

          const cleanedItem = removeSourceReferences(item);

          // summaryからタイトル部分を削除（数字. **タイトル**: の形式）
          let summary = cleanedItem
            .replace(/^\d+\.\s*\*\*[^*]+\*\*:\s*/, '') // "1. **タイトル**: " を削除
            .replace(/^-\s*/, '') // 先頭の "- " を削除
            .trim();

          return {
            title: removeSourceReferences(title),
            summary: summary,
            url: url,
            extracted_at: new Date().toISOString()
          };
        });
      }
    }

    // 関係者セクションを抽出（### 3. の形式）
    const peopleMatch = responseText.match(/###\s*3\.\s*主要な関係者[\s\S]*?(?=###\s*4\.|$)/i);
    if (peopleMatch) {
      const peopleText = peopleMatch[0];
      // - **役職**: 名前 の形式を抽出
      const peopleItems = peopleText.match(/^-\s*\*\*[^*]+\*\*:\s*[^\n]+/gm);

      if (peopleItems) {
        result.related_people = peopleItems.slice(0, 10).map((item) => {
          const cleanedItem = removeSourceReferences(item);
          // **役職**: 名前 の形式から抽出
          const match = cleanedItem.match(/\*\*([^*]+)\*\*:\s*(.+)/);
          if (match) {
            return {
              name: removeSourceReferences(match[2].trim()),
              role: match[1].trim(),
              description: cleanedItem.replace(/^-\s*/, '').trim(),
              extracted_at: new Date().toISOString()
            };
          }
          return {
            name: cleanedItem.replace(/^-\s*/, '').trim(),
            description: cleanedItem.trim(),
            extracted_at: new Date().toISOString()
          };
        });
      }
    }

    // 最近の取り組みセクションを抽出（### 4. の形式）
    const topicsMatch = responseText.match(/###\s*4\.\s*最近の取り組み[\s\S]*$/i);
    if (topicsMatch) {
      const topicsText = topicsMatch[0];
      // - **トピック**: 説明 の形式を抽出
      const topicItems = topicsText.match(/^-\s*\*\*[^*]+\*\*:[\s\S]*?(?=\n-\s*\*\*|\n###|\n---|\n\n$|$)/gm);

      if (topicItems) {
        result.recent_topics = topicItems.slice(0, 5).map((item) => {
          const cleanedItem = removeSourceReferences(item);

          // タイトルを抽出（**で囲まれた部分、末尾のコロンを除去）
          const titleMatch = cleanedItem.match(/\*\*([^*]+)\*\*/);
          let title = titleMatch ? titleMatch[1].trim() : cleanedItem.split('\n')[0].trim();
          // タイトル末尾のコロンを削除
          title = title.replace(/:$/, '');

          // URLの優先順位: citation marker > text URL > null
          const citationUrl = getCitationUrl(item);
          const urls = extractUrls(item);
          const url = citationUrl || urls[0] || null;

          // summaryからタイトル部分（- **タイトル**: ）を削除
          let summary = cleanedItem.replace(/^-\s*\*\*[^*]+\*\*:\s*/, '').trim();

          return {
            title: removeSourceReferences(title),
            summary: summary,
            url: url,
            extracted_at: new Date().toISOString()
          };
        });
      }
    }

  } catch (parseError) {
    console.error('[Bing Search] Error parsing response:', parseError);
  }

  return result;
}

/**
 * 複数の企業名を一括検索
 * @param {string[]} companyNames - 企業名の配列
 * @returns {Promise<Object[]>} 検索結果の配列
 */
async function searchMultipleCompanies(companyNames) {
  const results = [];

  for (const companyName of companyNames) {
    try {
      const result = await searchCompanyInfo(companyName);
      results.push(result);

      // レート制限対策で少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[Bing Search] Failed to search ${companyName}:`, error.message);
      results.push({
        success: false,
        company_name: companyName,
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  searchCompanyInfo,
  searchMultipleCompanies,
  parseSearchResponse
};
