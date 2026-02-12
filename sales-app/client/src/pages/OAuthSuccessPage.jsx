import React, { useEffect } from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-6);
  text-align: center;
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-4);

  svg {
    width: 40px;
    height: 40px;
    color: white;
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-heading);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
`;

const Message = styled.p`
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
`;

const OAuthSuccessPage = () => {
  useEffect(() => {
    // URLパラメーターをチェック
    const urlParams = new URLSearchParams(window.location.search);
    const salesforceAuth = urlParams.get('salesforce_auth');
    const dynamics365Auth = urlParams.get('dynamics365_auth');

    if (salesforceAuth === 'success') {
      // 親ウィンドウにメッセージを送信
      if (window.opener) {
        window.opener.postMessage('salesforce_auth_success', window.location.origin);
        setTimeout(() => window.close(), 2000);
      }
    } else if (dynamics365Auth === 'success') {
      // 親ウィンドウにメッセージを送信
      if (window.opener) {
        window.opener.postMessage('dynamics365_auth_success', window.location.origin);
        setTimeout(() => window.close(), 2000);
      }
    }
  }, []);

  return (
    <Container>
      <SuccessIcon>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </SuccessIcon>
      <Title>認証が完了しました！</Title>
      <Message>
        CRMアカウントへの認証が正常に完了しました。<br/>
        このウィンドウは自動的に閉じられます。
      </Message>
    </Container>
  );
};

export default OAuthSuccessPage;