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
}
