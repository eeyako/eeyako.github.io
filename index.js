const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
const dataPath = "https://eeyako.github.io/data"
const cmdsJson = `${dataPath}/cmds.json`
const melJson = `${dataPath}/mel.json`
const omJson = `${dataPath}/om.json`
const om2Json = `${dataPath}/om2.json`


function fetchAndGo(cmd, json) {
    fetch(json)
        .then(res => res.json())
        .then(json => window.location.replace(json[`${cmd}`]));
}


if (urlParams.has('cmds')) {
    let cmd = urlParams.get('cmds');
    if (cmd) {
        fetchAndGo(cmd.toLowerCase(), cmdsJson);
    }
}


if (urlParams.has('om2')) {
    let cmd = urlParams.get('om2');
    if (cmd) {
        fetchAndGo(cmd.toLowerCase(), om2Json);
    }
}


if (urlParams.has('om')) {
    let cmd = urlParams.get('om');
    if (cmd) {
        fetchAndGo(cmd.toLowerCase(), omJson);
    }
}


if (urlParams.has('mel')) {
    let cmd = urlParams.get('mel');
    if (cmd) {
        fetchAndGo(cmd.toLowerCase(), melJson);
    }
}
