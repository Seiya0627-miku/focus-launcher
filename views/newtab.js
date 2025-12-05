// Focus Launcher - メインロジック

import { MessageToast } from '../modules/pages/message-toast.js';
import { UrlValidator } from '../modules/utils/url-validator.js';
import { StorageManager } from '../modules/core/storage-manager.js';
import { WorkflowManager } from '../modules/core/workflow-manager.js';
import { Logger } from '../modules/core/logger.js';
import { AzureOpenAIClient } from '../modules/ai/azure-openai-client.js';
import { PromptBuilder } from '../modules/ai/prompt-builder.js';
import { MockResponseGenerator } from '../modules/ai/mock-response-generator.js';
import { FeedbackProcessor } from '../modules/features/feedback-processor.js';
import { IdleOverlay } from '../modules/features/idle-overlay.js';
import { FirstTimeChecker } from '../modules/features/first-time-checker.js';
import { HomeScreen } from '../modules/pages/home-screen.js';
import { WorkflowScreen } from '../modules/pages/workflow-screen.js';

class FocusLauncher {
    constructor() {
        this.currentWorkflow = null;
        this.isRefreshing = false;
        this.visitedPages = []; // ワークフロー中にアクセスしたページを追跡（background.jsで管理）
        this.idleOverlay = new IdleOverlay();  // アイドルオーバーレイ
        this.init();
        this.setupMessageListener();
    }

    async init() {
        this.bindEvents();

        // 初回利用チェック
        await FirstTimeChecker.check(
            () => {
                // 初回利用時：同意画面を表示
                FirstTimeChecker.showConsentScreen();
            },
            async () => {
                // 既存ユーザー：ワークフローを読み込み
                await this.loadCurrentWorkflow();
                await this.checkOverlay();
            }
        );
    }

    bindEvents() {
        // ワークフロー開始ボタン
        document.getElementById('start-workflow').addEventListener('click', () => {
            this.startWorkflow();
        });

        // ワークフロー終了ボタン
        document.getElementById('end-workflow').addEventListener('click', () => {
            this.showReflectionScreen();
        });

        // 修正要求送信ボタン
        document.getElementById('submit-feedback').addEventListener('click', () => {
            this.submitFeedback();
        });

        // 修正要求セクションのワークフロー終了ボタン
        document.getElementById('end-workflow-feedback').addEventListener('click', () => {
            this.showReflectionScreen();
        });

        // Enterキーでワークフロー開始
        document.getElementById('workflow-textarea').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.startWorkflow();
            }
        });

        // 修正要求テキストエリアでEnterキー処理
        document.getElementById('feedback-textarea').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.submitFeedback();
            }
        });

        // ページのリフレッシュを検知（visibilitychangeイベントを使用）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // ページが非表示になった時（リフレッシュの可能性）
                this.isRefreshing = true;
            }
        });

        // ページのリロードを検知
        window.addEventListener('beforeunload', () => {
            this.isRefreshing = true;
        });

        // ブラウザの閉じるイベントを監視（実際のブラウザ閉じる時のみ）
        window.addEventListener('unload', () => {
            if (!this.isRefreshing) {
                this.showReflectionScreen();
            }
        });
    }

    async loadCurrentWorkflow() {
        const currentWorkflow = await StorageManager.getCurrentWorkflow();
        console.log('ストレージから取得したデータ:', currentWorkflow);

        if (currentWorkflow && currentWorkflow.text) {
            this.currentWorkflow = currentWorkflow;

            // ワークフローが存在する場合は、直接ホーム画面を表示
            this.showHomeScreen();
            this.updateHomeScreen();

            console.log('既存のワークフローを復元しました:', this.currentWorkflow.text);
        } else {
            this.showWorkflowInput();
            console.log('新しいワークフローを開始します');
        }
    }

    async startWorkflow() {
        const workflowText = document.getElementById('workflow-textarea').value.trim();
    
        if (!workflowText) {
            alert('作業目的を入力してください。');
            return;
        }
    
        // ページ追跡をリセット
        this.visitedPages = [];
        await chrome.storage.local.remove(['currentWorkflowVisitedPages']);
    
        // ワークフロー情報を設定
        this.currentWorkflow = {
            text: workflowText,
            timestamp: Date.now(),
            aiContent: null,
            feedback: null,
            fixRequests: [], // 修正要求履歴を追加
            purposeChecks: [] // 意図の再確認履歴
        };
    
        // ストレージに保存
        await chrome.storage.local.set({ currentWorkflow: this.currentWorkflow });
        console.log('[DEBUG] ワークフローを保存しました:', this.currentWorkflow);

        this.showLoadingScreen();

        try {
            // AI APIを呼び出してホーム画面を生成
            const aiResponse = await this.generateHomeScreen(workflowText);
            
            this.currentWorkflow = {
                ...this.currentWorkflow,
                aiContent: aiResponse
            };

            // ストレージに保存
            await chrome.storage.local.set({ currentWorkflow: this.currentWorkflow });

            this.showHomeScreen();
            this.updateHomeScreen();

            console.log('新しいワークフローを開始しました:', workflowText);

        } catch (error) {
            console.error('ワークフローの開始に失敗しました:', error);
            alert('ワークフローの開始に失敗しました。もう一度お試しください。');
            this.showWorkflowInput();
        }
    }

    async submitFeedback() {
        const feedbackText = document.getElementById('feedback-textarea').value.trim();
        
        if (!feedbackText) {
            alert('修正要求を入力してください');
            return;
        }

        // ワークフロー終了の要求かチェック
        if (feedbackText.toLowerCase().includes('ワークフローを終了') || 
            feedbackText.toLowerCase().includes('終了') ||
            feedbackText.toLowerCase().includes('やめる')) {
            this.showReflectionScreen();
            return;
        }

        this.showLoadingScreen();

        try {
            console.log('修正要求処理:', feedbackText);

            // 修正要求を履歴に追加
            const fixRequest = {
                text: feedbackText,
                timestamp: Date.now()
            };
            this.currentWorkflow.fixRequests.push(fixRequest);
         
            // Gemini APIを呼び出して修正要求を処理
            const aiResponse = await this.processFeedbackWithAI(feedbackText);
            
            // ワークフローを更新
            this.currentWorkflow = {
                ...this.currentWorkflow,
                aiContent: aiResponse,
                feedback: feedbackText
            };

            // ストレージに保存
            await chrome.storage.local.set({ currentWorkflow: this.currentWorkflow });

            this.showHomeScreen();
            this.updateHomeScreen();

            // フィードバックテキストエリアをクリア
            document.getElementById('feedback-textarea').value = '';
            console.log('修正要求を処理しました:', feedbackText);
            
        } catch (error) {
            console.error('修正要求の処理に失敗しました:', error);
            alert('修正要求の処理に失敗しました。もう一度お試しください。');
            this.showHomeScreen();
        }
    }

    async processFeedbackWithAI(feedbackText) {
        const prompt = PromptBuilder.buildFeedbackPrompt(this.currentWorkflow, feedbackText);

        // APIキーが設定されている場合はAzure OpenAI APIを使用
        if (AzureOpenAIClient.hasApiKey()) {
            try {
                const result = await AzureOpenAIClient.processFeedback(prompt);
                console.log('Azure OpenAI (GPT-5) で修正要求処理成功');
                MessageToast.success('修正要求が正常に処理されました！');
                return result;
            } catch (error) {
                console.error('Azure OpenAI API呼び出しに失敗しました:', error);
                // APIが失敗した場合はフォールバック
                const fallbackResult = FeedbackProcessor.processFeedback(feedbackText, this.currentWorkflow.aiContent);
                MessageToast.warning('AI APIに接続できませんでした。ローカル処理で修正要求を処理しました。');
                return fallbackResult;
            }
        } else {
            // APIキーが設定されていない場合はフォールバック
            const fallbackResult = FeedbackProcessor.processFeedback(feedbackText, this.currentWorkflow.aiContent);
            MessageToast.warning('AI APIキーが設定されていません。ローカル処理で修正要求を処理しました。');
            return fallbackResult;
        }
    }

    async generateHomeScreen(workflowText) {
        const bookmarks = await this.getBookmarks();
        const prompt = PromptBuilder.buildHomeScreenPrompt(workflowText, bookmarks);

        // APIキーが設定されている場合はAzure OpenAI APIを使用
        if (AzureOpenAIClient.hasApiKey()) {
            try {
                const result = await AzureOpenAIClient.generateHomeScreen(prompt);
                console.log('Azure OpenAI (GPT-5) でワークフロー生成成功');
                return result;
            } catch (error) {
                console.error('Azure OpenAI API呼び出しに失敗しました:', error);
                // APIが失敗した場合はフォールバック
                const fallbackResult = MockResponseGenerator.generate(workflowText);
                MessageToast.warning('AI APIに接続できませんでした。ローカル処理でワークフローを生成しました。');
                return fallbackResult;
            }
        } else {
            // APIキーが設定されていない場合はモックデータを使用
            const fallbackResult = MockResponseGenerator.generate(workflowText);
            MessageToast.warning('AI APIキーが設定されていません。ローカル処理でワークフローを生成しました。');
            return fallbackResult;
        }
    }

    async updateHomeScreen() {
        if (!this.currentWorkflow) return;
        await HomeScreen.update(this.currentWorkflow, (index) => this.removeAction(index));
    }

    // アクション削除
    async removeAction(index) {
        if (!this.currentWorkflow || !this.currentWorkflow.aiContent || !this.currentWorkflow.aiContent.actions) {
            return;
        }

        // 指定されたインデックスのアクションを削除
        const removedAction = this.currentWorkflow.aiContent.actions.splice(index, 1)[0];

        // ストレージに保存
        await WorkflowManager.update(this.currentWorkflow);

        // ホーム画面を更新
        await this.updateHomeScreen();

        console.log(`アクション「${removedAction.title}」を削除しました`);
    }

    async getBookmarks() {
        return await StorageManager.getBookmarks();
    }

    // 振り返り画面に遷移する関数
    async showReflectionScreen() {
        // 振り返り画面を新しいタブで開く
        const reflectionUrl = chrome.runtime.getURL('views/reflection.html');
        await chrome.tabs.create({ url: reflectionUrl });
        await chrome.storage.local.set({ reflectionTime: Date.now() });
        // 現在のタブを閉じる
        const currentTab = await chrome.tabs.getCurrent();
        if (currentTab) {
            await chrome.tabs.remove(currentTab.id);
        }
    }

    // ワークフローを終了する関数
    async endWorkflow() {
        await WorkflowManager.end();
        this.currentWorkflow = null;
        this.visitedPages = [];
        WorkflowScreen.showWorkflowInput();
    }

    showWorkflowInput() {
        WorkflowScreen.showWorkflowInput();
    }

    showHomeScreen() {
        WorkflowScreen.showHomeScreen();
    }

    showLoadingScreen() {
        WorkflowScreen.showLoadingScreen();
    }

    showFallbackMessage(message) {
        MessageToast.warning(message);
    }

    showSuccessMessage(message) {
        MessageToast.success(message);
    }

    // メッセージリスナーを追加
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('メッセージを受信:', request);
            if (request.action === 'showConsentScreen') {
                FirstTimeChecker.showConsentScreen();
            }
            if (request.action === 'reloadPage') {
                window.location.reload();
            }
        });
    }

    async checkOverlay() {
        const shouldShow = await this.idleOverlay.shouldShow();
        if (shouldShow && this.currentWorkflow) {
            await this.idleOverlay.show(
                this.currentWorkflow,
                () => {
                    // 目的が同じ場合は何もしない（タブは自動で閉じる）
                },
                () => {
                    // 目的が異なる場合は振り返り画面へ
                    this.showReflectionScreen();
                }
            );
        }
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new FocusLauncher();
}); 
