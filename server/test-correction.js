// 訂正検出機能のテストコード
require('dotenv').config();
const realtimeAI = require('./src/services/realtimeAI');

async function testCorrection() {
  console.log('=== 訂正検出機能のテスト開始 ===\n');

  // テストケース1: 通常の情報入力
  console.log('ケース1: 通常の情報入力');
  let slots = {};
  
  slots = await realtimeAI.extractSlots(
    "ABC建設と新規プロジェクトの打ち合わせでした。次は電話を作成する予定です。",
    slots
  );
  console.log('結果:', JSON.stringify(slots, null, 2));
  console.log('');

  // テストケース2: 訂正パターン「ではなく」
  console.log('ケース2: 訂正パターン「ではなく」');
  slots = await realtimeAI.extractSlots(
    "すみません、電話ではなくロゴを作成する予定です。",
    slots
  );
  console.log('結果:', JSON.stringify(slots, null, 2));
  console.log('');

  // テストケース3: 訂正パターン「間違えました」
  console.log('ケース3: 訂正パターン「間違えました」');
  slots = await realtimeAI.extractSlots(
    "間違えました、顧客はABC建設ではなくXYZ工業です。",
    slots
  );
  console.log('結果:', JSON.stringify(slots, null, 2));
  console.log('');

  // テストケース4: 複数の訂正
  console.log('ケース4: 複数の訂正');
  slots = await realtimeAI.extractSlots(
    "訂正します。予算は1000万円ではなく1500万円で、納期は3月末ではなく4月末です。",
    slots
  );
  console.log('結果:', JSON.stringify(slots, null, 2));
  console.log('');

  // テストケース5: 情報の追加（訂正ではない）
  console.log('ケース5: 情報の追加（訂正ではない）');
  slots = await realtimeAI.extractSlots(
    "参加者は田中部長と営業の山田さんでした。場所は東京本社の会議室です。",
    slots
  );
  console.log('最終結果:', JSON.stringify(slots, null, 2));

  console.log('\n=== テスト完了 ===');
}

// テスト実行
testCorrection().catch(console.error);