// 404エラー検出とトップページリダイレクト機能
// Content Scriptとして実行されるため、export構文は使用しない

(function() {
    'use strict';

    class ErrorRedirect {
    /**
     * 初期化 - ページ読み込み時に404チェックを実行
     */
    static init() {
        if (document.readyState === 'complete') {
            this.check404();
        } else {
            window.addEventListener('load', () => this.check404());
        }
    }

    /**
     * 404ページかどうかをチェック
     */
    static check404() {
        console.log('[ErrorRedirect] ページチェック開始:', location.href);
        console.log('[ErrorRedirect] タイトル:', document.title);

        // 一般的な404ページの特徴を検出
        const title = document.title.toLowerCase();
        const bodyText = document.body.textContent.toLowerCase();

        // より多くのエラーパターンを検出
        const is404 =
            title.includes('404') ||
            title.includes('not found') ||
            title.includes('page not found') ||
            title.includes('ページが見つかりません') ||
            title.includes('お探しのページが見つかりません') ||
            title.includes('エラー') ||
            title.includes('error') ||
            bodyText.includes('404 not found') ||
            bodyText.includes('404 error') ||
            bodyText.includes('ページが見つかりませんでした') ||
            bodyText.includes('お探しのページは見つかりませんでした') ||
            bodyText.includes('指定されたページは存在しません') ||
            bodyText.includes('アクセスしようとしたページは削除された') ||
            // じゃらん特有のエラーメッセージ
            (location.hostname.includes('jalan.net') && (
                bodyText.includes('該当するページがありません') ||
                bodyText.includes('ページが存在しません') ||
                bodyText.includes('条件に該当する') && bodyText.includes('見つかりませんでした')
            ));

        // HTTP レスポンスステータスのチェック
        const performanceEntries = performance.getEntriesByType('navigation');
        const is404Status = performanceEntries.some(entry => {
            return entry.responseStatus === 404;
        });

        console.log('[ErrorRedirect] 404検出:', is404 ? 'テキスト検出' : (is404Status ? 'ステータスコード検出' : 'なし'));

        if (is404 || is404Status) {
            console.log('[ErrorRedirect] 404ページを検出しました');
            this.handleRedirect();
        } else {
            console.log('[ErrorRedirect] 正常なページです');
        }
    }

    /**
     * リダイレクト処理
     */
    static handleRedirect() {
        const baseUrl = `${location.protocol}//${location.hostname}`;

        console.log(`[404検知] ${baseUrl} へリダイレクトします`);

        // 通知を表示してリダイレクト
        this.showRedirectNotification(baseUrl);
    }

    /**
     * リダイレクト通知を表示
     * @param {string} baseUrl - リダイレクト先のURL
     */
    static showRedirectNotification(baseUrl) {
        // 既存の通知があれば削除
        const existing = document.getElementById('focus-launcher-404-notification');
        if (existing) {
            existing.remove();
        }

        // 通知要素を作成
        const notification = document.createElement('div');
        notification.id = 'focus-launcher-404-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 25px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
        `;

        // カウントダウン用の変数
        let countdown = 3;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
                <strong style="font-size: 16px;">ページが見つかりません</strong>
            </div>
            <div style="margin-bottom: 15px;">
                <span id="countdown-text">${countdown}</span>秒後にトップページへ移動します
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="redirect-now-btn" style="
                    flex: 1;
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">今すぐ移動</button>
                <button id="cancel-redirect-btn" style="
                    flex: 1;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid white;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">キャンセル</button>
            </div>
        `;

        // CSSアニメーションを追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            #redirect-now-btn:hover, #cancel-redirect-btn:hover {
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // リダイレクト処理
        const redirect = () => {
            clearInterval(countdownInterval);
            notification.remove();
            location.href = baseUrl;
        };

        // キャンセル処理
        const cancel = () => {
            clearInterval(countdownInterval);
            notification.remove();
        };

        // カウントダウン
        const countdownInterval = setInterval(() => {
            countdown--;
            const countdownText = document.getElementById('countdown-text');
            if (countdownText) {
                countdownText.textContent = countdown;
            }

            if (countdown <= 0) {
                redirect();
            }
        }, 1000);

        // ボタンのイベントリスナー
        const redirectBtn = document.getElementById('redirect-now-btn');
        const cancelBtn = document.getElementById('cancel-redirect-btn');

        if (redirectBtn) {
            redirectBtn.addEventListener('click', redirect);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', cancel);
        }
    }
    }

    // 自動初期化
    if (document.readyState === 'complete') {
        ErrorRedirect.init();
    } else {
        window.addEventListener('load', () => ErrorRedirect.init());
    }

})(); // IIFE終了
