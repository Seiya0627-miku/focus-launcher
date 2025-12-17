// ログ管理モジュール
// すべてのログ保存・取得を一元管理

import { StorageManager } from './storage-manager.js';

export class Logger {
    /**
     * ログを保存
     * @param {string} eventType - イベントタイプ（例：'workflow_completed'）
     * @param {Object} data - ログデータ
     * @returns {Promise<void>}
     */
    static async save(eventType, data) {
        try {
            // background.jsのsaveLogメソッド経由で保存
            // （既存の実装を維持するため、chrome.runtime.sendMessageを使用）
            await chrome.runtime.sendMessage({
                action: 'saveLog',
                eventType: eventType,
                data: data
            });
        } catch (error) {
            console.error('ログ保存に失敗しました:', error);
            throw error;
        }
    }

    /**
     * すべてのログを取得
     * @returns {Promise<Array>} ログの配列
     */
    static async getLogs() {
        return await StorageManager.getLogs();
    }

    /**
     * ワークフロー完了ログを作成
     * @param {Object} params - ログパラメータ
     * @param {string} params.workflowText - ワークフローのテキスト
     * @param {number} params.startTime - 開始時刻
     * @param {number} params.reflectionTime - 振り返り開始時刻
     * @param {number} params.endTime - 終了時刻
     * @param {Array} params.fixRequests - 修正要求履歴
     * @param {Array} params.purposeChecks - 意図再確認履歴
     * @param {Array} params.clarificationQuestions - 追加質問履歴
     * @param {Array} params.pageEvaluations - ページ評価
     * @returns {Object} 統一ログオブジェクト
     */
    static createWorkflowCompletedLog(params) {
        return {
            workflowText: params.workflowText,
            startTime: params.startTime,
            reflectionTime: params.reflectionTime,
            endTime: params.endTime,
            fixRequests: params.fixRequests || [],
            purposeChecks: params.purposeChecks || [],
            clarificationQuestions: params.clarificationQuestions || [],
            pageEvaluations: params.pageEvaluations || []
        };
    }

    /**
     * ブックマーク作成ログを作成
     * @param {string} bookmarkId - ブックマークID
     * @param {string} url - URL
     * @param {string} purpose - 目的
     * @returns {Object} ログオブジェクト
     */
    static createBookmarkLog(bookmarkId, url, purpose) {
        return {
            bookmarkId,
            url,
            purpose
        };
    }
}
