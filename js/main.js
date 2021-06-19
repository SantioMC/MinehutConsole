const BASE_API = 'https://api.minehut.com';
const AUTH_API = 'https://authentication-service-prod.superleague.com';

const AUTH_DATA = {
	domain: 'superleague.auth0.com',
	clientId: '5n8bshgK8xj12bfhltUwS55PetzSAXQo'
};

const consoleWindow = '<div class="row"><div class="col col-12"><div class="v-card v-sheet theme--dark"><div class="v-card__title">Server Console</div><div class="v-card__subtitle"><div id="console" style="overflow-y: auto; height: 24rem; width: 100% !important"><div class="console_log" id="consoleLog">Loading console...</div></div><div class="v-card__text da-icon-scroll"></div></div>';

var _user_id = false;
var created = false;
var _session_id, _auth_token;

var consoleUpdater;
var currentLine = 0;
var serverID;
var consoleLimit = 500; // How many lines are stored in the console

refreshSession();
console.log('Successfully hooked into MinehutConsole!');

function refreshSession() {
	_session_id = localStorage.minehut_session_id;
	_auth_token = localStorage.minehut_auth_token;
}

async function getServerLog(id, callback) {
	$.ajax({
		type: 'GET',
		url: `${BASE_API}/file/${id}/read//logs/latest.log`,
		timeout: 500,
		headers: {
			Authorization: _auth_token,
			'X-Session-Id': _session_id,
			'Content-Type': 'application/json'
		},
		success: callback,
		error: () => {
			consoleWriteLine('[MinehutConsole] Failed to read your server logs, the file is likely too large to be read!', 'ERROR');
		}
	});
}

function performGhostLogin() {
	refreshSession(); // Fetch current session ids
	$.ajax({
		type: 'POST',
		url: AUTH_API + '/v1/user/login/ghost',
		data: JSON.stringify({ minehutSessionId: _session_id, slgSessionId: localStorage.slg_session_id }),
		headers: {
			'Content-Type': 'application/json',
			'X-SLG-USER': localStorage.slg_user_token,
			'X-SLG-SESSION': localStorage.slg_session_id
		},
		success: (data) => {
			localStorage.slg_session_id = data.slgSessionData.slgSessionId;
			localStorage.slg_user_token = data.slgSessionData.slgUserId;
			localStorage.minehut_session_id = data.minehutSessionData.sessionId;
			localStorage.minehut_auth_token = data.minehutSessionData.token;
			refreshSession(); // Update data to our newly fetched ones
		}
	});
}

var _previousWindow;
setInterval(() => {
	if (_previousWindow == location.pathname) return;
	clearInterval(consoleUpdater);
	currentLine = 0;
	locationUpdated();
	_previousWindow = location.pathname;
}, 500);

var consoleLine;

async function locationUpdated() {
	if (location.pathname != '/dashboard/appearance') return;
	performGhostLogin();

	var title = $('.title');
	if (title == null || title.text().trim() == '') return;
	var serverName = title.text().replace(/(.+).minehut.gg/, '$1');
	if (serverName == null) return;
	console.log('[MinehutConsole] Fetching server id for ' + serverName);
	var f = await fetch(`${BASE_API}/server/${serverName}?byName=true`);
	var data = await f.json();
	serverID = data.server._id;
	if (serverID == null) return;

	var body = $($('*[no-gutter]').find('div')[0]);
	var consoleBody = $.parseHTML(consoleWindow);
	body.append(consoleBody);
	consoleLine = $('#consoleLog').clone();
	$('#consoleLog').remove();
	consoleWriteLine('[MinehutConsole] Fetching server logs...', 'SYSTEM');
	updateConsole('[MinehutConsole] Successfully fetched server logs!');

	// Create server status listener
	var _serverStatus = $('.v-chip__content').first();
	var _previousStatus = _serverStatus.text();
	$('body').on('DOMSubtreeModified', '.v-chip__content', function () {
		if (_serverStatus.text() != _previousStatus) {
			consoleWriteLine('[Minehut] Server status changed to ' + _serverStatus.text(), 'MINEHUT');
			_previousStatus = _serverStatus.text();
		}
	});

	// Create logs listener
	consoleUpdater = setInterval(() => {
		updateConsole();
	}, 5000);
}

function updateConsole(extra) {
	// Fetch new logs
	if (serverID == null) return;
	getServerLog(serverID, (log) => {
		if (log.content == undefined) return consoleWriteLine('[MinehutConsole] Error: ' + log.message, 'ERROR');
		var logs = log.content.split(/\n/g);
		var newCurrent = logs.length;
		for (let i = 0; i < currentLine - 1; i++) logs.shift();
		if ($('#console').children().length > consoleLimit) while ($('#console').children().length > consoleLimit) $('#console').children().first().remove();
		currentLine = newCurrent;
		logs.forEach((l) => {
			handleLog(l);
		});
		if (extra != null) consoleWriteLine(extra, 'SYSTEM');
	});
}

function handleLog(log) {
	if (log == '' || log == ' ') return;
	var regex = /\[(\d+:\d+:\d+)\] \[[A-Z0-9 ]+\/([A-Z]+)\]:/i;
	if (log.match(regex) != null) {
		var type = log.match(regex)[2].toUpperCase();
		if (type != 'INFO' && type != 'WARN' && type != 'ERROR') return consoleWriteLine(log);
		consoleWriteLine(log, type);
	} else consoleWriteLine(log);
}

function consoleWriteLine(line, type) {
	if ($('#console') == null || $('#console')[0] == null) return;
	var log = consoleLine.clone();
	log.text(line);
	if (type != null) log.addClass('console_' + type);
	var scroll = Math.floor($('#console').scrollTop()) >= Math.floor($('#console')[0].scrollHeight - $('#console')[0].offsetHeight) - 20;
	$('#console').append(log);
	if (scroll) $('#console').scrollTop($('#console')[0].scrollHeight);
}
