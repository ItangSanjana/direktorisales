/* Copyright 2019 Itang Sanjana */

'use strict';

const openSnackbar = (...params) => {
    const MDCSnackbar = mdc.snackbar.MDCSnackbar;
    const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'));
    snackbar.timeoutMs = 10000;
    snackbar.labelText = params.join(' ');
    snackbar.open();
};

const showError = err => {
    console.error(err);
    openSnackbar(err.code, ':', err.message);
};

const enabledShare = () => {
    const buttonShare = document.querySelector('.mdc-top-app-bar__action-item:first-child');
    buttonShare.addEventListener('click', event => {
        if ('share' in navigator) {
            navigator.share({
                title: document.title,
                text: document.querySelector('meta[name=description]').content,
                url: document.URL
            }).catch(showError);
        } else {
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.value = document.URL;
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            openSnackbar(`${event.target.title} : URL telah disalin ke papan klip`);
        }
    });
    buttonShare.disabled = false;
};

window.addEventListener('load', () => {
    if ('content' in document.createElement('template') != true) {
        openSnackbar('Peramban Anda belum mendukung penggunaan template HTML. Silahkan perbarui atau gunakan yang modern.');
        return;
    }

    const topAppBar = document.querySelector('.mdc-top-app-bar');
    const drawer = document.querySelector('.mdc-drawer');
    const mainSection = document.querySelectorAll('main section');
    const linearProgress = mainSection[1].querySelector('.mdc-linear-progress');
    const template = document.querySelectorAll('template');

    const templateQuery = document.importNode(template[1].content, true);
    linearProgress.parentNode.replaceChild(templateQuery, linearProgress);

    const MDCTopAppBar = mdc.topAppBar.MDCTopAppBar;
    const newTopAppBar = new MDCTopAppBar(topAppBar);
    const MDCDrawer = mdc.drawer.MDCDrawer;
    const newDrawer = new MDCDrawer(drawer);
    newTopAppBar.listen('MDCTopAppBar:nav', () => newDrawer.open = !newDrawer.open);

    const MDCRipple = mdc.ripple.MDCRipple;
    const drawerListElements = newDrawer.list.listElements.map(drawerListElement => new MDCRipple(drawerListElement));

    const MDCLinearProgress = mdc.linearProgress.MDCLinearProgress;
    const newLinearProgress = new MDCLinearProgress(linearProgress);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(showError);
    }
});
