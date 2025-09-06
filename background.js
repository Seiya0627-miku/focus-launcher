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

// 初回利用判別
async function checkFirstTimeUser() {
    console.log('checkFirstTimeUser 関数が実行されました');
    try {
        const result = await chrome.storage.local.get(['experimentId', 'consentGiven']);
        console.log('ストレージから取得したデータ:', result);
        
        const isFirstTime = !result.experimentId || !result.consentGiven;
        const experimentId = result.experimentId || null;
        
        console.log('初回利用判定結果:', { isFirstTime, experimentId });
        
        return {
            isFirstTime: isFirstTime,
            experimentId: experimentId
        };
    } catch (error) {
        console.error('checkFirstTimeUser でエラーが発生:', error);
        return {
            isFirstTime: true,
            experimentId: null
        };
    }
}

// 実験ID生成
function generateExperimentId() {
    const prefix = 'EXP';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// 初回設定完了
async function completeFirstTimeSetup(experimentId) {
    await chrome.storage.local.set({
        experimentId: experimentId,
        consentGiven: true,
        firstUsedAt: new Date().toISOString()
    });
}

// タブが更新されたときの処理
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url === 'chrome://newtab/') {
        // 初回利用チェック
        const { isFirstTime, experimentId } = await checkFirstTimeUser();
        console.log('初回利用チェック:', isFirstTime);
        if (isFirstTime) {
            // 初回利用の場合は確認画面を表示するようメッセージを送信
            chrome.tabs.sendMessage(tabId, {
                action: 'showConsentScreen'
            });
        } else {
            // 既存ユーザーの場合は通常のワークフローを確認
            chrome.storage.local.get(['currentWorkflow'], (result) => {
                if (result.currentWorkflow) {
                    console.log('進行中のワークフローがあります:', result.currentWorkflow.text);
                }
            });
        }
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
    console.log('Background script がメッセージを受信:', request);
    
    if (request.action === 'getCurrentWorkflow') {
        chrome.storage.local.get(['currentWorkflow'], (result) => {
            sendResponse({ workflow: result.currentWorkflow });
        });
        return true;
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
    
    if (request.action === 'checkFirstTimeUser') {
        console.log('checkFirstTimeUser メッセージを処理中...');
        
        // 非同期処理を Promise として扱う
        checkFirstTimeUser()
            .then(result => {
                console.log('checkFirstTimeUser の結果:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('checkFirstTimeUser エラー:', error);
                sendResponse({ 
                    isFirstTime: true, 
                    experimentId: null,
                    error: error.message 
                });
            });
        
        // 非同期レスポンスを有効にする
        return true;
    }
    
    if (request.action === 'test') {
        console.log('テストメッセージを受信しました');
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'generateExperimentId') {
        const experimentId = generateExperimentId();
        sendResponse({ experimentId });
        return true;
    }
    
    if (request.action === 'completeFirstTimeSetup') {
        completeFirstTimeSetup(request.experimentId).then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
    

    // 未知のアクションに対する警告
    console.warn('未知のアクション:', request.action);
    sendResponse({ error: 'Unknown action' });
    return true;
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
