// Azure OpenAI API設定

export const API_CONFIG = {
    // APIキー（本番環境では環境変数に移行推奨）
    AZURE_OPENAI_API_KEY: '<your-api-key>',

    // エンドポイント
    AZURE_OPENAI_ENDPOINT: 'https://ai-foundry-shared-playground.cognitiveservices.azure.com/',

    // デプロイメント名
    AZURE_OPENAI_DEPLOYMENT: 'gpt-5.1-2',

    // APIバージョン
    AZURE_OPENAI_API_VERSION: '2024-04-01-preview',

    // モデル名
    AZURE_OPENAI_MODEL_NAME: 'gpt-5.1',

    // 生成設定
    GENERATION_CONFIG: {
        temperature: 0.7,
        top_p: 0.95,
        max_completion_tokens: 1024,
    }
};

// グローバルにも公開（既存コードとの互換性のため）
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
}
