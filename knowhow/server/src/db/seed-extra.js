/**
 * 追加シードデータ: 橋梁工事ナレッジ、チェックリスト、事故事例、音声セッション
 *
 * Usage: node src/db/seed-extra.js
 */
require('dotenv').config();
const { Pool } = require('pg');

async function seedExtra() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000
  });
  const client = await pool.connect();

  try {
    console.log('=== 追加シードデータ投入開始 ===');
    await client.query('BEGIN');

    // --- 既存ID参照 ---
    const expertId = 4;   // 佐藤ベテラン
    const mgr1Id = 2;     // 山田現場長 (site 1)
    const mgr2Id = 3;     // 鈴木現場長 (site 2)
    const worker1Id = 5;  // 田中作業員 (site 1)
    const worker2Id = 6;  // 中村作業員 (site 2)
    const site1Id = 1;    // 東京駅前再開発工事
    const site2Id = 2;    // 横浜港北トンネル工事
    const site3Id = 3;    // 大阪湾岸道路橋梁補修

    // =====================================================
    // 1. 橋梁工事ナレッジ (10件)
    // =====================================================
    console.log('橋梁工事ナレッジを投入中...');

    const bridgeKnowledge = [
      {
        title: '橋梁塗り替え工事の施工手順',
        content: `## 橋梁塗り替え工事の施工手順

### 1. 事前調査
- 既存塗膜の劣化状況調査（付着力試験、膜厚測定）
- 鉛含有塗料の有無確認（RoHS対応）
- PCB含有調査（昭和49年以前の塗膜）
- 飛来落下物防止措置の計画

### 2. 素地調整
- **1種ケレン**: ブラスト処理（ISO Sa2.5以上）
- **2種ケレン**: 電動工具を使用した旧塗膜除去
- **3種ケレン**: 活膜を残し、劣化部のみ除去
- **4種ケレン**: 粉化物・汚れの除去（軽微な場合）

### 3. 塗装工程
- 下塗り（プライマー）: 無機ジンクリッチペイント or エポキシ樹脂塗料
- 中塗り: 弱溶剤系エポキシ樹脂塗料（膜厚30μm以上）
- 上塗り: ふっ素樹脂塗料（膜厚25μm以上）
- 各層間の乾燥時間遵守

### 4. 品質管理
- 塗膜厚測定（電磁式膜厚計）
- 付着力試験（クロスカット法）
- 外観検査（ピンホール、だれ、はじき）`,
        summary: '橋梁塗り替え工事の施工手順。事前調査から素地調整、塗装工程、品質管理まで。',
        category: 'procedure', work_type: '橋梁工事', risk_level: 'high',
        author_id: expertId, status: 'published', approved_by: mgr1Id,
        tags: ['橋梁', '塗装', '素地調整', 'ケレン', '防食']
      },
      {
        title: '橋梁点検における損傷区分と記録方法',
        content: `## 橋梁点検 損傷区分と記録

### 損傷区分（a～e）
- **a**: 損傷なし
- **b**: 軽微な損傷（経過観察）
- **c**: 補修が望ましい（次回点検まで監視）
- **d**: 早期に補修が必要
- **e**: 緊急対応が必要

### 主な点検項目
1. **コンクリート部材**: ひび割れ、剥離、鉄筋露出、遊離石灰
2. **鋼部材**: 腐食、亀裂、変形、ボルト脱落
3. **支承部**: 沈下、傾斜、異常音、機能障害
4. **伸縮装置**: 段差、破損、ゴムの劣化
5. **排水設備**: 詰まり、破損、漏水

### 記録要領
- 損傷位置を橋梁一般図にプロット
- 写真は損傷全体→近景→詳細の3段階
- 前回点検との変化を記録
- ひび割れはクラックスケールで幅を測定`,
        summary: '橋梁点検の損傷区分（a～e）と記録方法。コンクリート・鋼部材・支承部等の点検項目を整理。',
        category: 'procedure', work_type: '橋梁工事', risk_level: 'high',
        author_id: expertId, status: 'published', approved_by: mgr1Id,
        tags: ['橋梁', '点検', '損傷区分', 'ひび割れ', '維持管理']
      },
      {
        title: '橋梁の耐震補強工法の種類と選定',
        content: `## 橋梁耐震補強工法

### RC巻立て工法
- 既存橋脚にコンクリートを巻立て増厚
- じん性（変形能力）の向上
- 適用：RC橋脚、柱部材

### 鋼板巻立て工法
- 鋼板を橋脚周囲に設置し、モルタル充填
- 施工期間が短い
- 適用：RC橋脚、円形・矩形断面

### 炭素繊維巻付け工法
- 炭素繊維シートを接着樹脂で貼付
- 軽量で施工性が良い
- 適用：RC部材のせん断補強

### 免震・制震装置
- 高減衰ゴム支承
- 鉛プラグ入り積層ゴム支承（LRB）
- ダンパー（オイル、鋼製、粘性）

### 落橋防止装置
- 変位制限装置（ストッパー）
- 落橋防止ケーブル
- 段差防止装置
- 桁連結装置`,
        summary: '橋梁の耐震補強工法。RC巻立て、鋼板巻立て、炭素繊維、免震装置、落橋防止装置の種類と選定。',
        category: 'procedure', work_type: '橋梁工事', risk_level: 'critical',
        author_id: expertId, status: 'published', approved_by: mgr2Id,
        tags: ['橋梁', '耐震補強', '免震', '落橋防止', '鋼板巻立て']
      },
      {
        title: '橋梁工事における高所作業の安全管理',
        content: `## 橋梁高所作業の安全管理

### 墜落防止措置
- 高さ2m以上の作業：墜落制止用器具の使用必須
- フルハーネス型の使用（高さ6.75m以上）
- 親綱・ライフラインの設置
- 作業床の端部・開口部に手すり設置（高さ85cm以上）

### 仮設設備
- 吊り足場の設計・設置（橋梁下面作業用）
- 移動式足場（ローリングタワー）の転倒防止
- 高所作業車の使用基準と資格確認
- ネット・シートの設置（飛来落下物防止）

### 気象条件による作業制限
- **風速10m/s以上**: 高所作業中止
- **降雨・降雪時**: 足場が滑りやすく原則中止
- **雷**: 金属部材での作業は即時中止
- **気温35度以上**: 熱中症対策強化、こまめな休憩

### 日常管理
- 始業前点検（安全帯、足場、防護ネット）
- KY活動（危険予知活動）の実施
- 新規入場者教育の徹底`,
        summary: '橋梁工事の高所作業安全管理。墜落防止、仮設設備、気象制限、日常管理のポイント。',
        category: 'safety', work_type: '橋梁工事', risk_level: 'critical',
        author_id: expertId, status: 'published', approved_by: mgr1Id,
        tags: ['橋梁', '高所作業', '安全管理', '墜落防止', 'フルハーネス']
      },
      {
        title: '橋梁コンクリート補修工法の選定基準',
        content: `## 橋梁コンクリート補修工法

### ひび割れ補修
- **幅0.2mm未満**: 表面被覆工法（シール材塗布）
- **幅0.2～1.0mm**: 注入工法（エポキシ樹脂注入）
- **幅1.0mm以上**: 充填工法（Uカット→シーリング材充填）

### 断面修復
- **小規模（深さ30mm未満）**: 左官工法（ポリマーセメントモルタル）
- **中規模（深さ30～100mm）**: 吹付け工法
- **大規模（深さ100mm以上）**: 型枠充填工法

### 表面保護
- **表面含浸工法**: シラン系撥水材の含浸（塩害対策）
- **表面被覆工法**: エポキシ樹脂系・ウレタン系塗膜
- **電気防食工法**: 外部電源方式・流電陽極方式（重度塩害）

### 補修材料の選定ポイント
- 既存コンクリートとの付着性
- 乾燥収縮ひずみの小ささ
- 耐候性・耐久性
- 施工環境への適合性（低温・高湿度）`,
        summary: '橋梁コンクリートの補修工法。ひび割れ幅・断面欠損の規模に応じた工法選定基準。',
        category: 'quality', work_type: '橋梁工事', risk_level: 'high',
        author_id: expertId, status: 'published', approved_by: mgr2Id,
        tags: ['橋梁', 'コンクリート', '補修', 'ひび割れ', '断面修復']
      },
      {
        title: '橋梁の支承交換作業手順',
        content: `## 支承交換作業手順

### 1. 事前準備
- 既存支承の損傷状況調査
- 新支承の設計・製作（反力計算に基づく）
- ジャッキアップ計画の策定
- 仮受け構造の設計

### 2. ジャッキアップ
- ジャッキ設置位置の確認（橋脚天端の耐力確認）
- 段階的なジャッキアップ（5mm刻み）
- 桁の変位・ひずみの計測（リアルタイム監視）
- 最大ジャッキアップ量の管理（通常10～30mm）

### 3. 支承撤去・設置
- 旧支承の撤去（アンカーボルト切断）
- 支承座面の清掃・レベル調整（無収縮モルタル）
- 新支承の据付け（レベル・位置の精密調整）
- アンカーボルトの固定

### 4. ジャッキダウン・完了
- 段階的なジャッキダウン（反力の均等化）
- 支承の機能確認（回転・移動の確認）
- ジャッキ・仮受けの撤去
- 最終計測・記録`,
        summary: '橋梁の支承交換手順。ジャッキアップから支承撤去・設置、ジャッキダウンまでの一連の流れ。',
        category: 'procedure', work_type: '橋梁工事', risk_level: 'critical',
        author_id: expertId, status: 'published', approved_by: mgr1Id,
        tags: ['橋梁', '支承', 'ジャッキアップ', '交換', '維持管理']
      },
      {
        title: '橋梁床版防水工の施工要領',
        content: `## 橋梁床版防水工

### 防水層の種類
1. **シート系**: アスファルト系、合成ゴム系
2. **塗膜系**: ウレタン系、エポキシ系
3. **複合系**: シート＋塗膜の組み合わせ

### 施工手順（塗膜系の場合）
1. 素地処理
   - 床版面のレイタンス除去（ショットブラスト）
   - 不陸整正（2mm以下）
   - プライマー塗布

2. 防水層施工
   - 1層目塗布（所定膜厚の確認）
   - 補強布の貼付け（端部・ドレン周り）
   - 2層目塗布
   - 膜厚検査（ピンゲージ）

3. 保護層施工
   - 珪砂散布（付着性確保）
   - アスファルト舗装の施工

### 品質管理のポイント
- 気温5度以上、湿度85%以下での施工
- 降雨予報時は施工中止
- 床版含水率の確認（8%以下）
- ピンホール検査の実施`,
        summary: '橋梁床版防水工の施工要領。防水層の種類、施工手順、品質管理のポイント。',
        category: 'quality', work_type: '橋梁工事', risk_level: 'high',
        author_id: mgr2Id, status: 'published', approved_by: mgr1Id,
        tags: ['橋梁', '床版', '防水', '舗装', '品質管理']
      },
      {
        title: '鋼橋の溶接補修と品質検査',
        content: `## 鋼橋の溶接補修

### 疲労亀裂の補修工法
- **溶接による補修**: 亀裂先端のストップホール→ガウジング→再溶接
- **当て板補強**: 亀裂部に補強板をボルト接合
- **ピーニング**: 溶接止端部の応力集中緩和

### 溶接施工管理
- 溶接技能者の資格確認（JIS Z 3801/3811）
- 溶接施工要領書（WPS）の作成
- 予熱温度の管理（板厚・鋼種に応じて）
- 入熱量の管理（パス間温度含む）

### 非破壊検査
- **超音波探傷試験（UT）**: 内部欠陥の検出
- **磁粉探傷試験（MT）**: 表面・表層欠陥の検出
- **浸透探傷試験（PT）**: 表面開口欠陥の検出
- **放射線透過試験（RT）**: 溶接内部の可視化

### 検査基準
- JIS Z 3060に準拠
- 欠陥の種類・大きさによる合否判定
- 不合格部の補修→再検査`,
        summary: '鋼橋の溶接補修工法と非破壊検査。疲労亀裂の補修、溶接管理、UT/MT/PT/RTの検査方法。',
        category: 'quality', work_type: '橋梁工事', risk_level: 'critical',
        author_id: expertId, status: 'published', approved_by: mgr2Id,
        tags: ['橋梁', '鋼橋', '溶接', '非破壊検査', '疲労亀裂']
      },
      {
        title: '橋梁工事の交通規制計画と安全対策',
        content: `## 橋梁工事の交通規制

### 規制区分
- **全面通行止め**: 大規模補修、架替え時
- **片側交互通行**: 片側車線での作業時
- **車線規制**: 路肩側・中央側の規制
- **夜間規制**: 交通量の少ない時間帯のみ

### 規制計画の策定
1. 交通量調査（時間帯別・方向別）
2. 迂回路の設定・案内計画
3. 規制延長・規制時間の最適化
4. 緊急車両の通行確保

### 安全施設
- 工事予告看板（手前500m、300m、100m）
- 矢印板・回転灯
- セーフティコーン・バリケード
- 夜間照明（LED投光器）
- 電光掲示板による情報提供

### 第三者事故防止
- 作業帯と交通の分離（ガードレール等）
- 落下物防止ネット・防護板の設置
- 交通誘導員の適正配置
- 作業車両の出入管理`,
        summary: '橋梁工事の交通規制計画。規制区分、安全施設の設置、第三者事故防止対策。',
        category: 'safety', work_type: '橋梁工事', risk_level: 'high',
        author_id: mgr2Id, status: 'published', approved_by: mgr1Id,
        tags: ['橋梁', '交通規制', '安全対策', '第三者災害', '夜間工事']
      },
      {
        title: '橋梁の伸縮装置交換工法',
        content: `## 伸縮装置の交換

### 劣化の兆候
- 遊間量の異常（設計値からの逸脱）
- ゴム材の亀裂・欠損
- 止水性の低下（漏水の発生）
- 段差の発生（走行性の低下）
- 異常音の発生

### 交換手順
1. **撤去準備**
   - 交通規制の実施
   - 既設舗装の切断（カッター）
   - コンクリートはつり（バックホウアタッチメント）

2. **既設装置の撤去**
   - アンカーの切断
   - 装置の吊上げ撤去（クレーン使用）
   - 箱抜き部の清掃

3. **新設装置の設置**
   - 型枠の設置
   - 新装置の据付（遊間量の調整）
   - 後打ちコンクリート打設
   - 養生（早強セメント使用で48時間）

4. **舗装復旧**
   - 基層・表層の舗装
   - 段差の確認（3mm以下）
   - 供用開始

### 施工上の注意点
- 橋梁の温度伸縮を考慮した遊間設定
- 排水勾配の確保
- 後打ちコンクリートの品質確保`,
        summary: '橋梁の伸縮装置交換手順。劣化兆候の判断から撤去・設置・舗装復旧まで。',
        category: 'procedure', work_type: '橋梁工事', risk_level: 'high',
        author_id: mgr2Id, status: 'published', approved_by: mgr1Id,
        tags: ['橋梁', '伸縮装置', '交換', '舗装', '維持管理']
      }
    ];

    const knowledgeIds = [];
    for (const k of bridgeKnowledge) {
      const r = await client.query(
        `INSERT INTO knowledge_items (title, content, summary, category, work_type, risk_level, author_id, status, approved_by, approved_at, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 1) RETURNING id`,
        [k.title, k.content, k.summary, k.category, k.work_type, k.risk_level, k.author_id, k.status, k.approved_by]
      );
      const kid = r.rows[0].id;
      knowledgeIds.push(kid);
      for (const tag of k.tags) {
        await client.query(
          'INSERT INTO knowledge_tags (knowledge_id, tag_name, auto_generated) VALUES ($1, $2, false)',
          [kid, tag]
        );
      }
    }
    console.log(`  橋梁ナレッジ ${knowledgeIds.length}件 投入完了`);

    // =====================================================
    // 2. 追加チェックリスト (3件)
    // =====================================================
    console.log('追加チェックリストを投入中...');

    // 橋梁塗り替え工事チェックリスト
    const cl2 = await client.query(
      `INSERT INTO checklists (name, work_type, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['橋梁塗り替え工事 施工前チェックリスト', '橋梁工事', '橋梁塗り替え工事を開始する前に確認すべき項目リスト', expertId]
    );
    const cl2Items = [
      { content: '既存塗膜の劣化状況調査を実施したか', priority: 'required', order: 1 },
      { content: '鉛含有塗料・PCB含有の有無を確認したか', priority: 'required', order: 2 },
      { content: '素地調整の種別（1種～4種ケレン）を決定したか', priority: 'required', order: 3 },
      { content: '飛来落下物防止措置を計画したか', priority: 'required', order: 4 },
      { content: '塗装仕様書（塗料種別・膜厚・工程数）を確認したか', priority: 'required', order: 5 },
      { content: '気象条件（気温5度以上、湿度85%以下）を確認したか', priority: 'required', order: 6 },
      { content: '高所作業の墜落防止措置を確認したか', priority: 'required', order: 7 },
      { content: '交通規制計画の許可を取得したか', priority: 'required', order: 8 },
      { content: '作業員の資格（高所作業車、有機溶剤）を確認したか', priority: 'recommended', order: 9 },
      { content: '産業廃棄物の処理計画を策定したか', priority: 'recommended', order: 10 },
    ];
    for (const item of cl2Items) {
      await client.query(
        'INSERT INTO checklist_items (checklist_id, content, priority, related_knowledge_id, order_index) VALUES ($1, $2, $3, $4, $5)',
        [cl2.rows[0].id, item.content, item.priority, knowledgeIds[0], item.order]
      );
    }

    // コンクリート打設チェックリスト
    const cl3 = await client.query(
      `INSERT INTO checklists (name, work_type, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['コンクリート打設 品質管理チェックリスト', 'コンクリート工事', 'コンクリート打設時の品質管理確認項目', expertId]
    );
    const cl3Items = [
      { content: '配合計画書の設計強度・スランプ値を確認したか', priority: 'required', order: 1 },
      { content: '型枠の寸法・固定状態を確認したか', priority: 'required', order: 2 },
      { content: '鉄筋のかぶり厚さ・配筋を確認したか', priority: 'required', order: 3 },
      { content: '外気温に応じた対策を講じたか（寒中/暑中）', priority: 'required', order: 4 },
      { content: 'スランプ試験を実施し許容範囲内か', priority: 'required', order: 5 },
      { content: '空気量試験を実施したか', priority: 'required', order: 6 },
      { content: 'バイブレーターの配置計画を確認したか', priority: 'recommended', order: 7 },
      { content: '打重ね許容時間を設定したか', priority: 'required', order: 8 },
      { content: '供試体の採取計画を確認したか', priority: 'required', order: 9 },
      { content: '養生方法と養生期間を計画したか', priority: 'required', order: 10 },
    ];
    for (const item of cl3Items) {
      await client.query(
        'INSERT INTO checklist_items (checklist_id, content, priority, order_index) VALUES ($1, $2, $3, $4)',
        [cl3.rows[0].id, item.content, item.priority, item.order]
      );
    }

    // 高所作業安全チェックリスト
    const cl4 = await client.query(
      `INSERT INTO checklists (name, work_type, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['高所作業 安全チェックリスト', '共通', '高所作業（2m以上）の開始前安全確認項目', mgr1Id]
    );
    const cl4Items = [
      { content: 'フルハーネス型墜落制止用器具の点検を実施したか', priority: 'required', order: 1 },
      { content: '親綱・ライフラインの設置状況を確認したか', priority: 'required', order: 2 },
      { content: '作業床の端部・開口部に手すりを設置したか', priority: 'required', order: 3 },
      { content: '風速10m/s未満であることを確認したか', priority: 'required', order: 4 },
      { content: '降雨・降雪がないことを確認したか', priority: 'required', order: 5 },
      { content: 'KY活動（危険予知）を実施したか', priority: 'required', order: 6 },
      { content: '飛来落下物防止ネットを設置したか', priority: 'recommended', order: 7 },
      { content: '高所作業車の資格を確認したか', priority: 'required', order: 8 },
    ];
    for (const item of cl4Items) {
      await client.query(
        'INSERT INTO checklist_items (checklist_id, content, priority, order_index) VALUES ($1, $2, $3, $4)',
        [cl4.rows[0].id, item.content, item.priority, item.order]
      );
    }
    console.log('  チェックリスト3件 投入完了');

    // =====================================================
    // 3. 追加事故事例 (5件)
    // =====================================================
    console.log('追加事故事例を投入中...');

    const incidents = [
      {
        title: '橋梁塗装作業中の有機溶剤中毒ヒヤリハット',
        description: '橋梁の箱桁内部で塗装作業中、換気が不十分な状態で有機溶剤を使用し、作業員1名がめまい・頭痛を訴えた。直ちに換気を強化し、作業員は外気下で回復した。',
        cause: '箱桁内部の換気計画が不十分。送風機の風量不足と排気口の位置が不適切だった。有機溶剤作業主任者が不在のまま作業を開始していた。',
        countermeasure: '1. 箱桁内部の換気計画を見直し（送風量の増加、排気口位置の改善）\n2. 有機溶剤作業主任者の常駐を義務化\n3. 作業前のガス濃度測定を義務化\n4. 防毒マスクの着用徹底\n5. 体調異常時の退避手順を再教育',
        site_id: site3Id, work_type: '橋梁工事', severity: 'serious',
        occurred_at: '2026-01-20', reported_by: worker2Id
      },
      {
        title: '橋梁点検時の高所からの工具落下事故',
        description: '橋梁の定期点検作業中、高さ15mの足場上から打音検査用のハンマー（500g）を誤って落下させた。幸い落下地点に人はいなかったが、路面に損傷を与えた。',
        cause: '工具の落下防止ワイヤーを取り付けていなかった。作業帯の直下に防護ネットが未設置の区間があった。',
        countermeasure: '1. 全工具に落下防止ワイヤー取付けを義務化\n2. 工具バッグの使用徹底（腰ベルトに固定）\n3. 作業帯直下の防護ネット設置の徹底\n4. 第三者立入禁止区域の拡大\n5. 朝礼時に落下防止のKY活動を実施',
        site_id: site3Id, work_type: '橋梁工事', severity: 'moderate',
        occurred_at: '2026-01-08', reported_by: mgr2Id
      },
      {
        title: 'トンネル内酸素欠乏環境の検知遅れ',
        description: 'トンネル掘削現場で、換気設備の一時的な故障により坑内酸素濃度が17.8%まで低下。酸素濃度計のアラームで検知し、全員退避。傷病者なし。',
        cause: '換気設備のバックアップ体制が不十分。酸素濃度の連続モニタリング箇所が切羽付近のみで中間部にモニターがなかった。',
        countermeasure: '1. 換気設備の予備機を常設\n2. 酸素濃度計の設置箇所を増設（50m間隔）\n3. 中央監視室でのリアルタイム監視体制構築\n4. 酸素欠乏危険作業特別教育の再実施\n5. 緊急退避訓練を月1回実施',
        site_id: site2Id, work_type: 'トンネル工事', severity: 'serious',
        occurred_at: '2026-02-01', reported_by: mgr2Id
      },
      {
        title: '型枠解体時のコンクリート片落下事故',
        description: '壁型枠の解体作業中、硬化不十分なコンクリート端部（約2kg）が剥落し、下方の作業員のヘルメットに当たった。ヘルメット着用により負傷なし。',
        cause: '型枠解体時期の判断が不適切（コンクリート強度の確認不足）。解体作業範囲の直下に立入禁止措置を取っていなかった。',
        countermeasure: '1. 型枠解体前のコンクリート強度確認を義務化（テストハンマー/供試体）\n2. 解体作業中の直下立入禁止区域の設定\n3. 解体手順書の見直し（段階的な解体）\n4. ヘルメット着用の再徹底と衝撃吸収ライナーの確認',
        site_id: site1Id, work_type: 'コンクリート工事', severity: 'moderate',
        occurred_at: '2026-01-25', reported_by: worker1Id
      },
      {
        title: '橋梁ジャッキアップ作業中の変位異常',
        description: '支承交換のためのジャッキアップ作業中、計画値を超える横方向変位（8mm）が発生。直ちに作業を中断し、計測を強化した上で原因を調査。構造的な損傷はなし。',
        cause: 'ジャッキの設置位置が橋脚天端の中心からずれていた。橋梁の温度伸縮による影響を考慮した作業時間帯の設定が不十分だった。',
        countermeasure: '1. ジャッキ設置位置のマーキングと複数人での確認\n2. 温度伸縮を考慮した施工時間帯の設定（早朝を推奨）\n3. 変位計測の管理値を細分化（注意値・警戒値・中止値）\n4. リアルタイム変位監視システムの導入',
        site_id: site3Id, work_type: '橋梁工事', severity: 'serious',
        occurred_at: '2026-02-05', reported_by: expertId
      }
    ];

    for (const inc of incidents) {
      await client.query(
        `INSERT INTO incident_cases (title, description, cause, countermeasure, site_id, work_type, severity, occurred_at, reported_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [inc.title, inc.description, inc.cause, inc.countermeasure, inc.site_id, inc.work_type, inc.severity, inc.occurred_at, inc.reported_by]
      );
    }
    console.log('  事故事例5件 投入完了');

    // =====================================================
    // 4. 音声セッション例 (3件)
    // =====================================================
    console.log('音声セッション例を投入中...');

    // セッション1: 現場作業者が橋梁について質問
    const vs1 = await client.query(
      `INSERT INTO voice_sessions (user_id, mode, site_id, work_type, title, status, completed_at)
       VALUES ($1, 'field', $2, '橋梁工事', '橋梁塗り替え準備確認', 'completed', NOW()) RETURNING id`,
      [worker2Id, site3Id]
    );
    const vs1Messages = [
      { role: 'user', content: '明日から橋梁の塗り替え作業なんですが、準備物を教えてください', confidence: 0.92 },
      { role: 'assistant', content: '橋梁の塗り替え作業の準備物をお伝えします。\n\n**安全装備**: フルハーネス型安全帯、防毒マスク（有機溶剤用）、保護メガネ、防護手袋\n\n**工具・機材**: ケレン工具（ワイヤーブラシ、スクレーパー、ディスクサンダー）、塗装用具（ローラー、刷毛、エアレスガン）、膜厚計、温湿度計\n\n**材料**: プライマー、中塗り塗料、上塗り塗料（仕様書で確認）\n\n**確認事項**: 鉛含有塗料の有無を事前に確認してください。過去にこの橋梁は昭和50年代に塗装された記録がありますので、PCB含有調査も推奨します。\n\n塗り替え工事の施工前チェックリストもありますので、活用をお勧めします。' },
      { role: 'user', content: 'ケレンの種類はどう選べばいいですか', confidence: 0.88 },
      { role: 'assistant', content: '素地調整の種類選定は、既存塗膜の劣化状態によって決まります。\n\n- **1種ケレン（ブラスト）**: 塗膜全面除去が必要な場合。腐食が進行し、塗膜が完全に劣化している時\n- **2種ケレン**: 旧塗膜の大部分を除去。電動工具（ディスクサンダー等）使用\n- **3種ケレン**: 活膜（まだ健全な塗膜）を残し、劣化部のみ除去。通常の塗り替えはこれが多い\n- **4種ケレン**: 粉化物や汚れの除去のみ。塗膜の劣化が軽微な場合\n\n今回の橋梁は補修工事ですので、付着力試験の結果を確認の上、監督者と種別を決定してください。' },
    ];
    for (let i = 0; i < vs1Messages.length; i++) {
      await client.query(
        `INSERT INTO voice_session_messages (session_id, role, content, confidence, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [vs1.rows[0].id, vs1Messages[i].role, vs1Messages[i].content, vs1Messages[i].confidence || null, i]
      );
    }

    // セッション2: 緊急時の質問
    const vs2 = await client.query(
      `INSERT INTO voice_sessions (user_id, mode, site_id, work_type, title, status, completed_at)
       VALUES ($1, 'field', $2, '土工事', '地下水湧出対応', 'completed', NOW()) RETURNING id`,
      [worker1Id, site1Id]
    );
    const vs2Messages = [
      { role: 'user', content: '掘削中に地下水が出てきました。どうすればいいですか', confidence: 0.95 },
      { role: 'assistant', content: 'まず作業を一旦停止してください。安全確認が最優先です。\n\n**確認事項**:\n1. 水量はどの程度ですか？（じわじわ湧出 or 噴出）\n2. 水の色は？（濁り具合で土砂流出の有無を判断）\n3. 法面の変状はありませんか？\n\n**過去の類似事例**: 横浜トンネル工事で切羽湧水の事例があります。\n\n監督者への報告はお済みですか？' },
      { role: 'user', content: 'じわじわ湧き出してる感じです。量はそこまで多くないです', confidence: 0.90 },
      { role: 'assistant', content: '了解しました。湧水量が少なければ釜場排水で対応できます。\n\n**対応手順**:\n1. 掘削底面の隅に50cm角程度の集水桝を設ける\n2. 水中ポンプで排水\n3. 排水先の確認と濁水処理の準備\n4. 法面の状態を定期的に確認\n\n**注意点**: 地盤の緩みに注意してください。排水により周辺地盤が緩む可能性があります。\n\n念のため、監督者の山田現場長にも報告をお願いします。' },
    ];
    for (let i = 0; i < vs2Messages.length; i++) {
      await client.query(
        `INSERT INTO voice_session_messages (session_id, role, content, confidence, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [vs2.rows[0].id, vs2Messages[i].role, vs2Messages[i].content, vs2Messages[i].confidence || null, i]
      );
    }

    // セッション3: オフィスモードでの技術相談
    const vs3 = await client.query(
      `INSERT INTO voice_sessions (user_id, mode, site_id, work_type, title, status, completed_at)
       VALUES ($1, 'office', $2, '橋梁工事', '支承交換の計画検討', 'completed', NOW()) RETURNING id`,
      [mgr2Id, site3Id]
    );
    const vs3Messages = [
      { role: 'user', content: '来月から橋梁の支承交換を予定しているんですが、計画で注意すべきポイントを教えてください', confidence: 0.93 },
      { role: 'assistant', content: '支承交換計画の主要な注意点をお伝えします。\n\n**1. ジャッキアップ計画**\n- 橋脚天端の耐力確認（ジャッキ反力に耐えられるか）\n- 段階的なジャッキアップ（5mm刻みを推奨）\n- 桁の変位・ひずみのリアルタイム計測\n\n**2. 温度伸縮の考慮**\n- 施工時間帯は気温変化の少ない早朝を推奨\n- 遊間量の温度補正\n\n**3. 交通規制**\n- 規制計画の事前協議（道路管理者）\n- 夜間規制の検討\n\n**4. 過去の注意事例**\n- 先日このサイトでジャッキアップ中に横方向変位8mmの異常が発生した事例があります。設置位置の正確なマーキングが重要です。\n\n支承交換の詳細手順はナレッジベースに登録されていますので、ご確認ください。' },
      { role: 'user', content: '最大ジャッキアップ量はどのくらいに設定すればいいですか', confidence: 0.91 },
      { role: 'assistant', content: '最大ジャッキアップ量は通常10～30mm程度です。\n\n**設定の考え方**:\n- 既存支承の高さ＋施工余裕（通常5～10mm）\n- 橋梁の構造形式により異なる（連続桁は隣接径間への影響を考慮）\n\n**管理基準**:\n- 計画値の±2mm以内で管理\n- 注意値: 計画値の80%到達時に計測頻度を上げる\n- 警戒値: 計画値到達時に一旦停止して確認\n- 中止値: 計画値の110%に達した場合は即時中止\n\n構造計算書をベースに設計担当者と最終決定することをお勧めします。' },
    ];
    for (let i = 0; i < vs3Messages.length; i++) {
      await client.query(
        `INSERT INTO voice_session_messages (session_id, role, content, confidence, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [vs3.rows[0].id, vs3Messages[i].role, vs3Messages[i].content, vs3Messages[i].confidence || null, i]
      );
    }
    console.log('  音声セッション3件 投入完了');

    // =====================================================
    // 5. チェックリスト実行記録 (3件)
    // =====================================================
    console.log('チェックリスト実行記録を投入中...');

    // cl2(橋梁塗り替え)の実行記録
    const exec1 = await client.query(
      `INSERT INTO checklist_executions (checklist_id, user_id, site_id, total_items, checked_items, status, notes)
       VALUES ($1, $2, $3, 10, 10, 'completed', '全項目確認完了。PCB含有なし確認済み。') RETURNING id`,
      [cl2.rows[0].id, worker2Id, site3Id]
    );
    const exec1Items = await client.query(
      'SELECT id, content, priority FROM checklist_items WHERE checklist_id = $1 ORDER BY order_index',
      [cl2.rows[0].id]
    );
    for (const item of exec1Items.rows) {
      await client.query(
        `INSERT INTO checklist_execution_items (execution_id, checklist_item_id, item_content, is_required, checked, note)
         VALUES ($1, $2, $3, $4, true, $5)`,
        [exec1.rows[0].id, item.id, item.content, item.priority === 'required', item.priority === 'required' ? '確認OK' : null]
      );
    }

    // cl4(高所作業)の実行記録
    const exec2 = await client.query(
      `INSERT INTO checklist_executions (checklist_id, user_id, site_id, total_items, checked_items, status, notes)
       VALUES ($1, $2, $3, 8, 7, 'completed', '風速8m/sのため注意しながら作業実施。') RETURNING id`,
      [cl4.rows[0].id, worker1Id, site1Id]
    );
    const exec2Items = await client.query(
      'SELECT id, content, priority FROM checklist_items WHERE checklist_id = $1 ORDER BY order_index',
      [cl4.rows[0].id]
    );
    for (let i = 0; i < exec2Items.rows.length; i++) {
      const item = exec2Items.rows[i];
      await client.query(
        `INSERT INTO checklist_execution_items (execution_id, checklist_item_id, item_content, is_required, checked, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [exec2.rows[0].id, item.id, item.content, item.priority === 'required', i < 7, i === 6 ? '防護ネット一部未設置→追加手配中' : null]
      );
    }
    console.log('  チェックリスト実行記録2件 投入完了');

    // =====================================================
    // 6. 利用ログ (サンプル)
    // =====================================================
    console.log('利用ログを投入中...');

    const logEntries = [
      { user_id: worker1Id, knowledge_id: knowledgeIds[3], action_type: 'view', site_id: site1Id, work_type: '橋梁工事' },
      { user_id: worker1Id, knowledge_id: knowledgeIds[3], action_type: 'useful_mark', site_id: site1Id, work_type: '橋梁工事' },
      { user_id: worker2Id, knowledge_id: knowledgeIds[0], action_type: 'view', site_id: site3Id, work_type: '橋梁工事' },
      { user_id: worker2Id, knowledge_id: knowledgeIds[4], action_type: 'view', site_id: site3Id, work_type: '橋梁工事' },
      { user_id: worker2Id, knowledge_id: knowledgeIds[0], action_type: 'useful_mark', site_id: site3Id, work_type: '橋梁工事' },
      { user_id: mgr2Id, knowledge_id: knowledgeIds[5], action_type: 'view', site_id: site3Id, work_type: '橋梁工事' },
      { user_id: expertId, action_type: 'search', site_id: null, work_type: null, search_query: '橋梁 耐震補強' },
      { user_id: worker1Id, action_type: 'voice_query', site_id: site1Id, work_type: '土工事', search_query: '地下水が出てきた' },
      { user_id: worker2Id, action_type: 'voice_query', site_id: site3Id, work_type: '橋梁工事', search_query: '橋梁の塗り替え準備' },
      { user_id: mgr1Id, action_type: 'search', site_id: null, work_type: null, search_query: '高所作業 安全管理' },
      { user_id: worker2Id, knowledge_id: knowledgeIds[6], action_type: 'view', site_id: site3Id, work_type: '橋梁工事' },
      { user_id: worker2Id, action_type: 'checklist_use', site_id: site3Id, work_type: '橋梁工事' },
      { user_id: worker1Id, action_type: 'checklist_use', site_id: site1Id, work_type: '共通' },
      { user_id: mgr2Id, knowledge_id: knowledgeIds[2], action_type: 'view', site_id: site3Id, work_type: '橋梁工事' },
      { user_id: mgr2Id, knowledge_id: knowledgeIds[7], action_type: 'view', site_id: site3Id, work_type: '橋梁工事' },
    ];

    for (const log of logEntries) {
      await client.query(
        `INSERT INTO usage_logs (user_id, knowledge_id, action_type, context_site_id, context_work_type, search_query)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [log.user_id, log.knowledge_id || null, log.action_type, log.site_id, log.work_type, log.search_query || null]
      );
    }
    console.log(`  利用ログ${logEntries.length}件 投入完了`);

    await client.query('COMMIT');
    console.log('\n=== 追加シードデータ投入完了 ===');
    console.log('投入内容:');
    console.log('  - 橋梁工事ナレッジ: 10件');
    console.log('  - チェックリスト: 3件（橋梁塗替え/コンクリート品質/高所作業安全）');
    console.log('  - 事故事例: 5件');
    console.log('  - 音声セッション: 3件（会話履歴付き）');
    console.log('  - チェックリスト実行記録: 2件');
    console.log('  - 利用ログ: 15件');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('シード失敗:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedExtra();
