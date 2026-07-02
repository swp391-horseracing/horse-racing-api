export const PRE_RACE_WINDOW_MINUTES = 30;

export const CRON_EVERY_5_MIN = "*/5 * * * *";
export const CRON_EVERY_1_MIN = "* * * * *";

export const CRON_INTERVAL_MS =
    parseInt(process.env.CRON_INTERVAL_MS || "", 10) || 5 * 60 * 1000;
