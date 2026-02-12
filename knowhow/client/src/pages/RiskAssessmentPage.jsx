import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { aiAPI } from '../services/api';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import toast from 'react-hot-toast';
import RiskBadge from '../components/RiskBadge';
import {
  HiOutlineArrowLeft,
  HiOutlineShieldCheck,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineExclamationCircle,
  HiOutlineLightBulb,
  HiOutlineExclamation,
} from 'react-icons/hi';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
`;

const BackButton = styled.button`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  font-size: 1.1rem;

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;

  @media (max-width: 640px) {
    font-size: var(--font-size-xl);
  }
`;

const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-sm);

  @media (max-width: 768px) {
    padding: var(--space-5);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const Label = styled.label`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
`;

const Select = styled.select`
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  height: 48px;
  transition: all var(--transition-fast);
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
`;

const Input = styled.input`
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  height: 48px;
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const TextArea = styled.textarea`
  padding: var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  min-height: 80px;
  resize: vertical;
  line-height: var(--line-height-relaxed);
  font-family: inherit;
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const ConditionsToggle = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  width: 100%;
  justify-content: space-between;

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
`;

const ConditionsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-light, var(--color-border));
  margin-top: var(--space-2);
`;

const SelectRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-base);
  height: 52px;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);
  margin-top: var(--space-4);

  &:hover:not(:disabled) {
    background: var(--gradient-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(26, 54, 93, 0.3);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/* Results section styles */

const ResultsSection = styled.div`
  margin-top: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: ${fadeInUp} 0.5s ease-out;
`;

const OverallRiskCard = styled.div`
  background: ${props => {
    switch (props.$level) {
      case 'critical': return 'linear-gradient(135deg, #fef2f2, #fee2e2)';
      case 'high': return 'linear-gradient(135deg, #fff7ed, #ffedd5)';
      case 'medium': return 'linear-gradient(135deg, #eff6ff, #dbeafe)';
      case 'low': return 'linear-gradient(135deg, #f0fdf4, #dcfce7)';
      default: return 'var(--color-surface)';
    }
  }};
  border: 1.5px solid ${props => {
    switch (props.$level) {
      case 'critical': return '#fca5a5';
      case 'high': return '#fdba74';
      case 'medium': return '#93c5fd';
      case 'low': return '#86efac';
      default: return 'var(--color-border)';
    }
  }};
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  text-align: center;
  box-shadow: var(--shadow-sm);

  @media (max-width: 768px) {
    padding: var(--space-6);
  }
`;

const OverallRiskTitle = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const OverallRiskBadgeWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  & > span {
    font-size: var(--font-size-xl);
    padding: var(--space-2) var(--space-6);
  }
`;

const ResultCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);

  @media (max-width: 768px) {
    padding: var(--space-5);
  }
`;

const ResultCardTitle = styled.h3`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  letter-spacing: -0.01em;
`;

const ResultCardIcon = styled.span`
  display: flex;
  align-items: center;
  font-size: 1.3rem;
  color: ${props => props.$color || 'var(--color-primary-600, #2563eb)'};
`;

const RiskItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const RiskItem = styled.div`
  background: var(--color-surface-alt, #f8fafc);
  border: 1px solid var(--color-border-light, var(--color-border));
  border-radius: var(--radius-lg);
  padding: var(--space-5);

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

const RiskItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
`;

const RiskItemDescription = styled.div`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  flex: 1;
  min-width: 0;
`;

const BadgeGroup = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
`;

const SmallBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  white-space: nowrap;
`;

const CountermeasureText = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border-light, var(--color-border));
`;

const CountermeasureLabel = styled.span`
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-right: var(--space-2);
`;

const RecommendationList = styled.ol`
  list-style: none;
  counter-reset: rec-counter;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const RecommendationItem = styled.li`
  counter-increment: rec-counter;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: var(--line-height-relaxed);

  &::before {
    content: counter(rec-counter);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    min-width: 24px;
    border-radius: var(--radius-full);
    background: var(--color-primary-50);
    color: var(--color-primary-600, #2563eb);
    font-size: 0.7rem;
    font-weight: var(--font-weight-bold);
  }
`;

const PrecautionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const PrecautionItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: var(--line-height-relaxed);
`;

const PrecautionIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  min-width: 24px;
  color: #f59e0b;
  font-size: 1.1rem;
`;

const LoadingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  gap: var(--space-4);
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary-600, #2563eb);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
`;

const WORK_TYPES = [
  '杭打ち工事',
  '足場工事',
  '鉄骨工事',
  'コンクリート打設',
  '掘削工事',
  '型枠工事',
  '配筋工事',
  '解体工事',
  '舗装工事',
  '電気工事',
  '配管工事',
  '塗装工事',
  '防水工事',
  '高所作業',
  'クレーン作業',
];

const WEATHER_OPTIONS = ['晴れ', '曇り', '雨', '雪', '強風', '猛暑'];

const overallRiskLabels = {
  critical: '重大リスク',
  high: '高リスク',
  medium: '中リスク',
  low: '低リスク',
};

const RiskAssessmentPage = () => {
  const navigate = useNavigate();
  const [workType, setWorkType] = useState('');
  const [customWorkType, setCustomWorkType] = useState('');
  const [showConditions, setShowConditions] = useState(false);
  const [weather, setWeather] = useState('');
  const [workerCount, setWorkerCount] = useState('');
  const [siteConditions, setSiteConditions] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null);

  const assessmentMutation = useMutation({
    mutationFn: (data) => aiAPI.riskAssessment(data),
    onSuccess: (data) => {
      setResult(data);
      toast.success('リスク評価が完了しました');
    },
    onError: () => {
      toast.error('リスク評価に失敗しました');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const resolvedWorkType = workType === 'その他' ? customWorkType : workType;
    if (!resolvedWorkType) {
      toast.error('工種を選択してください');
      return;
    }

    const conditions = {};
    if (weather) conditions.weather = weather;
    if (workerCount) conditions.worker_count = parseInt(workerCount, 10);
    if (siteConditions) conditions.site_conditions = siteConditions;
    if (notes) conditions.notes = notes;

    assessmentMutation.mutate({
      work_type: resolvedWorkType,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
    });
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <HiOutlineArrowLeft />
        </BackButton>
        <Title>リスク評価</Title>
      </Header>

      <Card>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="workType">工種 *</Label>
            <Select
              id="workType"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
            >
              <option value="">選択してください</option>
              {WORK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="その他">その他</option>
            </Select>
          </FormGroup>

          {workType === 'その他' && (
            <FormGroup>
              <Label htmlFor="customWorkType">工種名 *</Label>
              <Input
                id="customWorkType"
                placeholder="例: 内装仕上げ工事"
                value={customWorkType}
                onChange={(e) => setCustomWorkType(e.target.value)}
              />
            </FormGroup>
          )}

          <ConditionsToggle
            type="button"
            onClick={() => setShowConditions(!showConditions)}
          >
            <span>条件を追加（任意）</span>
            {showConditions ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
          </ConditionsToggle>

          {showConditions && (
            <ConditionsContent>
              <SelectRow>
                <FormGroup>
                  <Label htmlFor="weather">天候</Label>
                  <Select
                    id="weather"
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {WEATHER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="workerCount">作業人数</Label>
                  <Input
                    id="workerCount"
                    type="number"
                    min="1"
                    placeholder="例: 10"
                    value={workerCount}
                    onChange={(e) => setWorkerCount(e.target.value)}
                  />
                </FormGroup>
              </SelectRow>
              <FormGroup>
                <Label htmlFor="siteConditions">現場条件</Label>
                <TextArea
                  id="siteConditions"
                  placeholder="例: 狭隘な都心部の現場、隣接する建物との距離が近い"
                  value={siteConditions}
                  onChange={(e) => setSiteConditions(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="notes">特記事項</Label>
                <TextArea
                  id="notes"
                  placeholder="例: 新規入場者が多い、夜間作業あり"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormGroup>
            </ConditionsContent>
          )}

          <SubmitButton
            type="submit"
            disabled={assessmentMutation.isPending}
          >
            <HiOutlineShieldCheck />
            {assessmentMutation.isPending ? '評価中...' : 'リスク評価を実行'}
          </SubmitButton>
        </Form>
      </Card>

      {assessmentMutation.isPending && (
        <LoadingOverlay>
          <Spinner />
          <LoadingText>AIがリスクを分析しています...</LoadingText>
        </LoadingOverlay>
      )}

      {result && !assessmentMutation.isPending && (
        <ResultsSection>
          {/* Overall Risk */}
          <OverallRiskCard $level={result.overall_risk}>
            <OverallRiskTitle>総合リスクレベル</OverallRiskTitle>
            <OverallRiskBadgeWrap>
              <RiskBadge level={result.overall_risk} />
            </OverallRiskBadgeWrap>
            <div style={{
              marginTop: 'var(--space-2)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
            }}>
              {overallRiskLabels[result.overall_risk] || result.overall_risk}
            </div>
          </OverallRiskCard>

          {/* Individual Risks */}
          {result.risks && result.risks.length > 0 && (
            <ResultCard>
              <ResultCardTitle>
                <ResultCardIcon $color="#dc2626">
                  <HiOutlineExclamationCircle />
                </ResultCardIcon>
                リスク項目
              </ResultCardTitle>
              <RiskItemList>
                {result.risks.map((risk, index) => (
                  <RiskItem key={index}>
                    <RiskItemHeader>
                      <RiskItemDescription>{risk.description}</RiskItemDescription>
                      <BadgeGroup>
                        <RiskBadge level={risk.level} />
                        {risk.probability && (
                          <SmallBadge>発生確率: {risk.probability}</SmallBadge>
                        )}
                        {risk.impact && (
                          <SmallBadge>影響度: {risk.impact}</SmallBadge>
                        )}
                      </BadgeGroup>
                    </RiskItemHeader>
                    {risk.countermeasure && (
                      <CountermeasureText>
                        <CountermeasureLabel>対策:</CountermeasureLabel>
                        {risk.countermeasure}
                      </CountermeasureText>
                    )}
                  </RiskItem>
                ))}
              </RiskItemList>
            </ResultCard>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <ResultCard>
              <ResultCardTitle>
                <ResultCardIcon $color="#2563eb">
                  <HiOutlineLightBulb />
                </ResultCardIcon>
                推奨事項
              </ResultCardTitle>
              <RecommendationList>
                {result.recommendations.map((rec, index) => (
                  <RecommendationItem key={index}>{rec}</RecommendationItem>
                ))}
              </RecommendationList>
            </ResultCard>
          )}

          {/* Required Precautions */}
          {result.required_precautions && result.required_precautions.length > 0 && (
            <ResultCard>
              <ResultCardTitle>
                <ResultCardIcon $color="#f59e0b">
                  <HiOutlineExclamation />
                </ResultCardIcon>
                必須注意事項
              </ResultCardTitle>
              <PrecautionList>
                {result.required_precautions.map((item, index) => (
                  <PrecautionItem key={index}>
                    <PrecautionIcon>
                      <HiOutlineExclamation />
                    </PrecautionIcon>
                    {item}
                  </PrecautionItem>
                ))}
              </PrecautionList>
            </ResultCard>
          )}
        </ResultsSection>
      )}
    </Container>
  );
};

export default RiskAssessmentPage;
