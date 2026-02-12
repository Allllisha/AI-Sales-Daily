require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Starting database seeding...');
    await client.query('BEGIN');

    // Drop and recreate checklist execution tables
    await client.query('DROP TABLE IF EXISTS checklist_execution_items CASCADE');
    await client.query('DROP TABLE IF EXISTS checklist_executions CASCADE');

    await client.query(`
      CREATE TABLE IF NOT EXISTS checklist_executions (
          id SERIAL PRIMARY KEY,
          checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id),
          site_id INTEGER REFERENCES sites(id),
          total_items INTEGER NOT NULL DEFAULT 0,
          checked_items INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
          notes TEXT,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS checklist_execution_items (
          id SERIAL PRIMARY KEY,
          execution_id INTEGER NOT NULL REFERENCES checklist_executions(id) ON DELETE CASCADE,
          checklist_item_id INTEGER REFERENCES checklist_items(id),
          item_content TEXT NOT NULL,
          is_required BOOLEAN DEFAULT false,
          checked BOOLEAN NOT NULL DEFAULT false,
          note TEXT
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_checklist_executions_checklist_id ON checklist_executions(checklist_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_checklist_executions_user_id ON checklist_executions(user_id)');

    // Create sites
    const site1 = await client.query(
      `INSERT INTO sites (name, location, description, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['東京駅前再開発工事', '東京都千代田区丸の内', '東京駅前の大規模再開発プロジェクト。地下3階・地上40階の複合施設建設。', 'active']
    );
    const site1Id = site1.rows[0].id;

    const site2 = await client.query(
      `INSERT INTO sites (name, location, description, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['横浜港北トンネル工事', '神奈川県横浜市港北区', '横浜港北エリアのトンネル掘削工事。全長2.5km。', 'active']
    );
    const site2Id = site2.rows[0].id;

    const site3 = await client.query(
      `INSERT INTO sites (name, location, description, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['大阪湾岸道路橋梁補修', '大阪府大阪市住之江区', '大阪湾岸道路の橋梁補修・耐震補強工事。', 'active']
    );
    const site3Id = site3.rows[0].id;

    // Create admin user
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminResult = await client.query(
      `INSERT INTO users (email, password, name, role, department)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['admin@example.com', hashedPassword, '管理太郎', 'admin', '本社管理部']
    );
    const adminId = adminResult.rows[0].id;

    // Create site_manager users
    const manager1Result = await client.query(
      `INSERT INTO users (email, password, name, role, department, site_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['yamada@example.com', hashedPassword, '山田現場長', 'site_manager', '建築部', site1Id, adminId]
    );
    const manager1Id = manager1Result.rows[0].id;

    const manager2Result = await client.query(
      `INSERT INTO users (email, password, name, role, department, site_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['suzuki@example.com', hashedPassword, '鈴木現場長', 'site_manager', '土木部', site2Id, adminId]
    );
    const manager2Id = manager2Result.rows[0].id;

    // Create expert user
    const expertResult = await client.query(
      `INSERT INTO users (email, password, name, role, department, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['expert@example.com', hashedPassword, '佐藤ベテラン', 'expert', '技術部', adminId]
    );
    const expertId = expertResult.rows[0].id;

    // Create worker users
    const worker1Result = await client.query(
      `INSERT INTO users (email, password, name, role, department, site_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['tanaka@example.com', hashedPassword, '田中作業員', 'worker', '建築部', site1Id, manager1Id]
    );
    const worker1Id = worker1Result.rows[0].id;

    await client.query(
      `INSERT INTO users (email, password, name, role, department, site_id, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['nakamura@example.com', hashedPassword, '中村作業員', 'worker', '土木部', site2Id, manager2Id]
    );

    // Create sample knowledge items
    const k1 = await client.query(
      `INSERT INTO knowledge_items (title, content, summary, category, work_type, risk_level, author_id, status, approved_by, approved_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10) RETURNING id`,
      [
        '杭打ち工事の地盤調査確認手順',
        '## 杭打ち工事前の地盤調査確認手順\n\n### 1. 地盤調査報告書の確認\n- ボーリングデータの確認（N値、土質柱状図）\n- 地下水位の確認\n- 支持層の深度と連続性の確認\n\n### 2. 施工計画への反映\n- 杭長の決定根拠の確認\n- 使用機械の選定妥当性\n- 近隣への影響評価（振動・騒音）\n\n### 3. 注意事項\n- 地盤調査ポイントと杭位置の整合性確認\n- 過去の埋立て履歴の確認\n- 地下埋設物の有無確認',
        '杭打ち工事前に必要な地盤調査の確認手順。ボーリングデータ、地下水位、支持層の確認から施工計画への反映まで。',
        'procedure', '杭打ち', 'high', expertId, 'published', manager1Id, 1
      ]
    );

    const k2 = await client.query(
      `INSERT INTO knowledge_items (title, content, summary, category, work_type, risk_level, author_id, status, approved_by, approved_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10) RETURNING id`,
      [
        '足場設置時の安全確認チェックポイント',
        '## 足場設置時の安全確認\n\n### 設置前\n- 設置場所の地盤状態確認（軟弱地盤の場合は敷板使用）\n- 架空線・障害物の確認\n- 作業範囲の区画確認\n\n### 設置中\n- 建枠の垂直精度確認（レベル測定）\n- 筋交いの設置確認\n- 壁つなぎの取付間隔確認（垂直5.5m以下、水平5.5m以下）\n\n### 設置後\n- 手すり・中桟・幅木の設置確認\n- 昇降設備の設置確認\n- 足場板の固定状態確認\n- 墜落防止ネットの設置確認',
        '足場設置時の安全確認チェックポイント。設置前の地盤確認から設置中の精度管理、設置後の安全装置確認まで。',
        'safety', '足場工事', 'critical', expertId, 'published', manager1Id, 1
      ]
    );

    const k3 = await client.query(
      `INSERT INTO knowledge_items (title, content, summary, category, work_type, risk_level, author_id, status, approved_by, approved_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10) RETURNING id`,
      [
        'コンクリート打設時の品質管理要領',
        '## コンクリート打設の品質管理\n\n### 打設前\n- 配合計画書の確認（設計強度、スランプ、空気量）\n- 型枠・鉄筋の最終確認\n- 天候確認（気温5度以下は寒中コンクリート対策）\n\n### 打設中\n- スランプ試験の実施（現場到着時）\n- 空気量試験\n- コンクリート温度測定\n- バイブレーター使用による締固め\n- コールドジョイント防止（打重ね時間管理）\n\n### 打設後\n- 養生方法の確認（散水養生、シート養生）\n- 養生期間の管理（普通セメント5日以上）\n- 供試体の採取・管理\n- 脱型時期の判断',
        'コンクリート打設の品質管理。配合確認から養生管理まで、各工程での品質確認項目を整理。',
        'quality', 'コンクリート工事', 'high', expertId, 'published', manager1Id, 1
      ]
    );

    const k4 = await client.query(
      `INSERT INTO knowledge_items (title, content, summary, category, work_type, risk_level, author_id, status, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        '重機搬入時の安全管理手順',
        '## 重機搬入時の安全管理\n\n### 搬入計画\n- 搬入経路の確認（道路幅員、回転半径）\n- 搬入時間帯の設定（交通規制との調整）\n- 誘導員の配置計画\n\n### 搬入時\n- 重機オペレーターへの現場説明\n- 地盤の支持力確認（鉄板敷設等）\n- 架空線防護の確認\n- 第三者立入禁止区域の設定',
        '重機搬入時の安全管理手順。搬入計画から実施時の安全対策まで。',
        'safety', '土工事', 'high', worker1Id, 'draft', 1
      ]
    );

    const k5 = await client.query(
      `INSERT INTO knowledge_items (title, content, summary, category, work_type, risk_level, author_id, status, approved_by, approved_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10) RETURNING id`,
      [
        'トンネル掘削時の地山観察記録要領',
        '## トンネル掘削 地山観察記録\n\n### 観察項目\n- 切羽の安定性（崩落・肌落ちの有無）\n- 湧水の状況（位置、量、濁り）\n- 地山の硬軟（ハンマー打撃テスト）\n- 割れ目の方向と間隔\n- 変状の有無（天端沈下、側壁変位）\n\n### 記録方法\n- 切羽観察記録票の記入\n- 写真撮影（正面、側面、天端）\n- 内空変位計測データの記録\n- 地質スケッチの作成\n\n### 判定基準\n- B基準：計測値が管理基準を超過→注意レベル\n- A基準：計測値が設計値に接近→対策レベル',
        'トンネル掘削時の地山観察と計測管理の要領。切羽の観察項目、記録方法、判定基準を整理。',
        'procedure', 'トンネル工事', 'critical', expertId, 'published', manager2Id, 1
      ]
    );

    // Add tags to knowledge items
    const tagsData = [
      { kid: k1.rows[0].id, tags: ['杭打ち', '地盤調査', 'ボーリング', '基礎工事'] },
      { kid: k2.rows[0].id, tags: ['足場', '安全管理', '墜落防止', '仮設'] },
      { kid: k3.rows[0].id, tags: ['コンクリート', '品質管理', '養生', '打設'] },
      { kid: k4.rows[0].id, tags: ['重機', '搬入', '安全管理', '土工'] },
      { kid: k5.rows[0].id, tags: ['トンネル', '地山観察', '計測管理', '変状'] },
    ];

    for (const { kid, tags } of tagsData) {
      for (const tag of tags) {
        await client.query(
          `INSERT INTO knowledge_tags (knowledge_id, tag_name, auto_generated) VALUES ($1, $2, $3)`,
          [kid, tag, false]
        );
      }
    }

    // Create sample incident cases
    await client.query(
      `INSERT INTO incident_cases (title, description, cause, countermeasure, site_id, work_type, severity, occurred_at, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        '足場からの墜落ヒヤリハット',
        '高さ8mの足場上で作業中、手すりが固定されていない箇所があり、作業員が体勢を崩しかけた。安全帯を着用していたため墜落には至らなかった。',
        '前日の強風により手すりの固定ボルトが緩んでいた。朝の始業前点検が不十分だった。',
        '1. 始業前点検チェックリストに手すり固定状態の確認項目を追加\n2. 強風（風速10m/s以上）後は必ず足場の臨時点検を実施\n3. 安全帯の100%着用ルールの再周知',
        site1Id, '足場工事', 'serious', '2025-11-15', worker1Id
      ]
    );

    await client.query(
      `INSERT INTO incident_cases (title, description, cause, countermeasure, site_id, work_type, severity, occurred_at, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'トンネル切羽での湧水発生',
        'トンネル掘削中、切羽から予想を超える湧水が発生。毎分500リットルの湧水量で、一時作業を中断した。',
        '事前地質調査で把握していた断層帯の延長部に遭遇した。地下水位が予想より高かった。',
        '1. 追加ボーリング調査の実施\n2. ウェルポイント工法による事前排水\n3. 防水型セグメントの採用検討\n4. 湧水処理設備の増強',
        site2Id, 'トンネル工事', 'serious', '2025-12-03', manager2Id
      ]
    );

    await client.query(
      `INSERT INTO incident_cases (title, description, cause, countermeasure, site_id, work_type, severity, occurred_at, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'コンクリートのコールドジョイント発生',
        '橋梁上部工のコンクリート打設中、ポンプ車の故障により打設が2時間中断。打重ね部分にコールドジョイントが発生した。',
        '予備のポンプ車を手配していなかった。打設計画で中断リスクへの対策が不十分だった。',
        '1. 打設時は予備ポンプ車を常時待機させる\n2. 打設計画にリスク対応手順を明記\n3. 打重ね許容時間の管理を厳格化（外気温に応じた時間設定）\n4. コールドジョイント発生時の補修手順を事前に策定',
        site3Id, 'コンクリート工事', 'moderate', '2026-01-10', expertId
      ]
    );

    // Create sample checklists
    const cl1 = await client.query(
      `INSERT INTO checklists (name, work_type, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['杭打ち工事 施工前チェックリスト', '杭打ち', '杭打ち工事を開始する前に確認すべき項目リスト', expertId]
    );

    const checklistItems1 = [
      { content: '地盤調査報告書（ボーリングデータ）を確認したか', priority: 'required', order: 1 },
      { content: '杭長・杭径の設計値を確認したか', priority: 'required', order: 2 },
      { content: '地下水位の確認を行ったか', priority: 'required', order: 3 },
      { content: '地下埋設物の有無を確認したか', priority: 'required', order: 4 },
      { content: '近隣への振動・騒音影響を評価したか', priority: 'recommended', order: 5 },
      { content: '使用機械の搬入経路を確認したか', priority: 'recommended', order: 6 },
      { content: '施工手順書を作業員に周知したか', priority: 'required', order: 7 },
    ];

    for (const item of checklistItems1) {
      await client.query(
        `INSERT INTO checklist_items (checklist_id, content, priority, related_knowledge_id, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [cl1.rows[0].id, item.content, item.priority, k1.rows[0].id, item.order]
      );
    }

    await client.query('COMMIT');
    console.log('Database seeding completed successfully!');
    console.log('Created test users:');
    console.log('- admin@example.com (admin, password: password123)');
    console.log('- yamada@example.com (site_manager, password: password123)');
    console.log('- suzuki@example.com (site_manager, password: password123)');
    console.log('- expert@example.com (expert, password: password123)');
    console.log('- tanaka@example.com (worker, password: password123)');
    console.log('- nakamura@example.com (worker, password: password123)');
    console.log('Created 3 sites, 5 knowledge items, 3 incident cases, 1 checklist');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
