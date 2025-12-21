// URL検証用ユーティリティ
// 純粋関数なので副作用なし

export class UrlValidator {
    /**
     * ブックマーク可能なURLかどうかを判定
     * @param {string} url - 検証するURL
     * @returns {boolean} ブックマーク可能ならtrue
     */
    static isBookmarkable(url) {
        if (!url) return false;

        // 無効なURLプロトコルをチェック
        const invalidProtocols = [
            'chrome://',
            'chrome-extension://',
            'about:',
            'edge://',
            'opera://',
            'brave://'
        ];

        return !invalidProtocols.some(protocol => url.startsWith(protocol));
    }

    /**
     * ページトラッキング対象のURLかどうかを判定
     * @param {string} url - 検証するURL
     * @returns {boolean} トラッキング対象ならtrue
     */
    static isTrackable(url) {
        if (!url) return false;

        // 内部ページは除外
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
            return false;
        }

        return true;
    }

    /**
     * 有効なHTTP(S) URLかどうかを判定
     * @param {string} url - 検証するURL
     * @returns {boolean} 有効なHTTP(S) URLならtrue
     */
    static isValidHttpUrl(url) {
        if (!url) return false;

        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    /**
     * URLからドメインを抽出
     * @param {string} url - URL
     * @returns {string|null} ドメイン名（抽出失敗時はnull）
     */
    static extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return null;
        }
    }

    /**
     * URLが同じドメインかどうかを判定
     * @param {string} url1 - 比較するURL1
     * @param {string} url2 - 比較するURL2
     * @returns {boolean} 同じドメインならtrue
     */
    static isSameDomain(url1, url2) {
        const domain1 = UrlValidator.extractDomain(url1);
        const domain2 = UrlValidator.extractDomain(url2);

        return domain1 !== null && domain2 !== null && domain1 === domain2;
    }

    // ========================================
    // AI生成URLの検証とサニタイゼーション機能
    // ========================================

    // 主要サイトのベースURL辞書（フォールバック用）
    static BASE_URLS = {
        'google.com': 'https://www.google.com',
        'scholar.google.com': 'https://scholar.google.com',
        'docs.google.com': 'https://docs.google.com',
        'slides.google.com': 'https://slides.google.com',
        'sheets.google.com': 'https://sheets.google.com',
        'drive.google.com': 'https://drive.google.com',
        'mail.google.com': 'https://mail.google.com',
        'youtube.com': 'https://www.youtube.com',
        'wikipedia.org': 'https://ja.wikipedia.org',
        'amazon.co.jp': 'https://www.amazon.co.jp',
        'paperdive.app': 'https://www.paperdive.app',
        'overleaf.com': 'https://www.overleaf.com',
        'jalan.net': 'https://www.jalan.net',
        'rakuten.co.jp': 'https://travel.rakuten.co.jp',
        'skyscanner.jp': 'https://www.skyscanner.jp',
        'eki-net.com': 'https://www.eki-net.com'
    };

    /**
     * AI生成URLを検証し、必要に応じてサニタイゼーションを行う
     * @param {string} url - 検証するURL
     * @param {string} title - ツールのタイトル（ログ用）
     * @returns {Object} { url: string, isValid: boolean, error: string|null }
     */
    static validateAIGeneratedURL(url, title = '') {
        if (!url || typeof url !== 'string') {
            console.warn(`[URL検証] 無効なURL（空またはstring以外）: ${title}`);
            return {
                url: '',
                isValid: false,
                error: 'URLが空または無効な型です'
            };
        }

        // 基本的なURL形式チェック
        try {
            const urlObj = new URL(url);

            // プロトコルチェック（http/httpsのみ許可）
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                console.warn(`[URL検証] 無効なプロトコル: ${url}`);
                return this.fallbackToBaseURL(url, title, '無効なプロトコル');
            }

            // ホスト名チェック
            if (!urlObj.hostname) {
                console.warn(`[URL検証] ホスト名が見つかりません: ${url}`);
                return this.fallbackToBaseURL(url, title, 'ホスト名が見つかりません');
            }

            // URLエンコーディングの検証（不正な文字が含まれていないか）
            const sanitized = this.sanitizeURL(url);
            if (sanitized !== url) {
                console.log(`[URL検証] URLをサニタイズしました: ${title}`);
                console.log(`  元: ${url}`);
                console.log(`  後: ${sanitized}`);
                return {
                    url: sanitized,
                    isValid: true,
                    error: null
                };
            }

            // 検証成功
            return {
                url: url,
                isValid: true,
                error: null
            };

        } catch (e) {
            console.error(`[URL検証] URL解析エラー: ${url}`, e);
            return this.fallbackToBaseURL(url, title, `URL解析エラー: ${e.message}`);
        }
    }

    /**
     * URLをサニタイズ（不正な文字を修正）
     * @param {string} url - サニタイズするURL
     * @returns {string} サニタイズ後のURL
     */
    static sanitizeURL(url) {
        try {
            const urlObj = new URL(url);

            // クエリパラメータのサニタイズ
            const params = new URLSearchParams(urlObj.search);
            const sanitizedParams = new URLSearchParams();

            for (const [key, value] of params) {
                // 空白をプラスに変換、その他の不正な文字を除去
                const sanitizedValue = value
                    .replace(/\s+/g, '+')  // 空白を+に変換
                    .replace(/[^\w\+\-\.\_\~\:\/\?\#\[\]\@\!\$\&\'\(\)\*\,\;\=\%]/g, '');  // 不正な文字を除去

                sanitizedParams.set(key, sanitizedValue);
            }

            // サニタイズしたパラメータで再構築
            urlObj.search = sanitizedParams.toString();

            return urlObj.toString();
        } catch (e) {
            // サニタイズに失敗した場合は元のURLを返す
            return url;
        }
    }

    /**
     * ベースURLへのフォールバック
     * @param {string} invalidUrl - 無効なURL
     * @param {string} title - ツールのタイトル
     * @param {string} reason - フォールバックの理由
     * @returns {Object} { url: string, isValid: boolean, error: string }
     */
    static fallbackToBaseURL(invalidUrl, title, reason) {
        // URLからホスト名を抽出してベースURLを探す
        try {
            const hostname = new URL(invalidUrl).hostname.replace('www.', '');

            // ベースURL辞書から探す
            for (const [domain, baseUrl] of Object.entries(this.BASE_URLS)) {
                if (hostname.includes(domain)) {
                    console.log(`[URL検証] ベースURLにフォールバック: ${title}`);
                    console.log(`  元: ${invalidUrl}`);
                    console.log(`  後: ${baseUrl}`);
                    return {
                        url: baseUrl,
                        isValid: true,
                        error: `フォールバック: ${reason}`
                    };
                }
            }
        } catch (e) {
            // ホスト名の抽出に失敗
        }

        // ベースURLが見つからない場合は空文字列を返す
        console.warn(`[URL検証] フォールバック先が見つかりません: ${title} (${invalidUrl})`);
        return {
            url: '',
            isValid: false,
            error: `フォールバック失敗: ${reason}`
        };
    }

    /**
     * アクション配列のURLを一括検証
     * @param {Array} actions - アクションの配列
     * @returns {Array} 検証済みのアクション配列
     */
    static validateActions(actions) {
        if (!Array.isArray(actions)) {
            console.error('[URL検証] actionsが配列ではありません');
            return [];
        }

        return actions.map(action => {
            const result = this.validateAIGeneratedURL(action.url, action.title);

            if (result.error) {
                console.warn(`[URL検証] アクション "${action.title}" のURL検証で問題: ${result.error}`);
            }

            return {
                ...action,
                url: result.url
            };
        }).filter(action => action.url);  // URLが空のアクションを除外
    }
}
