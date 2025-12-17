// ワークフロー管理モジュール
// ワークフローの開始・終了・更新を一元管理

import { StorageManager } from './storage-manager.js';

export class WorkflowManager {
    /**
     * 新しいワークフローを開始
     * @param {string} workflowText - ワークフローのテキスト
     * @param {Object} aiContent - AI生成コンテンツ（オプション）
     * @returns {Promise<Object>} 作成されたワークフロー
     */
    static async start(workflowText, aiContent = null) {
        const workflow = {
            text: workflowText,
            timestamp: Date.now(),
            aiContent: aiContent,
            feedback: null,
            fixRequests: [],
            purposeChecks: [],
            clarificationQuestions: []
        };

        await StorageManager.set({ currentWorkflow: workflow });

        // 訪問ページ履歴をクリア
        await StorageManager.remove(['currentWorkflowVisitedPages']);

        console.log('新しいワークフローを開始しました:', workflowText);
        return workflow;
    }

    /**
     * 現在のワークフローを取得
     * @returns {Promise<Object|null>} ワークフロー情報、または null
     */
    static async getCurrent() {
        return await StorageManager.getCurrentWorkflow();
    }

    /**
     * ワークフローを更新
     * @param {Object} workflow - 更新するワークフロー
     * @returns {Promise<void>}
     */
    static async update(workflow) {
        await StorageManager.set({ currentWorkflow: workflow });
        console.log('ワークフローを更新しました');
    }

    /**
     * ワークフローにAIコンテンツを設定
     * @param {Object} workflow - ワークフロー
     * @param {Object} aiContent - AI生成コンテンツ
     * @returns {Object} 更新されたワークフロー
     */
    static setAiContent(workflow, aiContent) {
        return {
            ...workflow,
            aiContent: aiContent
        };
    }

    /**
     * ワークフローに修正要求を追加
     * @param {Object} workflow - ワークフロー
     * @param {string} feedbackText - 修正要求テキスト
     * @returns {Object} 更新されたワークフロー
     */
    static addFixRequest(workflow, feedbackText) {
        const fixRequest = {
            text: feedbackText,
            timestamp: Date.now()
        };

        return {
            ...workflow,
            fixRequests: [...(workflow.fixRequests || []), fixRequest],
            feedback: feedbackText
        };
    }

    /**
     * ワークフローに意図再確認を追加
     * @param {Object} workflow - ワークフロー
     * @param {string} text - 再確認テキスト
     * @param {boolean} isSamePurpose - 同じ目的かどうか
     * @returns {Object} 更新されたワークフロー
     */
    static addPurposeCheck(workflow, text, isSamePurpose) {
        const purposeCheck = {
            text: text,
            isSamePurpose: isSamePurpose,
            timestamp: Date.now()
        };

        return {
            ...workflow,
            purposeChecks: [...(workflow.purposeChecks || []), purposeCheck]
        };
    }

    /**
     * ワークフローに追加質問と回答を追加
     * @param {Object} workflow - ワークフロー
     * @param {string} question - 追加の質問
     * @param {string} answer - ユーザーの回答
     * @returns {Object} 更新されたワークフロー
     */
    static addClarificationQuestion(workflow, question, answer) {
        const clarification = {
            question: question,
            answer: answer,
            timestamp: Date.now()
        };

        return {
            ...workflow,
            clarificationQuestions: [...(workflow.clarificationQuestions || []), clarification]
        };
    }

    /**
     * ワークフローを終了（データを削除）
     * @returns {Promise<void>}
     */
    static async end() {
        await StorageManager.remove(['currentWorkflow']);
        await StorageManager.remove(['currentWorkflowVisitedPages']);
        console.log('ワークフローを終了しました');
    }

    /**
     * ワークフローが存在するかチェック
     * @returns {Promise<boolean>} 存在する場合は true
     */
    static async exists() {
        const workflow = await WorkflowManager.getCurrent();
        return workflow !== null && workflow.text !== undefined;
    }
}
