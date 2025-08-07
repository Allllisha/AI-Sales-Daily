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
  
  if (salesforceAuth === 'success' || dynamics365Auth === 'success') {
    const crmName = salesforceAuth === 'success' ? 'Salesforce' : 'Dynamics 365';
    console.log(`✅ ${crmName} OAuth authentication successful`);
    
    // 認証成功を3秒間表示してから自動でウィンドウを閉じる
    setTimeout(() => {
      console.log('🔒 Auto-closing authentication window...');
      window.close();
    }, 3000);
  } else if (salesforceAuth === 'error' || dynamics365Auth === 'error') {
    const crmName = salesforceAuth === 'error' ? 'Salesforce' : 'Dynamics 365';
    console.log(`❌ ${crmName} OAuth authentication failed:`, errorMessage);
    
    // エラー場合も別ウィンドウでエラー画面を表示
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
    message = `${crmName}へのログインが成功しました。\n\n3秒後に自動的にこのウィンドウを閉じます...`;
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
            onClick={() => window.close()}
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
            今すぐ閉じる
          </button>
        ) : showCloseButton && (
          <button 
            onClick={() => window.close()}
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
            ウィンドウを閉じる
          </button>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;