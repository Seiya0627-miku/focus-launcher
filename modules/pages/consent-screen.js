// 確認画面
import { MessageToast } from '../features/message-toast.js';

export class ConsentScreen {
    constructor() {
        this.experimentId = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.generateExperimentId();
    }

    bindEvents() {
        // 同意ボタン
        document.getElementById('consent-agree').addEventListener('click', () => {
            this.handleConsent();
        });
    }

    async generateExperimentId() {
        try {
            // Background scriptから実験IDを生成
            const response = await chrome.runtime.sendMessage({
                action: 'generateExperimentId'
            });

            this.experimentId = response.experimentId;
            document.getElementById('experiment-id').textContent = this.experimentId;
        } catch (error) {
            console.error('実験IDの生成に失敗しました:', error);
            // フォールバック: ローカルで生成
            this.experimentId = this.generateLocalExperimentId();
            document.getElementById('experiment-id').textContent = this.experimentId;
        }
    }

    generateLocalExperimentId() {
        const prefix = 'EXP';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 3).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }

    async handleConsent() {
        try {
            // 初回設定を完了
            await chrome.runtime.sendMessage({
                action: 'completeFirstTimeSetup',
                experimentId: this.experimentId
            });

            // 成功メッセージを表示
            this.showSuccessMessage();

            // 1秒後に新しいタブを開く
            setTimeout(() => {
                chrome.runtime.sendMessage({ action: 'reloadPage' });
            }, 1000);

        } catch (error) {
            console.error('設定の保存に失敗しました:', error);
            alert('設定の保存に失敗しました。もう一度お試しください。');
        }
    }

    showSuccessMessage() {
        // 新しいモジュールを使用できるが、既存の実装を維持（カスタムスタイル）
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
            <div style="font-size: 1.2rem; margin-bottom: 10px;">✅ 設定完了</div>
            <div>実験ID: ${this.experimentId}</div>
            <div style="font-size: 0.9rem; margin-top: 10px;">新しいタブに移動します...</div>
        `;
        document.body.appendChild(messageDiv);

        // 代替案（MessageToastを使う場合）：
        // MessageToast.success(`✅ 設定完了\n実験ID: ${this.experimentId}\n新しいタブに移動します...`, 1000);
    }
}
