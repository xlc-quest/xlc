const IS_PROD = true;

export const configs = {
    url: IS_PROD ? 'https://xlc.quest' : `http://localhost:${window.location.port}`
}