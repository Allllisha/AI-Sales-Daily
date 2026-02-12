import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import {
  FaEdit, FaSave, FaTimes,
  FaPrint, FaShare, FaClipboardList, FaBullseye,
  FaChartLine, FaExclamationTriangle
} from 'react-icons/fa';
import { scriptsAPI } from '../services/api';

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

const Card = styled.div`
  background-color: var(--color-surface);
  padding: var(--space-6);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-structure);
  margin-bottom: var(--space-6);
  position: relative;
  
  @media (max-width: 768px) {
    padding: var(--space-5);
    margin-bottom: var(--space-4);
  }
`;

const Header = styled.div`
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-5);
  border-bottom: 2px solid var(--color-border);
`;

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: var(--color-primary);
  margin-bottom: var(--space-3);
  letter-spacing: -0.025em;
  line-height: var(--line-height-compressed);
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    font-size: var(--font-size-heading);
  }
`;

const BadgeContainer = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
`;

const Badge = styled.span`
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border: 2px solid #ff6b35;
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background-color: ${props => props.primary ? 'var(--color-primary)' : 
                                props.success ? 'var(--color-success)' : 
                                props.danger ? 'var(--color-error)' : 
                                'var(--color-background)'};
  color: ${props => props.primary || props.success || props.danger ? 
                    'var(--color-text-inverse)' : 'var(--color-text-primary)'};
  border: 2px solid ${props => props.primary ? '#ff6b35' : 
                                props.success ? 'var(--color-success)' : 
                                props.danger ? 'var(--color-error)' : 
                                'var(--color-border)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation);
    ${props => !props.primary && !props.success && !props.danger && `
      background-color: var(--color-surface);
      border-color: #ff6b35;
    `}
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

// タブ関連のスタイルコンポーネントを削除

const Section = styled.div`
  margin-bottom: var(--space-5);
  padding: var(--space-6);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-structure);
  transition: all 0.2s ease-in-out;
  
  &:hover {
    box-shadow: var(--shadow-elevation);
  }
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-3);
  border-bottom: 2px solid var(--color-border);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const SectionContent = styled.div`
  padding: var(--space-4);
  background-color: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-3);
  line-height: var(--line-height-comfortable);
  transition: all 0.2s ease-in-out;
  
  &:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  background-color: var(--color-background);
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`;

const List = styled.ul`
  list-style: none;
  padding: 0 0 0 1.5em;
  margin: 0;
`;

const ListItem = styled.li`
  padding: var(--space-3) 0;
  border-bottom: 2px solid var(--color-border);
  color: var(--color-text-primary);
  line-height: var(--line-height-comfortable);
  position: relative;

  &:last-child {
    border-bottom: none;
  }

  &:before {
    content: '•';
    color: var(--color-primary);
    font-weight: bold;
    display: inline-block;
    position: absolute;
    left: -1.5em;
  }
`;

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

const Chip = styled.span`
  display: inline-block;
  padding: var(--space-2) var(--space-3);
  background-color: ${props => props.variant === 'warning' ? 'var(--color-warning)' : 
                                props.variant === 'success' ? 'var(--color-success)' : 
                                'var(--color-accent)'};
  color: var(--color-text-inverse);
  border: 2px solid transparent;
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatCard = styled.div`
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  padding: var(--space-4);
  border-radius: var(--radius-none);
  text-align: center;
  
  h4 {
    font-size: var(--font-size-body);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }
  
  .stat-value {
    font-size: var(--font-size-display);
    font-weight: var(--font-weight-thin);
    color: ${props => props.color || 'var(--color-primary)'};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
`;

const Alert = styled.div`
  padding: var(--space-4);
  background-color: ${props => props.type === 'warning' ? 'var(--color-warning-light)' : 'var(--color-info-bg)'};
  border: 2px solid ${props => props.type === 'warning' ? 'var(--color-warning)' : 'var(--color-info)'};
  border-left: 6px solid ${props => props.type === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)'};
  border-radius: var(--radius-none);
  margin-bottom: var(--space-3);
  font-weight: var(--font-weight-medium);
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: var(--space-8);
  font-size: var(--font-size-large);
  color: var(--color-text-secondary);
`;

const ScriptViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedSections, setEditedSections] = useState({});
  // タブ機能を削除
  // 練習モード関連のstateを削除

  const sectionLabels = {
    opening: 'オープニング',
    needs_discovery: 'ニーズ確認',
    value_proposition: '価値提案',
    objection_handling: '反論処理',
    closing: 'クロージング'
  };

  useEffect(() => {
    fetchScript();
  }, [id]);

  const fetchScript = async () => {
    try {
      const data = await scriptsAPI.getScript(id);
      setScript(data);
      setEditedSections(data.script_sections || {});
    } catch (error) {
      console.error('Error fetching script:', error);
      toast.error('スクリプトの取得に失敗しました');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const updatedScript = await scriptsAPI.updateScript(id, {
        script_sections: editedSections
      });
      setScript(updatedScript);
      setEditMode(false);
      toast.success('スクリプトを保存しました');
    } catch (error) {
      console.error('Error updating script:', error);
      toast.error('スクリプトの更新に失敗しました');
    }
  };

  const handleSectionEdit = (section, field, value) => {
    setEditedSections(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayEdit = (section, field, index, value) => {
    setEditedSections(prev => {
      const currentArray = prev[section]?.[field] || [];
      const newArray = [...currentArray];
      newArray[index] = value;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
  };

  const handleArrayAdd = (section, field) => {
    setEditedSections(prev => {
      const currentArray = prev[section]?.[field] || [];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: [...currentArray, '']
        }
      };
    });
  };

  const handleArrayRemove = (section, field, index) => {
    setEditedSections(prev => {
      const currentArray = prev[section]?.[field] || [];
      const newArray = currentArray.filter((_, i) => i !== index);
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
  };

  const handleObjectEdit = (section, oldKey, newKey, value) => {
    setEditedSections(prev => {
      const currentObj = { ...(prev[section] || {}) };

      // If key changed, remove old key and add new key
      if (oldKey !== newKey && oldKey) {
        delete currentObj[oldKey];
      }

      currentObj[newKey] = value;

      return {
        ...prev,
        [section]: currentObj
      };
    });
  };

  const handleObjectAdd = (section) => {
    setEditedSections(prev => {
      const currentObj = { ...(prev[section] || {}) };
      // Add empty key-value pair
      currentObj['新しい反論'] = '';

      return {
        ...prev,
        [section]: currentObj
      };
    });
  };

  const handleObjectRemove = (section, key) => {
    setEditedSections(prev => {
      const currentObj = { ...(prev[section] || {}) };
      delete currentObj[key];

      return {
        ...prev,
        [section]: currentObj
      };
    });
  };

  // 練習モード関連の関数を削除

  const renderSection = (sectionKey, sectionData) => {
    if (!sectionData) return null;

    return (
      <Section key={sectionKey}>
        <SectionTitle>
          {sectionLabels[sectionKey]}
        </SectionTitle>

        {/* メインスクリプト */}
        {sectionData.main && (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h4>メイントーク</h4>
            {editMode ? (
              <TextArea
                value={editedSections[sectionKey]?.main || ''}
                onChange={(e) => handleSectionEdit(sectionKey, 'main', e.target.value)}
                rows={3}
              />
            ) : (
              <SectionContent>
                {sectionData.main}
              </SectionContent>
            )}
          </div>
        )}

        {/* 代替案 */}
        {(sectionData.alternatives && sectionData.alternatives.length > 0) || editMode ? (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h4>トーク案</h4>
            {editMode ? (
              <>
                {(editedSections[sectionKey]?.alternatives || sectionData.alternatives || []).map((alt, index) => (
                  <div key={index} style={{ marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                    <TextArea
                      value={alt}
                      onChange={(e) => handleArrayEdit(sectionKey, 'alternatives', index, e.target.value)}
                      rows={2}
                      style={{ flex: 1 }}
                    />
                    <Button onClick={() => handleArrayRemove(sectionKey, 'alternatives', index)} style={{ alignSelf: 'flex-start' }}>
                      ✕
                    </Button>
                  </div>
                ))}
                <Button onClick={() => handleArrayAdd(sectionKey, 'alternatives')}>+ 追加</Button>
              </>
            ) : (
              <List>
                {sectionData.alternatives.map((alt, index) => (
                  <ListItem key={index}>{alt}</ListItem>
                ))}
              </List>
            )}
          </div>
        ) : null}

        {/* キーポイント */}
        {(sectionData.key_points && sectionData.key_points.length > 0) || editMode ? (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h4>ポイント</h4>
            {editMode ? (
              <>
                {(editedSections[sectionKey]?.key_points || sectionData.key_points || []).map((point, index) => (
                  <div key={index} style={{ marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => handleArrayEdit(sectionKey, 'key_points', index, e.target.value)}
                      style={{ flex: 1, padding: 'var(--space-2)', border: '2px solid var(--color-border)', borderRadius: 'var(--radius-none)' }}
                    />
                    <Button onClick={() => handleArrayRemove(sectionKey, 'key_points', index)}>
                      ✕
                    </Button>
                  </div>
                ))}
                <Button onClick={() => handleArrayAdd(sectionKey, 'key_points')}>+ 追加</Button>
              </>
            ) : (
              <ChipContainer>
                {sectionData.key_points.map((point, index) => (
                  <Chip key={index}>{point}</Chip>
                ))}
              </ChipContainer>
            )}
          </div>
        ) : null}

        {/* 質問リスト */}
        {(sectionData.questions && sectionData.questions.length > 0) || editMode ? (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h4>質問例</h4>
            {editMode ? (
              <>
                {(editedSections[sectionKey]?.questions || sectionData.questions || []).map((question, index) => (
                  <div key={index} style={{ marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                    <TextArea
                      value={question}
                      onChange={(e) => handleArrayEdit(sectionKey, 'questions', index, e.target.value)}
                      rows={2}
                      style={{ flex: 1 }}
                    />
                    <Button onClick={() => handleArrayRemove(sectionKey, 'questions', index)} style={{ alignSelf: 'flex-start' }}>
                      ✕
                    </Button>
                  </div>
                ))}
                <Button onClick={() => handleArrayAdd(sectionKey, 'questions')}>+ 追加</Button>
              </>
            ) : (
              <List>
                {sectionData.questions.map((question, index) => (
                  <ListItem key={index}>
                    Q{index + 1}. {question}
                  </ListItem>
                ))}
              </List>
            )}
          </div>
        ) : null}

        {/* 反論処理の表示 */}
        {sectionKey === 'objection_handling' && (
          <div>
            {editMode ? (
              <>
                {Object.entries(editedSections[sectionKey] || sectionData || {}).map(([objection, response]) => (
                  <div key={objection} style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <input
                        type="text"
                        value={objection}
                        onChange={(e) => handleObjectEdit(sectionKey, objection, e.target.value, response)}
                        placeholder="反論内容"
                        style={{ flex: 1, padding: 'var(--space-2)', border: '2px solid var(--color-warning)', borderRadius: 'var(--radius-none)', fontWeight: 'bold' }}
                      />
                      <Button onClick={() => handleObjectRemove(sectionKey, objection)}>
                        ✕
                      </Button>
                    </div>
                    <TextArea
                      value={response}
                      onChange={(e) => handleObjectEdit(sectionKey, objection, objection, e.target.value)}
                      rows={3}
                      placeholder="対応方法"
                    />
                  </div>
                ))}
                <Button onClick={() => handleObjectAdd(sectionKey)}>+ 反論を追加</Button>
              </>
            ) : (
              Object.entries(sectionData || {}).map(([objection, response]) => (
                <div key={objection} style={{ marginBottom: 'var(--space-3)' }}>
                  <Alert type="warning">
                    <strong>「{objection}」への対応</strong>
                  </Alert>
                  <SectionContent>{response}</SectionContent>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* 価値提案の各要素 */}
        {sectionKey === 'value_proposition' && (
          <>
            {/* メインメリット */}
            {(sectionData.main_benefits && sectionData.main_benefits.length > 0) || editMode ? (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h4>主要メリット</h4>
                {editMode ? (
                  <>
                    {(editedSections[sectionKey]?.main_benefits || sectionData.main_benefits || []).map((benefit, index) => (
                      <div key={index} style={{ marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                        <TextArea
                          value={benefit}
                          onChange={(e) => handleArrayEdit(sectionKey, 'main_benefits', index, e.target.value)}
                          rows={2}
                          style={{ flex: 1 }}
                        />
                        <Button onClick={() => handleArrayRemove(sectionKey, 'main_benefits', index)} style={{ alignSelf: 'flex-start' }}>
                          ✕
                        </Button>
                      </div>
                    ))}
                    <Button onClick={() => handleArrayAdd(sectionKey, 'main_benefits')}>+ 追加</Button>
                  </>
                ) : (
                  <List>
                    {sectionData.main_benefits.map((benefit, index) => (
                      <ListItem key={index}>{benefit}</ListItem>
                    ))}
                  </List>
                )}
              </div>
            ) : null}

            {/* 実績・証明ポイント */}
            {(sectionData.proof_points && sectionData.proof_points.length > 0) || editMode ? (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h4>実績・証明</h4>
                {editMode ? (
                  <>
                    {(editedSections[sectionKey]?.proof_points || sectionData.proof_points || []).map((proof, index) => (
                      <div key={index} style={{ marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                        <TextArea
                          value={proof}
                          onChange={(e) => handleArrayEdit(sectionKey, 'proof_points', index, e.target.value)}
                          rows={2}
                          style={{ flex: 1 }}
                        />
                        <Button onClick={() => handleArrayRemove(sectionKey, 'proof_points', index)} style={{ alignSelf: 'flex-start' }}>
                          ✕
                        </Button>
                      </div>
                    ))}
                    <Button onClick={() => handleArrayAdd(sectionKey, 'proof_points')}>+ 追加</Button>
                  </>
                ) : (
                  <List>
                    {sectionData.proof_points.map((proof, index) => (
                      <ListItem key={index}>{proof}</ListItem>
                    ))}
                  </List>
                )}
              </div>
            ) : null}

            {/* 差別化ポイント */}
            {(sectionData.differentiators && sectionData.differentiators.length > 0) || editMode ? (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h4>差別化ポイント</h4>
                {editMode ? (
                  <>
                    {(editedSections[sectionKey]?.differentiators || sectionData.differentiators || []).map((diff, index) => (
                      <div key={index} style={{ marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                        <TextArea
                          value={diff}
                          onChange={(e) => handleArrayEdit(sectionKey, 'differentiators', index, e.target.value)}
                          rows={2}
                          style={{ flex: 1 }}
                        />
                        <Button onClick={() => handleArrayRemove(sectionKey, 'differentiators', index)} style={{ alignSelf: 'flex-start' }}>
                          ✕
                        </Button>
                      </div>
                    ))}
                    <Button onClick={() => handleArrayAdd(sectionKey, 'differentiators')}>+ 追加</Button>
                  </>
                ) : (
                  <List>
                    {sectionData.differentiators.map((diff, index) => (
                      <ListItem key={index}>{diff}</ListItem>
                    ))}
                  </List>
                )}
              </div>
            ) : null}
          </>
        )}
        
        {/* クロージングの各要素 */}
        {sectionKey === 'closing' && (
          <>
            {/* トライアルクローズ */}
            {sectionData.trial_close || editMode ? (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h4>温度感確認</h4>
                {editMode ? (
                  <TextArea
                    value={editedSections[sectionKey]?.trial_close || ''}
                    onChange={(e) => handleSectionEdit(sectionKey, 'trial_close', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <SectionContent>{sectionData.trial_close}</SectionContent>
                )}
              </div>
            ) : null}

            {/* 次のアクション */}
            {sectionData.next_action || editMode ? (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h4>次のステップ提案</h4>
                {editMode ? (
                  <TextArea
                    value={editedSections[sectionKey]?.next_action || ''}
                    onChange={(e) => handleSectionEdit(sectionKey, 'next_action', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <SectionContent>{sectionData.next_action}</SectionContent>
                )}
              </div>
            ) : null}

            {/* コミットメント獲得 */}
            {sectionData.commitment || editMode ? (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h4>コミットメント獲得</h4>
                {editMode ? (
                  <TextArea
                    value={editedSections[sectionKey]?.commitment || ''}
                    onChange={(e) => handleSectionEdit(sectionKey, 'commitment', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <SectionContent>{sectionData.commitment}</SectionContent>
                )}
              </div>
            ) : null}

            {/* フォローアップ */}
            {sectionData.follow_up || editMode ? (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h4>フォローアップ</h4>
                {editMode ? (
                  <TextArea
                    value={editedSections[sectionKey]?.follow_up || ''}
                    onChange={(e) => handleSectionEdit(sectionKey, 'follow_up', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <SectionContent>{sectionData.follow_up}</SectionContent>
                )}
              </div>
            ) : null}
          </>
        )}
      </Section>
    );
  };

  if (loading) {
    return (
      <Container>
        <Card>
          <LoadingSpinner>読み込み中...</LoadingSpinner>
        </Card>
      </Container>
    );
  }

  if (!script) {
    return (
      <Container>
        <Card>
          <p>スクリプトが見つかりません</p>
          <Button onClick={() => navigate('/')}>ホームへ戻る</Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <Header>
          <Title>営業トークスクリプト</Title>
          <BadgeContainer>
            <Badge>{script.customer}</Badge>
            <Badge>{script.visit_purpose}</Badge>
          </BadgeContainer>
          
          <ButtonGroup>
            {!editMode ? (
              <>
                <Button onClick={() => setEditMode(true)}>
                  <FaEdit /> 編集
                </Button>
                <Button onClick={() => window.print()}>
                  <FaPrint /> 印刷
                </Button>
              </>
            ) : (
              <>
                <Button success onClick={handleSave}>
                  <FaSave /> 保存
                </Button>
                <Button onClick={() => {
                  setEditMode(false);
                  setEditedSections(script.script_sections || {});
                }}>
                  <FaTimes /> キャンセル
                </Button>
              </>
            )}
            <Button onClick={() => navigate('/scripts')}>
              一覧へ戻る
            </Button>
          </ButtonGroup>
        </Header>

        {/* スクリプトを直接表示 */}
        <div>
          {/* 営業の流れに沿った正しい順序で表示 */}
          {[
            'opening',           // 1. オープニング
            'needs_discovery',   // 2. ニーズ確認
            'value_proposition', // 3. 価値提案
            'objection_handling',// 4. 反論処理
            'closing'           // 5. クロージング
          ].map(key => {
            const section = script.script_sections?.[key];
            return section ? renderSection(key, section) : null;
          })}
        </div>


      </Card>
    </Container>
  );
};

export default ScriptViewPage;