// タイムスタンプフォーマット用ユーティリティ
// 純粋関数なので副作用なし

export class TimeFormatter {
    /**
     * タイムスタンプを "YYYY-MM-DD HH:MM" 形式にフォーマット
     * @param {number} timestamp - Unix timestamp (ミリ秒)
     * @returns {string} フォーマットされた日時文字列
     */
    static format(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    /**
     * タイムスタンプを "YYYY-MM-DD HH:MM:SS" 形式にフォーマット（秒付き）
     * @param {number} timestamp - Unix timestamp (ミリ秒)
     * @returns {string} フォーマットされた日時文字列
     */
    static formatWithSeconds(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * ISO 8601形式の文字列を返す（データエクスポート用）
     * @param {number} timestamp - Unix timestamp (ミリ秒)
     * @returns {string} ISO 8601形式の日時文字列
     */
    static toISO(timestamp) {
        return new Date(timestamp).toISOString();
    }

    /**
     * 相対時間を表示（例：「3分前」「2時間前」）
     * @param {number} timestamp - Unix timestamp (ミリ秒)
     * @returns {string} 相対時間文字列
     */
    static relative(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return `${seconds}秒前`;
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        if (days < 7) return `${days}日前`;

        // 1週間以上前は通常のフォーマットで表示
        return TimeFormatter.format(timestamp);
    }
}
