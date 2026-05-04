// =============================================================
// Qatar Foundation Admin Portal — Frontend (with backend wiring)
// UI design / layout / components remain identical to the original.
// Only data flow has been wired to the Flask backend at /api/*.
// =============================================================

const captchas = { login:'', signup:'', forgot:'' };
function generateCaptcha(type) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    captchas[type] = code;
    document.getElementById(type + 'CaptchaText').textContent = code;
}
generateCaptcha('login');
generateCaptcha('signup');
generateCaptcha('forgot');

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
    document.querySelectorAll('.form-page').forEach(p => p.classList.remove('active'));
    setTimeout(() => document.getElementById(pageId).classList.add('active'), 50);
    document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('input').forEach(i => i.classList.remove('error'));
}

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = isPass
        ? '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ===== HELPERS =====
function showError(id, msg) {
    const el = document.getElementById(id);
    if (msg) el.querySelector('span').textContent = msg;
    el.classList.add('show');
}
function clearAllErrors(formId) {
    document.querySelectorAll('#' + formId + ' .error-msg').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('#' + formId + ' input').forEach(i => i.classList.remove('error'));
}
function shakeForm(formId) {
    const form = document.getElementById(formId);
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 400);
}
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function showToast(msg) {
    document.getElementById('toastMsg').textContent = msg;
    document.getElementById('toast').classList.add('show');
    setTimeout(() => document.getElementById('toast').classList.remove('show'), 3000);
}

function checkStrength(val) {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const labels = ['','Weak','Medium','Strong','Very Strong'];
    const classes = ['','weak','medium','strong','very-strong'];
    for (let i = 1; i <= 4; i++) {
        const bar = document.getElementById('str' + i);
        bar.className = 'strength-bar';
        if (i <= score) bar.classList.add(classes[score]);
    }
    document.getElementById('strengthLabel').textContent = val.length > 0 ? labels[score] : '';
}

// =============================================================
// API helper + state
// =============================================================
async function api(path, options = {}) {
    const opts = Object.assign({ credentials: 'same-origin', headers: {} }, options);
    if (opts.body && typeof opts.body !== 'string') {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, opts);
    let data = null;
    try { data = await res.json(); } catch (_e) { data = null; }
    return { ok: res.ok, status: res.status, data };
}

let editingOpportunityId = null;
let currentAdmin = null;

// ===== SHOW DASHBOARD =====
function showDashboard(adminOrEmail) {
    document.getElementById('authWrapper').style.display = 'none';
    document.getElementById('dashboardWrapper').classList.add('active');
    document.body.style.alignItems = 'stretch';

    const displayName = (adminOrEmail && adminOrEmail.full_name)
        ? adminOrEmail.full_name
        : (() => {
            const email = (typeof adminOrEmail === 'string') ? adminOrEmail : (adminOrEmail && adminOrEmail.email) || '';
            const local = email.split('@')[0] || 'Admin';
            return local.charAt(0).toUpperCase() + local.slice(1);
        })();

    document.getElementById('dashName').textContent = displayName;
    const initials = displayName.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('dashAvatar').textContent = initials || 'AD';

    if (window.innerWidth <= 768) {
        document.getElementById('menuToggle').style.display = 'flex';
    }

    loadOpportunities();
}

async function handleLogout() {
    try { await api('/api/logout', { method: 'POST' }); } catch (_e) {}
    currentAdmin = null;
    editingOpportunityId = null;
    document.getElementById('dashboardWrapper').classList.remove('active');
    document.getElementById('authWrapper').style.display = 'flex';
    document.body.style.alignItems = '';
    showToast('Signed out successfully');
    showPage('loginPage');
    const grid = document.querySelector('.opportunities-grid');
    if (grid) grid.innerHTML = '';
}

// ===== NAV ITEMS =====
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', function() {
        const page = this.getAttribute('data-page');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));

        if (page === 'dashboard') {
            document.getElementById('dashboardSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Dashboard';
        } else if (page === 'learner') {
            document.getElementById('learnerSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Learner Management';
        } else if (page === 'verifier') {
            document.getElementById('verifierSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Verifier Management';
        } else if (page === 'collaborator') {
            document.getElementById('collaboratorSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Collaborator Management';
        } else if (page === 'opportunity') {
            document.getElementById('opportunitySection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Opportunity Management';
            loadOpportunities();
        } else if (page === 'reports') {
            document.getElementById('reportsSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Reports and Analytics';
        }
    });
});

// ===== TABS =====
function changeChartPeriod(period) {
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === period) btn.classList.add('active');
    });

    const chartData = {
        daily: 'M0,120 Q50,110 100,90 T200,70 T300,50 T400,40',
        weekly: 'M0,110 Q50,95 100,85 T200,65 T300,45 T400,35',
        monthly: 'M0,100 Q50,85 100,75 T200,55 T300,40 T400,30',
        quarterly: 'M0,90 Q50,75 100,65 T200,50 T300,35 T400,25',
        yearly: 'M0,80 Q50,65 100,55 T200,40 T300,30 T400,20'
    };

    const linePath = document.getElementById('linePath');
    const lineArea = document.getElementById('lineArea');
    const path = chartData[period];
    linePath.setAttribute('d', path);
    lineArea.setAttribute('d', path + ' L400,150 L0,150 Z');
}

// ===== NOTIFICATIONS =====
function toggleNotifications() {
    document.getElementById('notificationDropdown').classList.toggle('active');
}

function markAllRead() {
    document.querySelectorAll('.notif-item.unread').forEach(item => item.classList.remove('unread'));
    showToast('All notifications marked as read');
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notificationDropdown');
    const btn = document.getElementById('notifBtn');
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// ===== THEME TOGGLE =====
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    const icon = document.getElementById('themeIcon');
    if (newTheme === 'dark') {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    } else {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
    }
}

// ===== SEARCH =====
function openSearch() {
    document.getElementById('searchContainer').classList.add('active');
    document.getElementById('searchInput').focus();
}

function closeSearch() {
    document.getElementById('searchContainer').classList.remove('active');
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSearch();
        closeCourseModal();
        closeOpportunityModal();
        closeOpportunityDetailsModal();
        closeCollaboratorCoursesModal();
        closeQuickAddModal();
        closeBulkUploadModal();
        closeQuickAddVerifierModal();
        closeBulkUploadVerifierModal();
        closeVerifierDetailsModal();
    }
});

document.getElementById('searchContainer').addEventListener('click', function(e) {
    if (e.target === this) closeSearch();
});

// ===== COURSE MODAL =====
function openCourseDetails(courseName, stats) {
    document.getElementById('modalCourseTitle').textContent = courseName;
    document.getElementById('modalEnrolled').textContent = stats.enrolled;
    document.getElementById('modalCompleted').textContent = stats.completed;
    document.getElementById('modalInProgress').textContent = stats.inProgress;
    document.getElementById('modalHalfDone').textContent = stats.halfDone;
    document.getElementById('courseModal').classList.add('active');
}

function closeCourseModal() {
    document.getElementById('courseModal').classList.remove('active');
}

document.getElementById('courseModal').addEventListener('click', function(e) {
    if (e.target === this) closeCourseModal();
});

// ===== OPPORTUNITY DETAILS MODAL =====
function openOpportunityDetails(title, details) {
    document.getElementById('opportunityDetailTitle').textContent = title;
    document.getElementById('opportunityDetailDuration').textContent = details.duration || '';
    document.getElementById('opportunityDetailStartDate').textContent = details.startDate || '';
    document.getElementById('opportunityDetailApplicants').textContent =
        (details.applicants === undefined || details.applicants === null) ? '—' : details.applicants;
    document.getElementById('opportunityDetailDescription').textContent = details.description || '';
    document.getElementById('opportunityDetailFuture').textContent = details.futureOpportunities || '';
    document.getElementById('opportunityDetailPrereqs').textContent =
        details.prerequisites || (details.category ? ('Category: ' + capitalize(details.category)) : '');

    const skillsContainer = document.getElementById('opportunityDetailSkills');
    skillsContainer.innerHTML = '';
    (details.skills || []).forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.textContent = skill;
        skillsContainer.appendChild(tag);
    });

    document.getElementById('opportunityDetailsModal').classList.add('active');
}

function closeOpportunityDetailsModal() {
    document.getElementById('opportunityDetailsModal').classList.remove('active');
}

function applyToOpportunity() {
    showToast('Application submitted successfully!');
    closeOpportunityDetailsModal();
}

document.getElementById('opportunityDetailsModal').addEventListener('click', function(e) {
    if (e.target === this) closeOpportunityDetailsModal();
});

async function viewOpportunityById(id) {
    const r = await api('/api/opportunities/' + id);
    if (!r.ok) {
        showToast((r.data && r.data.error) || 'Could not load opportunity');
        return;
    }
    const op = r.data.data;
    openOpportunityDetails(op.name, {
        duration: op.duration,
        startDate: op.start_date,
        description: op.description,
        skills: op.skills,
        applicants: op.max_applicants,
        futureOpportunities: op.future_opportunities,
        category: op.category,
        prerequisites: ''
    });
}

// ===== COLLABORATOR COURSES MODAL =====
function openCollaboratorCourses(name, role) {
    document.getElementById('collaboratorName').textContent = name + "'s Submitted Courses";
    document.getElementById('collaboratorRole').textContent = 'Role: ' + role;
    document.getElementById('collaboratorCoursesModal').classList.add('active');
}

function closeCollaboratorCoursesModal() {
    document.getElementById('collaboratorCoursesModal').classList.remove('active');
}

function approveCourse(courseName) { showToast(courseName + ' has been approved!'); }
function rejectCourse(courseName) { showToast(courseName + ' has been rejected.'); }
function viewCourseDetails(courseName) { showToast('Viewing details for ' + courseName); }

document.getElementById('collaboratorCoursesModal').addEventListener('click', function(e) {
    if (e.target === this) closeCollaboratorCoursesModal();
});

// =============================================================
// OPPORTUNITY MODAL — backend-driven CRUD
// =============================================================
function openOpportunityModal() {
    editingOpportunityId = null;
    document.querySelector('#opportunityModal .modal-header h3').textContent = 'Add New Opportunity';
    document.querySelector('#opportunityForm button[type="submit"]').textContent = 'Create Opportunity';
    document.getElementById('opportunityForm').reset();
    document.getElementById('opportunityModal').classList.add('active');
}

function closeOpportunityModal() {
    document.getElementById('opportunityModal').classList.remove('active');
    editingOpportunityId = null;
}

document.getElementById('opportunityModal').addEventListener('click', function(e) {
    if (e.target === this) closeOpportunityModal();
});

document.getElementById('opportunityForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('oppName').value.trim();
    const duration = document.getElementById('oppDuration').value.trim();
    const startDate = document.getElementById('oppStartDate').value;
    const description = document.getElementById('oppDescription').value.trim();
    const skillsRaw = document.getElementById('oppSkills').value.trim();
    const category = document.getElementById('oppCategory').value;
    const futureOpportunities = document.getElementById('oppFuture').value.trim();
    const maxApplicants = document.getElementById('oppMaxApplicants').value.trim();

    if (!name || !duration || !startDate || !description || !skillsRaw || !category || !futureOpportunities) {
        showToast('Please fill all required fields');
        return;
    }

    const payload = {
        name,
        duration,
        start_date: startDate,
        description,
        skills: skillsRaw,
        category,
        future_opportunities: futureOpportunities,
        max_applicants: maxApplicants === '' ? null : parseInt(maxApplicants, 10)
    };

    let r;
    if (editingOpportunityId) {
        r = await api('/api/opportunities/' + editingOpportunityId, { method: 'PUT', body: payload });
    } else {
        r = await api('/api/opportunities', { method: 'POST', body: payload });
    }

    if (!r.ok) {
        if (r.status === 401) {
            showToast('Session expired — please sign in again');
            handleLogout();
            return;
        }
        showToast((r.data && r.data.error) || 'Could not save opportunity');
        return;
    }

    showToast(editingOpportunityId ? 'Opportunity updated successfully!' : 'Opportunity created successfully!');
    editingOpportunityId = null;
    closeOpportunityModal();
    this.reset();
    await loadOpportunities();
});

async function loadOpportunities() {
    const grid = document.querySelector('.opportunities-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const r = await api('/api/opportunities');
    if (!r.ok) {
        if (r.status === 401) return;
        renderEmptyState(grid, 'Could not load opportunities. Please try again.');
        return;
    }

    const items = (r.data && r.data.data) || [];
    if (items.length === 0) {
        renderEmptyState(grid);
        return;
    }
    items.forEach(op => grid.appendChild(buildOpportunityCard(op)));
}

function renderEmptyState(grid, message) {
    const empty = document.createElement('div');
    empty.className = 'opportunity-card';
    empty.style.gridColumn = '1 / -1';
    empty.style.textAlign = 'center';
    empty.style.padding = '40px 20px';
    empty.innerHTML = `
        <h5 style="margin-bottom:12px;">${escapeHtml(message || 'No opportunities yet')}</h5>
        <p class="opportunity-description">${message ? '' : "Click \"Add New Opportunity\" to create your first one."}</p>
    `;
    grid.appendChild(empty);
}

function buildOpportunityCard(op) {
    const card = document.createElement('div');
    card.className = 'opportunity-card';
    card.dataset.id = op.id;

    const skills = op.skills || [];
    const applicantsText = op.max_applicants ? `${op.max_applicants} applicants` : '0 applicants';

    const headerHtml = `
        <div class="opportunity-card-header">
            <h5>${escapeHtml(op.name)}</h5>
            <div class="opportunity-meta">
                <span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escapeHtml(op.duration)}</span>
                <span><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(op.start_date)}</span>
            </div>
        </div>
        <p class="opportunity-description">${escapeHtml(op.description)}</p>
    `;

    const skillsHtml = `
        <div class="opportunity-skills">
            <div class="opportunity-skills-label">Skills You'll Gain</div>
            <div class="skills-tags">
                ${skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}
            </div>
        </div>
    `;

    const footerHtml = `
        <div class="opportunity-footer">
            <span class="applicants-count">${escapeHtml(applicantsText)}</span>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="modal-action-btn approve" data-action="edit" style="padding:8px 14px;">Edit</button>
                <button class="modal-action-btn reject" data-action="delete" style="padding:8px 14px;">Delete</button>
                <button class="view-course-btn" data-action="view" style="width:auto; padding:8px 16px;">View Details</button>
            </div>
        </div>
    `;

    card.innerHTML = headerHtml + skillsHtml + footerHtml;

    card.querySelector('[data-action="view"]').addEventListener('click', () => viewOpportunityById(op.id));
    card.querySelector('[data-action="edit"]').addEventListener('click', () => startEditOpportunity(op.id));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteOpportunity(op.id));

    return card;
}

async function startEditOpportunity(id) {
    const r = await api('/api/opportunities/' + id);
    if (!r.ok) {
        showToast((r.data && r.data.error) || 'Could not load opportunity');
        return;
    }
    const op = r.data.data;
    editingOpportunityId = op.id;

    document.getElementById('oppName').value = op.name;
    document.getElementById('oppDuration').value = op.duration;
    document.getElementById('oppStartDate').value = op.start_date;
    document.getElementById('oppDescription').value = op.description;
    document.getElementById('oppSkills').value = (op.skills || []).join(', ');
    document.getElementById('oppCategory').value = op.category;
    document.getElementById('oppFuture').value = op.future_opportunities;
    document.getElementById('oppMaxApplicants').value = (op.max_applicants ?? '');

    document.querySelector('#opportunityModal .modal-header h3').textContent = 'Edit Opportunity';
    document.querySelector('#opportunityForm button[type="submit"]').textContent = 'Update Opportunity';
    document.getElementById('opportunityModal').classList.add('active');
}

async function deleteOpportunity(id) {
    if (!confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) return;
    const r = await api('/api/opportunities/' + id, { method: 'DELETE' });
    if (!r.ok) {
        showToast((r.data && r.data.error) || 'Could not delete opportunity');
        return;
    }
    showToast('Opportunity deleted');
    await loadOpportunities();
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// ===== QUICK ADD STUDENT MODAL =====
function openQuickAddModal() { document.getElementById('quickAddModal').classList.add('active'); }
function closeQuickAddModal() { document.getElementById('quickAddModal').classList.remove('active'); }

document.getElementById('quickAddModal').addEventListener('click', function(e) {
    if (e.target === this) closeQuickAddModal();
});

document.getElementById('quickAddForm').addEventListener('submit', function(e) {
    e.preventDefault();
    showToast('Student added successfully! Email invitation sent.');
    closeQuickAddModal();
    this.reset();
});

// ===== BULK UPLOAD MODAL =====
function openBulkUploadModal() { document.getElementById('bulkUploadModal').classList.add('active'); }
function closeBulkUploadModal() { document.getElementById('bulkUploadModal').classList.remove('active'); }

document.getElementById('bulkUploadModal').addEventListener('click', function(e) {
    if (e.target === this) closeBulkUploadModal();
});

document.getElementById('bulkUploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput.files.length === 0) {
        showToast('Please select a CSV file');
        return;
    }
    showToast('Students uploaded successfully! Email invitations sent.');
    closeBulkUploadModal();
    this.reset();
    document.getElementById('fileName').textContent = '';
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) document.getElementById('fileName').textContent = '✓ Selected: ' + file.name;
}

function downloadSampleCSV() {
    const csvContent = 'First Name,Last Name,Email\nJohn,Doe,john.doe@example.com\nJane,Smith,jane.smith@example.com';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// ===== QUICK ADD VERIFIER MODAL =====
function openQuickAddVerifierModal() { document.getElementById('quickAddVerifierModal').classList.add('active'); }
function closeQuickAddVerifierModal() { document.getElementById('quickAddVerifierModal').classList.remove('active'); }

document.getElementById('quickAddVerifierModal').addEventListener('click', function(e) {
    if (e.target === this) closeQuickAddVerifierModal();
});

document.getElementById('quickAddVerifierForm').addEventListener('submit', function(e) {
    e.preventDefault();
    showToast('Verifier added successfully! Email invitation sent.');
    closeQuickAddVerifierModal();
    this.reset();
});

// ===== BULK UPLOAD VERIFIER MODAL =====
function openBulkUploadVerifierModal() { document.getElementById('bulkUploadVerifierModal').classList.add('active'); }
function closeBulkUploadVerifierModal() { document.getElementById('bulkUploadVerifierModal').classList.remove('active'); }

document.getElementById('bulkUploadVerifierModal').addEventListener('click', function(e) {
    if (e.target === this) closeBulkUploadVerifierModal();
});

document.getElementById('bulkUploadVerifierForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('csvVerifierFileInput');
    if (fileInput.files.length === 0) {
        showToast('Please select a CSV file');
        return;
    }
    showToast('Verifiers uploaded successfully! Email invitations sent.');
    closeBulkUploadVerifierModal();
    this.reset();
    document.getElementById('verifierFileName').textContent = '';
});

function handleVerifierFileSelect(event) {
    const file = event.target.files[0];
    if (file) document.getElementById('verifierFileName').textContent = '✓ Selected: ' + file.name;
}

function downloadSampleVerifierCSV() {
    const csvContent = 'First Name,Last Name,Email,Subject\nDr. John,Doe,john.doe@qf.edu.qa,Mathematics\nProf. Jane,Smith,jane.smith@qf.edu.qa,Physics';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_verifiers.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// ===== VERIFIER DETAILS MODAL =====
function openVerifierDetails(name, stats) {
    document.getElementById('verifierName').textContent = name;
    document.getElementById('verifierTotalStudents').textContent = stats.totalStudents;
    document.getElementById('verifierCertified').textContent = stats.certified;
    document.getElementById('verifierInProgress').textContent = stats.inProgress;
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';
    stats.subjects.forEach(subject => {
        const div = document.createElement('div');
        div.className = 'subject-item';
        div.innerHTML = `
            <span class="subject-name">${subject.name}</span>
            <span class="subject-students">${subject.students} students</span>
        `;
        container.appendChild(div);
    });
    document.getElementById('verifierDetailsModal').classList.add('active');
}

function closeVerifierDetailsModal() {
    document.getElementById('verifierDetailsModal').classList.remove('active');
}

document.getElementById('verifierDetailsModal').addEventListener('click', function(e) {
    if (e.target === this) closeVerifierDetailsModal();
});

// ===== STUDENT FILTERS =====
function filterStudents() {
    const statusFilter = document.getElementById('statusFilter').value;
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        let showRow = true;
        if (statusFilter !== 'all' && rowStatus !== statusFilter) showRow = false;
        row.style.display = showRow ? '' : 'none';
    });
}

// ===== VERIFIER FILTERS =====
function filterVerifiers() {
    const statusFilter = document.getElementById('verifierStatusFilter').value;
    const rows = document.querySelectorAll('#verifiersTableBody tr');
    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        let showRow = true;
        if (statusFilter !== 'all' && rowStatus !== statusFilter) showRow = false;
        row.style.display = showRow ? '' : 'none';
    });
}

// =============================================================
// LOGIN — backend
// =============================================================
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearAllErrors('loginForm');
    let valid = true;
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const captchaInput = document.getElementById('loginCaptchaInput').value.trim();
    const remember = !!document.querySelector('#loginPage .remember-me input[type="checkbox"]')?.checked;

    if (!email || !isValidEmail(email)) { showError('loginEmailErr'); document.getElementById('loginEmail').classList.add('error'); valid = false; }
    if (!password) { showError('loginPasswordErr','Please enter your password'); document.getElementById('loginPassword').classList.add('error'); valid = false; }
    if (!captchaInput) { showError('loginCaptchaErr','Please enter the captcha code'); valid = false; }
    else if (captchaInput !== captchas.login) { showError('loginCaptchaErr','Captcha does not match. Please try again.'); valid = false; generateCaptcha('login'); }

    if (!valid) { shakeForm('loginForm'); return; }

    const r = await api('/api/login', { method: 'POST', body: { email, password, remember } });
    generateCaptcha('login');
    document.getElementById('loginCaptchaInput').value = '';

    if (!r.ok) {
        showError('loginPasswordErr', (r.data && r.data.error) || 'Invalid email or password');
        document.getElementById('loginEmail').classList.add('error');
        document.getElementById('loginPassword').classList.add('error');
        shakeForm('loginForm');
        return;
    }

    currentAdmin = r.data.admin;
    showToast('Login successful! Redirecting...');
    setTimeout(() => showDashboard(currentAdmin), 600);
});

// =============================================================
// SIGNUP — backend
// =============================================================
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearAllErrors('signupForm');
    let valid = true;
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
    const captchaInput = document.getElementById('signupCaptchaInput').value.trim();

    if (!name) { showError('signupNameErr'); document.getElementById('signupName').classList.add('error'); valid = false; }
    if (!email || !isValidEmail(email)) { showError('signupEmailErr'); document.getElementById('signupEmail').classList.add('error'); valid = false; }
    if (!password || password.length < 8) { showError('signupPasswordErr'); document.getElementById('signupPassword').classList.add('error'); valid = false; }
    if (!confirmPassword || password !== confirmPassword) { showError('signupConfirmPasswordErr'); document.getElementById('signupConfirmPassword').classList.add('error'); valid = false; }
    if (!captchaInput) { showError('signupCaptchaErr','Please enter the captcha code'); valid = false; }
    else if (captchaInput !== captchas.signup) { showError('signupCaptchaErr','Captcha does not match.'); valid = false; generateCaptcha('signup'); }

    if (!valid) { shakeForm('signupForm'); return; }

    const r = await api('/api/signup', {
        method: 'POST',
        body: { full_name: name, email, password, confirm_password: confirmPassword }
    });
    generateCaptcha('signup');
    document.getElementById('signupCaptchaInput').value = '';

    if (!r.ok) {
        const msg = (r.data && r.data.error) || 'Could not create account';
        const field = r.data && r.data.field;
        if (field === 'email') { showError('signupEmailErr', msg); document.getElementById('signupEmail').classList.add('error'); }
        else if (field === 'password') { showError('signupPasswordErr', msg); document.getElementById('signupPassword').classList.add('error'); }
        else if (field === 'confirm_password') { showError('signupConfirmPasswordErr', msg); document.getElementById('signupConfirmPassword').classList.add('error'); }
        else { showError('signupNameErr', msg); }
        shakeForm('signupForm');
        return;
    }

    showToast('Account created successfully!');
    this.reset();
    checkStrength('');
    setTimeout(() => showPage('loginPage'), 1200);
});

// =============================================================
// FORGOT PASSWORD — backend
// =============================================================
document.getElementById('forgotForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearAllErrors('forgotForm');
    let valid = true;
    const email = document.getElementById('forgotEmail').value.trim();
    const captchaInput = document.getElementById('forgotCaptchaInput').value.trim();

    if (!email || !isValidEmail(email)) { showError('forgotEmailErr'); document.getElementById('forgotEmail').classList.add('error'); valid = false; }
    if (!captchaInput) { showError('forgotCaptchaErr','Please enter the captcha code'); valid = false; }
    else if (captchaInput !== captchas.forgot) { showError('forgotCaptchaErr','Captcha does not match.'); valid = false; generateCaptcha('forgot'); }

    if (!valid) { shakeForm('forgotForm'); return; }

    await api('/api/forgot-password', { method: 'POST', body: { email } });
    generateCaptcha('forgot');
    document.getElementById('forgotCaptchaInput').value = '';
    showToast('If that email is registered, a reset link has been sent.');
    this.reset();
});

// Clear errors on input
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', function() {
        this.classList.remove('error');
        const err = this.closest('.form-group')?.querySelector('.error-msg');
        if (err) err.classList.remove('show');
    });
});

// Responsive sidebar
window.addEventListener('resize', () => {
    const toggle = document.getElementById('menuToggle');
    if (toggle) toggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
});

// =============================================================
// ON LOAD — restore session if cookie is still valid
// =============================================================
(async function bootstrapSession() {
    try {
        const r = await api('/api/session');
        if (r.ok && r.data && r.data.authenticated) {
            currentAdmin = r.data.admin;
            showDashboard(currentAdmin);
        }
    } catch (_e) { /* ignore */ }
})();
