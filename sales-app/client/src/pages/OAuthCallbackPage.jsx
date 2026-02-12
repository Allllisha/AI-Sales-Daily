import React from 'react';

const OAuthCallbackPage = () => {
  // 即座に実行（useEffectを使わない）
  const urlParams = new URLSearchParams(window.location.search);
  const salesforceAuth = urlParams.get('salesforce_auth');
  const dynamics365Auth = urlParams.get('dynamics365_auth');
  const errorMessage = urlParams.get('message');
  
  console.log('🔍 OAuthCallbackPage - URL Analysis:', {
    fullURL: window.location.href,
    search: window.location.search,
    salesforceAuth,
    dynamics365Auth,
    errorMessage,
    allParams: Object.fromEntries(urlParams.entries())
  });
  
  // モバイルデバイスの検出
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (salesforceAuth === 'success' || dynamics365Auth === 'success') {
    const crmName = salesforceAuth === 'success' ? 'Salesforce' : 'Dynamics 365';
    console.log(`✅ ${crmName} OAuth authentication successful`);
    console.log('Is mobile device:', isMobile);
    
    // 認証成功をlocalStorageに保存（モバイル対応）
    const authEvent = salesforceAuth === 'success' ? 'salesforce_auth_success' : 'dynamics365_auth_success';
    localStorage.setItem('oauth_auth_success', authEvent);
    localStorage.setItem('oauth_auth_timestamp', Date.now().toString());
    console.log('📝 Saved auth success to localStorage:', authEvent);
    
    // 認証成功を3秒間表示してから処理
    setTimeout(() => {
      if (isMobile) {
        console.log('📱 Mobile device detected - redirecting to home page');
        // モバイルの場合はホームページにリダイレクト
        window.location.href = window.location.origin;
      } else {
        console.log('🔒 Desktop - closing authentication window...');
        // デスクトップの場合はウィンドウを閉じる
        window.close();
        // window.close()が動作しない場合のフォールバック
        if (!window.closed) {
          window.location.href = window.location.origin;
        }
      }
    }, 3000);
  } else if (salesforceAuth === 'error' || dynamics365Auth === 'error') {
    const crmName = salesforceAuth === 'error' ? 'Salesforce' : 'Dynamics 365';
    console.log(`❌ ${crmName} OAuth authentication failed:`, errorMessage);
    
    // エラーの場合も5秒後にリダイレクト
    setTimeout(() => {
      if (isMobile) {
        window.location.href = window.location.origin;
      }
    }, 5000);
  } else {
    // パラメータがない場合（認証処理が不完全な場合）
    console.log('No auth parameters found, might be processing or incomplete');
  }

  // 表示するメッセージを決定
  let title = '認証処理中...';
  let message = 'このウィンドウは自動的に閉じられます。';
  let showCloseButton = false;

  if (salesforceAuth === 'success' || dynamics365Auth === 'success') {
    const crmName = salesforceAuth === 'success' ? 'Salesforce' : 'Dynamics 365';
    title = `${crmName} 認証完了`;
    if (isMobile) {
      message = `${crmName}へのログインが成功しました。\n\n3秒後に自動的にホームページに戻ります...`;
    } else {
      message = `${crmName}へのログインが成功しました。\n\n3秒後に自動的にこのウィンドウを閉じます...`;
    }
    showCloseButton = true;
  } else if (salesforceAuth === 'error' || dynamics365Auth === 'error') {
    const crmName = salesforceAuth === 'error' ? 'Salesforce' : 'Dynamics 365';
    title = `${crmName} 認証エラー`;
    message = `${crmName}の認証に失敗しました: ${errorMessage || '不明なエラー'}`;
    showCloseButton = true;
  } else {
    title = '認証処理中';
    message = '認証を処理中です。\nしばらくお待ちください。';
    showCloseButton = true;
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '400px'
      }}>
        <h2 style={{ 
          color: salesforceAuth === 'success' || dynamics365Auth === 'success' ? '#28a745' : 
                 salesforceAuth === 'error' || dynamics365Auth === 'error' ? '#dc3545' : '#007bff',
          marginBottom: '20px'
        }}>
          {title}
        </h2>
        <p style={{ marginBottom: '20px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
          {message}
        </p>
        {(salesforceAuth === 'success' || dynamics365Auth === 'success') ? (
          <button 
            onClick={() => {
              if (isMobile) {
                // モバイルの場合はホームにリダイレクト
                window.location.href = window.location.origin;
              } else {
                // デスクトップの場合はウィンドウを閉じる
                window.close();
                // フォールバック
                if (!window.closed) {
                  window.location.href = window.location.origin;
                }
              }
            }}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isMobile ? 'ホームに戻る' : '今すぐ閉じる'}
          </button>
        ) : showCloseButton && (
          <button 
            onClick={() => {
              if (isMobile) {
                window.location.href = window.location.origin;
              } else {
                window.close();
                if (!window.closed) {
                  window.location.href = window.location.origin;
                }
              }
            }}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isMobile ? 'ホームに戻る' : 'ウィンドウを閉じる'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;