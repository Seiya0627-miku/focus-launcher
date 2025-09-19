// Focus Launcher - バックグラウンドスクリプト
console.log("[DEBUG] background.js loaded");


// 拡張機能のインストール時の処理
chrome.runtime.onInstalled.addListener(() => { 
    // 初期設定
    chrome.storage.local.set({
        isFirstRun: true,
        currentWorkflow: null,
        waitingForConfirmation: false 
    });
});

// 初回利用判別
async function checkFirstTimeUser() {
    // console.log('checkFirstTimeUser 関数が実行されました');
    try {
        const result = await chrome.storage.local.get(['experimentId', 'consentGiven']);
        // console.log('ストレージから取得したデータ:', result);
        
        const isFirstTime = !result.experimentId || !result.consentGiven;
        const experimentId = result.experimentId || null;
        
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

// データリセット
async function resetUserData() {
    try {
        await chrome.storage.local.clear();
        console.log('ユーザーデータをリセットしました');
    } catch (error) {
        console.error('データリセットに失敗しました:', error);
        throw error;
    }
}

// ログ保存関数
async function saveLog(eventType, data) {
        
    const result = await chrome.storage.local.get(['logs']);
    const logs = result.logs || [];
    logs.push(data);
    
    await chrome.storage.local.set({ logs: logs });
}

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

    if (request.action === 'resetUserData') {
        resetUserData().then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            console.error('データリセットエラー:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    if (request.action === 'reloadPage') {
        // newtab.js の方で処理
        return true;
    }


    // ログの保存
    if (request.action === 'saveLog') {
        saveLog(request.eventType, request.data).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            console.error('ログ保存エラー:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    if (msg.action === "confirmationDone") {
        chrome.storage.local.set({ waitingForConfirmation: false }, () => {
            console.log("[DEBUG] 確認待ち状態を解除しました");
        });
        sendResponse({ success: true });
    }

    // 未知のアクションに対する警告
    console.warn('未知のアクション:', request.action);
    sendResponse({ error: 'Unknown action' });
    return true;
});

// 新しいタブで overlay を表示
chrome.tabs.onCreated.addListener((tab) => {
    chrome.storage.local.get(['waitingForConfirmation'], (result) => {
        if (result.waitingForConfirmation) {
            if (tab.url.startsWith("http") || tab.url.startsWith("https")) {
                chrome.tabs.sendMessage(tab.id, { action: "showOverlay" }, (res) => {
                    if (chrome.runtime.lastError) console.log("sendMessage失敗:", chrome.runtime.lastError.message);
                });
            }
        }
    });
});

// ==== idle監視用テストコード ====

// 放置時間しきい値（秒単位）
const IDLE_SECONDS = 15; // 15秒放置でテスト

// idle API の監視を開始
chrome.idle.setDetectionInterval(IDLE_SECONDS);
console.log("[IDLE DEBUG] idle監視を開始（", IDLE_SECONDS, "秒）");


// idleイベントリスナ
chrome.idle.setDetectionInterval(IDLE_SECONDS);
chrome.idle.onStateChanged.addListener((newState) => {
    if (newState === "idle" || newState === "locked") {
        chrome.storage.local.get(["currentWorkflow", "waitingForConfirmation"], (res) => {
            if (res.currentWorkflow?.text && !res.waitingForConfirmation) {
                console.log("[IDLE DEBUG] 放置検知 → 確認待ち状態へ");
                chrome.storage.local.set({ waitingForConfirmation: true }, () => {
                    openOverlayTab();
                });
            }
        });
    }
});

// 新しいタブを開き overlay を実行
function openOverlayTab() {
    chrome.tabs.create({ url: "newtab.html" }, (tab) => {
        console.log("[DEBUG] 新しいタブを開きました", tab.id);

        // タブの読み込み完了を待つ
        const listener = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === "complete") {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["overlayContent.js"]
                }, () => {
                    if (chrome.runtime.lastError)
                        console.log("executeScript失敗:", chrome.runtime.lastError.message);
                });
                chrome.tabs.onUpdated.removeListener(listener);
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}
