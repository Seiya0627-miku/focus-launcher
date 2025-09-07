// Focus Launcher - ポップアップ用スクリプト

class PopupManager {
    constructor() {
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.updateUI();
        await this.showExperimentId();
    }

    bindEvents() {
        // ワークフロー終了ボタン
        document.getElementById("end-workflow-btn").addEventListener("click", async () => {
            await this.endWorkflow();
        });

        // データリセットボタン
        document.getElementById("reset-data-btn").addEventListener("click", () => {
            this.showResetConfirmation();
        });

        // ブックマークボタン
        document.getElementById("bookmark-current-page").addEventListener("click", async () => {
            await this.bookmarkCurrentPage();
        });
    }

    async updateUI() {
        try {
            const result = await chrome.storage.local.get(['currentWorkflow']);
            
            if (result.currentWorkflow) {
                this.showActiveWorkflow(result.currentWorkflow);
            } else {
                this.showNoWorkflow();
            }
        } catch (error) {
            console.error('UI更新に失敗しました:', error);
            this.showNoWorkflow();
        }
    }

    showActiveWorkflow(workflow) {
        // ステータスを更新
        document.getElementById('status-text').textContent = 'アクティブ';
        document.getElementById('status-indicator').style.background = 'rgb(44, 169, 90)';
        document.getElementById('status-text').style.color = '#ffffff';

        // ワークフロー情報を表示
        document.getElementById('workflow-description').textContent = workflow.text;
        document.getElementById('current-workflow-info').classList.remove('hidden');
        document.getElementById('no-workflow-info').classList.add('hidden');
    }

    showNoWorkflow() {
        // ステータスを更新
        document.getElementById('status-text').textContent = '未設定';
        document.getElementById('status-indicator').style.background = 'rgba(255, 255, 255, 0.2)';
        document.getElementById('status-text').style.color = 'white';

        // ワークフロー情報を非表示
        document.getElementById('current-workflow-info').classList.add('hidden');
        document.getElementById('no-workflow-info').classList.remove('hidden');
    }

    async endWorkflow() {
        try {
            // 現在のワークフロー情報を取得
            const result = await chrome.storage.local.get(['currentWorkflow']);
            const workflowInfo = result.currentWorkflow ? {
                workflowText: result.currentWorkflow.text,
                duration: (Date.now() - result.currentWorkflow.timestamp) / 60000 // 分単位
            } : null;
            
            // ログを記録
            await chrome.runtime.sendMessage({
                action: 'saveLog',
                eventType: 'workflow_ended',
                data: workflowInfo
            });

            await chrome.storage.local.remove(['currentWorkflow']);
            
            // 現在のタブをリロードしてUIを更新
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                await chrome.tabs.reload(tabs[0].id);
            }
            
            // ポップアップのUIを更新
            await this.updateUI();
        await this.showExperimentId();
            
        } catch (error) {
            console.error('ワークフロー終了に失敗しました:', error);
            alert('ワークフロー終了に失敗しました。');
        }
    }

    // 実験IDを表示
    async showExperimentId() {
        try {
            const result = await chrome.storage.local.get(['experimentId']);
            if (result.experimentId) {
                document.getElementById('experiment-id').textContent = result.experimentId;
                document.getElementById('experiment-id-display').classList.remove('hidden');
            }
        } catch (error) {
            console.error('実験IDの取得に失敗しました:', error);
        }
    }

    // データリセット確認画面を表示
    showResetConfirmation() {
        const confirmed = confirm(
            '⚠️ データリセットの確認\n\n' +
            'すべてのユーザーデータとログが削除されます：\n' +
            '• 実験ID\n' +
            '• ワークフロー履歴\n' +
            '• 実験ログ\n' +
            '• 設定情報\n\n' +
            'この操作は取り消せません。\n\n' +
            '本当にリセットしますか？'
        );
        
        if (confirmed) {
            this.resetUserData();
        }
    }

    async bookmarkCurrentPage() {
        try {
            // 現在のワークフローを取得
            const result = await chrome.storage.local.get(['currentWorkflow']);
            const currentWorkflow = result.currentWorkflow;
            
            if (!currentWorkflow) {
                alert('ワークフローが開始されていません。まず新しいタブでワークフローを開始してください。');
                return;
            }
            
            // 現在のタブ情報を取得
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab || !currentTab.url) {
                alert('ブックマークできるページがありません');
                return;
            }
            
            // 無効なURLをチェック
            if (currentTab.url.startsWith('chrome://') || 
                currentTab.url.startsWith('chrome-extension://') ||
                currentTab.url.startsWith('about:')) {
                alert('このページはブックマークできません');
                return;
            }
            
            // ブックマークデータを作成
            const bookmark = {
                id: `bookmark_${Date.now()}`,
                url: currentTab.url,
                title: currentTab.title || 'タイトルなし',
                purpose: currentWorkflow.text, // ワークフローの目的を直接使用
                createdAt: new Date().toISOString()
            };
            
            // ブックマークを保存
            await this.saveBookmark(bookmark);
            
            // 成功メッセージ
            this.showBookmarkSuccessMessage(bookmark.title);
            
        } catch (error) {
            console.error('ブックマークの保存に失敗しました:', error);
            alert('ブックマークの保存に失敗しました');
        }
    }
    
    async saveBookmark(bookmark) {
        try {
            const result = await chrome.storage.local.get(['bookmarks']);
            const bookmarks = result.bookmarks || [];
            
            // 重複チェック（同じURLと目的の組み合わせ）
            const isDuplicate = bookmarks.some(existing => 
                existing.url === bookmark.url && existing.purpose === bookmark.purpose
            );
            
            if (isDuplicate) {
                alert('同じ目的でこのページは既にブックマークされています');
                return;
            }
            
            bookmarks.push(bookmark);
            
            await chrome.storage.local.set({ bookmarks: bookmarks });
            
            // ログに記録
            await chrome.runtime.sendMessage({
                action: 'saveLog',
                eventType: 'bookmark_created',
                data: {
                    bookmarkId: bookmark.id,
                    url: bookmark.url,
                    purpose: bookmark.purpose
                }
            });
            
            console.log('ブックマークを保存しました:', bookmark.title);
            
        } catch (error) {
            console.error('ブックマーク保存エラー:', error);
            throw error;
        }
    }
    
    showBookmarkSuccessMessage(title) {
        // ポップアップ内で成功メッセージを表示
        const statusText = document.getElementById('status-text');
        const originalText = statusText.textContent;
        
        statusText.textContent = `✅ 「${title}」をブックマークしました`;
        statusText.style.color = '#ffffff';
        
        // 3秒後に元に戻す
        setTimeout(() => {
            statusText.textContent = originalText;
            statusText.style.color = '';
        }, 3000);
    }

    // ユーザーデータをリセット
    async resetUserData() {
        try {
            // Background scriptにリセット要求を送信
            const response = await chrome.runtime.sendMessage({
                action: 'resetUserData'
            });
            
            if (response.success) {
                // 成功メッセージを表示
                this.showResetSuccessMessage();
                
                // 現在のタブをリロード
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs[0]) {
                    await chrome.tabs.reload(tabs[0].id);
                }
                
                // ポップアップを閉じる
                setTimeout(() => {
                    window.close();
                }, 2000);
            } else {
                throw new Error('リセットに失敗しました');
            }
        } catch (error) {
            console.error('データリセットに失敗しました:', error);
            alert('データリセットに失敗しました。もう一度お試しください。');
        }
    }

    // リセット成功メッセージを表示
    showResetSuccessMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            font-weight: 500;
        `;
        messageDiv.innerHTML = `
            <div style="font-size: 1.0rem">リセット完了</div>
        `;
        document.body.appendChild(messageDiv);
    }
}

// ポップアップの初期化
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
}); 
