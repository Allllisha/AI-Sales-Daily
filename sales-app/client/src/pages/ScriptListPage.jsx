import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { useAuth } from '../contexts/AuthContext';
import {
  FaRobot,
  FaEdit,
  FaEye,
  FaTrash,
  FaStar,
  FaCopy,
  FaFilter,
  FaSearch,
  FaTag,
  FaCalendar,
  FaChartLine,
  FaTimes
} from 'react-icons/fa';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
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

const Header = styled.div`
  background-color: var(--color-surface);
  padding: var(--space-6);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-structure);
  margin-bottom: var(--space-6);
`;

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: #ff6b35;
  margin-bottom: var(--space-4);
  letter-spacing: -0.025em;
  line-height: var(--line-height-compressed);
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  align-items: center;
  gap: var(--space-3);

  @media (max-width: 768px) {
    font-size: var(--font-size-heading);
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 250px;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  background-color: var(--color-background);
  font-size: var(--font-size-small);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;
  
  &::placeholder {
    font-size: var(--font-size-small);
    color: var(--color-text-tertiary);
  }
  
  &:focus {
    outline: none;
    border-color: #ff6b35;
  }

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const FilterButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background-color: ${props => props.active ? '#ff6b35' : 'var(--color-background)'};
  color: ${props => props.active ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'};
  border: 2px solid ${props => props.active ? '#ff6b35' : 'var(--color-border)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    background-color: ${props => !props.active && '#fff4f0'};
    border-color: #ff6b35;
    transform: translateY(-1px);
  }
`;

const ScriptGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--space-5);
  min-height: 200px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ScriptCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #fff8f5 100%);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  padding: var(--space-5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, #ff6b35 0%, #ff8c42 100%);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.3s ease;
  }

  &:hover {
    box-shadow: 0 8px 24px rgba(255, 107, 53, 0.2);
    transform: translateY(-4px);
    border-color: #ff6b35;

    &::before {
      transform: scaleY(1);
      transform-origin: top;
    }
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-3);
  gap: var(--space-2);
`;

const CardTitle = styled.h3`
  font-size: var(--font-size-lead);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  line-height: var(--line-height-compressed);
  flex: 1;
  word-break: break-word;
`;

const FavoriteButton = styled.button`
  background: ${props => props.isFavorite ? 'linear-gradient(135deg, #ff6b35, #ff8c42)' : 'white'};
  border: 2px solid ${props => props.isFavorite ? '#ff6b35' : 'var(--color-border)'};
  color: ${props => props.isFavorite ? 'white' : 'var(--color-text-tertiary)'};
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-none);
  box-shadow: ${props => props.isFavorite ? '0 2px 8px rgba(255, 107, 53, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'};

  svg {
    transition: transform 0.3s ease;
    filter: ${props => props.isFavorite ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))' : 'none'};
  }

  &:hover {
    background: linear-gradient(135deg, #ff6b35, #ff8c42);
    color: white;
    border-color: #ff6b35;
    transform: scale(1.1) rotate(${props => props.isFavorite ? '0deg' : '15deg'});
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);

    svg {
      transform: scale(1.1);
    }
  }

  &:active {
    transform: scale(0.95);
  }
`;

const CardMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  
  svg {
    font-size: var(--font-size-small);
    color: #ff6b35;
  }
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
  color: white;
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(255, 107, 53, 0.4);

    &::before {
      left: 100%;
    }
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 2px solid var(--color-border);
`;

const ActionButton = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3);
  background: white;
  color: var(--color-text-primary);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff6b35, #ff8c42);
    transform: translate(-50%, -50%);
    transition: width 0.4s ease, height 0.4s ease;
  }

  svg {
    position: relative;
    z-index: 1;
    transition: transform 0.3s ease;
  }

  span {
    position: relative;
    z-index: 1;
  }

  &:hover {
    color: white;
    border-color: #ff6b35;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);

    &::before {
      width: 300%;
      height: 300%;
    }

    svg {
      transform: scale(1.1);
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 0 var(--space-12) 30px var(--space-12);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  margin: var(--space-8) 0;
  
  h3 {
    font-size: var(--font-size-title);
    color: var(--color-text-secondary);
    margin: 0;
    margin-bottom: var(--space-6);
    padding-top: 30px;
  }
  
  p {
    color: var(--color-text-tertiary);
    margin: 0;
    margin-bottom: var(--space-10);
    padding: 0 var(--space-4);
  }
`;

const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
  color: white;
  border: none;
  border-radius: var(--radius-none);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 30px;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.6s ease;
  }

  svg {
    transition: transform 0.3s ease;
  }

  &:hover {
    background: linear-gradient(135deg, #ff5722 0%, #ff6b35 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255, 107, 53, 0.5);

    &::before {
      left: 100%;
    }

    svg {
      transform: rotate(15deg) scale(1.2);
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 50%, #ffa366 100%);
  border: none;
  border-radius: var(--radius-none);
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-10%, -10%); }
  }

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const StatItem = styled.div`
  flex: 1;
  text-align: center;
  position: relative;
  z-index: 1;
  padding: var(--space-3);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.05);
  }

  .stat-value {
    font-size: var(--font-size-display);
    font-weight: var(--font-weight-bold);
    color: white;
    letter-spacing: -0.025em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .stat-label {
    font-size: var(--font-size-small);
    color: rgba(255, 255, 255, 0.95);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: var(--font-weight-medium);
    margin-top: var(--space-2);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  padding: var(--space-6);
  max-width: 400px;
  width: 90%;
  box-shadow: var(--shadow-elevation);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
`;

const ModalTitle = styled.h3`
  font-size: var(--font-size-lead);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-lead);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--color-text-primary);
  }
`;

const FormGroup = styled.div`
  margin-bottom: var(--space-4);
`;

const Label = styled.label`
  display: block;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ModalBody = styled.div`
  color: var(--color-text-secondary);
  margin-bottom: var(--space-6);
  line-height: var(--line-height-relaxed);
`;

const ModalFooter = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: var(--space-3) var(--space-5);
  background-color: ${props => props.danger ? '#ff4444' : 'var(--color-background)'};
  color: ${props => props.danger ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'};
  border: 2px solid ${props => props.danger ? '#ff4444' : 'var(--color-border)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    background-color: ${props => props.danger ? '#ff2222' : '#ff6b35'};
    color: var(--color-text-inverse);
    border-color: ${props => props.danger ? '#ff2222' : '#ff6b35'};
    transform: translateY(-1px);
  }
`;

const ScriptListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [filteredScripts, setFilteredScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, favorites, recent
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, scriptId: null, scriptName: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, scriptId: null, scriptName: '' });
  const [stats, setStats] = useState({
    total: 0,
    favorites: 0,
    thisMonth: 0
  });

  useEffect(() => {
    fetchScripts();
  }, []);

  useEffect(() => {
    filterScripts();
  }, [scripts, searchTerm, filterType]);

  const fetchScripts = async () => {
    try {
      const data = await scriptsAPI.getScripts({ limit: 100 });
      setScripts(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching scripts:', error);
      toast.error('スクリプトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (scriptData) => {
    const now = new Date();
    const thisMonth = scriptData.filter(s => {
      const created = new Date(s.created_at);
      return created.getMonth() === now.getMonth() && 
             created.getFullYear() === now.getFullYear();
    });

    setStats({
      total: scriptData.length,
      favorites: scriptData.filter(s => s.is_favorite).length,
      thisMonth: thisMonth.length
    });
  };

  const filterScripts = () => {
    let filtered = [...scripts];

    // テキスト検索
    if (searchTerm) {
      filtered = filtered.filter(script =>
        script.script_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.visit_purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // フィルタータイプ
    switch (filterType) {
      case 'favorites':
        filtered = filtered.filter(s => s.is_favorite);
        break;
      case 'recent':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(s => new Date(s.created_at) > weekAgo);
        break;
      default:
        break;
    }

    // 作成日で降順ソート
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredScripts(filtered);
  };

  const toggleFavorite = async (scriptId, currentState) => {
    try {
      await scriptsAPI.updateScript(scriptId, {
        is_favorite: !currentState
      });
      setScripts(scripts.map(s =>
        s.id === scriptId ? { ...s, is_favorite: !currentState } : s
      ));
      toast.success(!currentState ? 'お気に入りに追加しました' : 'お気に入りから削除しました');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('お気に入りの更新に失敗しました');
    }
  };

  const openDeleteModal = (scriptId, scriptName) => {
    setDeleteModal({ isOpen: true, scriptId, scriptName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, scriptId: null, scriptName: '' });
  };

  const deleteScript = async () => {
    const { scriptId } = deleteModal;
    try {
      await scriptsAPI.deleteScript(scriptId);
      setScripts(scripts.filter(s => s.id !== scriptId));
      toast.success('スクリプトを削除しました');
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting script:', error);
      toast.error('スクリプトの削除に失敗しました');
    }
  };

  const duplicateScript = async (scriptId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/scripts/${scriptId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchScripts(); // リストを再取得
        toast.success('スクリプトを複製しました');
      } else {
        const error = await response.json();
        toast.error(error.error || 'スクリプトの複製に失敗しました');
      }
    } catch (error) {
      console.error('Error duplicating script:', error);
      toast.error('スクリプトの複製に失敗しました');
    }
  };

  const openEditModal = (scriptId, currentName) => {
    setEditModal({ isOpen: true, scriptId, scriptName: currentName });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, scriptId: null, scriptName: '' });
  };

  const updateScriptName = async () => {
    const { scriptId, scriptName } = editModal;
    if (!scriptName.trim()) {
      toast.error('スクリプト名を入力してください');
      return;
    }

    try {
      await scriptsAPI.updateScript(scriptId, {
        script_name: scriptName.trim()
      });
      setScripts(scripts.map(s =>
        s.id === scriptId ? { ...s, script_name: scriptName.trim() } : s
      ));
      toast.success('スクリプト名を更新しました');
      closeEditModal();
    } catch (error) {
      console.error('Error updating script name:', error);
      toast.error('スクリプト名の更新に失敗しました');
    }
  };

  const handleCreateScript = () => {
    // 直接ScriptGeneratorPageに遷移
    navigate('/script-generator');
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>読み込み中...</Title>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <FaRobot /> トークスクリプト管理
        </Title>

        <StatsBar>
          <StatItem>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">全スクリプト</div>
          </StatItem>
          <StatItem>
            <div className="stat-value">{stats.favorites}</div>
            <div className="stat-label">お気に入り</div>
          </StatItem>
          <StatItem>
            <div className="stat-value">{stats.thisMonth}</div>
            <div className="stat-label">今月作成</div>
          </StatItem>
        </StatsBar>

        <FilterBar>
          <SearchInput
            type="text"
            placeholder="スクリプト名、顧客名、タグで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FilterButton
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
          >
            すべて
          </FilterButton>
          <FilterButton
            active={filterType === 'favorites'}
            onClick={() => setFilterType('favorites')}
          >
            <FaStar /> お気に入り
          </FilterButton>
          <FilterButton
            active={filterType === 'recent'}
            onClick={() => setFilterType('recent')}
          >
            <FaCalendar /> 最近作成
          </FilterButton>
        </FilterBar>

        <CreateButton onClick={handleCreateScript} style={{ marginTop: 'var(--space-4)' }}>
          <FaRobot /> 新しいスクリプトを作成
        </CreateButton>
      </Header>

      {filteredScripts.length === 0 ? (
        <EmptyState>
          <h3>スクリプトが見つかりません</h3>
          {!(searchTerm || filterType !== 'all') ? (
            <p>上の「新しいスクリプトを作成」ボタンから作成できます</p>
          ) : (
            <p>検索条件を変更してください</p>
          )}
        </EmptyState>
      ) : (
        <ScriptGrid>
          {filteredScripts.map(script => (
            <ScriptCard key={script.id}>
              <CardHeader>
                <CardTitle>
                  {script.script_name || `${script.customer}_${script.visit_purpose}`}
                </CardTitle>
                <FavoriteButton
                  isFavorite={script.is_favorite}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(script.id, script.is_favorite);
                  }}
                >
                  <FaStar />
                </FavoriteButton>
              </CardHeader>

              <CardMeta>
                <MetaItem>
                  <FaTag />
                  {script.customer} / {script.visit_purpose}
                </MetaItem>
                <MetaItem>
                  <FaCalendar />
                  {format(new Date(script.created_at), 'yyyy年MM月dd日', { locale: ja })}
                </MetaItem>
              </CardMeta>

              {script.tags && script.tags.length > 0 && (
                <TagContainer>
                  {script.tags.map((tag, index) => (
                    <Tag key={index}>{tag}</Tag>
                  ))}
                </TagContainer>
              )}

              <CardActions>
                <ActionButton onClick={() => navigate(`/scripts/${script.id}`)}>
                  <FaEye /> 表示
                </ActionButton>
                <ActionButton onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(script.id, script.script_name || `${script.customer}_${script.visit_purpose}`);
                }}>
                  <FaEdit /> 編集
                </ActionButton>
                <ActionButton onClick={(e) => {
                  e.stopPropagation();
                  duplicateScript(script.id);
                }}>
                  <FaCopy /> 複製
                </ActionButton>
                <ActionButton onClick={(e) => {
                  e.stopPropagation();
                  openDeleteModal(script.id, script.script_name || `${script.customer}_${script.visit_purpose}`);
                }}>
                  <FaTrash /> 削除
                </ActionButton>
              </CardActions>
            </ScriptCard>
          ))}
        </ScriptGrid>
      )}

      {deleteModal.isOpen && (
        <ModalOverlay onClick={closeDeleteModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>削除確認</ModalTitle>
              <CloseButton onClick={closeDeleteModal}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              「{deleteModal.scriptName}」を削除してもよろしいですか？<br />
              この操作は取り消すことができません。
            </ModalBody>
            <ModalFooter>
              <ModalButton onClick={closeDeleteModal}>
                キャンセル
              </ModalButton>
              <ModalButton danger onClick={deleteScript}>
                削除する
              </ModalButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {editModal.isOpen && (
        <ModalOverlay onClick={closeEditModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>スクリプト名を編集</ModalTitle>
              <CloseButton onClick={closeEditModal}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <input
                type="text"
                value={editModal.scriptName}
                onChange={(e) => setEditModal({ ...editModal, scriptName: e.target.value })}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-none)',
                  backgroundColor: 'var(--color-background)',
                  fontSize: 'var(--font-size-body)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="スクリプト名を入力"
                autoFocus
              />
            </ModalBody>
            <ModalFooter>
              <ModalButton onClick={closeEditModal}>
                キャンセル
              </ModalButton>
              <ModalButton onClick={updateScriptName} style={{ backgroundColor: '#ff6b35', borderColor: '#ff6b35', color: 'white' }}>
                更新
              </ModalButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default ScriptListPage;