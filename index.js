const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)

const cmdsRootUrl = "https://help.autodesk.com/cloudhelp/2024/ENU/Maya-Tech-Docs/CommandsPython"
const melRootUrl = "https://help.autodesk.com/cloudhelp/2024/ENU/Maya-Tech-Docs/Commands"
const omRootUrl = "https://help.autodesk.com/cloudhelp/2024/ENU/MAYA-API-REF/cpp_ref";
const om2RootUrl = "https://help.autodesk.com/cloudhelp/2024/ENU/MAYA-API-REF/py_ref";


function fetchAndGo(param, rootUrl, index, query) {
    param = param.toLowerCase()
    fetch(`${rootUrl}/${index}`)
        .then(res => res.text())
        .then(htmlString => new DOMParser().parseFromString(htmlString, "text/html"))
        .then(obj => {
            let a = obj.querySelectorAll(`${query}`);
            for (let i = 0; i < a.length; ++i) {
                if (param == a[i].innerHTML.toLowerCase()) {
                    return a[i].getAttribute("href")
                }
            }
        })
        .then(url => window.location.replace(`${rootUrl}/${url}`));
}


if (urlParams.has('cmds')) {
    let cmd = urlParams.get('cmds');
    if (cmd) {
        fetchAndGo(cmd, cmdsRootUrl, "index_all.html", ".related-links a");
    }
}


if (urlParams.has('mel')) {
    let mel = urlParams.get('mel');
    if (mel) {
        fetchAndGo(mel, melRootUrl, "index_all.html", ".related-links a");
    }
}


if (urlParams.has('om2')) {
    let om2 = urlParams.get('om2');
    if (om2) {
        fetchAndGo(om2, om2RootUrl, "annotated.html", "a.el")
    }
}


if (urlParams.has('om')) {
    let om = urlParams.get('om');
    if (om) {
        fetchAndGo(om, omRootUrl, "annotated.html", "a.el")
    }
}
