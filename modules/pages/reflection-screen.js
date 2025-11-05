// 振り返り画面

// 新しいモジュールをインポート（段階的移行）
import { TimeFormatter } from '../utils/time-formatter.js';
import { StorageManager } from '../core/storage-manager.js';
import { WorkflowManager } from '../core/workflow-manager.js';
import { Logger } from '../core/logger.js';

export class ReflectionScreen {
    constructor() {
        this.visitedPages = [];
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadVisitedPages();
        this.renderPageList();
    }

    bindEvents() {
        // 確認ボタン
        document.getElementById('confirm-reflection').addEventListener('click', () => {
            this.handleConfirmation();
        });
    }

    async loadVisitedPages() {
        // 新しいモジュールを使用（段階的移行）
        this.visitedPages = await StorageManager.getVisitedPages();

        // 既存のコードは残す（念のため）
        // try {
        //     // currentWorkflowVisitedPagesから取得
        //     const result = await chrome.storage.local.get(['currentWorkflowVisitedPages']);
        //     if (result.currentWorkflowVisitedPages) {
        //         this.visitedPages = result.currentWorkflowVisitedPages;
        //     } else {
        //         this.visitedPages = [];
        //     }
        // } catch (error) {
        //     console.error('アクセスページの取得に失敗しました:', error);
        //     this.visitedPages = [];
        // }
    }

    renderPageList() {
        const pageList = document.getElementById('page-list');
        pageList.innerHTML = '';

        if (this.visitedPages.length === 0) {
            pageList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">アクセスしたページはありません。</p>';
            return;
        }

        // タイムスタンプでソート（古い順）
        const sortedPages = [...this.visitedPages].sort((a, b) => a.timestamp - b.timestamp);

        sortedPages.forEach((page, index) => {
            const pageItem = document.createElement('div');
            pageItem.className = 'page-item';

            // タイムスタンプをフォーマット
            const formattedTime = this.formatTimestamp(page.timestamp);

            pageItem.innerHTML = `
                <input type="checkbox" id="page-${index}" data-index="${index}">
                <div class="page-info">
                    <div class="page-title">
                        <a href="${page.url}" target="_blank" rel="noopener noreferrer">${page.title}</a>
                    </div>
                    <div class="page-timestamp">${formattedTime}</div>
                </div>
            `;
            pageList.appendChild(pageItem);
        });
    }

    formatTimestamp(timestamp) {
        // 新しいモジュールを使用（段階的移行）
        return TimeFormatter.format(timestamp);

        // 既存のコードは残す（念のため）
        // const date = new Date(timestamp);
        // const year = date.getFullYear();
        // const month = String(date.getMonth() + 1).padStart(2, '0');
        // const day = String(date.getDate()).padStart(2, '0');
        // const hours = String(date.getHours()).padStart(2, '0');
        // const minutes = String(date.getMinutes()).padStart(2, '0');
        //
        // return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    async handleConfirmation() {
        try {
            // チェックされたページを取得
            const checkedPages = [];
            const checkboxes = document.querySelectorAll('#page-list input[type="checkbox"]:checked');

            checkboxes.forEach(checkbox => {
                const index = parseInt(checkbox.dataset.index);
                // ソートされた配列から元のインデックスを取得
                const sortedPages = [...this.visitedPages].sort((a, b) => a.timestamp - b.timestamp);
                checkedPages.push(sortedPages[index]);
            });

            // ページの評価を保存
            await this.savePageEvaluations(checkedPages);

            // ホーム画面に戻る
            this.returnToHome();

        } catch (error) {
            console.error('振り返りデータの保存に失敗しました:', error);
            alert('データの保存に失敗しました。もう一度お試しください。');
        }
    }

    async savePageEvaluations(regrettedPages) {
        try {
            // 新しいモジュールを使用（段階的移行）
            const currentWorkflow = await WorkflowManager.getCurrent();

            if (!currentWorkflow) {
                console.error('ワークフロー情報が見つかりません');
                return;
            }

            // 各ページの評価を作成
            const pageEvaluations = this.visitedPages.map(page => ({
                evaluation: regrettedPages.some(regretted => regretted.url === page.url) ? 0 : 1, // 0:後悔なし 1:後悔あり
                timestamp: page.timestamp
            }));

            // 統一ログを作成
            const temp = await chrome.storage.local.get(['reflectionTime']);

            const unifiedLog = Logger.createWorkflowCompletedLog({
                workflowText: currentWorkflow.text,
                startTime: currentWorkflow.timestamp,
                reflectionTime: temp.reflectionTime,
                endTime: Date.now(),
                fixRequests: currentWorkflow.fixRequests || [],
                purposeChecks: currentWorkflow.purposeChecks || [],
                pageEvaluations: pageEvaluations
            });

            // ログを記録
            await Logger.save('workflow_completed', unifiedLog);

            // ワークフローを終了（新しいモジュールを使用）
            await WorkflowManager.end();

            console.log('統一ログを保存しました:', unifiedLog);

        } catch (error) {
            console.error('統一ログの保存に失敗しました:', error);
            throw error;
        }
    }

    async returnToHome() {
        // ワークフロー終了後、新しいタブで入力画面を開く
        chrome.tabs.create({ url: chrome.runtime.getURL('views/newtab.html') });

        // 現在の振り返り画面のタブを閉じる
        chrome.tabs.getCurrent().then(currentTab => {
            if (currentTab) {
                chrome.tabs.remove(currentTab.id);
            }
        });
    }
}
