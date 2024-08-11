const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)


function replaceFunction(letter, index) {
    if (index === 0) {
        return letter.toLowerCase()
    } else {
        return `_${letter.toLowerCase()}`
    }
}

function camelToSnakeCase(str) {
    return str.replace(/[A-Z]/g, replaceFunction)
}


if (urlParams.has('cmds')) {
    let cmd = urlParams.get('cmds')
    let url = `https://help.autodesk.com/cloudhelp/2022/ENU/Maya-Tech-Docs/CommandsPython/${cmd}.html`
    window.location.replace(url)
}


if (urlParams.has('om2')) {
    let cmd = urlParams.get('om2')
    let snakeCmd = camelToSnakeCase(cmd)
    let url = `https://help.autodesk.com/view/MAYAUL/2024/ENU/?guid=MAYA_API_REF_py_ref_class_open_maya_1_1_${snakeCmd}_html`
    window.location.replace(url);
}


if (urlParams.has('om')) {
    let cmd = urlParams.get('om')
    let snakeCmd = camelToSnakeCase(cmd)
    let url = `https://help.autodesk.com/view/MAYAUL/2024/ENU/?guid=MAYA_API_REF_cpp_ref_class_${snakeCmd}_html`
    window.location.replace(url);
}


