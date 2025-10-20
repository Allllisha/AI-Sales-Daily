import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { FaRobot, FaCheckCircle, FaArrowRight, FaArrowLeft, FaClipboardList } from 'react-icons/fa';

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

  @media (max-width: 768px) {
    font-size: var(--font-size-heading);
  }
`;

const StepperContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-border);
    z-index: 0;
  }
`;

const StepItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${props => props.active ? '#ff6b35' : props.completed ? '#ff8c42' : 'var(--color-background)'};
  color: ${props => props.active || props.completed ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)'};
  border: 2px solid ${props => props.active ? '#ff6b35' : props.completed ? '#ff8c42' : 'var(--color-border)'};
  border-radius: 50%;
  font-weight: var(--font-weight-medium);
  z-index: 1;
  position: relative;
`;

const StepLabel = styled.div`
  position: absolute;
  top: 50px;
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  text-align: center;
  width: 80px;
  left: 50%;
  transform: translateX(-50%);
  line-height: 1.2;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const FormGroup = styled.div`
  margin-bottom: var(--space-4);
`;

const Label = styled.label`
  display: block;
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-2);
  color: var(--color-text-primary);
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
    border-color: #ff6b35;
  }
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

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  
  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
`;

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background-color: #ff6b35;
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  font-size: var(--font-size-small);
  
  button {
    margin-left: var(--space-2);
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: var(--font-size-body);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-6);
  gap: var(--space-3);
  
  @media (max-width: 768px) {
    flex-direction: column-reverse;
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

const InfoCard = styled.div`
  background-color: #fff4f0;
  border: 2px solid #ffb088;
  padding: var(--space-4);
  border-radius: var(--radius-none);
  margin-top: var(--space-3);
`;

const SuccessContainer = styled.div`
  text-align: center;
  padding: var(--space-8);
  
  svg {
    font-size: 64px;
    color: #ff8c42;
    margin-bottom: var(--space-4);
  }
  
  h2 {
    font-size: var(--font-size-heading);
    margin-bottom: var(--space-3);
  }
  
  p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-6);
  }
`;

const LoadingSpinner = styled.div`
  border: 3px solid var(--color-border);
  border-top: 3px solid #ff6b35;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  display: inline-block;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ScriptGeneratorPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [report, setReport] = useState(null);
  const [formData, setFormData] = useState({
    visitPurpose: '',
    customPurpose: '',
    objectives: [],
    customObjective: '',
    focusPoints: []
  });
  const [generatedScript, setGeneratedScript] = useState(null);
  const [customObjectives, setCustomObjectives] = useState([]);

  const steps = ['訪問目的', '達成目標', 'スクリプト生成'];

  const visitPurposes = [
    { value: 'initial', label: '初回訪問' },
    { value: 'follow_up', label: 'フォローアップ' },
    { value: 'proposal', label: '提案' },
    { value: 'negotiation', label: '価格交渉' },
    { value: 'closing', label: 'クロージング' },
    { value: 'after_service', label: 'アフターフォロー' },
    { value: 'custom', label: 'その他（自由入力）' }
  ];

  const defaultObjectiveOptions = [
    'ニーズ確認',
    '予算確認',
    '決裁者特定',
    '競合確認',
    '導入時期確認',
    'デモ実施',
    '見積提示',
    '契約締結',
    '次回アポイント取得'
  ];

  const objectiveOptions = [...defaultObjectiveOptions, ...customObjectives];

  const focusPointOptions = [
    '信頼関係構築',
    '課題深掘り',
    'ROI説明',
    '差別化ポイント強調',
    'リスク対処',
    '成功事例紹介'
  ];

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        toast.error('日報の取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('日報の取得に失敗しました');
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      generateScript();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleObjectiveToggle = (objective) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.includes(objective)
        ? prev.objectives.filter(o => o !== objective)
        : [...prev.objectives, objective]
    }));
  };

  const handleFocusPointToggle = (point) => {
    setFormData(prev => ({
      ...prev,
      focusPoints: prev.focusPoints.includes(point)
        ? prev.focusPoints.filter(p => p !== point)
        : [...prev.focusPoints, point]
    }));
  };

  const addCustomObjective = () => {
    if (formData.customObjective.trim()) {
      const newObjective = formData.customObjective.trim();
      if (!objectiveOptions.includes(newObjective)) {
        setCustomObjectives(prev => [...prev, newObjective]);
      }
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective],
        customObjective: ''
      }));
    }
  };

  const generateScript = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const visitPurpose = formData.visitPurpose === 'custom' 
        ? formData.customPurpose 
        : visitPurposes.find(p => p.value === formData.visitPurpose)?.label;

      const response = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportId,
          visitPurpose,
          objectives: formData.objectives,
          focusPoints: formData.focusPoints
        })
      });

      if (response.ok) {
        const script = await response.json();
        toast.success('スクリプトが生成されました！');
        // 直接スクリプト表示画面へ遷移
        navigate(`/scripts/${script.id}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'スクリプト生成に失敗しました');
      }
    } catch (error) {
      console.error('Error generating script:', error);
      toast.error('スクリプト生成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // saveAndView関数を削除（直接遷移するため不要）

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
            <h2>次回の訪問目的を選択してください</h2>
            <FormGroup>
              <Label htmlFor="visitPurpose">訪問目的</Label>
              <Select
                id="visitPurpose"
                value={formData.visitPurpose}
                onChange={(e) => setFormData({ ...formData, visitPurpose: e.target.value })}
              >
                <option value="">選択してください</option>
                {visitPurposes.map(purpose => (
                  <option key={purpose.value} value={purpose.value}>
                    {purpose.label}
                  </option>
                ))}
              </Select>
            </FormGroup>
            {formData.visitPurpose === 'custom' && (
              <FormGroup>
                <Label htmlFor="customPurpose">訪問目的（自由入力）</Label>
                <TextArea
                  id="customPurpose"
                  value={formData.customPurpose}
                  onChange={(e) => setFormData({ ...formData, customPurpose: e.target.value })}
                  rows={2}
                  placeholder="訪問目的を入力してください"
                />
              </FormGroup>
            )}
            {report && (
              <InfoCard>
                <h3>前回の訪問情報</h3>
                <p>顧客: {report.slots?.customer || '未設定'}</p>
                <p>案件: {report.slots?.project || '未設定'}</p>
                <p>次アクション: {report.slots?.next_action || '未設定'}</p>
              </InfoCard>
            )}
          </>
        );

      case 1:
        return (
          <>
            <h2>達成したい目標を選択してください</h2>
            <CheckboxGroup>
              {objectiveOptions.map(objective => (
                <CheckboxLabel key={objective}>
                  <input
                    type="checkbox"
                    checked={formData.objectives.includes(objective)}
                    onChange={() => handleObjectiveToggle(objective)}
                  />
                  {objective}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
            <FormGroup style={{ marginTop: 'var(--space-4)' }}>
              <Label htmlFor="customObjective">カスタム目標</Label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Input
                  id="customObjective"
                  type="text"
                  value={formData.customObjective}
                  onChange={(e) => setFormData({ ...formData, customObjective: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomObjective()}
                  placeholder="独自の目標を追加"
                />
                <Button onClick={(e) => { e.preventDefault(); addCustomObjective(); }} style={{ whiteSpace: 'nowrap', minWidth: 'auto' }}>追加</Button>
              </div>
            </FormGroup>
            <ChipContainer>
              {formData.objectives.map(obj => (
                <Chip key={obj}>
                  {obj}
                  <button onClick={() => handleObjectiveToggle(obj)}>×</button>
                </Chip>
              ))}
            </ChipContainer>
            <h3 style={{ marginTop: 'var(--space-6)' }}>重点ポイント（任意）</h3>
            <CheckboxGroup>
              {focusPointOptions.map(point => (
                <CheckboxLabel key={point}>
                  <input
                    type="checkbox"
                    checked={formData.focusPoints.includes(point)}
                    onChange={() => handleFocusPointToggle(point)}
                  />
                  {point}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
          </>
        );

      case 2:
        return (
          <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
            <FaRobot style={{ fontSize: '64px', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }} />
            <h2>スクリプトを生成する準備ができました</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              AIが最適な営業トークスクリプトを生成します
            </p>
            <InfoCard style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
              <h3>生成内容のプレビュー</h3>
              <p><strong>訪問目的:</strong> {formData.visitPurpose === 'custom' 
                ? formData.customPurpose 
                : visitPurposes.find(p => p.value === formData.visitPurpose)?.label}</p>
              <p><strong>達成目標:</strong> {formData.objectives.join(', ')}</p>
              {formData.focusPoints.length > 0 && (
                <p><strong>重点ポイント:</strong> {formData.focusPoints.join(', ')}</p>
              )}
            </InfoCard>
          </div>
        );

      default:
        return null;
    }
  };

  // 生成完了画面を削除（直接遷移するため不要）

  return (
    <Container>
      <Card>
        <Title>営業トークスクリプト生成</Title>

        <StepperContainer>
          {steps.map((label, index) => (
            <div key={label} style={{ position: 'relative' }}>
              <StepItem 
                active={index === activeStep} 
                completed={index < activeStep}
              >
                {index < activeStep ? '✓' : index + 1}
              </StepItem>
              <StepLabel>{label}</StepLabel>
            </div>
          ))}
        </StepperContainer>

        {renderStepContent()}

        <ButtonContainer>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            <FaArrowLeft />
            戻る
          </Button>
          <Button
            primary
            onClick={handleNext}
            disabled={loading || (activeStep === 0 && !formData.visitPurpose)}
          >
            {loading ? (
              <LoadingSpinner />
            ) : activeStep === steps.length - 1 ? (
              <>
                <FaRobot />
                スクリプト生成
              </>
            ) : (
              <>
                次へ
                <FaArrowRight />
              </>
            )}
          </Button>
        </ButtonContainer>
      </Card>
    </Container>
  );
};

export default ScriptGeneratorPage;