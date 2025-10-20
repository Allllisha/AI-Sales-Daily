import React from 'react';
import styled from '@emotion/styled';

const TagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  background-color: ${props => props.color || '#6B7280'}15;
  color: ${props => props.color || '#6B7280'};
  border: 1px solid ${props => props.color || '#6B7280'}40;
  margin-right: 6px;
  margin-bottom: 6px;
  white-space: nowrap;
  transition: all 0.2s;
  cursor: ${props => props.onClick ? 'pointer' : 'default'};

  &:hover {
    ${props => props.onClick && `
      background-color: ${props.color || '#6B7280'}25;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `}
  }

  ${props => props.removable && `
    padding-right: 8px;
  `}
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  margin-left: 6px;
  cursor: pointer;
  padding: 0;
  font-size: 1.1rem;
  line-height: 1;
  opacity: 0.6;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0;
`;

const CategoryLabel = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.7;
  margin-right: 4px;
`;

const Tag = ({ name, category, color, onClick, onRemove, showCategory = false }) => {
  const getCategoryLabel = (cat) => {
    const labels = {
      company: '企業',
      person: '人物',
      topic: '話題',
      emotion: '感情',
      stage: 'ステージ',
      industry: '業界',
      product: '製品'
    };
    return labels[cat] || cat;
  };

  return (
    <TagBadge color={color} onClick={onClick} removable={!!onRemove}>
      {showCategory && category && (
        <CategoryLabel>{getCategoryLabel(category)}: </CategoryLabel>
      )}
      {name}
      {onRemove && (
        <RemoveButton onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          ×
        </RemoveButton>
      )}
    </TagBadge>
  );
};

export const TagList = ({ tags, onTagClick, onTagRemove, showCategory = false }) => {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <TagContainer>
      {tags.map((tag, index) => (
        <Tag
          key={tag.id || index}
          name={tag.name}
          category={tag.category}
          color={tag.color}
          onClick={onTagClick ? () => onTagClick(tag) : null}
          onRemove={onTagRemove ? () => onTagRemove(tag) : null}
          showCategory={showCategory}
        />
      ))}
    </TagContainer>
  );
};

export default Tag;
