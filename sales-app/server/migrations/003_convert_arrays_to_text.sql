-- 配列型フィールドを文字列型に変更し、{}を除去する
-- Migration: Convert array fields to text and remove curly braces

-- まず、participants配列を文字列に変換
ALTER TABLE report_slots 
ALTER COLUMN participants TYPE TEXT USING 
  CASE 
    WHEN participants IS NULL THEN NULL
    ELSE REGEXP_REPLACE(array_to_string(participants, ', '), '[{}"]', '', 'g')
  END;

-- issues配列を文字列に変換
ALTER TABLE report_slots 
ALTER COLUMN issues TYPE TEXT USING 
  CASE 
    WHEN issues IS NULL THEN NULL
    ELSE REGEXP_REPLACE(array_to_string(issues, ', '), '[{}"]', '', 'g')
  END;

-- personal_info配列を文字列に変換
ALTER TABLE report_slots 
ALTER COLUMN personal_info TYPE TEXT USING 
  CASE 
    WHEN personal_info IS NULL THEN NULL
    ELSE REGEXP_REPLACE(array_to_string(personal_info, ', '), '[{}"]', '', 'g')
  END;

-- relationship_notes配列を文字列に変換
ALTER TABLE report_slots 
ALTER COLUMN relationship_notes TYPE TEXT USING 
  CASE 
    WHEN relationship_notes IS NULL THEN NULL
    ELSE REGEXP_REPLACE(array_to_string(relationship_notes, ', '), '[{}"]', '', 'g')
  END;

-- 既存の文字列フィールドからも{}を除去
UPDATE report_slots SET 
  customer = REGEXP_REPLACE(customer, '[{}"]', '', 'g'),
  project = REGEXP_REPLACE(project, '[{}"]', '', 'g'),
  next_action = REGEXP_REPLACE(next_action, '[{}"]', '', 'g'),
  budget = REGEXP_REPLACE(budget, '[{}"]', '', 'g'),
  schedule = REGEXP_REPLACE(schedule, '[{}"]', '', 'g'),
  location = REGEXP_REPLACE(location, '[{}"]', '', 'g')
WHERE 
  customer ~ '[{}"]' OR 
  project ~ '[{}"]' OR 
  next_action ~ '[{}"]' OR 
  budget ~ '[{}"]' OR 
  schedule ~ '[{}"]' OR 
  location ~ '[{}"]';

-- 制約を追加：{}や[]を含むデータの挿入を防ぐ
ALTER TABLE report_slots 
ADD CONSTRAINT check_no_brackets_customer CHECK (customer !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_project CHECK (project !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_next_action CHECK (next_action !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_budget CHECK (budget !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_schedule CHECK (schedule !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_participants CHECK (participants !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_location CHECK (location !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_issues CHECK (issues !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_personal_info CHECK (personal_info !~ '[{}\[\]"]'),
ADD CONSTRAINT check_no_brackets_relationship_notes CHECK (relationship_notes !~ '[{}\[\]"]');