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

const initMDCSelect = () => {
    const MDCSelect = mdc.select.MDCSelect;
    const mdcSelects = Array.from(document.querySelectorAll('.mdc-select'), select => new MDCSelect(select));
};

const initMDCTextField = () => {
    const MDCTextField = mdc.textField.MDCTextField;
    const mdcTextField = Array.from(document.querySelectorAll('.mdc-text-field'), textField => new MDCTextField(textField));
};

window.addEventListener('load', () => {
    if ('content' in document.createElement('template') != true) {
        openSnackbar('Peramban Anda belum mendukung penggunaan template HTML. Silahkan perbarui atau gunakan yang modern.');
        return;
    }

    const url = new URL(window.location.href);
    const arrPathname = url.pathname.split('/').filter(Boolean);
    const paramKategori = url.searchParams.get('kategori') || '';
    const paramMerek = url.searchParams.get('merek') || '';
    const paramProvinsi = url.searchParams.get('provinsi') || '';
    const paramKota = url.searchParams.get('kota') || '';
    const fireAuth = firebase.auth();
    const fireAnalytics = firebase.analytics();
    const fireStore = firebase.firestore();
    fireStore.enablePersistence().catch(showError);
    const topAppBar = document.querySelector('.mdc-top-app-bar');
    const drawer = document.querySelector('.mdc-drawer');
    const buttonSignIn = topAppBar.querySelector('.mdc-top-app-bar__action-item[title="Masuk dengan Google"]');
    const mainSection = document.querySelectorAll('main section');
    const linearProgress = mainSection[1].querySelector('.mdc-linear-progress');
    const template = document.querySelectorAll('template');
    const formData = {};

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

                const buttonUser = template[0].content;
                buttonUser.querySelector('a').setAttribute('aria-label', `${user.displayName} (${user.email})`);
                buttonUser.querySelector('a').href = `/pengguna/${user.uid}`;
                buttonUser.querySelector('a').title = buttonUser.querySelector('a').getAttribute('aria-label');
                buttonUser.querySelector('img').alt = buttonUser.querySelector('a').title;
                buttonUser.querySelector('img').src = `${user.photoURL}?sz=24`;

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
            let colRef = fireStore.collection(arrPathname.join('/'));

            if (!!paramKategori) colRef = colRef.where('kategori', '==', paramKategori);
            if (!!paramMerek) colRef = colRef.where('merek', '==', paramMerek);
            if (!!paramProvinsi) colRef = colRef.where('provinsi', '==', paramProvinsi);
            if (!!paramKota) colRef = colRef.where('kota', 'array-contains', paramKota);

            colRef.orderBy('diubahPada', 'desc').limit(12).get().then(query => {
                const ul = document.importNode(template[2].content, true);

                if (query.empty) {
                    openSnackbar(`Sales ${paramKategori} ${paramMerek} ${paramKota} ${paramProvinsi} belum tersedia`);
                } else {
                    query.docs.map(doc => {
                        const list = document.importNode(template[3].content, true);
                        list.querySelector('img').alt = doc.data().namaTampilan;
                        list.querySelector('img').src = `${doc.data().urlFoto}?sz=96`;
                        list.querySelector('.mdc-card__action--button').href = `/sales/${doc.id}`;
                        list.querySelector('.mdc-button__label').textContent = list.querySelector('img').alt;

                        ul.querySelector('ul').appendChild(list);
                    });

                    enabledShare();
                }

                mainSection[1].replaceChild(ul, linearProgress);
            }).then(() => {
                if (arrPathname.length == 1) {
                    const optMerek = document.importNode(template[8].content, true);
                    if (!!paramKategori && !!paramMerek) {
                        optMerek.querySelector(`optgroup[label="${paramKategori}"] option[value="${paramMerek}"]`).selected = true;
                    }

                    const optKota = document.importNode(template[9].content, true);
                    if (!!paramProvinsi && !!paramKota) {
                        optKota.querySelector(`optgroup[label="${paramProvinsi}"] option[value="${paramKota}"]`).selected = true;
                    }

                    const formSalesFilter = document.importNode(template[1].content, true);
                    formSalesFilter.querySelector('select[name=merek]').appendChild(optMerek);
                    formSalesFilter.querySelector('select[name=kota]').appendChild(optKota);
                    formSalesFilter.querySelector('form[name=salesFilter]').addEventListener('submit', () => {
                        event.preventDefault();

                        Array.from(event.target.elements).filter(element => element.nodeName == 'SELECT').map(element => {
                            const paramKey = element.name == 'merek' ? 'kategori' : 'provinsi';
                            url.searchParams.set(paramKey, element[element.selectedIndex].parentNode.label || '');
                            url.searchParams.set(element.name, element.value);
                        });

                        window.location.search = url.searchParams.toString();
                    });

                    mainSection[1].parentNode.insertBefore(formSalesFilter, mainSection[1]);

                    initMDCSelect();
                }
            }).catch(showError);
        } else {
            const docRefSummary = fireStore.doc(arrPathname.join('/'));
            const docRef = fireStore.doc(`${docRefSummary.path}/${docRefSummary.path}`);
            docRef.get().then(doc => {
                const article = document.importNode(template[4].content, true);

                if (!!user && user.uid == arrPathname[1]) {
                    const buttonEdit = document.importNode(template[7].content, true);
                    buttonEdit.querySelector('.mdc-button__label').textContent = 'Sunting';
                    buttonEdit.querySelector('button').addEventListener('click', () => {
                        const buttonSave = document.importNode(template[7].content, true);
                        buttonSave.querySelector('.mdc-button__label').textContent = 'Simpan';

                        const buttonCancel = document.importNode(template[7].content, true);
                        buttonCancel.querySelector('.mdc-button__label').textContent = 'Batal';
                        buttonCancel.querySelector('button').type = 'button';
                        buttonCancel.querySelector('button').addEventListener('click', () => window.location.reload(true));

                        const cardActions = document.importNode(template[6].content, true);
                        cardActions.querySelector('.mdc-card__actions').appendChild(buttonSave);
                        cardActions.querySelector('.mdc-card__actions').appendChild(buttonCancel);

                        const optMerek = document.importNode(template[8].content, true);
                        const optKota = document.importNode(template[9].content, true);
                        const formSalesData = document.importNode(template[5].content, true);

                        if (doc.exists) {
                            const buttonDelete = document.importNode(template[7].content, true);
                            buttonDelete.querySelector('.mdc-button__label').textContent = 'Hapus';
                            buttonDelete.querySelector('button').type = 'button';

                            cardActions.querySelector('.mdc-card__actions').appendChild(buttonDelete);

                            formSalesData.querySelector('input[name=nomorTelepon]').value = doc.data().nomorTelepon;
                            formSalesData.querySelector('input[name=nomorWhatsApp]').value = doc.data().nomorWhatsApp;
                            formSalesData.querySelector('input[name=dealer]').value = doc.data().dealer;

                            optMerek.querySelector(`optgroup[label="${doc.data().kategori}"] option[value="${doc.data().merek}"]`).selected = true;
                            
                            Array.from(optKota.querySelectorAll('optgroup'), optgroup => optgroup.disabled = true);
                            optKota.querySelector(`optgroup[label="${doc.data().provinsi}"]`).disabled = false;
                            doc.data().kota.map(kota => optKota.querySelector(`optgroup[label="${doc.data().provinsi}"] option[value="${kota}"]`).selected = true);
                        }

                        formSalesData.querySelector('select[name=merek]').appendChild(optMerek);
                        formSalesData.querySelector('select[name=kota]').appendChild(optKota);
                        formSalesData.querySelector('select[name=kota]').addEventListener('change', () => {
                            const element = event.target;

                            if (element.selectedIndex > 0) {
                                Array.from(element.options).filter(option => option.parentNode.nodeName == 'OPTGROUP').map(option => option.parentNode.disabled = true);
                                element.options[element.selectedIndex].parentNode.disabled = false;
                            } else {
                                Array.from(element.options).filter(option => option.parentNode.nodeName == 'OPTGROUP').map(option => option.parentNode.disabled = false);
                            }
                        });

                        formSalesData.querySelector('form').addEventListener('submit', () => {
                            event.preventDefault();

                            const element = event.target.elements;

                            formData.urlFoto = user.photoURL;
                            formData.namaTampilan = user.displayName;

                            let nomorTelepon = element.nomorTelepon.value.replace(/\D+/g, '');
                            if (nomorTelepon.startsWith(0)) nomorTelepon = nomorTelepon.replace(0, '');
                            if (nomorTelepon.startsWith(62)) nomorTelepon = nomorTelepon.replace(62, '');
                            formData.nomorTelepon = user.phoneNumber || nomorTelepon;

                            let nomorWhatsApp = element.nomorWhatsApp.value.replace(/\D+/g, '');
                            if (nomorWhatsApp.startsWith(0)) nomorWhatsApp = nomorWhatsApp.replace(0, '');
                            if (nomorWhatsApp.startsWith(62)) nomorWhatsApp = nomorWhatsApp.replace(62, '');
                            formData.nomorWhatsApp = nomorWhatsApp;

                            formData.email = user.email;
                            formData.dealer = element.dealer.value.trim();
                            formData.kategori = element.merek[element.merek.selectedIndex].parentNode.label;
                            formData.merek = element.merek.value;
                            formData.provinsi = !!element.kota[element.kota.selectedIndex] ? element.kota[element.kota.selectedIndex].parentNode.label : '';
                            formData.kota = Array.from(element.kota.selectedOptions, option => option.value).filter(option => !!option);
                            formData.diubahPada = firebase.firestore.FieldValue.serverTimestamp();

                            const formDataFilter = ['urlFoto', 'namaTampilan', 'kategori', 'merek', 'provinsi', 'kota', 'diubahPada'];

                            if (!doc.exists) {
                                formData.dibuatPada = firebase.firestore.FieldValue.serverTimestamp();
                                formDataFilter.push('dibuatPada');
                            }

                            const formDataSummary = {};

                            formDataFilter.forEach(cB => formDataSummary[cB] = formData[cB]);

                            docRef.set(formData, {merge: true}).then(() => docRefSummary.set(formDataSummary, {merge: true}).then(() => window.location.reload(true)).catch(showError)).catch(showError);
                        });

                        formSalesData.querySelector('form').appendChild(cardActions);

                        event.target.parentNode.parentNode.parentNode.replaceChild(formSalesData, event.target.parentNode.parentNode);

                        initMDCSelect();
                        initMDCTextField();

                        window.scroll(0, mainSection[0].scrollHeight);
                    });

                    const cardActions = document.importNode(template[6].content, true);
                    cardActions.querySelector('.mdc-card__actions').appendChild(buttonEdit);

                    article.querySelector('.mdc-card').appendChild(cardActions);
                }

                if (doc.exists) {
                    document.title = ` ${doc.data().namaTampilan} | ${document.title}`;
                    document.querySelector('meta[name=description]').setAttribute('content', `${doc.data().namaTampilan}, Sales resmi ${doc.data().kategori} ${doc.data().merek} ${doc.data().kota.join(', ')} - ${doc.data().provinsi}`);

                    mainSection[0].querySelector('img').alt = doc.data().namaTampilan;
                    mainSection[0].querySelector('img').src = `${doc.data().urlFoto}?sz=192`;
                    mainSection[0].querySelector('h1').textContent = doc.data().namaTampilan;
                    mainSection[0].querySelector('p').textContent = `Sales resmi ${doc.data().kategori} ${doc.data().merek} ${doc.data().kota.join(', ')} - ${doc.data().provinsi}`;

                    const listItem = article.querySelectorAll('.mdc-list-item');
                    listItem[0].href = `tel:0${doc.data().nomorTelepon}`;
                    listItem[0].querySelector('.mdc-list-item__primary-text').textContent = `0${doc.data().nomorTelepon}`;
                    listItem[1].href = `sms:0${doc.data().nomorTelepon}`;
                    listItem[1].querySelector('.mdc-list-item__primary-text').textContent = `0${doc.data().nomorTelepon}`;

                    const docDataNomorWhatsApp = doc.data().nomorWhatsApp || doc.data().nomorTelepon;
                    listItem[2].href = `https://wa.me/62${docDataNomorWhatsApp}`;
                    listItem[2].querySelector('.mdc-list-item__primary-text').textContent = `0${docDataNomorWhatsApp}`;

                    listItem[3].href = `mailto:${doc.data().email}`;
                    listItem[3].querySelector('.mdc-list-item__primary-text').textContent = doc.data().email;
                    listItem[4].href = `https://www.google.co.id/search?q=${doc.data().dealer}`;
                    listItem[4].querySelector('.mdc-list-item__primary-text').textContent = doc.data().dealer;
                    listItem[5].href = `/sales?kategori=${doc.data().kategori}`;
                    listItem[5].querySelector('.mdc-list-item__primary-text').textContent = doc.data().kategori;
                    listItem[6].href = `/sales?kategori=${doc.data().kategori}&merek=${doc.data().merek}`;
                    listItem[6].querySelector('.mdc-list-item__primary-text').textContent = doc.data().merek;

                    const docDataKota = doc.data().kota[Math.floor(Math.random() * doc.data().kota.length)];
                    listItem[7].href = `/sales?kategori=${doc.data().kategori}&merek=${doc.data().merek}&provinsi=${doc.data().provinsi}&kota=${docDataKota}`;
                    listItem[7].querySelector('.mdc-list-item__primary-text').textContent = docDataKota;

                    mainSection[1].replaceChild(article, linearProgress);

                    enabledShare();
                } else {
                    if (!!user && user.uid == arrPathname[1]) {
                        mainSection[0].querySelector('img').alt = `${user.displayName} (${user.email})`;
                        mainSection[0].querySelector('img').src = `${user.photoURL}?sz=192`;
                        mainSection[0].querySelector('h1').textContent = `Halo, ${user.displayName}`;
                        mainSection[0].querySelector('p').textContent = 'Kelola info Anda agar Direktori Sales berfungsi dengan lebih baik untuk Anda';

                        mainSection[1].replaceChild(article, linearProgress);
                    } else {
                        openSnackbar('Dokumen tidak ditemukan.');
                    }
                }
            }).catch(showError);
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
