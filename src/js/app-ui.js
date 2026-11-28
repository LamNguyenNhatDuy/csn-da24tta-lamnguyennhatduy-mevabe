(function (global) {
    'use strict';

    let activeModal = null;

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getInitial(name) {
        if (!name || typeof name !== 'string') return '?';
        const trimmed = name.trim();
        if (!trimmed) return '?';
        const parts = trimmed.split(/\s+/);
        const lastWord = parts[parts.length - 1];
        const firstChar = Array.from(lastWord)[0];
        return firstChar ? firstChar.toUpperCase() : '?';
    }

    function createAvatar(src, name, size) {
        const px = typeof size === 'number' && size > 0 ? size : 40;
        const span = document.createElement('span');
        span.className = 'app-avatar';
        span.style.width = px + 'px';
        span.style.height = px + 'px';
        span.style.fontSize = Math.max(12, Math.round(px * 0.42)) + 'px';

        if (src && typeof src === 'string' && src.trim()) {
            const img = document.createElement('img');
            img.src = src;
            img.alt = name ? String(name) : 'Ảnh đại diện';
            img.addEventListener('error', function () {
                span.textContent = getInitial(name);
            });
            span.appendChild(img);
        } else {
            span.textContent = getInitial(name);
        }

        return span;
    }

    function avatarHtml(src, name, size) {
        const px = typeof size === 'number' && size > 0 ? size : 40;
        const fontSize = Math.max(12, Math.round(px * 0.42));
        const inner = (src && typeof src === 'string' && src.trim())
            ? '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(name || 'Ảnh đại diện') + '">'
            : escapeHtml(getInitial(name));
        return '<span class="app-avatar" style="width:' + px + 'px;height:' + px + 'px;font-size:' + fontSize + 'px;">' + inner + '</span>';
    }

    function readImageFile(file, maxSize) {
        const limit = typeof maxSize === 'number' && maxSize > 0 ? maxSize : 256;
        return new Promise(function (resolve, reject) {
            if (!file) {
                reject(new Error('Không tìm thấy tệp hình ảnh.'));
                return;
            }
            if (!file.type || file.type.indexOf('image/') !== 0) {
                reject(new Error('Vui lòng chọn đúng tệp hình ảnh (JPG, PNG, WebP...).'));
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                reject(new Error('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = function (ev) {
                const img = new Image();
                img.onload = function () {
                    let w = img.width;
                    let h = img.height;
                    if (w > limit || h > limit) {
                        if (w >= h) {
                            h = Math.round((h * limit) / w);
                            w = limit;
                        } else {
                            w = Math.round((w * limit) / h);
                            h = limit;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, w);
                    canvas.height = Math.max(1, h);
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    try {
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        resolve(dataUrl);
                    } catch (err) {
                        reject(new Error('Không thể xử lý hình ảnh này.'));
                    }
                };
                img.onerror = function () {
                    reject(new Error('Tệp ảnh không hợp lệ hoặc bị hỏng.'));
                };
                img.src = ev.target.result;
            };
            reader.onerror = function () {
                reject(new Error('Không thể đọc tệp ảnh từ thiết bị.'));
            };
            reader.readAsDataURL(file);
        });
    }

    function closeActiveModal(triggerCallback) {
        if (!activeModal) return;
        const current = activeModal;
        activeModal = null;

        document.removeEventListener('keydown', current.onKeyDown);
        if (current.overlay.parentNode) {
            current.overlay.parentNode.removeChild(current.overlay);
        }
        document.body.style.overflow = current.prevOverflow;

        if (triggerCallback && typeof current.onDismiss === 'function') {
            current.onDismiss();
        }
    }

    function buildDetailsElement(details) {
        if (!Array.isArray(details) || details.length === 0) return null;
        const box = document.createElement('div');
        box.className = 'app-modal-details';

        details.forEach(function (pair) {
            if (!Array.isArray(pair) || pair.length < 2) return;
            const row = document.createElement('div');
            row.className = 'app-modal-detail-row';

            const labelEl = document.createElement('span');
            labelEl.className = 'app-modal-detail-label';
            labelEl.textContent = String(pair[0]);

            const valueEl = document.createElement('span');
            valueEl.className = 'app-modal-detail-value';
            valueEl.textContent = pair[1] !== null && pair[1] !== undefined && pair[1] !== '' ? String(pair[1]) : 'Chưa cập nhật';

            row.appendChild(labelEl);
            row.appendChild(valueEl);
            box.appendChild(row);
        });

        return box;
    }

    function buildTableElement(tableData) {
        if (!tableData || !Array.isArray(tableData.rows) || tableData.rows.length === 0) return null;

        const wrap = document.createElement('div');
        wrap.className = 'app-modal-table-wrap';

        const table = document.createElement('table');
        table.className = 'app-modal-table';

        if (Array.isArray(tableData.headers) && tableData.headers.length > 0) {
            const thead = document.createElement('thead');
            const trHead = document.createElement('tr');
            tableData.headers.forEach(function (h) {
                const th = document.createElement('th');
                th.textContent = String(h);
                trHead.appendChild(th);
            });
            thead.appendChild(trHead);
            table.appendChild(thead);
        }

        const tbody = document.createElement('tbody');
        tableData.rows.forEach(function (rowData) {
            const tr = document.createElement('tr');
            (Array.isArray(rowData) ? rowData : []).forEach(function (cell) {
                const td = document.createElement('td');
                td.textContent = cell !== null && cell !== undefined ? String(cell) : '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);

        return wrap;
    }

    function openModal(modalBox, onDismiss) {
        closeActiveModal(false);

        const overlay = document.createElement('div');
        overlay.className = 'app-modal-overlay';
        modalBox.setAttribute('role', 'dialog');
        modalBox.setAttribute('aria-modal', 'true');
        overlay.appendChild(modalBox);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function onKeyDown(e) {
            if (e.key === 'Escape') {
                closeActiveModal(true);
            }
        }

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                closeActiveModal(true);
            }
        });

        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(overlay);

        activeModal = {
            overlay: overlay,
            prevOverflow: prevOverflow,
            onKeyDown: onKeyDown,
            onDismiss: onDismiss
        };
    }

    function createBtn(className, label, onClick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'app-btn ' + className;
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        return btn;
    }

    function buildModalBody(kind, iconText, defaultTitle, options) {
        const box = document.createElement('div');
        box.className = 'app-modal';

        const header = document.createElement('div');
        header.className = 'app-modal-header';

        const icon = document.createElement('div');
        icon.className = 'app-modal-icon ' + kind;
        icon.textContent = iconText;

        const title = document.createElement('h3');
        title.className = 'app-modal-title';
        title.textContent = options.title || defaultTitle;

        header.appendChild(icon);
        header.appendChild(title);
        box.appendChild(header);

        if (options.message) {
            const msg = document.createElement('p');
            msg.className = 'app-modal-message';
            msg.textContent = String(options.message);
            box.appendChild(msg);
        }

        const detailsEl = buildDetailsElement(options.details);
        if (detailsEl) box.appendChild(detailsEl);

        const tableEl = buildTableElement(options.table);
        if (tableEl) box.appendChild(tableEl);

        return box;
    }

    function showNotice(kind, opts) {
        const options = opts || {};
        const iconText = kind === 'success' ? '✓' : (kind === 'error' ? '✕' : '!');
        const defaultTitle = kind === 'success' ? 'Thành công' : (kind === 'error' ? 'Đã xảy ra lỗi' : 'Thông báo');
        const box = buildModalBody(kind, iconText, defaultTitle, options);

        const actions = document.createElement('div');
        actions.className = 'app-modal-actions centered';

        const btnClose = createBtn('app-btn-primary', options.buttonText || 'Đóng', function () {
            closeActiveModal(true);
        });

        actions.appendChild(btnClose);
        box.appendChild(actions);

        openModal(box, options.onClose);
        btnClose.focus();
    }

    function confirmModal(opts) {
        const options = opts || {};
        const box = buildModalBody('warning', '!', 'Xác nhận thao tác', options);

        const actions = document.createElement('div');
        actions.className = 'app-modal-actions';

        const btnCancel = createBtn('app-btn-secondary', options.cancelText || 'Hủy', function () {
            closeActiveModal(true);
        });
        const btnConfirm = createBtn(options.danger ? 'app-btn-danger' : 'app-btn-primary', options.confirmText || 'Xác nhận', function () {
            closeActiveModal(false);
            if (typeof options.onConfirm === 'function') {
                options.onConfirm();
            }
        });

        actions.appendChild(btnCancel);
        actions.appendChild(btnConfirm);
        box.appendChild(actions);

        openModal(box, options.onClose);
        btnConfirm.focus();
    }

    function profileModal(opts) {
        const options = opts || {};
        const box = document.createElement('div');
        box.className = 'app-modal app-modal-profile';

        const header = document.createElement('div');
        header.className = 'app-profile-header';
        header.appendChild(createAvatar(options.avatar, options.name, 88));

        const meta = document.createElement('div');
        meta.className = 'app-profile-meta';

        const nameEl = document.createElement('h3');
        nameEl.className = 'app-profile-name';
        nameEl.textContent = options.name || 'Chưa cập nhật';
        meta.appendChild(nameEl);

        if (options.subtitle) {
            const subEl = document.createElement('p');
            subEl.className = 'app-profile-subtitle';
            subEl.textContent = String(options.subtitle);
            meta.appendChild(subEl);
        }

        header.appendChild(meta);
        box.appendChild(header);

        const detailsEl = buildDetailsElement(options.details);
        if (detailsEl) box.appendChild(detailsEl);

        if (Array.isArray(options.sections)) {
            options.sections.forEach(function (sec) {
                if (!sec) return;
                const secEl = document.createElement('div');
                secEl.className = 'app-profile-section';

                if (sec.heading) {
                    const headingEl = document.createElement('h4');
                    headingEl.className = 'app-profile-section-title';
                    headingEl.textContent = String(sec.heading);
                    secEl.appendChild(headingEl);
                }

                const secTableEl = buildTableElement(sec.table);
                if (secTableEl) {
                    secEl.appendChild(secTableEl);
                } else if (sec.emptyText) {
                    const emptyEl = document.createElement('p');
                    emptyEl.className = 'app-profile-empty';
                    emptyEl.textContent = String(sec.emptyText);
                    secEl.appendChild(emptyEl);
                }

                box.appendChild(secEl);
            });
        }

        const actions = document.createElement('div');
        actions.className = 'app-modal-actions';

        const btnClose = document.createElement('button');
        btnClose.type = 'button';
        btnClose.className = 'app-btn app-btn-secondary';
        btnClose.textContent = options.buttonText || 'Đóng';
        btnClose.addEventListener('click', function () {
            closeActiveModal(true);
        });

        actions.appendChild(btnClose);
        box.appendChild(actions);

        openModal(box, options.onClose);
        btnClose.focus();
    }

    global.AppUI = {
        escapeHtml: escapeHtml,
        createAvatar: createAvatar,
        avatarHtml: avatarHtml,
        readImageFile: readImageFile,
        success: function (opts) { showNotice('success', opts); },
        error: function (opts) { showNotice('error', opts); },
        warning: function (opts) { showNotice('warning', opts); },
        confirm: confirmModal,
        profile: profileModal
    };
})(window);
