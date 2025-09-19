// Focus Launcher - メインロジック
class FocusLauncher {
    constructor() {
        this.currentWorkflow = null;
        this.isRefreshing = false;
        this.visitedPages = []; // ワークフロー中にアクセスしたページを追跡
        this.init();
        this.setupMessageListener();
    }

    async init() {
        this.bindEvents();
        this.checkFirstTimeUser();
        this.setupPageTracking();
        await this.restoreVisitedPages();
        await this.checkOverlay();
    }

    // ページリロード時にvisitedPagesを復元
    async restoreVisitedPages() {
        try {
            const result = await chrome.storage.local.get(['currentWorkflowVisitedPages']);
            if (result.currentWorkflowVisitedPages) {
                this.visitedPages = result.currentWorkflowVisitedPages;
            }
        } catch (error) {
            console.error('visitedPagesの復元に失敗しました:', error);
        }
    }

    bindEvents() {
        // ワークフロー開始ボタン
        document.getElementById('start-workflow').addEventListener('click', () => {
            this.startWorkflow();
        });

        // ワークフロー終了ボタン
        document.getElementById('end-workflow').addEventListener('click', () => {
            this.showReflectionScreen();
        });

        // 修正要求送信ボタン
        document.getElementById('submit-feedback').addEventListener('click', () => {
            this.submitFeedback();
        });

        // 修正要求セクションのワークフロー終了ボタン
        document.getElementById('end-workflow-feedback').addEventListener('click', () => {
            this.showReflectionScreen();
        });

        // Enterキーでワークフロー開始
        document.getElementById('workflow-textarea').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.startWorkflow();
            }
        });

        // 修正要求テキストエリアでEnterキー処理
        document.getElementById('feedback-textarea').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.submitFeedback();
            }
        });

        // ページのリフレッシュを検知（visibilitychangeイベントを使用）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // ページが非表示になった時（リフレッシュの可能性）
                this.isRefreshing = true;
            }
        });

        // ページのリロードを検知
        window.addEventListener('beforeunload', () => {
            this.isRefreshing = true;
        });

        // ブラウザの閉じるイベントを監視（実際のブラウザ閉じる時のみ）
        window.addEventListener('unload', () => {
            if (!this.isRefreshing) {
                this.showReflectionScreen();
            }
        });
    }

    // ページ遷移の追跡を設定
    setupPageTracking() {
        // タブの更新を監視
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url && this.currentWorkflow) {
                this.trackPageVisit(tab);
            }
        });

        // タブの切り替えを監視
        chrome.tabs.onActivated.addListener((activeInfo) => {
            chrome.tabs.get(activeInfo.tabId, (tab) => {
                if (tab && tab.url && this.currentWorkflow) {
                    this.trackPageVisit(tab);
                }
            });
        });
    }

    // ページ訪問を追跡
    async trackPageVisit(tab) {
        if (!this.currentWorkflow || !tab.url) return;

        // 内部ページ（chrome://, chrome-extension://）は除外
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            return;
        }

        const pageInfo = {
            title: tab.title || '無題のページ',
            url: tab.url,
            timestamp: Date.now()
        };

        // 重複チェック（同じURLで最近アクセスした場合は除外）
        const recentVisit = this.visitedPages.find(page => 
            page.url === tab.url && 
            (Date.now() - page.timestamp) < 3000 // 3秒以内
        );

        if (!recentVisit) {
            this.visitedPages.push(pageInfo);

            // localStorageに保存
            await this.saveVisitedPagesToStorage();
        }
    }

    async saveVisitedPagesToStorage() {
        try {
            await chrome.storage.local.set({ 
                currentWorkflowVisitedPages: this.visitedPages 
            });
        } catch (error) {
            console.error('visitedPagesの保存に失敗しました:', error);
        }
    }

    async saveLog(eventType, data) {
        try {
            await chrome.runtime.sendMessage({
                action: 'saveLog',
                eventType: eventType,
                data: data
            });
        } catch (error) {
            console.error('ログ保存に失敗しました:', error);
        }
    }

    async loadCurrentWorkflow() {
        try {
            const result = await chrome.storage.local.get(['currentWorkflow']);
            console.log('ストレージから取得したデータ:', result);
            
            if (result.currentWorkflow && result.currentWorkflow.text) {
                this.currentWorkflow = result.currentWorkflow;
                
                // ワークフローが存在する場合は、直接ホーム画面を表示
                this.showHomeScreen();
                this.updateHomeScreen();
                
                console.log('既存のワークフローを復元しました:', this.currentWorkflow.text);
            } else {
                this.showWorkflowInput();
                console.log('新しいワークフローを開始します');
            }
        } catch (error) {
            console.error('ワークフローの読み込みに失敗しました:', error);
            this.showWorkflowInput();
        }
    }

    async startWorkflow() {
        const workflowText = document.getElementById('workflow-textarea').value.trim();
    
        if (!workflowText) {
            alert('作業目的を入力してください。');
            return;
        }
    
        // ページ追跡をリセット
        this.visitedPages = [];
        await chrome.storage.local.remove(['currentWorkflowVisitedPages']);
    
        // ワークフロー情報を設定
        this.currentWorkflow = {
            text: workflowText,
            timestamp: Date.now(),
            aiContent: null,
            feedback: null,
            fixRequests: [] // 修正要求履歴を追加
        };
    
        // ストレージに保存
        await chrome.storage.local.set({ currentWorkflow: this.currentWorkflow });
    
        this.showLoadingScreen();

        try {
            // AI APIを呼び出してホーム画面を生成
            const aiResponse = await this.generateHomeScreen(workflowText);
            
            this.currentWorkflow = {
                ...this.currentWorkflow,
                aiContent: aiResponse
            };

            // ストレージに保存
            await chrome.storage.local.set({ currentWorkflow: this.currentWorkflow });

            this.showHomeScreen();
            this.updateHomeScreen();

            console.log('新しいワークフローを開始しました:', workflowText);

        } catch (error) {
            console.error('ワークフローの開始に失敗しました:', error);
            alert('ワークフローの開始に失敗しました。もう一度お試しください。');
            this.showWorkflowInput();
        }
    }

    async submitFeedback() {
        const feedbackText = document.getElementById('feedback-textarea').value.trim();
        
        if (!feedbackText) {
            alert('修正要求を入力してください');
            return;
        }

        // ワークフロー終了の要求かチェック
        if (feedbackText.toLowerCase().includes('ワークフローを終了') || 
            feedbackText.toLowerCase().includes('終了') ||
            feedbackText.toLowerCase().includes('やめる')) {
            this.showReflectionScreen();
            return;
        }

        this.showLoadingScreen();

        try {
            console.log('修正要求処理:', feedbackText);

            // 修正要求を履歴に追加
            const fixRequest = {
                text: feedbackText,
                timestamp: Date.now()
            };
            this.currentWorkflow.fixRequests.push(fixRequest);
         
            // Gemini APIを呼び出して修正要求を処理
            const aiResponse = await this.processFeedbackWithAI(feedbackText);
            
            // ワークフローを更新
            this.currentWorkflow = {
                ...this.currentWorkflow,
                aiContent: aiResponse,
                feedback: feedbackText
            };

            // ストレージに保存
            await chrome.storage.local.set({ currentWorkflow: this.currentWorkflow });

            this.showHomeScreen();
            this.updateHomeScreen();

            // フィードバックテキストエリアをクリア
            document.getElementById('feedback-textarea').value = '';
            console.log('修正要求を処理しました:', feedbackText);
            
        } catch (error) {
            console.error('修正要求の処理に失敗しました:', error);
            alert('修正要求の処理に失敗しました。もう一度お試しください。');
            this.showHomeScreen();
        }
    }

    async processFeedbackWithAI(feedbackText) {
        // 既存のワークフロー情報と修正要求を組み合わせてAIに送信
        const currentActions = this.currentWorkflow.aiContent.actions;
        const currentTitle = this.currentWorkflow.aiContent.title;
        const currentContent = this.currentWorkflow.aiContent.content;
        
        const prompt = `
現在のワークフロー情報：
- タイトル: ${currentTitle}
- 内容: ${currentContent}
- 現在のツール: ${currentActions.map(a => a.title).join(', ')}

ユーザーからの修正要求: ${feedbackText}

上記の修正要求に基づいて、以下のJSON形式で応答してください：
{
    "title": "更新されたタイトル",
    "content": "更新された内容（HTML形式）",
    "actions": [
        {
            "title": "ツール名",
            "description": "説明",
            "url": "URL",
            "icon": "絵文字アイコン"
        }
    ]
}

注意事項：
- 既存のツールはurl含めて原則変更しないでください（例：https://slides.google.comをhttps://docs.google.com/presentation/に変更しないでください）
- 削除要求があれば該当ツールを除外してください
- 追加要求があれば、既存のjsonの後ろに新しいツールの情報を追加してください
- 重複は避けてください
- 実用的で関連性の高いツールを提案してください
- 論文を広く調べる必要がある場合はPaperDive（https://www.paperdive.app/）を必ず含める
- Google Driveは常に含める（ファイル管理のため）
- Google Workspaceツール（Docs、Slides、Sheets、Drive、Mailなど）は以下のURL形式で統一してください：
  * Google Docs: https://docs.google.com
  * Google Slides: https://slides.google.com
  * その他についても以上と同様にしてください
- ツール名はそのまま表示し、余計な情報（「構成検討」など）は付けないでください
`;

        // console.log('AIに送信するプロンプト:', prompt);

        // APIキーが設定されている場合はGemini APIを使用
        if (CONFIG.GEMINI_API_KEY) {
            try {
                const result = await this.callGeminiAPIForFeedback(prompt);
                console.log('Gemini APIで修正要求処理成功');
                // AI処理が成功した場合のみ成功メッセージを表示
                this.showSuccessMessage('修正要求が正常に処理されました！');
                return result;
            } catch (error) {
                console.error('Gemini API呼び出しに失敗しました:', error);
                // APIが失敗した場合はフォールバック
                const fallbackResult = this.processFeedbackRequest(feedbackText);
                this.showFallbackMessage('AI APIに接続できませんでした。ローカル処理で修正要求を処理しました。');
                return fallbackResult;
            }
        } else {
            // APIキーが設定されていない場合はフォールバック
            const fallbackResult = this.processFeedbackRequest(feedbackText);
            this.showFallbackMessage('AI APIキーが設定されていません。ローカル処理で修正要求を処理しました。');
            return fallbackResult;
        }
    }

    async callGeminiAPIForFeedback(prompt) {
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };

        console.log('Gemini APIに修正要求を送信中...');

        const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API呼び出しに失敗しました: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('APIレスポンスが無効です');
        }

        const aiText = data.candidates[0].content.parts[0].text;
        console.log('AIからの応答:', aiText);
        
        // JSONレスポンスを解析（マークダウンのコードブロック記号を除去）
        try {
            // マークダウンのコードブロック記号を除去
            let cleanText = aiText.trim();
            
            // ```json と ``` を除去
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.substring(7);
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.substring(3);
            }
            
            if (cleanText.endsWith('```')) {
                cleanText = cleanText.substring(0, cleanText.length - 3);
            }
            
            cleanText = cleanText.trim();
            
            const aiResponse = JSON.parse(cleanText);
            
            // レスポンスの検証
            if (!aiResponse.title || !aiResponse.content || !aiResponse.actions) {
                throw new Error('APIレスポンスの形式が無効です');
            }

            console.log('AI応答の解析成功:', aiResponse);
            return aiResponse;
        } catch (parseError) {
            console.error('JSON解析に失敗しました:', parseError);
            console.log('AIレスポンス:', aiText);
            throw new Error('AIレスポンスの解析に失敗しました');
        }
    }

    // フォールバック用のローカル処理（既存のメソッドを修正）
    processFeedbackRequest(feedbackText) {
        // 既存のアクションを取得
        const existingActions = this.currentWorkflow.aiContent.actions;
        console.log('既存のアクション:', existingActions);
        
        // 削除要求をチェック
        const removeRequests = this.extractRemoveRequests(feedbackText);
        console.log('削除要求:', removeRequests);
        
        let filteredActions = existingActions.filter(action => 
            !removeRequests.some(remove => 
                action.title.toLowerCase().includes(remove.toLowerCase()) ||
                action.description.toLowerCase().includes(remove.toLowerCase())
            )
        );

        console.log('削除後のアクション:', filteredActions);

        // 追加要求を処理
        const addRequests = this.extractAddRequests(feedbackText);
        console.log('追加要求:', addRequests);
        
        if (addRequests.length > 0) {
            const newActions = this.generateAdditionalActions(addRequests);
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
            title: this.currentWorkflow.aiContent.title,
            content: this.currentWorkflow.aiContent.content,
            actions: uniqueActions
        };
    }

    showSuccessMessage(message) {
        // 成功メッセージを一時的に表示
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        // 3秒後に自動削除
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    extractRemoveRequests(feedbackText) {
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

    extractAddRequests(feedbackText) {
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

    generateAdditionalActions(requests) {
        // 簡単なキーワードマッチングで追加アクションを生成
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
                } else if (request.includes('Drive') || request.includes('ドライブ') || request.includes('ファイル')) {
                    additionalActions.push({
                        title: 'Google Drive',
                        description: 'ファイル管理',
                        url: 'https://drive.google.com',
                        icon: '📁'
                    });
                }
            } else if (request.includes('GitHub') || request.includes('github')) {
                additionalActions.push({
                    title: 'GitHub',
                    description: 'コード管理・共有',
                    url: 'https://github.com',
                    icon: '💻'
                });
            } else if (request.includes('YouTube') || request.includes('youtube')) {
                additionalActions.push({
                    title: 'YouTube',
                    description: '動画学習・検索',
                    url: 'https://www.youtube.com',
                    icon: '📺'
                });
            } else if (request.includes('ChatGPT') || request.includes('chatgpt')) {
                additionalActions.push({
                    title: 'ChatGPT',
                    description: 'AIアシスタント',
                    url: 'https://chat.openai.com',
                    icon: '🤖'
                });
            } else if (request.includes('Notion') || request.includes('notion')) {
                additionalActions.push({
                    title: 'Notion',
                    description: 'ノート・プロジェクト管理',
                    url: 'https://www.notion.so',
                    icon: '📝'
                });
            } else if (request.includes('Slack') || request.includes('slack')) {
                additionalActions.push({
                    title: 'Slack',
                    description: 'チームコミュニケーション',
                    url: 'https://slack.com',
                    icon: '💬'
                });
            } else if (request.includes('Zoom') || request.includes('zoom')) {
                additionalActions.push({
                    title: 'Zoom',
                    description: 'オンライン会議',
                    url: 'https://zoom.us',
                    icon: '📹'
                });
            } else if (request.includes('Trello') || request.includes('trello')) {
                additionalActions.push({
                    title: 'Trello',
                    description: 'タスク管理',
                    url: 'https://trello.com',
                    icon: '📋'
                });
            } else if (request.includes('Discord') || request.includes('discord')) {
                additionalActions.push({
                    title: 'Discord',
                    description: 'コミュニケーション',
                    url: 'https://discord.com',
                    icon: '🎮'
                });
            } else if (request.includes('Twitter') || request.includes('twitter') || request.includes('X')) {
                additionalActions.push({
                    title: 'Twitter',
                    description: 'ソーシャルメディア',
                    url: 'https://twitter.com',
                    icon: '🐦'
                });
            } else if (request.includes('LinkedIn') || request.includes('linkedin')) {
                additionalActions.push({
                    title: 'LinkedIn',
                    description: 'ビジネスネットワーキング',
                    url: 'https://linkedin.com',
                    icon: '💼'
                });
            } else if (request.includes('PaperDive') || request.includes('paperdive') || request.includes('論文') || request.includes('研究')) {
                additionalActions.push({
                    title: 'PaperDive',
                    description: '論文検索・分析',
                    url: 'https://www.paperdive.app',
                    icon: '🔬'
                });
            }
        }
        
        console.log('生成された追加アクション:', additionalActions);
        return additionalActions;
    }

    async generateHomeScreen(workflowText) {
        // ブックマークを取得
        const bookmarks = await this.getBookmarks();
        
        // プロンプトにブックマーク情報を追加
        let bookmarkContext = '';
        if (bookmarks.length > 0) {
            bookmarkContext = `\n\n関連するブックマーク（優先的に活用してください）:\n`;
            bookmarks.forEach((bookmark, index) => {
                bookmarkContext += `${index + 1}. ${bookmark.title}\n`;
                bookmarkContext += `   URL: ${bookmark.url}\n`;
                bookmarkContext += `   目的: ${bookmark.purpose}\n\n`;
            });
        }
        
        const prompt = CONFIG.PROMPT_TEMPLATE.replace('{workflow}', workflowText) + bookmarkContext;
        

        // APIキーが設定されている場合はGemini APIを使用
        if (CONFIG.GEMINI_API_KEY) {
            try {
                const result = await this.callGeminiAPI(workflowText, prompt);
                console.log('Gemini APIでワークフロー生成成功');

                // ログを記録
                // await this.saveLog('home_screen_generated', {
                //     workflowText: workflowText,
                //     aiResponse: result
                // });

                return result;
            } catch (error) {
                console.error('Gemini API呼び出しに失敗しました:', error);
                // APIが失敗した場合はフォールバック
                const fallbackResult = this.generateMockAIResponse(workflowText);
                this.showFallbackMessage('AI APIに接続できませんでした。ローカル処理でワークフローを生成しました。');
                return fallbackResult;
            }
        } else {
            // APIキーが設定されていない場合はモックデータを使用
            const fallbackResult = this.generateMockAIResponse(workflowText);
            this.showFallbackMessage('AI APIキーが設定されていません。ローカル処理でワークフローを生成しました。');
            return fallbackResult;
        }
    }

    async callGeminiAPI(workflowText, customPrompt = null) {
        const prompt = customPrompt || CONFIG.PROMPT_TEMPLATE.replace('{workflow}', workflowText);
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };

        const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API呼び出しに失敗しました: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('APIレスポンスが無効です');
        }

        const aiText = data.candidates[0].content.parts[0].text;
        
        // JSONレスポンスを解析（マークダウンのコードブロック記号を除去）
        try {
            // マークダウンのコードブロック記号を除去
            let cleanText = aiText.trim();
            
            // ```json と ``` を除去
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.substring(7);
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.substring(3);
            }
            
            if (cleanText.endsWith('```')) {
                cleanText = cleanText.substring(0, cleanText.length - 3);
            }
            
            cleanText = cleanText.trim();
            
            const aiResponse = JSON.parse(cleanText);
            
            // レスポンスの検証
            if (!aiResponse.title || !aiResponse.content || !aiResponse.actions) {
                throw new Error('APIレスポンスの形式が無効です');
            }

            // 初期生成時のみ5つに制限（厳格ではない）
            if (aiResponse.actions.length > 5) {
                console.log(`アクション数が5つを超えていますが、必要なため保持します: ${aiResponse.actions.length}個`);
            }

            return aiResponse;
        } catch (parseError) {
            console.error('JSON解析に失敗しました:', parseError);
            console.log('AIレスポンス:', aiText);
            throw new Error('AIレスポンスの解析に失敗しました');
        }
    }

    generateMockAIResponse(workflowText) {
        // ワークフローの内容に基づいてモックレスポンスを生成
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

    updateHomeScreen() {
        if (!this.currentWorkflow) return;

        // タイトルを更新
        document.getElementById('current-workflow-title').textContent = this.currentWorkflow.aiContent.title;

        // AI生成コンテンツを更新
        const aiContent = document.getElementById('ai-generated-content');
        aiContent.innerHTML = this.currentWorkflow.aiContent.content;

        // クイックアクションを更新
        this.updateQuickActions(this.currentWorkflow.aiContent.actions);
    }

    async updateQuickActions(actions) {
        const actionsGrid = document.getElementById('quick-actions-grid');
        actionsGrid.innerHTML = '';

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const actionCard = document.createElement('div'); // aタグからdivタグに変更
            actionCard.className = 'action-card';
            
            // ファビコンを取得
            const faviconUrl = await this.getFavicon(action.url);
            
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
                this.removeAction(i);
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

    // アプリを削除するメソッド
    removeAction(index) {
        if (!this.currentWorkflow || !this.currentWorkflow.aiContent || !this.currentWorkflow.aiContent.actions) {
            return;
        }

        // 指定されたインデックスのアクションを削除
        const removedAction = this.currentWorkflow.aiContent.actions.splice(index, 1)[0];

        // ストレージに保存
        chrome.storage.local.set({ currentWorkflow: this.currentWorkflow });

        // ホーム画面を更新
        this.updateHomeScreen();

        console.log(`アクション「${removedAction.title}」を削除しました`);
    }

    async getBookmarks() {
        try {
            const result = await chrome.storage.local.get(['bookmarks']);
            return result.bookmarks || [];
        } catch (error) {
            console.error('ブックマークの取得に失敗しました:', error);
            return [];
        }
    }

    async getFavicon(url) {
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

    // 振り返り画面に遷移する関数
    async showReflectionScreen() {
        // 振り返り画面を新しいタブで開く
        const reflectionUrl = chrome.runtime.getURL('reflection.html');
        await chrome.tabs.create({ url: reflectionUrl });
        
        // 現在のタブを閉じる
        const currentTab = await chrome.tabs.getCurrent();
        if (currentTab) {
            await chrome.tabs.remove(currentTab.id);
        }
    }

    // ワークフローを終了する関数
    async endWorkflow() {
        // ワークフロー情報をクリア
        this.currentWorkflow = null;
        await chrome.storage.local.remove(['currentWorkflow']);

        // visitedPagesもクリア
        this.visitedPages = [];
        await chrome.storage.local.remove(['currentWorkflowVisitedPages']);

        this.showWorkflowInput();
        console.log('ワークフローを終了しました');
    }

    showWorkflowInput() {
        document.getElementById('workflow-input').classList.remove('hidden');
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('loading-screen').classList.add('hidden');
        
        // テキストエリアをクリア
        document.getElementById('workflow-textarea').value = '';
    }

    showHomeScreen() {
        document.getElementById('workflow-input').classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
        document.getElementById('loading-screen').classList.add('hidden');
    }

    showLoadingScreen() {
        document.getElementById('workflow-input').classList.add('hidden');
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('loading-screen').classList.remove('hidden');
    }

    showFallbackMessage(message) {
        // フォールバックメッセージを一時的に表示
        const fallbackDiv = document.createElement('div');
        fallbackDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #FF9800;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
            max-width: 400px;
            line-height: 1.4;
        `;
        fallbackDiv.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="margin-right: 8px;">⚠️</span>
                <strong>フォールバック処理</strong>
            </div>
            <div>${message}</div>
        `;
        document.body.appendChild(fallbackDiv);
        
        // 5秒後に自動削除
        setTimeout(() => {
            if (fallbackDiv.parentNode) {
                fallbackDiv.parentNode.removeChild(fallbackDiv);
            }
        }, 5000);
    }

    // 初回利用チェック
    async checkFirstTimeUser() {
        try {
            console.log('初回利用チェックを開始...');
            
            // Runtime の接続確認
            if (!chrome.runtime) {
                console.error('chrome.runtime が利用できません');
                this.loadCurrentWorkflow();
                return;
            }
        
            const response = await chrome.runtime.sendMessage({
                action: 'checkFirstTimeUser'
            });
            
            // レスポンスが undefined または null の場合の処理
            if (!response || typeof response !== 'object') {
                console.error('Background script からの応答が無効です:', response);
                console.log('フォールバックとして直接ストレージをチェックします');
                
                // フォールバック: 直接ストレージをチェック
                const fallbackResult = await chrome.storage.local.get(['experimentId', 'consentGiven']);
                console.log('直接取得したストレージデータ:', fallbackResult);
                
                const isFirstTime = !fallbackResult.experimentId || !fallbackResult.consentGiven;
                if (isFirstTime) {
                    this.showConsentScreen();
                } else {
                    this.loadCurrentWorkflow();
                }
                return;
            }
            
            if (response.error) {
                console.error('Background script でエラーが発生:', response.error);
                this.loadCurrentWorkflow();
                return;
            }
            
            if (response.isFirstTime) {
                console.log('初回利用です。確認画面を表示します。');
                this.showConsentScreen();
            } else {
                console.log('既存ユーザーです。ワークフローを読み込みます。');
                this.loadCurrentWorkflow();
            }
        } catch (error) {
            console.error('初回利用チェックに失敗しました:', error);
            
            // エラーが runtime の接続問題の場合
            if (error.message && error.message.includes('Extension context invalidated')) {
                console.log('拡張機能のコンテキストが無効化されています。ページをリロードしてください。');
                location.reload();
                return;
            }
            
            // その他のエラーの場合はフォールバック
            console.log('フォールバックとして既存ユーザー処理を実行します');
            this.loadCurrentWorkflow();
        }
    }

    // 確認画面を表示
    showConsentScreen() {
        // 現在のコンテンツを隠す
        document.getElementById('app').style.display = 'none';
        
        // 確認画面を表示
        const consentFrame = document.createElement('iframe');
        consentFrame.src = chrome.runtime.getURL('consent-screen.html');
        consentFrame.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            z-index: 10000;
        `;
        document.body.appendChild(consentFrame);
    }

    // メッセージリスナーを追加
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('メッセージを受信:', request);
            if (request.action === 'showConsentScreen') {
                this.showConsentScreen();
            }
            if (request.action === 'reloadPage') {
                window.location.reload();
            }
        });
    }

    async checkOverlay() {
        const result = await chrome.storage.local.get(['waitingForConfirmation']);
        if (result.waitingForConfirmation) {
            this.showOverlay();
        }
    }

    showOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'confirmation-overlay';

        const box = document.createElement('div');
        box.className = 'overlay-box';

        // タイトル
        const title = document.createElement('h2');
        title.className = 'overlay-title';
        title.textContent = '利用目的の再確認';

        // 説明文
        const description = document.createElement('p');
        description.className = 'overlay-description';
        description.innerHTML = `
            しばらく作業から離れていたようですね。<br>
            あなたの現在の利用目的を入力してください。<br>
            <strong>利用目的が変わった場合、前のワークフローは終了します。</strong>
        `;

        // 入力欄
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'overlay-input';
        input.placeholder = '例：研究計画書を書いて、関連文献を調べる';

        // ボタン
        const button = document.createElement('button');
        button.className = 'overlay-button';
        button.textContent = '確認';
        button.disabled = true;

        // ボタンの無効化スタイル更新
        const updateButtonStyle = () => {
            // CSSで制御されるため、特別な処理は不要
        };

        // 入力時のイベント
        input.addEventListener('input', () => {
            button.disabled = input.value.trim().length === 0;
        });

        // ボタンクリック時のイベント
        button.addEventListener('click', async () => {
            await chrome.storage.local.set({ waitingForConfirmation: false });
            overlay.remove();
            console.log('[DEBUG] 確認完了 → overlay非表示');
        });

        // Enterキーでの確認
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !button.disabled) {
                button.click();
            }
        });

        // 要素を組み立て
        box.appendChild(title);
        box.appendChild(description);
        box.appendChild(input);
        box.appendChild(button);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // 入力欄にフォーカス
        setTimeout(() => {
            input.focus();
        }, 100);
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new FocusLauncher();
}); 
