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
}

// ポップアップの初期化
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
}); 