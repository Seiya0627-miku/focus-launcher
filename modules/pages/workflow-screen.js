// ワークフロー画面の切り替え

export class WorkflowScreen {
    /**
     * ワークフロー入力画面を表示
     */
    static showWorkflowInput() {
        document.getElementById('workflow-input').classList.remove('hidden');
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('loading-screen').classList.add('hidden');

        // テキストエリアをクリア
        document.getElementById('workflow-textarea').value = '';
    }

    /**
     * ホーム画面を表示
     */
    static showHomeScreen() {
        document.getElementById('workflow-input').classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
        document.getElementById('loading-screen').classList.add('hidden');
        // ローディングオーバーレイも非表示
        WorkflowScreen.hideLoadingOverlay();
    }

    /**
     * ローディング画面を表示
     */
    static showLoadingScreen() {
        document.getElementById('workflow-input').classList.add('hidden');
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('loading-screen').classList.remove('hidden');
    }

    /**
     * ローディングオーバーレイを表示（ホーム画面上）
     */
    static showLoadingOverlay() {
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    /**
     * ローディングオーバーレイを非表示
     */
    static hideLoadingOverlay() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }
}
