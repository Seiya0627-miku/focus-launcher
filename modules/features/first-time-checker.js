// 初回利用チェック機能

export class FirstTimeChecker {
    /**
     * 初回利用かどうかをチェック
     * @param {Function} onFirstTime - 初回利用時のコールバック
     * @param {Function} onExistingUser - 既存ユーザー時のコールバック
     */
    static async check(onFirstTime, onExistingUser) {
        try {
            console.log('初回利用チェックを開始...');

            // Runtime の接続確認
            if (!chrome.runtime) {
                console.error('chrome.runtime が利用できません');
                onExistingUser();
                return;
            }

            const response = await chrome.runtime.sendMessage({
                action: 'checkFirstTimeUser'
            });

            // レスポンスが undefined または null の場合の処理
            if (!response || typeof response !== 'object') {
                console.error('Background script からの応答が無効です:', response);
                console.log('フォールバックとして直接ストレージをチェックします');

                // フォールバック: 直接ストレージをチェック
                const fallbackResult = await chrome.storage.local.get(['experimentId', 'consentGiven']);
                console.log('直接取得したストレージデータ:', fallbackResult);

                const isFirstTime = !fallbackResult.experimentId || !fallbackResult.consentGiven;
                if (isFirstTime) {
                    onFirstTime();
                } else {
                    onExistingUser();
                }
                return;
            }

            if (response.error) {
                console.error('Background script でエラーが発生:', response.error);
                onExistingUser();
                return;
            }

            if (response.isFirstTime) {
                console.log('初回利用です。確認画面を表示します。');
                onFirstTime();
            } else {
                console.log('既存ユーザーです。ワークフローを読み込みます。');
                onExistingUser();
            }
        } catch (error) {
            console.error('初回利用チェックに失敗しました:', error);

            // エラーが runtime の接続問題の場合
            if (error.message && error.message.includes('Extension context invalidated')) {
                console.log('拡張機能のコンテキストが無効化されています。ページをリロードしてください。');
                location.reload();
                return;
            }

            // その他のエラーの場合はフォールバック
            console.log('フォールバックとして既存ユーザー処理を実行します');
            onExistingUser();
        }
    }

    /**
     * 同意画面を表示
     */
    static showConsentScreen() {
        // 現在のコンテンツを隠す
        document.getElementById('app').style.display = 'none';

        // 確認画面を表示
        const consentFrame = document.createElement('iframe');
        consentFrame.src = chrome.runtime.getURL('views/consent-screen.html');
        consentFrame.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            z-index: 10000;
        `;
        document.body.appendChild(consentFrame);
    }
}
