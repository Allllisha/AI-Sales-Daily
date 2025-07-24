import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';
import { colors, typography, spacing, borderRadius, shadows, transitions, media } from '../styles/designSystem';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${colors.neutral[50]};
`;

const Header = styled.header`
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid ${colors.neutral[200]};
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const Nav = styled.nav`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing[3]} ${spacing[6]};
  height: 64px;

  ${media.md} {
    padding: ${spacing[3]} ${spacing[4]};
  }

  @media (max-width: 768px) {
    padding: ${spacing[3]} ${spacing[4]};
  }
`;

const Logo = styled(Link)`
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  text-decoration: none;
  letter-spacing: ${typography.letterSpacing.tight};
  transition: color ${transitions.fast};

  &:hover {
    color: ${colors.neutral[700]};
  }

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.base};
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing[2]};

  @media (max-width: 768px) {
    gap: ${spacing[1]};
  }
`;

const NavLink = styled(Link)`
  color: ${colors.neutral[600]};
  text-decoration: none;
  padding: ${spacing[2]} ${spacing[3]};
  border-radius: ${borderRadius.md};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  transition: all ${transitions.fast};
  
  &:hover {
    color: ${colors.neutral[900]};
    background-color: ${colors.neutral[100]};
  }

  @media (max-width: 768px) {
    padding: ${spacing[1.5]} ${spacing[2]};
    font-size: ${typography.fontSize.xs};
  }
`;

const LogoutButton = styled.button`
  background-color: transparent;
  color: ${colors.neutral[600]};
  border: 1px solid ${colors.neutral[200]};
  padding: ${spacing[2]} ${spacing[3]};
  border-radius: ${borderRadius.md};
  cursor: pointer;
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.sans};
  transition: all ${transitions.fast};

  &:hover {
    color: ${colors.error.main};
    border-color: ${colors.error.light};
    background-color: rgba(239, 68, 68, 0.05);
  }

  @media (max-width: 768px) {
    padding: ${spacing[1.5]} ${spacing[2]};
    font-size: ${typography.fontSize.xs};
  }
`;

const Main = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${spacing[8]} ${spacing[6]};

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

  @media (max-width: 768px) {
    display: none;
  }
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.online ? colors.success.main : colors.warning.main};
`;

const UserName = styled.span`
  color: ${colors.neutral[700]};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileMenu = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${colors.neutral[700]};
  font-size: 1.25rem;
  cursor: pointer;
  padding: ${spacing[1]};
  border-radius: ${borderRadius.md};
  transition: all ${transitions.fast};

  &:hover {
    background-color: ${colors.neutral[100]};
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
          <Logo to="/">Sales Daily</Logo>
          <NavLinks>
            <OnlineIndicator>
              <StatusDot online={isOnline} />
              {isOnline ? 'オンライン' : 'オフライン'}
            </OnlineIndicator>
            <NavLink to="/">ホーム</NavLink>
            <NavLink to="/my-analytics">マイ分析</NavLink>
            {isManager && (
              <NavLink to="/team-analytics">チーム分析</NavLink>
            )}
            <UserName>{user?.name}さん</UserName>
            <LogoutButton onClick={handleLogout}>ログアウト</LogoutButton>
          </NavLinks>
          <MobileMenu onClick={() => setMobileMenuOpen(true)}>☰</MobileMenu>
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