// Azure OpenAI API クライアント
// すべてのAzure OpenAI API呼び出しを一元管理

import { API_CONFIG } from '../../config/api-config.js';
import { UrlValidator } from '../utils/url-validator.js';

export class AzureOpenAIClient {
    /**
     * Azure OpenAI APIを呼び出してホーム画面を生成
     * @param {string} prompt - 送信するプロンプト
     * @returns {Promise<Object>} AI応答（title, content, actions）
     */
    static async generateHomeScreen(prompt) {
        const messages = [
            {
                role: 'system',
                content: 'あなたは研究や作業を効率化するためのアシスタントです。ユーザーの作業目的に基づいて、最適なホーム画面を生成します。必ず指定されたJSON形式で回答してください。'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        const response = await AzureOpenAIClient.callAPI(messages);
        const aiText = response.choices[0].message.content;

        // JSONレスポンスを解析
        const aiResponse = AzureOpenAIClient.parseResponse(aiText);

        // レスポンスの検証
        if (!aiResponse.title || !aiResponse.content || !aiResponse.actions) {
            throw new Error('APIレスポンスの形式が無効です');
        }

        // 初期生成時のみ5つに制限（厳格ではない）
        if (aiResponse.actions.length > 5) {
            console.log(`アクション数が5つを超えていますが、必要なため保持します: ${aiResponse.actions.length}個`);
        }

        // URL検証とサニタイゼーション
        console.log('[Azure OpenAI] AI生成URLを検証中...');
        aiResponse.actions = UrlValidator.validateActions(aiResponse.actions);
        console.log(`[Azure OpenAI] URL検証完了: ${aiResponse.actions.length}個のアクションを保持`);

        return aiResponse;
    }

    /**
     * Azure OpenAI APIを呼び出して質問への回答を含めたホーム画面を生成
     * @param {string} prompt - 送信するプロンプト
     * @returns {Promise<Object>} AI応答（title, content, actions, clarificationQuestion, enrichedContext）
     */
    static async generateHomeScreenWithAnswer(prompt) {
        console.log('Azure OpenAI APIに質問回答を送信中...');

        const messages = [
            {
                role: 'system',
                content: 'あなたは研究や作業を効率化するためのアシスタントです。ユーザーの作業目的と追加情報に基づいて、最適なホーム画面を生成します。必ず指定されたJSON形式で回答してください。'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        const response = await AzureOpenAIClient.callAPI(messages);
        const aiText = response.choices[0].message.content;

        // JSONレスポンスを解析
        const aiResponse = AzureOpenAIClient.parseResponse(aiText);

        // レスポンスの検証
        if (!aiResponse.title || !aiResponse.content || !aiResponse.actions || !aiResponse.enrichedContext) {
            throw new Error('APIレスポンスの形式が無効です（enrichedContextが必要です）');
        }

        // URL検証とサニタイゼーション
        console.log('[Azure OpenAI] AI生成URLを検証中...');
        aiResponse.actions = UrlValidator.validateActions(aiResponse.actions);
        console.log(`[Azure OpenAI] URL検証完了: ${aiResponse.actions.length}個のアクションを保持`);

        console.log('質問回答を含むホーム画面生成成功:', aiResponse);
        console.log('enrichedContext:', aiResponse.enrichedContext);
        return aiResponse;
    }

    /**
     * Azure OpenAI APIを呼び出して修正要求を処理
     * @param {string} prompt - 送信するプロンプト
     * @returns {Promise<Object>} AI応答（title, content, actions）
     */
    static async processFeedback(prompt) {
        console.log('Azure OpenAI APIに修正要求を送信中...');

        const messages = [
            {
                role: 'system',
                content: 'あなたは研究や作業を効率化するためのアシスタントです。ユーザーの修正要求に基づいて、既存のホーム画面を更新します。必ず指定されたJSON形式で回答してください。'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        const response = await AzureOpenAIClient.callAPI(messages);

        const aiText = response.choices[0].message.content;
        console.log('[Azure OpenAI] 応答受信:', aiText ? `${aiText.length}文字` : '空');

        // 空レスポンスまたは空のJSONオブジェクトの場合は「変更なし」を示すnullを返す
        if (!aiText || aiText.trim().length === 0 || aiText.trim() === '{}') {
            console.log('[Azure OpenAI] 空レスポンス検出: 変更不要と判断');
            return null;  // 変更なしを示すnull
        }

        // JSONレスポンスを解析
        const aiResponse = AzureOpenAIClient.parseResponse(aiText);

        // レスポンスの検証
        if (!aiResponse.title || !aiResponse.content || !aiResponse.actions) {
            throw new Error('APIレスポンスの形式が無効です');
        }

        // URL検証とサニタイゼーション
        console.log('[Azure OpenAI] 修正後のURLを検証中...');
        aiResponse.actions = UrlValidator.validateActions(aiResponse.actions);
        console.log(`[Azure OpenAI] URL検証完了: ${aiResponse.actions.length}個のアクションを保持`);

        console.log('AI応答の解析成功:', aiResponse);
        return aiResponse;
    }

    /**
     * Azure OpenAI APIを呼び出して利用目的の一致判定
     * @param {string} pastPurpose - 過去の利用目的
     * @param {string} currentPurpose - 現在の利用目的
     * @returns {Promise<boolean>} 一致する場合は true
     */
    static async checkPurposeSimilarity(pastPurpose, currentPurpose) {
        const prompt = `
あなたは利用者のブラウザの利用目的が一貫しているかを判断するAIです。
完全に一致している必要はなく、内容が類似していればtrueを返してください（例：「研究計画書を書いて、関連文献を調べる」から「論文を広く調べる」に変わった場合はfalseを返してください）。
利用目的が変わった場合はfalseを返してください（例：「研究計画書を書く」から「ニュースを見る」に変わった場合はfalseを返してください）。
では以下の入力を確認してください：
過去の入力: "${pastPurpose}"
現在の入力: "${currentPurpose}"
出力は必ず true または false のみを返してください。
`;

        try {
            const messages = [
                {
                    role: 'user',
                    content: prompt
                }
            ];

            const response = await AzureOpenAIClient.callAPI(messages);
            const rawText = response.choices[0].message.content.trim();

            console.log("[DEBUG] Azure OpenAI 応答:", rawText);

            return rawText.toLowerCase().includes("true");
        } catch (err) {
            console.error("[ERROR] Azure OpenAI API 呼び出し失敗:", err);
            return false;
        }
    }

    /**
     * Azure OpenAI APIを呼び出す共通メソッド
     * @param {Array} messages - メッセージ配列
     * @returns {Promise<Object>} API応答
     */
    static async callAPI(messages) {
        const url = `${API_CONFIG.AZURE_OPENAI_ENDPOINT}openai/deployments/${API_CONFIG.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${API_CONFIG.AZURE_OPENAI_API_VERSION}`;

        const requestBody = {
            messages: messages,
            temperature: API_CONFIG.GENERATION_CONFIG.temperature,
            top_p: API_CONFIG.GENERATION_CONFIG.top_p,
            max_completion_tokens: API_CONFIG.GENERATION_CONFIG.max_completion_tokens,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': API_CONFIG.AZURE_OPENAI_API_KEY,
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API呼び出しに失敗しました: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('APIレスポンスが無効です');
        }

        return data;
    }

    /**
     * AIレスポンスをパース（マークダウンのコードブロック記号を除去）
     * @param {string} aiText - AIからの生テキスト
     * @returns {Object} パース済みのJSONオブジェクト
     */
    static parseResponse(aiText) {
        try {
            // マークダウンのコードブロック記号を除去
            let cleanText = aiText.trim();

            // ```json と ``` を除去
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.substring(7);
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.substring(3);
            }

            if (cleanText.endsWith('```')) {
                cleanText = cleanText.substring(0, cleanText.length - 3);
            }

            cleanText = cleanText.trim();

            return JSON.parse(cleanText);
        } catch (parseError) {
            console.error('JSON解析に失敗しました:', parseError);
            console.log('AIレスポンス:', aiText);
            throw new Error('AIレスポンスの解析に失敗しました');
        }
    }

    /**
     * APIキーが設定されているかチェック
     * @returns {boolean} APIキーが有効なら true
     */
    static hasApiKey() {
        return !!API_CONFIG.AZURE_OPENAI_API_KEY &&
               API_CONFIG.AZURE_OPENAI_API_KEY.length > 0 &&
               API_CONFIG.AZURE_OPENAI_API_KEY !== '<your-api-key>';
    }
}
