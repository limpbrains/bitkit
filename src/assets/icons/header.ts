export const settings = (color): string => `
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.0504 4.1088L9.7704 2.256C9.8926 1.94348 10.1066 1.6753 10.3842 1.48679C10.6618 1.29829 10.99 1.1983 11.3256 1.2H12.6744C13.0087 1.19975 13.3354 1.30042 13.6116 1.48883C13.8878 1.67724 14.1006 1.94462 14.2224 2.256L14.9424 4.1088L17.3424 5.5008L19.3104 5.2032C19.6395 5.15463 19.9755 5.20599 20.2751 5.35062C20.5746 5.49526 20.8238 5.7265 20.9904 6.0144L21.6672 7.1856C21.8338 7.47507 21.9094 7.80799 21.8841 8.14102C21.8589 8.47406 21.734 8.79177 21.5256 9.0528L20.2848 10.608V13.392L21.5256 14.9472C21.734 15.2082 21.8589 15.526 21.8841 15.859C21.9094 16.192 21.8338 16.5249 21.6672 16.8144L20.9904 17.9856C20.8238 18.2735 20.5746 18.5048 20.2751 18.6494C19.9755 18.794 19.6395 18.8454 19.3104 18.7968L17.3424 18.4992L14.9424 19.8912L14.2224 21.744C14.1006 22.0554 13.8878 22.3228 13.6116 22.5112C13.3354 22.6996 13.0087 22.8003 12.6744 22.8H11.3256C10.9913 22.8003 10.6646 22.6996 10.3884 22.5112C10.1123 22.3228 9.89935 22.0554 9.7776 21.744L9.0576 19.8912L6.6576 18.4992L4.6896 18.7968C4.36054 18.8454 4.02447 18.794 3.72494 18.6494C3.4254 18.5048 3.1762 18.2735 3.0096 17.9856L2.3088 16.8144C2.1422 16.5249 2.0666 16.192 2.09186 15.859C2.11712 15.526 2.24205 15.2082 2.4504 14.9472L3.6912 13.392V10.608L2.4504 9.0528C2.24205 8.79177 2.11712 8.47406 2.09186 8.14102C2.0666 7.80799 2.1422 7.47507 2.3088 7.1856L2.9856 6.0144C3.1522 5.7265 3.4014 5.49526 3.70094 5.35062C4.00047 5.20599 4.33654 5.15463 4.6656 5.2032L6.6336 5.5008L9.0504 4.1088ZM9 12C9 12.5933 9.17595 13.1734 9.50559 13.6667C9.83524 14.1601 10.3038 14.5446 10.852 14.7716C11.4001 14.9987 12.0033 15.0581 12.5853 14.9424C13.1672 14.8266 13.7018 14.5409 14.1213 14.1213C14.5409 13.7018 14.8266 13.1672 14.9424 12.5853C15.0581 12.0033 14.9987 11.4001 14.7716 10.852C14.5446 10.3038 14.1601 9.83524 13.6667 9.50559C13.1734 9.17595 12.5933 9 12 9C11.2044 9 10.4413 9.31607 9.87868 9.87868C9.31607 10.4413 9 11.2044 9 12V12Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

export const camera = (color): string => `
<svg width="22" height="21" viewBox="0 0 22 21" xmlns="http://www.w3.org/2000/svg">
<path d="M20.0952 7.47949C20.854 7.47949 21.2642 7.05908 21.2642 6.29004V3.81885C21.2642 1.55273 20.0542 0.342773 17.7676 0.342773H15.2964C14.5273 0.342773 14.1069 0.763184 14.1069 1.52197C14.1069 2.27051 14.5273 2.69092 15.2964 2.69092H17.5522C18.4341 2.69092 18.9263 3.14209 18.9263 4.06494V6.29004C18.9263 7.05908 19.3364 7.47949 20.0952 7.47949ZM1.90479 7.47949C2.67383 7.47949 3.08398 7.05908 3.08398 6.29004V4.06494C3.08398 3.14209 3.55566 2.69092 4.44775 2.69092H6.71387C7.48291 2.69092 7.89307 2.27051 7.89307 1.52197C7.89307 0.763184 7.48291 0.342773 6.71387 0.342773H4.23242C1.95605 0.342773 0.73584 1.55273 0.73584 3.81885V6.29004C0.73584 7.05908 1.15625 7.47949 1.90479 7.47949ZM4.23242 20.8813H6.71387C7.48291 20.8813 7.89307 20.4609 7.89307 19.7021C7.89307 18.9434 7.47266 18.5332 6.71387 18.5332H4.44775C3.55566 18.5332 3.08398 18.082 3.08398 17.1489V14.9341C3.08398 14.165 2.66357 13.7446 1.90479 13.7446C1.146 13.7446 0.73584 14.165 0.73584 14.9341V17.4053C0.73584 19.6714 1.95605 20.8813 4.23242 20.8813ZM15.2964 20.8813H17.7676C20.0542 20.8813 21.2642 19.6611 21.2642 17.4053V14.9341C21.2642 14.165 20.854 13.7446 20.0952 13.7446C19.3364 13.7446 18.9263 14.165 18.9263 14.9341V17.1489C18.9263 18.082 18.4341 18.5332 17.5522 18.5332H15.2964C14.5273 18.5332 14.1069 18.9434 14.1069 19.7021C14.1069 20.4609 14.5273 20.8813 15.2964 20.8813Z" fill="${color}"/>
</svg>
`;

export const dismiss = (color = 'white'): string => `
<svg width="12" height="11" viewBox="0 0 12 11" xmlns="http://www.w3.org/2000/svg">
<path d="M0.891602 9.00342C0.536133 9.36523 0.51709 10.0317 0.904297 10.4126C1.2915 10.7998 1.95166 10.7871 2.31348 10.4253L5.89355 6.84521L9.46729 10.4189C9.8418 10.7998 10.4893 10.7935 10.8701 10.4062C11.2573 10.0254 11.2573 9.37793 10.8828 9.00342L7.30908 5.42969L10.8828 1.84961C11.2573 1.4751 11.2573 0.827637 10.8701 0.446777C10.4893 0.0595703 9.8418 0.0595703 9.46729 0.434082L5.89355 4.00781L2.31348 0.427734C1.95166 0.0722656 1.28516 0.0532227 0.904297 0.44043C0.523438 0.827637 0.536133 1.48779 0.891602 1.84961L4.47168 5.42969L0.891602 9.00342Z" fill="${color}" fill-opacity="0.2"/>
</svg>
`;

export const boost = (): string => `
<svg width="39" height="39" viewBox="0 0 39 39" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g style="mix-blend-mode:lighten">
<rect width="39" height="39" fill="url(#pattern0)"/>
</g>
<defs>
<pattern id="pattern0" patternContentUnits="objectBoundingBox" width="1" height="1">
<use xlink:href="#image0" transform="translate(-0.156667) scale(0.00333333)"/>
</pattern>
<image id="image0" width="394" height="300" xlink:href="data:image/png;base64,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QECcAIRCnB0sQQAEQEALAhAKLdqMIkEABEBAnACEQpwdLEEABEBACwIQCi3ajCJBAARAQJwAhEKcHSxBAARAQAsCEAot2owiQQAEQECcAIRCnB0sQQAEQEALAhAKLdqMIkEABEBAnACEQpwdLEEABEBACwIQCi3ajCJBAARAQJwAhEKcHSxBAARAQAsCEAot2owiQQAEQECcAIRCnB0sQQAEQEALAhAKLdqMIkEABEBAnACEQpwdLEEABEBACwIQCi3ajCJBAARAQJwAhEKcHSxBAARAQAsCEAot2owiQQAEQECcAIRCnB0sQQAEQEALAhAKLdqMIkEABEBAnACEQpwdLEEABEBACwIQCi3ajCJBAARAQJwAhEKcHSxBAARAQAsCEAot2owiQQAEQECcAIRCnB0sQQAEQEALAhAKLdqMIkEABEBAnACEQpwdLEEABEBACwIQCi3ajCJBAARAQJwAhEKcHSxBAARAQAsCEAot2owiQQAEQECcAIRCnB0sQQAEQEALAhAKLdqMIkEABEBAnACEQpwdLEEABEBACwIQCi3ajCJBAARAQJwAhEKcHSxBAARAQAsCEAot2owiQQAEQECcAIRCnB0sQQAEQEALAhAKLdqMIkEABEBAnMD/AyEO6qaNfnA8AAAAAElFTkSuQmCC"/>
</defs>
</svg>
`;

export const profileIcon = (
	color = '#E94D27',
): string => `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0)">
<path d="M14.5371 1.81714C14.8293 1.7488 15.1284 1.71429 15.4285 1.71428C16.4515 1.71428 17.4326 2.12066 18.156 2.84401C18.8793 3.56736 19.2857 4.54844 19.2857 5.57142C19.2857 6.5944 18.8793 7.57548 18.156 8.29883C17.4326 9.02219 16.4515 9.42857 15.4285 9.42857C15.1519 9.42847 14.8761 9.39916 14.6057 9.34114M17.1017 12.1817C18.8155 12.5625 20.3481 13.5164 21.4465 14.8859C22.5449 16.2555 23.1433 17.9587 23.1428 19.7143V22.2857H19.7143M4.71426 5.57142C4.71426 6.07795 4.81403 6.57952 5.00787 7.04749C5.20171 7.51546 5.48582 7.94067 5.84399 8.29883C6.20216 8.657 6.62737 8.94112 7.09534 9.13496C7.56331 9.3288 8.06488 9.42857 8.5714 9.42857C9.07793 9.42857 9.5795 9.3288 10.0475 9.13496C10.5154 8.94112 10.9406 8.657 11.2988 8.29883C11.657 7.94067 11.9411 7.51546 12.1349 7.04749C12.3288 6.57952 12.4285 6.07795 12.4285 5.57142C12.4285 5.06489 12.3288 4.56333 12.1349 4.09536C11.9411 3.62739 11.657 3.20218 11.2988 2.84401C10.9406 2.48584 10.5154 2.20173 10.0475 2.00789C9.5795 1.81405 9.07793 1.71428 8.5714 1.71428C8.06488 1.71428 7.56331 1.81405 7.09534 2.00789C6.62737 2.20173 6.20216 2.48584 5.84399 2.84401C5.48582 3.20218 5.20171 3.62739 5.00787 4.09536C4.81403 4.56333 4.71426 5.06489 4.71426 5.57142ZM16.2857 22.2857H0.857117V19.7143C0.857117 17.6683 1.66987 15.7062 3.11658 14.2595C4.56329 12.8127 6.52545 12 8.5714 12C10.6174 12 12.5795 12.8127 14.0262 14.2595C15.4729 15.7062 16.2857 17.6683 16.2857 19.7143V22.2857Z" stroke=${color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>`;
