const queryString = window.location.search
// console.log(queryString)

const urlParams = new URLSearchParams(queryString)


function isUpperCase(str) {
    return str === str.toUpperCase() && str !== str.toLowerCase()
}


if (urlParams.has('cmds')) {
    let cmd = urlParams.get('cmds')
    let url = `https://help.autodesk.com/cloudhelp/2022/ENU/Maya-Tech-Docs/CommandsPython/${cmd}.html`
    window.location.replace(url)
}

if (urlParams.has('om2')) {
    let cmd = urlParams.get('om2')
    let cmd_fmt = ""
    for (let i = 0; i < cmd.length; i++) {
        // If it's a lowercase, just add it as is
        if (!isUpperCase(String(cmd).charAt(i))) {
            console.log("is lower")
            cmd_fmt += String(cmd).charAt(i)
        } else {
            // It's an uppercase and it's not the first, precede it with _ and lower it
            cmd_fmt += "_" + String(cmd).charAt(i).toLowerCase();
        }
    }
    let url = `https://help.autodesk.com/view/MAYAUL/2024/ENU/?guid=MAYA_API_REF_py_ref_class_open_maya_1_1${cmd_fmt}_html`
    console.log(url);
    window.location.replace(url);
}


