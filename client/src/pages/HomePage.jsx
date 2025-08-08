import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { reportAPI, userAPI, aiAPI, uploadAPI } from '../services/api';
import styled from '@emotion/styled';
import { format, startOfDay, differenceInDays, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
import MeetingNotesModal from '../components/MeetingNotesModal';
import Dynamics365Modal from '../components/Dynamics365Modal';
import SalesforceModal from '../components/SalesforceModal';
import ConfirmModal from '../components/ConfirmModal';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 0 var(--space-4);
  }

  @media (max-width: 480px) {
    padding: 0 var(--space-2);
  }
`;

const WelcomeSection = styled.div`
  padding: var(--space-6);
  margin-bottom: var(--space-6);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-structure);
  position: relative;
  
  @media (max-width: 768px) {
    padding: var(--space-5);
    margin-bottom: var(--space-5);
  }

  @media (max-width: 480px) {
    padding: var(--space-4);
    margin-bottom: var(--space-4);
    border-radius: var(--radius-md);
  }
`;

const WelcomeTitle = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: var(--color-primary);
  margin-bottom: var(--space-5);
  letter-spacing: -0.025em;
  line-height: var(--line-height-compressed);
  position: relative;
  
  /* Removed excessive underline accent */

  @media (max-width: 768px) {
    font-size: var(--font-size-heading);
    
    &::after {
      width: 40px;
    }
  }
`;

const ActionButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  margin-top: var(--space-6);
  position: relative;

  &.report-buttons {
    grid-template-columns: repeat(3, 1fr);
    
    @media (max-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  @media (max-width: 480px) {
    gap: var(--space-3);
    padding: 0;
  }
`;

const StyledPrimaryButton = styled.button`
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border: 2px solid var(--color-primary);
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  box-shadow: var(--shadow-elevation);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  min-height: 56px;
  
  &:hover:not(:disabled) {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    box-shadow: var(--shadow-structure);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: var(--color-text-tertiary);
    border-color: var(--color-text-tertiary);
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 768px) {
    padding: var(--space-4) var(--space-5);
    font-size: var(--font-size-micro);
    min-height: 48px;
    width: 100%;
  }

  @media (max-width: 480px) {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-micro);
    min-height: 44px;
    width: 100%;
  }
`;

const StyledSecondaryButton = styled.button`
  background-color: var(--color-background);
  color: var(--color-text-primary);
  border: 2px solid var(--color-border);
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  min-height: 56px;
  
  &:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
    color: var(--color-primary);
    box-shadow: var(--shadow-elevation);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    padding: var(--space-4) var(--space-5);
    font-size: var(--font-size-micro);
    min-height: 48px;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-micro);
    min-height: 44px;
    width: 100%;
  }
`;

const ReportsSection = styled.div`
  padding: var(--space-6);
  margin-top: var(--space-5);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-structure);
  position: relative;

  @media (max-width: 768px) {
    padding: var(--space-5);
    margin-top: var(--space-4);
  }
  
  @media (max-width: 480px) {
    padding: var(--space-4);
    margin-top: var(--space-3);
    border-radius: var(--radius-md);
  }
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-heading);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-6);
  letter-spacing: -0.02em;
  text-transform: uppercase;
  position: relative;
  
  /* Removed excessive underline accent */

  @media (max-width: 768px) {
    font-size: var(--font-size-title);
    margin-bottom: var(--space-5);
    
    &::after {
      width: 30px;
    }
  }
`;

const ReportList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
`;

const DateGroup = styled.div`
  margin-bottom: var(--space-6);
`;

const DateGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-3);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  font-size: var(--font-size-small);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: all 0.2s ease-in-out;
  
  &:hover {
    ${props => props.clickable && `
      background-color: var(--color-surface);
      border-color: var(--color-primary);
    `}
  }
`;

const DateGroupCount = styled.span`
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
`;

const ArchiveToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background-color: transparent;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    color: var(--color-accent);
  }
  
  svg {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease-in-out;
    transform: ${props => props.expanded ? 'rotate(90deg)' : 'rotate(0)'};
  }
`;

const ReportCard = styled.div`
  padding: var(--space-5);
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: var(--shadow-paper);
  position: relative;

  &:hover {
    box-shadow: var(--shadow-elevation);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  /* Removed excessive corner accent */

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

const ReportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  gap: var(--space-3);

  @media (max-width: 768px) {
    margin-bottom: var(--space-4);
  }
`;

const ReportDate = styled.div`
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);

  @media (max-width: 768px) {
    font-size: var(--font-size-small);
  }
`;

const ReportStatus = styled.span`
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-none);
  border: 1px solid;
  background-color: ${props => props.status === 'completed' ? 
    'rgba(45, 125, 50, 0.1)' : 
    'rgba(245, 124, 0, 0.1)'};
  color: ${props => props.status === 'completed' ? 'var(--color-success)' : 'var(--color-warning)'};
  border-color: ${props => props.status === 'completed' ? 'var(--color-success)' : 'var(--color-warning)'};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const ReportInfo = styled.div`
  color: var(--color-text-secondary);
  line-height: var(--line-height-standard);
  font-size: var(--font-size-small);

  @media (max-width: 768px) {
    font-size: var(--font-size-small);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
`;

const CoachAdvice = styled.div`
  background-color: var(--color-accent-light);
  border: 2px solid var(--color-accent);
  border-left: 6px solid var(--color-accent);
  padding: var(--space-5);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-6);
  color: var(--color-primary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-elevation);
  position: relative;
  line-height: var(--line-height-comfortable);
  
  /* Removed quote mark and corner detail for cleaner look */

  @media (max-width: 768px) {
    padding: var(--space-4);
    font-size: var(--font-size-small);
    border-left-width: 4px;
    
    &::before {
      font-size: var(--font-size-title);
    }
    
    &::after {
      width: 8px;
      height: 8px;
    }
  }
`;

const ManagerTabs = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  border-bottom: 2px solid var(--color-border);
  position: relative;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  
  @media (max-width: 480px) {
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
`;

const TabButton = styled.button`
  padding: var(--space-4) var(--space-5);
  border: none;
  background: none;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: ${props => props.active ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
  border-bottom: 3px solid ${props => props.active ? 'var(--color-accent)' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;

  &:hover {
    color: var(--color-accent);
  }
  
  @media (max-width: 480px) {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-micro);
  }
`;

const TeamSelector = styled.div`
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  
  @media (max-width: 480px) {
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
`;

const MemberButton = styled.button`
  padding: var(--space-3) var(--space-4);
  border: 2px solid ${props => props.selected ? 'var(--color-accent)' : 'var(--color-border)'};
  background-color: ${props => props.selected ? 'var(--color-accent-light)' : 'var(--color-background)'};
  color: ${props => props.selected ? 'var(--color-primary)' : 'var(--color-text-primary)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;

  &:hover {
    border-color: var(--color-accent);
    background-color: var(--color-accent-light);
    color: var(--color-primary);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-micro);
  }
  
  @media (max-width: 480px) {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-micro);
    flex: 1 1 calc(50% - var(--space-2));
    min-width: 0;
  }
`;

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isManager } = useAuth();
  const [isOnline] = React.useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState('self'); // 'self', 'team', 'individual'
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showDynamics365Modal, setShowDynamics365Modal] = useState(false);
  const [showSalesforceModal, setShowSalesforceModal] = useState(false);
  const [expandedArchives, setExpandedArchives] = useState({});
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });


  // 部下リストを取得
  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => userAPI.getTeamMembers(),
    enabled: isManager,
  });

  // 日報を取得（選択された範囲に応じて）
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', activeTab, selectedMembers],
    queryFn: () => {
      if (!isManager || activeTab === 'self') {
        return reportAPI.getReports({ limit: 50 }); // より多くの日報を取得
      } else if (activeTab === 'team') {
        return reportAPI.getTeamReports({ limit: 50 });
      } else {
        return reportAPI.getTeamReports({ 
          userIds: selectedMembers, 
          limit: 50 
        });
      }
    },
    enabled: isOnline,
  });

  // 日報をグループ化する処理
  const groupedReports = useMemo(() => {
    if (!reports || reports.length === 0) return { recent: [], archives: {} };

    const today = startOfDay(new Date());
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentReports = [];
    const archivesByMonth = {};

    reports.forEach(report => {
      const reportDate = parseISO(report.report_date);
      const daysDiff = differenceInDays(today, reportDate);

      if (daysDiff < 7) {
        // 直近1週間の日報
        recentReports.push(report);
      } else {
        // アーカイブ（年月でグループ化）
        const yearMonth = format(reportDate, 'yyyy年MM月', { locale: ja });
        if (!archivesByMonth[yearMonth]) {
          archivesByMonth[yearMonth] = [];
        }
        archivesByMonth[yearMonth].push(report);
      }
    });

    // 日付でグループ化（直近1週間）
    const recentByDate = {};
    recentReports.forEach(report => {
      const dateKey = format(parseISO(report.report_date), 'yyyy-MM-dd');
      if (!recentByDate[dateKey]) {
        recentByDate[dateKey] = [];
      }
      recentByDate[dateKey].push(report);
    });

    // 日付順にソート
    const sortedRecentDates = Object.keys(recentByDate).sort((a, b) => b.localeCompare(a));
    const sortedRecent = sortedRecentDates.map(date => ({
      date,
      displayDate: format(parseISO(date), 'MM月dd日(E)', { locale: ja }),
      reports: recentByDate[date]
    }));

    return {
      recent: sortedRecent,
      archives: archivesByMonth
    };
  }, [reports]);

  const handleNewReport = async (mode) => {
    try {
      // 今日の日報をチェック（複数対応）
      const todayReports = reports?.filter(report => {
        const reportDate = new Date(report.report_date).toDateString();
        const today = new Date().toDateString();
        return reportDate === today;
      }) || [];

      // ドラフトの日報があるか確認
      const draftReport = todayReports.find(r => r.status === 'draft');
      
      if (draftReport) {
        // ドラフトがある場合
        setConfirmModal({
          isOpen: true,
          title: '日報の作成',
          message: `本日${todayReports.length}件目の日報が下書きの状態です。\n新しい日報を作成しますか？`,
          confirmText: '新規作成',
          cancelText: '下書きを編集',
          onConfirm: () => {
            setConfirmModal({ isOpen: false });
            proceedWithNewReport(mode);
          },
          onCancel: () => {
            setConfirmModal({ isOpen: false });
            navigate(`/reports/${draftReport.id}/edit`);
          }
        });
        return;
      } else if (todayReports.length > 0) {
        // 完了済みの日報がある場合
        setConfirmModal({
          isOpen: true,
          title: '日報の作成',
          message: `本日既に${todayReports.length}件の日報があります。\n別の企業を訪問した日報を作成しますか？`,
          confirmText: '作成する',
          cancelText: 'キャンセル',
          onConfirm: () => {
            setConfirmModal({ isOpen: false });
            proceedWithNewReport(mode);
          },
          onCancel: () => {
            setConfirmModal({ isOpen: false });
          }
        });
        return;
      }

      // 新規作成に進む
      proceedWithNewReport(mode);
    } catch (error) {
      console.error('Error checking today report:', error);
      // エラーが発生した場合は新規作成を試みる
      proceedWithNewReport(mode);
    }
  };

  const proceedWithNewReport = (mode) => {
    if (mode === 'meeting') {
      // 議事録モーダルを表示
      setShowMeetingModal(true);
    } else if (mode === 'voice' && isOnline) {
      navigate('/hearing');
    } else {
      navigate('/hearing?mode=text');
    }
  };

  const handleReportClick = (reportId) => {
    navigate(`/reports/${reportId}`);
  };

  const getTodayAdvice = () => {
    if (!reports || reports.length === 0) {
      return '日報を作成して、営業活動を記録しましょう';
    }

    // 実際のデータに基づいたアドバイスを生成
    const advices = [];
    
    // アクション完了状況を確認（ローカルストレージから取得）
    const checkActionReminders = () => {
      try {
        const savedStates = localStorage.getItem('actionCompletionStates');
        const currentActions = localStorage.getItem('currentActionsList');
        
        if (currentActions) {
          // 現在のアクションリストがある場合は、それを基準にカウント
          try {
            const actionsList = JSON.parse(currentActions);
            const actionStates = savedStates ? JSON.parse(savedStates) : {};
            
            let pendingCount = 0;
            let completedCount = 0;
            
            actionsList.forEach(action => {
              const actionKey = `${action.reportId}_${action.text}`;
              const isCompleted = actionStates[actionKey] !== undefined ? actionStates[actionKey] : action.completed;
              
              if (isCompleted) {
                completedCount++;
              } else {
                pendingCount++;
              }
            });
            
            const totalActions = actionsList.length;
            
            if (pendingCount > 0) {
              if (pendingCount === 1) {
                advices.push('未完了のアクションが1件あります。マイ分析ページで確認してください');
              } else if (pendingCount <= 3) {
                advices.push(`未完了のアクションが${pendingCount}件あります。忘れずに対応しましょう`);
              } else {
                advices.push(`未完了のアクションが${pendingCount}件溜まっています。優先順位をつけて進めましょう`);
              }
            } else if (totalActions > 0) {
              advices.push(`全${totalActions}件のアクションが完了しています！素晴らしい進捗です`);
            }
          } catch (err) {
            console.error('Error parsing actions list:', err);
          }
        } else if (savedStates) {
          // フォールバック：古い方法（精度は低い）
          const actionStates = JSON.parse(savedStates);
          const pendingActions = Object.entries(actionStates).filter(([key, completed]) => !completed);
          
          if (pendingActions.length > 0) {
            advices.push(`未完了のアクションがあります。マイ分析ページで確認してください`);
          }
        }
      } catch (error) {
        console.error('Error reading action states:', error);
      }
    };
    
    checkActionReminders();
    
    // 最近の日報から顧客の訪問頻度を分析
    const customerCounts = {};
    const recentReports = reports.slice(0, 30); // 最近30件
    const veryRecentReports = reports.slice(0, 10); // 最近10件
    
    recentReports.forEach(report => {
      if (report.customer) {
        customerCounts[report.customer] = (customerCounts[report.customer] || 0) + 1;
      }
    });
    
    // 最近訪問していない顧客を検出
    const veryRecentCustomers = new Set(veryRecentReports.map(r => r.customer).filter(Boolean));
    const previousCustomers = Object.keys(customerCounts).filter(customer => 
      customerCounts[customer] >= 2 && !veryRecentCustomers.has(customer)
    );
    
    if (previousCustomers.length > 0) {
      advices.push(`最近${previousCustomers[0]}への訪問が減っています。フォローアップしましょう`);
    }
    
    // 完了率を分析
    const recentCompletedRate = reports.slice(0, 10).filter(r => r.status === 'completed').length / Math.min(reports.length, 10);
    const overallCompletedRate = reports.filter(r => r.status === 'completed').length / reports.length;
    
    if (recentCompletedRate > overallCompletedRate && recentCompletedRate >= 0.8) {
      advices.push('最近の日報完了率が向上しています！この調子で頑張りましょう');
    } else if (recentCompletedRate < 0.5) {
      advices.push('下書きの日報が多くなっています。完了することを忘れずに！');
    }
    
    // 今日の日報チェック
    const today = new Date().toDateString();
    const todayReport = reports.find(r => new Date(r.report_date).toDateString() === today);
    
    if (!todayReport) {
      advices.push('本日の日報がまだ作成されていません。忘れずに記録しましょう');
    }
    
    // 特定の案件の進捗
    const projectCounts = {};
    recentReports.forEach(report => {
      if (report.project) {
        projectCounts[report.project] = (projectCounts[report.project] || 0) + 1;
      }
    });
    
    const activeProjects = Object.entries(projectCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]);
    
    if (activeProjects.length > 0) {
      advices.push(`「${activeProjects[0][0]}」案件が活発です。進捗を確実に記録しましょう`);
    }
    
    // アドバイスがない場合のデフォルト
    if (advices.length === 0) {
      advices.push('順調に日報を作成できています。この調子で続けましょう！');
    }
    
    // ランダムに1つ選んで返す（ただし、アクションのリマインドがある場合は優先）
    const actionAdvices = advices.filter(advice => advice.includes('アクション'));
    if (actionAdvices.length > 0) {
      return actionAdvices[Math.floor(Math.random() * actionAdvices.length)];
    }
    
    return advices[Math.floor(Math.random() * advices.length)];
  };

  const handleMemberToggle = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleMeetingNotesSubmit = async (data) => {
    try {
      let processedContent = '';
      
      if (data.type === 'text') {
        // テキスト入力の場合
        processedContent = data.content;
      } else if (data.type === 'file') {
        // ファイルアップロードの場合
        toast.info('ファイルをアップロード中...');
        
        // ファイルをアップロード
        const uploadResponse = await uploadAPI.uploadFile(data.formData);
        
        if (!uploadResponse.success) {
          throw new Error(uploadResponse.message || 'ファイルアップロードに失敗しました');
        }
        
        toast.success('ファイルアップロード完了。処理中...');
        
        // ファイルを処理してテキストを抽出
        const processResponse = await uploadAPI.processFile(uploadResponse.file.id, data.fileType);
        
        if (!processResponse.success) {
          throw new Error(processResponse.message || 'ファイル処理に失敗しました');
        }
        
        processedContent = processResponse.extractedText;
        toast.success('ファイル処理完了');
      }
      
      // 抽出されたテキストでAIヒアリングを開始
      const meetingData = {
        type: 'text',
        content: processedContent
      };
      
      const response = await aiAPI.startMeetingNotes(meetingData);
      
      // セッションIDと抽出された情報を持ってヒアリングページへ遷移
      navigate(`/hearing?mode=meeting&sessionId=${response.sessionId}`, {
        state: {
          meetingContent: processedContent,
          extractedInfo: response.extractedInfo
        }
      });
      setShowMeetingModal(false);
      
    } catch (error) {
      console.error('Error processing meeting notes:', error);
      toast.error(error.message || '議事録の処理に失敗しました');
    }
  };

  const handleDynamics365Submit = async (data) => {
    try {
      // actionTypeをCRMデータに含める
      const dynamics365DataWithAction = {
        ...data,
        crmActionType: data.actionType // 'update' or 'create'
      };
      
      // CRMデータから議事録がある場合は議事録モードでAIヒアリング開始
      if (data.meetingNotes) {
        // 議事録データでAIヒアリングを開始
        const meetingData = {
          type: 'text',
          content: data.meetingNotes
        };
        
        const response = await aiAPI.startMeetingNotes(meetingData);
        
        // セッションIDを持ってヒアリングページへ遷移
        navigate(`/hearing?mode=meeting&sessionId=${response.sessionId}`, {
          state: {
            dynamics365Data: dynamics365DataWithAction,
            initialContext: data.meetingNotes
          }
        });
      } else {
        // 通常のDynamics 365データからAIヒアリング開始
        navigate('/hearing?mode=dynamics365', { 
          state: { 
            dynamics365Data: dynamics365DataWithAction 
          } 
        });
      }
      setShowDynamics365Modal(false);
    } catch (error) {
      console.error('Error processing Dynamics 365 data:', error);
      toast.error('Dynamics 365データの処理に失敗しました');
    }
  };

  const handleSalesforceSubmit = async (data) => {
    try {
      // actionTypeをCRMデータに含める
      const salesforceDataWithAction = {
        ...data,
        crmActionType: data.actionType // 'update' or 'create'
      };
      
      // CRMデータから議事録がある場合は議事録モードでAIヒアリング開始
      if (data.meetingNotes) {
        // 議事録データでAIヒアリングを開始
        const meetingData = {
          type: 'text',
          content: data.meetingNotes
        };
        
        const response = await aiAPI.startMeetingNotes(meetingData);
        
        // セッションIDを持ってヒアリングページへ遷移
        navigate(`/hearing?mode=meeting&sessionId=${response.sessionId}`, {
          state: {
            salesforceData: salesforceDataWithAction,
            initialContext: data.meetingNotes
          }
        });
      } else {
        // 通常のSalesforceデータからAIヒアリング開始
        navigate('/hearing?mode=salesforce', { 
          state: { 
            salesforceData: salesforceDataWithAction 
          } 
        });
      }
      setShowSalesforceModal(false);
    } catch (error) {
      console.error('Error processing Salesforce data:', error);
      toast.error('Salesforceデータの処理に失敗しました');
    }
  };

  return (
    <Container>
      <WelcomeSection>
        <WelcomeTitle>こんにちは、{user?.name}さん</WelcomeTitle>
        
        {!isManager && (
          <CoachAdvice>
            <span>{getTodayAdvice()}</span>
          </CoachAdvice>
        )}

        {isManager && (
          <>
            <ManagerTabs>
              <TabButton 
                active={activeTab === 'self'} 
                onClick={() => setActiveTab('self')}
              >
                自分
              </TabButton>
              <TabButton 
                active={activeTab === 'team'} 
                onClick={() => setActiveTab('team')}
              >
                チーム全体
              </TabButton>
              <TabButton 
                active={activeTab === 'individual'} 
                onClick={() => setActiveTab('individual')}
              >
                個別選択
              </TabButton>
            </ManagerTabs>

            {activeTab === 'individual' && teamMembers && (
              <TeamSelector>
                {teamMembers.map(member => (
                  <MemberButton
                    key={member.id}
                    selected={selectedMembers.includes(member.id)}
                    onClick={() => handleMemberToggle(member.id)}
                  >
                    {member.name}
                  </MemberButton>
                ))}
              </TeamSelector>
            )}
          </>
        )}

        {(!isManager || activeTab === 'self') && (
          <>
            <p>日報を作成しますか？</p>
            <ActionButtons className="report-buttons">
              <StyledPrimaryButton 
                onClick={() => handleNewReport('voice')}
                disabled={!isOnline}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2zm6 6c0 3.31-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.17 8.09 7.31 8.71V20h-2v2h5.38v-2h-2v-2.29C16.83 16.09 20 12.42 20 8h-2z"/>
                </svg>
                音声で開始
              </StyledPrimaryButton>
              <StyledSecondaryButton onClick={() => handleNewReport('text')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                テキストで開始
              </StyledSecondaryButton>
              <StyledSecondaryButton onClick={() => handleNewReport('meeting')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                議事録で開始
              </StyledSecondaryButton>
              <StyledSecondaryButton onClick={() => setShowDynamics365Modal(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0078d4">
                  <rect x="1" y="1" width="9" height="9" rx="1"/>
                  <rect x="14" y="1" width="9" height="9" rx="1"/>
                  <rect x="1" y="14" width="9" height="9" rx="1"/>
                  <rect x="14" y="14" width="9" height="9" rx="1"/>
                </svg>
                Dynamics 365から開始
              </StyledSecondaryButton>
              <StyledSecondaryButton onClick={() => setShowSalesforceModal(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#00A1E0">
                  <path d="M7.8 8.5c-1.4 0-2.7.8-3.3 2-.5-.2-1.1-.4-1.7-.4-1.9 0-3.4 1.5-3.4 3.4 0 .4.1.8.2 1.2-.6.5-1 1.2-1 2 0 1.4 1.1 2.6 2.5 2.6h14.2c2.4 0 4.3-1.9 4.3-4.3 0-2.1-1.4-3.9-3.4-4.2.1-.3.1-.7.1-1 0-2.4-1.9-4.3-4.3-4.3-.9 0-1.7.3-2.3.7-.8-1.4-2.2-2.3-3.9-2.3z"/>
                </svg>
                Salesforceから開始
              </StyledSecondaryButton>
            </ActionButtons>
          </>
        )}

        {(activeTab === 'team' || activeTab === 'individual') && (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}>
            {activeTab === 'team' ? 'チーム全体の日報を表示しています' : 
             selectedMembers.length === 0 ? 'メンバーを選択してください' : 
             `選択した${selectedMembers.length}名の日報を表示しています`}
          </div>
        )}
      </WelcomeSection>

      <ReportsSection>
        <SectionTitle>最近の日報</SectionTitle>
        
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid var(--color-border)', 
              borderTop: '3px solid var(--color-accent)', 
              borderRadius: '50%', 
              animation: 'spin 1s infinite linear' 
            }}></div>
          </div>
        ) : (groupedReports.recent.length > 0 || Object.keys(groupedReports.archives).length > 0) ? (
          <div>
            {/* 直近1週間の日報（日毎に表示） */}
            {groupedReports.recent.map(dateGroup => (
              <DateGroup key={dateGroup.date}>
                <DateGroupHeader>
                  <span>{dateGroup.displayDate}</span>
                  <DateGroupCount>{dateGroup.reports.length}件</DateGroupCount>
                </DateGroupHeader>
                <ReportList>
                  {dateGroup.reports.map((report) => (
                    <ReportCard 
                      key={report.id} 
                      onClick={() => handleReportClick(report.id)}
                    >
                      <ReportHeader>
                        <ReportDate>
                          {report.created_at ? format(new Date(report.created_at), 'HH:mm', { locale: ja }) : ''}
                          {report.daily_sequence && report.daily_sequence > 1 && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: 'var(--font-size-small)',
                              color: 'var(--color-accent)',
                              fontWeight: 'var(--font-weight-bold)'
                            }}>
                              ({report.daily_sequence}件目)
                            </span>
                          )}
                        </ReportDate>
                        <ReportStatus status={report.status}>
                          {report.status === 'completed' ? '完了' : '下書き'}
                        </ReportStatus>
                      </ReportHeader>
                      <ReportInfo>
                        {report.customer && `顧客: ${report.customer}`}
                        {report.project && ` / 案件: ${report.project}`}
                        {isManager && report.user_name && ` (${report.user_name})`}
                      </ReportInfo>
                    </ReportCard>
                  ))}
                </ReportList>
              </DateGroup>
            ))}

            {/* アーカイブ（年月毎） */}
            {Object.keys(groupedReports.archives).length > 0 && (
              <DateGroup>
                <DateGroupHeader style={{ marginTop: 'var(--space-6)' }}>
                  <span>アーカイブ</span>
                </DateGroupHeader>
                {Object.entries(groupedReports.archives)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([yearMonth, monthReports]) => (
                    <div key={yearMonth} style={{ marginBottom: 'var(--space-4)' }}>
                      <DateGroupHeader 
                        clickable 
                        onClick={() => setExpandedArchives(prev => ({ 
                          ...prev, 
                          [yearMonth]: !prev[yearMonth] 
                        }))}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="currentColor"
                            style={{
                              transform: expandedArchives[yearMonth] ? 'rotate(90deg)' : 'rotate(0)',
                              transition: 'transform 0.2s ease-in-out'
                            }}
                          >
                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                          </svg>
                          <span>{yearMonth}</span>
                        </div>
                        <DateGroupCount>{monthReports.length}件</DateGroupCount>
                      </DateGroupHeader>
                      {expandedArchives[yearMonth] && (
                        <ReportList style={{ marginTop: 'var(--space-3)' }}>
                          {monthReports
                            .sort((a, b) => b.report_date.localeCompare(a.report_date))
                            .map((report) => (
                              <ReportCard 
                                key={report.id} 
                                onClick={() => handleReportClick(report.id)}
                              >
                                <ReportHeader>
                                  <ReportDate>
                                    {format(new Date(report.report_date), 'MM月dd日(E)', { locale: ja })}
                                    {report.daily_sequence && report.daily_sequence > 1 && (
                                      <span style={{
                                        marginLeft: '8px',
                                        fontSize: 'var(--font-size-small)',
                                        color: 'var(--color-accent)',
                                        fontWeight: 'var(--font-weight-bold)'
                                      }}>
                                        ({report.daily_sequence}件目)
                                      </span>
                                    )}
                                  </ReportDate>
                                  <ReportStatus status={report.status}>
                                    {report.status === 'completed' ? '完了' : '下書き'}
                                  </ReportStatus>
                                </ReportHeader>
                                <ReportInfo>
                                  {report.customer && `顧客: ${report.customer}`}
                                  {report.project && ` / 案件: ${report.project}`}
                                  {isManager && report.user_name && ` (${report.user_name})`}
                                </ReportInfo>
                              </ReportCard>
                            ))}
                        </ReportList>
                      )}
                    </div>
                  ))}
              </DateGroup>
            )}
          </div>
        ) : (
          <EmptyState>まだ日報がありません</EmptyState>
        )}
      </ReportsSection>

      <MeetingNotesModal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        onSubmit={handleMeetingNotesSubmit}
      />
      <Dynamics365Modal
        isOpen={showDynamics365Modal}
        onClose={() => setShowDynamics365Modal(false)}
        onSubmit={handleDynamics365Submit}
      />
      <SalesforceModal
        isOpen={showSalesforceModal}
        onClose={() => setShowSalesforceModal(false)}
        onSubmit={handleSalesforceSubmit}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel || (() => setConfirmModal({ isOpen: false }))}
      />
    </Container>
  );
};

export default HomePage;