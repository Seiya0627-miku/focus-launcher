// 振り返り画面の管理
class ReflectionManager {
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
        try {
            // 現在のワークフローからアクセスしたページを取得
            const result = await chrome.storage.local.get(['currentWorkflow']);
            if (result.currentWorkflow) {
                // 実際の実装では、タブの履歴からページ情報を取得
                // 今回は仮のデータで実装
                this.visitedPages = [
                    { title: "Google Docs", url: "https://docs.google.com", timestamp: Date.now() - 300000 },
                    { title: "Google Scholar", url: "https://scholar.google.com", timestamp: Date.now() - 240000 },
                    { title: "Wikipedia", url: "https://ja.wikipedia.org", timestamp: Date.now() - 180000 },
                    { title: "YouTube", url: "https://youtube.com", timestamp: Date.now() - 120000 }
                ];
            }
        } catch (error) {
            console.error('アクセスページの取得に失敗しました:', error);
        }
    }

    renderPageList() {
        const pageList = document.getElementById('page-list');
        pageList.innerHTML = '';

        if (this.visitedPages.length === 0) {
            pageList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">アクセスしたページはありません。</p>';
            return;
        }

        this.visitedPages.forEach((page, index) => {
            const pageItem = document.createElement('div');
            pageItem.className = 'page-item';
            pageItem.innerHTML = `
                <input type="checkbox" id="page-${index}" data-index="${index}">
                <div class="page-info">
                    <div class="page-title">${page.title}</div>
                    <div class="page-url">${page.url}</div>
                </div>
            `;
            pageList.appendChild(pageItem);
        });
    }

    async handleConfirmation() {
        try {
            // チェックされたページを取得
            const checkedPages = [];
            const checkboxes = document.querySelectorAll('#page-list input[type="checkbox"]:checked');
            
            checkboxes.forEach(checkbox => {
                const index = parseInt(checkbox.dataset.index);
                checkedPages.push(this.visitedPages[index]);
            });

            // ログを保存（詳細情報は伏せる）
            await this.saveReflectionLog(checkedPages);

            // ホーム画面に戻る
            this.returnToHome();
            
        } catch (error) {
            console.error('振り返りデータの保存に失敗しました:', error);
            alert('データの保存に失敗しました。もう一度お試しください。');
        }
    }

    async saveReflectionLog(regrettedPages) {
        // 振り返りログを保存
        const reflectionLog = {
            timestamp: Date.now(),
            totalPages: this.visitedPages.length,
            regrettedPages: regrettedPages.length,
            regrettedPageTitles: regrettedPages.map(p => p.title), // タイトルのみ保存
            pageSequence: this.visitedPages.map(p => ({ 
                title: p.title, 
                timestamp: p.timestamp 
            })) // 時系列は保持
        };

        await chrome.storage.local.set({ 
            lastReflectionLog: reflectionLog 
        });

        // ログを記録
        await chrome.runtime.sendMessage({
            action: 'saveLog',
            eventType: 'workflow_reflection',
            data: reflectionLog
        });
    }

    returnToHome() {
        // 本来のendWorkflowと同じ処理を実行
        chrome.runtime.sendMessage({
            action: 'endWorkflow'
        }).then(() => {
            // ワークフロー終了後、新しいタブで入力画面を開く
            chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
            
            // 現在の振り返り画面のタブを閉じる
            chrome.tabs.getCurrent().then(currentTab => {
                if (currentTab) {
                    chrome.tabs.remove(currentTab.id);
                }
            });
        });
    }
}

// 振り返り画面の初期化
document.addEventListener('DOMContentLoaded', () => {
    new ReflectionManager();
});
