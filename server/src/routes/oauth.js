const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db/pool');
const { redisWrapper } = require('../services/redis');

// OAuth stateのプレフィックス
const OAUTH_STATE_PREFIX = 'oauth:state:';
const OAUTH_STATE_TTL = 600; // 10分

/**
 * Salesforce OAuth 2.0 Authorization URL生成
 */
router.get('/salesforce/authorize', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const state = crypto.randomBytes(32).toString('hex');
    
    // PKCE Code Challenge生成
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    // Use localhost for external access instead of Docker internal hostname
    const host = req.get('host').includes('api:') ? 'localhost:3001' : req.get('host');
    const redirectUri = `${req.protocol}://${host}/api/oauth/salesforce/callback`;
    
    // stateをRedisに保存（セキュリティ対策）
    await redisWrapper.set(
      `${OAUTH_STATE_PREFIX}${state}`,
      JSON.stringify({
        userId: userId,
        timestamp: Date.now(),
        redirectUri,
        codeVerifier  // PKCEのために保存
      }),
      { EX: OAUTH_STATE_TTL }
    );

    const authUrl = new URL('https://login.salesforce.com/services/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.SALESFORCE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'api refresh_token offline_access');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    // Force fresh login to ensure OAuth callback is always triggered
    authUrl.searchParams.set('prompt', 'login');
    
    console.log('Salesforce OAuth Debug:', {
      protocol: req.protocol,
      host: req.get('host'),
      redirectUri,
      clientId: process.env.SALESFORCE_CLIENT_ID,
      fullAuthUrl: authUrl.toString()
    });

    res.json({
      success: true,
      authUrl: authUrl.toString(),
      state
    });
  } catch (error) {
    console.error('Salesforce OAuth authorize error:', error);
    res.status(500).json({
      success: false,
      message: 'Salesforce認証URLの生成に失敗しました',
      error: error.message
    });
  }
});

/**
 * Salesforce OAuth 2.0 Callback処理
 */
router.get('/salesforce/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    console.log('Salesforce Callback Debug:', {
      code: code ? 'present' : 'missing',
      state,
      error,
      error_description,
      allQuery: req.query
    });

    if (error) {
      console.error('Salesforce OAuth error:', error, error_description);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?salesforce_auth=error&message=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      console.error('Missing code or state in OAuth callback');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?salesforce_auth=error&message=${encodeURIComponent('認証コードまたはstateが不正です')}`);
    }

    // stateの検証
    const stateDataStr = await redisWrapper.get(`${OAUTH_STATE_PREFIX}${state}`);
    if (!stateDataStr) {
      console.error('Invalid OAuth state:', state);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?salesforce_auth=error&message=${encodeURIComponent('不正なstateパラメータです')}`);
    }
    
    const stateData = JSON.parse(stateDataStr);

    // stateの有効期限チェック（10分）
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      await redisWrapper.del(`${OAUTH_STATE_PREFIX}${state}`);
      console.error('OAuth state expired');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?salesforce_auth=error&message=${encodeURIComponent('認証セッションが期限切れです')}`);
    }

    // アクセストークンを取得（PKCEを使用）
    const tokenParams = {
      grant_type: 'authorization_code',
      client_id: process.env.SALESFORCE_CLIENT_ID,
      redirect_uri: stateData.redirectUri,
      code,
      code_verifier: stateData.codeVerifier  // PKCEのcode_verifierを送信
    };
    
    console.log('Token request params:', tokenParams);
    
    const tokenResponse = await axios.post('https://login.salesforce.com/services/oauth2/token', new URLSearchParams(tokenParams), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokenData = tokenResponse.data;
    
    console.log('Token response data:', {
      expires_in: tokenData.expires_in,
      expires_in_type: typeof tokenData.expires_in,
      access_token: tokenData.access_token ? 'present' : 'missing',
      refresh_token: tokenData.refresh_token ? 'present' : 'missing'
    });
    
    // ユーザー情報を取得
    console.log('Fetching user info from Salesforce:', `${tokenData.instance_url}/services/oauth2/userinfo`);
    const userInfoResponse = await axios.get(`${tokenData.instance_url}/services/oauth2/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const userInfo = userInfoResponse.data;
    console.log('Salesforce user info received:', { name: userInfo.name, email: userInfo.email });

    // トークンをデータベースに保存
    console.log('Saving Salesforce tokens to database for user:', stateData.userId);
    
    const expiresAt = new Date(Date.now() + (parseInt(tokenData.expires_in || 3600) * 1000));
    console.log('Token expiration calculation:', {
      expires_in: tokenData.expires_in,
      expires_in_parsed: parseInt(tokenData.expires_in || 3600),
      expires_at: expiresAt
    });
    
    try {
      const dbResult = await pool.query(`
        INSERT INTO user_crm_tokens (user_id, crm_type, access_token, refresh_token, instance_url, expires_at, crm_user_info)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, crm_type) 
        DO UPDATE SET 
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          instance_url = EXCLUDED.instance_url,
          expires_at = EXCLUDED.expires_at,
          crm_user_info = EXCLUDED.crm_user_info,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        stateData.userId,
        'salesforce',
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.instance_url,
        expiresAt,
        JSON.stringify(userInfo)
      ]);
      
      console.log('Salesforce tokens saved successfully:', dbResult.rows[0]);
    } catch (dbError) {
      console.error('Database save error:', dbError);
      throw dbError;
    }

    // stateをクリーンアップ
    await redisWrapper.del(`${OAUTH_STATE_PREFIX}${state}`);

    // 成功ページにリダイレクト - 確実にsuccess parameter付きでリダイレクト
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/?salesforce_auth=success`;
    console.log('Salesforce OAuth success - redirecting to:', redirectUrl);
    console.log('🎯 Final redirect URL with success parameter:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Salesforce OAuth callback error:', error);
    console.error('Error stack:', error.stack);
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?salesforce_auth=error&message=${encodeURIComponent('認証処理に失敗しました: ' + error.message)}`;
    console.log('Salesforce OAuth error - redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }
});

/**
 * Dynamics 365 OAuth 2.0 Authorization URL生成
 */
router.get('/dynamics365/authorize', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const state = crypto.randomBytes(32).toString('hex');
    // Use localhost for external access instead of Docker internal hostname
    const host = req.get('host').includes('api:') ? 'localhost:3001' : req.get('host');
    const redirectUri = `${req.protocol}://${host}/api/oauth/dynamics365/callback`;
    
    console.log('Dynamics 365 OAuth Debug:', {
      protocol: req.protocol,
      originalHost: req.get('host'),
      correctedHost: host,
      redirectUri,
      clientId: process.env.DYNAMICS_CLIENT_ID,
      tenantId: process.env.DYNAMICS_TENANT_ID
    });
    
    // stateをRedisに保存
    await redisWrapper.set(
      `${OAUTH_STATE_PREFIX}${state}`,
      JSON.stringify({
        userId: userId,
        timestamp: Date.now(),
        redirectUri
      }),
      { EX: OAUTH_STATE_TTL }
    );

    const authUrl = new URL(`https://login.microsoftonline.com/${process.env.DYNAMICS_TENANT_ID}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.DYNAMICS_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'https://org61965acd.crm7.dynamics.com/user_impersonation offline_access openid profile email');
    authUrl.searchParams.set('state', state);

    res.json({
      success: true,
      authUrl: authUrl.toString(),
      state
    });
  } catch (error) {
    console.error('Dynamics 365 OAuth authorize error:', error);
    res.status(500).json({
      success: false,
      message: 'Dynamics 365認証URLの生成に失敗しました',
      error: error.message
    });
  }
});

/**
 * Dynamics 365 OAuth 2.0 Callback処理
 */
router.get('/dynamics365/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Dynamics 365認証エラー: ${error}`,
        error
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: '認証コードまたはstateが不正です'
      });
    }

    // stateの検証
    const stateDataStr = await redisWrapper.get(`${OAUTH_STATE_PREFIX}${state}`);
    if (!stateDataStr) {
      return res.status(400).json({
        success: false,
        message: '不正なstateパラメータです'
      });
    }
    
    const stateData = JSON.parse(stateDataStr);

    // stateの有効期限チェック
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      await redisWrapper.del(`${OAUTH_STATE_PREFIX}${state}`);
      return res.status(400).json({
        success: false,
        message: '認証セッションが期限切れです'
      });
    }

    // アクセストークンを取得
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${process.env.DYNAMICS_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.DYNAMICS_CLIENT_ID,
        client_secret: process.env.DYNAMICS_CLIENT_SECRET,
        redirect_uri: stateData.redirectUri,
        code,
        scope: 'https://org61965acd.crm7.dynamics.com/user_impersonation offline_access openid profile email'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const tokenData = tokenResponse.data;

    // ユーザー情報を取得（IDトークンまたはUserInfoエンドポイント）
    let userInfo = {
      displayName: 'Dynamics 365 User',
      email: 'unknown',
      authenticated: true
    };
    
    try {
      // IDトークンをデコードしてユーザー情報を取得
      if (tokenData.id_token) {
        const idTokenPayload = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString());
        userInfo = {
          displayName: idTokenPayload.name || idTokenPayload.preferred_username || 'Dynamics 365 User',
          email: idTokenPayload.email || idTokenPayload.upn || idTokenPayload.preferred_username || 'unknown',
          authenticated: true,
          oid: idTokenPayload.oid,
          tid: idTokenPayload.tid
        };
      }
    } catch (error) {
      console.log('Failed to decode ID token:', error.message);
    }

    // トークンをデータベースに保存
    await pool.query(`
      INSERT INTO user_crm_tokens (user_id, crm_type, access_token, refresh_token, instance_url, expires_at, crm_user_info)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, crm_type) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        instance_url = EXCLUDED.instance_url,
        expires_at = EXCLUDED.expires_at,
        crm_user_info = EXCLUDED.crm_user_info,
        updated_at = CURRENT_TIMESTAMP
    `, [
      stateData.userId,
      'dynamics365',
      tokenData.access_token,
      tokenData.refresh_token,
      process.env.DYNAMICS_URL,
      new Date(Date.now() + (parseInt(tokenData.expires_in) * 1000)),
      JSON.stringify(userInfo)
    ]);

    // stateをクリーンアップ
    await redisWrapper.del(`${OAUTH_STATE_PREFIX}${state}`);

    // 成功ページにリダイレクト - 確実にsuccess parameter付きでリダイレクト
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/?dynamics365_auth=success`;
    console.log('Dynamics 365 OAuth success - redirecting to:', redirectUrl);
    console.log('🎯 Final redirect URL with success parameter:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Dynamics 365 OAuth callback error:', error);
    console.error('Error stack:', error.stack);
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?dynamics365_auth=error&message=${encodeURIComponent('認証処理に失敗しました: ' + error.message)}`;
    console.log('Dynamics 365 OAuth error - redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }
});

/**
 * CRM認証状態確認
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      'SELECT crm_type, expires_at, crm_user_info FROM user_crm_tokens WHERE user_id = $1',
      [userId]
    );

    const tokens = {};
    console.log('OAuth status check - database result:', result.rows);
    result.rows.forEach(row => {
      const isAuthenticated = new Date(row.expires_at) > new Date();
      console.log(`Processing ${row.crm_type}: authenticated=${isAuthenticated}, expires_at=${row.expires_at}`);
      tokens[row.crm_type] = {
        authenticated: isAuthenticated,
        expires_at: row.expires_at,
        user_info: row.crm_user_info
      };
    });

    console.log('OAuth status check - final tokens:', tokens);
    res.json({
      success: true,
      tokens
    });
  } catch (error) {
    console.error('OAuth status check error:', error);
    res.status(500).json({
      success: false,
      message: 'CRM認証状態の確認に失敗しました',
      error: error.message
    });
  }
});

/**
 * CRM認証解除
 */
router.delete('/:crmType', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { crmType } = req.params;

    if (!['salesforce', 'dynamics365'].includes(crmType)) {
      return res.status(400).json({
        success: false,
        message: '不正なCRMタイプです'
      });
    }

    await pool.query(
      'DELETE FROM user_crm_tokens WHERE user_id = $1 AND crm_type = $2',
      [userId, crmType]
    );

    res.json({
      success: true,
      message: `${crmType}の認証を解除しました`
    });
  } catch (error) {
    console.error('OAuth revoke error:', error);
    res.status(500).json({
      success: false,
      message: 'CRM認証の解除に失敗しました',
      error: error.message
    });
  }
});

module.exports = router;