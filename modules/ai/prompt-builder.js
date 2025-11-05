// プロンプト生成ユーティリティ
// テンプレートと実際のデータを組み合わせてプロンプトを生成

import { PROMPT_TEMPLATES } from '../../config/prompt-templates.js';

export class PromptBuilder {
    /**
     * ホーム画面生成用プロンプトを作成
     * @param {string} workflowText - ワークフローのテキスト
     * @param {Array} bookmarks - ブックマークの配列
     * @returns {string} 完成したプロンプト
     */
    static buildHomeScreenPrompt(workflowText, bookmarks = []) {
        let prompt = PROMPT_TEMPLATES.HOME_SCREEN.replace('{workflow}', workflowText);

        // ブックマーク情報を追加
        if (bookmarks.length > 0) {
            let bookmarkContext = '\n\n関連するブックマーク（優先的に活用してください）:\n';
            bookmarks.forEach((bookmark, index) => {
                bookmarkContext += `${index + 1}. ${bookmark.title}\n`;
                bookmarkContext += `   URL: ${bookmark.url}\n`;
                bookmarkContext += `   目的: ${bookmark.purpose}\n\n`;
            });
            prompt += bookmarkContext;
        }

        return prompt;
    }

    /**
     * 修正要求処理用プロンプトを作成
     * @param {Object} currentWorkflow - 現在のワークフロー情報
     * @param {string} feedbackText - ユーザーからの修正要求
     * @returns {string} 完成したプロンプト
     */
    static buildFeedbackPrompt(currentWorkflow, feedbackText) {
        const currentActions = currentWorkflow.aiContent.actions;
        const currentTitle = currentWorkflow.aiContent.title;
        const currentContent = currentWorkflow.aiContent.content;

        let prompt = PROMPT_TEMPLATES.FEEDBACK;
        prompt = prompt.replace('{currentTitle}', currentTitle);
        prompt = prompt.replace('{currentContent}', currentContent);
        prompt = prompt.replace('{currentActions}', currentActions.map(a => a.title).join(', '));
        prompt = prompt.replace('{feedbackText}', feedbackText);

        return prompt;
    }

    /**
     * 利用目的の再確認判定用プロンプトを作成
     * @param {string} pastPurpose - 過去の利用目的
     * @param {string} currentPurpose - 現在の利用目的
     * @returns {string} 完成したプロンプト
     */
    static buildPurposeCheckPrompt(pastPurpose, currentPurpose) {
        let prompt = PROMPT_TEMPLATES.PURPOSE_CHECK;
        prompt = prompt.replace('{pastPurpose}', pastPurpose);
        prompt = prompt.replace('{currentPurpose}', currentPurpose);

        return prompt;
    }
}
