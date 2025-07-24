# Design System Migration Guide

## Overview
This guide helps you migrate existing components to the new professional SaaS-style design system.

## Key Changes

### 1. Color Palette
- **Old**: Bright blue (#2563eb) header, red buttons
- **New**: Sophisticated neutral palette with subtle accents
  - Primary: Neutral grays (#171717, #404040, etc.)
  - Backgrounds: Light neutrals (#FAFAFA, #FFFFFF)
  - Accents: Muted indigo for interactive elements

### 2. Typography
- **Old**: Basic system fonts
- **New**: SF Pro Display/Text with proper hierarchy
  - Headings: Semibold with tight letter-spacing
  - Body: Regular weight with relaxed line-height
  - Small text: Reduced size with medium weight

### 3. Spacing
- Consistent spacing scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, etc.
- Use spacing tokens instead of arbitrary values

### 4. Components

#### Buttons
```jsx
// Old
<button style={{ backgroundColor: '#2563eb', color: 'white' }}>
  Click me
</button>

// New
import { PrimaryButton } from '../styles/componentStyles';
<PrimaryButton>Click me</PrimaryButton>
```

#### Cards
```jsx
// Old
<div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem' }}>
  Content
</div>

// New
import { Card, CardHeader, CardTitle, CardContent } from '../styles/componentStyles';
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

#### Forms
```jsx
// Old
<input type="text" style={{ border: '1px solid #ccc' }} />

// New
import { FormGroup, Label, Input } from '../styles/componentStyles';
<FormGroup>
  <Label>Field Name</Label>
  <Input type="text" placeholder="Enter value" />
</FormGroup>
```

## Component Updates

### HomePage.jsx
Replace gradient backgrounds and bright colors with subtle designs:
```jsx
// Old
background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);

// New
background-color: ${colors.neutral[50]};
border: 1px solid ${colors.neutral[200]};
```

### Common Patterns

1. **Headers/Titles**
   - Use `colors.neutral[900]` for primary text
   - Apply `typography.letterSpacing.tight`
   - Use `typography.fontWeight.semibold` or `bold`

2. **Secondary Text**
   - Use `colors.neutral[600]` or `colors.neutral[700]`
   - Standard `typography.lineHeight.normal`

3. **Interactive Elements**
   - Hover states should be subtle (e.g., `colors.neutral[100]` background)
   - Focus states use primary color with low opacity shadow
   - Transitions should be fast (150-200ms)

4. **Borders**
   - Use `colors.neutral[200]` for standard borders
   - Use `colors.neutral[100]` for subtle dividers

5. **Shadows**
   - Use `shadows.sm` for cards and elevated elements
   - Use `shadows.md` on hover for interactive cards
   - Avoid heavy shadows

## Best Practices

1. **Import Design System**
   ```jsx
   import { colors, typography, spacing, borderRadius, shadows } from '../styles/designSystem';
   ```

2. **Use Component Library**
   ```jsx
   import { PrimaryButton, Card, Input } from '../styles/componentStyles';
   ```

3. **Consistent Spacing**
   - Always use spacing tokens: `spacing[2]`, `spacing[4]`, etc.
   - Avoid arbitrary values like `padding: 13px`

4. **Responsive Design**
   - Use the `media` helper for breakpoints
   - Maintain touch-friendly sizes on mobile (min 44px tap targets)

5. **Accessibility**
   - Ensure proper contrast ratios
   - Use semantic HTML
   - Include focus states

## Example Migration

### Before:
```jsx
const Button = styled.button`
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  &:hover {
    background-color: #2563eb;
  }
`;
```

### After:
```jsx
const Button = styled.button`
  background-color: ${colors.neutral[900]};
  color: ${colors.neutral[50]};
  padding: ${spacing[2]} ${spacing[4]};
  border-radius: ${borderRadius.md};
  font-weight: ${typography.fontWeight.medium};
  transition: all ${transitions.fast};
  
  &:hover {
    background-color: ${colors.neutral[800]};
  }
`;
```

## Testing
After migration, verify:
1. Consistent visual hierarchy
2. Proper contrast ratios
3. Smooth interactions
4. Mobile responsiveness
5. Focus states for accessibility