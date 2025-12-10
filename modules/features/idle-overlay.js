// アイドル時の意図再確認オーバーレイ機能

import { AzureOpenAIClient } from '../ai/azure-openai-client.js';
import { WorkflowManager } from '../core/workflow-manager.js';
import { StorageManager } from '../core/storage-manager.js';

export class IdleOverlay {
    constructor() {
        this.currentWorkflow = null;
        this.onSamePurpose = null;  // コールバック: 目的が同じ場合
        this.onDifferentPurpose = null;  // コールバック: 目的が異なる場合
    }

    /**
     * オーバーレイ表示が必要かチェック
     * @returns {Promise<boolean>} 表示が必要な場合true
     */
    async shouldShow() {
        const result = await chrome.storage.local.get(['waitingForConfirmation']);
        return result.waitingForConfirmation === true;
    }

    /**
     * オーバーレイを表示
     * @param {Object} currentWorkflow - 現在のワークフロー
     * @param {Function} onSamePurpose - 目的が同じ場合のコールバック
     * @param {Function} onDifferentPurpose - 目的が異なる場合のコールバック
     * @param {Function} onEndWorkflow - ワークフロー終了のコールバック（追加）
     */
    async show(currentWorkflow, onSamePurpose, onDifferentPurpose, onEndWorkflow) {
        this.currentWorkflow = currentWorkflow;
        this.onSamePurpose = onSamePurpose;
        this.onDifferentPurpose = onDifferentPurpose;
        this.onEndWorkflow = onEndWorkflow;

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
        input.placeholder = 'ここに「今」の利用目的を入力してください';

        // 確認ボタン
        const button = document.createElement('button');
        button.className = 'overlay-button';
        button.textContent = '確認';
        button.disabled = true;

        // ボタンコンテナ
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '10px';

        // ワークフロー終了ボタン
        const endButton = document.createElement('button');
        endButton.className = 'overlay-button overlay-button-secondary';
        endButton.textContent = '終了する';
        endButton.style.backgroundColor = '#dc3545';

        // 入力時のイベント
        input.addEventListener('input', () => {
            button.disabled = input.value.trim().length === 0;
        });

        // 確認ボタンクリック時のイベント
        button.addEventListener('click', async () => {
            await this.handleConfirmation(input.value.trim(), button, overlay);
        });

        // 終了ボタンクリック時のイベント
        endButton.addEventListener('click', async () => {
            await chrome.storage.local.set({ waitingForConfirmation: false });
            overlay.remove();
            if (this.onEndWorkflow) {
                this.onEndWorkflow();
            }
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
        buttonContainer.appendChild(button);
        buttonContainer.appendChild(endButton);
        box.appendChild(buttonContainer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // 入力欄にフォーカス
        setTimeout(() => {
            input.focus();
        }, 100);
    }

    /**
     * 確認処理
     * @param {string} userInput - ユーザー入力
     * @param {HTMLElement} button - 確認ボタン
     * @param {HTMLElement} overlay - オーバーレイ要素
     */
    async handleConfirmation(userInput, button, overlay) {
        if (!userInput) return;

        // 進行中表示に切り替え
        button.textContent = "判定中...";
        button.style.backgroundColor = "#aaa"; // グレーっぽくする
        button.disabled = true;

        // Azure OpenAI APIに送信
        const isSamePurpose = await AzureOpenAIClient.checkPurposeSimilarity(
            this.currentWorkflow.text,
            userInput
        );

        // 意図再確認履歴に追加
        const updatedWorkflow = WorkflowManager.addPurposeCheck(
            this.currentWorkflow,
            userInput,
            isSamePurpose
        );
        await WorkflowManager.update(updatedWorkflow);

        if (isSamePurpose) {
            console.log("[DEBUG] 利用目的は一致 → 継続");
            button.textContent = "目的一致 ✅";
            button.style.backgroundColor = "#28a745"; // 緑
            button.disabled = false;
            await chrome.storage.local.set({ waitingForConfirmation: false });

            // 1秒後にタブを閉じる
            setTimeout(() => {
                overlay.remove();
                if (this.onSamePurpose) {
                    this.onSamePurpose();
                }
                chrome.tabs.getCurrent((tab) => {
                    if (tab) {
                        chrome.tabs.remove(tab.id);
                    }
                });
            }, 1000);
        } else {
            console.log("[DEBUG] 利用目的が変化 → ワークフロー終了");
            button.textContent = "目的変更 🔄";
            button.style.backgroundColor = "#ed9121"; // オレンジ
            button.disabled = false;
            await chrome.storage.local.set({ waitingForConfirmation: false });
            setTimeout(() => {
                overlay.remove();
                if (this.onDifferentPurpose) {
                    this.onDifferentPurpose();
                }
            }, 1000);
        }
    }
}
