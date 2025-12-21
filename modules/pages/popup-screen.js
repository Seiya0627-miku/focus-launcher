// Focus Launcher - ポップアップ画面

// 新しいモジュールをインポート（段階的移行）
import { UrlValidator } from '../utils/url-validator.js';
import { Logger } from '../core/logger.js';

export class PopupScreen {
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
            this.showReflectionScreen();
        });

        // 保存ボタン
        document.getElementById("bookmark-current-page").addEventListener("click", async () => {
            await this.bookmarkCurrentPage();
        });

        // データエクスポートボタン
        document.getElementById("export-data-btn").addEventListener("click", async () => {
            await this.exportExperimentData();
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

    async showReflectionScreen() {
        try {
            // 振り返り画面を新しいタブで開く
            const reflectionUrl = chrome.runtime.getURL('views/reflection.html');
            await chrome.tabs.create({ url: reflectionUrl });

            // ポップアップを閉じる
            window.close();
            // 現在のタブを閉じる
            const currentTab = await chrome.tabs.getCurrent();
            if (currentTab) {
                await chrome.tabs.remove(currentTab.id);
            }
        } catch (error) {
            console.error('ワークフロー終了に失敗しました:', error);
            alert('ワークフロー終了に失敗しました。もう一度お試しください。');
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
                alert('保存できるページがありません');
                return;
            }

            // 無効なURLをチェック（新しいモジュールを使用）
            if (!UrlValidator.isBookmarkable(currentTab.url)) {
                alert('このページは保存できません');
                return;
            }

            // 既存のコードは残す（念のため）
            // if (currentTab.url.startsWith('chrome://') ||
            //     currentTab.url.startsWith('chrome-extension://') ||
            //     currentTab.url.startsWith('about:')) {
            //     alert('このページは保存できません');
            //     return;
            // }

            // 保存データを作成
            const bookmark = {
                id: `bookmark_${Date.now()}`,
                url: currentTab.url,
                title: currentTab.title || 'タイトルなし',
                purpose: currentWorkflow.text, // ワークフローの目的を直接使用
                createdAt: new Date().toISOString()
            };

            // ページを保存
            await this.saveBookmark(bookmark);

            // 成功メッセージ
            this.showBookmarkSuccessMessage(bookmark.title);

        } catch (error) {
            console.error('ページの保存に失敗しました:', error);
            alert('ページの保存に失敗しました');
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
                alert('同じ目的でこのページは既に保存されています');
                return;
            }

            bookmarks.push(bookmark);

            await chrome.storage.local.set({ bookmarks: bookmarks });

            // ログに記録（新しいモジュールを使用）
            const logData = Logger.createBookmarkLog(bookmark.id, bookmark.url, bookmark.purpose);
            await Logger.save('bookmark_created', logData);

            // 現在のワークフローのアクションに即座に追加
            await this.addBookmarkToCurrentWorkflow(bookmark);

            console.log('ページを保存しました:', bookmark.title);

        } catch (error) {
            console.error('ページ保存エラー:', error);
            throw error;
        }
    }

    // 保存したページを現在のワークフローのアクションに追加
    async addBookmarkToCurrentWorkflow(bookmark) {
        try {
            const result = await chrome.storage.local.get(['currentWorkflow']);
            const currentWorkflow = result.currentWorkflow;

            if (!currentWorkflow || !currentWorkflow.aiContent) {
                console.log('[ページ追加] ワークフローが存在しないためスキップ');
                return;
            }

            // 保存したページをアクション形式に変換
            const newAction = {
                title: bookmark.title,
                description: `保存したページ: ${bookmark.purpose}`,
                url: bookmark.url,
                icon: '🔖'
            };

            // アクション配列の最後に追加
            if (!currentWorkflow.aiContent.actions) {
                currentWorkflow.aiContent.actions = [];
            }
            currentWorkflow.aiContent.actions.push(newAction);

            // 更新したワークフローを保存
            await chrome.storage.local.set({ currentWorkflow: currentWorkflow });

            console.log('[ページ追加] アクションに追加しました:', bookmark.title);

            // newtab.jsに更新通知を送信（全てのタブに）
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'refreshHomeScreen'
                    });
                } catch (e) {
                    // タブがnewtabでない場合は無視
                }
            }

        } catch (error) {
            console.error('[ページ追加] エラー:', error);
        }
    }

    showBookmarkSuccessMessage(title) {
        // ポップアップ内で成功メッセージを表示
        const statusText = document.getElementById('status-text');
        const originalText = statusText.textContent;

        statusText.textContent = `「${title}」を保存しました`;
        statusText.style.color = '#ffffff';

        // 2秒後に元に戻す
        setTimeout(() => {
            statusText.textContent = originalText;
            statusText.style.color = '';
        }, 2000);
    }

    async exportExperimentData() {
        try {
            // すべての実験データを取得
            const result = await chrome.storage.local.get([
                'experimentId',
                'consentGiven',
                'firstUsedAt',
                'currentWorkflow',
                'currentWorkflowVisitedPages', // 追加
                'bookmarks',
                'logs'
            ]);

            // タイムスタンプを西暦表記に変換する関数
            const convertTimestampToISO = (timestamp) => {
                return timestamp ? new Date(timestamp).toISOString() : null;
            };

            // ログのタイムスタンプを変換する関数
            const convertLogTimestamps = (log) => {
                return {
                    ...log,
                    startTime: convertTimestampToISO(log.startTime),
                    endTime: convertTimestampToISO(log.endTime),
                    reflectionTime: convertTimestampToISO(log.reflectionTime),
                    pageEvaluations: (log.pageEvaluations || []).map(pe => ({
                        ...pe,
                        timestamp: convertTimestampToISO(pe.timestamp)
                    })),
                    fixRequests: (log.fixRequests || []).map(fr => ({
                        ...fr,
                        timestamp: convertTimestampToISO(fr.timestamp)
                    })),
                    purposeChecks: (log.purposeChecks || []).map(pc => ({
                        ...pc,
                        timestamp: convertTimestampToISO(pc.timestamp)
                    })),
                    clarificationQuestions: (log.clarificationQuestions || []).map(cq => ({
                        ...cq,
                        timestamp: convertTimestampToISO(cq.timestamp)
                    }))
                };
            };

            // currentWorkflowが残っている場合、異常終了として扱う
            let finalLogs = result.logs || [];
            if (result.currentWorkflow && result.currentWorkflow.text) {
                console.log('異常終了したワークフローを検出しました:', result.currentWorkflow.text);

                // 訪問ページを取得
                const visitedPages = result.currentWorkflowVisitedPages || [];
                const pageEvaluations = visitedPages.map(page => ({
                    evaluation: null, // 評価なし
                    timestamp: page.timestamp
                }));

                // 異常終了ログを作成
                const abnormalLog = {
                    workflowText: result.currentWorkflow.text,
                    startTime: result.currentWorkflow.timestamp,
                    reflectionTime: null,
                    endTime: Date.now(), // エクスポート時点の時刻
                    fixRequests: result.currentWorkflow.fixRequests || [],
                    purposeChecks: result.currentWorkflow.purposeChecks || [],
                    clarificationQuestions: result.currentWorkflow.clarificationQuestions || [],
                    pageEvaluations: pageEvaluations,
                    abnormalEnd: true // 異常終了フラグ
                };

                // logsの最後に追加
                finalLogs = [...finalLogs, abnormalLog];
            }

            // 全てのログのタイムスタンプを西暦表記に変換
            const convertedLogs = finalLogs.map(convertLogTimestamps);

            // エクスポート用データを整理
            const exportData = {
                experimentId: result.experimentId,
                consentGiven: result.consentGiven,
                firstUsedAt: result.firstUsedAt,
                bookmarks: result.bookmarks || [],
                logs: convertedLogs,
                exportTimestamp: new Date().toISOString(),
                exportVersion: "1.3.0"
            };

            // JSONファイルとしてダウンロード
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `focus-launcher-data-${result.experimentId || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // 成功メッセージ
            this.showExportSuccessMessage();

        } catch (error) {
            console.error('データエクスポートに失敗しました:', error);
            alert('データエクスポートに失敗しました。もう一度お試しください。');
        }
    }

    showExportSuccessMessage() {
        const statusText = document.getElementById('status-text');
        const originalText = statusText.textContent;

        statusText.textContent = '実験データをエクスポートしました';
        statusText.style.color = '#ffffff';

        setTimeout(() => {
            statusText.textContent = originalText;
            statusText.style.color = '';
        }, 2000);
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
