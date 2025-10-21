import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { reportAPI, userAPI, aiAPI, uploadAPI } from '../services/api';
import tagAPI from '../services/tagAPI';
import styled from '@emotion/styled';
import { format, startOfDay, differenceInDays, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
import MeetingNotesModal from '../components/MeetingNotesModal';
import Dynamics365Modal from '../components/Dynamics365Modal';
import SalesforceModal from '../components/SalesforceModal';
import ConfirmModal from '../components/ConfirmModal';
import Tag, { TagList } from '../components/Tag';
import { SiSalesforce } from 'react-icons/si';
import { MdRecordVoiceOver } from 'react-icons/md';
import { FaMicrophone, FaKeyboard, FaRobot, FaClock, FaListAlt, FaRocket, FaCog, FaPlus, FaSearch } from 'react-icons/fa';
import { hearingSettingsAPI } from '../services/api';

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
    
    @media (max-width: 1200px) {
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
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
  border: 2px solid var(--color-accent);
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
    background-color: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
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

// 検索フィルターセクション
const SearchFilterSection = styled.div`
  margin-bottom: var(--space-4);
  padding: var(--space-5);
  background: white;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-structure);

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

const SearchBox = styled.div`
  position: relative;
  margin-bottom: var(--space-4);

  svg {
    position: absolute;
    left: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-secondary);
    pointer-events: none;
  }

  input {
    width: 100%;
    padding: var(--space-4) var(--space-4) var(--space-4) calc(var(--space-4) * 3);
    border: 2px solid var(--color-border);
    background: var(--color-background);
    border-radius: var(--radius-none);
    font-size: var(--font-size-base);
    color: var(--color-text);
    transition: all 0.3s ease;
    font-weight: var(--font-weight-medium);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &::placeholder {
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-normal);
    }
  }
`;

const DateFilterContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-4);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DateInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  label {
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  input[type="date"] {
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--color-border);
    background: var(--color-background);
    border-radius: var(--radius-none);
    font-size: var(--font-size-base);
    color: var(--color-text);
    transition: all 0.3s ease;
    font-weight: var(--font-weight-medium);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
`;

const QuickDateButtons = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: var(--space-2);
  }
`;

const QuickDateButton = styled.button`
  padding: var(--space-2) var(--space-4);
  border: 2px solid ${props => props.active ? 'var(--color-primary)' : 'var(--color-border)'};
  background: ${props => props.active ? 'var(--color-primary)' : 'var(--color-background)'};
  color: ${props => props.active ? 'white' : 'var(--color-text)'};
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &:hover {
    background: ${props => props.active ? 'var(--color-primary)' : 'var(--color-surface)'};
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ClearAllFiltersButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: var(--space-3);
  width: 100%;

  &:hover {
    background: var(--color-surface);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
`;

const TagFilterSection = styled.div`
  margin-bottom: var(--space-6);
  padding: var(--space-5);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);

  @media (max-width: 768px) {
    padding: var(--space-4);
    margin-bottom: var(--space-5);
  }
`;

const TagFilterTitle = styled.h3`
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const TagFilterGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
`;

const TagFilterControls = styled.div`
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
`;

const SearchModeToggle = styled.div`
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
`;

const SearchModeButton = styled.button`
  padding: var(--space-2) var(--space-3);
  border: 2px solid ${props => props.active ? 'var(--color-accent)' : 'var(--color-border)'};
  background: ${props => props.active ? 'var(--color-accent-light)' : 'transparent'};
  color: ${props => props.active ? 'var(--color-primary)' : 'var(--color-text)'};
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-light);
  }
`;

const ExpandTagsButton = styled.button`
  padding: var(--space-2) var(--space-3);
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`;

const ClearFilterButton = styled.button`
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-micro);
  cursor: pointer;
  padding: var(--space-2) 0;
  text-decoration: underline;
  transition: color 0.2s;

  &:hover {
    color: var(--color-accent);
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
    'var(--color-accent-light)'};
  color: ${props => props.status === 'completed' ? 'var(--color-success)' : 'var(--color-accent)'};
  border-color: ${props => props.status === 'completed' ? 'var(--color-success)' : 'var(--color-accent)'};
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
  const queryClient = useQueryClient();
  const [isOnline] = React.useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState('self'); // 'self', 'team', 'individual'
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showDynamics365Modal, setShowDynamics365Modal] = useState(false);
  const [showSalesforceModal, setShowSalesforceModal] = useState(false);
  const [expandedArchives, setExpandedArchives] = useState({});
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const [showHearingSettingsModal, setShowHearingSettingsModal] = useState(false);
  const [hearingSettings, setHearingSettings] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [tagSearchMode, setTagSearchMode] = useState('OR'); // 'OR' or 'AND'
  const [showAdvancedTagFilter, setShowAdvancedTagFilter] = useState(false);

  // 検索・日付フィルター用のstate
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickDateFilter, setQuickDateFilter] = useState('all'); // 'today', 'week', 'month', 'all'

  // 部下リストを取得
  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => userAPI.getTeamMembers(),
    enabled: isManager,
  });

  // 人気のタグを取得
  const { data: popularTags = [], isLoading: isLoadingTags, error: tagsError, isFetching: isFetchingTags } = useQuery({
    queryKey: ['popularTags'],
    queryFn: async () => {
      console.log('[HomePage] Fetching popular tags...');
      const result = await tagAPI.getPopular(15);
      console.log('[HomePage] Popular tags result:', result);
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // すべてのタグを取得（タグ検索用）
  const { data: allTags = [] } = useQuery({
    queryKey: ['allTags'],
    queryFn: async () => {
      console.log('[HomePage] Fetching all tags...');
      const result = await tagAPI.getAll(null, 100);
      console.log('[HomePage] All tags result:', result);
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // タグキャッシュをクリアして最新データを取得
  useEffect(() => {
    console.log('HomePage mounted - Invalidating tag caches...');
    queryClient.invalidateQueries(['popularTags']);
    queryClient.invalidateQueries(['allTags']);
  }, []); // 初回マウント時のみ実行

  // デバッグ用
  useEffect(() => {
    console.log('[HomePage] Popular tags state:', {
      popularTags,
      tagsCount: popularTags.length,
      isLoadingTags,
      isFetchingTags,
      tagsError
    });
  }, [popularTags, isLoadingTags, isFetchingTags, tagsError]);

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

  // クイック日付フィルターのヘルパー関数
  const getDateRangeFromQuickFilter = (filter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo, end: new Date() };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { start: monthAgo, end: new Date() };
      case 'all':
      default:
        return null;
    }
  };

  // 統合フィルタリング処理（タグ + テキスト + 日付）
  useEffect(() => {
    const applyFilters = async () => {
      let result = reports || [];

      // タグフィルター
      if (selectedTags.length > 0) {
        try {
          const tagIds = selectedTags.map(tag => tag.id).join(',');
          const tagFilteredReports = await tagAPI.searchReports(tagIds, user?.id);

          if (tagSearchMode === 'AND' && selectedTags.length > 1) {
            // AND検索：すべてのタグを含む日報のみ
            const selectedTagIds = selectedTags.map(t => t.id);
            result = tagFilteredReports.filter(report => {
              if (!report.tags || report.tags.length === 0) return false;
              const reportTagIds = report.tags.map(t => t.id);
              return selectedTagIds.every(tagId => reportTagIds.includes(tagId));
            });
          } else {
            // OR検索：いずれかのタグを含む日報
            result = tagFilteredReports;
          }
        } catch (error) {
          console.error('Tag filtering error:', error);
          toast.error('タグ絞り込みに失敗しました');
        }
      }

      // テキスト検索フィルター
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        result = result.filter(report => {
          const customerMatch = report.customer?.toLowerCase().includes(searchLower);
          const projectMatch = report.project?.toLowerCase().includes(searchLower);
          const nextActionMatch = report.next_action?.toLowerCase().includes(searchLower);
          const issuesMatch = report.issues?.toLowerCase().includes(searchLower);
          const locationMatch = report.location?.toLowerCase().includes(searchLower);

          // タグ名での検索
          const tagMatch = report.tags?.some(tag =>
            tag.name?.toLowerCase().includes(searchLower)
          );

          return customerMatch || projectMatch || nextActionMatch || issuesMatch || locationMatch || tagMatch;
        });
      }

      // 日付フィルター
      let dateRange = null;

      if (quickDateFilter !== 'all') {
        dateRange = getDateRangeFromQuickFilter(quickDateFilter);
      } else if (startDate || endDate) {
        // カスタム日付範囲
        dateRange = {
          start: startDate ? new Date(startDate) : null,
          end: endDate ? new Date(endDate) : null
        };
        if (dateRange.end) {
          dateRange.end.setHours(23, 59, 59, 999); // 終日を含める
        }
      }

      if (dateRange && (dateRange.start || dateRange.end)) {
        result = result.filter(report => {
          const reportDate = new Date(report.report_date);
          if (dateRange.start && reportDate < dateRange.start) return false;
          if (dateRange.end && reportDate > dateRange.end) return false;
          return true;
        });
      }

      setFilteredReports(result);
    };

    applyFilters();
  }, [selectedTags, user, tagSearchMode, searchText, startDate, endDate, quickDateFilter, reports]);

  // フィルターが有効かチェック
  const isFilterActive = selectedTags.length > 0 || searchText.trim() || startDate || endDate || quickDateFilter !== 'all';

  // 表示する日報（フィルターが有効な場合はフィルタ済み、無効な場合は全て）
  const displayReports = isFilterActive ? filteredReports : reports;

  // displayReportsを使ってグループ化
  const displayGroupedReports = useMemo(() => {
    if (!displayReports || displayReports.length === 0) return { recent: [], archives: {} };

    const today = startOfDay(new Date());
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentReports = [];
    const archivesByMonth = {};

    displayReports.forEach(report => {
      const reportDate = parseISO(report.report_date);
      const daysDiff = differenceInDays(today, reportDate);

      if (daysDiff < 7) {
        recentReports.push(report);
      } else {
        const yearMonth = format(reportDate, 'yyyy年MM月', { locale: ja });
        if (!archivesByMonth[yearMonth]) {
          archivesByMonth[yearMonth] = [];
        }
        archivesByMonth[yearMonth].push(report);
      }
    });

    const recentByDate = {};
    recentReports.forEach(report => {
      const dateKey = format(parseISO(report.report_date), 'yyyy-MM-dd');
      if (!recentByDate[dateKey]) {
        recentByDate[dateKey] = [];
      }
      recentByDate[dateKey].push(report);
    });

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
  }, [displayReports]);

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

  const proceedWithNewReport = async (mode) => {
    if (mode === 'meeting') {
      // 議事録モーダルを表示
      setShowMeetingModal(true);
    } else if (mode === 'voice' && isOnline) {
      // ヒアリング設定モーダルを表示
      setLoadingSettings(true);
      try {
        const settings = await hearingSettingsAPI.getAll();
        setHearingSettings(settings);
        setShowHearingSettingsModal(true);
      } catch (error) {
        console.error('Error loading hearing settings:', error);
        // 設定が取得できない場合はデフォルトで開始
        navigate('/hearing');
      } finally {
        setLoadingSettings(false);
      }
    } else if (mode === 'realtime-voice' && isOnline) {
      navigate('/hearing/realtime');
    } else {
      navigate('/hearing?mode=text');
    }
  };

  const handleHearingSettingSelect = (settingId) => {
    // 選択された設定で音声ヒアリングを開始
    if (settingId) {
      navigate(`/hearing?settingId=${settingId}`);
    } else {
      // デフォルト設定で開始
      navigate('/hearing');
    }
    setShowHearingSettingsModal(false);
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

  const handleTagSearch = async (searchParams) => {
    try {
      console.log('Tag search params:', searchParams);
      const tagIds = searchParams.tagIds.join(',');
      const searchResults = await tagAPI.searchReports(tagIds, user?.id);

      console.log('Search results:', searchResults);

      // 期間フィルタリング（クライアント側）
      let filteredResults = searchResults;
      if (searchParams.startDate || searchParams.endDate) {
        filteredResults = searchResults.filter(report => {
          const reportDate = new Date(report.report_date);
          if (searchParams.startDate && reportDate < new Date(searchParams.startDate)) {
            return false;
          }
          if (searchParams.endDate && reportDate > new Date(searchParams.endDate)) {
            return false;
          }
          return true;
        });
      }

      console.log('Filtered results:', filteredResults);

      setFilteredReports(filteredResults);

      // 検索したタグを選択状態にする
      if (allTags && allTags.length > 0) {
        const searchedTags = allTags.filter(tag => searchParams.tagIds.includes(tag.id));
        console.log('Searched tags:', searchedTags);
        setSelectedTags(searchedTags);
      }

      toast.success(`${filteredResults.length}件の日報が見つかりました`);
    } catch (error) {
      console.error('Tag search error:', error);
      console.error('Error details:', error.response || error.message);
      toast.error('タグ検索に失敗しました');
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
              <StyledPrimaryButton 
                onClick={() => handleNewReport('realtime-voice')}
                disabled={!isOnline}
              >
                <MdRecordVoiceOver size={22} />
                リアルタイム音声会話で開始
              </StyledPrimaryButton>
              <StyledSecondaryButton
                onClick={() => navigate('/hearing/settings')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
                ヒアリング設定管理
              </StyledSecondaryButton>
              <StyledSecondaryButton
                onClick={() => navigate('/tags/analytics')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                タグ分析
              </StyledSecondaryButton>
              <StyledSecondaryButton
                onClick={() => navigate('/tags/manage')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
                </svg>
                タグ管理
              </StyledSecondaryButton>
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
                <SiSalesforce size={20} color="#00A1E0" />
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

        {/* 検索・日付フィルター */}
        <SearchFilterSection>
          {/* テキスト検索ボックス */}
          <SearchBox>
            <FaSearch />
            <input
              type="text"
              placeholder="顧客名、案件名、タグ、場所などで検索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </SearchBox>

          {/* クイック日付フィルター */}
          <QuickDateButtons>
            <QuickDateButton
              active={quickDateFilter === 'today'}
              onClick={() => {
                setQuickDateFilter('today');
                setStartDate('');
                setEndDate('');
              }}
            >
              今日
            </QuickDateButton>
            <QuickDateButton
              active={quickDateFilter === 'week'}
              onClick={() => {
                setQuickDateFilter('week');
                setStartDate('');
                setEndDate('');
              }}
            >
              今週
            </QuickDateButton>
            <QuickDateButton
              active={quickDateFilter === 'month'}
              onClick={() => {
                setQuickDateFilter('month');
                setStartDate('');
                setEndDate('');
              }}
            >
              今月
            </QuickDateButton>
            <QuickDateButton
              active={quickDateFilter === 'all'}
              onClick={() => {
                setQuickDateFilter('all');
                setStartDate('');
                setEndDate('');
              }}
            >
              すべて
            </QuickDateButton>
          </QuickDateButtons>

          {/* カスタム日付範囲 */}
          <DateFilterContainer>
            <DateInputGroup>
              <label>開始日</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickDateFilter('all');
                }}
              />
            </DateInputGroup>
            <DateInputGroup>
              <label>終了日</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickDateFilter('all');
                }}
              />
            </DateInputGroup>
          </DateFilterContainer>

          {/* フィルタークリアボタン */}
          {isFilterActive && (
            <ClearAllFiltersButton
              onClick={() => {
                setSearchText('');
                setStartDate('');
                setEndDate('');
                setQuickDateFilter('all');
                setSelectedTags([]);
              }}
            >
              すべてのフィルターをクリア {isFilterActive && `(${
                (searchText.trim() ? 1 : 0) +
                (startDate || endDate ? 1 : 0) +
                (quickDateFilter !== 'all' ? 1 : 0) +
                selectedTags.length
              }個の条件)`}
            </ClearAllFiltersButton>
          )}
        </SearchFilterSection>

        {/* タグフィルター */}
        {(popularTags?.length > 0 || allTags?.length > 0) && (
          <TagFilterSection>
            <TagFilterTitle>タグで絞り込み</TagFilterTitle>

            <TagFilterControls>
              <SearchModeToggle>
                <span>検索モード:</span>
                <SearchModeButton
                  active={tagSearchMode === 'OR'}
                  onClick={() => setTagSearchMode('OR')}
                >
                  OR (いずれか)
                </SearchModeButton>
                <SearchModeButton
                  active={tagSearchMode === 'AND'}
                  onClick={() => setTagSearchMode('AND')}
                >
                  AND (すべて)
                </SearchModeButton>
              </SearchModeToggle>

              {allTags?.length > 0 && popularTags?.length > 0 && allTags.length > popularTags.length && (
                <ExpandTagsButton onClick={() => setShowAdvancedTagFilter(!showAdvancedTagFilter)}>
                  {showAdvancedTagFilter ? '人気タグのみ表示' : 'すべてのタグを表示'} ({allTags.length}個)
                </ExpandTagsButton>
              )}

              {selectedTags.length > 0 && (
                <ClearFilterButton onClick={() => setSelectedTags([])}>
                  フィルターをクリア ({selectedTags.length}個選択中)
                </ClearFilterButton>
              )}
            </TagFilterControls>

            <TagFilterGrid>
              {(showAdvancedTagFilter ? (allTags || []) : (popularTags || [])).map(tag => (
                <Tag
                  key={tag.id}
                  name={tag.name}
                  category={tag.category}
                  color={tag.color}
                  onClick={() => {
                    const isSelected = selectedTags.some(t => t.id === tag.id);
                    if (isSelected) {
                      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  onRemove={selectedTags.some(t => t.id === tag.id) ? () => {
                    setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
                  } : null}
                />
              ))}
            </TagFilterGrid>
          </TagFilterSection>
        )}

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
        ) : (displayGroupedReports.recent.length > 0 || Object.keys(displayGroupedReports.archives).length > 0) ? (
          <div>
            {/* 直近1週間の日報（日毎に表示） */}
            {displayGroupedReports.recent.map(dateGroup => (
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
                      {report.tags && report.tags.length > 0 && (
                        <div style={{ marginTop: 'var(--space-3)' }}>
                          <TagList
                            tags={report.tags.slice(0, 5)}
                            onTagClick={(tag) => {
                              const isSelected = selectedTags.some(t => t.id === tag.id);
                              if (!isSelected) {
                                setSelectedTags([...selectedTags, tag]);
                              }
                            }}
                          />
                        </div>
                      )}
                    </ReportCard>
                  ))}
                </ReportList>
              </DateGroup>
            ))}

            {/* アーカイブ（年月毎） */}
            {Object.keys(displayGroupedReports.archives).length > 0 && (
              <DateGroup>
                <DateGroupHeader style={{ marginTop: 'var(--space-6)' }}>
                  <span>アーカイブ</span>
                </DateGroupHeader>
                {Object.entries(displayGroupedReports.archives)
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
                                {report.tags && report.tags.length > 0 && (
                                  <div style={{ marginTop: 'var(--space-3)' }}>
                                    <TagList
                                      tags={report.tags.slice(0, 5)}
                                      onTagClick={(tag) => {
                                        const isSelected = selectedTags.some(t => t.id === tag.id);
                                        if (!isSelected) {
                                          setSelectedTags([...selectedTags, tag]);
                                        }
                                      }}
                                    />
                                  </div>
                                )}
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

      {/* ヒアリング設定選択モーダル */}
      {showHearingSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface)',
            padding: 0,
            borderRadius: '12px',
            border: '3px solid #ff6b35',
            maxWidth: '720px',
            width: '90%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #ff8f5a 100%)',
              padding: 'var(--space-5) var(--space-6)',
              color: 'white'
            }}>
              <h2 style={{
                fontSize: 'var(--font-size-display)',
                fontWeight: 'var(--font-weight-thin)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)'
              }}>
                <FaMicrophone style={{ fontSize: '1.2em' }} />
                ヒアリング設定
              </h2>
              <p style={{
                marginTop: 'var(--space-2)',
                marginBottom: 0,
                fontSize: 'var(--font-size-body)',
                opacity: 0.95
              }}>
                AIヒアリングの方法を選択してください
              </p>
            </div>
            
            {/* コンテンツ */}
            <div style={{
              padding: 'var(--space-5)',
              maxHeight: 'calc(85vh - 180px)',
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'grid',
                gap: 'var(--space-4)'
              }}>
              {/* デフォルト設定カード */}
              <div
                onClick={() => handleHearingSettingSelect(null)}
                style={{
                  padding: 'var(--space-5)',
                  background: 'linear-gradient(145deg, #fff9f5, #fff4ed)',
                  border: '2px solid #ffb088',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateX(8px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(255,107,53,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 'var(--space-3)',
                  right: 'var(--space-3)',
                  background: '#ff6b35',
                  color: 'white',
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: '4px',
                  fontSize: 'var(--font-size-micro)',
                  fontWeight: 'var(--font-weight-bold)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  おすすめ
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-4)'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #ff6b35, #ff8f5a)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5em',
                    flexShrink: 0
                  }}>
                    <FaRocket />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: 'var(--font-size-title)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: '#ff6b35',
                      marginBottom: 'var(--space-2)',
                      margin: 0
                    }}>
                      スタンダード設定
                    </h3>
                    <p style={{
                      fontSize: 'var(--font-size-body)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--space-3)',
                      lineHeight: 'var(--line-height-relaxed)'
                    }}>
                      標準的な5つの質問で効率的に日報を作成
                    </p>
                    <div style={{
                      display: 'flex',
                      gap: 'var(--space-4)',
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-text-tertiary)'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <FaListAlt /> 5問
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <FaMicrophone /> 音声入力
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <FaClock /> 約3分
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              
              {/* カスタム設定カード */}
              {hearingSettings.length > 0 && (
                <>
                  <div style={{
                    padding: '0 var(--space-2)',
                    fontSize: 'var(--font-size-small)',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 'var(--font-weight-medium)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    カスタム設定
                  </div>
                  {hearingSettings.filter(s => !s.is_default).slice(-1).map((setting, index) => {
                    const templateName = setting.question_template === 'detailed' ? '詳細' :
                                        setting.question_template === 'quick' ? 'クイック' : 
                                        setting.question_template === 'default' ? 'スタンダード' : 'カスタム';
                    const inputModeIcon = setting.input_mode === 'voice' ? <FaMicrophone /> :
                                         setting.input_mode === 'text' ? <FaKeyboard /> :
                                         <><FaMicrophone /> <FaKeyboard /></>;
                    const inputModeText = setting.input_mode === 'voice' ? '音声' :
                                         setting.input_mode === 'text' ? 'テキスト' : '音声・テキスト';
                    
                    return (
                      <div
                        key={setting.id}
                        onClick={() => handleHearingSettingSelect(setting.id)}
                        style={{
                          padding: 'var(--space-4)',
                          backgroundColor: 'var(--color-background)',
                          border: '2px solid var(--color-border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          position: 'relative'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateX(8px)';
                          e.currentTarget.style.borderColor = '#ff6b35';
                          e.currentTarget.style.backgroundColor = '#fffaf8';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.15)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.backgroundColor = 'var(--color-background)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 'var(--space-3)'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #f0f0f0, #e0e0e0)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-secondary)',
                            fontSize: '1.2em',
                            flexShrink: 0
                          }}>
                            <FaCog />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              fontSize: 'var(--font-size-body)',
                              fontWeight: 'var(--font-weight-bold)',
                              color: 'var(--color-text-primary)',
                              marginBottom: 'var(--space-1)',
                              margin: 0
                            }}>
                              {templateName}テンプレート
                            </h3>
                            {setting.greeting && (
                              <p style={{
                                fontSize: 'var(--font-size-small)',
                                color: 'var(--color-text-secondary)',
                                marginBottom: 'var(--space-2)',
                                lineHeight: 'var(--line-height-relaxed)'
                              }}>
                                {setting.greeting.substring(0, 30)}...
                              </p>
                            )}
                            <div style={{
                              display: 'flex',
                              gap: 'var(--space-3)',
                              fontSize: 'var(--font-size-micro)',
                              color: 'var(--color-text-tertiary)'
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                <FaListAlt /> {setting.max_questions}問
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                {inputModeIcon} {inputModeText}
                              </span>
                              {setting.enable_follow_up && (
                                <span style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 'var(--space-1)',
                                  color: '#4CAF50'
                                }}>
                                  <FaRobot /> AI拡張
                                </span>
                              )}
                            </div>
                          </div>
                          {setting.last_used_at && (
                            <div style={{
                              position: 'absolute',
                              top: 'var(--space-2)',
                              right: 'var(--space-2)',
                              fontSize: 'var(--font-size-micro)',
                              color: 'var(--color-text-tertiary)'
                            }}>
                              {new Date(setting.last_used_at).toLocaleDateString('ja-JP', { 
                                month: 'numeric', 
                                day: 'numeric' 
                              })}使用
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            </div>
            
            {/* フッター */}
            <div style={{
              padding: 'var(--space-4) var(--space-5)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f9f9f9'
            }}>
              <button
                onClick={() => setShowHearingSettingsModal(false)}
                style={{
                  padding: 'var(--space-3) var(--space-5)',
                  backgroundColor: 'white',
                  color: 'var(--color-text-primary)',
                  border: '2px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#ff6b35';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default HomePage;