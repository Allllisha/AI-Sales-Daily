import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { hearingSettingsAPI } from '../services/api';
import { 
  FaCog, FaSave, FaPlus, FaTrash, FaArrowUp, FaArrowDown,
  FaMicrophone, FaKeyboard, FaRobot, FaTimes, FaList
} from 'react-icons/fa';

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

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: #ff6b35;
  margin-bottom: var(--space-5);
  letter-spacing: -0.025em;
  line-height: var(--line-height-compressed);
  display: flex;
  align-items: center;
  gap: var(--space-3);

  @media (max-width: 768px) {
    font-size: var(--font-size-heading);
  }
`;

const Section = styled.div`
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-6);
  border-bottom: 2px solid var(--color-border);
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const FormGroup = styled.div`
  margin-bottom: var(--space-4);
`;

const Label = styled.label`
  display: block;
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-2);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
`;

const Input = styled.input`
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  background-color: var(--color-background);
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #ff6b35;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  background-color: var(--color-background);
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #ff6b35;
  }
`;

const NumberInput = styled.input`
  width: 120px;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  background-color: var(--color-background);
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #ff6b35;
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
  min-height: 80px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #ff6b35;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--font-size-body);
  
  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
`;

const QuestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
`;

const QuestionItem = styled.div`
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-3);
  background-color: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  position: relative;
`;

const QuestionNumber = styled.div`
  min-width: 30px;
  height: 30px;
  background-color: #ff6b35;
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-small);
`;

const QuestionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const QuestionActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  
  &:hover {
    color: #ff6b35;
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-6);
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background-color: ${props => props.primary ? '#ff6b35' : 'var(--color-background)'};
  color: ${props => props.primary ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'};
  border: 2px solid ${props => props.primary ? '#ff6b35' : 'var(--color-border)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.primary ? '#ff5722' : '#fff4f0'};
    border-color: ${props => props.primary ? '#ff5722' : '#ff6b35'};
    transform: translateY(-2px);
    box-shadow: var(--shadow-elevation);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-4);
`;

const TemplateCard = styled.div`
  padding: var(--space-4);
  background-color: ${props => props.selected ? '#fff4f0' : 'var(--color-background)'};
  border: 2px solid ${props => props.selected ? '#ff6b35' : 'var(--color-border)'};
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #ff6b35;
    transform: translateY(-2px);
    box-shadow: var(--shadow-elevation);
  }
  
  h4 {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
  }
  
  p {
    font-size: var(--font-size-small);
    color: var(--color-text-secondary);
    margin: 0;
  }
`;

const InfoBox = styled.div`
  padding: var(--space-4);
  background-color: #fff4f0;
  border: 2px solid #ffb088;
  border-radius: var(--radius-none);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
`;

const HearingSettingsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // 編集モードの場合IDが渡される
  const [loading, setLoading] = useState(false);
  const [savedSettings, setSavedSettings] = useState([]); // 保存済み設定リスト
  const [settings, setSettings] = useState({
    name: `カスタム設定 ${new Date().toLocaleDateString('ja-JP')}`,
    description: '', // バックエンド互換性のため残す
    // 基本設定
    greeting: 'お疲れ様です！今日はどんな一日でしたか？',
    input_mode: 'voice', // voice, text, both
    max_questions: 5,
    
    // 質問テンプレート
    question_template: 'default',
    custom_questions: [], // 初期値を必ず配列に
    
    // スロット設定（デフォルトで全て必須）
    required_slots: [
      'customer',
      'project',
      'next_action',
      'budget',
      'schedule',
      'participants',
      'location',
      'issues'
    ],
    optional_slots: [],
    
    // 高度な設定
    enable_follow_up: true,
    follow_up_threshold: 0.7,
    enable_smart_skip: true,
    is_default: false
  });

  // 質問テンプレート
  const questionTemplates = {
    default: {
      name: 'スタンダード',
      description: '一般的な営業活動向け',
      questions: [
        { text: '本日訪問された顧客はどちらでしたか？', targetSlot: 'customer', required: true },
        { text: 'どのような商談内容でしたか？', targetSlot: 'project', required: true },
        { text: '次のアクションは何ですか？', targetSlot: 'next_action', required: true },
        { text: '課題や懸念点はありましたか？', targetSlot: 'issues', required: false },
        { text: '他に共有したいことはありますか？', targetSlot: null, required: false }
      ]
    },
    detailed: {
      name: '詳細ヒアリング',
      description: '重要商談向けの詳細版',
      questions: [
        { text: '本日の訪問先と参加者を教えてください', targetSlot: 'customer', required: true },
        { text: '商談の主な議題は何でしたか？', targetSlot: 'project', required: true },
        { text: '予算感はいかがでしたか？', targetSlot: 'budget', required: false },
        { text: 'スケジュール感を教えてください', targetSlot: 'schedule', required: false },
        { text: '競合他社の動きはありましたか？', targetSlot: null, required: false },
        { text: '決裁者の反応はどうでしたか？', targetSlot: null, required: false },
        { text: '次のアクションと期日を教えてください', targetSlot: 'next_action', required: true }
      ]
    },
    quick: {
      name: 'クイック',
      description: '手短な報告向け（3問）',
      questions: [
        { text: '顧客名と案件名を教えてください', targetSlot: 'customer', required: true },
        { text: '結果と次のアクションは？', targetSlot: 'next_action', required: true },
        { text: '特記事項があれば教えてください', targetSlot: 'issues', required: false }
      ]
    },
    meeting: {
      name: '議事録深掘り',
      description: '議事録から抽出された情報を補完',
      questions: [
        { text: '議事録に記載のない顧客の雰囲気や反応はいかがでしたか？', targetSlot: null, required: false },
        { text: '議事録では分からない懸念点や課題はありましたか？', targetSlot: 'issues', required: false },
        { text: '参加者の中で特に重要な発言をした方はいましたか？', targetSlot: null, required: false },
        { text: '議事録に記載されていない次のアクションはありますか？', targetSlot: 'next_action', required: false },
        { text: '全体を通して印象に残ったことを教えてください', targetSlot: null, required: false }
      ]
    }
  };

  useEffect(() => {
    loadSettings();
  }, [id]);
  
  const loadSettings = async () => {
    setLoading(true);
    try {
      // 保存済み設定一覧を取得
      const settingsList = await hearingSettingsAPI.getAll();
      setSavedSettings(settingsList);
      
      if (id) {
        // 編集モード
        const setting = await hearingSettingsAPI.get(id);
        setSettings({
          ...setting,
          custom_questions: setting.custom_questions || []
        });
      } else {
        // 新規作成モード - デフォルト設定を読み込み
        try {
          const defaultSetting = await hearingSettingsAPI.getDefault();
          if (defaultSetting.id) {
            // デフォルト設定が存在する場合
            setSettings({
              ...defaultSetting,
              name: `カスタム設定 ${new Date().toLocaleDateString('ja-JP')}`, // 自動生成
              description: '',
              is_default: false
            });
          }
        } catch (error) {
          console.log('デフォルト設定が存在しません');
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateKey) => {
    const template = questionTemplates[templateKey];
    setSettings(prev => ({
      ...prev,
      question_template: templateKey,
      custom_questions: template.questions,
      max_questions: template.questions.length // テンプレートの質問数を自動設定
    }));
  };

  const addCustomQuestion = () => {
    setSettings(prev => {
      const newQuestions = [
        ...prev.custom_questions,
        { text: '', targetSlot: null, required: false }
      ];
      return {
        ...prev,
        custom_questions: newQuestions,
        max_questions: Math.max(prev.max_questions || 5, newQuestions.length) // 質問追加時に最大数も更新
      };
    });
  };

  const updateCustomQuestion = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      custom_questions: prev.custom_questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const removeCustomQuestion = (index) => {
    setSettings(prev => {
      const newQuestions = prev.custom_questions.filter((_, i) => i !== index);
      return {
        ...prev,
        custom_questions: newQuestions,
        max_questions: Math.max(newQuestions.length, Math.min(prev.max_questions || 5, 10)) // 質問削除時も調整
      };
    });
  };

  const moveQuestion = (index, direction) => {
    const newQuestions = [...settings.custom_questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newQuestions.length) {
      [newQuestions[index], newQuestions[targetIndex]] = 
      [newQuestions[targetIndex], newQuestions[index]];
      
      setSettings(prev => ({
        ...prev,
        custom_questions: newQuestions
      }));
    }
  };

  const handleSlotToggle = (slot, isRequired) => {
    setSettings(prev => {
      const required_slots = [...prev.required_slots];
      const optional_slots = [...prev.optional_slots];
      
      if (isRequired) {
        if (required_slots.includes(slot)) {
          // 必須から削除しようとする場合、最低3つの制限をチェック
          if (required_slots.length <= 3) {
            toast.error('最低3つの項目を選択してください');
            return prev;
          }
          // 必須から削除
          const index = required_slots.indexOf(slot);
          required_slots.splice(index, 1);
          optional_slots.push(slot);
        } else {
          // オプションから必須へ
          const index = optional_slots.indexOf(slot);
          if (index > -1) optional_slots.splice(index, 1);
          required_slots.push(slot);
        }
      } else {
        if (optional_slots.includes(slot)) {
          // オプションから削除（無効化）
          const index = optional_slots.indexOf(slot);
          optional_slots.splice(index, 1);
        } else if (required_slots.includes(slot)) {
          // 必須からオプションへ（最低3つの制限をチェック）
          if (required_slots.length <= 3) {
            toast.error('最低3つの項目を選択してください');
            return prev;
          }
          const index = required_slots.indexOf(slot);
          required_slots.splice(index, 1);
          optional_slots.push(slot);
        } else {
          // 無効からオプションへ
          optional_slots.push(slot);
        }
      }
      
      return {
        ...prev,
        required_slots,
        optional_slots
      };
    });
  };

  const saveSettings = async () => {
    // 設定名が空の場合は自動生成
    if (!settings.name || !settings.name.trim()) {
      const template = questionTemplates[settings.question_template];
      const templateName = template ? template.name : 'カスタム';
      settings.name = `${templateName}設定 ${new Date().toLocaleDateString('ja-JP')}`;
    }
    
    // バリデーション
    if (settings.custom_questions.length === 0) {
      toast.error('質問を1つ以上設定してください');
      return;
    }
    
    if (settings.required_slots.length < 3) {
      toast.error('収集する情報は最低3つ選択してください');
      return;
    }
    
    if (settings.custom_questions.some(q => !q.text.trim())) {
      toast.error('空の質問があります');
      return;
    }
    
    setLoading(true);
    try {
      if (id) {
        // 編集モード：既存の設定を更新
        await hearingSettingsAPI.update(id, settings);
        toast.success('設定を更新しました');
      } else {
        // 新規作成モード：常に新規作成
        await hearingSettingsAPI.create(settings);
        toast.success('カスタム設定を保存しました');
      }
      // 保存後は設定一覧を再読み込み
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedSetting = async (settingId) => {
    try {
      const setting = await hearingSettingsAPI.get(settingId);
      setSettings(setting);
      toast.success(`設定「${setting.name}」を読み込みました`);
    } catch (error) {
      console.error('Error loading setting:', error);
      toast.error('設定の読み込みに失敗しました');
    }
  };
  
  if (loading) {
    return (
      <Container>
        <Card>
          <Title>
            <FaCog /> 読み込み中...
          </Title>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <Title>
          <FaCog /> AIヒアリング設定管理
        </Title>
        
        <InfoBox>
          AIヒアリングの質問内容や回数をカスタマイズして保存できます。
          作成した設定は、ヒアリング開始時に選択して使用できます。
        </InfoBox>
        
        {savedSettings && savedSettings.length > 0 && (
          <Section>
            <SectionTitle>保存済み設定</SectionTitle>
            <InfoBox style={{ marginBottom: 'var(--space-4)' }}>
              複数のカスタム設定を作成できます。業界別、顧客タイプ別などで設定を使い分けることができます。
            </InfoBox>
            <TemplateGrid>
              {(() => {
                // 全てのカスタム設定を表示（新しい順）
                const customSettings = savedSettings
                  .filter(s => !s.is_default)
                  .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

                const inputModeLabels = {
                  voice: '音声入力用',
                  text: 'テキスト入力用',
                  both: '両方用',
                  meeting: '議事録用'
                };

                return customSettings.map((setting) => (
                  <TemplateCard
                    key={setting.id}
                    selected={settings.id === setting.id}
                    onClick={() => loadSavedSetting(setting.id)}
                  >
                    <h4>{setting.name}</h4>
                    {setting.description && <p>{setting.description}</p>}
                    <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-bold)', color: '#ff6b35' }}>
                      {inputModeLabels[setting.input_mode] || setting.input_mode}
                    </p>
                    <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--font-size-micro)', color: 'var(--color-text-tertiary)' }}>
                      質問数: {setting.max_questions}問
                    </p>
                  </TemplateCard>
                ));
              })()}
            </TemplateGrid>
          </Section>
        )}

        <Section>
          <SectionTitle>基本設定</SectionTitle>

          <FormGroup>
            <Label htmlFor="settingName">設定名 *</Label>
            <Input
              id="settingName"
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              placeholder="例: 建設業向け設定、IT企業向け設定"
              required
            />
            <div style={{
              marginTop: 'var(--space-2)',
              fontSize: 'var(--font-size-micro)',
              color: 'var(--color-text-secondary)'
            }}>
              この設定を識別するための名前を入力してください
            </div>
          </FormGroup>

          {settings.input_mode !== 'meeting' && (
            <FormGroup>
              <Label htmlFor="greeting">開始時の挨拶文</Label>
              <Input
                id="greeting"
                type="text"
                value={settings.greeting}
                onChange={(e) => setSettings({ ...settings, greeting: e.target.value })}
                placeholder="お疲れ様です！今日はどんな一日でしたか？"
              />
            </FormGroup>
          )}

          {settings.input_mode === 'meeting' && (
            <div style={{
              padding: 'var(--space-3)',
              backgroundColor: '#fff4f0',
              border: '2px solid #ffb088',
              borderRadius: 'var(--radius-none)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-text-secondary)'
            }}>
              議事録モードでは、挨拶文は議事録の内容から自動生成されます<br />
              例: 「〇〇株式会社様との面談はいかがでしたか？」
            </div>
          )}

          <FormGroup>
            <Label htmlFor="inputMode">設定適用入力方式</Label>
            <Select
              id="inputMode"
              value={settings.input_mode}
              onChange={(e) => {
                const newMode = e.target.value;
                // 入力方式変更時に適切なテンプレートを自動選択
                if (newMode === 'meeting') {
                  // 議事録モードの場合は議事録深掘りテンプレートを選択
                  handleTemplateSelect('meeting');
                } else if (settings.question_template === 'meeting') {
                  // 議事録モード以外に変更した場合、現在のテンプレートが議事録深掘りならデフォルトに変更
                  handleTemplateSelect('default');
                }
                setSettings({ ...settings, input_mode: newMode });
              }}
            >
              <option value="voice">音声入力のみ</option>
              <option value="text">テキスト入力のみ</option>
              <option value="both">両方（切り替え可能）</option>
              <option value="meeting">議事録モード</option>
            </Select>
            <div style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3)',
              backgroundColor: '#fff4f0',
              border: '2px solid #ffb088',
              borderRadius: 'var(--radius-none)',
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-text-secondary)'
            }}>
              <div style={{ fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)', color: '#ff6b35' }}>
                入力方式について
              </div>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', lineHeight: '1.6' }}>
                <li><strong>音声入力のみ</strong>: 音声での回答に最適化された質問</li>
                <li><strong>テキスト入力のみ</strong>: キーボード入力向けの質問</li>
                <li><strong>両方</strong>: 状況に応じて音声・テキストを切り替え</li>
                <li><strong>議事録モード</strong>: 議事録から自動抽出された情報を補完する追加質問</li>
              </ul>
              <p style={{ marginTop: 'var(--space-2)', marginBottom: 0, fontSize: 'var(--font-size-micro)', color: '#ff6b35' }}>
                複数のカスタム設定を作成して保存できます（業界別、顧客別など）
              </p>
            </div>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="maxQuestions">最大質問回数</Label>
            <NumberInput
              id="maxQuestions"
              type="number"
              min="3"
              max="10"
              value={settings.max_questions || 5}
              onChange={(e) => setSettings({ ...settings, max_questions: parseInt(e.target.value) || 5 })}
            />
            <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
              回まで（3〜10回）
            </span>
            <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-micro)', color: 'var(--color-text-tertiary)' }}>
              ※ テンプレート選択時は自動で設定されます
            </p>
          </FormGroup>
          
        </Section>

        <Section>
          <SectionTitle>質問テンプレート</SectionTitle>

          {settings.input_mode === 'meeting' && (
            <div style={{
              padding: 'var(--space-3)',
              backgroundColor: '#fff4f0',
              border: '2px solid #ffb088',
              borderRadius: 'var(--radius-none)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-text-secondary)'
            }}>
              議事録モードでは「議事録深掘り」テンプレートのみ使用できます
            </div>
          )}

          {settings.question_template && questionTemplates[settings.question_template] && (
            <div style={{
              padding: 'var(--space-3)',
              backgroundColor: '#fff4f0',
              border: '2px solid #ff6b35',
              borderRadius: 'var(--radius-none)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--font-size-small)',
              fontWeight: 'var(--font-weight-medium)',
              color: '#ff6b35'
            }}>
              現在の設定: {questionTemplates[settings.question_template].name} ({settings.custom_questions?.length || 0}問)
            </div>
          )}

          <TemplateGrid>
            {Object.entries(questionTemplates)
              .filter(([key, template]) => {
                // 議事録モードの場合は議事録深掘りテンプレートのみ表示
                if (settings.input_mode === 'meeting') {
                  return key === 'meeting';
                }
                // その他のモードの場合は議事録深掘りテンプレート以外を表示
                return key !== 'meeting';
              })
              .map(([key, template]) => (
                <TemplateCard
                  key={key}
                  selected={settings.question_template === key}
                  onClick={() => handleTemplateSelect(key)}
                >
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                  <p style={{ marginTop: 'var(--space-2)' }}>
                    質問数: {template.questions.length}問
                  </p>
                  {settings.question_template === key && (
                    <div style={{
                      marginTop: 'var(--space-2)',
                      padding: 'var(--space-1) var(--space-2)',
                      backgroundColor: '#ff6b35',
                      color: 'white',
                      fontSize: 'var(--font-size-micro)',
                      fontWeight: 'var(--font-weight-bold)',
                      borderRadius: 'var(--radius-none)',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      選択中
                    </div>
                  )}
                </TemplateCard>
              ))}
          </TemplateGrid>
          
          <QuestionList>
            <h3 style={{ fontSize: 'var(--font-size-body)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-3)' }}>
              カスタム質問リスト
            </h3>
            
            {(settings.custom_questions || []).map((question, index) => (
              <QuestionItem key={index}>
                <QuestionNumber>{index + 1}</QuestionNumber>
                <QuestionContent>
                  <TextArea
                    value={question.text}
                    onChange={(e) => updateCustomQuestion(index, 'text', e.target.value)}
                    placeholder="質問内容を入力..."
                  />
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <Select
                      value={question.targetSlot || ''}
                      onChange={(e) => updateCustomQuestion(index, 'targetSlot', e.target.value || null)}
                      style={{ width: '200px' }}
                    >
                      <option value="">対象スロットなし</option>
                      <option value="customer">顧客名</option>
                      <option value="project">案件名</option>
                      <option value="next_action">次アクション</option>
                      <option value="budget">予算</option>
                      <option value="schedule">スケジュール</option>
                      <option value="participants">参加者</option>
                      <option value="location">場所</option>
                      <option value="issues">課題</option>
                    </Select>
                    <CheckboxLabel>
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateCustomQuestion(index, 'required', e.target.checked)}
                      />
                      必須質問
                    </CheckboxLabel>
                  </div>
                </QuestionContent>
                <QuestionActions>
                  <ActionButton
                    onClick={() => moveQuestion(index, 'up')}
                    disabled={index === 0}
                  >
                    <FaArrowUp />
                  </ActionButton>
                  <ActionButton
                    onClick={() => moveQuestion(index, 'down')}
                    disabled={index === settings.custom_questions.length - 1}
                  >
                    <FaArrowDown />
                  </ActionButton>
                  <ActionButton onClick={() => removeCustomQuestion(index)}>
                    <FaTrash />
                  </ActionButton>
                </QuestionActions>
              </QuestionItem>
            ))}
            
            <Button onClick={addCustomQuestion}>
              <FaPlus /> 質問を追加
            </Button>
          </QuestionList>
        </Section>

        <Section>
          <SectionTitle>収集する情報（スロット）</SectionTitle>
          
          <div style={{
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            backgroundColor: '#fff4f0',
            border: '1px solid #ffb088',
            borderRadius: 'var(--radius-none)',
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-text-secondary)'
          }}>
            ※ 最低3つの項目を選択してください
          </div>
          
          <FormGroup>
            <Label>必須項目</Label>
            <CheckboxGroup>
              {['customer', 'project', 'next_action', 'budget', 'schedule', 'participants', 'location', 'issues'].map(slot => (
                <CheckboxLabel key={slot}>
                  <input
                    type="checkbox"
                    checked={settings.required_slots.includes(slot)}
                    onChange={() => handleSlotToggle(slot, true)}
                  />
                  {slot === 'customer' && '顧客名'}
                  {slot === 'project' && '案件名'}
                  {slot === 'next_action' && '次のアクション'}
                  {slot === 'budget' && '予算'}
                  {slot === 'schedule' && 'スケジュール'}
                  {slot === 'participants' && '参加者'}
                  {slot === 'location' && '場所'}
                  {slot === 'issues' && '課題・リスク'}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>高度な設定</SectionTitle>
          
          <CheckboxGroup>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={settings.enable_follow_up}
                onChange={(e) => setSettings({ ...settings, enable_follow_up: e.target.checked })}
              />
              動的フォローアップを有効化（未入力項目を自動で追加質問）
            </CheckboxLabel>
            
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={settings.enable_smart_skip}
                onChange={(e) => setSettings({ ...settings, enable_smart_skip: e.target.checked })}
              />
              スマートスキップを有効化（十分な情報が集まったら早めに終了）
            </CheckboxLabel>
          </CheckboxGroup>
        </Section>

        <div style={{
          padding: 'var(--space-4)',
          backgroundColor: '#fff4f0',
          border: '2px solid #ff6b35',
          borderRadius: 'var(--radius-none)',
          marginBottom: 'var(--space-4)',
          fontSize: 'var(--font-size-small)',
          textAlign: 'center'
        }}>
          {(() => {
            const modeLabels = {
              voice: '音声入力用',
              text: 'テキスト入力用',
              both: '両方用',
              meeting: '議事録用'
            };
            return (
              <>
                <div style={{ fontWeight: 'var(--font-weight-bold)', color: '#ff6b35', marginBottom: 'var(--space-2)' }}>
                  保存先: {modeLabels[settings.input_mode] || settings.input_mode}
                </div>
                <div style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-secondary)' }}>
                  この設定は「{modeLabels[settings.input_mode]}」として保存されます
                </div>
              </>
            );
          })()}
        </div>

        <ButtonGroup>
          <Button onClick={() => navigate('/')}>
            <FaTimes /> ホームへ戻る
          </Button>
          <Button primary onClick={saveSettings}>
            <FaSave /> 設定を保存
          </Button>
        </ButtonGroup>
      </Card>
    </Container>
  );
};

export default HearingSettingsPage;