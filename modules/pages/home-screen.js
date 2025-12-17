// ホーム画面の表示・更新

export class HomeScreen {
    /**
     * ホーム画面を更新
     * @param {Object} workflow - ワークフロー情報
     * @param {Function} onActionRemove - アクション削除時のコールバック
     * @param {Function} onClarificationSubmit - 質問回答送信時のコールバック
     */
    static async update(workflow, onActionRemove, onClarificationSubmit = null) {
        if (!workflow || !workflow.aiContent) return;

        // タイトルを更新
        document.getElementById('current-workflow-title').textContent = workflow.aiContent.title;

        // AI生成コンテンツを更新
        const aiContent = document.getElementById('ai-generated-content');

        // 質問がある場合は質問表示
        if (workflow.aiContent.clarificationQuestion) {
            aiContent.style.display = 'block';
            aiContent.style.padding = '20px 30px'; // 高さを減らすためにpaddingを調整
            aiContent.innerHTML = `
                <div class="clarification-box">
                    <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 8px; color: #333;">追加の質問があります</h3>
                    <p style="font-size: 0.95rem; color: #666; margin-bottom: 15px; line-height: 1.5;">${workflow.aiContent.clarificationQuestion}</p>
                    <div class="answer-input-container" style="display: flex; flex-direction: column; gap: 12px;">
                        <textarea
                            id="clarification-answer-input"
                            placeholder="回答を入力してください"
                            rows="2"
                            style="width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 0.95rem; font-family: inherit; resize: vertical; min-height: 40px; transition: border-color 0.3s ease;"
                        ></textarea>
                        <button id="submit-clarification-btn" class="primary-button" style="padding: 10px 20px; font-size: 0.95rem;">
                            回答を送信
                        </button>
                    </div>
                </div>
            `;

            // 回答送信ボタンのイベントリスナーを追加
            if (onClarificationSubmit) {
                const submitBtn = document.getElementById('submit-clarification-btn');
                const answerInput = document.getElementById('clarification-answer-input');

                // フォーカス時のスタイル
                answerInput.addEventListener('focus', () => {
                    answerInput.style.outline = 'none';
                    answerInput.style.borderColor = '#667eea';
                    answerInput.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                });

                answerInput.addEventListener('blur', () => {
                    answerInput.style.borderColor = '#e1e5e9';
                    answerInput.style.boxShadow = 'none';
                });

                submitBtn.addEventListener('click', () => {
                    const answer = answerInput.value.trim();
                    if (answer) {
                        onClarificationSubmit(workflow.aiContent.clarificationQuestion, answer);
                    } else {
                        alert('回答を入力してください');
                    }
                });
            }
        } else {
            // 質問がない場合はコンテンツ全体を非表示
            aiContent.style.display = 'none';
        }

        // クイックアクションを更新
        await HomeScreen.updateQuickActions(workflow.aiContent.actions, onActionRemove);
    }

    /**
     * クイックアクションを更新
     * @param {Array} actions - アクション配列
     * @param {Function} onRemove - 削除コールバック (index) => void
     */
    static async updateQuickActions(actions, onRemove) {
        const actionsGrid = document.getElementById('quick-actions-grid');
        actionsGrid.innerHTML = '';

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const actionCard = document.createElement('div');
            actionCard.className = 'action-card';

            // ファビコンを取得
            const faviconUrl = await HomeScreen.getFavicon(action.url);

            actionCard.innerHTML = `
                <button class="remove-button" data-index="${i}" title="このアプリを削除">✕</button>
                <div class="action-icon">
                    ${faviconUrl ? `<img src="${faviconUrl}" alt="${action.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 24px; height: 24px; border-radius: 4px;">` : ''}
                    <span style="display: ${faviconUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; width: 100%; height: 100%;">${action.icon}</span>
                </div>
                <div class="action-title">${action.title}</div>
                <div class="action-description">${action.description}</div>
            `;

            // 削除ボタンのイベントリスナーを追加
            const removeButton = actionCard.querySelector('.remove-button');
            removeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onRemove) {
                    onRemove(i);
                }
            });

            // カード全体のクリックイベント（リンクとして機能）
            actionCard.addEventListener('click', (e) => {
                // 削除ボタンがクリックされた場合はリンクを開かない
                if (e.target.classList.contains('remove-button')) {
                    return;
                }
                window.open(action.url, '_blank');
            });

            actionsGrid.appendChild(actionCard);
        }
    }

    /**
     * ファビコンを取得
     * @param {string} url - URL
     * @returns {Promise<string|null>} ファビコンURL
     */
    static async getFavicon(url) {
        try {
            const domain = new URL(url).hostname;
            // Google Workspaceのツール用の特別処理
            if (domain === 'docs.google.com') {
                return 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico';
            } else if (domain === 'slides.google.com') {
                return 'https://ssl.gstatic.com/docs/presentations/images/favicon-2023q4.ico';
            } else if (domain === 'sheets.google.com') {
                return 'https://ssl.gstatic.com/docs/spreadsheets/spreadsheets_2023q4.ico';
            } else if (domain === 'drive.google.com') {
                return 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png';
            } else if (domain === 'mail.google.com') {
                return 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg';
            }

            // その他のサイトは通常のGoogleファビコンAPIを使用
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

            // ファビコンが存在するかチェック
            const response = await fetch(faviconUrl, { method: 'HEAD' });
            if (response.ok) {
                return faviconUrl;
            }
        } catch (error) {
            console.log('ファビコン取得に失敗:', url, error);
        }
        return null;
    }
}
