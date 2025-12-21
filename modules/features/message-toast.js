// メッセージトースト表示モジュール
// 成功・エラー・警告メッセージを一時的に画面に表示

export class MessageToast {
    /**
     * 成功メッセージを表示
     * @param {string} message - 表示するメッセージ
     * @param {number} duration - 表示時間（ミリ秒、デフォルト3000ms）
     */
    static success(message, duration = 3000) {
        const toastDiv = document.createElement('div');
        toastDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideIn 0.3s ease;
        `;
        toastDiv.textContent = message;
        document.body.appendChild(toastDiv);

        setTimeout(() => {
            toastDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toastDiv.parentNode) {
                    toastDiv.parentNode.removeChild(toastDiv);
                }
            }, 300);
        }, duration);
    }

    /**
     * エラーメッセージを表示
     * @param {string} message - 表示するメッセージ
     * @param {number} duration - 表示時間（ミリ秒、デフォルト4000ms）
     */
    static error(message, duration = 4000) {
        const toastDiv = document.createElement('div');
        toastDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideIn 0.3s ease;
        `;
        toastDiv.textContent = message;
        document.body.appendChild(toastDiv);

        setTimeout(() => {
            toastDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toastDiv.parentNode) {
                    toastDiv.parentNode.removeChild(toastDiv);
                }
            }, 300);
        }, duration);
    }

    /**
     * 情報メッセージを表示
     * @param {string} message - 表示するメッセージ
     * @param {number} duration - 表示時間（ミリ秒、デフォルト3000ms）
     */
    static info(message, duration = 3000) {
        const toastDiv = document.createElement('div');
        toastDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196F3;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideIn 0.3s ease;
        `;
        toastDiv.textContent = message;
        document.body.appendChild(toastDiv);

        setTimeout(() => {
            toastDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toastDiv.parentNode) {
                    toastDiv.parentNode.removeChild(toastDiv);
                }
            }, 300);
        }, duration);
    }

    /**
     * 警告メッセージを表示（フォールバック用）
     * @param {string} message - 表示するメッセージ
     * @param {number} duration - 表示時間（ミリ秒、デフォルト5000ms）
     */
    static warning(message, duration = 5000) {
        const toastDiv = document.createElement('div');
        toastDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #FF9800;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
            max-width: 400px;
            line-height: 1.4;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideIn 0.3s ease;
        `;
        toastDiv.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="margin-right: 8px;">⚠️</span>
                <strong>フォールバック処理</strong>
            </div>
            <div>${message}</div>
        `;
        document.body.appendChild(toastDiv);

        setTimeout(() => {
            toastDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toastDiv.parentNode) {
                    toastDiv.parentNode.removeChild(toastDiv);
                }
            }, 300);
        }, duration);
    }
}

// アニメーション用のスタイルをページに追加
if (!document.getElementById('message-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'message-toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
