// フィードバック処理機能
// ユーザーの修正要求を解析してホーム画面を更新

export class FeedbackProcessor {
    /**
     * フィードバックを処理してAIコンテンツを更新
     * @param {string} feedbackText - フィードバックテキスト
     * @param {Object} currentAiContent - 現在のAIコンテンツ
     * @returns {Object} 更新されたAIコンテンツ
     */
    static processFeedback(feedbackText, currentAiContent) {
        // 既存のアクションを取得
        const existingActions = currentAiContent.actions;
        console.log('既存のアクション:', existingActions);

        // 削除要求をチェック
        const removeRequests = FeedbackProcessor.extractRemoveRequests(feedbackText);
        console.log('削除要求:', removeRequests);

        let filteredActions = existingActions.filter(action =>
            !removeRequests.some(remove =>
                action.title.toLowerCase().includes(remove.toLowerCase()) ||
                action.description.toLowerCase().includes(remove.toLowerCase())
            )
        );

        console.log('削除後のアクション:', filteredActions);

        // 追加要求を処理
        const addRequests = FeedbackProcessor.extractAddRequests(feedbackText);
        console.log('追加要求:', addRequests);

        if (addRequests.length > 0) {
            const newActions = FeedbackProcessor.generateAdditionalActions(addRequests);
            console.log('新しく追加されるアクション:', newActions);
            filteredActions = [...filteredActions, ...newActions];
        }

        // 重複を除去
        const uniqueActions = [];
        const seenTitles = new Set();

        for (const action of filteredActions) {
            if (!seenTitles.has(action.title)) {
                seenTitles.add(action.title);
                uniqueActions.push(action);
            }
        }

        console.log('重複除去後のアクション:', uniqueActions);

        // 既存のAIコンテンツを保持しつつ、アクションのみ更新
        return {
            title: currentAiContent.title,
            content: currentAiContent.content,
            actions: uniqueActions
        };
    }

    /**
     * 削除要求を抽出
     * @param {string} feedbackText - フィードバックテキスト
     * @returns {Array<string>} 削除対象のキーワード
     */
    static extractRemoveRequests(feedbackText) {
        const removeKeywords = ['削除', '削って', '取り除いて', '不要', 'いらない', '消して', '削る', '除去'];
        const words = feedbackText.split(/[、。\s]+/);
        const removeRequests = [];

        for (const word of words) {
            if (removeKeywords.some(keyword => word.includes(keyword))) {
                // 削除キーワードの前後の単語も含める
                const wordIndex = words.indexOf(word);
                if (wordIndex > 0) {
                    removeRequests.push(words[wordIndex - 1]);
                }
                if (wordIndex < words.length - 1) {
                    removeRequests.push(words[wordIndex + 1]);
                }
                removeRequests.push(word);
            }
        }

        return removeRequests.filter((word, index, arr) => arr.indexOf(word) === index);
    }

    /**
     * 追加要求を抽出
     * @param {string} feedbackText - フィードバックテキスト
     * @returns {Array<string>} 追加対象のキーワード
     */
    static extractAddRequests(feedbackText) {
        const addKeywords = ['追加', '加えて', '入れて', '含めて', '増やして', '追加して', '入れる', '加える'];
        const words = feedbackText.split(/[、。\s]+/);
        const addRequests = [];

        for (const word of words) {
            if (addKeywords.some(keyword => word.includes(keyword))) {
                // 追加キーワードの前後の単語も含める
                const wordIndex = words.indexOf(word);
                if (wordIndex > 0) {
                    addRequests.push(words[wordIndex - 1]);
                }
                if (wordIndex < words.length - 1) {
                    addRequests.push(words[wordIndex + 1]);
                }
                addRequests.push(word);
            }
        }

        return addRequests.filter((word, index, arr) => arr.indexOf(word) === index);
    }

    /**
     * キーワードから追加アクションを生成
     * @param {Array<string>} requests - 追加要求キーワード
     * @returns {Array<Object>} 追加するアクション配列
     */
    static generateAdditionalActions(requests) {
        const additionalActions = [];

        for (const request of requests) {
            console.log('追加要求を処理中:', request);

            if (request.includes('Google') || request.includes('グーグル')) {
                if (request.includes('Docs') || request.includes('ドキュメント') || request.includes('文書')) {
                    additionalActions.push({
                        title: 'Google Docs',
                        description: '文書作成',
                        url: 'https://docs.google.com',
                        icon: '📄'
                    });
                } else if (request.includes('Slides') || request.includes('プレゼン') || request.includes('スライド')) {
                    additionalActions.push({
                        title: 'Google Slides',
                        description: 'プレゼンテーション',
                        url: 'https://slides.google.com',
                        icon: '📊'
                    });
                } else if (request.includes('Sheets') || request.includes('スプレッド') || request.includes('表計算')) {
                    additionalActions.push({
                        title: 'Google Sheets',
                        description: 'スプレッドシート',
                        url: 'https://sheets.google.com',
                        icon: '📈'
                    });
                } else if (request.includes('Drive') || request.includes('ドライブ')) {
                    additionalActions.push({
                        title: 'Google Drive',
                        description: 'ファイル管理',
                        url: 'https://drive.google.com',
                        icon: '💾'
                    });
                }
            } else if (request.includes('GitHub') || request.includes('ギットハブ')) {
                additionalActions.push({
                    title: 'GitHub',
                    description: 'コード管理',
                    url: 'https://github.com',
                    icon: '🐙'
                });
            } else if (request.includes('Slack') || request.includes('スラック')) {
                additionalActions.push({
                    title: 'Slack',
                    description: 'チームコミュニケーション',
                    url: 'https://slack.com',
                    icon: '💬'
                });
            } else if (request.includes('ChatGPT') || request.includes('チャットGPT')) {
                additionalActions.push({
                    title: 'ChatGPT',
                    description: 'AI対話',
                    url: 'https://chat.openai.com',
                    icon: '🤖'
                });
            } else if (request.includes('Notion') || request.includes('ノーション')) {
                additionalActions.push({
                    title: 'Notion',
                    description: 'ドキュメント管理',
                    url: 'https://notion.so',
                    icon: '📝'
                });
            }
        }

        return additionalActions;
    }
}
