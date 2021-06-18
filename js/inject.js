function loadStyle(url) {
	const style = document.createElement('link');
	style.href = url;
	style.type = 'text/css';
	style.rel = 'stylesheet';
	document.head.appendChild(style);
}

function injectJs(url) {
	const js = document.createElement('script');
	js.type = 'text/javascript';
	js.src = url;
	document.head.appendChild(js);
}

// Inject CSS
loadStyle(chrome.extension.getURL(`css/theme.css`));

// Inject jQuery
injectJs(chrome.extension.getURL(`thirdParty/jquery-min.js`));

// Inject Core
injectJs(chrome.extension.getURL(`js/main.js`));
