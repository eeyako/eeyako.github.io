const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)

const dataPath = "https://eeyako.github.io/data"
const cmdsJson = `${dataPath}/cmds.json`
const melJson = `${dataPath}/mel.json`

const cmdsRootUrl = "https://help.autodesk.com/cloudhelp/2024/ENU/Maya-Tech-Docs/CommandsPython"
const omRootUrl = "https://help.autodesk.com/cloudhelp/2024/ENU/MAYA-API-REF/cpp_ref";
const om2RootUrl = "https://help.autodesk.com/cloudhelp/2024/ENU/MAYA-API-REF/py_ref";

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
        cmd = cmd.toLowerCase()
        fetch(`${om2RootUrl}/annotated.html`)
            .then(res => res.text())
            .then(htmlString => new DOMParser().parseFromString(htmlString, "text/html"))
            .then(obj => {
                let a = obj.querySelectorAll("a.el");
                for (let i = 0; i < a.length; ++i) {
                    if (cmd == a[i].innerHTML.toLowerCase()) {
                        return a[i].getAttribute("href")
                    }
                }
            })
            .then(url => window.location.replace(`${om2RootUrl}/${url}`));
    }
}


if (urlParams.has('om')) {
    let cmd = urlParams.get('om');
    if (cmd) {
        cmd = cmd.toLowerCase()
        fetch(`${omRootUrl}/annotated.html`)
            .then(res => res.text())
            .then(htmlString => new DOMParser().parseFromString(htmlString, "text/html"))
            .then(obj => {
                let a = obj.querySelectorAll("a.el");
                for (let i = 0; i < a.length; ++i) {
                    if (cmd == a[i].innerHTML.toLowerCase()) {
                        return a[i].getAttribute("href")
                    }
                }
            })
            .then(url => window.location.replace(`${omRootUrl}/${url}`));
    }
}


if (urlParams.has('mel')) {
    let cmd = urlParams.get('mel');
    if (cmd) {
        fetchAndGo(cmd.toLowerCase(), melJson);
    }
}
