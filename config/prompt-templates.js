// Azure OpenAI (GPT-5) のプロンプトテンプレート

export const PROMPT_TEMPLATES = {
    // ホーム画面生成用プロンプト
    HOME_SCREEN: `
あなたは研究や作業を効率化するためのアシスタントです。
ユーザーの作業目的に基づいて、最適なホーム画面を生成してください。

作業目的: {workflow}

以下のJSON形式で回答してください（マークダウンのコードブロック記号は使用しないでください）：
{
    "title": "作業タイトル（30文字以内）",
    "content": "作業の説明と手順（HTML形式可）",
    "actions": [
        {
            "title": "ツール名",
            "description": "説明",
            "url": "URL",
            "icon": "絵文字またはアイコン"
        }
    ]
}

注意事項：
- 作業目的に関連する実用的なツールやサイトを提案
- 研究系の作業には学術サイトを、ビジネス系には実用的なツールを
- ドキュメント作成にはGoogle Docs、Google Slides、Google Sheetsを優先的に提案
- 学術系の作業にはOverleafも含める
- 論文を広く調べる必要がある場合はPaperDive（https://www.paperdive.app/）を必ず含める
- Google Driveは常に含める（ファイル管理のため）
- 各アクションは具体的で実用的なものにする
- アイコンは絵文字を使用（例：📚、🔬、✈️、📧）
- 初期生成時は約5個のアクションを提案（厳格な制限ではない）
- 必要な場合は5個を超えても構いません
- Google Workspaceツール（Docs、Slides、Sheets、Drive、Mailなど）は以下のURL形式で統一してください：
  * Google Docs: https://docs.google.com
  * Google Slides: https://slides.google.com
  * その他についても以上と同様にしてください
- ツール名はシンプルに表示し、余計な情報（「構成検討」など）は付けないでください
- 必ず有効なJSON形式で回答し、マークダウンのコードブロック記号は使用しない
`,

    // 修正要求処理用プロンプト
    FEEDBACK: `
現在のワークフロー情報：
- タイトル: {currentTitle}
- 内容: {currentContent}
- 現在のツール: {currentActions}

ユーザーからの修正要求: {feedbackText}

上記の修正要求に基づいて、以下のJSON形式で応答してください：
{
    "title": "更新されたタイトル",
    "content": "更新された内容（HTML形式）",
    "actions": [
        {
            "title": "ツール名",
            "description": "説明",
            "url": "URL",
            "icon": "絵文字アイコン"
        }
    ]
}

注意事項：
- 既存のツールはurl含めて原則変更しないでください（例：https://slides.google.comをhttps://docs.google.com/presentation/に変更しないでください）
- 削除要求があれば該当ツールを除外してください
- 追加要求があれば、既存のjsonの後ろに新しいツールの情報を追加してください
- 重複は避けてください
- 実用的で関連性の高いツールを提案してください
- 論文を広く調べる必要がある場合はPaperDive（https://www.paperdive.app/）を必ず含める
- Google Driveは常に含める（ファイル管理のため）
- Google Workspaceツール（Docs、Slides、Sheets、Drive、Mailなど）は以下のURL形式で統一してください：
  * Google Docs: https://docs.google.com
  * Google Slides: https://slides.google.com
  * その他についても以上と同様にしてください
- ツール名はそのまま表示し、余計な情報（「構成検討」など）は付けないでください
`,

    // 利用目的の再確認判定用プロンプト
    PURPOSE_CHECK: `
あなたは利用者のブラウザの利用目的が一貫しているかを判断するAIです。
完全に一致している必要はなく、内容が類似していればtrueを返してください（例：「研究計画書を書いて、関連文献を調べる」から「論文を広く調べる」に変わった場合はfalseを返してください）。
利用目的が変わった場合はfalseを返してください（例：「研究計画書を書く」から「ニュースを見る」に変わった場合はfalseを返してください）。
では以下の入力を確認してください：
過去の入力: "{pastPurpose}"
現在の入力: "{currentPurpose}"
出力は必ず true または false のみを返してください。
`
};

// グローバルにも公開（既存コードとの互換性のため）
if (typeof window !== 'undefined') {
    window.PROMPT_TEMPLATES = PROMPT_TEMPLATES;
}
