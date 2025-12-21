// モックAIレスポンス生成（APIフォールバック用）

export class MockResponseGenerator {
    /**
     * ワークフローテキストに基づいてモックAI応答を生成
     * @param {string} workflowText - ワークフローテキスト
     * @returns {Object} モックAI応答 {title, content, actions}
     */
    static generate(workflowText) {
        const responses = {
            '研究': {
                title: '研究作業のサポート',
                content: `
                    <h3>研究計画書の作成をサポートします</h3>
                    <p>以下のステップで効率的に進めましょう：</p>
                    <ul>
                        <li>関連文献の調査と整理</li>
                        <li>研究手法の検討</li>
                        <li>データ収集計画の策定</li>
                        <li>分析手法の決定</li>
                    </ul>
                `,
                actions: CONFIG.DEFAULT_ACTIONS.研究
            },
            '出張': {
                title: '出張準備のサポート',
                content: `
                    <h3>出張の準備を効率的に進めましょう</h3>
                    <p>必要な手配を順番に行います：</p>
                    <ul>
                        <li>航空券の予約</li>
                        <li>ホテルの予約</li>
                        <li>交通手段の確認</li>
                        <li>必要書類の準備</li>
                    </ul>
                `,
                actions: CONFIG.DEFAULT_ACTIONS.出張
            },
            'プログラミング': {
                title: 'プログラミング学習・開発サポート',
                content: `
                    <h3>プログラミング学習と開発を効率化します</h3>
                    <p>以下のステップで進めましょう：</p>
                    <ul>
                        <li>学習計画の策定</li>
                        <li>コードの実践・実験</li>
                        <li>プロジェクトの管理</li>
                        <li>コミュニティでの共有</li>
                    </ul>
                `,
                actions: CONFIG.DEFAULT_ACTIONS.プログラミング
            },
            '学習': {
                title: '学習・スキルアップサポート',
                content: `
                    <h3>効率的な学習をサポートします</h3>
                    <p>以下の方法で学習を進めましょう：</p>
                    <ul>
                        <li>オンライン講座の受講</li>
                        <li>動画での学習</li>
                        <li>ノートの整理・復習</li>
                        <li>実践的な演習</li>
                    </ul>
                `,
                actions: CONFIG.DEFAULT_ACTIONS.学習
            },
            'ビジネス': {
                title: 'ビジネス活動サポート',
                content: `
                    <h3>ビジネス活動を効率化します</h3>
                    <p>以下のツールを活用しましょう：</p>
                    <ul>
                        <li>ネットワーキング</li>
                        <li>チームコミュニケーション</li>
                        <li>プロジェクト管理</li>
                        <li>オンライン会議</li>
                    </ul>
                `,
                actions: CONFIG.DEFAULT_ACTIONS.ビジネス
            },
            'default': {
                title: '作業のサポート',
                content: `
                    <h3>効率的な作業をサポートします</h3>
                    <p>目的に応じたツールをご提案します。</p>
                `,
                actions: CONFIG.DEFAULT_ACTIONS.default
            }
        };

        // ワークフローの内容に基づいて適切なレスポンスを選択
        let response = responses.default;

        if (workflowText.includes('研究') || workflowText.includes('論文') || workflowText.includes('文献')) {
            response = responses.研究;
        } else if (workflowText.includes('出張') || workflowText.includes('旅行') || workflowText.includes('航空券')) {
            response = responses.出張;
        } else if (workflowText.includes('プログラミング') || workflowText.includes('コーディング') || workflowText.includes('開発') || workflowText.includes('GitHub')) {
            response = responses.プログラミング;
        } else if (workflowText.includes('学習') || workflowText.includes('勉強') || workflowText.includes('講座') || workflowText.includes('スキル')) {
            response = responses.学習;
        } else if (workflowText.includes('ビジネス') || workflowText.includes('仕事') || workflowText.includes('会議') || workflowText.includes('プロジェクト')) {
            response = responses.ビジネス;
        }

        return response;
    }
}
