import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { tagsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6);

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

const Header = styled.div`
  margin-bottom: var(--space-6);
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  gap: var(--space-3);
  flex-wrap: wrap;
`;

const BackButton = styled.button`
  padding: var(--space-2) var(--space-4);
  background: transparent;
  border: none;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: var(--space-2);

  &:hover {
    color: var(--color-primary);
  }
`;

const TitleSection = styled.div`
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
  margin-bottom: var(--space-4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0 0 var(--space-2) 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;

  @media (max-width: 768px) {
    font-size: var(--font-size-2xl);
  }
`;

const TagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: var(--space-3) var(--space-5);
  background: ${props => props.color || '#3B82F6'};
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  box-shadow: 0 4px 12px ${props => props.color ? `${props.color}40` : 'rgba(59, 130, 246, 0.25)'};
  letter-spacing: 0.02em;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px ${props => props.color ? `${props.color}50` : 'rgba(59, 130, 246, 0.35)'};
  }

  @media (max-width: 768px) {
    font-size: var(--font-size-lg);
    padding: var(--space-2) var(--space-4);
  }
`;

const CategoryLabel = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
`;

const Button = styled.button`
  padding: var(--space-2) var(--space-4);
  background: ${props => props.primary ? 'var(--color-primary)' : 'var(--color-background-secondary)'};
  color: ${props => props.primary ? 'white' : 'var(--color-text)'};
  border: 1px solid ${props => props.primary ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  margin-bottom: var(--space-6);

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
`;

const CardTitle = styled.h2`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0 0 var(--space-4) 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
`;

const StatItem = styled.div`
  text-align: center;
  padding: var(--space-4);
  background: var(--color-background-secondary);
  border-radius: var(--radius-md);
`;

const StatValue = styled.div`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-1);
`;

const StatLabel = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
`;

const Section = styled.div`
  margin-bottom: var(--space-5);

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0 0 var(--space-3) 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
`;

const NewsItem = styled.div`
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  background: var(--color-background-secondary);

  &:last-child {
    margin-bottom: 0;
  }
`;

const NewsTitle = styled.div`
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin-bottom: var(--space-2);
  font-size: var(--font-size-base);
`;

const NewsSummary = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--space-2);
`;

const NewsLink = styled.a`
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-decoration: none;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
`;

const PersonItem = styled.div`
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  background: var(--color-background-secondary);
  font-size: var(--font-size-sm);

  &:last-child {
    margin-bottom: 0;
  }
`;

const ReportList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const ReportItem = styled.div`
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
  }
`;

const ReportDate = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
`;

const ReportContent = styled.div`
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin-bottom: var(--space-1);
`;

const ReportMeta = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
`;

const TopicTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: ${props => props.color || 'var(--color-primary)'};
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px ${props => props.color ? `${props.color}30` : 'rgba(59, 130, 246, 0.2)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => props.color ? `${props.color}40` : 'rgba(59, 130, 246, 0.3)'};
  }
`;

const TopicCount = styled.span`
  background: rgba(255, 255, 255, 0.3);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
`;

const SubSectionTitle = styled.h3`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0 0 var(--space-3) 0;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
`;

const HintText = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
  padding: var(--space-3);
  background: var(--color-background-secondary);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-sm);
`;

const LastFetched = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-secondary);
`;

const CompanyInfo = styled.div`
  padding: var(--space-4);
  background: var(--color-background-secondary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  line-height: 1.8;
  color: var(--color-text);

  strong {
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
  }

  ul {
    margin: var(--space-2) 0;
    padding-left: var(--space-5);
  }

  li {
    margin: var(--space-1) 0;
  }

  code {
    background: var(--color-background);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: monospace;
    font-size: var(--font-size-xs);
  }
`;

// シンプルなマークダウンをHTMLに変換する関数
const renderMarkdown = (text) => {
  if (!text) return '';

  let html = text;

  // Bingソース参照【数字:数字†source】を削除
  html = html.replace(/【\d+:\d+†source】/g, '');

  // **太字** を <strong> に変換
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // リスト項目を処理
  const lines = html.split('\n');
  let inList = false;
  const processedLines = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // リスト項目の場合
    if (trimmedLine.startsWith('- ')) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${trimmedLine.substring(2)}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (trimmedLine) {
        processedLines.push(line);
      }
    }
  });

  // 最後にリストが閉じられていない場合
  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('\n');
};

export default function TagDetailPage() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // タグ詳細情報を取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['tagDetail', tagId],
    queryFn: () => tagsAPI.getDetail(tagId),
    enabled: !!tagId
  });

  // Web情報取得mutation（初回取得用）
  const fetchInfoMutation = useMutation({
    mutationFn: () => tagsAPI.fetchInfo(tagId, false),
    onSuccess: (data) => {
      if (data.cached) {
        toast.success('DBから情報を読み込みました');
      } else {
        toast.success('Web情報を取得しました');
      }
      queryClient.invalidateQueries(['tagDetail', tagId]);
    },
    onError: (error) => {
      console.error('Web情報取得エラー:', error);
      toast.error('Web情報の取得に失敗しました');
    }
  });

  // Web情報更新mutation（強制再取得用）
  const updateInfoMutation = useMutation({
    mutationFn: () => tagsAPI.fetchInfo(tagId, true),
    onSuccess: () => {
      toast.success('Web情報を更新しました');
      queryClient.invalidateQueries(['tagDetail', tagId]);
    },
    onError: (error) => {
      console.error('Web情報更新エラー:', error);
      toast.error('Web情報の更新に失敗しました');
    }
  });

  // Web情報削除mutation
  const deleteWebInfoMutation = useMutation({
    mutationFn: () => tagsAPI.deleteWebInfo(tagId),
    onSuccess: () => {
      toast.success('Web情報を削除しました');
      queryClient.invalidateQueries(['tagDetail', tagId]);
    },
    onError: (error) => {
      console.error('Web情報削除エラー:', error);
      toast.error('Web情報の削除に失敗しました');
    }
  });

  if (isLoading) {
    return (
      <Container>
        <LoadingSpinner>読み込み中...</LoadingSpinner>
      </Container>
    );
  }

  if (error || !data?.success) {
    return (
      <Container>
        <EmptyState>タグ情報の取得に失敗しました</EmptyState>
      </Container>
    );
  }

  const { tag, web_info, reports, stats, related_tags = {} } = data;

  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleReportClick = (reportId) => {
    navigate(`/reports/${reportId}`);
  };

  const handleFetchInfo = () => {
    fetchInfoMutation.mutate();
  };

  const handleUpdateInfo = () => {
    updateInfoMutation.mutate();
  };

  const handleDeleteWebInfo = () => {
    if (window.confirm('保存されたWeb情報を削除してもよろしいですか？\n※削除後、再度「Web情報を取得」ボタンから取得できます。')) {
      deleteWebInfoMutation.mutate();
    }
  };

  // カテゴリ名を日本語に変換
  const getCategoryLabel = (category) => {
    const categoryMap = {
      'company': '会社',
      'person': '人物',
      'topic': 'トピック',
      'emotion': '感情',
      'stage': 'ステージ',
      'industry': '業界',
      'product': '製品'
    };
    return categoryMap[category] || category;
  };

  return (
    <Container>
      <Header>
        <TopBar>
          <BackButton onClick={() => navigate(-1)}>← 戻る</BackButton>
          <ActionButtons>
            {/* 企業タグの場合のみWeb情報取得ボタンを表示 */}
            {tag.category === 'company' && (
              <>
                {!web_info ? (
                  // Web情報がない場合：取得ボタンのみ
                  <Button
                    primary
                    onClick={handleFetchInfo}
                    disabled={fetchInfoMutation.isPending}
                  >
                    {fetchInfoMutation.isPending ? '取得中...' : 'Web情報を取得'}
                  </Button>
                ) : (
                  // Web情報がある場合：更新ボタンと削除ボタン
                  <>
                    <Button
                      primary
                      onClick={handleUpdateInfo}
                      disabled={updateInfoMutation.isPending}
                    >
                      {updateInfoMutation.isPending ? '更新中...' : 'Web情報を更新'}
                    </Button>
                    <Button
                      onClick={handleDeleteWebInfo}
                      disabled={deleteWebInfoMutation.isPending}
                    >
                      データを削除
                    </Button>
                  </>
                )}
              </>
            )}
          </ActionButtons>
        </TopBar>
        <TitleSection>
          <CategoryLabel>{getCategoryLabel(tag.category)}</CategoryLabel>
          <Title>
            <TagBadge color={tag.color}>{tag.name}</TagBadge>
          </Title>
        </TitleSection>
      </Header>

      <Grid>
        {/* 統計情報 */}
        <Card>
          <CardTitle>統計情報</CardTitle>
          <StatGrid>
            <StatItem>
              <StatValue>{stats.report_count}</StatValue>
              <StatLabel>使用日報数</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{stats.user_count}</StatValue>
              <StatLabel>使用ユーザー数</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{formatDate(stats.first_used)}</StatValue>
              <StatLabel>初回使用日</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{formatDate(stats.last_used)}</StatValue>
              <StatLabel>最終使用日</StatLabel>
            </StatItem>
          </StatGrid>
        </Card>

        {/* 関連情報（全てのタグカテゴリで表示） */}
        {tag.category && (
          <Card>
            <CardTitle>
              {tag.category === 'person' ? '人物に関する情報' :
               tag.category === 'emotion' ? 'この感情に関する情報' :
               tag.category === 'industry' ? 'この業界に関する情報' :
               tag.category === 'product' ? 'この製品に関する情報' :
               tag.category === 'company' ? 'この会社に関する情報' :
               tag.category === 'topic' ? 'この話題に関する情報' :
               tag.category === 'stage' ? 'このステージに関する情報' :
               '関連情報'}
            </CardTitle>
            {Object.keys(related_tags).some(key => related_tags[key]?.length > 0) ? (
              <Section>
                {/* 所属企業 / 関連企業 */}
                {related_tags.company && related_tags.company.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    <SubSectionTitle>
                      {tag.category === 'person' ? '所属企業' : '関連企業'}
                    </SubSectionTitle>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {related_tags.company.map((companyTag) => (
                        <TopicTag
                          key={companyTag.id}
                          color={companyTag.color}
                          onClick={() => navigate(`/tags/${companyTag.id}`)}
                        >
                          {companyTag.name}
                          <TopicCount>{companyTag.usage_count}回</TopicCount>
                        </TopicTag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 関連人物（人物タグ以外の全カテゴリで表示） */}
                {tag.category !== 'person' && related_tags.person && related_tags.person.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    <SubSectionTitle>関連人物</SubSectionTitle>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {related_tags.person.map((personTag) => (
                        <TopicTag
                          key={personTag.id}
                          color={personTag.color}
                          onClick={() => navigate(`/tags/${personTag.id}`)}
                        >
                          {personTag.name}
                          <TopicCount>{personTag.usage_count}回</TopicCount>
                        </TopicTag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 業界 */}
                {related_tags.industry && related_tags.industry.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    <SubSectionTitle>業界</SubSectionTitle>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {related_tags.industry.map((industryTag) => (
                        <TopicTag
                          key={industryTag.id}
                          color={industryTag.color}
                          onClick={() => navigate(`/tags/${industryTag.id}`)}
                        >
                          {industryTag.name}
                          <TopicCount>{industryTag.usage_count}回</TopicCount>
                        </TopicTag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 話題・趣味 */}
                {related_tags.topic && related_tags.topic.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    <SubSectionTitle>話題・趣味</SubSectionTitle>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {related_tags.topic.map((topicTag) => (
                        <TopicTag
                          key={topicTag.id}
                          color={topicTag.color}
                          onClick={() => navigate(`/tags/${topicTag.id}`)}
                        >
                          {topicTag.name}
                          <TopicCount>{topicTag.usage_count}回</TopicCount>
                        </TopicTag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 商談の雰囲気 */}
                {related_tags.emotion && related_tags.emotion.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    <SubSectionTitle>商談の雰囲気</SubSectionTitle>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {related_tags.emotion.map((emotionTag) => (
                        <TopicTag
                          key={emotionTag.id}
                          color={emotionTag.color}
                          onClick={() => navigate(`/tags/${emotionTag.id}`)}
                        >
                          {emotionTag.name}
                          <TopicCount>{emotionTag.usage_count}回</TopicCount>
                        </TopicTag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 営業ステージ */}
                {related_tags.stage && related_tags.stage.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    <SubSectionTitle>営業ステージ</SubSectionTitle>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {related_tags.stage.map((stageTag) => (
                        <TopicTag
                          key={stageTag.id}
                          color={stageTag.color}
                          onClick={() => navigate(`/tags/${stageTag.id}`)}
                        >
                          {stageTag.name}
                          <TopicCount>{stageTag.usage_count}回</TopicCount>
                        </TopicTag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 製品・サービス */}
                {related_tags.product && related_tags.product.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    <SubSectionTitle>関連製品・サービス</SubSectionTitle>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {related_tags.product.map((productTag) => (
                        <TopicTag
                          key={productTag.id}
                          color={productTag.color}
                          onClick={() => navigate(`/tags/${productTag.id}`)}
                        >
                          {productTag.name}
                          <TopicCount>{productTag.usage_count}回</TopicCount>
                        </TopicTag>
                      ))}
                    </div>
                  </div>
                )}

                <HintText>
                  この方との日報で共通してタグ付けされた情報です。次回訪問時の参考にしてください。
                </HintText>
              </Section>
            ) : (
              <EmptyState>
                {tag.category === 'person' && (
                  <>
                    まだ人物に関する情報が記録されていません<br />
                    日報を作成すると、この方に関する情報が自動的に表示されます
                  </>
                )}
                {tag.category === 'emotion' && (
                  <>
                    まだこの感情に関する情報が記録されていません<br />
                    日報を作成すると、この感情に関する情報が自動的に表示されます
                  </>
                )}
                {tag.category === 'industry' && (
                  <>
                    まだこの業界に関する情報が記録されていません<br />
                    日報を作成すると、この業界に関する情報が自動的に表示されます
                  </>
                )}
                {tag.category === 'product' && (
                  <>
                    まだこの製品に関する情報が記録されていません<br />
                    日報を作成すると、この製品に関する情報が自動的に表示されます
                  </>
                )}
                {tag.category === 'company' && (
                  <>
                    まだこの会社に関する情報が記録されていません<br />
                    日報を作成すると、この会社に関する情報が自動的に表示されます
                  </>
                )}
                {tag.category === 'topic' && (
                  <>
                    まだこの話題に関する情報が記録されていません<br />
                    日報を作成すると、この話題に関する情報が自動的に表示されます
                  </>
                )}
                {tag.category === 'stage' && (
                  <>
                    まだこのステージに関する情報が記録されていません<br />
                    日報を作成すると、このステージに関する情報が自動的に表示されます
                  </>
                )}
              </EmptyState>
            )}
          </Card>
        )}

        {/* 企業情報（企業タグの場合のみ表示） */}
        {tag.category === 'company' && (
          <Card>
            <CardTitle>企業情報</CardTitle>
            {web_info?.company_info ? (
              <Section>
                <CompanyInfo
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(
                      typeof web_info.company_info === 'string'
                        ? web_info.company_info
                        : web_info.company_info.description || 'データがありません'
                    )
                  }}
                />
                {web_info.last_fetched_at && (
                  <LastFetched>
                    最終取得: {formatDate(web_info.last_fetched_at)}
                  </LastFetched>
                )}
              </Section>
            ) : (
              <EmptyState>
                Web情報がありません<br />
                「Web情報を取得」ボタンで企業情報を取得できます
            </EmptyState>
          )}
          </Card>
        )}
      </Grid>

      {/* 最新ニュース（企業タグの場合のみ表示） */}
      {tag.category === 'company' && web_info?.latest_news && Array.isArray(web_info.latest_news) && web_info.latest_news.length > 0 && (
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <CardTitle>最新ニュース</CardTitle>
          <Section>
            {web_info.latest_news.map((news, index) => (
              <NewsItem key={index}>
                <NewsTitle dangerouslySetInnerHTML={{ __html: renderMarkdown(news.title) }} />
                {news.summary && news.summary !== news.title && (
                  <NewsSummary dangerouslySetInnerHTML={{ __html: renderMarkdown(news.summary) }} />
                )}
                {news.url && (
                  <NewsLink href={news.url} target="_blank" rel="noopener noreferrer">
                    {news.url}
                  </NewsLink>
                )}
              </NewsItem>
            ))}
          </Section>
        </Card>
      )}

      {/* 関連人物（企業タグの場合のみ表示） */}
      {tag.category === 'company' && web_info?.related_people && Array.isArray(web_info.related_people) && web_info.related_people.length > 0 && (
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <CardTitle>関連人物</CardTitle>
          <Section>
            {web_info.related_people.map((person, index) => (
              <PersonItem key={index}>
                {person.name && <strong dangerouslySetInnerHTML={{ __html: renderMarkdown(person.name) }} />}
                {person.description && person.description !== person.name && (
                  <div
                    style={{ marginTop: 'var(--space-1)' }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(person.description) }}
                  />
                )}
              </PersonItem>
            ))}
          </Section>
        </Card>
      )}

      {/* 最近の取り組み・注目トピック（企業タグの場合のみ表示） */}
      {tag.category === 'company' && web_info?.recent_topics && Array.isArray(web_info.recent_topics) && web_info.recent_topics.length > 0 && (
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <CardTitle>最近の取り組み・注目トピック</CardTitle>
          <Section>
            {web_info.recent_topics.map((topic, index) => (
              <NewsItem key={index}>
                <NewsTitle dangerouslySetInnerHTML={{ __html: renderMarkdown(topic.title) }} />
                {topic.summary && topic.summary !== topic.title && (
                  <NewsSummary dangerouslySetInnerHTML={{ __html: renderMarkdown(topic.summary) }} />
                )}
                {topic.url && (
                  <NewsLink href={topic.url} target="_blank" rel="noopener noreferrer">
                    {topic.url}
                  </NewsLink>
                )}
              </NewsItem>
            ))}
          </Section>
        </Card>
      )}

      {/* 関連日報 */}
      <Card>
        <CardTitle>関連日報 ({reports.length}件)</CardTitle>
        {reports.length > 0 ? (
          <ReportList>
            {reports.map((report) => (
              <ReportItem key={report.id} onClick={() => handleReportClick(report.id)}>
                <ReportDate>{formatDate(report.report_date)}</ReportDate>
                <ReportContent>
                  {report.customer && report.project
                    ? `${report.customer} - ${report.project}`
                    : report.customer || report.project || '（タイトルなし）'}
                </ReportContent>
                <ReportMeta>
                  作成者: {report.user_name} | ステータス: {report.status}
                </ReportMeta>
              </ReportItem>
            ))}
          </ReportList>
        ) : (
          <EmptyState>関連する日報がありません</EmptyState>
        )}
      </Card>
    </Container>
  );
}
