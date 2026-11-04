import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import {
    doc,
    getFirestore,
    onSnapshot,
    runTransaction,
    serverTimestamp,
    setDoc
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const sharedStateRef = doc(db, 'shared', 'schedule');

let syncReady = false;
let writeTimer = null;
let latestLocalState;

function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.keys(value).sort().map(key =>
            `${JSON.stringify(key)}:${stableStringify(value[key])}`
        );
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}

window.setCloudSyncStatus = message => {
    const status = document.getElementById('cloud-sync-status');
    if (status) status.textContent = message;
};

async function initializeCloudSync() {
    window.setCloudSyncStatus('Đang đăng nhập ẩn danh và kết nối dữ liệu chung…');
    await signInAnonymously(auth);

    await new Promise((resolve, reject) => {
        let initialized = false;
        let creatingDocument = false;
        let unsubscribe = () => {};

        const fail = error => {
            console.error('Lỗi đồng bộ Firestore:', error);
            window.setCloudSyncStatus(
                `Không kết nối được dữ liệu chung (${error.message}). Kiểm tra Firebase Authentication và Firestore Rules.`
            );
            if (!initialized) {
                unsubscribe();
                reject(error);
            }
        };

        unsubscribe = onSnapshot(sharedStateRef, async snapshot => {
            try {
                if (snapshot.exists()) {
                    const state = snapshot.data()?.state;
                    if (!state || typeof state !== 'object' || Array.isArray(state)) {
                        throw new Error('Dữ liệu lịch chung trên Firestore không hợp lệ.');
                    }

                    const localState = window.getSharedAppState();
                    if (stableStringify(state) !== stableStringify(localState)) {
                        window.applySharedAppState(state);
                        window.setCloudSyncStatus('Đã nhận dữ liệu mới từ đám mây.');
                    }
                    syncReady = true;
                    if (!initialized) {
                        initialized = true;
                        window.setCloudSyncStatus('Đã kết nối dữ liệu chung.');
                        resolve();
                    }
                    return;
                }

                if (!initialized && !creatingDocument) {
                    creatingDocument = true;
                    latestLocalState = window.getSharedAppState();
                    await runTransaction(db, async transaction => {
                        const existing = await transaction.get(sharedStateRef);
                        if (!existing.exists()) {
                            transaction.set(sharedStateRef, {
                                state: latestLocalState,
                                updatedAt: serverTimestamp()
                            });
                        }
                    });
                }
            } catch (error) {
                fail(error);
            }
        }, fail);
    });
}

window.saveSharedCloudState = state => {
    if (!syncReady) {
        latestLocalState = state;
        return;
    }

    window.setCloudSyncStatus('Đang lưu thay đổi lên đám mây…');
    clearTimeout(writeTimer);
    writeTimer = setTimeout(async () => {
        try {
            await setDoc(sharedStateRef, {
                state,
                updatedAt: serverTimestamp()
            });
            window.setCloudSyncStatus('Đã lưu dữ liệu chung.');
        } catch (error) {
            console.error('Không thể lưu dữ liệu lên Firestore:', error);
            window.setCloudSyncStatus(
                `Lỗi lưu dữ liệu chung (${error.message}). Thay đổi này chưa được đồng bộ.`
            );
        }
    }, 250);
};

function startCloudSync() {
    if (!window.ENABLE_CLOUD_SYNC) {
        window.setCloudSyncStatus('Chế độ local: dữ liệu không đồng bộ lên Firebase.');
        return;
    }

    initializeCloudSync().catch(error => {
        console.error('Không thể khởi tạo Firebase:', error);
        window.setCloudSyncStatus(
            `Không thể khởi tạo Firebase (${error.message}). Mở website qua Netlify hoặc máy chủ web.`
        );
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCloudSync, { once: true });
} else {
    startCloudSync();
}
