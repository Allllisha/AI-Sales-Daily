// データベース接続設定
process.env.DB_PORT = process.env.DB_PORT || '5433';
const pool = require('./pool');

const scriptTemplates = [
  {
    name: '初回訪問テンプレート',
    sales_stage: '初回訪問',
    customer_type: 'new',
    industry: null,
    template_content: {
      opening: {
        main: "はじめまして。本日はお忙しい中、お時間をいただきありがとうございます。{{customer}}様の事業について、まずはお聞かせいただければと思います。",
        alternatives: [
          "初めてお伺いさせていただきます。本日はよろしくお願いいたします。",
          "お時間をいただきありがとうございます。御社のお役に立てることがないか、まずはお話を伺わせてください。"
        ],
        key_points: [
          "第一印象を大切に、信頼関係の構築を重視",
          "会社紹介は簡潔に、顧客の話を聞く姿勢を示す",
          "オープンクエスチョンで幅広く情報収集"
        ]
      },
      needs_discovery: {
        questions: [
          "御社の事業内容について、改めてお聞かせいただけますでしょうか？",
          "現在、どのような課題や目標をお持ちでしょうか？",
          "競合他社と比較して、差別化されている点はどちらになりますか？",
          "今後の事業展開について、どのようなビジョンをお持ちですか？",
          "現在お使いのシステムやサービスで、改善したい点はございますか？"
        ],
        response_patterns: {
          "課題が不明確": "なるほど、様々な観点があるかと思いますが、特に優先度が高いものはどちらになりますか？",
          "決裁プロセス確認": "このような導入案件の場合、通常どのような流れで検討されることが多いですか？",
          "予算感の探り": "参考までに、このような投資はどの程度の規模感をイメージされていますか？"
        }
      },
      value_proposition: {
        main_benefits: [
          "業務効率化により、月間作業時間を大幅削減",
          "データの一元管理による意思決定の迅速化",
          "コスト削減と品質向上の両立"
        ],
        proof_points: [
          "同業界での導入実績多数",
          "平均的な投資回収期間は1.5年",
          "導入企業の95%が効果を実感"
        ],
        differentiators: [
          "業界特化型のソリューション",
          "充実したサポート体制",
          "柔軟なカスタマイズ対応"
        ]
      },
      objection_handling: {
        "予算が不明": "ご予算については、導入効果とのバランスを見ながら最適なプランをご提案させていただきます。",
        "時期が未定": "導入時期については、御社のスケジュールに合わせて柔軟に対応いたします。",
        "決裁者不在": "決裁に必要な情報は全てご用意しますので、適切なタイミングでご紹介いただければと思います。"
      },
      closing: {
        trial_close: "本日のお話で、弊社がお役に立てそうな部分はございましたでしょうか？",
        next_action: "次回、より詳細なご提案をさせていただく機会をいただけますでしょうか？",
        commitment: "まずは資料をお送りさせていただいてもよろしいでしょうか？",
        follow_up: "来週、改めてご連絡させていただきます。"
      }
    }
  },
  {
    name: 'フォローアップテンプレート',
    sales_stage: 'フォローアップ',
    customer_type: 'existing',
    industry: null,
    template_content: {
      opening: {
        main: "お忙しい中、お時間をいただきありがとうございます。前回{{customer}}様でお話しいただいた{{project}}の件について、{{nextAction}}を確認させていただければと思います。",
        alternatives: [
          "本日はありがとうございます。前回お伺いした{{issues}}について、その後いかがでしょうか。",
          "先日は貴重なお話をありがとうございました。{{project}}について進捗を確認させてください。"
        ],
        key_points: [
          "前回の内容との継続性",
          "進展状況の確認",
          "次のステップへの誘導"
        ]
      },
      needs_discovery: {
        questions: [
          "前回お伺いした{{issues}}について、その後何か進展はございましたか？",
          "{{project}}に関して現状で一番優先的に解決したい点はどちらでしょうか？",
          "理想的には、いつ頃までにこの課題を解決したいとお考えですか？",
          "予算についてはどの程度をお考えでしょうか？",
          "導入にあたって、社内でクリアすべき条件などはございますか？"
        ],
        response_patterns: {
          "予算不明時": "参考までに、同規模の企業様では〇〇万円程度でご導入いただいています。御社のご予算感はいかがでしょうか？",
          "決裁者不明時": "ちなみに、このような案件の最終的なご判断は、どちらの部署・どなたがされることが多いですか？",
          "競合確認": "他にも比較検討されているサービスはございますか？差し支えなければお教えいただけますと、より御社に合ったご提案ができます。"
        }
      },
      value_proposition: {
        main_benefits: [
          "導入により月間の業務時間を30%削減できます",
          "ミスや手戻りが減ることで、品質が向上します",
          "データの一元管理により、意思決定スピードが向上します"
        ],
        proof_points: [
          "同業界で既に50社以上の導入実績があります",
          "平均的な投資回収期間は1.5年です",
          "導入企業の95%が効果を実感しています"
        ],
        differentiators: [
          "業界特化型なので、カスタマイズが最小限で済みます",
          "専任のカスタマーサクセスチームが導入から運用まで支援します",
          "24時間365日のサポート体制を整えています"
        ]
      },
      objection_handling: {
        "価格が高い": "確かに初期投資は必要ですが、削減できるコストを考えると1.5年で回収可能です。また、分割払いもご用意しています。",
        "時期尚早": "確かに慎重にご検討いただくことも大切ですが、競合他社が既に導入を始めています。早期導入により競争優位性を確保できます。",
        "他社検討中": "ぜひ比較検討していただければと思います。弊社の強みは〇〇でして、特に御社の課題に対しては最適なソリューションだと考えています。",
        "社内調整が必要": "承知いたしました。社内説明用の資料をご用意させていただきます。必要であれば、私から直接ご説明させていただくことも可能です。"
      },
      closing: {
        trial_close: "ここまでのお話で、弊社のサービスが御社の課題解決に貢献できそうでしょうか？",
        next_action: "次回、技術担当も同席させていただき、より詳細なデモをご覧いただければと思いますが、いかがでしょうか？",
        commitment: "まずは2週間の無料トライアルから始めていただくことも可能ですが、ご興味はございますか？",
        follow_up: "本日の資料をメールでお送りさせていただきます。来週の水曜日頃に、改めてご連絡させていただいてもよろしいでしょうか？"
      }
    }
  },
  {
    name: '提案テンプレート',
    sales_stage: '提案',
    customer_type: 'existing',
    industry: null,
    template_content: {
      opening: {
        main: "お忙しい中、お時間をいただきありがとうございます。前回{{customer}}様でお伺いした{{issues}}の解決に向けて、具体的なご提案をお持ちしました。",
        alternatives: [
          "本日は、{{project}}について、詳細なプランをご説明させていただきます。",
          "前回のお話を踏まえて、最適なソリューションをご用意させていただきました。"
        ],
        key_points: [
          "提案の全体像を最初に示す",
          "期待値の設定と本日のゴールの明確化",
          "前回の課題との紐付けを明確に"
        ]
      },
      needs_discovery: {
        questions: [
          "ご提案の前に、前回から何か状況の変化はございましたか？",
          "優先的に解決したい課題の順位に変更はございませんか？",
          "導入時期について、具体的なご希望はございますか？"
        ],
        response_patterns: {
          "詳細確認": "その点について、もう少し詳しくお聞かせいただけますか？",
          "懸念事項": "ご心配な点について、詳しくご説明させていただきます。"
        }
      },
      value_proposition: {
        main_benefits: [
          "{{issues}}を解決し、業務効率を大幅改善",
          "投資対効果は導入後1年以内に実現",
          "段階的な導入により、リスクを最小化"
        ],
        proof_points: [
          "類似案件での成功事例多数",
          "綿密な導入計画とサポート体制",
          "柔軟な料金プランをご用意"
        ],
        differentiators: [
          "{{customer}}様の業界に特化した機能",
          "既存システムとのスムーズな連携",
          "導入後の手厚いフォロー体制"
        ]
      },
      objection_handling: {
        "予算超過": "ご予算に合わせて、段階的な導入プランもご提案可能です。",
        "機能過多": "必要な機能から順次導入し、徐々に拡張していくことも可能です。",
        "導入負荷": "専任チームが全面的にサポートし、御社の負担を最小限にします。"
      },
      closing: {
        trial_close: "ご提案内容について、御社のニーズに合致していますでしょうか？",
        next_action: "社内でご検討いただき、次回詳細を詰めさせていただければと思います。",
        commitment: "導入に向けて、具体的なスケジュールを決めていきましょう。",
        follow_up: "ご検討に必要な追加資料があれば、すぐにご用意いたします。"
      }
    }
  },
  {
    name: '価格交渉テンプレート',
    sales_stage: '価格交渉',
    customer_type: 'existing',
    industry: null,
    template_content: {
      opening: {
        main: "本日は価格についてのご相談ということで、お時間をいただきありがとうございます。まず、弊社ソリューションの価値について改めて確認させてください。",
        alternatives: [
          "価格のご相談ですね。投資対効果を含めて、詳しくご説明させていただきます。",
          "ご予算のご相談、承知いたしました。Win-Winの条件を一緒に探らせていただければと思います。"
        ],
        key_points: [
          "価値の再確認から開始",
          "相手の立場への理解を示す",
          "柔軟な姿勢をアピール"
        ]
      },
      needs_discovery: {
        questions: [
          "ご予算の制約について、もう少し詳しくお聞かせいただけますか？",
          "投資対効果として、どの程度の期間での回収をお考えでしょうか？",
          "他社様のご提案と比較して、どのような点を重視されていますか？"
        ],
        response_patterns: {
          "予算制約": "ご予算に合わせた最適なプランを一緒に考えさせてください。",
          "比較検討": "価格だけでなく、トータルの価値でご判断いただければ幸いです。"
        }
      },
      value_proposition: {
        main_benefits: [
          "初期投資は必要ですが、長期的なコスト削減効果",
          "他社にはない充実したサポート体制",
          "段階的な支払いオプション"
        ],
        proof_points: [
          "ROI実績データの提示",
          "コスト削減の具体例",
          "長期契約による割引メリット"
        ],
        differentiators: [
          "価格に含まれる充実したサービス",
          "隠れたコストが一切ない透明性",
          "柔軟な契約条件"
        ]
      },
      objection_handling: {
        "予算オーバー": "分割払いや、段階導入により初期費用を抑えることが可能です。",
        "費用対効果": "具体的な削減効果をシミュレーションでお示しします。",
        "承認が得られない": "決裁者様向けの説明資料をご用意させていただきます。"
      },
      closing: {
        trial_close: "この条件であれば、前向きにご検討いただけそうでしょうか？",
        next_action: "特別価格での見積書を作成させていただきます。",
        commitment: "本日中に社内調整し、最終提案をさせていただきます。",
        follow_up: "明日、最終的な条件をご提示させていただきます。"
      }
    }
  },
  {
    name: 'クロージングテンプレート',
    sales_stage: 'クロージング',
    customer_type: 'existing',
    industry: null,
    template_content: {
      opening: {
        main: "本日は最終的なご判断をいただく機会をいただき、ありがとうございます。{{project}}についてこれまでの内容を整理させていただきます。",
        alternatives: [
          "いよいよ決定の段階ですね。最終確認をさせていただければと思います。",
          "ご検討いただきありがとうございます。本日、前向きなお返事をいただければ幸いです。"
        ],
        key_points: [
          "決断を促す雰囲気作り",
          "これまでの合意事項の確認",
          "残る懸念の完全解消"
        ]
      },
      needs_discovery: {
        questions: [
          "ご検討いただく中で、まだ不明な点はございますか？",
          "導入にあたって、最後に確認したい点はございますか？",
          "社内での合意形成について、何かサポートが必要でしょうか？"
        ],
        response_patterns: {
          "最終懸念": "その点は重要ですね。具体的にどのような対応をご希望でしょうか？",
          "条件交渉": "ご要望を踏まえて、どのような条件であれば前に進められそうでしょうか？"
        }
      },
      value_proposition: {
        main_benefits: [
          "導入決定により、すぐに改善活動を開始",
          "早期導入による競争優位性の確保",
          "充実したオンボーディングプログラム"
        ],
        proof_points: [
          "導入企業の成功事例",
          "万全のサポート体制",
          "リスクフリーの導入保証"
        ],
        differentiators: [
          "今なら特別条件での提供",
          "専任チームによる手厚いサポート",
          "成功までの明確なロードマップ"
        ]
      },
      objection_handling: {
        "まだ迷っている": "どのような点でご不安を感じていらっしゃいますか？一緒に解決しましょう。",
        "タイミング": "早期導入のメリットを改めてご説明させてください。",
        "リスク": "導入保証制度により、リスクを最小限に抑えられます。"
      },
      closing: {
        trial_close: "本日ご契約いただければ、来週から導入を開始できます。",
        next_action: "契約書をご用意しておりますので、ご確認いただけますでしょうか。",
        commitment: "それでは、本日付けでご契約ということでよろしいでしょうか。",
        follow_up: "ご契約ありがとうございます。導入に向けて全力でサポートさせていただきます。"
      }
    }
  },
  {
    name: 'アフターフォローテンプレート',
    sales_stage: 'アフターフォロー',
    customer_type: 'existing',
    industry: null,
    template_content: {
      opening: {
        main: "ご導入いただいてから{{customer}}様でどのような状況か、確認させていただきたくお伺いしました。",
        alternatives: [
          "その後、ご活用状況はいかがでしょうか？",
          "導入後のフォローアップにお伺いさせていただきました。"
        ],
        key_points: [
          "感謝の気持ちを表現",
          "利用状況の確認",
          "追加ニーズの発掘"
        ]
      },
      needs_discovery: {
        questions: [
          "実際にご利用いただいて、いかがでしょうか？",
          "当初の課題は解決されましたでしょうか？",
          "新たにお困りの点や、追加でご要望はございませんか？",
          "他部署への展開などはご検討されていますか？"
        ],
        response_patterns: {
          "満足": "ありがとうございます。更なる活用方法もご提案させていただきます。",
          "不満": "申し訳ございません。すぐに改善策を検討させていただきます。",
          "追加要望": "承知いたしました。詳しくお聞かせください。"
        }
      },
      value_proposition: {
        main_benefits: [
          "更なる活用による効果最大化",
          "新機能のご紹介",
          "アップグレードプランのメリット"
        ],
        proof_points: [
          "他社様での活用事例",
          "追加導入による相乗効果",
          "継続利用による特別価格"
        ],
        differentiators: [
          "既存環境との親和性",
          "追加導入の容易さ",
          "継続的なサポート体制"
        ]
      },
      objection_handling: {
        "追加予算なし": "現在のプラン内でできる改善もご提案します。",
        "現状満足": "将来的な拡張の可能性について、情報提供させてください。",
        "他社検討": "現在のシステムとの連携メリットをご説明します。"
      },
      closing: {
        trial_close: "追加機能について、詳しいご説明の機会をいただけますか？",
        next_action: "活用度向上のための勉強会を開催させていただけますか？",
        commitment: "定期的なフォローアップを継続させていただいてよろしいでしょうか？",
        follow_up: "また3ヶ月後に状況確認させていただきます。"
      }
    }
  }
];

async function seedTemplates() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 既存のテンプレートをクリア（オプション）
    // await client.query('DELETE FROM script_templates WHERE created_by IS NULL');
    
    for (const template of scriptTemplates) {
      const query = `
        INSERT INTO script_templates (
          name, sales_stage, customer_type, industry,
          template_sections, is_public, usage_count, avg_success_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ON CONSTRAINT script_templates_pkey
        DO UPDATE SET
          template_sections = EXCLUDED.template_sections,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await client.query(query, [
        template.name,
        template.sales_stage,
        template.customer_type,
        template.industry,
        JSON.stringify(template.template_content),
        true,  // is_public
        0,     // usage_count
        null   // avg_success_rate
      ]);
      
      console.log(`✓ Inserted template: ${template.name}`);
    }
    
    await client.query('COMMIT');
    console.log('\n✅ All templates seeded successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding templates:', error);
    throw error;
  } finally {
    client.release();
  }
}

// スクリプトを直接実行
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedTemplates;