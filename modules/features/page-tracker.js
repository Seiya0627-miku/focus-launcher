// ページ訪問トラッキング機能

import { UrlValidator } from '../utils/url-validator.js';
import { StorageManager } from '../core/storage-manager.js';

export class PageTracker {
    constructor() {
        this.visitedPages = [];
        this.currentWorkflow = null;
    }

    /**
     * ページトラッキングを開始
     * @param {Object} currentWorkflow - 現在のワークフロー
     */
    async start(currentWorkflow) {
        this.currentWorkflow = currentWorkflow;

        // 既存の訪問ページを復元
        await this.restoreVisitedPages();

        // イベントリスナーを設定
        this.setupPageTracking();
    }

    /**
     * ページリロード時にvisitedPagesを復元
     */
    async restoreVisitedPages() {
        this.visitedPages = await StorageManager.getVisitedPages();
    }

    /**
     * ページトラッキングのイベントリスナーを設定
     */
    setupPageTracking() {
        try {
            // タブの更新を監視
            chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                if (changeInfo.status === 'complete' && tab.url && this.currentWorkflow) {
                    this.trackPageVisit(tab);
                }
            });

            // タブの切り替えを監視
            chrome.tabs.onActivated.addListener((activeInfo) => {
                chrome.tabs.get(activeInfo.tabId, (tab) => {
                    if (tab && tab.url && this.currentWorkflow) {
                        this.trackPageVisit(tab);
                    }
                });
            });
            console.log('[PAGE TRACKING] newtab.jsでページトラッキングを開始しました');
        } catch (error) {
            console.error('[PAGE TRACKING] newtab.jsでのページトラッキング設定に失敗:', error);
        }
    }

    /**
     * ページ訪問を追跡
     * @param {Object} tab - タブ情報
     */
    async trackPageVisit(tab) {
        if (!this.currentWorkflow || !tab.url) return;

        // 内部ページを除外
        if (!UrlValidator.isTrackable(tab.url)) {
            return;
        }

        const pageInfo = {
            title: tab.title || '無題のページ',
            url: tab.url,
            timestamp: Date.now()
        };

        // 重複チェック（同じURLで最近アクセスした場合は除外）
        const recentVisit = this.visitedPages.find(page =>
            page.url === tab.url &&
            (Date.now() - page.timestamp) < 3000 // 3秒以内
        );

        if (!recentVisit) {
            this.visitedPages.push(pageInfo);

            // localStorageに保存
            await this.saveVisitedPagesToStorage();
        }
    }

    /**
     * 訪問ページをStorageに保存
     */
    async saveVisitedPagesToStorage() {
        try {
            await chrome.storage.local.set({
                currentWorkflowVisitedPages: this.visitedPages
            });
        } catch (error) {
            console.error('visitedPagesの保存に失敗しました:', error);
        }
    }

    /**
     * 訪問ページ一覧を取得
     * @returns {Array} 訪問ページ配列
     */
    getVisitedPages() {
        return this.visitedPages;
    }

    /**
     * 現在のワークフローを更新
     * @param {Object} workflow - ワークフロー情報
     */
    updateWorkflow(workflow) {
        this.currentWorkflow = workflow;
    }
}
