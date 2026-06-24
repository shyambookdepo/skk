// ============================================
// SHYAM BOOK DEPO - COMPLETE APPLICATION LOGIC
// ============================================

// --- Initialize Theme early to prevent flash ---
(function() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
})();

// ============================================
// THEME MANAGER
// ============================================
const Theme = {
  init() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
  },
  setTheme(theme) {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle');
    const iconSpan = themeBtn ? themeBtn.querySelector('.theme-toggle-icon') : null;
    
    if (theme === 'dark') {
      body.classList.add('dark-theme');
      if (iconSpan) iconSpan.textContent = '☀️';
      if (themeBtn) themeBtn.title = 'Switch to Light Theme';
      localStorage.setItem('theme', 'dark');
    } else {
      body.classList.remove('dark-theme');
      if (iconSpan) iconSpan.textContent = '🌙';
      if (themeBtn) themeBtn.title = 'Switch to Dark Theme';
      localStorage.setItem('theme', 'light');
    }
  },
  toggle() {
    const isDark = document.body.classList.contains('dark-theme');
    this.setTheme(isDark ? 'light' : 'dark');
  }
};

// ============================================
// CONFIGURATION
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbxgE5KF70PfusNL5ZKtnNNVVkmoGlsFHyRKvO7XijudEo_I4zQ8zVPOSlkLFXaiEx7R/exec'; // Replace with your deployed Apps Script URL

// ============================================
// STATE
// ============================================
const AppState = {
  currentPage: 'home',
  schools: [],
  classes: [],
  selectedSchool: null,
  selectedClass: null,
  // Invoice state
  invoice: {
    students: [], // Each: { schoolName, className, classIndex, catalog: { books, notebooks, others } }
    activeStudentIndex: 0,
  },
  // Entries state
  entries: [],
  filteredEntries: [],
  entriesFilter: 'all',
  entriesSearch: '',
  activeModalStudentIndex: 0,
  activeModalCategoryTabs: {}, // Map of studentIndex -> tabId
  // Admin state
  isAdminLoggedIn: false,
  adminUsername: '',
  adminTab: 'schools',
  adminData: {
    schools: [],
    classes: [],
    books: [],
    notebooks: [],
  },
};

// ============================================
// API MODULE
// ============================================
const API = {
  async get(action, params = {}) {
    try {
      showLoading();
      const url = new URL(API_URL);
      url.searchParams.set('action', action);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      hideLoading();
      if (data.error) {
        showToast(data.error, 'error');
        return null;
      }
      return data;
    } catch (error) {
      hideLoading();
      console.error('API GET Error:', error);
      showToast('Failed to fetch data. Please check your connection.', 'error');
      return null;
    }
  },

  async post(action, body = {}) {
    try {
      showLoading();
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...body }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      hideLoading();
      if (data.error) {
        showToast(data.error, 'error');
        return null;
      }
      return data;
    } catch (error) {
      hideLoading();
      console.error('API POST Error:', error);
      showToast('Request failed. Please try again.', 'error');
      return null;
    }
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
let toastTimeout = null;

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastIcon = toast.querySelector('.toast-icon');
  const toastMessage = toast.querySelector('.toast-message');

  // Clear existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Set icon based on type
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toastIcon.textContent = icons[type] || icons.info;
  toastMessage.textContent = message;

  // Remove previous classes
  toast.className = 'toast';
  toast.classList.add(type);

  // Show
  toast.classList.remove('hidden');

  // Auto-hide after 3 seconds
  toastTimeout = setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('toast-hiding');
    }, 300);
  }, 3000);
}

function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function formatUserFriendlyDateTime(dateVal, timeVal) {
  if (!dateVal) return '';

  let year = null, month = null, day = null;
  
  // Try parsing dateVal as a Date object or ISO string
  const parsedDate = new Date(dateVal);
  if (!isNaN(parsedDate)) {
    year = parsedDate.getFullYear();
    month = parsedDate.getMonth();
    day = parsedDate.getDate();
  } else if (typeof dateVal === 'string') {
    // Try dd/mm/yyyy
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
      }
    } else if (dateVal.includes('-')) {
      // Try yyyy-mm-dd
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      }
    }
  }

  if (year === null || month === null || day === null || isNaN(year) || isNaN(month) || isNaN(day)) {
    // Fallback if we cannot parse the date
    return `${dateVal} ${timeVal || ''}`.trim();
  }

  let hours = 0, minutes = 0;
  if (timeVal) {
    const parsedTime = new Date(timeVal);
    if (!isNaN(parsedTime) && String(timeVal).includes('T')) {
      hours = parsedTime.getHours();
      minutes = parsedTime.getMinutes();
    } else if (typeof timeVal === 'string') {
      const cleanTime = timeVal.trim().toUpperCase();
      const isPM = cleanTime.includes('PM');
      const isAM = cleanTime.includes('AM');
      const timeDigits = cleanTime.replace(/[A-Z\s]/g, '');
      const parts = timeDigits.split(':');
      if (parts.length >= 2) {
        hours = parseInt(parts[0]);
        minutes = parseInt(parts[1]);
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
    }
  }

  // Create combined local Date object
  const combined = new Date(year, month, day, hours, minutes);
  if (isNaN(combined)) {
    return `${dateVal} ${timeVal || ''}`.trim();
  }
  
  // Format as: "Jun 05, 2026, 6:30 PM"
  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthShort = monthNamesShort[combined.getMonth()];
  const dayStr = String(combined.getDate()).padStart(2, '0');
  const yearStr = combined.getFullYear();
  
  let hours12 = combined.getHours();
  const ampm = hours12 >= 12 ? 'PM' : 'AM';
  hours12 = hours12 % 12;
  hours12 = hours12 ? hours12 : 12; // the hour '0' should be '12'
  const minStr = String(combined.getMinutes()).padStart(2, '0');
  
  return `${monthShort} ${dayStr}, ${yearStr}, ${hours12}:${minStr} ${ampm}`;
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '₹' + num.toFixed(2);
}

function generateInvoiceNumber() {
  const now = new Date();
  const parts = [
    'INV',
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ];
  return parts.join('');
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// ROUTER
// ============================================
const Router = {
  navigate(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach((p) => {
      p.classList.add('hidden');
      p.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      targetPage.classList.remove('hidden');
      targetPage.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Update bottom nav links if they exist
    document.querySelectorAll('.bnav-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    const activeBnav = document.getElementById(`bnav-${page}`);
    if (activeBnav) {
      activeBnav.classList.add('active');
      const index = activeBnav.getAttribute('data-index');
      const indicator = document.querySelector('.bnav-indicator');
      if (indicator) {
        indicator.style.transform = `translateX(calc(${index} * 100%))`;
      }
    }

    AppState.currentPage = page;

    // Load page data
    switch (page) {
      case 'home':
        Home.loadSchools();
        break;
      case 'entries':
        Entries.load();
        break;
      case 'admin':
        if (AppState.isAdminLoggedIn) {
          Admin.loadDashboard();
        }
        break;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
};

// ============================================
// HOME PAGE MODULE
// ============================================
const Home = {
  async loadSchools() {
    const res = await API.get('getSchools');
    if (res && res.success && res.data) {
      AppState.schools = res.data.filter((s) => Number(s.status) !== 0).map(s => ({
        index: s.schoolIndex,
        name: s.schoolName,
        status: s.status
      }));
      this.renderSchools();
    } else {
      AppState.schools = [];
      this.renderSchools();
    }
  },

  renderSchools() {
    const grid = document.getElementById('schools-grid');
    if (AppState.schools.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🏫</div>
          <div class="empty-state-title">No Schools Found</div>
          <div class="empty-state-desc">Schools will appear here once they are added by the admin.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = AppState.schools
      .map(
        (school, index) => `
        <div class="card" onclick="Home.selectSchool(${school.index}, '${escapeHtml(school.name)}')" data-school-index="${school.index}">
          <div class="card-content-custom">
            <span class="card-emoji">🏫</span>
            <span class="card-divider-custom"></span>
            <span class="card-text-custom">${escapeHtml(school.name)}</span>
          </div>
        </div>
      `
      )
      .join('');
  },

  async selectSchool(schoolIndex, schoolName) {
    AppState.selectedSchool = { index: schoolIndex, name: schoolName };

    const res = await API.get('getClasses', { schoolIndex: schoolIndex });
    if (res && res.success && res.data) {
      AppState.classes = res.data.filter((c) => Number(c.status) !== 0).map(c => ({
        index: c.classIndex,
        name: c.className,
        schoolIndex: c.schoolIndex,
        status: c.status
      }));
    } else {
      AppState.classes = [];
    }

    const schoolNameEl = document.getElementById('selected-school-name');
    if (schoolNameEl) {
      schoolNameEl.textContent = schoolName;
    }
    document.getElementById('school-selection').classList.add('hidden');
    document.getElementById('class-selection').classList.remove('hidden');
    this.renderClasses();
  },

  renderClasses() {
    const grid = document.getElementById('classes-grid');
    if (AppState.classes.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📖</div>
          <div class="empty-state-title">No Classes Found</div>
          <div class="empty-state-desc">No classes are available for this school.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = AppState.classes
      .map(
        (cls) => `
        <div class="card" onclick="Home.selectClass(${cls.index}, '${escapeHtml(cls.name)}')" data-class-index="${cls.index}">
          <div class="card-content-custom">
            <span class="card-emoji">📚</span>
            <span class="card-divider-custom"></span>
            <span class="card-text-custom">${escapeHtml(cls.name)}</span>
          </div>
        </div>
      `
      )
      .join('');
  },

  async selectClass(classIndex, className) {
    AppState.selectedClass = { index: classIndex, name: className };

    const pageTitle = document.getElementById('invoice-page-title');
    if (pageTitle && AppState.selectedSchool) {
      pageTitle.textContent = `${AppState.selectedSchool.name} → ${className}`;
    }

    document.getElementById('class-selection').classList.add('hidden');
    document.getElementById('invoice-view').classList.remove('hidden');

    // Initialize invoice with first student
    await Invoice.init(
      AppState.selectedSchool.name,
      className,
      classIndex
    );
  },

  backToSchools() {
    document.getElementById('class-selection').classList.add('hidden');
    document.getElementById('school-selection').classList.remove('hidden');
    AppState.selectedSchool = null;
    AppState.classes = [];
  },

  backToClasses() {
    document.getElementById('invoice-view').classList.add('hidden');
    document.getElementById('class-selection').classList.remove('hidden');
    Invoice.reset();
    AppState.selectedClass = null;
  },
};

// ============================================
// INVOICE MODULE
// ============================================
const Invoice = {
  async init(schoolName, className, classIndex) {
    // Reset invoice state
    AppState.invoice = {
      students: [],
      activeStudentIndex: 0,
    };

    // Load catalog items for the first student
    const catalog = await this.loadItems(classIndex);
    if (catalog) {
      AppState.invoice.students.push({
        schoolName,
        className,
        classIndex,
        catalog: catalog, // { books, notebooks, others }
      });
    }

    this.renderStudentTabs();
    this.renderStudentContent(0);
    this.updateInvoiceSummary();
  },

  async loadItems(classIndex) {
    // Fetch books and notebooks separately
    const [booksRes, notebooksRes] = await Promise.all([
      API.get('getBooks', { classIndex: classIndex }),
      API.get('getNotebooks', { classIndex: classIndex }),
    ]);
    const books = [];
    const notebooks = [];

    // Process books — each item gets quantity:0 (user selects via +/-)
    if (booksRes && booksRes.success && Array.isArray(booksRes.data)) {
      booksRes.data.forEach((book) => {
        if (Number(book.status) !== 0) {
          books.push({
            type: 'book',
            identity: book.bookIdentity || '',
            name: book.bookName || '',
            mrp: parseFloat(book.mrp) || 0,
            sellingPrice: parseFloat(book.sellingPrice) || 0,
            message: '',
            quantity: 0,
            status: 1, // 1 = pending
            originalIndex: book.bookIndex,
          });
        }
      });
    }

    // Process notebooks — each item gets quantity:0
    if (notebooksRes && notebooksRes.success && Array.isArray(notebooksRes.data)) {
      notebooksRes.data.forEach((nb) => {
        if (Number(nb.status) !== 0) {
          notebooks.push({
            type: 'notebook',
            identity: nb.notebookIdentity || '',
            name: nb.notebookName || '',
            mrp: parseFloat(nb.mrp) || 0,
            sellingPrice: parseFloat(nb.sellingPrice) || 0,
            message: '',
            quantity: 0,
            status: 1,
            originalIndex: nb.notebookIndex,
          });
        }
      });
    }

    return { books, notebooks, others: [] };
  },

  // Helper: collect all catalog items with quantity > 0 from a student
  getSelectedItems(student) {
    const selected = [];
    ['books', 'notebooks', 'others'].forEach((catType) => {
      const arr = student.catalog[catType] || [];
      arr.forEach((item) => {
        if (item.quantity > 0) selected.push(item);
      });
    });
    return selected;
  },

  // Helper: count total selected items across a student's catalog
  getSelectedCount(student) {
    let count = 0;
    ['books', 'notebooks', 'others'].forEach((catType) => {
      const arr = student.catalog[catType] || [];
      arr.forEach((item) => {
        if (item.quantity > 0) count += item.quantity;
      });
    });
    return count;
  },

  renderStudentTabs() {
    const tabsContainer = document.getElementById('student-tabs');
    const students = AppState.invoice.students;

    tabsContainer.innerHTML = students
      .map(
        (student, index) => `
        <div class="student-tab ${index === AppState.invoice.activeStudentIndex ? 'active' : ''}"
             onclick="Invoice.switchStudent(${index})">
          <span>Student ${index + 1}</span>
          ${
            students.length > 1
              ? `<button class="remove-student" onclick="event.stopPropagation(); Invoice.removeStudent(${index})">×</button>`
              : ''
          }
        </div>
      `
      )
      .join('');
  },

  switchStudent(index) {
    AppState.invoice.activeStudentIndex = index;
    this.renderStudentTabs();
    this.renderStudentContent(index);
  },

  renderStudentContent(studentIndex) {
    const container = document.getElementById('student-content');
    const student = AppState.invoice.students[studentIndex];

    if (!student) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">No Student Data</div>
          <div class="empty-state-desc">Add a student to start.</div>
        </div>
      `;
      return;
    }

    let html = `<div class="student-panel" data-student="${studentIndex}">`;

    // Tab Header (Mobile Only)
    const books = student.catalog.books || [];
    const booksSelected = books.filter(b => b.quantity > 0).reduce((sum, b) => sum + b.quantity, 0);
    const notebooks = student.catalog.notebooks || [];
    const notebooksSelected = notebooks.filter(n => n.quantity > 0).reduce((sum, n) => sum + n.quantity, 0);
    const others = student.catalog.others || [];
    const othersSelected = others.filter(o => o.quantity > 0).reduce((sum, o) => sum + o.quantity, 0);

    const activeTab = student.activeTab || 'books';

    html += `
      <div class="catalog-tabs">
        <button class="catalog-tab ${activeTab === 'books' ? 'active' : ''}" data-tab="books" onclick="Invoice.switchTab(${studentIndex}, 'books')">Books <span class="tab-badge">${booksSelected}</span></button>
        <button class="catalog-tab ${activeTab === 'notebooks' ? 'active' : ''}" data-tab="notebooks" onclick="Invoice.switchTab(${studentIndex}, 'notebooks')">Notebooks <span class="tab-badge">${notebooksSelected}</span></button>
        <button class="catalog-tab ${activeTab === 'others' ? 'active' : ''}" data-tab="others" onclick="Invoice.switchTab(${studentIndex}, 'others')">Custom <span class="tab-badge">${othersSelected}</span></button>
      </div>
    `;

    // Column container for Books and Notebooks
    html += `<div class="student-catalog-columns">`;

    // Books Column
    html += `
      <div class="catalog-column column-books catalog-tab-content tab-books ${activeTab === 'books' ? 'active' : ''}">
        <div class="section-header">
          <h3>📕 Books <span class="section-count">${books.length}</span>${booksSelected > 0 ? ` <span class="section-selected-badge">${booksSelected} selected</span>` : ''}</h3>
        </div>
        <div class="catalog-list">
    `;
    if (books.length > 0) {
      html += books.map((item, catIndex) => this.renderCatalogCard(item, studentIndex, 'books', catIndex)).join('');
    } else {
      html += `<div class="empty-state" style="padding: 24px;"><div class="empty-state-desc">No books available for this class.</div></div>`;
    }
    html += `
        </div>
      </div>
    `;

    // Notebooks Column
    html += `
      <div class="catalog-column column-notebooks catalog-tab-content tab-notebooks ${activeTab === 'notebooks' ? 'active' : ''}">
        <div class="section-header">
          <h3>📓 Notebooks <span class="section-count">${notebooks.length}</span>${notebooksSelected > 0 ? ` <span class="section-selected-badge">${notebooksSelected} selected</span>` : ''}</h3>
        </div>
        <div class="catalog-list">
    `;
    if (notebooks.length > 0) {
      html += notebooks.map((item, catIndex) => this.renderCatalogCard(item, studentIndex, 'notebooks', catIndex)).join('');
    } else {
      html += `<div class="empty-state" style="padding: 24px;"><div class="empty-state-desc">No notebooks available for this class.</div></div>`;
    }
    html += `
        </div>
      </div>
    `;

    // Close columns container
    html += `</div>`;

    // Custom Items section (Full Width)
    html += `
      <div class="catalog-full-width column-others catalog-tab-content tab-others ${activeTab === 'others' ? 'active' : ''}">
        <div class="section-header">
          <h3>📦 Custom Items${others.length > 0 ? ` <span class="section-count">${others.length}</span>` : ''}${othersSelected > 0 ? ` <span class="section-selected-badge">${othersSelected} selected</span>` : ''}</h3>
        </div>
        <div class="catalog-list" style="margin-bottom: 16px;">
    `;
    // Render existing custom items
    if (others.length > 0) {
      html += others.map((item, catIndex) => this.renderOtherCard(item, studentIndex, catIndex)).join('');
    }
    html += `
        </div>
        <button class="add-other-item btn btn-secondary btn-full" onclick="Invoice.addOtherItem(${studentIndex})">
          ➕ Add Custom Item
        </button>
      </div>
    `;

    html += `</div>`;
    container.innerHTML = html;
  },

  renderCatalogCard(item, studentIndex, catType, catIndex) {
    const identityClass = item.type === 'notebook' ? 'notebook' : '';
    const isSelected = item.quantity > 0;
    const selectedClass = isSelected ? 'item-card-selected' : '';
    const hasNote = item.message && item.message.trim().length > 0;
    return `
      <div class="item-card ${selectedClass} ${hasNote ? 'item-card-has-note' : ''}">
        <div class="item-identity ${identityClass}">${escapeHtml(item.identity || item.type.charAt(0).toUpperCase())}</div>
        <div class="item-main-info">
          <div class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        </div>
        <div class="item-price-and-inputs-row">
          <div class="item-prices">
            <span class="item-mrp">MRP: ${formatCurrency(item.mrp)}</span>
            <span class="item-selling-price-label">Sell: ${formatCurrency(item.sellingPrice)}</span>
          </div>
          ${isSelected ? `
            <div class="item-inputs-row">
              <div class="item-input-group price-input">
                <label>Price</label>
                <input type="number" value="${item.sellingPrice}" 
                       step="0.01" min="0"
                       onchange="Invoice.updateCatalogPrice(${studentIndex}, '${catType}', ${catIndex}, this.value)">
              </div>
              <div class="item-input-group note-input">
                <label>Note</label>
                <input type="text" placeholder="Add note..."
                       value="${escapeHtml(item.message)}"
                       onchange="Invoice.updateCatalogMessage(${studentIndex}, '${catType}', ${catIndex}, this.value)">
              </div>
            </div>
          ` : ''}
        </div>
        <div class="item-controls">
          <div class="quantity-control">
            <button class="quantity-btn" onclick="Invoice.updateQuantity(${studentIndex}, '${catType}', ${catIndex}, -1)">−</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-btn" onclick="Invoice.updateQuantity(${studentIndex}, '${catType}', ${catIndex}, 1)">+</button>
          </div>
        </div>
      </div>
    `;
  },

  renderOtherCard(item, studentIndex, catIndex) {
    const isSelected = item.quantity > 0;
    const selectedClass = isSelected ? 'item-card-selected' : '';
    const hasNote = item.message && item.message.trim().length > 0;
    return `
      <div class="item-card item-card-no-identity ${selectedClass} ${hasNote ? 'item-card-has-note' : ''}">
        <div class="item-main-info">
          <input type="text" placeholder="Item name" value="${escapeHtml(item.name)}"
                 onchange="Invoice.updateCatalogOtherName(${studentIndex}, ${catIndex}, this.value)"
                 class="item-name-input">
        </div>
        <div class="item-price-and-inputs-row">
          ${isSelected ? `
            <div class="item-inputs-row">
              <div class="item-input-group price-input">
                <label>Price</label>
                <input type="number" placeholder="Price" value="${item.sellingPrice}" step="0.01" min="0"
                       onchange="Invoice.updateCatalogPrice(${studentIndex}, 'others', ${catIndex}, this.value)">
              </div>
              <div class="item-input-group note-input">
                <label>Note</label>
                <input type="text" placeholder="Add note..." value="${escapeHtml(item.message)}"
                       onchange="Invoice.updateCatalogMessage(${studentIndex}, 'others', ${catIndex}, this.value)">
              </div>
            </div>
          ` : `
            <div class="item-prices">
              <span class="item-selling-price-label">Sell: ${formatCurrency(item.sellingPrice)}</span>
            </div>
          `}
        </div>
        <div class="item-controls">
          <div class="quantity-control">
            <button class="quantity-btn" onclick="Invoice.updateQuantity(${studentIndex}, 'others', ${catIndex}, -1)">−</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-btn" onclick="Invoice.updateQuantity(${studentIndex}, 'others', ${catIndex}, 1)">+</button>
          </div>
          <button class="remove-other-btn" onclick="Invoice.removeOtherItem(${studentIndex}, ${catIndex})" title="Remove item">×</button>
        </div>
      </div>
    `;
  },

  updateQuantity(studentIndex, catType, catIndex, delta) {
    const student = AppState.invoice.students[studentIndex];
    if (!student || !student.catalog[catType]) return;

    const item = student.catalog[catType][catIndex];
    if (!item) return;

    item.quantity = Math.max(0, item.quantity + delta);

    this.renderStudentContent(studentIndex);
    this.updateInvoiceSummary();
  },

  switchTab(studentIndex, tabId) {
    const student = AppState.invoice.students[studentIndex];
    if (student) {
      student.activeTab = tabId;
    }

    const studentPanel = document.querySelector(`.student-panel[data-student="${studentIndex}"]`);
    if (!studentPanel) return;

    // Update tab buttons
    const tabButtons = studentPanel.querySelectorAll('.catalog-tab');
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update content sections
    const contents = studentPanel.querySelectorAll('.catalog-tab-content');
    contents.forEach(content => {
      if (content.classList.contains('tab-' + tabId)) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  },

  addOtherItem(studentIndex) {
    const student = AppState.invoice.students[studentIndex];
    if (!student) return;

    if (!student.catalog.others) student.catalog.others = [];

    student.catalog.others.push({
      type: 'other',
      identity: 'OTH',
      name: '',
      mrp: 0,
      sellingPrice: 0,
      quantity: 1,
      message: '',
      status: 1,
    });

    this.renderStudentContent(studentIndex);
    this.updateInvoiceSummary();
  },

  removeOtherItem(studentIndex, catIndex) {
    const student = AppState.invoice.students[studentIndex];
    if (!student || !student.catalog.others) return;

    student.catalog.others.splice(catIndex, 1);
    this.renderStudentContent(studentIndex);
    this.updateInvoiceSummary();
  },

  updateCatalogOtherName(studentIndex, catIndex, newName) {
    const student = AppState.invoice.students[studentIndex];
    if (!student || !student.catalog.others || !student.catalog.others[catIndex]) return;
    student.catalog.others[catIndex].name = newName;
  },

  updateCatalogPrice(studentIndex, catType, catIndex, newPrice) {
    const student = AppState.invoice.students[studentIndex];
    if (!student || !student.catalog[catType] || !student.catalog[catType][catIndex]) return;
    student.catalog[catType][catIndex].sellingPrice = parseFloat(newPrice) || 0;
    this.updateInvoiceSummary();
  },

  updateCatalogMessage(studentIndex, catType, catIndex, message) {
    const student = AppState.invoice.students[studentIndex];
    if (!student || !student.catalog[catType] || !student.catalog[catType][catIndex]) return;
    student.catalog[catType][catIndex].message = message;
  },

  updateInvoiceSummary() {
    const summaryEl = document.getElementById('invoice-summary');
    if (!summaryEl) return;

    let totalItems = 0;
    let totalAmount = 0;

    AppState.invoice.students.forEach((student) => {
      const selected = this.getSelectedItems(student);
      selected.forEach((item) => {
        totalItems += item.quantity;
        totalAmount += item.quantity * item.sellingPrice;
      });
    });

    summaryEl.innerHTML = `
      <span>${totalItems} item${totalItems !== 1 ? 's' : ''} | Total: <strong>${formatCurrency(totalAmount)}</strong></span>
    `;
  },

  duplicateStudent() {
    const activeIndex = AppState.invoice.activeStudentIndex;
    const activeStudent = AppState.invoice.students[activeIndex];
    if (!activeStudent) {
      showToast('No student to duplicate', 'error');
      return;
    }

    const cloned = deepClone(activeStudent);
    AppState.invoice.students.push(cloned);
    const newIndex = AppState.invoice.students.length - 1;
    AppState.invoice.activeStudentIndex = newIndex;

    this.renderStudentTabs();
    this.renderStudentContent(newIndex);
    this.updateInvoiceSummary();
    showToast('Student duplicated successfully', 'success');
  },

  addNewStudent() {
    // Populate schools dropdown in the modal
    const schoolSelect = document.getElementById('new-student-school');
    schoolSelect.innerHTML = '<option value="">-- Select School --</option>';
    AppState.schools.forEach((school) => {
      schoolSelect.innerHTML += `<option value="${school.index}" data-name="${escapeHtml(school.name)}">${escapeHtml(school.name)}</option>`;
    });

    // Reset class dropdown
    const classSelect = document.getElementById('new-student-class');
    classSelect.innerHTML = '<option value="">-- Select Class --</option>';
    classSelect.disabled = true;

    Modal.show('modal-new-student');
  },

  async onNewStudentSchoolChange(schoolIndex) {
    const classSelect = document.getElementById('new-student-class');
    classSelect.innerHTML = '<option value="">-- Loading... --</option>';
    classSelect.disabled = true;

    if (!schoolIndex) {
      classSelect.innerHTML = '<option value="">-- Select Class --</option>';
      return;
    }

    const res = await API.get('getClasses', { schoolIndex: schoolIndex });
    classSelect.innerHTML = '<option value="">-- Select Class --</option>';

    if (res && res.success && res.data) {
      const activeClasses = res.data.filter((c) => Number(c.status) !== 0);
      activeClasses.forEach((cls) => {
        classSelect.innerHTML += `<option value="${cls.classIndex}" data-name="${escapeHtml(cls.className)}">${escapeHtml(cls.className)}</option>`;
      });
      classSelect.disabled = false;
    }
  },

  async confirmNewStudent() {
    const schoolSelect = document.getElementById('new-student-school');
    const classSelect = document.getElementById('new-student-class');

    const schoolIndex = schoolSelect.value;
    const classIndex = classSelect.value;

    if (!schoolIndex || !classIndex) {
      showToast('Please select both school and class', 'error');
      return;
    }

    const schoolName =
      schoolSelect.options[schoolSelect.selectedIndex].dataset.name || '';
    const className =
      classSelect.options[classSelect.selectedIndex].dataset.name || '';

    // Load items for the new student
    const catalog = await this.loadItems(parseInt(classIndex));
    if (catalog) {
      AppState.invoice.students.push({
        schoolName,
        className,
        classIndex: parseInt(classIndex),
        catalog: catalog,
      });

      const newIndex = AppState.invoice.students.length - 1;
      AppState.invoice.activeStudentIndex = newIndex;

      this.renderStudentTabs();
      this.renderStudentContent(newIndex);
      this.updateInvoiceSummary();
      Modal.hide('modal-new-student');
      showToast('New student added', 'success');
    }
  },

  removeStudent(index) {
    if (AppState.invoice.students.length <= 1) {
      showToast('Cannot remove the only student', 'error');
      return;
    }

    AppState.invoice.students.splice(index, 1);

    // Adjust active index
    if (AppState.invoice.activeStudentIndex >= AppState.invoice.students.length) {
      AppState.invoice.activeStudentIndex = AppState.invoice.students.length - 1;
    }

    this.renderStudentTabs();
    this.renderStudentContent(AppState.invoice.activeStudentIndex);
    this.updateInvoiceSummary();
    showToast('Student removed', 'info');
  },

  showCheckoutModal() {
    // Validate — at least one item with quantity > 0 across all catalog types
    let hasItems = false;
    AppState.invoice.students.forEach((student) => {
      if (this.getSelectedItems(student).length > 0) hasItems = true;
    });

    if (!hasItems) {
      showToast('Please add at least one item with quantity > 0', 'error');
      return;
    }

    // Build checkout summary
    const summaryEl = document.getElementById('checkout-summary');
    let html = '';
    let grandTotal = 0;

    AppState.invoice.students.forEach((student, sIndex) => {
      let studentTotal = 0;
      const selectedItems = this.getSelectedItems(student);

      if (selectedItems.length === 0) return;

      html += `<div style="margin-bottom: 8px; font-weight: 600; color: var(--color-sky-blue); font-size: 0.85rem;">Student ${sIndex + 1} — ${escapeHtml(student.className)}</div>`;

      selectedItems.forEach((item) => {
        const lineTotal = item.quantity * item.sellingPrice;
        studentTotal += lineTotal;
        html += `
          <div class="checkout-summary-row">
            <span>${escapeHtml(item.name)} × ${item.quantity}</span>
            <span>${formatCurrency(lineTotal)}</span>
          </div>
        `;
      });

      grandTotal += studentTotal;
    });

    html += `
      <div class="checkout-summary-row total">
        <span>Grand Total</span>
        <span>${formatCurrency(grandTotal)}</span>
      </div>
    `;

    summaryEl.innerHTML = html;

    // Clear inputs
    document.getElementById('checkout-mobile').value = '';
    document.getElementById('checkout-name').value = '';
    document.getElementById('checkout-message').value = '';

    Modal.show('modal-checkout');
  },

  async completeInvoice() {
    const mobile = document.getElementById('checkout-mobile').value.trim();
    const name = document.getElementById('checkout-name').value.trim();
    const message = document.getElementById('checkout-message').value.trim();

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      showToast('Please enter exactly 10 numeric digits for the mobile number', 'error');
      return;
    }

    if (!name) {
      showToast('Please enter customer name', 'error');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN');

    // Build students data — expand items with quantity>1 into N separate entries for backend
    const studentsData = AppState.invoice.students.map((student) => {
      const expandedItems = [];
      const selectedItems = this.getSelectedItems(student);

      selectedItems.forEach((item) => {
        // Expand: quantity N → N separate entries, each with quantity: 1
        for (let i = 0; i < item.quantity; i++) {
          expandedItems.push({
            type: item.type,
            identity: item.identity,
            name: item.name,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
            quantity: 1,
            message: item.message,
            status: item.status,
          });
        }
      });

      return {
        schoolName: student.schoolName,
        className: student.className,
        items: expandedItems,
      };
    });

    // Match code.gs createInvoice expected fields
    const result = await API.post('createInvoice', {
      mobileNumber: mobile,
      customerName: name,
      date: dateStr,
      time: timeStr,
      invoiceMessage: message,
      students: studentsData,
    });

    if (result && result.success) {
      const invNum = result.data ? result.data.invoiceNumber : '';
      showToast(`Record ${invNum} created successfully!`, 'success');
      Modal.hide('modal-checkout');
      this.reset();

      // Go back to school selection
      document.getElementById('invoice-view').classList.add('hidden');
      document.getElementById('school-selection').classList.remove('hidden');
    }
  },

  reset() {
    AppState.invoice = {
      students: [],
      activeStudentIndex: 0,
    };
    document.getElementById('student-tabs').innerHTML = '';
    document.getElementById('student-content').innerHTML = '';
    const summaryEl = document.getElementById('invoice-summary');
    if (summaryEl) summaryEl.innerHTML = '';
  },
};

// ============================================
// ENTRIES MODULE
// ============================================
const Entries = {
  async load() {
    const res = await API.get('getEntries');
    if (res && res.success && res.data) {
      AppState.entries = res.data.map(e => ({
        invoiceNumber: e.invoiceNumber,
        customerName: e.customerName,
        customerMobile: e.mobileNumber,
        date: e.date,
        time: e.time,
        invoiceMessage: e.invoiceMessage,
        students: e.students || [],
      }));
    } else {
      AppState.entries = [];
    }
    AppState.filteredEntries = [...AppState.entries];
    this.applyFiltersAndSearch();
  },

  applyFiltersAndSearch() {
    let entries = [...AppState.entries];

    // Apply status filter
    if (AppState.entriesFilter !== 'all') {
      entries = entries.filter((entry) => {
        const status = this.getInvoiceStatus(entry.students);
        return status === AppState.entriesFilter;
      });
    }

    // Apply search
    const query = AppState.entriesSearch.toLowerCase();
    if (query) {
      entries = entries.filter((entry) => {
        return (
          String(entry.customerName || '').toLowerCase().includes(query) ||
          String(entry.customerMobile || '').toLowerCase().includes(query) ||
          String(entry.invoiceNumber || '').toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    const sortEl = document.getElementById('sort-entries');
    const sortBy = sortEl ? sortEl.value : 'date-new';
    entries.sort((a, b) => {
      if (sortBy === 'date-new') {
        return b.invoiceNumber.localeCompare(a.invoiceNumber);
      } else if (sortBy === 'date-old') {
        return a.invoiceNumber.localeCompare(b.invoiceNumber);
      } else if (sortBy === 'name-asc') {
        return (a.customerName || '').localeCompare(b.customerName || '');
      } else if (sortBy === 'invoice-desc') {
        return b.invoiceNumber.localeCompare(a.invoiceNumber);
      }
      return 0;
    });

    AppState.filteredEntries = entries;
    this.render();
  },

  render() {
    const listEl = document.getElementById('entries-list');

    if (AppState.filteredEntries.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No Entries Found</div>
          <div class="empty-state-desc">Records will appear here once they are created.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = AppState.filteredEntries
      .map((entry) => {
        const status = this.getInvoiceStatus(entry.students);
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const dateStr = formatUserFriendlyDateTime(entry.date, entry.time);

        return `
          <div class="entry-card" id="entry-${escapeHtml(entry.invoiceNumber)}">
            <div class="entry-header" onclick="Entries.openInvoiceDetailsModal('${escapeHtml(entry.invoiceNumber)}')">
              <div class="entry-main-info">
                <span class="entry-invoice-num">#${escapeHtml(entry.invoiceNumber)}</span>
                <div class="entry-customer">
                  <div class="entry-customer-name">${escapeHtml(entry.customerName)}</div>
                  <div class="entry-customer-mobile">${escapeHtml(entry.customerMobile)}</div>
                </div>
              </div>
              <div class="entry-meta">
                <span class="status-badge ${status}">${statusLabel}</span>
                <span class="entry-date">${escapeHtml(dateStr)}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  },

  getInvoiceStatus(students) {
    if (!students || students.length === 0) return 'pending';

    const allStatuses = [];
    students.forEach((student) => {
      if (student.items) {
        student.items.forEach((item) => {
          allStatuses.push(item.status);
        });
      }
    });

    if (allStatuses.length === 0) return 'pending';

    const hasPending = allStatuses.some((s) => s === 1);
    const hasDelivered = allStatuses.some((s) => s === 0);
    const hasReturned = allStatuses.some((s) => s === 2);
    const hasCancelled = allStatuses.some((s) => s === 3);

    // If there is still at least one pending item to act on:
    if (hasPending) {
      const allPending = allStatuses.every((s) => s === 1);
      return allPending ? 'pending' : 'partial';
    }

    // If there are zero pending items, the invoice is fully resolved:
    if (hasDelivered) {
      return 'completed';
    } else if (hasReturned) {
      return 'returned';
    } else {
      return 'cancelled';
    }
  },

  filterEntries(filter) {
    AppState.entriesFilter = filter;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.remove('active');
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      }
    });

    this.applyFiltersAndSearch();
  },

  searchEntries(query) {
    AppState.entriesSearch = query;
    this.applyFiltersAndSearch();
  },

  openInvoiceDetailsModal(invoiceNumber) {
    const entry = AppState.entries.find(e => e.invoiceNumber === invoiceNumber);
    if (!entry) return;

    AppState.activeModalStudentIndex = 0;
    AppState.activeModalCategoryTabs = {};

    const statusClass = this.getInvoiceStatus(entry.students);
    const statusText = statusClass.toUpperCase();
    document.getElementById('invoice-details-title').innerHTML = 
      `#${entry.invoiceNumber} <span class="status-badge ${statusClass}" style="margin-left: 12px; font-size: 12px; vertical-align: middle; padding: 4px 8px;">${statusText}</span>`;
    
    const dateStr = formatUserFriendlyDateTime(entry.date, entry.time);

    let html = `
      <div style="margin-bottom: 16px; line-height: 1.5; color: var(--color-graphite); font-size: 15px;">
        <div style="font-weight: 700; color: var(--color-almost-black); font-size: 17px;">${escapeHtml(entry.customerName)}</div>
        <div>${escapeHtml(entry.customerMobile)}</div>
        <div style="color: var(--color-silver); font-size: 13px;">${escapeHtml(dateStr)}</div>
        ${entry.invoiceMessage ? `<div style="margin-top: 8px; font-style: italic; color: var(--color-graphite);">${escapeHtml(entry.invoiceMessage)}</div>` : ''}
      </div>
    `;

    html += this.renderEntryDetails(entry);

    document.getElementById('invoice-details-body').innerHTML = html;
    Modal.show('modal-invoice-details');
  },

  renderEntryDetails(entry) {
    if (!entry.students || entry.students.length === 0) {
      return '<p class="text-muted" style="padding: 12px; font-size: 0.85rem;">No details available.</p>';
    }

    let html = '';

    // Render Student Tabs at the top
    html += `
      <div class="student-tabs-container" style="margin-bottom: 16px; border-bottom: 2px solid var(--theme-border); padding-bottom: 8px;">
        <div class="student-tabs" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
    `;
    entry.students.forEach((student, sIndex) => {
      const activeClass = sIndex === AppState.activeModalStudentIndex ? 'active' : '';
      html += `
        <button class="student-tab ${activeClass}" onclick="Entries.switchModalStudentTab(${sIndex})">
          Student ${sIndex + 1}
        </button>
      `;
    });
    html += `
        </div>
      </div>
    `;

    // Render Student Content areas
    entry.students.forEach((student, sIndex) => {
      const activeStudentClass = sIndex === AppState.activeModalStudentIndex ? 'active' : '';
      
      // Categorize items
      const books = (student.items || []).filter(item => item.type === 'book');
      const notebooks = (student.items || []).filter(item => item.type === 'notebook');
      const customItems = (student.items || []).filter(item => item.type === 'other');

      // Get active category tab (default: 'books')
      const activeCategoryTab = AppState.activeModalCategoryTabs[sIndex] || 'books';

      html += `
        <div class="entry-student-section catalog-tab-content ${activeStudentClass}" data-student-index="${sIndex}">
          <div class="entry-student-header" style="margin-bottom: 12px; font-weight: 700; color: var(--color-charcoal); font-size: 13px;">
            School: ${escapeHtml(student.schoolName)} — Class: ${escapeHtml(student.className)}
          </div>

          <!-- Secondary Category Tabs inside each Student -->
          <div class="catalog-tabs" style="margin-bottom: 16px; gap: 8px;">
            <button class="catalog-tab ${activeCategoryTab === 'books' ? 'active' : ''}" data-tab="books" onclick="Entries.switchModalCategoryTab(${sIndex}, 'books')">
              Books <span class="tab-badge">${books.length}</span>
            </button>
            <button class="catalog-tab ${activeCategoryTab === 'notebooks' ? 'active' : ''}" data-tab="notebooks" onclick="Entries.switchModalCategoryTab(${sIndex}, 'notebooks')">
              Notebooks <span class="tab-badge">${notebooks.length}</span>
            </button>
            <button class="catalog-tab ${activeCategoryTab === 'others' ? 'active' : ''}" data-tab="others" onclick="Entries.switchModalCategoryTab(${sIndex}, 'others')">
              Custom <span class="tab-badge">${customItems.length}</span>
            </button>
          </div>

          <!-- Category Contents -->
          
          <!-- Books List -->
          <div class="modal-category-content tab-books ${activeCategoryTab === 'books' ? 'active' : ''}">
            ${this.renderItemList(entry.invoiceNumber, sIndex, books, student.items)}
          </div>

          <!-- Notebooks List -->
          <div class="modal-category-content tab-notebooks ${activeCategoryTab === 'notebooks' ? 'active' : ''}">
            ${this.renderItemList(entry.invoiceNumber, sIndex, notebooks, student.items)}
          </div>

          <!-- Custom Items List -->
          <div class="modal-category-content tab-others ${activeCategoryTab === 'others' ? 'active' : ''}">
            ${this.renderItemList(entry.invoiceNumber, sIndex, customItems, student.items)}
          </div>

        </div>
      `;
    });

    return html;
  },

  renderItemList(invoiceNumber, studentIndex, filteredItems, allItems) {
    if (filteredItems.length === 0) {
      return '<p class="text-muted" style="padding: 12px; font-size: 0.82rem;">No items in this category.</p>';
    }

    let html = '';
    filteredItems.forEach((item) => {
      // Find the index of this item in the original allItems array to pass to renderItemActions
      const iIndex = allItems.findIndex(x => x === item);

      const itemStatus = this.getItemStatusLabel(item.status);
      const itemStatusClass = this.getItemStatusClass(item.status);

      html += `
        <div class="entry-item">
          <div class="entry-item-info">
            <div class="entry-item-name-row">
              <span class="entry-item-name">${escapeHtml(item.name)}</span>
              <span class="entry-item-qty">x${item.quantity}</span>
              <span class="status-badge ${itemStatusClass} status-badge-compact">${itemStatus}</span>
            </div>
            <div class="entry-item-meta-row">
              <span class="entry-item-price">Total: ${formatCurrency(item.sellingPrice * item.quantity)}</span>
              ${item.message ? `<span class="entry-item-note-inline">Note: ${escapeHtml(item.message)}</span>` : ''}
            </div>
          </div>
          <div class="entry-item-actions">
            ${this.renderItemActions(invoiceNumber, studentIndex, iIndex, item.status)}
          </div>
        </div>
      `;
    });

    return html;
  },

  switchModalStudentTab(studentIndex) {
    AppState.activeModalStudentIndex = studentIndex;

    const modalBody = document.getElementById('invoice-details-body');
    if (!modalBody) return;

    // Toggle active classes on student tabs
    const tabs = modalBody.querySelectorAll('.student-tab');
    tabs.forEach((tab, index) => {
      if (index === studentIndex) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Toggle active classes on student sections
    const sections = modalBody.querySelectorAll('.entry-student-section');
    sections.forEach((section) => {
      const idx = parseInt(section.dataset.studentIndex, 10);
      if (idx === studentIndex) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
  },

  switchModalCategoryTab(studentIndex, tabId) {
    AppState.activeModalCategoryTabs[studentIndex] = tabId;

    const modalBody = document.getElementById('invoice-details-body');
    if (!modalBody) return;

    const section = modalBody.querySelector(`.entry-student-section[data-student-index="${studentIndex}"]`);
    if (!section) return;

    // Update tab buttons active classes
    const tabs = section.querySelectorAll('.catalog-tab');
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update tab content active classes
    const contents = section.querySelectorAll('.modal-category-content');
    contents.forEach(content => {
      if (content.classList.contains('tab-' + tabId)) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  },

  getItemStatusLabel(status) {
    switch (status) {
      case 0:
        return 'Delivered';
      case 1:
        return 'Pending';
      case 2:
        return 'Returned';
      case 3:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  },

  getItemStatusClass(status) {
    switch (status) {
      case 0:
        return 'delivered';
      case 1:
        return 'pending';
      case 2:
        return 'returned';
      case 3:
        return 'cancelled';
      default:
        return '';
    }
  },

  renderItemActions(invoiceNumber, studentIndex, itemIndex, status) {
    let actions = '';

    if (status === 1) {
      // Pending → can deliver or cancel
      actions += `<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); Entries.updateItemStatus('${escapeHtml(invoiceNumber)}', ${studentIndex}, ${itemIndex}, 0)">✅ Deliver</button>`;
      actions += `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); Entries.updateItemStatus('${escapeHtml(invoiceNumber)}', ${studentIndex}, ${itemIndex}, 3)">❌ Cancel</button>`;
    } else if (status === 0) {
      // Delivered → can return
      actions += `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); Entries.updateItemStatus('${escapeHtml(invoiceNumber)}', ${studentIndex}, ${itemIndex}, 2)">↩️ Return</button>`;
    }
    // Returned/Cancelled → no actions

    return actions;
  },

  async updateItemStatus(invoiceNumber, studentIndex, itemIndex, newStatus) {
    const result = await API.post('updateItemStatus', {
      invoiceNumber,
      studentIndex,
      itemIndex,
      newStatus,
    });

    if (result && result.success) {
      // Update local state
      const entry = AppState.entries.find(
        (e) => e.invoiceNumber === invoiceNumber
      );
      if (entry && entry.students[studentIndex] && entry.students[studentIndex].items[itemIndex]) {
        entry.students[studentIndex].items[itemIndex].status = newStatus;
      }

      this.applyFiltersAndSearch();

      // Dynamically re-render details in the open modal to update UI reactively
      if (entry) {
        document.getElementById('invoice-details-body').innerHTML = this.renderEntryDetails(entry);
      }

      showToast('Status updated successfully', 'success');
    }
  },
};

// ============================================
// ADMIN MODULE
// ============================================
const Admin = {
  async login() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
      errorEl.textContent = 'Please enter both username and password.';
      errorEl.classList.remove('hidden');
      return;
    }

    errorEl.classList.add('hidden');

    // code.gs login is a GET endpoint
    const res = await API.get('login', { username, password });

    if (res && res.success && res.data && res.data.authenticated) {
      AppState.isAdminLoggedIn = true;
      AppState.adminUsername = username;
      document.getElementById('admin-login').classList.add('hidden');
      document.getElementById('admin-dashboard').classList.remove('hidden');
      this.loadDashboard();
      showToast('Login successful', 'success');
    } else {
      errorEl.textContent = 'Invalid credentials.';
      errorEl.classList.remove('hidden');
    }
  },

  logout(shouldShowToast = true) {
    AppState.isAdminLoggedIn = false;
    AppState.adminUsername = '';
    AppState.adminData = { schools: [], classes: [], books: [], notebooks: [] };
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
    if (shouldShowToast) {
      showToast('Logged out', 'info');
    }
  },

  async loadDashboard() {
    await this.loadStats();
    await this.ensureMetadata();
    this.switchTab(AppState.adminTab);
  },

  async ensureMetadata() {
    if (AppState.adminData.schools.length === 0) {
      const schoolsRes = await API.get('getSchools');
      if (schoolsRes && schoolsRes.success && schoolsRes.data) {
        AppState.adminData.schools = schoolsRes.data.map(s => ({
          index: s.schoolIndex,
          name: s.schoolName,
          status: Number(s.status),
        }));
      }
    }
    if (AppState.adminData.classes.length === 0) {
      const classesRes = await API.get('getClasses');
      if (classesRes && classesRes.success && classesRes.data) {
        AppState.adminData.classes = classesRes.data.map(c => {
          const school = AppState.adminData.schools.find(s => Number(s.index) === Number(c.schoolIndex));
          return {
            index: c.classIndex,
            name: c.className,
            schoolIndex: c.schoolIndex,
            schoolName: school ? school.name : 'Unknown',
            status: Number(c.status),
          };
        });
      }
    }
  },

  async loadStats() {
    const res = await API.get('getStats');
    if (res && res.success && res.data) {
      this.renderStats(res.data);
    }
  },

  renderStats(stats) {
    document.getElementById('stat-total-invoices').textContent =
      stats.totalInvoices || 0;
    document.getElementById('stat-pending').textContent =
      stats.totalPending || 0;
    document.getElementById('stat-completed').textContent =
      stats.totalCompleted || 0;
    document.getElementById('stat-returned').textContent =
      stats.totalReturned || 0;
  },

  switchTab(tab) {
    AppState.adminTab = tab;

    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach((t) => {
      t.classList.remove('active');
      if (t.dataset.tab === tab) {
        t.classList.add('active');
      }
    });

    // Show/hide panels
    document.querySelectorAll('.admin-panel').forEach((p) => {
      p.classList.add('hidden');
      p.classList.remove('active');
    });
    const panel = document.getElementById(`admin-${tab}`);
    if (panel) {
      panel.classList.remove('hidden');
      panel.classList.add('active');
    }

    // Load data
    switch (tab) {
      case 'schools':
        this.loadSchools();
        break;
      case 'classes':
        this.loadClasses();
        break;
      case 'books':
        this.loadBooks();
        break;
      case 'notebooks':
        this.loadNotebooks();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  },

  loadSettings() {
    const currentUsernameInput = document.getElementById('settings-current-username');
    if (currentUsernameInput) {
      currentUsernameInput.value = AppState.adminUsername || '';
    }
    const newUsernameInput = document.getElementById('settings-new-username');
    const newPasswordInput = document.getElementById('settings-new-password');
    const confirmPasswordInput = document.getElementById('settings-confirm-password');
    if (newUsernameInput) newUsernameInput.value = '';
    if (newPasswordInput) newPasswordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';
  },

  async updateSettings() {
    const currentUsername = AppState.adminUsername;
    const newUsername = document.getElementById('settings-new-username').value.trim();
    const newPassword = document.getElementById('settings-new-password').value.trim();
    const confirmPassword = document.getElementById('settings-confirm-password').value.trim();

    if (!newUsername || !newPassword || !confirmPassword) {
      showToast('Please fill in all fields.', 'danger');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match.', 'danger');
      return;
    }

    const res = await API.post('updateAdminCredentials', {
      currentUsername,
      newUsername,
      newPassword,
    });

    if (res && res.success) {
      this.logout(false);
      showToast('Credentials updated!', 'success');
    } else {
      showToast(res.error || 'Failed to update credentials.', 'danger');
    }
  },

  // ---- SCHOOLS CRUD ----
  async loadSchools() {
    const res = await API.get('getSchools');
    if (res && res.success && res.data) {
      AppState.adminData.schools = res.data.map(s => ({
        index: s.schoolIndex,
        name: s.schoolName,
        status: Number(s.status),
      }));
    } else {
      AppState.adminData.schools = [];
    }
    this.renderSchools();
  },

  renderSchools() {
    const panel = document.getElementById('admin-schools');
    let html = `
      <div class="admin-panel-header">
        <h3>Manage Schools</h3>
        <button class="btn btn-primary btn-sm" onclick="Admin.showAddSchoolModal()">➕ Add School</button>
      </div>
      <div class="admin-list">
    `;

    if (AppState.adminData.schools.length === 0) {
      html += `
        <div class="empty-state" style="padding: 40px;">
          <div class="empty-state-icon">🏫</div>
          <div class="empty-state-title">No Schools</div>
          <div class="empty-state-desc">Click "Add School" to create one.</div>
        </div>
      `;
    } else {
      AppState.adminData.schools.forEach((school) => {
        const isDisabled = school.status === 0;
        html += `
          <div class="admin-list-item ${isDisabled ? 'disabled' : ''}">
            <div class="admin-list-info">
              <span class="admin-list-name">${escapeHtml(school.name)}</span>
              <span class="admin-list-meta">Status: ${isDisabled ? 'Disabled' : 'Active'}</span>
            </div>
            <div class="admin-list-actions">
              <button class="btn btn-info btn-sm" onclick="Admin.showEditSchoolModal(${JSON.stringify(school).replace(/"/g, '&quot;')})">✏️ Edit</button>
              <button class="btn ${isDisabled ? 'btn-success' : 'btn-warning'} btn-sm" onclick="Admin.toggleSchool(${school.index}, ${isDisabled ? 1 : 0})">
                ${isDisabled ? '✅ Enable' : '⏸️ Disable'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="Admin.toggleSchool(${school.index}, 2)">🗑️ Delete</button>
            </div>
          </div>
        `;
      });
    }

    html += '</div>';
    panel.innerHTML = html;
  },

  showAddSchoolModal() {
    Modal.setupAdminModal('Add School', [
      { id: 'school-name', label: 'School Name', type: 'text', placeholder: 'Enter school name', value: '' },
    ], (data) => {
      this.saveSchool({ name: data['school-name'], isNew: true });
    });
  },

  showEditSchoolModal(school) {
    Modal.setupAdminModal('Edit School', [
      { id: 'school-name', label: 'School Name', type: 'text', placeholder: 'Enter school name', value: school.name },
    ], (data) => {
      this.saveSchool({ name: data['school-name'], index: school.index, isNew: false });
    });
  },

  async saveSchool(data) {
    const action = data.isNew ? 'addSchool' : 'editSchool';
    const body = { schoolName: data.name };
    if (!data.isNew) body.schoolIndex = data.index;

    const result = await API.post(action, body);
    if (result && result.success) {
      showToast(`School ${data.isNew ? 'added' : 'updated'} successfully`, 'success');
      Modal.hide('modal-admin');
      this.loadSchools();
    }
  },

  async toggleSchool(schoolIndex, newStatus) {
    if (newStatus === 2) {
      if (!confirm("Are you sure you want to delete this school? This action cannot be undone.")) {
        return;
      }
    }
    const result = await API.post('toggleSchool', {
      schoolIndex: schoolIndex,
      status: newStatus,
    });
    if (result && result.success) {
      let msg = '';
      if (newStatus === 0) msg = 'School disabled';
      else if (newStatus === 1) msg = 'School enabled';
      else if (newStatus === 2) msg = 'School deleted';
      showToast(msg, 'success');
      this.loadSchools();
    }
  },

  // ---- CLASSES CRUD ----
  async loadClasses() {
    // Ensure schools are loaded first to map school names correctly
    if (AppState.adminData.schools.length === 0) {
      const schoolsRes = await API.get('getSchools');
      if (schoolsRes && schoolsRes.success && schoolsRes.data) {
        AppState.adminData.schools = schoolsRes.data.map(s => ({
          index: s.schoolIndex,
          name: s.schoolName,
          status: Number(s.status),
        }));
      }
    }
    const res = await API.get('getClasses');
    if (res && res.success && res.data) {
      // Enrich with school name from adminData.schools
      AppState.adminData.classes = res.data.map(c => {
        const school = AppState.adminData.schools.find(s => Number(s.index) === Number(c.schoolIndex));
        return {
          index: c.classIndex,
          name: c.className,
          schoolIndex: c.schoolIndex,
          schoolName: school ? school.name : 'Unknown',
          status: Number(c.status),
        };
      });
    } else {
      AppState.adminData.classes = [];
    }
    this.renderClasses();
  },

  renderClasses() {
    const panel = document.getElementById('admin-classes');
    AppState.adminFilters = AppState.adminFilters || {};
    
    let html = `
      <div class="admin-panel-header">
        <h3>Manage Classes</h3>
      </div>
      <div class="admin-filters" style="margin-bottom: 20px; background: #f7f7f7; padding: 16px; border-radius: var(--radius-cards);">
        <label style="font-weight: 700; margin-bottom: 8px; display: block;">Select School</label>
        <select id="filter-classes-school" onchange="Admin.onAdminFilterChange('classesSchool', this.value)" style="width: 100%; padding: 8px; border-radius: var(--radius-inputs);">
          <option value="">-- Choose a School --</option>
          ${AppState.adminData.schools.filter(s => s.status !== 0).map(s => `<option value="${s.index}" ${AppState.adminFilters.classesSchool == s.index ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
        <button class="btn btn-primary btn-sm" onclick="Admin.showAddClassModal()">➕ Add Class</button>
      </div>
      <div class="admin-list">
    `;

    if (!AppState.adminFilters.classesSchool) {
      html += `
        <div class="empty-state" style="padding: 40px;">
          <div class="empty-state-title">Select a School</div>
          <div class="empty-state-desc">Choose a school above to view its classes.</div>
        </div>
      `;
    } else {
      const filteredClasses = AppState.adminData.classes.filter(c => Number(c.schoolIndex) === Number(AppState.adminFilters.classesSchool));
      
      if (filteredClasses.length === 0) {
        html += `
          <div class="empty-state" style="padding: 40px;">
            <div class="empty-state-icon">📖</div>
            <div class="empty-state-title">No Classes</div>
            <div class="empty-state-desc">Click "Add Class" to create one for this school.</div>
          </div>
        `;
      } else {
        filteredClasses.forEach((cls) => {
          const isDisabled = cls.status === 0;
          html += `
            <div class="admin-list-item ${isDisabled ? 'disabled' : ''}">
              <div class="admin-list-info">
                <span class="admin-list-name">${escapeHtml(cls.name)}</span>
                <span class="admin-list-meta">Status: ${isDisabled ? 'Disabled' : 'Active'}</span>
              </div>
              <div class="admin-list-actions">
                <button class="btn btn-info btn-sm" onclick="Admin.showEditClassModal(${JSON.stringify(cls).replace(/"/g, '&quot;')})">✏️ Edit</button>
                <button class="btn ${isDisabled ? 'btn-success' : 'btn-warning'} btn-sm" onclick="Admin.toggleClass(${cls.index}, ${isDisabled ? 1 : 0})">
                  ${isDisabled ? '✅ Enable' : '⏸️ Disable'}
                </button>
                <button class="btn btn-danger btn-sm" onclick="Admin.toggleClass(${cls.index}, 2)">🗑️ Delete</button>
              </div>
            </div>
          `;
        });
      }
    }

    html += '</div>';
    panel.innerHTML = html;
  },

  onAdminFilterChange(filterKey, value) {
    AppState.adminFilters = AppState.adminFilters || {};
    AppState.adminFilters[filterKey] = value;
    
    // Reset child filters if parent changes
    if (filterKey === 'booksSchool') AppState.adminFilters.booksClass = '';
    if (filterKey === 'notebooksSchool') AppState.adminFilters.notebooksClass = '';

    if (filterKey.startsWith('classes')) this.renderClasses();
    if (filterKey.startsWith('books')) this.renderBooks();
    if (filterKey.startsWith('notebooks')) this.renderNotebooks();
  },

  showAddClassModal() {
    AppState.adminFilters = AppState.adminFilters || {};
    if (!AppState.adminFilters.classesSchool) {
      showToast('Please select a school first', 'error');
      return;
    }
    
    const school = AppState.adminData.schools.find(s => Number(s.index) === Number(AppState.adminFilters.classesSchool));

    Modal.setupAdminModal(`Add Class (to ${school.name})`, [
      { id: 'class-name', label: 'Class Name', type: 'text', placeholder: 'Enter class name', value: '' },
    ], (data) => {
      this.saveClass({ schoolIndex: AppState.adminFilters.classesSchool, name: data['class-name'], isNew: true });
    });
  },

  showEditClassModal(cls) {
    Modal.setupAdminModal('Edit Class', [
      { id: 'class-name', label: 'Class Name', type: 'text', placeholder: 'Enter class name', value: cls.name },
    ], (data) => {
      this.saveClass({ schoolIndex: cls.schoolIndex, name: data['class-name'], index: cls.index, isNew: false });
    });
  },

  async saveClass(data) {
    const action = data.isNew ? 'addClass' : 'editClass';
    const body = { className: data.name, schoolIndex: parseInt(data.schoolIndex) };
    if (!data.isNew) body.classIndex = data.index;

    const result = await API.post(action, body);
    if (result && result.success) {
      showToast(`Class ${data.isNew ? 'added' : 'updated'} successfully`, 'success');
      Modal.hide('modal-admin');
      this.loadClasses();
    }
  },

  async toggleClass(classIndex, newStatus) {
    if (newStatus === 2) {
      if (!confirm("Are you sure you want to delete this class? This action cannot be undone.")) {
        return;
      }
    }
    const result = await API.post('toggleClass', {
      classIndex: classIndex,
      status: newStatus,
    });
    if (result && result.success) {
      let msg = '';
      if (newStatus === 0) msg = 'Class disabled';
      else if (newStatus === 1) msg = 'Class enabled';
      else if (newStatus === 2) msg = 'Class deleted';
      showToast(msg, 'success');
      this.loadClasses();
    }
  },

  // ---- BOOKS CRUD ----
  async loadBooks() {
    await this.ensureMetadata();
    const res = await API.get('getBooks');
    if (res && res.success && res.data) {
      AppState.adminData.books = res.data.map(b => {
        const cls = AppState.adminData.classes.find(c => Number(c.index) === Number(b.classIndex));
        return {
          index: b.bookIndex,
          identity: b.bookIdentity,
          name: b.bookName,
          mrp: b.mrp,
          sellingPrice: b.sellingPrice,
          classIndex: b.classIndex,
          className: cls ? `${cls.schoolName} — ${cls.name}` : 'Unknown',
          status: Number(b.status),
        };
      });
    } else {
      AppState.adminData.books = [];
    }
    this.renderBooks();
  },

  renderBooks() {
    const panel = document.getElementById('admin-books');
    AppState.adminFilters = AppState.adminFilters || {};
    
    let html = `
      <div class="admin-panel-header">
        <h3>Manage Books</h3>
      </div>
      <div class="admin-filters" style="margin-bottom: 20px; background: #f7f7f7; padding: 16px; border-radius: var(--radius-cards);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label style="font-weight: 700; margin-bottom: 8px; display: block;">Select School</label>
            <select onchange="Admin.onAdminFilterChange('booksSchool', this.value)" style="width: 100%; padding: 8px; border-radius: var(--radius-inputs);">
              <option value="">-- Choose a School --</option>
              ${AppState.adminData.schools.filter(s => s.status !== 0).map(s => `<option value="${s.index}" ${AppState.adminFilters.booksSchool == s.index ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-weight: 700; margin-bottom: 8px; display: block;">Select Class</label>
            <select onchange="Admin.onAdminFilterChange('booksClass', this.value)" style="width: 100%; padding: 8px; border-radius: var(--radius-inputs);" ${!AppState.adminFilters.booksSchool ? 'disabled' : ''}>
              <option value="">-- Choose a Class --</option>
              ${AppState.adminData.classes.filter(c => c.status !== 0 && c.schoolIndex == AppState.adminFilters.booksSchool).map(c => `<option value="${c.index}" ${AppState.adminFilters.booksClass == c.index ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
        <button class="btn btn-primary btn-sm" onclick="Admin.showAddBookModal()">➕ Add Book</button>
      </div>
      <div class="admin-list">
    `;

    if (AppState.adminFilters.booksClass) {
      const filteredBooks = AppState.adminData.books.filter(b => Number(b.classIndex) === Number(AppState.adminFilters.booksClass));
      
      if (filteredBooks.length === 0) {
        html += `
          <div class="empty-state" style="padding: 40px;">
            <div class="empty-state-icon">📕</div>
            <div class="empty-state-title">No Books</div>
            <div class="empty-state-desc">Click "Add Book" to create one for this class.</div>
          </div>
        `;
      } else {
        filteredBooks.forEach((book) => {
          const isDisabled = book.status === 0;
          html += `
            <div class="admin-list-item ${isDisabled ? 'disabled' : ''}">
              <div class="admin-list-info">
                <span class="admin-list-name">[${escapeHtml(book.identity || '')}] ${escapeHtml(book.name)}</span>
                <span class="admin-list-meta">MRP: ${formatCurrency(book.mrp)} | Sell: ${formatCurrency(book.sellingPrice)} | Status: ${isDisabled ? 'Disabled' : 'Active'}</span>
              </div>
              <div class="admin-list-actions">
                <button class="btn btn-info btn-sm" onclick="Admin.showEditBookModal(${JSON.stringify(book).replace(/"/g, '&quot;')})">✏️ Edit</button>
                <button class="btn ${isDisabled ? 'btn-success' : 'btn-warning'} btn-sm" onclick="Admin.toggleBook(${book.index}, ${isDisabled ? 1 : 0})">
                  ${isDisabled ? '✅ Enable' : '⏸️ Disable'}
                </button>
                <button class="btn btn-danger btn-sm" onclick="Admin.toggleBook(${book.index}, 2)">🗑️ Delete</button>
              </div>
            </div>
          `;
        });
      }
    }

    html += '</div>';
    panel.innerHTML = html;
  },

  showAddBookModal() {
    AppState.adminFilters = AppState.adminFilters || {};
    if (!AppState.adminFilters.booksClass) {
      showToast('Please select a class first', 'error');
      return;
    }
    const cls = AppState.adminData.classes.find(c => Number(c.index) === Number(AppState.adminFilters.booksClass));

    Modal.setupAdminModal(`Add Book (to ${cls.name})`, [
      { id: 'book-identity', label: 'Identity Code', type: 'text', placeholder: 'e.g., ENG1', value: '' },
      { id: 'book-name', label: 'Book Name', type: 'text', placeholder: 'Enter book name', value: '' },
      { id: 'book-mrp', label: 'MRP', type: 'number', placeholder: '0.00', value: '' },
      { id: 'book-selling-price', label: 'Selling Price', type: 'number', placeholder: '0.00', value: '' },
    ], (data) => {
      this.saveBook({
        classIndex: AppState.adminFilters.booksClass,
        identity: data['book-identity'],
        name: data['book-name'],
        mrp: parseFloat(data['book-mrp']) || 0,
        sellingPrice: parseFloat(data['book-selling-price']) || 0,
        isNew: true,
      });
    });
  },

  showEditBookModal(book) {
    Modal.setupAdminModal('Edit Book', [
      { id: 'book-identity', label: 'Identity Code', type: 'text', placeholder: 'e.g., ENG1', value: book.identity || '' },
      { id: 'book-name', label: 'Book Name', type: 'text', placeholder: 'Enter book name', value: book.name || '' },
      { id: 'book-mrp', label: 'MRP', type: 'number', placeholder: '0.00', value: book.mrp || '' },
      { id: 'book-selling-price', label: 'Selling Price', type: 'number', placeholder: '0.00', value: book.sellingPrice || '' },
    ], (data) => {
      this.saveBook({
        classIndex: book.classIndex,
        identity: data['book-identity'],
        name: data['book-name'],
        mrp: parseFloat(data['book-mrp']) || 0,
        sellingPrice: parseFloat(data['book-selling-price']) || 0,
        index: book.index,
        isNew: false,
      });
    });
  },

  async saveBook(data) {
    const action = data.isNew ? 'addBook' : 'editBook';
    const body = {
      classIndex: parseInt(data.classIndex),
      bookIdentity: data.identity,
      bookName: data.name,
      mrp: data.mrp,
      sellingPrice: data.sellingPrice,
    };
    if (!data.isNew) body.bookIndex = data.index;

    const result = await API.post(action, body);
    if (result && result.success) {
      showToast(`Book ${data.isNew ? 'added' : 'updated'} successfully`, 'success');
      Modal.hide('modal-admin');
      this.loadBooks();
    }
  },

  async toggleBook(bookIndex, newStatus) {
    if (newStatus === 2) {
      if (!confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
        return;
      }
    }
    const result = await API.post('toggleBook', {
      bookIndex: bookIndex,
      status: newStatus,
    });
    if (result && result.success) {
      let msg = '';
      if (newStatus === 0) msg = 'Book disabled';
      else if (newStatus === 1) msg = 'Book enabled';
      else if (newStatus === 2) msg = 'Book deleted';
      showToast(msg, 'success');
      this.loadBooks();
    }
  },

  // ---- NOTEBOOKS CRUD ----
  async loadNotebooks() {
    await this.ensureMetadata();
    const res = await API.get('getNotebooks');
    if (res && res.success && res.data) {
      AppState.adminData.notebooks = res.data.map(nb => {
        const cls = AppState.adminData.classes.find(c => Number(c.index) === Number(nb.classIndex));
        return {
          index: nb.notebookIndex,
          identity: nb.notebookIdentity,
          name: nb.notebookName,
          mrp: nb.mrp,
          sellingPrice: nb.sellingPrice,
          classIndex: nb.classIndex,
          className: cls ? `${cls.schoolName} — ${cls.name}` : 'Unknown',
          status: Number(nb.status),
        };
      });
    } else {
      AppState.adminData.notebooks = [];
    }
    this.renderNotebooks();
  },

  renderNotebooks() {
    const panel = document.getElementById('admin-notebooks');
    AppState.adminFilters = AppState.adminFilters || {};
    
    let html = `
      <div class="admin-panel-header">
        <h3>Manage Notebooks</h3>
      </div>
      <div class="admin-filters" style="margin-bottom: 20px; background: #f7f7f7; padding: 16px; border-radius: var(--radius-cards);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label style="font-weight: 700; margin-bottom: 8px; display: block;">Select School</label>
            <select onchange="Admin.onAdminFilterChange('notebooksSchool', this.value)" style="width: 100%; padding: 8px; border-radius: var(--radius-inputs);">
              <option value="">-- Choose a School --</option>
              ${AppState.adminData.schools.filter(s => s.status !== 0).map(s => `<option value="${s.index}" ${AppState.adminFilters.notebooksSchool == s.index ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-weight: 700; margin-bottom: 8px; display: block;">Select Class</label>
            <select onchange="Admin.onAdminFilterChange('notebooksClass', this.value)" style="width: 100%; padding: 8px; border-radius: var(--radius-inputs);" ${!AppState.adminFilters.notebooksSchool ? 'disabled' : ''}>
              <option value="">-- Choose a Class --</option>
              ${AppState.adminData.classes.filter(c => c.status !== 0 && c.schoolIndex == AppState.adminFilters.notebooksSchool).map(c => `<option value="${c.index}" ${AppState.adminFilters.notebooksClass == c.index ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
        <button class="btn btn-primary btn-sm" onclick="Admin.showAddNotebookModal()">➕ Add Notebook</button>
      </div>
      <div class="admin-list">
    `;

    if (AppState.adminFilters.notebooksClass) {
      const filteredNotebooks = AppState.adminData.notebooks.filter(nb => Number(nb.classIndex) === Number(AppState.adminFilters.notebooksClass));

      if (filteredNotebooks.length === 0) {
        html += `
          <div class="empty-state" style="padding: 40px;">
            <div class="empty-state-icon">📓</div>
            <div class="empty-state-title">No Notebooks</div>
            <div class="empty-state-desc">Click "Add Notebook" to create one for this class.</div>
          </div>
        `;
      } else {
        filteredNotebooks.forEach((nb) => {
          const isDisabled = nb.status === 0;
          html += `
            <div class="admin-list-item ${isDisabled ? 'disabled' : ''}">
              <div class="admin-list-info">
                <span class="admin-list-name">[${escapeHtml(nb.identity || '')}] ${escapeHtml(nb.name)}</span>
                <span class="admin-list-meta">MRP: ${formatCurrency(nb.mrp)} | Sell: ${formatCurrency(nb.sellingPrice)} | Status: ${isDisabled ? 'Disabled' : 'Active'}</span>
              </div>
              <div class="admin-list-actions">
                <button class="btn btn-info btn-sm" onclick="Admin.showEditNotebookModal(${JSON.stringify(nb).replace(/"/g, '&quot;')})">✏️ Edit</button>
                <button class="btn ${isDisabled ? 'btn-success' : 'btn-warning'} btn-sm" onclick="Admin.toggleNotebook(${nb.index}, ${isDisabled ? 1 : 0})">
                  ${isDisabled ? '✅ Enable' : '⏸️ Disable'}
                </button>
                <button class="btn btn-danger btn-sm" onclick="Admin.toggleNotebook(${nb.index}, 2)">🗑️ Delete</button>
              </div>
            </div>
          `;
        });
      }
    }

    html += '</div>';
    panel.innerHTML = html;
  },

  showAddNotebookModal() {
    AppState.adminFilters = AppState.adminFilters || {};
    if (!AppState.adminFilters.notebooksClass) {
      showToast('Please select a class first', 'error');
      return;
    }
    const cls = AppState.adminData.classes.find(c => Number(c.index) === Number(AppState.adminFilters.notebooksClass));

    Modal.setupAdminModal(`Add Notebook (to ${cls.name})`, [
      { id: 'nb-identity', label: 'Identity Code', type: 'text', placeholder: 'e.g., NB1', value: '' },
      { id: 'nb-name', label: 'Notebook Name', type: 'text', placeholder: 'Enter notebook name', value: '' },
      { id: 'nb-mrp', label: 'MRP', type: 'number', placeholder: '0.00', value: '' },
      { id: 'nb-selling-price', label: 'Selling Price', type: 'number', placeholder: '0.00', value: '' },
    ], (data) => {
      this.saveNotebook({
        classIndex: AppState.adminFilters.notebooksClass,
        identity: data['nb-identity'],
        name: data['nb-name'],
        mrp: parseFloat(data['nb-mrp']) || 0,
        sellingPrice: parseFloat(data['nb-selling-price']) || 0,
        isNew: true,
      });
    });
  },

  showEditNotebookModal(nb) {
    Modal.setupAdminModal('Edit Notebook', [
      { id: 'nb-identity', label: 'Identity Code', type: 'text', placeholder: 'e.g., NB1', value: nb.identity || '' },
      { id: 'nb-name', label: 'Notebook Name', type: 'text', placeholder: 'Enter notebook name', value: nb.name || '' },
      { id: 'nb-mrp', label: 'MRP', type: 'number', placeholder: '0.00', value: nb.mrp || '' },
      { id: 'nb-selling-price', label: 'Selling Price', type: 'number', placeholder: '0.00', value: nb.sellingPrice || '' },
    ], (data) => {
      this.saveNotebook({
        classIndex: nb.classIndex,
        identity: data['nb-identity'],
        name: data['nb-name'],
        mrp: parseFloat(data['nb-mrp']) || 0,
        sellingPrice: parseFloat(data['nb-selling-price']) || 0,
        index: nb.index,
        isNew: false,
      });
    });
  },

  async saveNotebook(data) {
    const action = data.isNew ? 'addNotebook' : 'editNotebook';
    const body = {
      classIndex: parseInt(data.classIndex),
      notebookIdentity: data.identity,
      notebookName: data.name,
      mrp: data.mrp,
      sellingPrice: data.sellingPrice,
    };
    if (!data.isNew) body.notebookIndex = data.index;

    const result = await API.post(action, body);
    if (result && result.success) {
      showToast(`Notebook ${data.isNew ? 'added' : 'updated'} successfully`, 'success');
      Modal.hide('modal-admin');
      this.loadNotebooks();
    }
  },

  async toggleNotebook(nbIndex, newStatus) {
    if (newStatus === 2) {
      if (!confirm("Are you sure you want to delete this notebook? This action cannot be undone.")) {
        return;
      }
    }
    const result = await API.post('toggleNotebook', {
      notebookIndex: nbIndex,
      status: newStatus,
    });
    if (result && result.success) {
      let msg = '';
      if (newStatus === 0) msg = 'Notebook disabled';
      else if (newStatus === 1) msg = 'Notebook enabled';
      else if (newStatus === 2) msg = 'Notebook deleted';
      showToast(msg, 'success');
      this.loadNotebooks();
    }
  },
};

// ============================================
// MODAL HELPERS
// ============================================
const Modal = {
  show(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  },

  hide(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  hideAll() {
    document.querySelectorAll('.modal').forEach((m) => {
      m.classList.add('hidden');
    });
    document.body.style.overflow = '';
  },

  // Dynamic admin modal setup
  _currentOnSave: null,

  setupAdminModal(title, fields, onSave) {
    document.getElementById('admin-modal-title').textContent = title;
    const body = document.getElementById('admin-modal-body');

    let html = '';
    fields.forEach((field) => {
      html += `<div class="form-group"><label for="${field.id}">${field.label}</label>`;

      if (field.type === 'select') {
        html += `<select id="${field.id}">`;
        html += `<option value="">-- Select --</option>`;
        if (field.options) {
          field.options.forEach((opt) => {
            const selected = String(opt.value) === String(field.value) ? 'selected' : '';
            html += `<option value="${opt.value}" ${selected}>${escapeHtml(opt.label)}</option>`;
          });
        }
        html += '</select>';
      } else if (field.type === 'number') {
        html += `<input type="number" id="${field.id}" placeholder="${field.placeholder || ''}" value="${field.value}" step="0.01" min="0">`;
      } else {
        html += `<input type="text" id="${field.id}" placeholder="${field.placeholder || ''}" value="${escapeHtml(String(field.value || ''))}">`;
      }

      html += '</div>';
    });

    body.innerHTML = html;
    this._currentOnSave = onSave;
    this._currentFields = fields;
    this.show('modal-admin');
  },

  handleAdminSave() {
    if (!this._currentOnSave || !this._currentFields) return;

    const data = {};
    this._currentFields.forEach((field) => {
      const el = document.getElementById(field.id);
      if (el) {
        data[field.id] = el.value;
      }
    });

    // Basic validation
    let hasEmpty = false;
    this._currentFields.forEach((field) => {
      if (!data[field.id] && field.type !== 'number') {
        hasEmpty = true;
      }
    });

    if (hasEmpty) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    this._currentOnSave(data);
  },
};

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Toggle ---
  Theme.init();
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      Theme.toggle();
    });
  }

  // --- Navigation ---
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page) {
        Router.navigate(page);
      }
    });
  });

  document.querySelectorAll('.bnav-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const page = btn.dataset.page;
      if (page) {
        Router.navigate(page);
      }
    });
  });

  // --- Back Buttons ---
  document.getElementById('back-to-schools').addEventListener('click', () => {
    Home.backToSchools();
  });

  document.getElementById('back-to-classes').addEventListener('click', () => {
    Home.backToClasses();
  });

  // --- Student Tab Actions ---
  document.getElementById('btn-duplicate').addEventListener('click', () => {
    Invoice.duplicateStudent();
  });

  document.getElementById('btn-new-student').addEventListener('click', () => {
    Invoice.addNewStudent();
  });

  // --- Continue / Checkout ---
  document.getElementById('btn-continue').addEventListener('click', () => {
    Invoice.showCheckoutModal();
  });

  // --- Checkout Modal ---
  const mobileInput = document.getElementById('checkout-mobile');
  if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  document.getElementById('btn-cancel-checkout').addEventListener('click', () => {
    Modal.hide('modal-checkout');
  });

  document.getElementById('btn-complete-invoice').addEventListener('click', () => {
    Invoice.completeInvoice();
  });

  // --- New Student Modal ---
  document.getElementById('new-student-school').addEventListener('change', (e) => {
    Invoice.onNewStudentSchoolChange(e.target.value);
  });

  document.getElementById('btn-cancel-new-student').addEventListener('click', () => {
    Modal.hide('modal-new-student');
  });

  document.getElementById('btn-confirm-new-student').addEventListener('click', () => {
    Invoice.confirmNewStudent();
  });

  // --- Admin Login ---
  document.getElementById('btn-admin-login').addEventListener('click', () => {
    Admin.login();
  });

  // Allow Enter key on password field
  document.getElementById('admin-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      Admin.login();
    }
  });

  // --- Admin Logout ---
  document.getElementById('btn-admin-logout').addEventListener('click', () => {
    Admin.logout();
  });

  // --- Admin Tabs ---
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName) {
        Admin.switchTab(tabName);
      }
    });
  });

  // --- Admin Settings Form ---
  const formSettings = document.getElementById('form-admin-settings');
  if (formSettings) {
    formSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      Admin.updateSettings();
    });
  }

  // --- Admin Modal ---
  document.getElementById('btn-cancel-admin').addEventListener('click', () => {
    Modal.hide('modal-admin');
  });

  document.getElementById('btn-save-admin').addEventListener('click', () => {
    Modal.handleAdminSave();
  });

  // --- Entries Search ---
  document.getElementById('search-entries').addEventListener('input', (e) => {
    Entries.searchEntries(e.target.value);
  });

  const sortEntriesEl = document.getElementById('sort-entries');
  if (sortEntriesEl) {
    sortEntriesEl.addEventListener('change', () => {
      Entries.applyFiltersAndSearch();
    });
  }

  // --- Entries Filter Buttons ---
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      if (filter) {
        Entries.filterEntries(filter);
      }
    });
  });

  // --- Modal Close Buttons (X) ---
  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      if (modalId) {
        Modal.hide(modalId);
      }
    });
  });

  // --- Modal Overlay Click to Close ---
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      if (modal) {
        Modal.hide(modal.id);
      }
    });
  });

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      Modal.hideAll();
    }
  });

  // --- Initialize ---
  Router.navigate('home');
});
