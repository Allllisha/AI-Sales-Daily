import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { reportAPI, userAPI } from '../services/api';
import styled from '@emotion/styled';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '../styles/designSystem';
import { PrimaryButton, SecondaryButton, Card, Badge, LoadingContainer, Spinner } from '../styles/componentStyles';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${spacing[4]};

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const WelcomeSection = styled(Card)`
  padding: ${spacing[8]};
  margin-bottom: ${spacing[8]};
  background-color: white;
  
  @media (max-width: 768px) {
    padding: ${spacing[6]};
    border-radius: ${borderRadius.lg};
    margin-bottom: ${spacing[4]};
  }
`;

const WelcomeTitle = styled.h1`
  font-size: ${typography.fontSize['3xl']};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  margin-bottom: ${spacing[4]};
  letter-spacing: ${typography.letterSpacing.tight};
  line-height: ${typography.lineHeight.tight};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize['2xl']};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${spacing[4]};
  margin-top: ${spacing[6]};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${spacing[3]};
  }
`;

const StyledPrimaryButton = styled(PrimaryButton)`
  padding: ${spacing[3]} ${spacing[6]};
  font-size: ${typography.fontSize.base};
  
  @media (max-width: 768px) {
    width: 100%;
    padding: ${spacing[3]} ${spacing[4]};
    font-size: ${typography.fontSize.sm};
  }
`;

const StyledSecondaryButton = styled(SecondaryButton)`
  padding: ${spacing[3]} ${spacing[6]};
  font-size: ${typography.fontSize.base};
  
  @media (max-width: 768px) {
    width: 100%;
    padding: ${spacing[3]} ${spacing[4]};
    font-size: ${typography.fontSize.sm};
  }
`;

const ReportsSection = styled(Card)`
  padding: ${spacing[8]};
  margin-top: ${spacing[8]};

  @media (max-width: 768px) {
    padding: ${spacing[6]};
    border-radius: 0;
  }
`;

const SectionTitle = styled.h2`
  font-size: ${typography.fontSize['2xl']};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  margin-bottom: ${spacing[6]};
  letter-spacing: ${typography.letterSpacing.tight};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.xl};
    margin-bottom: ${spacing[4]};
  }
`;

const ReportList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`;

const ReportCard = styled(Card)`
  cursor: pointer;
  transition: all ${transitions.fast};

  &:hover {
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: ${spacing[4]};
  }
`;

const ReportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing[2]};
  flex-wrap: wrap;
  gap: ${spacing[2]};

  @media (max-width: 768px) {
    margin-bottom: ${spacing[3]};
  }
`;

const ReportDate = styled.div`
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.sm};
  }
`;

const ReportStatus = styled(Badge)`
  padding: ${spacing[1]} ${spacing[3]};
  font-size: ${typography.fontSize.xs};
  background-color: ${props => props.status === 'completed' ? 
    'rgba(34, 197, 94, 0.1)' : 
    'rgba(245, 158, 11, 0.1)'};
  color: ${props => props.status === 'completed' ? colors.success.dark : colors.warning.dark};
  border-color: ${props => props.status === 'completed' ? colors.success.light : colors.warning.light};
`;

const ReportInfo = styled.div`
  color: ${colors.neutral[600]};
  line-height: ${typography.lineHeight.normal};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.sm};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${spacing[12]};
  color: ${colors.neutral[500]};
`;

const CoachAdvice = styled.div`
  background-color: ${colors.neutral[50]};
  border: 1px solid ${colors.neutral[200]};
  padding: ${spacing[4]};
  border-radius: ${borderRadius.lg};
  margin-bottom: ${spacing[6]};
  display: flex;
  align-items: center;
  gap: ${spacing[3]};
  color: ${colors.neutral[700]};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  box-shadow: ${shadows.xs};

  @media (max-width: 768px) {
    padding: ${spacing[3]};
    font-size: ${typography.fontSize.sm};
  }
`;

const ManagerTabs = styled.div`
  display: flex;
  gap: ${spacing[2]};
  margin-bottom: ${spacing[6]};
  border-bottom: 1px solid ${colors.neutral[200]};
`;

const TabButton = styled.button`
  padding: ${spacing[3]} ${spacing[4]};
  border: none;
  background: none;
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  color: ${props => props.active ? colors.primary[600] : colors.neutral[600]};
  border-bottom: 2px solid ${props => props.active ? colors.primary[600] : 'transparent'};
  cursor: pointer;
  transition: all ${transitions.fast};

  &:hover {
    color: ${colors.primary[600]};
  }
`;

const TeamSelector = styled.div`
  display: flex;
  gap: ${spacing[3]};
  margin-bottom: ${spacing[4]};
  flex-wrap: wrap;
`;

const MemberButton = styled.button`
  padding: ${spacing[2]} ${spacing[3]};
  border: 1px solid ${props => props.selected ? colors.primary[500] : colors.neutral[300]};
  background: ${props => props.selected ? colors.primary[50] : 'white'};
  color: ${props => props.selected ? colors.primary[700] : colors.neutral[700]};
  border-radius: ${borderRadius.md};
  font-size: ${typography.fontSize.sm};
  cursor: pointer;
  transition: all ${transitions.fast};

  &:hover {
    border-color: ${colors.primary[500]};
    background: ${colors.primary[50]};
  }
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
        if (savedStates) {
          const actionStates = JSON.parse(savedStates);
          const pendingActions = Object.entries(actionStates).filter(([key, completed]) => !completed);
          
          if (pendingActions.length > 0) {
            if (pendingActions.length === 1) {
              advices.push('未完了のアクションが1件あります。マイ分析ページで確認してください');
            } else if (pendingActions.length <= 3) {
              advices.push(`未完了のアクションが${pendingActions.length}件あります。忘れずに対応しましょう`);
            } else {
              advices.push(`未完了のアクションが${pendingActions.length}件溜まっています。優先順位をつけて進めましょう`);
            }
          } else {
            // アクションが全て完了している場合の励ましメッセージ
            const totalActions = Object.keys(actionStates).length;
            if (totalActions > 0) {
              advices.push(`全${totalActions}件のアクションが完了しています！素晴らしい進捗です`);
            }
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
          <div style={{ padding: '20px', textAlign: 'center', color: colors.neutral[600] }}>
            {activeTab === 'team' ? 'チーム全体の日報を表示しています' : 
             selectedMembers.length === 0 ? 'メンバーを選択してください' : 
             `選択した${selectedMembers.length}名の日報を表示しています`}
          </div>
        )}
      </WelcomeSection>

      <ReportsSection>
        <SectionTitle>最近の日報</SectionTitle>
        
        {isLoading ? (
          <LoadingContainer>
            <Spinner />
          </LoadingContainer>
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