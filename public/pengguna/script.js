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

const initImgResize = (src, size) => {
    if (src.endsWith('.jpg')) {
        return `${src}?sz=${size}`;
    } else {
        return `${src}=s${size}-c`;
    }
};

window.addEventListener('load', () => {
    if ('content' in document.createElement('template') != true) {
        openSnackbar('Peramban Anda belum mendukung penggunaan template HTML. Silahkan perbarui atau gunakan yang modern.');
        return;
    }

    const url = new URL(window.location.href);
    const arrPathname = url.pathname.split('/').filter(Boolean);
    const fireAuth = firebase.auth();
    const fireAnalytics = firebase.analytics();
    const topAppBar = document.querySelector('.mdc-top-app-bar');
    const drawer = document.querySelector('.mdc-drawer');
    const buttonSignIn = topAppBar.querySelector('.mdc-top-app-bar__action-item[title="Masuk dengan Google"]');
    const mainSection = document.querySelectorAll('main section');
    const linearProgress = mainSection[1].querySelector('.mdc-linear-progress');
    const template = document.querySelectorAll('template');

    fireAuth.getRedirectResult().then(result => {
        if (result.credential) {
            const accessToken = result.credential.accessToken;
        }

        const user = result.user;

        if (!!user) {
            openSnackbar(`Masuk sebagai ${user.displayName} (${user.email})`);
        }
    }).catch(showError);

    fireAuth.onAuthStateChanged(user => {
        if (!!user) {
            user.getIdTokenResult().then(idTokenResult => {
                user.isAdmin = !!idTokenResult.claims.admin;

                const buttonUser = document.importNode(template[0].content, true);
                buttonUser.querySelector('a').href = `/pengguna/${user.uid}`;
                buttonUser.querySelector('a').setAttribute('aria-label', `${user.displayName} (${user.email})`);
                buttonUser.querySelector('a').title = buttonUser.querySelector('a').getAttribute('aria-label');
                buttonUser.querySelector('img').alt = buttonUser.querySelector('a').title;
                buttonUser.querySelector('img').src = initImgResize(user.photoURL, 24);

                buttonSignIn.parentNode.replaceChild(buttonUser, buttonSignIn);
            }).catch(showError);
        } else {
            buttonSignIn.addEventListener('click', () => {
                const provider = new firebase.auth.GoogleAuthProvider();
                fireAuth.signInWithRedirect(provider);
            }, {once: true});
            buttonSignIn.disabled = false;
        }

        if (arrPathname.length % 2) {
            openSnackbar('Data tidak tersedia');
        } else {
            if (!!user) {
                user.getIdTokenResult().then(idTokenResult => {
                    user.isAdmin = !!idTokenResult.claims.admin;

                    if (user.isAdmin || user.uid == arrPathname[1]) {
                        mainSection[0].querySelector('img').alt = `${user.displayName} (${user.email})`;
                        mainSection[0].querySelector('img').src = initImgResize(user.photoURL, 192);
                        mainSection[0].querySelector('h1').textContent = `Halo, ${user.displayName}`;

                        const article = document.importNode(template[3].content, true);
                        article.querySelector('a:first-child').href = `/sales/${user.uid}`;
                        article.querySelector('button:last-child').addEventListener('click', () => fireAuth.signOut().then(() => window.location.assign('/')).catch(showError));

                        mainSection[1].replaceChild(article, linearProgress);
                    } else {
                        //TODO
                    }
                }).catch(showError);
            } else {
                //TODO
            }
        }
    });

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
