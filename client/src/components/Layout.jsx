import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';
import { colors, typography, spacing, borderRadius, shadows, transitions, media } from '../styles/designSystem';

const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  position: relative;
  overflow-x: hidden;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="80" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="60" r="1" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
    animation: float 20s infinite linear;
    pointer-events: none;
    z-index: 0;
  }

  @keyframes float {
    0% { transform: translateY(0px) translateX(0px); }
    50% { transform: translateY(-10px) translateX(5px); }
    100% { transform: translateY(0px) translateX(0px); }
  }
`;

const Header = styled.header`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 1px 20px rgba(0, 0, 0, 0.05);
`;

const Nav = styled.nav`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing[4]} ${spacing[6]};
  height: 72px;

  ${media.md} {
    padding: ${spacing[4]} ${spacing[4]};
  }

  @media (max-width: 768px) {
    padding: ${spacing[3]} ${spacing[4]};
    height: 64px;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing[3]};
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  
  &::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid white;
    border-radius: 2px;
    background: transparent;
  }

  &::before {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 1px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    
    &::after {
      width: 12px;
      height: 12px;
    }

    &::before {
      width: 6px;
      height: 6px;
    }
  }
`;

const Logo = styled(Link)`
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.bold};
  color: ${colors.neutral[900]};
  text-decoration: none;
  letter-spacing: ${typography.letterSpacing.tight};
  transition: all ${transitions.fast};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    color: #8B5CF6;
  }

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.lg};
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing[1]};

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  color: ${colors.neutral[600]};
  text-decoration: none;
  padding: ${spacing[2.5]} ${spacing[4]};
  border-radius: ${borderRadius.lg};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  transition: all ${transitions.base};
  position: relative;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:hover {
    color: #8B5CF6;
    background: rgba(139, 92, 246, 0.08);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing[4]};

  @media (max-width: 768px) {
    gap: ${spacing[2]};
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  color: ${colors.neutral[500]};
  border: 1px solid rgba(139, 92, 246, 0.2);
  padding: ${spacing[2]} ${spacing[4]};
  border-radius: ${borderRadius.lg};
  cursor: pointer;
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: all ${transitions.base};

  &:hover {
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.3);
    background: rgba(220, 38, 38, 0.05);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: ${spacing[1.5]} ${spacing[2.5]};
    font-size: ${typography.fontSize.xs};
  }
`;

const Main = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${spacing[8]} ${spacing[6]};
  position: relative;
  z-index: 1;

  ${media.md} {
    padding: ${spacing[6]} ${spacing[4]};
  }

  @media (max-width: 768px) {
    padding: ${spacing[4]} ${spacing[4]};
  }
`;

const OnlineIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing[2]};
  font-size: ${typography.fontSize.xs};
  color: ${colors.neutral[500]};
  font-weight: ${typography.fontWeight.medium};
  padding: ${spacing[1.5]} ${spacing[3]};
  background: rgba(139, 92, 246, 0.05);
  border-radius: ${borderRadius.full};
  border: 1px solid rgba(139, 92, 246, 0.1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    display: none;
  }
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.online ? '#10b981' : '#f59e0b'};
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
  position: relative;

  ${props => props.online && `
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background-color: #10b981;
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
  gap: ${spacing[0.5]};
  padding: ${spacing[2]} ${spacing[3]};
  background: rgba(139, 92, 246, 0.05);
  border-radius: ${borderRadius.lg};
  border: 1px solid rgba(139, 92, 246, 0.1);
  min-width: 120px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const UserName = styled.span`
  color: ${colors.neutral[700]};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.semibold};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const UserRole = styled.span`
  color: ${colors.neutral[500]};
  font-size: ${typography.fontSize.xs};
  font-weight: ${typography.fontWeight.medium};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const MobileMenu = styled.button`
  display: none;
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: #8B5CF6;
  width: 40px;
  height: 40px;
  cursor: pointer;
  border-radius: ${borderRadius.lg};
  transition: all ${transitions.base};
  font-size: 1.1rem;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const MobileDrawer = styled.div`
  position: fixed;
  top: 0;
  right: ${props => props.open ? '0' : '-100%'};
  width: 80%;
  max-width: 320px;
  height: 100vh;
  background-color: white;
  box-shadow: ${shadows.xl};
  transition: right ${transitions.slow};
  z-index: 1001;
  padding: ${spacing[6]};
  overflow-y: auto;
`;

const MobileOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: ${props => props.open ? 'block' : 'none'};
  z-index: 1000;
  transition: opacity ${transitions.base};
`;

const MobileMenuHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing[8]};
  padding-bottom: ${spacing[4]};
  border-bottom: 1px solid ${colors.neutral[200]};
`;

const MobileMenuTitle = styled.h2`
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  letter-spacing: ${typography.letterSpacing.tight};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${colors.neutral[400]};
  cursor: pointer;
  padding: ${spacing[1]};
  border-radius: ${borderRadius.md};
  transition: all ${transitions.fast};

  &:hover {
    color: ${colors.neutral[600]};
    background-color: ${colors.neutral[100]};
  }
`;

const MobileNavLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[1]};
`;

const MobileNavLink = styled(Link)`
  display: block;
  padding: ${spacing[3]} ${spacing[4]};
  color: ${colors.neutral[700]};
  text-decoration: none;
  border-radius: ${borderRadius.md};
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.medium};
  transition: all ${transitions.fast};

  &:hover {
    background-color: ${colors.neutral[100]};
    color: ${colors.neutral[900]};
  }
`;

const MobileUserInfo = styled.div`
  padding: ${spacing[4]};
  margin-bottom: ${spacing[6]};
  background-color: ${colors.neutral[50]};
  border-radius: ${borderRadius.lg};
  text-align: center;
  border: 1px solid ${colors.neutral[200]};
`;

const MobileLogoutButton = styled.button`
  width: 100%;
  background-color: transparent;
  color: ${colors.error.main};
  border: 1px solid ${colors.error.light};
  padding: ${spacing[3]} ${spacing[4]};
  border-radius: ${borderRadius.md};
  cursor: pointer;
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.sans};
  margin-top: ${spacing[8]};
  transition: all ${transitions.fast};

  &:hover {
    background-color: rgba(239, 68, 68, 0.05);
    border-color: ${colors.error.main};
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
            <Logo to="/">Sales Daily</Logo>
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
          <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.neutral[900] }}>{user?.name}さん</div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.neutral[500], marginTop: spacing[1] }}>
            {isManager ? 'マネージャー' : '営業担当'}
          </div>
          <OnlineIndicator style={{ display: 'flex', justifyContent: 'center', marginTop: spacing[2] }}>
            <StatusDot online={isOnline} />
            {isOnline ? 'オンライン' : 'オフライン'}
          </OnlineIndicator>
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