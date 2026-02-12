import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';
import Avatar from './Avatar';
import { HiOutlineHome, HiOutlineBookOpen, HiOutlineSearch, HiOutlineChartBar, HiOutlineMenu, HiOutlineX, HiOutlineLogout, HiOutlineStatusOnline, HiOutlineKey, HiOutlineExclamation, HiOutlineClipboardCheck, HiOutlineShieldCheck, HiOutlineOfficeBuilding, HiOutlineChatAlt2, HiOutlineDesktopComputer, HiOutlineMicrophone } from 'react-icons/hi';
import ChangePasswordModal from './ChangePasswordModal';

const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--color-background);
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.9);
`;

const Nav = styled.nav`
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-6);
  height: 64px;

  @media (max-width: 768px) {
    padding: 0 var(--space-4);
    height: 56px;
  }
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
  color: var(--color-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-extrabold);
  white-space: nowrap;
  letter-spacing: -0.025em;

  @media (max-width: 768px) {
    font-size: var(--font-size-lg);
  }
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  background: var(--gradient-primary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-weight-extrabold);
  font-size: var(--font-size-lg);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.25);
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1);

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLinkStyled = styled(Link, { shouldForwardProp: prop => prop !== '$active' })`
  color: ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-text-secondary)'};
  text-decoration: none;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  position: relative;

  ${props => props.$active && css`
    background: var(--color-primary-50);
    font-weight: var(--font-weight-semibold);
  `}

  &:hover {
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
`;

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  font-size: 1.15rem;
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const OnlineIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1-5, 6px);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-3);
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);

  @media (max-width: 768px) {
    display: none;
  }
`;

const StatusDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: ${props => props.$online ? 'var(--color-success)' : 'var(--color-warning)'};
  box-shadow: ${props => props.$online ? '0 0 6px rgba(34, 197, 94, 0.5)' : 'none'};
`;

const UserName = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);

  @media (max-width: 768px) {
    display: none;
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-1-5, 6px);

  &:hover {
    color: var(--color-error);
    border-color: var(--color-error-light);
    background: var(--color-error-light);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  width: 44px;
  height: 44px;
  cursor: pointer;
  border-radius: var(--radius-md);
  font-size: 1.3rem;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-border);
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, ${props => props.$open ? '0.5' : '0'});
  backdrop-filter: ${props => props.$open ? 'blur(4px)' : 'none'};
  -webkit-backdrop-filter: ${props => props.$open ? 'blur(4px)' : 'none'};
  visibility: ${props => props.$open ? 'visible' : 'hidden'};
  z-index: 200;
  transition: all 0.3s ease;
`;

const MobileDrawer = styled.div`
  position: fixed;
  top: 0;
  right: ${props => props.$open ? '0' : '-100%'};
  width: 85%;
  max-width: 340px;
  height: 100vh;
  height: 100dvh;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  z-index: 201;
  padding: var(--space-6);
  overflow-y: auto;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$open ? 'var(--shadow-2xl)' : 'none'};
`;

const MobileDrawerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border-light);
`;

const MobileDrawerTitle = styled.h2`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
`;

const CloseButton = styled.button`
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  -webkit-tap-highlight-color: transparent;
  transition: all var(--transition-fast);
  font-size: 1.2rem;

  &:hover {
    color: var(--color-error);
    border-color: var(--color-error-light);
    background: var(--color-error-light);
  }
`;

const MobileNavLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const MobileNavSectionLabel = styled.div`
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-4) var(--space-4) var(--space-1) var(--space-4);
  margin-top: var(--space-2);
  &:first-of-type { margin-top: 0; }
`;

const MobileNavLink = styled(Link, { shouldForwardProp: prop => prop !== '$active' })`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  color: ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-text-primary)'};
  background: ${props => props.$active ? 'var(--color-primary-50)' : 'transparent'};
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: ${props => props.$active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)'};
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-primary-50);
    color: var(--color-primary-600, #2563eb);
  }
`;

const MobileUserInfo = styled.div`
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const MobileUserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5, 2px);
`;

const MobileActionButton = styled.button`
  width: 100%;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-top: var(--space-4);
  transition: all var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  &:hover {
    background: var(--color-surface-alt);
    color: var(--color-primary-600, #2563eb);
    border-color: var(--color-primary-600, #2563eb);
  }
`;

const MobileLogoutButton = styled.button`
  width: 100%;
  background: transparent;
  color: var(--color-error);
  border: 1.5px solid var(--color-error-light);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-top: var(--space-2);
  transition: all var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  &:hover {
    background: var(--color-error-light);
  }
`;

const Main = styled.main`
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-6);
  animation: fadeIn 0.3s ease-out;

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

/* Bottom nav for mobile */
const BottomNav = styled.nav`
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
  z-index: 90;
  padding-bottom: env(safe-area-inset-bottom, 0);

  @media (max-width: 768px) {
    display: flex;
  }
`;

const BottomNavItem = styled(Link, { shouldForwardProp: prop => prop !== '$active' })`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2) var(--space-1);
  text-decoration: none;
  font-size: 0.65rem;
  font-weight: ${props => props.$active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)'};
  color: ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-text-tertiary)'};
  transition: color var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
  position: relative;

  @media (max-width: 640px) {
    font-size: 0.6rem;
  }

  ${props => props.$active && css`
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 24px;
      height: 2px;
      background: var(--color-primary-600, #2563eb);
      border-radius: 0 0 2px 2px;
    }
  `}
`;

const BottomNavIcon = styled.span`
  font-size: 1.35rem;
  display: flex;
  align-items: center;

  @media (max-width: 640px) {
    font-size: 1.4rem;
  }
`;

const Spacer = styled.div`
  @media (max-width: 768px) {
    height: 68px;
  }
`;

const slideDown = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const OfflineBanner = styled.div`
  background: linear-gradient(90deg, #f59e0b, #d97706);
  color: white;
  text-align: center;
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  animation: ${slideDown} 0.3s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
`;

const roleLabels = {
  worker: '作業者',
  expert: '熟練者',
  site_manager: '現場監督',
  admin: '管理者'
};

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useOnlineStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const isSiteManager = user?.role === 'site_manager' || user?.role === 'admin';

  // ボトムナビ用（モバイル: 全ユーザー共通 4項目）
  const bottomNavItems = [
    { path: '/', label: 'ホーム', icon: <HiOutlineHome /> },
    { path: '/office-chat', label: 'AIチャット', icon: <HiOutlineChatAlt2 /> },
    { path: '/knowledge', label: 'ナレッジ', icon: <HiOutlineBookOpen /> },
    { path: '/safety', label: '安全管理', icon: <HiOutlineShieldCheck /> },
  ];

  // デスクトップヘッダーナビ用（フラット表示、主要項目のみ）
  const desktopNavItems = [
    { path: '/', label: 'ホーム', icon: <HiOutlineHome /> },
    { path: '/office-chat', label: 'AIチャット', icon: <HiOutlineChatAlt2 /> },
    { path: '/knowledge', label: 'ナレッジ', icon: <HiOutlineBookOpen /> },
    { path: '/knowledge/search', label: '検索', icon: <HiOutlineSearch /> },
    { path: '/safety', label: '安全管理', icon: <HiOutlineShieldCheck /> },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/safety') {
      return ['/safety', '/checklists', '/incidents', '/risk-assessment'].some(
        p => location.pathname.startsWith(p)
      );
    }
    if (path === '/office-chat') {
      return location.pathname === '/office-chat' || location.pathname === '/field-voice';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Container>
      <Header>
        <Nav>
          <LogoLink to="/">
            <LogoIcon>K</LogoIcon>
            現場のミカタ
          </LogoLink>
          <NavLinks>
            {desktopNavItems.map(item => (
              <NavLinkStyled
                key={item.path}
                to={item.path}
                $active={isActive(item.path)}
              >
                <NavIcon>{item.icon}</NavIcon>
                {item.label}
              </NavLinkStyled>
            ))}
            {isSiteManager && (
              <>
                <NavLinkStyled to="/analytics" $active={isActive('/analytics')}>
                  <NavIcon><HiOutlineChartBar /></NavIcon>
                  分析
                </NavLinkStyled>
                <NavLinkStyled to="/sites" $active={isActive('/sites')}>
                  <NavIcon><HiOutlineOfficeBuilding /></NavIcon>
                  現場
                </NavLinkStyled>
              </>
            )}
          </NavLinks>
          <UserSection>
            <OnlineIndicator>
              <StatusDot $online={isOnline} />
              {isOnline ? 'オンライン' : 'オフライン'}
            </OnlineIndicator>
            <UserName>{user?.name}</UserName>
            <LogoutButton onClick={handleLogout}>
              <HiOutlineLogout />
              ログアウト
            </LogoutButton>
            <MobileMenuButton onClick={() => setMobileMenuOpen(true)}>
              <HiOutlineMenu />
            </MobileMenuButton>
          </UserSection>
        </Nav>
      </Header>

      {!isOnline && (
        <OfflineBanner>
          <span style={{ fontSize: '1rem' }}>&#9888;</span>
          オフラインモード - 一部機能が制限されています
        </OfflineBanner>
      )}

      <MobileOverlay $open={mobileMenuOpen} onClick={closeMobileMenu} />
      <MobileDrawer $open={mobileMenuOpen}>
        <MobileDrawerHeader>
          <MobileDrawerTitle>メニュー</MobileDrawerTitle>
          <CloseButton onClick={closeMobileMenu}><HiOutlineX /></CloseButton>
        </MobileDrawerHeader>

        <MobileUserInfo>
          <Avatar name={user?.name} size="md" />
          <MobileUserDetails>
            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              {roleLabels[user?.role] || user?.role}
            </div>
          </MobileUserDetails>
        </MobileUserInfo>

        <MobileNavLinks>
          {/* メイン */}
          <MobileNavSectionLabel>メイン</MobileNavSectionLabel>
          <MobileNavLink to="/" $active={isActive('/')} onClick={closeMobileMenu}>
            <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineHome /></span>
            ホーム
          </MobileNavLink>
          <MobileNavLink to="/office-chat" $active={location.pathname === '/office-chat'} onClick={closeMobileMenu}>
            <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineDesktopComputer /></span>
            事務作業モード
          </MobileNavLink>
          <MobileNavLink to="/field-voice" $active={location.pathname === '/field-voice'} onClick={closeMobileMenu}>
            <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineMicrophone /></span>
            現場作業モード
          </MobileNavLink>

          {/* ナレッジ */}
          <MobileNavSectionLabel>ナレッジ</MobileNavSectionLabel>
          <MobileNavLink to="/knowledge" $active={isActive('/knowledge')} onClick={closeMobileMenu}>
            <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineBookOpen /></span>
            ナレッジ一覧
          </MobileNavLink>
          <MobileNavLink to="/knowledge/search" $active={isActive('/knowledge/search')} onClick={closeMobileMenu}>
            <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineSearch /></span>
            ナレッジ検索
          </MobileNavLink>

          {/* 安全管理 */}
          <MobileNavSectionLabel>安全管理</MobileNavSectionLabel>
          <MobileNavLink to="/checklists" $active={isActive('/checklists')} onClick={closeMobileMenu}>
            <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineClipboardCheck /></span>
            チェックリスト
          </MobileNavLink>
          <MobileNavLink to="/incidents" $active={isActive('/incidents')} onClick={closeMobileMenu}>
            <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineExclamation /></span>
            類災事例
          </MobileNavLink>
          <MobileNavLink to="/risk-assessment" $active={isActive('/risk-assessment')} onClick={closeMobileMenu}>
            <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineShieldCheck /></span>
            リスク評価
          </MobileNavLink>

          {/* 管理者メニュー */}
          {isSiteManager && (
            <>
              <MobileNavSectionLabel>管理</MobileNavSectionLabel>
              <MobileNavLink to="/analytics" $active={isActive('/analytics')} onClick={closeMobileMenu}>
                <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineChartBar /></span>
                分析ダッシュボード
              </MobileNavLink>
              <MobileNavLink to="/sites" $active={isActive('/sites')} onClick={closeMobileMenu}>
                <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineOfficeBuilding /></span>
                現場管理
              </MobileNavLink>
            </>
          )}
        </MobileNavLinks>

        <MobileActionButton onClick={() => { closeMobileMenu(); setChangePasswordOpen(true); }}>
          <HiOutlineKey />
          パスワード変更
        </MobileActionButton>
        <MobileLogoutButton onClick={handleLogout}>
          <HiOutlineLogout />
          ログアウト
        </MobileLogoutButton>
      </MobileDrawer>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />

      <Main>
        <Outlet />
      </Main>

      <Spacer />

      <BottomNav>
        {bottomNavItems.map(item => (
          <BottomNavItem
            key={item.path}
            to={item.path}
            $active={isActive(item.path)}
          >
            <BottomNavIcon>{item.icon}</BottomNavIcon>
            {item.label}
          </BottomNavItem>
        ))}
      </BottomNav>
    </Container>
  );
};

export default Layout;
