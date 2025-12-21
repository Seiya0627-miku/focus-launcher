// アイドル時の意図再確認オーバーレイ機能

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
     * @param {Function} onSamePurpose - 目的が同じ場合のコールバック（続けるボタン）
     * @param {Function} onDifferentPurpose - 目的が異なる場合のコールバック（未使用）
     * @param {Function} onEndWorkflow - ワークフロー終了のコールバック
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
        title.textContent = 'ワークフローの継続確認';

        // 説明文
        const description = document.createElement('p');
        description.className = 'overlay-description';
        description.innerHTML = `
            しばらく作業から離れていたようですね。<br>
            現在進行中のワークフローを続けますか？
        `;

        // ワークフロー概要表示
        const workflowSummary = document.createElement('div');
        workflowSummary.className = 'overlay-workflow-summary';
        workflowSummary.innerHTML = `
            <div class="workflow-summary-label">進行中のワークフロー:</div>
            <div class="workflow-summary-text">${currentWorkflow.text}</div>
        `;

        // ボタンコンテナ
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'overlay-button-container';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '15px';
        buttonContainer.style.marginTop = '30px';
        buttonContainer.style.justifyContent = 'center';

        // 続けるボタン
        const continueButton = document.createElement('button');
        continueButton.className = 'overlay-button overlay-button-primary';
        continueButton.textContent = '続ける';
        continueButton.style.backgroundColor = '#667eea';

        // 終了するボタン
        const endButton = document.createElement('button');
        endButton.className = 'overlay-button overlay-button-secondary';
        endButton.textContent = '終了する';
        endButton.style.backgroundColor = '#dc3545';

        // 続けるボタンクリック時のイベント
        continueButton.addEventListener('click', async () => {
            await chrome.storage.local.set({ waitingForConfirmation: false });
            overlay.remove();
            if (this.onSamePurpose) {
                this.onSamePurpose();
            }
            // タブを閉じる
            chrome.tabs.getCurrent((tab) => {
                if (tab) {
                    chrome.tabs.remove(tab.id);
                }
            });
        });

        // 終了ボタンクリック時のイベント
        endButton.addEventListener('click', async () => {
            await chrome.storage.local.set({ waitingForConfirmation: false });
            overlay.remove();
            if (this.onEndWorkflow) {
                this.onEndWorkflow();
            }
        });

        // 要素を組み立て
        box.appendChild(title);
        box.appendChild(description);
        box.appendChild(workflowSummary);
        buttonContainer.appendChild(continueButton);
        buttonContainer.appendChild(endButton);
        box.appendChild(buttonContainer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

}
