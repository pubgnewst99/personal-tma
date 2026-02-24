import crypto from "crypto";

/**
 * Verifies the integrity of data received from the Telegram Web App.
 * Documentation: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function verifyTelegramAuth(initData: string, botToken: string): boolean {
    if (!initData || !botToken) return false;

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    urlParams.delete("hash");

    // Sort parameters alphabetically
    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

    const secretKey = crypto
        .createHmac("sha256", "WebAppData")
        .update(botToken)
        .digest();

    const calculatedHash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

    return calculatedHash === hash;
}

export type TelegramUser = {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    allows_write_to_pm?: boolean;
};

export function getTelegramUser(initData: string): TelegramUser | null {
    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get("user");
    if (!userJson) return null;
    try {
        return JSON.parse(userJson) as TelegramUser;
    } catch {
        return null;
    }
}
