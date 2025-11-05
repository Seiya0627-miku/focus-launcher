// ストレージ管理モジュール
// chrome.storage.local への読み書きを一元管理

export class StorageManager {
    // ===== 読み取り専用メソッド =====

    /**
     * 現在のワークフローを取得
     * @returns {Promise<Object|null>} ワークフロー情報、または null
     */
    static async getCurrentWorkflow() {
        try {
            const result = await chrome.storage.local.get(['currentWorkflow']);
            return result.currentWorkflow || null;
        } catch (error) {
            console.error('getCurrentWorkflow エラー:', error);
            return null;
        }
    }

    /**
     * 訪問ページ履歴を取得
     * @returns {Promise<Array>} 訪問ページの配列
     */
    static async getVisitedPages() {
        try {
            const result = await chrome.storage.local.get(['currentWorkflowVisitedPages']);
            return result.currentWorkflowVisitedPages || [];
        } catch (error) {
            console.error('getVisitedPages エラー:', error);
            return [];
        }
    }

    /**
     * ブックマークを取得
     * @returns {Promise<Array>} ブックマークの配列
     */
    static async getBookmarks() {
        try {
            const result = await chrome.storage.local.get(['bookmarks']);
            return result.bookmarks || [];
        } catch (error) {
            console.error('getBookmarks エラー:', error);
            return [];
        }
    }

    /**
     * 実験IDを取得
     * @returns {Promise<string|null>} 実験ID、または null
     */
    static async getExperimentId() {
        try {
            const result = await chrome.storage.local.get(['experimentId']);
            return result.experimentId || null;
        } catch (error) {
            console.error('getExperimentId エラー:', error);
            return null;
        }
    }

    /**
     * 同意状態を取得
     * @returns {Promise<boolean>} 同意済みなら true
     */
    static async getConsentGiven() {
        try {
            const result = await chrome.storage.local.get(['consentGiven']);
            return result.consentGiven || false;
        } catch (error) {
            console.error('getConsentGiven エラー:', error);
            return false;
        }
    }

    /**
     * ログを取得
     * @returns {Promise<Array>} ログの配列
     */
    static async getLogs() {
        try {
            const result = await chrome.storage.local.get(['logs']);
            return result.logs || [];
        } catch (error) {
            console.error('getLogs エラー:', error);
            return [];
        }
    }

    /**
     * 待機確認状態を取得
     * @returns {Promise<boolean>} 待機中なら true
     */
    static async getWaitingForConfirmation() {
        try {
            const result = await chrome.storage.local.get(['waitingForConfirmation']);
            return result.waitingForConfirmation || false;
        } catch (error) {
            console.error('getWaitingForConfirmation エラー:', error);
            return false;
        }
    }

    /**
     * 汎用的な取得メソッド
     * @param {string|Array<string>} keys - 取得するキー（単一または配列）
     * @returns {Promise<Object>} 取得したデータ
     */
    static async get(keys) {
        try {
            return await chrome.storage.local.get(keys);
        } catch (error) {
            console.error('storage.get エラー:', error);
            return {};
        }
    }

    // ===== 書き込みメソッド（Phase 5で実装予定） =====
    // 現時点では既存のコードをそのまま使用

    /**
     * 汎用的な保存メソッド（既存コードとの互換性のため）
     * @param {Object} data - 保存するデータ
     * @returns {Promise<void>}
     */
    static async set(data) {
        try {
            await chrome.storage.local.set(data);
        } catch (error) {
            console.error('storage.set エラー:', error);
            throw error;
        }
    }

    /**
     * 汎用的な削除メソッド（既存コードとの互換性のため）
     * @param {string|Array<string>} keys - 削除するキー
     * @returns {Promise<void>}
     */
    static async remove(keys) {
        try {
            await chrome.storage.local.remove(keys);
        } catch (error) {
            console.error('storage.remove エラー:', error);
            throw error;
        }
    }

    /**
     * すべてのデータを削除
     * @returns {Promise<void>}
     */
    static async clear() {
        try {
            await chrome.storage.local.clear();
        } catch (error) {
            console.error('storage.clear エラー:', error);
            throw error;
        }
    }

    /**
     * すべてのストレージデータを取得（デバッグ用）
     * @returns {Promise<Object>}
     */
    static async getAll() {
        try {
            return await chrome.storage.local.get(null);
        } catch (error) {
            console.error('storage.getAll エラー:', error);
            return {};
        }
    }
}
