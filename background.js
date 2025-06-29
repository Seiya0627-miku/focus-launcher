// Focus Launcher - バックグラウンドスクリプト

// 拡張機能のインストール時の処理
chrome.runtime.onInstalled.addListener(() => {
    console.log('Focus Launcher がインストールされました');
    
    // 初期設定
    chrome.storage.local.set({
        isFirstRun: true,
        currentWorkflow: null
    });
});

// タブが更新されたときの処理
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url === 'chrome://newtab/') {
        // 新しいタブが開かれたとき、現在のワークフローを確認
        chrome.storage.local.get(['currentWorkflow'], (result) => {
            if (result.currentWorkflow) {
                // ワークフローが進行中の場合は、そのまま新しいタブで表示
                console.log('進行中のワークフローがあります:', result.currentWorkflow.text);
            }
        });
    }
});

// ブラウザが閉じられるときの処理
chrome.runtime.onSuspend.addListener(() => {
    // ブラウザが閉じられるときにワークフローをクリア
    chrome.storage.local.remove(['currentWorkflow'], () => {
        console.log('ブラウザが閉じられました。ワークフローをクリアしました。');
    });
});

// メッセージの処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentWorkflow') {
        chrome.storage.local.get(['currentWorkflow'], (result) => {
            sendResponse({ workflow: result.currentWorkflow });
        });
        return true; // 非同期レスポンスを示す
    }
    
    if (request.action === 'setCurrentWorkflow') {
        chrome.storage.local.set({ currentWorkflow: request.workflow }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
    
    if (request.action === 'clearCurrentWorkflow') {
        chrome.storage.local.remove(['currentWorkflow'], () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// 定期的なクリーンアップ（24時間経過したワークフローを削除）
setInterval(() => {
    chrome.storage.local.get(['currentWorkflow'], (result) => {
        if (result.currentWorkflow) {
            const now = Date.now();
            const workflowAge = now - result.currentWorkflow.timestamp;
            const oneDay = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）
            
            if (workflowAge > oneDay) {
                chrome.storage.local.remove(['currentWorkflow'], () => {
                    console.log('24時間経過したワークフローを削除しました');
                });
            }
        }
    });
}, 60 * 60 * 1000); // 1時間ごとにチェック 