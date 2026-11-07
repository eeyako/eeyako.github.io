const CMDS_ROOT_URL = 'https://help.autodesk.com/cloudhelp/2025/ENU/Maya-Tech-Docs/CommandsPython';
const MEL_ROOT_URL = 'https://help.autodesk.com/cloudhelp/2025/ENU/Maya-Tech-Docs/Commands';
const OM2_ROOT_URL = 'https://help.autodesk.com/cloudhelp/2025/ENU/MAYA-API-REF/py_ref';
const OM_ROOT_URL = 'https://help.autodesk.com/cloudhelp/2025/ENU/MAYA-API-REF/cpp_ref';
const QT_ROOT_URL = 'https://doc.qt.io/qt-6';
const PXR_ROOT_URL = 'https://openusd.org/release/api';
const PXR_INDEX_URL = 'pxr-index.json';

const title = document.querySelector('.title');
const message = document.querySelector('.message');

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const textTimeout = 400;

const availableQueries = 'Available queries are: cmds, mel, om2, om, pxr, qt';

async function animateText(element, text, speed = 1) {
    var textBuild = '';
    element.style = 'filter: opacity(100%);';
    for (let i = 0; i < text.length; i++) {
        setTimeout(() => {
            textBuild += text[i];
            element.textContent = textBuild;
        }, speed * 10 * i);
    }
}


async function fetchAndGo(query, rootUrl, index, selector) {
    const res = await fetch(`${rootUrl}/${index}`);
    const htmlString = await res.text();
    const obj = new DOMParser().parseFromString(htmlString, 'text/html');

    const a = obj.querySelectorAll(selector);
    for (let i = 0; i < a.length; i++) {
        if (query == a[i].textContent.toLowerCase()) {
            const path = a[i].getAttribute('href');
            window.location.replace(`${rootUrl}/${path}`);
            return true;
        }
    }
    return false;
}


async function lookupInIndex(query, rootUrl, indexUrl) {
    try {
        const res = await fetch(indexUrl);
        if (!res.ok) {
            return false;
        }
        const classes = await res.json();
        const path = classes[query];
        if (!path) {
            return false;
        }
        window.location.replace(`${rootUrl}/${path}`);
        return true;
    } catch {
        return false;
    }
}


async function handleUrlParams() {
    const value = urlParams.entries().next()['value'];
    if (!value) {
        setTimeout(() => {
            animateText(title, 'Error: no query requested');
            animateText(message, availableQueries);
        }, textTimeout);
        return;
    }

    let rootUrl;
    let index;
    let selector;
    let useIndex = false;
    const param = value[0].toLowerCase();
    const query = value[1].toLowerCase();
    switch (param) {
        case 'cmds':
            rootUrl = CMDS_ROOT_URL;
            index = 'index_all.html';
            selector = '.related-links a';
            break;
        case 'mel':
            rootUrl = MEL_ROOT_URL;
            index = 'index_all.html';
            selector = '.related-links a';
            break;
        case 'om2':
            rootUrl = OM2_ROOT_URL;
            index = 'annotated.html';
            selector = 'a.el';
            break;
        case 'om':
            rootUrl = OM_ROOT_URL;
            index = 'annotated.html';
            selector = 'a.el';
            break;
        case 'pxr':
            rootUrl = PXR_ROOT_URL;
            useIndex = true;
            break;
        case 'qt':
            rootUrl = QT_ROOT_URL;
            window.location.replace(`${rootUrl}/${query}.html`);
            return;
        default:
            setTimeout(() => {
                animateText(title, 'Error: Incorrect query');
                setTimeout(() => { animateText(message, availableQueries); }, textTimeout);
            }, textTimeout);
            return;
    }
    const success = useIndex
        ? await lookupInIndex(query, rootUrl, PXR_INDEX_URL)
        : await fetchAndGo(query, rootUrl, index, selector);
    if (!success) {
        setTimeout(() => {
            animateText(title, 'Not found');
            setTimeout(() => { animateText(message, `Could not find '${query}' under '${param}'`); }, textTimeout);
        }, textTimeout);
    }
}


animateText(title, 'Searching...');
handleUrlParams();
