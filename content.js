// Focus Launcher - コンテンツスクリプト

// 現在のワークフローをチェックしてUIを調整
async function checkAndAdjustUI() {
    try {
        const result = await chrome.storage.local.get(['currentWorkflow']);
        
        if (result.currentWorkflow) {
            // ワークフローが進行中の場合は、ブックマークバーを隠す
            hideBookmarksBar();
        } else {
            // ワークフローが終了している場合は、ブックマークバーを表示
            showBookmarksBar();
        }
    } catch (error) {
        console.error('UI調整に失敗しました:', error);
        // エラーが発生した場合は、デフォルトでブックマークバーを隠す
        hideBookmarksBar();
    }
}

// ブックマークバーを隠す
function hideBookmarksBar() {
    const style = document.createElement('style');
    style.id = 'focus-launcher-styles';
    style.textContent = `
        #bookmarksBar,
        .bookmarks-bar,
        [data-testid="bookmarks-bar"],
        .bookmark-bar {
            display: none !important;
        }
        
        /* Chromeのブックマークバーを隠す */
        #bookmarksBar,
        #bookmarksBarContainer {
            display: none !important;
        }
        
        /* その他のブックマークバー関連要素 */
        .bookmarks-toolbar,
        .bookmark-toolbar,
        [data-testid="bookmarks-toolbar"] {
            display: none !important;
        }
    `;
    
    // 既存のスタイルがあれば削除
    const existingStyle = document.getElementById('focus-launcher-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    document.head.appendChild(style);
}

// ブックマークバーを表示
function showBookmarksBar() {
    const style = document.getElementById('focus-launcher-styles');
    if (style) {
        style.remove();
    }
}

// ページ読み込み時にデフォルトでブックマークバーを隠す
function initializeUI() {
    // まずブックマークバーを隠す
    hideBookmarksBar();
    // その後、ワークフロー状態に応じて調整
    checkAndAdjustUI();
}

// ページ読み込み時にUIを初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}

// ストレージの変更を監視
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.currentWorkflow) {
        checkAndAdjustUI();
    }
});

// ページが完全に読み込まれた後に再度チェック
window.addEventListener('load', () => {
    setTimeout(checkAndAdjustUI, 1000);
}); 