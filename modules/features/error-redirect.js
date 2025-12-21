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

        // 即座にリダイレクト
        console.log(`[404検知] ${baseUrl} へ即座にリダイレクトします`);
        location.href = baseUrl;
    }
    }

    // 自動初期化
    if (document.readyState === 'complete') {
        ErrorRedirect.init();
    } else {
        window.addEventListener('load', () => ErrorRedirect.init());
    }

})(); // IIFE終了
