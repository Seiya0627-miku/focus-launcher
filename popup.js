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
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            font-weight: 500;
        `;
        messageDiv.innerHTML = `
            <div style="font-size: 1.2rem; margin-bottom: 10px;">✅ リセット完了</div>
            <div>すべてのデータが削除されました</div>
            <div style="font-size: 0.9rem; margin-top: 10px;">次回使用時は初回設定から始まります</div>
        `;
        document.body.appendChild(messageDiv);
    }
}

// ポップアップの初期化
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
}); 
