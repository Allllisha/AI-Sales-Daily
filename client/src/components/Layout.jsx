import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';

const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--color-background);
  position: relative;
  overflow-x: hidden;
  
  /* Architectural grid overlay */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(rgba(0,0,0,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.015) 1px, transparent 1px);
    background-size: var(--space-7) var(--space-7);
    pointer-events: none;
    z-index: 0;
  }
`;

const Header = styled.header`
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: var(--shadow-paper);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
`;

const Nav = styled.nav`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5) var(--space-6);
  height: 88px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: var(--space-4) var(--space-5);
    height: 72px;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
`;

const LogoIcon = styled.div`
  width: 42px;
  height: 42px;
  background-color: var(--color-primary);
  border-radius: var(--radius-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: var(--shadow-elevation);
  
  /* Simple architectural element */
  &::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border: 2px solid var(--color-text-inverse);
    border-radius: var(--radius-subtle);
    background: transparent;
  }

  &::before {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--color-text-inverse);
    border-radius: var(--radius-subtle);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    
    &::after {
      width: 14px;
      height: 14px;
    }

    &::before {
      width: 6px;
      height: 6px;
    }
  }
`;

const Logo = styled(Link)`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  text-decoration: none;
  letter-spacing: -0.02em;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  position: relative;
  z-index: 1;

  &:hover {
    color: var(--color-accent);
  }

  @media (max-width: 768px) {
    font-size: var(--font-size-lead);
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  flex: 1;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-standard);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:hover {
    color: var(--color-primary);
    background-color: var(--color-surface);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-6);

  @media (max-width: 768px) {
    gap: var(--space-4);
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-standard);
  cursor: pointer;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: all 0.2s ease-in-out;

  &:hover {
    color: var(--color-error);
    border-color: var(--color-error);
    background-color: rgba(198, 40, 40, 0.05);
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 768px) {
    display: none; /* モバイルでは非表示にしてハンバーガーメニュー内のみに */
  }
`;

const Main = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-6);
  margin-top: var(--space-5);
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: var(--space-6) var(--space-4);
    margin-top: var(--space-4);
  }
`;

const OnlineIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-surface);
  border-radius: 24px;
  border: 1px solid var(--color-border-light);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileOnlineIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border-radius: var(--radius-none);
  border: 1px solid var(--color-border);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  margin-top: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.online ? 'var(--color-success)' : 'var(--color-warning)'};
  box-shadow: 0 0 0 2px var(--color-background);
  position: relative;

  ${props => props.online && `
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background-color: var(--color-success);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
  `}
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  border-radius: var(--radius-standard);
  border: 1px solid var(--color-border-light);
  min-width: 120px;
  margin-right: var(--space-4);
  padding: var(--space-2) var(--space-4);

  @media (max-width: 768px) {
    display: none;
  }
`;

const UserName = styled.span`
  color: var(--color-text-primary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const UserRole = styled.span`
  color: var(--color-text-secondary);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  margin-top: var(--space-1);
`;

const MobileMenu = styled.button`
  display: none;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  color: var(--color-primary);
  width: 44px;
  height: 44px;
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s ease-in-out;
  font-size: 1.2rem;
  font-weight: var(--font-weight-bold);
  box-shadow: var(--shadow-paper);
  position: relative;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background-color: var(--color-accent-light);
    border-color: var(--color-accent);
    color: var(--color-accent);
    box-shadow: var(--shadow-elevation);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
  
  /* アーキテクチャル要素を追加 */
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    border-top: 2px solid var(--color-accent);
    border-right: 2px solid var(--color-accent);
  }

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  @media (max-width: 400px) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
`;

const MobileDrawer = styled.div`
  position: fixed;
  top: 0;
  right: ${props => props.open ? '0' : '-100%'};
  width: 85%;
  max-width: 360px;
  height: 100vh;
  background-color: var(--color-surface);
  border-left: 2px solid var(--color-border);
  box-shadow: var(--shadow-structure);
  z-index: 1001;
  padding: var(--space-6);
  overflow-y: auto;
  transition: right 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
  /* アーキテクチャルグリッド背景 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px);
    background-size: var(--space-6) var(--space-6);
    pointer-events: none;
    z-index: 0;
    opacity: ${props => props.open ? '1' : '0'};
    transition: opacity 0.3s ease;
  }
  
  @media (max-width: 400px) {
    width: 90%;
    padding: var(--space-5);
  }
`;

const MobileOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, ${props => props.open ? '0.4' : '0'});
  backdrop-filter: blur(${props => props.open ? '6px' : '0px'});
  visibility: ${props => props.open ? 'visible' : 'hidden'};
  opacity: ${props => props.open ? '1' : '0'};
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
`;

const MobileMenuHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-5);
  border-bottom: 2px solid var(--color-border);
  position: relative;
  z-index: 1;
  
  /* アーキテクチャル要素 */
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background-color: var(--color-accent);
  }
`;

const MobileMenuTitle = styled.h2`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  letter-spacing: -0.02em;
  text-transform: uppercase;
  margin: 0;
`;

const CloseButton = styled.button`
  background-color: var(--color-background);
  border: 2px solid var(--color-border);
  font-size: 1.2rem;
  color: var(--color-text-primary);
  cursor: pointer;
  padding: var(--space-3);
  border-radius: var(--radius-none);
  transition: all 0.2s ease-in-out;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-paper);
  -webkit-tap-highlight-color: transparent;

  &:hover {
    color: var(--color-error);
    border-color: var(--color-error);
    background-color: rgba(198, 40, 40, 0.05);
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const MobileNavLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: relative;
  z-index: 1;
`;

const MobileNavLink = styled(Link)`
  display: block;
  padding: var(--space-4) var(--space-5);
  color: var(--color-text-primary);
  text-decoration: none;
  border-radius: var(--radius-none);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  transition: all 0.2s ease-in-out;
  border: 2px solid transparent;
  background-color: var(--color-background);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;

  &:hover {
    background-color: var(--color-accent-light);
    color: var(--color-primary);
    border-color: var(--color-accent);
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  /* アーキテクチャル要素 */
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    width: 8px;
    height: 8px;
    border-top: 2px solid var(--color-border);
    border-left: 2px solid var(--color-border);
    transition: border-color 0.2s ease;
  }
  
  &:hover::after {
    border-color: var(--color-accent);
  }
`;

const MobileUserInfo = styled.div`
  padding: var(--space-5);
  margin-bottom: var(--space-6);
  background-color: var(--color-background);
  border-radius: var(--radius-none);
  text-align: center;
  border: 2px solid var(--color-border);
  box-shadow: var(--shadow-paper);
  position: relative;
  z-index: 1;
  
  /* アーキテクチャル要素 */
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    border-top: 2px solid var(--color-accent);
    border-right: 2px solid var(--color-accent);
  }
`;

const MobileLogoutButton = styled.button`
  width: 100%;
  background-color: var(--color-background);
  color: var(--color-error);
  border: 2px solid var(--color-error);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-none);
  cursor: pointer;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  margin-top: var(--space-6);
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: var(--shadow-paper);
  position: relative;
  z-index: 1;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background-color: rgba(198, 40, 40, 0.1);
    border-color: var(--color-error);
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  /* アーキテクチャル要素 */
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    border-top: 2px solid var(--color-error);
    border-right: 2px solid var(--color-error);
  }
`;

const Layout = () => {
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Container>
      <Header>
        <Nav>
          <LogoContainer>
            <LogoIcon />
            <Logo to="/">Archi Daily</Logo>
          </LogoContainer>
          <NavLinks>
            <NavLink to="/">ホーム</NavLink>
            <NavLink to="/my-analytics">マイ分析</NavLink>
            {isManager && (
              <NavLink to="/team-analytics">チーム分析</NavLink>
            )}
          </NavLinks>
          <UserSection>
            <OnlineIndicator>
              <StatusDot online={isOnline} />
              {isOnline ? 'オンライン' : 'オフライン'}
            </OnlineIndicator>
            <UserInfo>
              <UserName>{user?.name}さん</UserName>
              <UserRole>{isManager ? 'マネージャー' : '営業担当'}</UserRole>
            </UserInfo>
            <LogoutButton onClick={handleLogout}>ログアウト</LogoutButton>
            <MobileMenu onClick={() => setMobileMenuOpen(true)}>☰</MobileMenu>
          </UserSection>
        </Nav>
      </Header>
      
      <MobileOverlay open={mobileMenuOpen} onClick={handleMobileMenuClose} />
      <MobileDrawer open={mobileMenuOpen}>
        <MobileMenuHeader>
          <MobileMenuTitle>メニュー</MobileMenuTitle>
          <CloseButton onClick={handleMobileMenuClose}>×</CloseButton>
        </MobileMenuHeader>
        
        <MobileUserInfo>
          <div style={{ fontSize: 'var(--font-size-body)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{user?.name}さん</div>
          <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
            {isManager ? 'マネージャー' : '営業担当'}
          </div>
          <MobileOnlineIndicator>
            <StatusDot online={isOnline} />
            {isOnline ? 'オンライン' : 'オフライン'}
          </MobileOnlineIndicator>
        </MobileUserInfo>
        
        <MobileNavLinks>
          <MobileNavLink to="/" onClick={handleMobileLinkClick}>ホーム</MobileNavLink>
          <MobileNavLink to="/my-analytics" onClick={handleMobileLinkClick}>マイ分析</MobileNavLink>
          {isManager && (
            <MobileNavLink to="/team-analytics" onClick={handleMobileLinkClick}>チーム分析</MobileNavLink>
          )}
        </MobileNavLinks>
        
        <MobileLogoutButton onClick={handleLogout}>ログアウト</MobileLogoutButton>
      </MobileDrawer>
      
      <Main>
        <Outlet />
      </Main>
    </Container>
  );
};

export default Layout;