// Gemini API設定

export const API_CONFIG = {
    // APIキー（本番環境では環境変数に移行推奨）
    GEMINI_API_KEY: 'AIzaSyAhphB8DUolShl650ISgqPKb2kN8i11GMM',

    // エンドポイント
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',

    // 生成設定
    GENERATION_CONFIG: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
    }
};

// グローバルにも公開（既存コードとの互換性のため）
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
}
