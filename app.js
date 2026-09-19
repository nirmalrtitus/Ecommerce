/**
 * NATURES BOUNTY GOURMET DRY FRUITS - APPLICATION SCRIPT
 * Architecture: Pure ES6+ Modular Vanilla JS
 * Data Storage: Browser localStorage & sessionStorage
 * Authentication: Client-side Salted SHA-256 Web Crypto API
 */

(function () {
    'use strict';

    // ==========================================================================
    // 1. CONFIGURATION & CONSTANTS
    // ==========================================================================
    const AUTH_SALT = "NaturesBountySalt2026!@#";
    
    // Master admin credentials stored strictly in salted SHA-256 digest format
    // (No plain-text username or password exists in source code)
    const EXPECTED_USER_HASH = "3a0d16cfce2a736bb16f5161d24ae10e4922208ce4d53e64a5b13a239f7735f8";
    const EXPECTED_PASS_HASH = "5b118fd92d15cd9a80557710339437d2115a8281c09b2d3a5acc279b32f52076";

    // Storage Keys
    const STORAGE_KEYS = {
        PRODUCTS: 'df_products',
        CATEGORIES: 'df_categories',
        SETTINGS: 'df_settings',
        SLIDES: 'df_slides',
        CART: 'df_cart',
        INQUIRIES: 'df_inquiries',
        SESSION: 'df_admin_session'
    };

    // Global Application State
    const state = {
        products: [],
        categories: [],
        settings: {},
        slides: [],
        cart: [],
        inquiries: [],
        activeCategory: 'all',
        searchQuery: '',
        sortBy: 'popular',
        selectedWeights: {}, // Map of productId -> selectedGrams (e.g., 250)
        currentSlideIndex: 0,
        slideTimer: null,
        isAdminLoggedIn: false
    };

    // ==========================================================================
    // 2. CRYPTOGRAPHIC AUTHENTICATION HELPER (SHA-256 + SALT)
    // ==========================================================================
    /**
     * Hashes input text combined with salt using browser Web Crypto API
     * @param {string} text - The input string to hash (username or password)
     * @param {string} salt - Secret salt string
     * @returns {Promise<string>} Hexadecimal SHA-256 digest string
     */
    async function hashWithSalt(text, salt = AUTH_SALT) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==========================================================================
    // 3. INITIAL SEED DATA & LOCALSTORAGE SYNC
    // ==========================================================================
    const DEFAULT_CATEGORIES = [
        { id: 'cat-1', name: 'Nuts & Almonds', icon: 'fa-seedling' },
        { id: 'cat-2', name: 'Berries & Raisins', icon: 'fa-apple-whole' },
        { id: 'cat-3', name: 'Exotic Dry Fruits', icon: 'fa-sun' },
        { id: 'cat-4', name: 'Gift Packs', icon: 'fa-gift' }
    ];

    const DEFAULT_PRODUCTS = [
        {
            id: 'prod-1',
            title: 'Premium California Almonds',
            categoryId: 'cat-1',
            categoryName: 'Nuts & Almonds',
            basePrice: 180, // Price in INR
            baseWeight: 250, // in grams
            stockStatus: 'in_stock',
            image: 'images/products/almonds.jpg',
            description: 'Hand-picked supreme quality California almonds. Exceptionally crisp, rich in Vitamin E, protein, and essential healthy fats.',
            specs: { calories: '579 kcal', protein: '21.2g', carbs: '21.7g', fat: '49.9g', fiber: '12.5g' },
            popular: true
        },
        {
            id: 'prod-2',
            title: 'Jumbo Afghan Anjeer (Dried Figs)',
            categoryId: 'cat-3',
            categoryName: 'Exotic Dry Fruits',
            basePrice: 340,
            baseWeight: 250,
            stockStatus: 'in_stock',
            image: 'images/products/anjeer.jpg',
            description: 'Naturally sun-dried Afghan figs with chewy sweetness and rich crunchy seed texture. Packed with calcium and dietary fiber.',
            specs: { calories: '249 kcal', protein: '3.3g', carbs: '63.9g', fat: '0.9g', fiber: '9.8g' },
            popular: true
        },
        {
            id: 'prod-3',
            title: 'Organic Wild Cranberries',
            categoryId: 'cat-2',
            categoryName: 'Berries & Raisins',
            basePrice: 220,
            baseWeight: 250,
            stockStatus: 'in_stock',
            image: 'images/products/cranberries.jpg',
            description: 'Plump, tart, and juicy sweetened wild cranberries. High in proanthocyanidins and Vitamin C for immunity boost.',
            specs: { calories: '308 kcal', protein: '0.5g', carbs: '82.8g', fat: '1.4g', fiber: '5.7g' },
            popular: false
        },
        {
            id: 'prod-4',
            title: 'Royal Cashmiri Walnut Kernels',
            categoryId: 'cat-1',
            categoryName: 'Nuts & Almonds',
            basePrice: 290,
            baseWeight: 250,
            stockStatus: 'in_stock',
            image: 'images/products/walnuts.jpg',
            description: 'Fresh mountain-harvested light walnut halves. Loaded with Plant Omega-3 (ALA) for brain health and heart wellness.',
            specs: { calories: '654 kcal', protein: '15.2g', carbs: '13.7g', fat: '65.2g', fiber: '6.7g' },
            popular: true
        },
        {
            id: 'prod-5',
            title: 'Arabian Medjool Dates',
            categoryId: 'cat-3',
            categoryName: 'Exotic Dry Fruits',
            basePrice: 380,
            baseWeight: 500,
            stockStatus: 'in_stock',
            image: 'images/products/dates.jpg',
            description: 'King of dates! Soft, luscious, caramel-flavored Medjool dates imported directly from desert oases. Pure natural sweetener.',
            specs: { calories: '277 kcal', protein: '1.8g', carbs: '75.0g', fat: '0.2g', fiber: '6.7g' },
            popular: true
        },
        {
            id: 'prod-6',
            title: 'Imperial Festive Hamper Box',
            categoryId: 'cat-4',
            categoryName: 'Gift Packs',
            basePrice: 1450,
            baseWeight: 1000,
            stockStatus: 'in_stock',
            image: 'images/products/hamper.jpg',
            description: 'Luxury handcrafted gift box featuring Almonds, Cashews, Roasted Pistachios, and Golden Raisins in partitioned wood trays.',
            specs: { calories: '590 kcal', protein: '18.5g', carbs: '32.0g', fat: '46.0g', fiber: '8.2g' },
            popular: true
        }
    ];

    const DEFAULT_SETTINGS = {
        storeName: "Natures Bounty Gourmet",
        whatsappNumber: "919876543210",
        notificationEmail: "orders@dryfruits.example",
        currencySymbol: "₹",
        address: "Suite 104, Gourmet Plaza, Market Road, Mumbai 400001",
        announcementText: "✨ Free Express Delivery on orders over ₹1,500! Fresh harvest dry fruits delivered directly to your doorstep. ✨",
        trustBadges: [
            { icon: "fa-leaf", title: "100% Organic & Fresh", desc: "Directly sourced from trusted orchards" },
            { icon: "fa-shield-halved", title: "Vacuum Sealed Packaging", desc: "Preserves crisp taste and nutrients" },
            { icon: "fa-truck-fast", title: "Fast Doorstep Delivery", desc: "Hassle-free shipping & tracking" },
            { icon: "fa-headset", title: "WhatsApp Support", desc: "Instant orders & inquiry assistance" }
        ]
    };

    const DEFAULT_SLIDES = [
        {
            id: 'slide-1',
            image: 'images/banners/banner1.jpg',
            badge: 'FRESH HARVEST 2026',
            title: 'Premium Gourmet Dry Fruits & Nuts',
            subtitle: 'Handpicked from natural orchards around the world. 100% Organic, Raw & Pure.',
            ctaText: 'Explore Selection',
            ctaLink: '#catalog-section'
        },
        {
            id: 'slide-2',
            image: 'images/banners/banner2.jpg',
            badge: 'HEALTH & WELLNESS',
            title: 'Fuel Your Active Life With Vital Nutrients',
            subtitle: 'Rich in Omega-3, essential minerals, and pure natural energy for daily vitality.',
            ctaText: 'Shop Almonds & Nuts',
            ctaLink: '#catalog-section'
        },
        {
            id: 'slide-3',
            image: 'images/banners/banner3.jpg',
            badge: 'FESTIVE GIFT COLLECTIONS',
            title: 'Exquisite Artisanal Gift Packs',
            subtitle: 'Share warmth and good health with luxury dry fruit hampers crafted for loved ones.',
            ctaText: 'View Gift Hampers',
            ctaLink: '#catalog-section'
        }
    ];

    /**
     * Migrates legacy external image URLs in localStorage to local folder images
     */
    function migrateImageUrls() {
        const prodMap = {
            'prod-1': 'images/products/almonds.jpg',
            'prod-2': 'images/products/anjeer.jpg',
            'prod-3': 'images/products/cranberries.jpg',
            'prod-4': 'images/products/walnuts.jpg',
            'prod-5': 'images/products/dates.jpg',
            'prod-6': 'images/products/hamper.jpg'
        };

        const slideMap = {
            'slide-1': 'images/banners/banner1.jpg',
            'slide-2': 'images/banners/banner2.jpg',
            'slide-3': 'images/banners/banner3.jpg'
        };

        let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
        let slides = JSON.parse(localStorage.getItem(STORAGE_KEYS.SLIDES) || '[]');
        let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');
        let updated = false;

        products.forEach(p => {
            if (prodMap[p.id] && (p.image.includes('unsplash.com') || !p.image.startsWith('images/'))) {
                p.image = prodMap[p.id];
                updated = true;
            }
        });

        slides.forEach(s => {
            if (slideMap[s.id] && (s.image.includes('unsplash.com') || !s.image.startsWith('images/'))) {
                s.image = slideMap[s.id];
                updated = true;
            }
        });

        cart.forEach(item => {
            if (prodMap[item.id] && (item.image.includes('unsplash.com') || !item.image.startsWith('images/'))) {
                item.image = prodMap[item.id];
                updated = true;
            }
        });

        if (updated) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
            localStorage.setItem(STORAGE_KEYS.SLIDES, JSON.stringify(slides));
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
        }
    }

    /**
     * Initializes state from localStorage or seeds defaults
     */
    function initDatabase() {
        if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
        }
        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.SLIDES)) {
            localStorage.setItem(STORAGE_KEYS.SLIDES, JSON.stringify(DEFAULT_SLIDES));
        }
        if (!localStorage.getItem(STORAGE_KEYS.CART)) {
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_KEYS.INQUIRIES)) {
            localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify([]));
        }

        // Run URL migration for existing localStorage sessions
        migrateImageUrls();

        // Load into application memory state
        state.products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS));
        state.categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES));
        state.settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS));
        state.slides = JSON.parse(localStorage.getItem(STORAGE_KEYS.SLIDES));
        state.cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART));
        state.inquiries = JSON.parse(localStorage.getItem(STORAGE_KEYS.INQUIRIES));

        // Default selected weight for each product to its baseWeight
        state.products.forEach(p => {
            state.selectedWeights[p.id] = p.baseWeight || 250;
        });

        // Check active admin session
        state.isAdminLoggedIn = sessionStorage.getItem(STORAGE_KEYS.SESSION) === 'true';
    }

    function saveState(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }


    // ==========================================================================
    // 4. UI RENDERERS
    // ==========================================================================

    /**
     * Render Announcement Bar & Dynamic Store Info
     */
    function renderSiteIdentity() {
        const settings = state.settings;
        
        // Announcement
        const annText = document.getElementById('announcement-text');
        if (annText) annText.innerHTML = `<i class="fa-solid fa-sparkles"></i> ${settings.announcementText}`;

        // Header Logos & Brand Title
        const navTitle = document.getElementById('nav-brand-title');
        const footerTitle = document.getElementById('footer-brand-title');
        const footerCopyBrand = document.getElementById('footer-copy-brand');
        if (navTitle) navTitle.textContent = settings.storeName;
        if (footerTitle) footerTitle.textContent = settings.storeName;
        if (footerCopyBrand) footerCopyBrand.textContent = settings.storeName;

        // Custom Logo Image Updates across header & footer
        if (settings.logoImage) {
            document.querySelectorAll('.logo-img-thumb').forEach(img => {
                img.src = settings.logoImage;
                img.style.display = 'inline-block';
                if (img.nextElementSibling) img.nextElementSibling.style.display = 'none';
            });
        }

        // WhatsApp Link (India +91)
        const waDigits = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');
        const fullWa = waDigits.startsWith('91') ? waDigits : `91${waDigits}`;
        const waQuickLink = document.getElementById('whatsapp-quick-link');
        const footerWaLink = document.getElementById('footer-whatsapp-link');
        const waUrl = `https://wa.me/${fullWa}`;
        if (waQuickLink) waQuickLink.href = waUrl;
        if (footerWaLink) footerWaLink.href = waUrl;

        // Footer Contact
        const fAddress = document.getElementById('footer-address');
        const fPhone = document.getElementById('footer-phone');
        const fEmail = document.getElementById('footer-email');
        if (fAddress) fAddress.textContent = settings.address;
        if (fPhone) fPhone.textContent = `+91 ${waDigits.slice(-10)}`;
        if (fEmail) fEmail.textContent = settings.notificationEmail;

        // Dynamic Trust Badges Bar
        const trustGrid = document.getElementById('homepage-trust-grid');
        if (trustGrid) {
            const badges = (settings.trustBadges && settings.trustBadges.length === 4) ? settings.trustBadges : DEFAULT_SETTINGS.trustBadges;
            trustGrid.innerHTML = badges.map(b => `
                <div class="trust-item">
                    <div class="trust-icon"><i class="fa-solid ${b.icon}"></i></div>
                    <div class="trust-info">
                        <h4>${b.title}</h4>
                        <p>${b.desc}</p>
                    </div>
                </div>
            `).join('');
        }
    }

    /**
     * Render Hero Slider
     */
    function renderHeroSlider() {
        const container = document.getElementById('hero-slider-container');
        const dotsContainer = document.getElementById('slider-dots-container');
        if (!container || !dotsContainer) return;

        if (state.slides.length === 0) {
            container.innerHTML = `<div class="hero-slide active"><div class="slide-content-overlay"><div class="container"><h1 class="slide-title">Welcome to Our Gourmet Store</h1></div></div></div>`;
            return;
        }

        container.innerHTML = state.slides.map((slide, index) => `
            <div class="hero-slide ${index === state.currentSlideIndex ? 'active' : ''}">
                <img src="${slide.image}" alt="${slide.title}" class="slide-bg" onerror="this.src='images/banners/default_banner.jpg'">
                <div class="slide-content-overlay">
                    <div class="container">
                        <div class="slide-text-box">
                            ${slide.badge ? `<span class="slide-badge"><i class="fa-solid fa-sparkles"></i> ${slide.badge}</span>` : ''}
                            <h1 class="slide-title">${slide.title}</h1>
                            <p class="slide-subtitle">${slide.subtitle || ''}</p>
                            ${slide.ctaText ? `<a href="${slide.ctaLink || '#catalog-section'}" class="btn btn-amber btn-lg"><i class="fa-solid fa-bag-shopping"></i> ${slide.ctaText}</a>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        dotsContainer.innerHTML = state.slides.map((_, index) => `
            <span class="dot ${index === state.currentSlideIndex ? 'active' : ''}" data-index="${index}"></span>
        `).join('');
    }

    function startSliderAutoPlay() {
        stopSliderAutoPlay();
        state.slideTimer = setInterval(() => {
            if (state.slides.length > 0) {
                state.currentSlideIndex = (state.currentSlideIndex + 1) % state.slides.length;
                renderHeroSlider();
            }
        }, 5000);
    }

    function stopSliderAutoPlay() {
        if (state.slideTimer) clearInterval(state.slideTimer);
    }

    /**
     * Render Category Pills
     */
    function renderCategoryPills() {
        const container = document.getElementById('category-pills-container');
        const footerList = document.getElementById('footer-categories-list');
        if (!container) return;

        let pillsHtml = `
            <button class="category-pill ${state.activeCategory === 'all' ? 'active' : ''}" data-cat-id="all">
                <i class="fa-solid fa-border-all"></i> All Products
            </button>
        `;

        state.categories.forEach(cat => {
            pillsHtml += `
                <button class="category-pill ${state.activeCategory === cat.id ? 'active' : ''}" data-cat-id="${cat.id}">
                    <i class="fa-solid ${cat.icon || 'fa-tag'}"></i> ${cat.name}
                </button>
            `;
        });

        container.innerHTML = pillsHtml;

        if (footerList) {
            footerList.innerHTML = state.categories.map(cat => `
                <li><a href="#catalog-section" class="footer-cat-link" data-cat-id="${cat.id}"><i class="fa-solid fa-chevron-right"></i> ${cat.name}</a></li>
            `).join('');
        }
    }

    /**
     * Calculate dynamic product unit price based on weight
     * @param {Object} product - Product object
     * @param {number} weightGrams - Selected weight in grams
     * @returns {number} Calculated price
     */
    function calculateUnitPrice(product, weightGrams) {
        const basePrice = Number(product.basePrice);
        const baseWeight = Number(product.baseWeight) || 250;
        const ratio = weightGrams / baseWeight;
        return Math.round(basePrice * ratio);
    }

    /**
     * Render Product Catalog Cards Grid
     */
    function renderProductGrid() {
        const grid = document.getElementById('product-grid');
        const emptyState = document.getElementById('empty-catalog-state');
        if (!grid) return;

        // Filter Products
        let filtered = state.products.filter(prod => {
            const matchesCat = state.activeCategory === 'all' || prod.categoryId === state.activeCategory;
            const query = state.searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                prod.title.toLowerCase().includes(query) || 
                prod.categoryName.toLowerCase().includes(query) || 
                prod.description.toLowerCase().includes(query);
            return matchesCat && matchesSearch;
        });

        // Sort Products
        if (state.sortBy === 'price-low') {
            filtered.sort((a, b) => calculateUnitPrice(a, state.selectedWeights[a.id] || a.baseWeight) - calculateUnitPrice(b, state.selectedWeights[b.id] || b.baseWeight));
        } else if (state.sortBy === 'price-high') {
            filtered.sort((a, b) => calculateUnitPrice(b, state.selectedWeights[b.id] || b.baseWeight) - calculateUnitPrice(a, state.selectedWeights[a.id] || a.baseWeight));
        } else if (state.sortBy === 'name-asc') {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (state.sortBy === 'popular') {
            filtered.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
        }

        if (filtered.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        grid.innerHTML = filtered.map(prod => {
            const selectedWeightGrams = state.selectedWeights[prod.id] || prod.baseWeight || 250;
            const currentPrice = calculateUnitPrice(prod, selectedWeightGrams);
            const isOutOfStock = prod.stockStatus === 'out_of_stock';
            const curr = state.settings.currencySymbol || '₹';

            // Available weight presets (e.g. 100g, 250g, 500g, 1000g)
            const weights = [100, 250, 500, 1000];

            return `
                <div class="product-card" data-product-id="${prod.id}">
                    <div class="card-image-wrap">
                        <img src="${prod.image}" alt="${prod.title}" class="card-image" onerror="this.src='images/products/default_product.jpg'">
                        <span class="badge-stock ${isOutOfStock ? 'badge-out-stock' : 'badge-in-stock'}">
                            ${isOutOfStock ? 'Out of Stock' : 'In Stock'}
                        </span>
                        <button class="btn-quick-view" data-quick-view-id="${prod.id}" title="Quick View Specs">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>

                    <div class="card-body">
                        <span class="card-category">${prod.categoryName || 'Dry Fruits'}</span>
                        <h3 class="card-title">${prod.title}</h3>
                        <p class="card-desc">${prod.description}</p>

                        <!-- Dynamic Weight Selector -->
                        <div class="weight-selector-wrap">
                            <span class="selector-label"><i class="fa-solid fa-weight-scale"></i> Select Pack Weight:</span>
                            <div class="weight-options">
                                ${weights.map(w => {
                                    const label = w >= 1000 ? `${w/1000}kg` : `${w}g`;
                                    return `
                                        <button class="weight-btn ${selectedWeightGrams === w ? 'active' : ''}" 
                                                data-prod-id="${prod.id}" 
                                                data-weight-grams="${w}">
                                            ${label}
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Price & Action -->
                        <div class="card-price-row">
                            <div class="price-subtotal">
                                <span class="amount">${curr}${currentPrice}</span>
                                <span class="unit-text">for ${selectedWeightGrams >= 1000 ? `${selectedWeightGrams/1000}kg` : `${selectedWeightGrams}g`}</span>
                            </div>
                        </div>

                        <div class="card-actions">
                            <button class="btn btn-primary btn-block add-to-cart-btn" 
                                    data-prod-id="${prod.id}" 
                                    ${isOutOfStock ? 'disabled' : ''}>
                                <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render Quick View Modal
     */
    function openQuickViewModal(productId) {
        const prod = state.products.find(p => p.id === productId);
        if (!prod) return;

        const modal = document.getElementById('quick-view-modal');
        const content = document.getElementById('quick-view-content');
        if (!modal || !content) return;

        const selectedWeightGrams = state.selectedWeights[prod.id] || prod.baseWeight || 250;
        const currentPrice = calculateUnitPrice(prod, selectedWeightGrams);
        const curr = state.settings.currencySymbol || '₹';
        const isOutOfStock = prod.stockStatus === 'out_of_stock';
        const specs = prod.specs || {};

        content.innerHTML = `
            <div class="quick-view-media">
                <img src="${prod.image}" alt="${prod.title}" onerror="this.src='images/products/default_product.jpg'">
            </div>
            <div class="quick-view-info">
                <span class="card-category">${prod.categoryName}</span>
                <h2 class="card-title" style="font-size: 1.6rem; margin-bottom: 0.5rem;">${prod.title}</h2>
                <p class="card-desc" style="font-size: 0.9rem; margin-bottom: 1rem;">${prod.description}</p>

                <div style="font-size: 1.5rem; font-weight: 800; color: var(--color-emerald-deep); margin-bottom: 1rem;">
                    ${curr}${currentPrice} <span style="font-size: 0.85rem; color: var(--color-text-muted); font-weight: 500;">(${selectedWeightGrams >= 1000 ? `${selectedWeightGrams/1000}kg` : `${selectedWeightGrams}g`})</span>
                </div>

                <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--color-walnut-dark);"><i class="fa-solid fa-chart-pie"></i> Nutritional Information (Per 100g):</h4>
                <div class="specs-grid">
                    <div class="spec-box"><span>Calories</span><strong>${specs.calories || 'N/A'}</strong></div>
                    <div class="spec-box"><span>Protein</span><strong>${specs.protein || 'N/A'}</strong></div>
                    <div class="spec-box"><span>Carbs</span><strong>${specs.carbs || 'N/A'}</strong></div>
                    <div class="spec-box"><span>Healthy Fat</span><strong>${specs.fat || 'N/A'}</strong></div>
                    <div class="spec-box"><span>Dietary Fiber</span><strong>${specs.fiber || 'N/A'}</strong></div>
                    <div class="spec-box"><span>Purity</span><strong>100% Organic</strong></div>
                </div>

                <div style="margin-top: auto; padding-top: 1rem;">
                    <button class="btn btn-primary btn-block btn-lg add-to-cart-btn" data-prod-id="${prod.id}" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'Out of Stock' : 'Add to Shopping Bag'}
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    /**
     * Render Shopping Cart Drawer & Badge Counter
     */
    function renderCart() {
        const badge = document.getElementById('cart-badge-count');
        const mobileBadge = document.getElementById('mobile-cart-count');
        const drawerCount = document.getElementById('drawer-item-count');
        const drawerBody = document.getElementById('cart-drawer-body');
        const subtotalVal = document.getElementById('cart-subtotal-val');
        const grandTotalVal = document.getElementById('cart-grand-total-val');
        const checkoutBtn = document.getElementById('proceed-checkout-btn');

        const totalItemsCount = state.cart.reduce((sum, item) => sum + item.qty, 0);
        const grandTotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
        const curr = state.settings.currencySymbol || '₹';

        if (badge) badge.textContent = totalItemsCount;
        if (mobileBadge) mobileBadge.textContent = totalItemsCount;
        if (drawerCount) drawerCount.textContent = `${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'}`;
        if (subtotalVal) subtotalVal.textContent = `${curr}${grandTotal}`;
        if (grandTotalVal) grandTotalVal.textContent = `${curr}${grandTotal}`;
        if (checkoutBtn) checkoutBtn.disabled = state.cart.length === 0;

        if (!drawerBody) return;

        if (state.cart.length === 0) {
            drawerBody.innerHTML = `
                <div class="empty-state" style="padding: 2.5rem 1rem; border: none;">
                    <div class="empty-icon" style="font-size: 2.5rem;"><i class="fa-solid fa-bag-shopping"></i></div>
                    <h3>Your bag is empty</h3>
                    <p style="font-size: 0.85rem;">Discover our organic almonds, dates, and festive hampers to start shopping.</p>
                </div>
            `;
            return;
        }

        drawerBody.innerHTML = state.cart.map(item => `
            <div class="cart-item" data-cart-item-id="${item.cartItemId}">
                <img src="${item.image}" alt="${item.title}" class="cart-item-thumb" onerror="this.src='images/products/default_product.jpg'">
                <div class="cart-item-details">
                    <div class="cart-item-header">
                        <h4 class="cart-item-title">${item.title}</h4>
                        <button class="cart-item-remove" data-remove-id="${item.cartItemId}" title="Remove Item">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                    <div class="cart-item-meta">Pack: ${item.weightLabel} | ${curr}${item.unitPrice} each</div>
                    <div class="cart-item-footer">
                        <div class="qty-stepper">
                            <button class="stepper-btn qty-minus" data-cart-id="${item.cartItemId}"><i class="fa-solid fa-minus"></i></button>
                            <span class="stepper-val">${item.qty}</span>
                            <button class="stepper-btn qty-plus" data-cart-id="${item.cartItemId}"><i class="fa-solid fa-plus"></i></button>
                        </div>
                        <span class="cart-item-subtotal">${curr}${item.unitPrice * item.qty}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Add product to cart with chosen weight
     */
    function addToCart(productId) {
        const prod = state.products.find(p => p.id === productId);
        if (!prod || prod.stockStatus === 'out_of_stock') return;

        const weightGrams = state.selectedWeights[productId] || prod.baseWeight || 250;
        const weightLabel = weightGrams >= 1000 ? `${weightGrams / 1000}kg` : `${weightGrams}g`;
        const unitPrice = calculateUnitPrice(prod, weightGrams);
        const cartItemId = `${productId}_${weightGrams}`;

        const existing = state.cart.find(item => item.cartItemId === cartItemId);
        if (existing) {
            existing.qty += 1;
        } else {
            state.cart.push({
                cartItemId,
                productId: prod.id,
                title: prod.title,
                image: prod.image,
                weightGrams,
                weightLabel,
                unitPrice,
                qty: 1
            });
        }

        saveState(STORAGE_KEYS.CART, state.cart);
        renderCart();
        showToast(`Added ${prod.title} (${weightLabel}) to bag!`, 'success');
    }

    function updateCartQty(cartItemId, delta) {
        const item = state.cart.find(i => i.cartItemId === cartItemId);
        if (!item) return;

        item.qty += delta;
        if (item.qty <= 0) {
            state.cart = state.cart.filter(i => i.cartItemId !== cartItemId);
        }
        saveState(STORAGE_KEYS.CART, state.cart);
        renderCart();
    }

    function removeFromCart(cartItemId) {
        state.cart = state.cart.filter(i => i.cartItemId !== cartItemId);
        saveState(STORAGE_KEYS.CART, state.cart);
        renderCart();
        showToast('Item removed from bag', 'info');
    }

    function clearCart() {
        state.cart = [];
        saveState(STORAGE_KEYS.CART, state.cart);
        renderCart();
        showToast('Shopping bag cleared', 'info');
    }

    /**
     * Open Checkout Modal
     */
    function openCheckoutModal() {
        if (state.cart.length === 0) {
            showToast('Your shopping bag is empty!', 'error');
            return;
        }

        const modal = document.getElementById('checkout-modal');
        const itemsList = document.getElementById('checkout-items-list');
        const totalVal = document.getElementById('checkout-total-val');
        const curr = state.settings.currencySymbol || '₹';

        const grandTotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);

        if (itemsList) {
            itemsList.innerHTML = state.cart.map(item => `
                <div class="checkout-item-row">
                    <span>${item.title} (${item.weightLabel}) x ${item.qty}</span>
                    <strong>${curr}${item.unitPrice * item.qty}</strong>
                </div>
            `).join('');
        }

        if (totalVal) totalVal.textContent = `${curr}${grandTotal}`;

        // Close cart drawer
        document.body.classList.remove('drawer-open');
        const backdrop = document.getElementById('cart-drawer-backdrop');
        if (backdrop) backdrop.classList.add('hidden');

        if (modal) modal.classList.remove('hidden');
    }

    /**
     * Submit Inquiry via WhatsApp or Email
     * @param {'whatsapp' | 'email'} channel 
     */
    function submitOrderInquiry(channel) {
        const form = document.getElementById('checkout-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const name = document.getElementById('cust-name').value.trim();
        const phone = document.getElementById('cust-phone').value.trim();
        const email = document.getElementById('cust-email').value.trim();
        const address = document.getElementById('cust-address').value.trim();
        const notes = document.getElementById('cust-notes').value.trim();

        const curr = state.settings.currencySymbol || '₹';
        const grandTotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);

        // Build structured message text
        let itemsFormatted = state.cart.map(i => `- ${i.title} (${i.weightLabel}) x ${i.qty} = ${curr}${i.unitPrice * i.qty}`).join('\n');
        
        let messageText = `Hello ${state.settings.storeName},\nI would like to place an order inquiry:\n\n${itemsFormatted}\n\n*Total Order Value:* ${curr}${grandTotal}\n\n*Customer Info:*\n- Name: ${name}\n- Phone: ${phone}\n- Email: ${email}\n- Delivery Address: ${address}\n${notes ? `- Notes: ${notes}` : ''}`;

        // Save record into localStorage inquiries log
        const newInquiry = {
            id: 'INQ-' + Date.now().toString().slice(-6),
            timestamp: new Date().toLocaleString(),
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            address: address,
            notes: notes,
            items: state.cart.map(i => ({ title: i.title, weight: i.weightLabel, qty: i.qty, subtotal: i.unitPrice * i.qty })),
            grandTotal: grandTotal,
            channel: channel === 'whatsapp' ? 'WhatsApp' : 'Email',
            status: 'Pending'
        };

        state.inquiries.unshift(newInquiry);
        saveState(STORAGE_KEYS.INQUIRIES, state.inquiries);
        updateAdminInquiriesBadge();

        if (channel === 'whatsapp') {
            const cleanStorePhone = state.settings.whatsappNumber.replace(/[^0-9]/g, '');
            const waUrl = `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(messageText)}`;
            window.open(waUrl, '_blank');
        } else {
            const recipient = state.settings.notificationEmail;
            const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent('Order Inquiry from ' + name)}&body=${encodeURIComponent(messageText)}`;
            window.location.href = mailtoUrl;
        }

        // Clear cart & reset checkout
        clearCart();
        document.getElementById('checkout-modal').classList.add('hidden');
        showToast('Inquiry submitted successfully! We will contact you shortly.', 'success');
    }


    // ==========================================================================
    // 5. ADMIN MANAGEMENT DASHBOARD
    // ==========================================================================

    function openAdminModal() {
        const modal = document.getElementById('admin-modal');
        const authView = document.getElementById('admin-auth-view');
        const dashView = document.getElementById('admin-dashboard-view');

        if (!modal) return;

        if (state.isAdminLoggedIn) {
            authView.classList.add('hidden');
            dashView.classList.remove('hidden');
            renderAdminDashboard();
        } else {
            authView.classList.remove('hidden');
            dashView.classList.add('hidden');
        }

        modal.classList.remove('hidden');
    }

    async function handleAdminLogin(e) {
        e.preventDefault();
        const userVal = document.getElementById('admin-user').value.trim();
        const passVal = document.getElementById('admin-pass').value.trim();
        const errorBox = document.getElementById('auth-error-msg');

        const inputUserHash = await hashWithSalt(userVal);
        const inputPassHash = await hashWithSalt(passVal);

        if (inputUserHash === EXPECTED_USER_HASH && inputPassHash === EXPECTED_PASS_HASH) {
            state.isAdminLoggedIn = true;
            sessionStorage.setItem(STORAGE_KEYS.SESSION, 'true');
            
            if (errorBox) errorBox.classList.add('hidden');
            
            document.getElementById('admin-auth-view').classList.add('hidden');
            document.getElementById('admin-dashboard-view').classList.remove('hidden');
            renderAdminDashboard();
            showToast('Authenticated as Master Admin!', 'success');
        } else {
            if (errorBox) errorBox.classList.remove('hidden');
            showToast('Invalid admin credentials', 'error');
        }
    }

    function handleAdminLogout() {
        state.isAdminLoggedIn = false;
        sessionStorage.removeItem(STORAGE_KEYS.SESSION);
        document.getElementById('admin-auth-view').classList.remove('hidden');
        document.getElementById('admin-dashboard-view').classList.add('hidden');
        showToast('Logged out of admin session', 'info');
    }

    function renderAdminDashboard() {
        updateAdminInquiriesBadge();
        renderAdminProductsTable();
        renderAdminCategoriesTable();
        renderAdminSlidesGrid();
        populateAdminSettingsForm();
        renderAdminInquiriesTable();
        renderAdminGalleryGrid();
    }

    function updateAdminInquiriesBadge() {
        const badge = document.getElementById('admin-inquiries-badge');
        if (badge) {
            const pendingCount = state.inquiries.filter(i => i.status === 'Pending').length;
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
    }

    /* Tab 1: Products Management */
    function renderAdminProductsTable() {
        const tbody = document.getElementById('admin-products-table-body');
        const searchInput = document.getElementById('admin-prod-search');
        if (!tbody) return;

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = state.products.filter(p => !query || p.title.toLowerCase().includes(query) || p.categoryName.toLowerCase().includes(query));

        tbody.innerHTML = filtered.map(p => `
            <tr>
                <td><img src="${p.image}" class="table-thumb" alt="${p.title}" onerror="this.src='images/products/default_product.jpg'"></td>
                <td><strong>${p.title}</strong></td>
                <td><span class="badge-status status-contacted">${p.categoryName}</span></td>
                <td>₹${p.basePrice} / ${p.baseWeight}g</td>
                <td>
                    <button class="btn btn-sm ${p.stockStatus === 'in_stock' ? 'btn-success' : 'btn-outline-danger'} toggle-stock-btn" data-id="${p.id}">
                        ${p.stockStatus === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                    </button>
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="btn btn-sm btn-ghost edit-prod-btn" data-id="${p.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-sm btn-ghost-danger delete-prod-btn" data-id="${p.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function openProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-crud-form');
        const titleEl = document.getElementById('prod-modal-title');
        const catSelect = document.getElementById('prod-category');
        const prodImgPreview = document.getElementById('prod-img-preview');
        const prodImageNameInput = document.getElementById('prod-image-name');

        // Populate Categories dropdown
        catSelect.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        if (productId) {
            const prod = state.products.find(p => p.id === productId);
            if (!prod) return;
            titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Product`;
            document.getElementById('prod-edit-id').value = prod.id;
            document.getElementById('prod-title').value = prod.title;
            document.getElementById('prod-category').value = prod.categoryId;
            document.getElementById('prod-base-price').value = prod.basePrice;
            document.getElementById('prod-base-weight').value = prod.baseWeight || 250;
            document.getElementById('prod-stock').value = prod.stockStatus;
            document.getElementById('prod-image').value = prod.image;
            document.getElementById('prod-desc').value = prod.description;
            
            if (prodImageNameInput) {
                const imgStr = prod.image || '';
                prodImageNameInput.value = imgStr.startsWith('data:') ? (prod.imageName || 'uploaded_image.jpg') : imgStr.split('/').pop();
            }
            if (prodImgPreview) prodImgPreview.src = prod.image;

            const specs = prod.specs || {};
            document.getElementById('spec-calories').value = specs.calories || '';
            document.getElementById('spec-protein').value = specs.protein || '';
            document.getElementById('spec-carbs').value = specs.carbs || '';
            document.getElementById('spec-fat').value = specs.fat || '';
            document.getElementById('spec-fiber').value = specs.fiber || '';
        } else {
            titleEl.innerHTML = `<i class="fa-solid fa-box-open"></i> Add New Product`;
            form.reset();
            document.getElementById('prod-edit-id').value = '';
            if (prodImageNameInput) prodImageNameInput.value = '';
            if (prodImgPreview) prodImgPreview.src = 'images/products/default_product.jpg';
        }

        modal.classList.remove('hidden');
    }

    function handleSaveProduct(e) {
        e.preventDefault();
        const editId = document.getElementById('prod-edit-id').value;
        const title = document.getElementById('prod-title').value.trim();
        const categoryId = document.getElementById('prod-category').value;
        const categoryObj = state.categories.find(c => c.id === categoryId);
        const categoryName = categoryObj ? categoryObj.name : 'Dry Fruits';
        const basePrice = Number(document.getElementById('prod-base-price').value);
        const baseWeight = Number(document.getElementById('prod-base-weight').value);
        const stockStatus = document.getElementById('prod-stock').value;
        
        let image = document.getElementById('prod-image').value.trim();
        const imageName = document.getElementById('prod-image-name') ? document.getElementById('prod-image-name').value.trim() : '';

        // If admin specified a custom alias filename and image is a relative path
        if (imageName && !image.startsWith('data:image/')) {
            image = imageName.includes('/') ? imageName : `images/products/${imageName}`;
        }

        const description = document.getElementById('prod-desc').value.trim();

        const specs = {
            calories: document.getElementById('spec-calories').value.trim(),
            protein: document.getElementById('spec-protein').value.trim(),
            carbs: document.getElementById('spec-carbs').value.trim(),
            fat: document.getElementById('spec-fat').value.trim(),
            fiber: document.getElementById('spec-fiber').value.trim()
        };

        if (editId) {
            const index = state.products.findIndex(p => p.id === editId);
            if (index !== -1) {
                state.products[index] = {
                    ...state.products[index],
                    title, categoryId, categoryName, basePrice, baseWeight, stockStatus, image, imageName, description, specs
                };
            }
        } else {
            const newProd = {
                id: 'prod-' + Date.now(),
                title, categoryId, categoryName, basePrice, baseWeight, stockStatus, image, imageName, description, specs, popular: false
            };
            state.products.push(newProd);
            state.selectedWeights[newProd.id] = baseWeight;
        }

        saveState(STORAGE_KEYS.PRODUCTS, state.products);
        renderProductGrid();
        renderAdminProductsTable();
        document.getElementById('product-modal').classList.add('hidden');
        showToast(editId ? 'Product updated!' : 'New product added!', 'success');
    }

    function handleDeleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            state.products = state.products.filter(p => p.id !== productId);
            saveState(STORAGE_KEYS.PRODUCTS, state.products);
            renderProductGrid();
            renderAdminProductsTable();
            showToast('Product deleted', 'info');
        }
    }

    function handleToggleStock(productId) {
        const prod = state.products.find(p => p.id === productId);
        if (prod) {
            prod.stockStatus = prod.stockStatus === 'in_stock' ? 'out_of_stock' : 'in_stock';
            saveState(STORAGE_KEYS.PRODUCTS, state.products);
            renderProductGrid();
            renderAdminProductsTable();
            showToast(`Stock updated for ${prod.title}`, 'info');
        }
    }

    /* Tab 2: Category Management */
    function renderAdminCategoriesTable() {
        const tbody = document.getElementById('admin-categories-table-body');
        if (!tbody) return;

        tbody.innerHTML = state.categories.map(c => `
            <tr>
                <td><i class="fa-solid ${c.icon}"></i></td>
                <td><strong>${c.name}</strong></td>
                <td>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="btn btn-sm btn-ghost edit-cat-btn" data-id="${c.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-sm btn-ghost-danger delete-cat-btn" data-id="${c.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function handleSaveCategory(e) {
        e.preventDefault();
        const editId = document.getElementById('cat-edit-id').value;
        const name = document.getElementById('cat-name').value.trim();
        const icon = document.getElementById('cat-icon').value.trim();

        if (editId) {
            const index = state.categories.findIndex(c => c.id === editId);
            if (index !== -1) {
                state.categories[index] = { ...state.categories[index], name, icon };
            }
        } else {
            const newCat = { id: 'cat-' + Date.now(), name, icon };
            state.categories.push(newCat);
        }

        saveState(STORAGE_KEYS.CATEGORIES, state.categories);
        renderCategoryPills();
        renderAdminCategoriesTable();
        document.getElementById('admin-cat-form').reset();
        document.getElementById('cat-edit-id').value = '';
        document.getElementById('cat-reset-btn').classList.add('hidden');
        showToast('Category saved!', 'success');
    }

    function handleDeleteCategory(catId) {
        if (confirm('Delete this category? Associated products will remain in catalog.')) {
            state.categories = state.categories.filter(c => c.id !== catId);
            saveState(STORAGE_KEYS.CATEGORIES, state.categories);
            renderCategoryPills();
            renderAdminCategoriesTable();
            showToast('Category deleted', 'info');
        }
    }

    /* Tab 3: Hero Slider Customizer */
    function renderAdminSlidesGrid() {
        const grid = document.getElementById('admin-slides-grid');
        if (!grid) return;

        grid.innerHTML = state.slides.map(slide => `
            <div class="slide-admin-card">
                <img src="${slide.image}" class="slide-admin-img" alt="${slide.title}" onerror="this.src='images/banners/default_banner.jpg'">
                <div class="slide-admin-body">
                    <span class="badge-status status-pending" style="font-size: 0.7rem;">${slide.badge || 'SLIDE'}</span>
                    <h5 style="margin: 0.4rem 0; font-size: 1rem; color: var(--color-walnut-dark);">${slide.title}</h5>
                    <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.8rem;">${slide.subtitle || ''}</p>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-sm btn-ghost edit-slide-btn" data-id="${slide.id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                        <button class="btn btn-sm btn-ghost-danger delete-slide-btn" data-id="${slide.id}"><i class="fa-solid fa-trash-can"></i> Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function openSlideModal(slideId = null) {
        const modal = document.getElementById('slide-modal');
        const form = document.getElementById('slide-crud-form');
        const titleEl = document.getElementById('slide-modal-title');
        const slideImgPreview = document.getElementById('slide-img-preview');
        const slideImageNameInput = document.getElementById('slide-image-name');

        if (slideId) {
            const slide = state.slides.find(s => s.id === slideId);
            if (!slide) return;
            titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Slide`;
            document.getElementById('slide-edit-id').value = slide.id;
            document.getElementById('slide-image').value = slide.image;
            document.getElementById('slide-badge').value = slide.badge || '';
            document.getElementById('slide-title').value = slide.title;
            document.getElementById('slide-subtitle').value = slide.subtitle || '';
            document.getElementById('slide-cta-text').value = slide.ctaText || '';
            document.getElementById('slide-cta-link').value = slide.ctaLink || '#catalog-section';

            if (slideImageNameInput) {
                const imgStr = slide.image || '';
                slideImageNameInput.value = imgStr.startsWith('data:') ? (slide.imageName || 'banner_uploaded.jpg') : imgStr.split('/').pop();
            }
            if (slideImgPreview) slideImgPreview.src = slide.image;

            const prevTitle = document.getElementById('slide-preview-title-text');
            const prevBadge = document.getElementById('slide-preview-badge-text');
            const prevSubtitle = document.getElementById('slide-preview-subtitle-text');
            const prevBtn = document.getElementById('slide-preview-btn-text');

            if (prevTitle) prevTitle.textContent = slide.title;
            if (prevBadge) prevBadge.innerHTML = slide.badge ? `<i class="fa-solid fa-sparkles"></i> ${slide.badge}` : `<i class="fa-solid fa-sparkles"></i> FRESH HARVEST`;
            if (prevSubtitle) prevSubtitle.textContent = slide.subtitle || '';
            if (prevBtn) prevBtn.textContent = slide.ctaText || 'Explore Selection';
        } else {
            titleEl.innerHTML = `<i class="fa-solid fa-image"></i> Add Hero Slide`;
            form.reset();
            document.getElementById('slide-edit-id').value = '';
            if (slideImageNameInput) slideImageNameInput.value = '';
            if (slideImgPreview) slideImgPreview.src = 'images/banners/default_banner.jpg';

            const prevTitle = document.getElementById('slide-preview-title-text');
            const prevBadge = document.getElementById('slide-preview-badge-text');
            const prevSubtitle = document.getElementById('slide-preview-subtitle-text');
            const prevBtn = document.getElementById('slide-preview-btn-text');

            if (prevTitle) prevTitle.textContent = 'Slide Headline Preview';
            if (prevBadge) prevBadge.innerHTML = `<i class="fa-solid fa-sparkles"></i> FRESH HARVEST`;
            if (prevSubtitle) prevSubtitle.textContent = 'Subtitle description goes here...';
            if (prevBtn) prevBtn.textContent = 'Explore Selection';
        }

        modal.classList.remove('hidden');
    }

    function handleSaveSlide(e) {
        e.preventDefault();
        const editId = document.getElementById('slide-edit-id').value;
        let image = document.getElementById('slide-image').value.trim();
        const imageName = document.getElementById('slide-image-name') ? document.getElementById('slide-image-name').value.trim() : '';

        if (imageName && !image.startsWith('data:image/')) {
            image = imageName.includes('/') ? imageName : `images/banners/${imageName}`;
        }

        const badge = document.getElementById('slide-badge').value.trim();
        const title = document.getElementById('slide-title').value.trim();
        const subtitle = document.getElementById('slide-subtitle').value.trim();
        const ctaText = document.getElementById('slide-cta-text').value.trim();
        const ctaLink = document.getElementById('slide-cta-link').value.trim();

        if (editId) {
            const index = state.slides.findIndex(s => s.id === editId);
            if (index !== -1) {
                state.slides[index] = { id: editId, image, imageName, badge, title, subtitle, ctaText, ctaLink };
            }
        } else {
            const newSlide = { id: 'slide-' + Date.now(), image, imageName, badge, title, subtitle, ctaText, ctaLink };
            state.slides.push(newSlide);
        }

        saveState(STORAGE_KEYS.SLIDES, state.slides);
        renderHeroSlider();
        renderAdminSlidesGrid();
        document.getElementById('slide-modal').classList.add('hidden');
        showToast('Hero slide saved!', 'success');
    }

    function handleDeleteSlide(slideId) {
        if (confirm('Delete this hero slide?')) {
            state.slides = state.slides.filter(s => s.id !== slideId);
            saveState(STORAGE_KEYS.SLIDES, state.slides);
            renderHeroSlider();
            renderAdminSlidesGrid();
            showToast('Slide deleted', 'info');
        }
    }

    /* Tab 4: Site Settings */
    function populateAdminSettingsForm() {
        const s = state.settings;
        document.getElementById('set-store-name').value = s.storeName || '';
        document.getElementById('set-currency').value = s.currencySymbol || '₹';
        document.getElementById('set-announcement').value = s.announcementText || '';
        
        // Strip leading 91 or +91 for 10-digit Indian mobile number display
        let waNum = (s.whatsappNumber || '').replace(/[^0-9]/g, '');
        if (waNum.startsWith('91') && waNum.length === 12) {
            waNum = waNum.slice(2);
        }
        document.getElementById('set-whatsapp').value = waNum;
        document.getElementById('set-email').value = s.notificationEmail || '';
        document.getElementById('set-address').value = s.address || '';

        // Populate Logo fields & previews
        const logoPathInput = document.getElementById('set-logo-path');
        const iconPreview = document.getElementById('set-logo-icon-preview');
        const fullPreview = document.getElementById('set-logo-full-preview');
        const currentLogo = s.logoImage || 'images/logos/logo_icon.png';
        if (logoPathInput) logoPathInput.value = currentLogo;
        if (iconPreview) iconPreview.src = currentLogo;
        if (fullPreview) fullPreview.src = currentLogo;

        // Populate Trust Badges
        const tbList = (s.trustBadges && s.trustBadges.length === 4) ? s.trustBadges : DEFAULT_SETTINGS.trustBadges;
        for (let i = 1; i <= 4; i++) {
            const b = tbList[i - 1] || DEFAULT_SETTINGS.trustBadges[i - 1];
            const iconEl = document.getElementById(`set-tb${i}-icon`);
            const titleEl = document.getElementById(`set-tb${i}-title`);
            const descEl = document.getElementById(`set-tb${i}-desc`);
            if (iconEl) iconEl.value = b.icon;
            if (titleEl) titleEl.value = b.title;
            if (descEl) descEl.value = b.desc;
        }
    }

    function handleSaveSettings(e) {
        e.preventDefault();
        const rawWa = document.getElementById('set-whatsapp').value.trim().replace(/[^0-9]/g, '');
        // Attach India country code (91)
        const fullWa = rawWa.startsWith('91') ? rawWa : `91${rawWa}`;

        const logoPath = document.getElementById('set-logo-path') ? document.getElementById('set-logo-path').value.trim() : 'images/logos/logo_icon.png';

        const trustBadges = [];
        for (let i = 1; i <= 4; i++) {
            const icon = document.getElementById(`set-tb${i}-icon`).value;
            const title = document.getElementById(`set-tb${i}-title`).value.trim();
            const desc = document.getElementById(`set-tb${i}-desc`).value.trim();
            trustBadges.push({ icon, title, desc });
        }

        state.settings = {
            storeName: document.getElementById('set-store-name').value.trim(),
            currencySymbol: document.getElementById('set-currency').value.trim(),
            announcementText: document.getElementById('set-announcement').value.trim(),
            whatsappNumber: fullWa,
            notificationEmail: document.getElementById('set-email').value.trim(),
            address: document.getElementById('set-address').value.trim(),
            logoImage: logoPath,
            trustBadges: trustBadges
        };

        saveState(STORAGE_KEYS.SETTINGS, state.settings);
        renderSiteIdentity();
        renderProductGrid();
        renderCart();
        showToast('Site settings updated!', 'success');
    }

    /* Tab 5: Inquiries / Orders Log */
    function renderAdminInquiriesTable() {
        const tbody = document.getElementById('admin-inquiries-table-body');
        const filterSelect = document.getElementById('inquiry-status-filter');
        if (!tbody) return;

        const filterStatus = filterSelect ? filterSelect.value : 'all';

        const filtered = state.inquiries.filter(i => filterStatus === 'all' || i.status === filterStatus);
        const curr = state.settings.currencySymbol || '₹';

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">No inquiry orders logged.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(inq => {
            const itemsStr = inq.items.map(i => `${i.title} (${i.weight}) x${i.qty}`).join(', ');
            let statusClass = 'status-pending';
            if (inq.status === 'Contacted') statusClass = 'status-contacted';
            if (inq.status === 'Completed') statusClass = 'status-completed';
            if (inq.status === 'Cancelled') statusClass = 'status-cancelled';

            return `
                <tr>
                    <td>
                        <strong style="font-size: 0.8rem; color: var(--color-amber-warm);">${inq.id}</strong><br>
                        <small style="color: var(--color-text-muted); font-size: 0.72rem;">${inq.timestamp}</small>
                    </td>
                    <td>
                        <strong>${inq.customerName}</strong><br>
                        <small><i class="fa-solid fa-phone"></i> ${inq.customerPhone}</small><br>
                        <small><i class="fa-solid fa-envelope"></i> ${inq.customerEmail}</small>
                    </td>
                    <td><div style="max-width: 240px; font-size: 0.82rem;">${itemsStr}</div></td>
                    <td><strong style="color: var(--color-emerald-deep);">${curr}${inq.grandTotal}</strong></td>
                    <td><span class="badge-status ${inq.channel === 'WhatsApp' ? 'status-completed' : 'status-contacted'}">${inq.channel}</span></td>
                    <td>
                        <select class="sort-dropdown inquiry-status-select" data-id="${inq.id}" style="font-size: 0.78rem; padding: 0.25rem 0.5rem;">
                            <option value="Pending" ${inq.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Contacted" ${inq.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="Completed" ${inq.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${inq.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-ghost-danger delete-inquiry-btn" data-id="${inq.id}" title="Delete Log"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function handleChangeInquiryStatus(inquiryId, newStatus) {
        const inq = state.inquiries.find(i => i.id === inquiryId);
        if (inq) {
            inq.status = newStatus;
            saveState(STORAGE_KEYS.INQUIRIES, state.inquiries);
            updateAdminInquiriesBadge();
            renderAdminInquiriesTable();
            showToast(`Inquiry ${inquiryId} marked as ${newStatus}`, 'info');
        }
    }

    function handleDeleteInquiry(inquiryId) {
        if (confirm('Delete this inquiry record?')) {
            state.inquiries = state.inquiries.filter(i => i.id !== inquiryId);
            saveState(STORAGE_KEYS.INQUIRIES, state.inquiries);
            updateAdminInquiriesBadge();
            renderAdminInquiriesTable();
            showToast('Inquiry log deleted', 'info');
        }
    }

    function handleClearAllInquiries() {
        if (confirm('Clear entire inquiry history?')) {
            state.inquiries = [];
            saveState(STORAGE_KEYS.INQUIRIES, state.inquiries);
            updateAdminInquiriesBadge();
            renderAdminInquiriesTable();
            showToast('All inquiry logs cleared', 'info');
        }
    }

    /* Tab 6: Image Assets Gallery & Management */
    const DEFAULT_SYSTEM_IMAGES = [
        { path: 'images/products/almonds.jpg', name: 'almonds.jpg', type: 'products', title: 'California Almonds' },
        { path: 'images/products/anjeer.jpg', name: 'anjeer.jpg', type: 'products', title: 'Afghan Anjeer (Figs)' },
        { path: 'images/products/cranberries.jpg', name: 'cranberries.jpg', type: 'products', title: 'Wild Cranberries' },
        { path: 'images/products/walnuts.jpg', name: 'walnuts.jpg', type: 'products', title: 'Cashmiri Walnuts' },
        { path: 'images/products/dates.jpg', name: 'dates.jpg', type: 'products', title: 'Medjool Dates' },
        { path: 'images/products/hamper.jpg', name: 'hamper.jpg', type: 'products', title: 'Festive Hamper Box' },
        { path: 'images/products/default_product.jpg', name: 'default_product.jpg', type: 'products', title: 'Default Product Fallback' },
        
        { path: 'images/banners/banner1.jpg', name: 'banner1.jpg', type: 'banners', title: 'Fresh Harvest Banner' },
        { path: 'images/banners/banner2.jpg', name: 'banner2.jpg', type: 'banners', title: 'Health & Wellness Banner' },
        { path: 'images/banners/banner3.jpg', name: 'banner3.jpg', type: 'banners', title: 'Festive Hampers Banner' },
        { path: 'images/banners/default_banner.jpg', name: 'default_banner.jpg', type: 'banners', title: 'Default Hero Fallback' },
        
        { path: 'images/logos/logo.png', name: 'logo.png', type: 'logos', title: 'Full Brand Logo' },
        { path: 'images/logos/logo_icon.png', name: 'logo_icon.png', type: 'logos', title: 'Logo Emblem Icon' }
    ];

    function getAllImageAssets() {
        let assetsMap = new Map();
        
        DEFAULT_SYSTEM_IMAGES.forEach(item => {
            assetsMap.set(item.path, item);
        });

        // Add Product images from state
        state.products.forEach(p => {
            if (p.image && !assetsMap.has(p.image)) {
                const name = p.imageName || (p.image.startsWith('data:') ? `${p.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png` : p.image.split('/').pop());
                assetsMap.set(p.image, {
                    path: p.image,
                    name: name,
                    type: p.image.startsWith('data:') ? 'custom' : (p.image.includes('/banners/') ? 'banners' : 'products'),
                    title: p.title
                });
            }
        });

        // Add Slide images from state
        state.slides.forEach(s => {
            if (s.image && !assetsMap.has(s.image)) {
                const name = s.imageName || (s.image.startsWith('data:') ? `${s.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png` : s.image.split('/').pop());
                assetsMap.set(s.image, {
                    path: s.image,
                    name: name,
                    type: s.image.startsWith('data:') ? 'custom' : 'banners',
                    title: s.title
                });
            }
        });

        return Array.from(assetsMap.values());
    }

    function renderAdminGalleryGrid() {
        const grid = document.getElementById('admin-gallery-grid');
        const filterSelect = document.getElementById('gallery-type-filter');
        const searchInput = document.getElementById('gallery-search');
        const countVal = document.getElementById('gallery-count-val');
        if (!grid) return;

        const filterType = filterSelect ? filterSelect.value : 'all';
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const allAssets = getAllImageAssets();

        const filtered = allAssets.filter(item => {
            const matchesType = (filterType === 'all' || item.type === filterType);
            const matchesSearch = !query || item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query) || (item.title && item.title.toLowerCase().includes(query));
            return matchesType && matchesSearch;
        });

        if (countVal) {
            countVal.textContent = filtered.length;
        }

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 2.5rem;">No image assets found matching your filter or search query.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(item => `
            <div class="gallery-asset-card">
                <div class="gallery-img-container">
                    <img src="${item.path}" alt="${item.title || item.name}" onerror="this.src='images/products/default_product.jpg'">
                    <span class="gallery-type-badge">${item.type}</span>
                </div>
                <div class="gallery-card-body">
                    <div class="gallery-filename" title="${item.name}">${item.name}</div>
                    <div class="gallery-filepath" title="${item.path}">${item.path.startsWith('data:') ? 'Base64 Uploaded Data' : item.path}</div>
                    <div class="gallery-card-actions">
                        <button class="btn btn-sm btn-ghost copy-path-btn" data-path="${encodeURIComponent(item.path)}" title="Copy Image Path"><i class="fa-solid fa-copy"></i> Copy</button>
                        <button class="btn btn-sm btn-ghost-danger delete-asset-btn" data-path="${encodeURIComponent(item.path)}" title="Delete / Remove Image"><i class="fa-solid fa-trash-can"></i> Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function handleDeleteImageAsset(targetPath) {
        if (confirm(`Are you sure you want to remove/delete image asset "${targetPath.slice(0, 30)}..."?`)) {
            let affectedProducts = 0;
            let affectedSlides = 0;

            state.products.forEach(p => {
                if (p.image === targetPath) {
                    p.image = 'images/products/default_product.jpg';
                    affectedProducts++;
                }
            });

            state.slides.forEach(s => {
                if (s.image === targetPath) {
                    s.image = 'images/banners/default_banner.jpg';
                    affectedSlides++;
                }
            });

            if (affectedProducts > 0) saveState(STORAGE_KEYS.PRODUCTS, state.products);
            if (affectedSlides > 0) saveState(STORAGE_KEYS.SLIDES, state.slides);

            renderProductGrid();
            renderHeroSlider();
            renderAdminProductsTable();
            renderAdminSlidesGrid();
            renderAdminGalleryGrid();

            showToast(`Image asset removed! Reset ${affectedProducts} product(s) & ${affectedSlides} slide(s) to fallback.`, 'info');
        }
    }

    function handleRemoveProductImage() {
        const prodImageInput = document.getElementById('prod-image');
        const prodImageNameInput = document.getElementById('prod-image-name');
        const prodImgPreview = document.getElementById('prod-img-preview');
        const fileInput = document.getElementById('prod-file-input');

        if (prodImageInput) prodImageInput.value = 'images/products/default_product.jpg';
        if (prodImageNameInput) prodImageNameInput.value = 'default_product.jpg';
        if (prodImgPreview) prodImgPreview.src = 'images/products/default_product.jpg';
        if (fileInput) fileInput.value = '';

        showToast('Product image reset to default fallback', 'info');
    }

    function handleRemoveSlideImage() {
        const slideImageInput = document.getElementById('slide-image');
        const slideImageNameInput = document.getElementById('slide-image-name');
        const slideImgPreview = document.getElementById('slide-img-preview');
        const fileInput = document.getElementById('slide-file-input');

        if (slideImageInput) slideImageInput.value = 'images/banners/default_banner.jpg';
        if (slideImageNameInput) slideImageNameInput.value = 'default_banner.jpg';
        if (slideImgPreview) slideImgPreview.src = 'images/banners/default_banner.jpg';
        if (fileInput) fileInput.value = '';

        showToast('Hero slide banner reset to default fallback', 'info');
    }


    // ==========================================================================
    // 6. SEARCH & AUTOCOMPLETE
    // ==========================================================================
    function handleSearchInput(e, source = 'desktop') {
        const query = e.target.value;
        state.searchQuery = query;

        // Sync values across desktop and mobile inputs
        const searchInput = document.getElementById('search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        if (source === 'desktop' && mobileSearchInput) mobileSearchInput.value = query;
        if (source === 'mobile' && searchInput) searchInput.value = query;

        const clearBtn = document.getElementById('clear-search-btn');
        const mobileClearBtn = document.getElementById('mobile-clear-search-btn');
        const dropdown = source === 'mobile' 
            ? document.getElementById('mobile-search-autocomplete-dropdown') 
            : document.getElementById('search-autocomplete-dropdown');
        const otherDropdown = source === 'mobile' 
            ? document.getElementById('search-autocomplete-dropdown') 
            : document.getElementById('mobile-search-autocomplete-dropdown');

        if (clearBtn) clearBtn.classList.toggle('hidden', !query);
        if (mobileClearBtn) mobileClearBtn.classList.toggle('hidden', !query);
        if (otherDropdown) otherDropdown.classList.add('hidden');

        if (!query.trim()) {
            if (dropdown) dropdown.classList.add('hidden');
            renderProductGrid();
            return;
        }

        const matches = state.products.filter(p => 
            p.title.toLowerCase().includes(query.toLowerCase()) || 
            p.categoryName.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);

        if (matches.length > 0 && dropdown) {
            const curr = state.settings.currencySymbol || '₹';
            dropdown.innerHTML = matches.map(p => `
                <div class="search-item" data-prod-id="${p.id}">
                    <img src="${p.image}" class="search-thumb" alt="${p.title}" onerror="this.src='images/products/default_product.jpg'">
                    <div class="search-item-info">
                        <h5>${p.title}</h5>
                        <p>${curr}${p.basePrice} / ${p.baseWeight}g</p>
                    </div>
                </div>
            `).join('');
            dropdown.classList.remove('hidden');
        } else if (dropdown) {
            dropdown.classList.add('hidden');
        }

        renderProductGrid();
    }


    // ==========================================================================
    // 7. TOAST NOTIFICATIONS
    // ==========================================================================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 350);
        }, 3200);
    }


    // ==========================================================================
    // 8. GLOBAL EVENT LISTENERS & DELEGATION
    // ==========================================================================
    function bindEvents() {
        // Search & Clear Controls (Desktop & Mobile)
        const searchInput = document.getElementById('search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const mobileClearSearchBtn = document.getElementById('mobile-clear-search-btn');

        if (searchInput) searchInput.addEventListener('input', (e) => handleSearchInput(e, 'desktop'));
        if (mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleSearchInput(e, 'mobile'));

        const resetAllSearches = () => {
            if (searchInput) searchInput.value = '';
            if (mobileSearchInput) mobileSearchInput.value = '';
            state.searchQuery = '';
            if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
            if (mobileClearSearchBtn) mobileClearSearchBtn.classList.add('hidden');
            const d1 = document.getElementById('search-autocomplete-dropdown');
            const d2 = document.getElementById('mobile-search-autocomplete-dropdown');
            if (d1) d1.classList.add('hidden');
            if (d2) d2.classList.add('hidden');
            renderProductGrid();
        };

        if (clearSearchBtn) clearSearchBtn.addEventListener('click', resetAllSearches);
        if (mobileClearSearchBtn) mobileClearSearchBtn.addEventListener('click', resetAllSearches);

        // Search Autocomplete Click
        document.addEventListener('click', (e) => {
            const searchItem = e.target.closest('.search-item');
            if (searchItem) {
                const prodId = searchItem.dataset.prodId;
                const d1 = document.getElementById('search-autocomplete-dropdown');
                const d2 = document.getElementById('mobile-search-autocomplete-dropdown');
                if (d1) d1.classList.add('hidden');
                if (d2) d2.classList.add('hidden');
                openQuickViewModal(prodId);
            }
        });

        // Category Pills Click
        const catContainer = document.getElementById('category-pills-container');
        if (catContainer) {
            catContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.category-pill');
                if (btn) {
                    state.activeCategory = btn.dataset.catId;
                    renderCategoryPills();
                    renderProductGrid();
                }
            });
        }

        // Footer Category Links
        document.addEventListener('click', (e) => {
            const footerCatLink = e.target.closest('.footer-cat-link');
            if (footerCatLink) {
                state.activeCategory = footerCatLink.dataset.catId;
                renderCategoryPills();
                renderProductGrid();
            }
        });

        // Sort Select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                state.sortBy = e.target.value;
                renderProductGrid();
            });
        }

        // Reset Catalog Filters
        const resetBtn = document.getElementById('reset-catalog-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                state.activeCategory = 'all';
                state.searchQuery = '';
                if (searchInput) searchInput.value = '';
                renderCategoryPills();
                renderProductGrid();
            });
        }

        // Product Weight Selector Pill Buttons & Quick View & Add to Cart
        const grid = document.getElementById('product-grid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                // Weight button pill click
                const weightBtn = e.target.closest('.weight-btn');
                if (weightBtn) {
                    const prodId = weightBtn.dataset.prodId;
                    const grams = Number(weightBtn.dataset.weightGrams);
                    state.selectedWeights[prodId] = grams;
                    renderProductGrid();
                    return;
                }

                // Quick View click
                const quickViewBtn = e.target.closest('.btn-quick-view');
                if (quickViewBtn) {
                    openQuickViewModal(quickViewBtn.dataset.quickViewId);
                    return;
                }

                // Add to Cart click
                const addCartBtn = e.target.closest('.add-to-cart-btn');
                if (addCartBtn) {
                    addToCart(addCartBtn.dataset.prodId);
                    return;
                }
            });
        }

        // Quick View Modal delegation (Add to Cart from Modal)
        const quickViewModal = document.getElementById('quick-view-modal');
        if (quickViewModal) {
            quickViewModal.addEventListener('click', (e) => {
                const addCartBtn = e.target.closest('.add-to-cart-btn');
                if (addCartBtn) {
                    addToCart(addCartBtn.dataset.prodId);
                    quickViewModal.classList.add('hidden');
                }
            });
        }

        // Cart Drawer Controls
        const drawerTrigger = document.getElementById('cart-drawer-trigger');
        const footerCartTrigger = document.getElementById('footer-cart-trigger');
        const drawerClose = document.getElementById('cart-drawer-close');
        const drawerBackdrop = document.getElementById('cart-drawer-backdrop');

        const toggleDrawer = (open) => {
            document.body.classList.toggle('drawer-open', open);
            if (drawerBackdrop) drawerBackdrop.classList.toggle('hidden', !open);
        };

        if (drawerTrigger) drawerTrigger.addEventListener('click', () => toggleDrawer(true));
        if (footerCartTrigger) footerCartTrigger.addEventListener('click', () => toggleDrawer(true));
        if (drawerClose) drawerClose.addEventListener('click', () => toggleDrawer(false));
        if (drawerBackdrop) drawerBackdrop.addEventListener('click', () => toggleDrawer(false));

        // Cart Item Quantity Stepper & Removal
        const drawerBody = document.getElementById('cart-drawer-body');
        if (drawerBody) {
            drawerBody.addEventListener('click', (e) => {
                const plusBtn = e.target.closest('.qty-plus');
                if (plusBtn) updateCartQty(plusBtn.dataset.cartId, 1);

                const minusBtn = e.target.closest('.qty-minus');
                if (minusBtn) updateCartQty(minusBtn.dataset.cartId, -1);

                const removeBtn = e.target.closest('.cart-item-remove');
                if (removeBtn) removeFromCart(removeBtn.dataset.removeId);
            });
        }

        const clearCartBtn = document.getElementById('clear-cart-btn');
        if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);

        const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
        if (proceedCheckoutBtn) proceedCheckoutBtn.addEventListener('click', openCheckoutModal);

        // Checkout Modal Actions
        const submitWaBtn = document.getElementById('submit-whatsapp-btn');
        const submitEmailBtn = document.getElementById('submit-email-btn');
        if (submitWaBtn) submitWaBtn.addEventListener('click', () => submitOrderInquiry('whatsapp'));
        if (submitEmailBtn) submitEmailBtn.addEventListener('click', () => submitOrderInquiry('email'));

        // Modals Close Buttons
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-backdrop');
                if (modal) modal.classList.add('hidden');
            });
        });

        // Close modal on background click
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });

        // Hero Slider Arrows & Dots
        const sliderPrev = document.getElementById('slider-prev-btn');
        const sliderNext = document.getElementById('slider-next-btn');
        const dotsContainer = document.getElementById('slider-dots-container');

        if (sliderPrev) {
            sliderPrev.addEventListener('click', () => {
                state.currentSlideIndex = (state.currentSlideIndex - 1 + state.slides.length) % state.slides.length;
                renderHeroSlider();
                startSliderAutoPlay();
            });
        }
        if (sliderNext) {
            sliderNext.addEventListener('click', () => {
                state.currentSlideIndex = (state.currentSlideIndex + 1) % state.slides.length;
                renderHeroSlider();
                startSliderAutoPlay();
            });
        }
        if (dotsContainer) {
            dotsContainer.addEventListener('click', (e) => {
                const dot = e.target.closest('.dot');
                if (dot) {
                    state.currentSlideIndex = Number(dot.dataset.index);
                    renderHeroSlider();
                    startSliderAutoPlay();
                }
            });
        }

        // Hero Section Mouse Hover Pause
        const heroSec = document.getElementById('hero-section');
        if (heroSec) {
            heroSec.addEventListener('mouseenter', stopSliderAutoPlay);
            heroSec.addEventListener('mouseleave', startSliderAutoPlay);
        }

        // Admin Portal Triggers
        const adminTrigger = document.getElementById('admin-trigger-btn');
        const footerAdminTrigger = document.getElementById('footer-admin-trigger');
        if (adminTrigger) adminTrigger.addEventListener('click', openAdminModal);
        if (footerAdminTrigger) footerAdminTrigger.addEventListener('click', openAdminModal);

        // Admin Auth Login
        const adminLoginForm = document.getElementById('admin-login-form');
        if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);

        // Admin Logout
        const adminLogoutBtn = document.getElementById('admin-logout-btn');
        if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', handleAdminLogout);

        // Admin Navigation Tabs
        const adminTabs = document.querySelector('.admin-tabs');
        if (adminTabs) {
            adminTabs.addEventListener('click', (e) => {
                const tabBtn = e.target.closest('.admin-tab-btn');
                if (tabBtn) {
                    const targetTabId = tabBtn.dataset.tab;
                    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                    
                    tabBtn.classList.add('active');
                    const targetPane = document.getElementById(targetTabId);
                    if (targetPane) targetPane.classList.add('active');
                }
            });
        }

        // Admin Products Tab Actions
        const addProdBtn = document.getElementById('add-product-btn');
        if (addProdBtn) addProdBtn.addEventListener('click', () => openProductModal(null));

        const prodTableBody = document.getElementById('admin-products-table-body');
        if (prodTableBody) {
            prodTableBody.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-prod-btn');
                if (editBtn) openProductModal(editBtn.dataset.id);

                const deleteBtn = e.target.closest('.delete-prod-btn');
                if (deleteBtn) handleDeleteProduct(deleteBtn.dataset.id);

                const toggleBtn = e.target.closest('.toggle-stock-btn');
                if (toggleBtn) handleToggleStock(toggleBtn.dataset.id);
            });
        }

        const adminProdSearch = document.getElementById('admin-prod-search');
        if (adminProdSearch) adminProdSearch.addEventListener('input', renderAdminProductsTable);

        const prodForm = document.getElementById('product-crud-form');
        if (prodForm) prodForm.addEventListener('submit', handleSaveProduct);

        const prodCancel = document.getElementById('prod-form-cancel');
        if (prodCancel) prodCancel.addEventListener('click', () => document.getElementById('product-modal').classList.add('hidden'));

        const prodImgDeleteBtn = document.getElementById('prod-img-delete-btn');
        if (prodImgDeleteBtn) prodImgDeleteBtn.addEventListener('click', handleRemoveProductImage);

        const slideImgDeleteBtn = document.getElementById('slide-img-delete-btn');
        if (slideImgDeleteBtn) slideImgDeleteBtn.addEventListener('click', handleRemoveSlideImage);

        // Admin Gallery Tab Actions
        const galleryTypeFilter = document.getElementById('gallery-type-filter');
        if (galleryTypeFilter) galleryTypeFilter.addEventListener('change', renderAdminGalleryGrid);

        const gallerySearch = document.getElementById('gallery-search');
        if (gallerySearch) gallerySearch.addEventListener('input', renderAdminGalleryGrid);

        const galleryGrid = document.getElementById('admin-gallery-grid');
        if (galleryGrid) {
            galleryGrid.addEventListener('click', (e) => {
                const copyBtn = e.target.closest('.copy-path-btn');
                if (copyBtn) {
                    const path = decodeURIComponent(copyBtn.dataset.path);
                    navigator.clipboard.writeText(path).then(() => {
                        showToast(`Copied image path: ${path.slice(0, 25)}...`, 'success');
                    }).catch(() => {
                        showToast(`Path: ${path}`, 'info');
                    });
                }

                const deleteBtn = e.target.closest('.delete-asset-btn');
                if (deleteBtn) {
                    const path = decodeURIComponent(deleteBtn.dataset.path);
                    handleDeleteImageAsset(path);
                }
            });
        }

        // Admin Categories Tab Actions
        setupCategoryIconPicker();
        const catForm = document.getElementById('admin-cat-form');
        if (catForm) catForm.addEventListener('submit', handleSaveCategory);

        const catResetBtn = document.getElementById('cat-reset-btn');
        if (catResetBtn) {
            catResetBtn.addEventListener('click', () => {
                catForm.reset();
                document.getElementById('cat-edit-id').value = '';
                updateCategoryIconPreview('fa-seedling');
                catResetBtn.classList.add('hidden');
            });
        }

        const catTableBody = document.getElementById('admin-categories-table-body');
        if (catTableBody) {
            catTableBody.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-cat-btn');
                if (editBtn) {
                    const cat = state.categories.find(c => c.id === editBtn.dataset.id);
                    if (cat) {
                        document.getElementById('cat-edit-id').value = cat.id;
                        document.getElementById('cat-name').value = cat.name;
                        document.getElementById('cat-icon').value = cat.icon;
                        updateCategoryIconPreview(cat.icon);
                        if (catResetBtn) catResetBtn.classList.remove('hidden');
                    }
                }

                const deleteBtn = e.target.closest('.delete-cat-btn');
                if (deleteBtn) handleDeleteCategory(deleteBtn.dataset.id);
            });
        }

        // Admin Slides Tab Actions
        const addSlideBtn = document.getElementById('add-slide-btn');
        if (addSlideBtn) addSlideBtn.addEventListener('click', () => openSlideModal(null));

        const slideGrid = document.getElementById('admin-slides-grid');
        if (slideGrid) {
            slideGrid.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-slide-btn');
                if (editBtn) openSlideModal(editBtn.dataset.id);

                const deleteBtn = e.target.closest('.delete-slide-btn');
                if (deleteBtn) handleDeleteSlide(deleteBtn.dataset.id);
            });
        }

        const slideForm = document.getElementById('slide-crud-form');
        if (slideForm) slideForm.addEventListener('submit', handleSaveSlide);

        const slideCancel = document.getElementById('slide-form-cancel');
        if (slideCancel) slideCancel.addEventListener('click', () => document.getElementById('slide-modal').classList.add('hidden'));

        // Admin Settings Form
        const settingsForm = document.getElementById('admin-settings-form');
        if (settingsForm) settingsForm.addEventListener('submit', handleSaveSettings);

        // Admin Inquiries Tab Actions
        const inquiryStatusFilter = document.getElementById('inquiry-status-filter');
        if (inquiryStatusFilter) inquiryStatusFilter.addEventListener('change', renderAdminInquiriesTable);

        const clearInquiriesBtn = document.getElementById('clear-all-inquiries-btn');
        if (clearInquiriesBtn) clearInquiriesBtn.addEventListener('click', handleClearAllInquiries);

        const inquiriesTableBody = document.getElementById('admin-inquiries-table-body');
        if (inquiriesTableBody) {
            inquiriesTableBody.addEventListener('change', (e) => {
                const select = e.target.closest('.inquiry-status-select');
                if (select) handleChangeInquiryStatus(select.dataset.id, select.value);
            });

            inquiriesTableBody.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-inquiry-btn');
                if (deleteBtn) handleDeleteInquiry(deleteBtn.dataset.id);
            });
        }
        // Initialize image file upload & live previews
        setupImageUploadAndPreviews();
    }

    /**
     * Category Icon Selector & Visual Grid Preview Setup
     */
    function updateCategoryIconPreview(iconVal) {
        const livePreview = document.getElementById('cat-icon-live-preview');
        const select = document.getElementById('cat-icon');
        const tiles = document.querySelectorAll('#icon-picker-grid .icon-tile');

        if (livePreview) {
            livePreview.className = `fa-solid ${iconVal}`;
        }
        if (select) {
            select.value = iconVal;
        }
        tiles.forEach(t => {
            t.classList.toggle('active', t.dataset.icon === iconVal);
        });
    }

    function setupCategoryIconPicker() {
        const select = document.getElementById('cat-icon');
        const pickerGrid = document.getElementById('icon-picker-grid');

        if (select) {
            select.addEventListener('change', (e) => {
                updateCategoryIconPreview(e.target.value);
            });
        }

        if (pickerGrid) {
            pickerGrid.addEventListener('click', (e) => {
                const tile = e.target.closest('.icon-tile');
                if (tile && tile.dataset.icon) {
                    updateCategoryIconPreview(tile.dataset.icon);
                }
            });
        }
    }

    /**
     * Image File Uploader & Live Interactive Preview Setup
     */
    function setupImageUploadAndPreviews() {
        // Product Image Upload & Previews
        const prodFileInput = document.getElementById('prod-file-input');
        const prodDropzone = document.getElementById('prod-dropzone');
        const prodImageInput = document.getElementById('prod-image');
        const prodImageNameInput = document.getElementById('prod-image-name');
        const prodImgPreview = document.getElementById('prod-img-preview');

        if (prodFileInput) {
            prodFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    const dataUrl = evt.target.result;
                    if (prodImageInput) prodImageInput.value = dataUrl;
                    if (prodImgPreview) prodImgPreview.src = dataUrl;

                    if (prodImageNameInput) {
                        prodImageNameInput.value = file.name;
                    }
                    showToast(`Image file loaded: ${file.name}`, 'info');
                };
                reader.readAsDataURL(file);
            });
        }

        if (prodImageInput && prodImgPreview) {
            prodImageInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                prodImgPreview.src = val || 'images/products/default_product.jpg';
            });
        }

        if (prodImageNameInput && prodImageInput) {
            prodImageNameInput.addEventListener('input', (e) => {
                const alias = e.target.value.trim();
                if (!alias) return;
                if (!prodImageInput.value.startsWith('data:image/')) {
                    prodImageInput.value = alias.includes('/') ? alias : `images/products/${alias}`;
                    if (prodImgPreview) prodImgPreview.src = prodImageInput.value;
                }
            });
        }

        if (prodDropzone) {
            ['dragenter', 'dragover'].forEach(name => {
                prodDropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    prodDropzone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(name => {
                prodDropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    prodDropzone.classList.remove('dragover');
                });
            });

            prodDropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                if (dt.files && dt.files[0] && prodFileInput) {
                    prodFileInput.files = dt.files;
                    prodFileInput.dispatchEvent(new Event('change'));
                }
            });
        }


        // Slide Image Upload & Live Interactive Preview
        const slideFileInput = document.getElementById('slide-file-input');
        const slideDropzone = document.getElementById('slide-dropzone');
        const slideImageInput = document.getElementById('slide-image');
        const slideImageNameInput = document.getElementById('slide-image-name');
        const slideImgPreview = document.getElementById('slide-img-preview');

        const slideTitleInput = document.getElementById('slide-title');
        const slideBadgeInput = document.getElementById('slide-badge');
        const slideSubtitleInput = document.getElementById('slide-subtitle');
        const slideCtaTextInput = document.getElementById('slide-cta-text');

        const slidePrevTitle = document.getElementById('slide-preview-title-text');
        const slidePrevBadge = document.getElementById('slide-preview-badge-text');
        const slidePrevSubtitle = document.getElementById('slide-preview-subtitle-text');
        const slidePrevBtn = document.getElementById('slide-preview-btn-text');

        if (slideFileInput) {
            slideFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    const dataUrl = evt.target.result;
                    if (slideImageInput) slideImageInput.value = dataUrl;
                    if (slideImgPreview) slideImgPreview.src = dataUrl;

                    if (slideImageNameInput) {
                        slideImageNameInput.value = file.name;
                    }
                    showToast(`Slide image file loaded: ${file.name}`, 'info');
                };
                reader.readAsDataURL(file);
            });
        }

        if (slideImageInput && slideImgPreview) {
            slideImageInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                slideImgPreview.src = val || 'images/banners/default_banner.jpg';
            });
        }

        if (slideImageNameInput && slideImageInput) {
            slideImageNameInput.addEventListener('input', (e) => {
                const alias = e.target.value.trim();
                if (!alias) return;
                if (!slideImageInput.value.startsWith('data:image/')) {
                    slideImageInput.value = alias.includes('/') ? alias : `images/banners/${alias}`;
                    if (slideImgPreview) slideImgPreview.src = slideImageInput.value;
                }
            });
        }

        if (slideTitleInput && slidePrevTitle) {
            slideTitleInput.addEventListener('input', (e) => {
                slidePrevTitle.textContent = e.target.value.trim() || 'Slide Headline Preview';
            });
        }

        if (slideBadgeInput && slidePrevBadge) {
            slideBadgeInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                slidePrevBadge.innerHTML = val ? `<i class="fa-solid fa-sparkles"></i> ${val}` : `<i class="fa-solid fa-sparkles"></i> FRESH HARVEST`;
            });
        }

        if (slideSubtitleInput && slidePrevSubtitle) {
            slideSubtitleInput.addEventListener('input', (e) => {
                slidePrevSubtitle.textContent = e.target.value.trim() || 'Subtitle description goes here...';
            });
        }

        if (slideCtaTextInput && slidePrevBtn) {
            slideCtaTextInput.addEventListener('input', (e) => {
                slidePrevBtn.textContent = e.target.value.trim() || 'Explore Selection';
            });
        }

        if (slideDropzone) {
            ['dragenter', 'dragover'].forEach(name => {
                slideDropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    slideDropzone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(name => {
                slideDropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    slideDropzone.classList.remove('dragover');
                });
            });

            slideDropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                if (dt.files && dt.files[0] && slideFileInput) {
                    slideFileInput.files = dt.files;
                    slideFileInput.dispatchEvent(new Event('change'));
                }
            });
        }

        // Logo Image File Upload & Live Settings Preview
        const logoFileInput = document.getElementById('set-logo-file');
        const logoPathInput = document.getElementById('set-logo-path');
        const logoIconPreview = document.getElementById('set-logo-icon-preview');
        const logoFullPreview = document.getElementById('set-logo-full-preview');
        const logoDropzone = document.getElementById('logo-dropzone');

        if (logoFileInput) {
            logoFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    const dataUrl = evt.target.result;
                    if (logoPathInput) logoPathInput.value = dataUrl;
                    if (logoIconPreview) logoIconPreview.src = dataUrl;
                    if (logoFullPreview) logoFullPreview.src = dataUrl;
                    showToast(`Logo file loaded: ${file.name}`, 'info');
                };
                reader.readAsDataURL(file);
            });
        }

        if (logoPathInput) {
            logoPathInput.addEventListener('input', (e) => {
                const val = e.target.value.trim() || 'images/logos/logo_icon.png';
                if (logoIconPreview) logoIconPreview.src = val;
                if (logoFullPreview) logoFullPreview.src = val;
            });
        }

        if (logoDropzone) {
            ['dragenter', 'dragover'].forEach(name => {
                logoDropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    logoDropzone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(name => {
                logoDropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    logoDropzone.classList.remove('dragover');
                });
            });

            logoDropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                if (dt.files && dt.files[0] && logoFileInput) {
                    logoFileInput.files = dt.files;
                    logoFileInput.dispatchEvent(new Event('change'));
                }
            });
        }
    }


    // ==========================================================================
    // 9. INITIALIZATION
    // ==========================================================================
    function init() {
        initDatabase();
        
        renderSiteIdentity();
        renderHeroSlider();
        startSliderAutoPlay();
        renderCategoryPills();
        renderProductGrid();
        renderCart();

        bindEvents();
    }

    // Launch application on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
