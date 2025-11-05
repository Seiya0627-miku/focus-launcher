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
    }

    /**
     * ローディング画面を表示
     */
    static showLoadingScreen() {
        document.getElementById('workflow-input').classList.add('hidden');
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('loading-screen').classList.remove('hidden');
    }
}
