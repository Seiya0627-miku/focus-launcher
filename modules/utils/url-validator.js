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

    // サイト別の検索URL構造（searchKeyword利用時）
    static SEARCH_URL_TEMPLATES = {
        // === 宿泊予約サイト ===
        'jalan.net': (keyword) => `https://www.jalan.net/uw/uwp2000/uww2000init.do?keyword=${encodeURIComponent(keyword)}`,
        'rakuten.co.jp': (keyword) => `https://travel.rakuten.co.jp/yado/search.do?f_keyword=${encodeURIComponent(keyword)}`,
        'booking.com': (keyword) => `https://www.booking.com/searchresults.ja.html?ss=${encodeURIComponent(keyword)}`,
        'agoda.com': (keyword) => `https://www.agoda.com/search?city=${encodeURIComponent(keyword)}`,
        'airbnb.com': (keyword) => `https://www.airbnb.jp/s/${encodeURIComponent(keyword)}/homes`,
        'airbnb.jp': (keyword) => `https://www.airbnb.jp/s/${encodeURIComponent(keyword)}/homes`,
        'hotels.com': (keyword) => `https://jp.hotels.com/search.do?q-destination=${encodeURIComponent(keyword)}`,
        'expedia.co.jp': (keyword) => `https://www.expedia.co.jp/Hotel-Search?destination=${encodeURIComponent(keyword)}`,
        'trivago.jp': (keyword) => `https://www.trivago.jp/?search=200-${encodeURIComponent(keyword)}`,
        'ikyu.com': (keyword) => `https://www.ikyu.com/search/?keyword=${encodeURIComponent(keyword)}`,

        // === 航空券・交通 ===
        'skyscanner.jp': (keyword) => `https://www.skyscanner.jp/transport/flights-to/${encodeURIComponent(keyword)}/`,
        'skyscanner.net': (keyword) => `https://www.skyscanner.net/transport/flights-to/${encodeURIComponent(keyword)}/`,
        'ana.co.jp': (keyword) => `https://www.ana.co.jp/ja/jp/`,  // ANA: 検索フォームが複雑なのでトップページ
        'jal.co.jp': (keyword) => `https://www.jal.co.jp/jp/ja/`,  // JAL: 同上
        'eki-net.com': (keyword) => `https://www.eki-net.com/`,  // えきねっと: 同上
        'hyperdia.com': (keyword) => `https://www.hyperdia.com/`,  // ハイパーダイア: 複雑なのでトップページ

        // === ショッピング ===
        'amazon.co.jp': (keyword) => `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`,
        'rakuten.co.jp': (keyword) => `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`,
        'yahoo.co.jp': (keyword) => `https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(keyword)}`,
        'mercari.com': (keyword) => `https://jp.mercari.com/search?keyword=${encodeURIComponent(keyword)}`,
        'kakaku.com': (keyword) => `https://kakaku.com/search_results/${encodeURIComponent(keyword)}/`,

        // === 検索エンジン ===
        'google.com': (keyword) => `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
        'yahoo.co.jp': (keyword) => `https://search.yahoo.co.jp/search?p=${encodeURIComponent(keyword)}`,
        'bing.com': (keyword) => `https://www.bing.com/search?q=${encodeURIComponent(keyword)}`,

        // === 学術・専門 ===
        'scholar.google.com': (keyword) => `https://scholar.google.com/scholar?q=${encodeURIComponent(keyword)}`,
        'paperdive.app': (keyword) => `https://www.paperdive.app/?q=${encodeURIComponent(keyword)}`,
        'researchgate.net': (keyword) => `https://www.researchgate.net/search?q=${encodeURIComponent(keyword)}`,
        'ncbi.nlm.nih.gov': (keyword) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(keyword)}`,

        // === 動画・SNS ===
        'youtube.com': (keyword) => `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
        'nicovideo.jp': (keyword) => `https://www.nicovideo.jp/search/${encodeURIComponent(keyword)}`,
        'twitter.com': (keyword) => `https://twitter.com/search?q=${encodeURIComponent(keyword)}`,
        'x.com': (keyword) => `https://twitter.com/search?q=${encodeURIComponent(keyword)}`,

        // === その他 ===
        'wikipedia.org': (keyword) => `https://ja.wikipedia.org/wiki/${encodeURIComponent(keyword)}`,
        'tabelog.com': (keyword) => `https://tabelog.com/keywords/${encodeURIComponent(keyword)}/`,
        'gurunavi.com': (keyword) => `https://www.gurunavi.com/search/?freeword=${encodeURIComponent(keyword)}`,
        'hotpepper.jp': (keyword) => `https://www.hotpepper.jp/SA11/search/?keyword=${encodeURIComponent(keyword)}`,
    };

    // 汎用的な検索パラメータ名（テンプレートに登録されていないサイト用）
    static GENERIC_SEARCH_PARAMS = ['q', 'query', 'keyword', 'search', 's', 'k'];

    /**
     * AI生成URLを検証し、必要に応じてサニタイゼーションを行う
     * @param {string} url - 検証するURL
     * @param {string} title - ツールのタイトル（ログ用）
     * @param {boolean} skipSanitize - サニタイズをスキップするか（searchKeyword生成URLの場合true）
     * @returns {Object} { url: string, isValid: boolean, error: string|null }
     */
    static validateAIGeneratedURL(url, title = '', skipSanitize = false) {
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

            // じゃらん・楽天トラベルの無効パターン検出
            const invalidPatternCheck = this.checkInvalidTravelSitePatterns(urlObj, url, title);
            if (invalidPatternCheck) {
                return invalidPatternCheck;
            }

            // searchKeywordで生成されたURLの場合はサニタイズをスキップ
            // （既にencodeURIComponent()で正しくエンコード済みのため）
            if (skipSanitize) {
                console.log(`[URL検証] searchKeyword生成URL、サニタイズスキップ: ${title}`);
                return {
                    url: url,
                    isValid: true,
                    error: null
                };
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
     * 旅行予約サイトの無効パターンをチェック
     * @param {URL} urlObj - URLオブジェクト
     * @param {string} url - 元のURL文字列
     * @param {string} title - ツールのタイトル
     * @returns {Object|null} 無効パターンの場合は修正後のオブジェクト、有効ならnull
     */
    static checkInvalidTravelSitePatterns(urlObj, url, title) {
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;

        // じゃらんの無効パターン検出
        if (hostname.includes('jalan.net')) {
            // トップページ以外のパス（特に /onsen/, /yado/, /travel/ など）は404になりやすい
            // 例: /onsen/TOHOKU/, /yado/tohoku.html, /travel/kanazawa/
            const hasInvalidPath =
                pathname.includes('/onsen/') ||
                pathname.includes('/yado/') ||
                (pathname.includes('/travel/') && pathname !== '/travel/' && pathname !== '/travel') ||
                pathname.match(/\/[A-Z]+\//); // 大文字の地域コード

            if (hasInvalidPath && pathname !== '/' && pathname !== '') {
                console.log(`[URL検証] じゃらんの無効パターンを検出: ${url}`);
                console.log(`  → トップページにフォールバック: https://www.jalan.net/`);
                return {
                    url: 'https://www.jalan.net/',
                    isValid: true,
                    error: 'じゃらん: 無効パターンを検出してトップページにフォールバック'
                };
            }
        }

        // 楽天トラベルの無効パターン検出
        if (hostname.includes('rakuten.co.jp') && hostname.includes('travel')) {
            // トップページ以外のパス（特に /yado/ や .html）は404になりやすい
            // 例: /yado/tohoku.html?f_teikei=onsen
            const hasInvalidPath =
                pathname.includes('/yado/') ||
                pathname.endsWith('.html') ||
                pathname.match(/\/[a-z]+\.html/);

            if (hasInvalidPath && pathname !== '/' && pathname !== '') {
                console.log(`[URL検証] 楽天トラベルの無効パターンを検出: ${url}`);
                console.log(`  → トップページにフォールバック: https://travel.rakuten.co.jp/`);
                return {
                    url: 'https://travel.rakuten.co.jp/',
                    isValid: true,
                    error: '楽天トラベル: 無効パターンを検出してトップページにフォールバック'
                };
            }
        }

        // 有効なパターン
        return null;
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
            console.log(`[URL検証] アクション処理開始: ${action.title}`);
            console.log(`  元のURL: ${action.url}`);
            console.log(`  searchKeyword: "${action.searchKeyword}"`);
            console.log(`  searchKeywordの型: ${typeof action.searchKeyword}`);

            let finalUrl = action.url;
            let isSearchUrl = false;  // searchKeywordで生成されたURLかどうか

            // searchKeywordがある場合、検索URLを生成
            if (action.searchKeyword && action.searchKeyword.trim()) {
                const searchUrl = this.buildSearchURL(action.url, action.searchKeyword, action.title);
                if (searchUrl) {
                    finalUrl = searchUrl;
                    isSearchUrl = true;  // 検索URLフラグを立てる
                    console.log(`[URL検証] 検索URLを生成: ${action.title}`);
                    console.log(`  キーワード: ${action.searchKeyword}`);
                    console.log(`  生成されたURL: ${finalUrl}`);
                }
            } else {
                console.log(`[URL検証] searchKeywordなし、元のURLを使用: ${action.title}`);
            }

            // URL検証（searchKeywordで生成されたURLの場合はsanitizeをスキップ）
            const result = this.validateAIGeneratedURL(finalUrl, action.title, isSearchUrl);

            if (result.error) {
                console.warn(`[URL検証] アクション "${action.title}" のURL検証で問題: ${result.error}`);
            }

            return {
                ...action,
                url: result.url
            };
        }).filter(action => action.url);  // URLが空のアクションを除外
    }

    /**
     * searchKeywordを使って検索URLを生成
     * @param {string} baseUrl - ベースURL
     * @param {string} searchKeyword - 検索キーワード
     * @param {string} title - ツールのタイトル
     * @returns {string|null} 生成された検索URL、またはnull
     */
    static buildSearchURL(baseUrl, searchKeyword, title) {
        try {
            const urlObj = new URL(baseUrl);
            const hostname = urlObj.hostname.replace('www.', '');

            // 1. サイト別の検索URLテンプレートを探す（優先）
            for (const [domain, template] of Object.entries(this.SEARCH_URL_TEMPLATES)) {
                if (hostname.includes(domain)) {
                    const searchUrl = template(searchKeyword);
                    console.log(`[URL検証] テンプレートマッチ: ${domain}`);
                    return searchUrl;
                }
            }

            // 2. テンプレートが見つからない場合、汎用的な検索パラメータを試す
            console.log(`[URL検証] テンプレートなし、汎用パラメータを試行: ${hostname}`);
            return this.tryGenericSearchParams(urlObj, searchKeyword, title);

        } catch (e) {
            console.error(`[URL検証] 検索URL生成エラー: ${title}`, e);
            return null;
        }
    }

    /**
     * 汎用的な検索パラメータを試す（テンプレートに登録されていないサイト用）
     * @param {URL} urlObj - URLオブジェクト
     * @param {string} searchKeyword - 検索キーワード
     * @param {string} title - ツールのタイトル
     * @returns {string|null} 生成された検索URL、またはnull
     */
    static tryGenericSearchParams(urlObj, searchKeyword, title) {
        // ベースURLに一般的な検索パラメータを追加してみる
        // 例: https://example.com/?q=keyword

        for (const param of this.GENERIC_SEARCH_PARAMS) {
            const searchUrl = `${urlObj.origin}${urlObj.pathname}?${param}=${encodeURIComponent(searchKeyword)}`;
            console.log(`[URL検証] 汎用パラメータ試行: ${param} → ${searchUrl}`);
            // 最初の汎用パラメータ（'q'）を使用
            // 実際にどのパラメータが有効かはサイト依存だが、'q'が最も一般的
            return searchUrl;
        }

        // 汎用パラメータでも生成できない場合はnull
        console.log(`[URL検証] 検索URL生成不可: ${title}`);
        return null;
    }
}
