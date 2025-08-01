import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { reportAPI, userAPI } from '../services/api';
import styled from '@emotion/styled';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 0 var(--space-4);
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
  
  /* Removed excessive corner details */
  
  @media (max-width: 768px) {
    padding: var(--space-6);
    margin-bottom: var(--space-6);
    
    &::before,
    &::after {
      width: 12px;
      height: 12px;
    }
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
  
  /* Central divider line */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 1px;
    height: 60%;
    background: var(--color-border);
    transform: translate(-50%, -50%);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    
    &::before {
      display: none;
    }
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
  
  /* Removed excessive corner accent */
  
  @media (max-width: 768px) {
    padding: var(--space-4) var(--space-5);
    font-size: var(--font-size-micro);
    min-height: 48px;
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
  
  /* Removed excessive corner accent */
  
  @media (max-width: 768px) {
    padding: var(--space-4) var(--space-5);
    font-size: var(--font-size-micro);
    min-height: 48px;
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

  /* Removed excessive corner details */

  @media (max-width: 768px) {
    padding: var(--space-6);
    
    &::before,
    &::after {
      width: 10px;
      height: 10px;
    }
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
  
  /* Removed excessive accent line */
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

  &:hover {
    color: var(--color-accent);
  }
`;

const TeamSelector = styled.div`
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
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
  
  /* Removed excessive corner accent */
`;

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const [isOnline] = React.useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState('self'); // 'self', 'team', 'individual'
  const [selectedMembers, setSelectedMembers] = useState([]);

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
        return reportAPI.getReports({ limit: 10 });
      } else if (activeTab === 'team') {
        return reportAPI.getTeamReports({ limit: 10 });
      } else {
        return reportAPI.getTeamReports({ 
          userIds: selectedMembers, 
          limit: 10 
        });
      }
    },
    enabled: isOnline,
  });

  const handleNewReport = async (mode) => {
    try {
      // 今日の日報が既にあるかチェック
      const todayReport = reports?.find(report => {
        const reportDate = new Date(report.report_date).toDateString();
        const today = new Date().toDateString();
        return reportDate === today;
      });

      if (todayReport) {
        // 既存の日報がある場合
        if (todayReport.status === 'draft') {
          // 下書きの場合は編集画面へ
          const confirmEdit = window.confirm('本日の日報が既に下書きで存在します。編集しますか？');
          if (confirmEdit) {
            navigate(`/reports/${todayReport.id}/edit`);
          }
        } else {
          // 完了済みの場合は詳細画面へ
          toast.error('本日の日報は既に完了しています');
          navigate(`/reports/${todayReport.id}`);
        }
      } else {
        // 新規作成
        if (mode === 'voice' && isOnline) {
          navigate('/hearing');
        } else {
          navigate('/hearing?mode=text');
        }
      }
    } catch (error) {
      console.error('Error checking today report:', error);
      // エラーが発生した場合は新規作成を試みる
      if (mode === 'voice' && isOnline) {
        navigate('/hearing');
      } else {
        navigate('/hearing?mode=text');
      }
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

        {activeTab === 'self' && (
          <>
            <p>今日の日報を作成しますか？</p>
            <ActionButtons>
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
        ) : reports && reports.length > 0 ? (
          <ReportList>
            {reports.map((report) => (
              <ReportCard 
                key={report.id} 
                onClick={() => handleReportClick(report.id)}
              >
                <ReportHeader>
                  <ReportDate>
                    {format(new Date(report.report_date), 'yyyy年MM月dd日(E)', { locale: ja })}
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
        ) : (
          <EmptyState>まだ日報がありません</EmptyState>
        )}
      </ReportsSection>
    </Container>
  );
};

export default HomePage;