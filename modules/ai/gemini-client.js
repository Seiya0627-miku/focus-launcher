// Gemini API クライアント
// すべてのGemini API呼び出しを一元管理

import { API_CONFIG } from '../../config/api-config.js';

export class GeminiClient {
    /**
     * Gemini APIを呼び出してホーム画面を生成
     * @param {string} prompt - 送信するプロンプト
     * @returns {Promise<Object>} AI応答（title, content, actions）
     */
    static async generateHomeScreen(prompt) {
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: API_CONFIG.GENERATION_CONFIG
        };

        const response = await fetch(`${API_CONFIG.GEMINI_API_URL}?key=${API_CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API呼び出しに失敗しました: ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('APIレスポンスが無効です');
        }

        const aiText = data.candidates[0].content.parts[0].text;

        // JSONレスポンスを解析（マークダウンのコードブロック記号を除去）
        const aiResponse = GeminiClient.parseResponse(aiText);

        // レスポンスの検証
        if (!aiResponse.title || !aiResponse.content || !aiResponse.actions) {
            throw new Error('APIレスポンスの形式が無効です');
        }

        // 初期生成時のみ5つに制限（厳格ではない）
        if (aiResponse.actions.length > 5) {
            console.log(`アクション数が5つを超えていますが、必要なため保持します: ${aiResponse.actions.length}個`);
        }

        return aiResponse;
    }

    /**
     * Gemini APIを呼び出して修正要求を処理
     * @param {string} prompt - 送信するプロンプト
     * @returns {Promise<Object>} AI応答（title, content, actions）
     */
    static async processFeedback(prompt) {
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: API_CONFIG.GENERATION_CONFIG
        };

        console.log('Gemini APIに修正要求を送信中...');

        const response = await fetch(`${API_CONFIG.GEMINI_API_URL}?key=${API_CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API呼び出しに失敗しました: ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('APIレスポンスが無効です');
        }

        const aiText = data.candidates[0].content.parts[0].text;
        console.log('AIからの応答:', aiText);

        // JSONレスポンスを解析
        const aiResponse = GeminiClient.parseResponse(aiText);

        // レスポンスの検証
        if (!aiResponse.title || !aiResponse.content || !aiResponse.actions) {
            throw new Error('APIレスポンスの形式が無効です');
        }

        console.log('AI応答の解析成功:', aiResponse);
        return aiResponse;
    }

    /**
     * Gemini APIを呼び出して利用目的の一致判定
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
            const response = await fetch(`${API_CONFIG.GEMINI_API_URL}?key=${API_CONFIG.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

            console.log("[DEBUG] Gemini 応答:", rawText);

            return rawText.toLowerCase().includes("true");
        } catch (err) {
            console.error("[ERROR] Gemini API 呼び出し失敗:", err);
            return false;
        }
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
        return !!API_CONFIG.GEMINI_API_KEY && API_CONFIG.GEMINI_API_KEY.length > 0;
    }
}
