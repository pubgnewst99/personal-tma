export { };

declare global {
    interface Window {
        Telegram?: {
            WebApp: {
                ready: () => void;
                expand: () => void;
                close: () => void;
                MainButton: {
                    text: string;
                    color: string;
                    textColor: string;
                    isVisible: boolean;
                    isActive: boolean;
                    show: () => void;
                    hide: () => void;
                    onClick: (callback: () => void) => void;
                };
                HapticFeedback: {
                    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
                    notificationOccurred: (type: "error" | "success" | "warning") => void;
                    selectionChanged: () => void;
                };
                themeParams: {
                    bg_color?: string;
                    text_color?: string;
                    hint_color?: string;
                    link_color?: string;
                    button_color?: string;
                    button_text_color?: string;
                    secondary_bg_color?: string;
                };
                initData: string;
                initDataUnsafe: any;
                onEvent: (eventType: string, eventHandler: () => void) => void;
                offEvent: (eventType: string, eventHandler: () => void) => void;
                sendData: (data: string) => void;
            };
        };
    }
}
