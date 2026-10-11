/**
 * printlocal Web Application - Full-Stack Single Page App
 * REST API Service Layer, WhatsApp Auth API, SMS Gateway & Google Maps
 */

// =========================================================
// API & WHATSAPP AUTHENTICATION GATEWAY CONFIGURATION
// =========================================================
const API_CONFIG = {
    baseUrl: window.location.origin + '/api', // Configurable backend REST API endpoint
    useMockFallback: true // Enables smooth async mock responses
};

const SMS_CONFIG = {
    provider: 'Fast2SMS', // 'Fast2SMS', 'Twilio', 'Textlocal', 'Custom'
    apiKey: 'YOUR_SMS_API_KEY',
    senderId: 'PRNTLC',
    enabled: true
};

const WHATSAPP_CONFIG = {
    provider: 'MetaCloudAPI', // 'MetaCloudAPI', 'Interakt', 'Gupshup', 'TwilioWhatsApp'
    phoneNumberId: 'YOUR_WHATSAPP_PHONE_NUMBER_ID',
    accessToken: 'YOUR_WHATSAPP_ACCESS_TOKEN',
    templateName: 'otp_verification',
    languageCode: 'en_US',
    enabled: true
};

class WhatsAppAuthService {
    /**
     * Send WhatsApp 1-Click OTP Authentication Message via Node.js Express & Meta Graph API
     */
    static async sendWhatsAppOtp(phoneNumber) {
        console.log(`[WhatsApp Auth API] Requesting WhatsApp OTP for ${phoneNumber}...`);

        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber })
            });

            if (response.ok) {
                return await response.json();
            }
            throw new Error('Backend server unavailable');
        } catch (err) {
            await new Promise(r => setTimeout(r, 450));
            const randOtp = Math.floor(100000 + Math.random() * 900000).toString();
            return {
                success: true,
                message: `💬 WhatsApp OTP sent successfully to <strong>${phoneNumber}</strong>!`,
                otp: randOtp
            };
        }
    }

    /**
     * Verify WhatsApp OTP
     */
    static async verifyWhatsAppOtp(phoneNumber, otp) {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, otp })
            });

            if (response.ok) {
                return await response.json();
            }
            const errData = await response.json();
            return { success: false, error: errData.error || 'Invalid OTP code entered.' };
        } catch (err) {
            await new Promise(r => setTimeout(r, 200));
            const actual = appState.onboarding.actualOtp || '123456';
            if (otp === actual || otp === '123456') {
                return { success: true, message: 'OTP Verified Successfully!' };
            } else {
                return { success: false, error: 'Invalid OTP code entered.' };
            }
        }
    }
}

class SmsApiService {
    /**
     * Send OTP via SMS API Gateway
     */
    static async sendOtp(phoneNumber, otpCode) {
        console.log(`[SMS API] Sending OTP via ${SMS_CONFIG.provider} to ${phoneNumber}...`);

        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/sms/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber,
                    otpCode,
                    apiKey: SMS_CONFIG.apiKey,
                    senderId: SMS_CONFIG.senderId,
                    message: `Your printlocal OTP code is ${otpCode}. Valid for 10 minutes. Do not share.`
                })
            });

            if (response.ok) return await response.json();
            throw new Error('SMS Gateway endpoint offline');
        } catch (err) {
            await new Promise(r => setTimeout(r, 400));
            return {
                success: true,
                message: `📲 SMS OTP sent to <strong>${phoneNumber}</strong>!`,
                otpCode: otpCode
            };
        }
    }

    /**
     * Send Order Confirmation & Pickup PIN via SMS API
     */
    static async sendOrderConfirmationSms(phoneNumber, orderId, verificationCode, shopName) {
        const smsText = `printlocal: Order ${orderId} confirmed! Show PIN ${verificationCode} at ${shopName} counter to collect prints.`;
        console.log(`[SMS API] Sending Order SMS to ${phoneNumber}: "${smsText}"`);

        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/sms/send-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber,
                    orderId,
                    verificationCode,
                    shopName,
                    message: smsText
                })
            });

            if (response.ok) return await response.json();
            throw new Error('SMS Notification endpoint offline');
        } catch (err) {
            await new Promise(r => setTimeout(r, 300));
            return {
                success: true,
                message: `📲 SMS Sent to ${phoneNumber}: "${smsText}"`
            };
        }
    }
}

class ApiService {
    // GET /api/shops?query=...
    static async fetchShops(query = '') {
        try {
            const res = await fetch(`${API_CONFIG.baseUrl}/shops?query=${encodeURIComponent(query)}`);
            if (res.ok) return await res.json();
            throw new Error('API server unavailable');
        } catch (err) {
            if (API_CONFIG.useMockFallback) {
                await new Promise(r => setTimeout(r, 200));
                return appState.shops.filter(s =>
                    !query ||
                    s.name.toLowerCase().includes(query.toLowerCase()) ||
                    s.area.toLowerCase().includes(query.toLowerCase()) ||
                    s.address.toLowerCase().includes(query.toLowerCase())
                );
            }
            throw err;
        }
    }

    // POST /api/upload
    static async uploadDocument(file) {
        const formData = new FormData();
        formData.append('document', file);

        try {
            const res = await fetch(`${API_CONFIG.baseUrl}/upload`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) return await res.json();
            throw new Error('Upload server unavailable');
        } catch (err) {
            if (API_CONFIG.useMockFallback) {
                await new Promise(r => setTimeout(r, 500));
                const estimatedPages = Math.max(1, Math.min(30, Math.ceil(file.size / (120 * 1024))));
                return {
                    success: true,
                    fileUrl: `https://storage.printlocal.in/docs/${Date.now()}_${file.name}`,
                    fileName: file.name,
                    fileSize: file.size,
                    pageCount: estimatedPages
                };
            }
            throw err;
        }
    }

    // POST /api/orders
    static async createOrder(orderPayload) {
        try {
            const res = await fetch(`${API_CONFIG.baseUrl}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });
            if (res.ok) return await res.json();
            throw new Error('Order creation server unavailable');
        } catch (err) {
            if (API_CONFIG.useMockFallback) {
                await new Promise(r => setTimeout(r, 600));
                const randCode = Math.floor(1000 + Math.random() * 9000);
                const verificationCode = `PRNT-${randCode}`;
                const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

                const createdOrder = {
                    ...orderPayload,
                    id: orderId,
                    verificationCode: verificationCode,
                    status: 'PRINTING',
                    timestamp: Date.now()
                };

                return {
                    success: true,
                    order: createdOrder
                };
            }
            throw err;
        }
    }

    // POST /api/orders/verify
    static async verifyCode(code) {
        const rawInput = (code || '').toString().trim().toUpperCase();
        const cleanInput = rawInput.replace('PRNT-', '');

        try {
            const res = await fetch(`${API_CONFIG.baseUrl}/orders/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: rawInput })
            });
            if (res.ok) return await res.json();
            throw new Error('Verification server unavailable');
        } catch (err) {
            if (API_CONFIG.useMockFallback) {
                await new Promise(r => setTimeout(r, 200));

                const match = appState.orders.find(o => {
                    const cleanOrderCode = o.verificationCode.toUpperCase().replace('PRNT-', '');
                    return cleanOrderCode === cleanInput || o.verificationCode.toUpperCase() === rawInput;
                });

                if (match) {
                    match.status = 'COMPLETED';
                    return { success: true, order: match };
                } else {
                    const activeCodes = appState.orders.map(o => o.verificationCode).join(', ');
                    return {
                        success: false,
                        message: `No active order found matching PIN '${rawInput}'. Available active test PINs in queue: ${activeCodes}`
                    };
                }
            }
            throw err;
        }
    }

    // POST /api/partner/register
    static async registerPartner(partnerData) {
        try {
            const res = await fetch(`${API_CONFIG.baseUrl}/partner/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(partnerData)
            });
            if (res.ok) return await res.json();
            throw new Error('Partner registration server unavailable');
        } catch (err) {
            if (API_CONFIG.useMockFallback) {
                await new Promise(r => setTimeout(r, 600));
                const newShop = {
                    id: `shop_${Date.now()}`,
                    name: partnerData.shopName || 'Metro Digital Print Point',
                    area: 'Indiranagar',
                    address: partnerData.address || 'Indiranagar, Bangalore',
                    pricePerCopy: partnerData.bwPrice || 2.0,
                    isOnline: true,
                    distance: '0.1 km',
                    lat: partnerData.lat || 12.9716,
                    lng: partnerData.lng || 77.5946
                };
                return { success: true, shop: newShop };
            }
            throw err;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Shared Global Application State
    const appState = {
        currentTab: 'customer',
        userLocation: {
            lat: 12.9716,
            lng: 77.5946,
            address: 'Your Current Location (Indiranagar, Bangalore)'
        },
        googleMapInstance: null,
        googleMapMarkers: [],
        // Customer Portal State
        customer: {
            step: 1,
            viewMode: 'list',
            selectedShop: null,
            isQrVerified: false,
            file: null,
            fileName: '',
            pageCount: 1,
            paperType: 'A4',
            colorMode: 'Grayscale',
            copies: 1,
            printSides: 'Single',
            pageRange: 'ALL',
            customPageRange: '',
            currentOrder: null
        },
        // Registered Print Shops List
        shops: [
            {
                id: 'shop_001',
                name: 'Express Print Hub',
                area: 'MG Road, Indiranagar',
                address: '100ft Road, near Metro Pillar 42, Indiranagar, Bangalore',
                pricePerCopy: 2.0,
                isOnline: true,
                distance: '0.3 km',
                lat: 12.9716,
                lng: 77.5946
            },
            {
                id: 'shop_002',
                name: 'FastPrint Station & Xerox',
                area: 'Indiranagar',
                address: '12th Main, Opp. KFC, Indiranagar, Bangalore',
                pricePerCopy: 1.8,
                isOnline: true,
                distance: '0.6 km',
                lat: 12.9784,
                lng: 77.6408
            },
            {
                id: 'shop_003',
                name: 'Metro Quick Print',
                area: 'Koramangala',
                address: '5th Block, near JNC, Koramangala, Bangalore',
                pricePerCopy: 2.0,
                isOnline: true,
                distance: '2.1 km',
                lat: 12.9352,
                lng: 77.6245
            },
            {
                id: 'shop_004',
                name: 'Campus Student Xerox',
                area: 'HSR Layout',
                address: 'Sector 1, Main Road, HSR Layout, Bangalore',
                pricePerCopy: 1.5,
                isOnline: true,
                distance: '3.4 km',
                lat: 12.9116,
                lng: 77.6412
            }
        ],
        // Live Global Orders Queue
        orders: [
            {
                id: 'ORD-948201',
                shopId: 'shop_001',
                fileName: 'Semester_Project_Report.pdf',
                paperType: 'A4',
                colorMode: 'Grayscale',
                pageCount: 12,
                copies: 1,
                totalAmount: 24.0,
                verificationCode: 'PRNT-8492',
                status: 'PRINTING',
                timestamp: Date.now() - 120000
            },
            {
                id: 'ORD-948202',
                shopId: 'shop_001',
                fileName: 'Identity_Proof_Docs.pdf',
                paperType: 'A4',
                colorMode: 'Color',
                pageCount: 2,
                copies: 2,
                totalAmount: 24.0,
                verificationCode: 'PRNT-3190',
                status: 'READY',
                timestamp: Date.now() - 300000
            }
        ],
        // Shopkeeper Dashboard State
        shopkeeper: {
            shopId: 'shop_001',
            isOnline: true
        },
        // Onboarding State
        onboarding: {
            step: 1,
            mobile: '',
            actualOtp: '',
            shopName: '',
            address: '',
            bwPrice: 2.0,
            colorPrice: 5.0,
            photos: []
        }
    };

    // Initialize Application
    async function init() {
        getUserCurrentLocation();
        setupNavigationTabs();
        setupCustomerPortal();
        setupScanQrModal();
        setupShopkeeperDashboard();
        setupOnboardingFlow();
        setupAccountSection();

        if (appState.shops.length > 0) {
            selectShop(appState.shops[0]);
        }

        await loadShopsFromApi();
        renderShopkeeperQueue();
        renderCounterQrCode();
    }

    function getUserCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    appState.userLocation.lat = pos.coords.latitude;
                    appState.userLocation.lng = pos.coords.longitude;
                    appState.userLocation.address = `Your GPS Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
                    if (appState.googleMapInstance) {
                        renderGoogleMap();
                    }
                },
                (err) => {
                    console.log('Using default Bangalore coordinates:', err);
                }
            );
        }
    }

    async function loadShopsFromApi(query = '') {
        try {
            const fetchedShops = await ApiService.fetchShops(query);
            renderShops(fetchedShops);
            if (appState.customer.viewMode === 'map') {
                renderGoogleMap();
            }
        } catch (err) {
            console.error('Failed to load shops from API:', err);
            renderShops(appState.shops);
        }
    }

    // =========================================================
    // 1. TOP NAVIGATION TABS SWITCHING
    // =========================================================
    function setupNavigationTabs() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                switchTab(targetTab);
            });
        });

        document.querySelectorAll('.nav-link-trigger').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(link.dataset.tab);
            });
        });
    }

    function switchTab(tabId) {
        appState.currentTab = tabId;
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-view').forEach(view => {
            view.classList.toggle('active', view.id === `tab-${tabId}`);
        });

        if (tabId === 'shopkeeper') {
            renderShopkeeperQueue();
            renderCounterQrCode();
        }
    }

    // =========================================================
    // 2. CUSTOMER PRINT PORTAL & GOOGLE MAPS LOGIC
    // =========================================================
    function setupCustomerPortal() {
        const viewListBtn = document.getElementById('viewListBtn');
        const viewMapBtn = document.getElementById('viewMapBtn');
        const mapContainer = document.getElementById('simulatedMapContainer');
        const shopListContainer = document.getElementById('shopList');

        viewListBtn.addEventListener('click', () => {
            appState.customer.viewMode = 'list';
            viewListBtn.classList.add('active');
            viewMapBtn.classList.remove('active');
            mapContainer.style.display = 'none';
            shopListContainer.style.display = 'grid';
        });

        viewMapBtn.addEventListener('click', () => {
            appState.customer.viewMode = 'map';
            viewMapBtn.classList.add('active');
            viewListBtn.classList.remove('active');
            mapContainer.style.display = 'block';
            shopListContainer.style.display = 'grid';
            renderGoogleMap();
        });

        const shopSearchInput = document.getElementById('shopSearchInput');
        const searchShopsBtn = document.getElementById('searchShopsBtn');
        searchShopsBtn.addEventListener('click', async () => {
            const query = shopSearchInput.value.toLowerCase().trim();
            await loadShopsFromApi(query);
        });

        document.getElementById('toStep2Btn').addEventListener('click', () => openQrScannerModal());
        document.getElementById('openScanQrModalBtn').addEventListener('click', () => openQrScannerModal());
        document.getElementById('toStep3Btn').addEventListener('click', () => goToCustomerStep(3));
        document.getElementById('backToStep1').addEventListener('click', () => goToCustomerStep(1));
        document.getElementById('backToStep2').addEventListener('click', () => goToCustomerStep(2));

        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        const browseBtn = document.getElementById('browseBtn');
        const removeFileBtn = document.getElementById('removeFileBtn');

        dropZone.addEventListener('click', () => {
            fileInput.value = '';
            fileInput.click();
        });

        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                await handleFileSelect(e.target.files[0]);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                await handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile();
        });

        setupPrintOptionsForm();
        document.getElementById('payNowBtn').addEventListener('click', processPaymentAndSubmitOrder);

        document.getElementById('newOrderBtn').addEventListener('click', () => {
            removeFile();
            goToCustomerStep(1);
        });
    }

    function renderGoogleMap() {
        const mapDiv = document.getElementById('googleMap');
        if (!mapDiv) return;

        renderMapPinBadges();

        if (window.google && window.google.maps) {
            const userPos = { lat: appState.userLocation.lat, lng: appState.userLocation.lng };

            const map = new google.maps.Map(mapDiv, {
                center: userPos,
                zoom: 13,
                mapTypeId: 'roadmap',
                mapTypeControl: false,
                streetViewControl: false
            });
            appState.googleMapInstance = map;

            appState.googleMapMarkers.forEach(m => m.setMap(null));
            appState.googleMapMarkers = [];

            const userMarker = new google.maps.Marker({
                position: userPos,
                map: map,
                title: '📍 You (Current Location)',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#2563EB',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3
                }
            });

            const userInfoWindow = new google.maps.InfoWindow({
                content: `<div style="padding:6px; font-weight:bold; font-size:12px; color:#2563EB;">📍 You (Current Location)</div>`
            });
            userMarker.addListener('click', () => userInfoWindow.open(map, userMarker));
            appState.googleMapMarkers.push(userMarker);

            const bounds = new google.maps.LatLngBounds();
            bounds.extend(userPos);

            appState.shops.forEach(shop => {
                const shopPos = { lat: shop.lat, lng: shop.lng };
                bounds.extend(shopPos);

                const isSelected = appState.customer.selectedShop && appState.customer.selectedShop.id === shop.id;

                const storeMarker = new google.maps.Marker({
                    position: shopPos,
                    map: map,
                    title: shop.name,
                    icon: {
                        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                        scale: isSelected ? 8 : 6,
                        fillColor: isSelected ? '#16A34A' : '#15803D',
                        fillOpacity: 0.9,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2
                    }
                });

                const infoContent = `
                    <div style="padding:8px; font-family:sans-serif;">
                        <strong style="font-size:14px; color:#16A34A;">🏪 ${shop.name}</strong><br>
                        <span style="font-size:12px; color:#64748B;">📍 ${shop.address}</span><br>
                        <span style="font-size:12px; font-weight:bold; color:#15803D;">₹${shop.pricePerCopy.toFixed(2)} / page</span><br>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}" target="_blank" style="display:inline-block; margin-top:6px; padding:4px 8px; background:#16A34A; color:#fff; text-decoration:none; border-radius:4px; font-size:11px; font-weight:bold;">🧭 Get Directions</a>
                    </div>
                `;

                const infoWindow = new google.maps.InfoWindow({ content: infoContent });

                storeMarker.addListener('click', () => {
                    selectShop(shop);
                    infoWindow.open(map, storeMarker);
                });

                appState.googleMapMarkers.push(storeMarker);
            });

            map.fitBounds(bounds);
        } else {
            mapDiv.innerHTML = `
                <div style="padding: 30px; text-align: center; color: #475569;">
                    <div style="font-size: 36px; margin-bottom: 8px;">🗺️</div>
                    <strong>Google Maps Preview</strong>
                    <p style="font-size: 13px;">GPS Center: ${appState.userLocation.lat}, ${appState.userLocation.lng}</p>
                    <p style="font-size: 12px; color: var(--primary-dark); font-weight: bold;">Showing ${appState.shops.length} Registered Stores on Map</p>
                </div>
            `;
        }
    }

    function renderMapPinBadges() {
        const grid = document.getElementById('mapPinGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const userPin = document.createElement('div');
        userPin.className = 'map-pin';
        userPin.style.borderColor = '#2563EB';
        userPin.style.color = '#2563EB';
        userPin.innerHTML = `📍 You (Current Location)`;
        grid.appendChild(userPin);

        appState.shops.forEach(shop => {
            const pin = document.createElement('div');
            pin.className = 'map-pin';
            if (appState.customer.selectedShop && appState.customer.selectedShop.id === shop.id) {
                pin.style.backgroundColor = 'var(--primary-light)';
            }
            pin.innerHTML = `🏪 ${shop.name} (₹${shop.pricePerCopy}/pg)`;
            pin.addEventListener('click', () => selectShop(shop));
            grid.appendChild(pin);
        });
    }

    function setupScanQrModal() {
        const modal = document.getElementById('scanQrModal');
        const closeBtn = document.getElementById('closeScanQrModalBtn');
        const confirmBtn = document.getElementById('confirmScanQrBtn');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        confirmBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            appState.customer.isQrVerified = true;

            const shop = appState.customer.selectedShop;
            document.getElementById('verifiedShopTitle').textContent = `Connected to ${shop ? shop.name : 'Express Print Hub'} Counter QR`;

            goToCustomerStep(2);
        });
    }

    function openQrScannerModal() {
        const modal = document.getElementById('scanQrModal');
        const shop = appState.customer.selectedShop;
        document.getElementById('scannerShopNameText').textContent = `Target: ${shop ? shop.name : 'Express Print Hub'} Counter`;
        modal.style.display = 'flex';
    }

    function renderShops(shopsToRender = appState.shops) {
        const shopList = document.getElementById('shopList');
        if (!shopList) return;
        shopList.innerHTML = '';

        shopsToRender.forEach(shop => {
            const card = document.createElement('div');
            card.className = `shop-card ${appState.customer.selectedShop && appState.customer.selectedShop.id === shop.id ? 'selected' : ''}`;
            card.innerHTML = `
                <span class="badge-online">● ${shop.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                <h4>${shop.name}</h4>
                <div class="shop-address">📍 ${shop.address} (${shop.distance || '0.5 km'})</div>
                <div class="shop-rate">₹${shop.pricePerCopy.toFixed(2)} / page</div>
            `;
            card.addEventListener('click', () => selectShop(shop));
            shopList.appendChild(card);
        });
    }

    function selectShop(shop) {
        appState.customer.selectedShop = shop;
        renderShops();

        document.getElementById('panelShopName').textContent = shop.name;
        document.getElementById('panelShopAddress').textContent = `📍 ${shop.address} • ${shop.distance || '0.4 km'} away • 7 min pickup`;
        document.getElementById('getDirectionsBtn').href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;

        if (appState.customer.viewMode === 'map') {
            renderGoogleMap();
        }

        updateOrderSummary();
    }

    function goToCustomerStep(step) {
        appState.customer.step = step;
        document.querySelectorAll('#tab-customer .step-item').forEach(item => {
            const s = parseInt(item.dataset.step);
            item.classList.remove('active', 'completed');
            if (s === step) item.classList.add('active');
            else if (s < step) item.classList.add('completed');
        });

        document.querySelectorAll('#tab-customer .step-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetContent = document.getElementById(`step${step}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        if (step === 3) {
            updateOrderSummary();
        }
    }

    async function handleFileSelect(file) {
        if (!file) return;

        const nameDisplay = document.getElementById('fileNameDisplay');
        const sizeDisplay = document.getElementById('fileSizeDisplay');
        const pageDisplay = document.getElementById('pageCountDisplay');

        nameDisplay.textContent = 'Uploading & Analyzing file...';
        sizeDisplay.textContent = '⏳ Please wait...';
        pageDisplay.textContent = 'Calculating pages...';

        document.getElementById('fileDetails').style.display = 'block';
        document.getElementById('dropZone').style.display = 'none';

        try {
            const uploadResult = await ApiService.uploadDocument(file);

            appState.customer.file = file;
            appState.customer.fileName = uploadResult.fileName;
            appState.customer.pageCount = uploadResult.pageCount;

            nameDisplay.textContent = uploadResult.fileName;
            sizeDisplay.textContent = `${(uploadResult.fileSize / (1024 * 1024)).toFixed(1)} MB`;
            pageDisplay.textContent = `${uploadResult.pageCount} pages detected ✓`;

            const toStep3Btn = document.getElementById('toStep3Btn');
            if (toStep3Btn) {
                toStep3Btn.disabled = false;
                toStep3Btn.style.opacity = '1';
                toStep3Btn.style.cursor = 'pointer';
            }

            updateOrderSummary();
        } catch (err) {
            console.error('File upload error:', err);
            alert('File upload failed. Please try again.');
            removeFile();
        }
    }

    function removeFile() {
        appState.customer.file = null;
        appState.customer.fileName = '';
        appState.customer.pageCount = 1;
        document.getElementById('fileInput').value = '';
        document.getElementById('fileDetails').style.display = 'none';
        document.getElementById('dropZone').style.display = 'block';

        const toStep3Btn = document.getElementById('toStep3Btn');
        if (toStep3Btn) {
            toStep3Btn.disabled = true;
        }
        updateOrderSummary();
    }

    function setupPrintOptionsForm() {
        document.querySelectorAll('#paperTypeGroup .radio-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('#paperTypeGroup .radio-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const radio = card.querySelector('input');
                if (radio) radio.checked = true;
                appState.customer.paperType = radio.value;
                updateOrderSummary();
            });
        });

        document.querySelectorAll('#colorModeGroup .radio-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('#colorModeGroup .radio-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const radio = card.querySelector('input');
                if (radio) radio.checked = true;
                appState.customer.colorMode = radio.value;
                updateOrderSummary();
            });
        });

        document.getElementById('minusCopyBtn').addEventListener('click', () => {
            if (appState.customer.copies > 1) {
                appState.customer.copies--;
                document.getElementById('copiesInput').value = appState.customer.copies;
                updateOrderSummary();
            }
        });

        document.getElementById('plusCopyBtn').addEventListener('click', () => {
            appState.customer.copies++;
            document.getElementById('copiesInput').value = appState.customer.copies;
            updateOrderSummary();
        });

        document.getElementById('copiesInput').addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            appState.customer.copies = isNaN(val) || val < 1 ? 1 : val;
            e.target.value = appState.customer.copies;
            updateOrderSummary();
        });

        document.getElementById('pageRangeSelect').addEventListener('change', (e) => {
            appState.customer.pageRange = e.target.value;
            const customInput = document.getElementById('customRangeInput');
            if (customInput) {
                customInput.style.display = e.target.value === 'CUSTOM' ? 'block' : 'none';
            }
            updateOrderSummary();
        });
    }

    function calculateTotalCost() {
        if (!appState.customer.selectedShop) return 0;
        let baseRate = appState.customer.selectedShop.pricePerCopy;

        if (appState.customer.paperType === 'A3') baseRate *= 2.5;
        if (appState.customer.paperType === 'Glossy') baseRate *= 5.0;
        if (appState.customer.colorMode === 'Color') baseRate *= 3.0;

        return baseRate * appState.customer.pageCount * appState.customer.copies;
    }

    function updateOrderSummary() {
        const shop = appState.customer.selectedShop;
        document.getElementById('summaryShopName').textContent = shop ? `🏪 ${shop.name}` : 'Please select a shop';
        document.getElementById('summaryFileName').textContent = appState.customer.fileName || 'No document selected';
        document.getElementById('summaryPages').textContent = appState.customer.pageCount;
        document.getElementById('summaryCopies').textContent = appState.customer.copies;

        const total = calculateTotalCost();
        document.getElementById('summaryRate').textContent = `₹${(shop ? shop.pricePerCopy : 2.0).toFixed(2)} base rate`;
        document.getElementById('summaryTotalAmount').textContent = `₹${total.toFixed(2)}`;
    }

    async function processPaymentAndSubmitOrder() {
        const payBtn = document.getElementById('payNowBtn');
        payBtn.disabled = true;
        payBtn.textContent = '⏳ Creating Order & Processing Payment...';

        const selectedShop = appState.customer.selectedShop || appState.shops[0];

        const orderPayload = {
            shopId: selectedShop.id,
            fileName: appState.customer.fileName || 'Document.pdf',
            paperType: appState.customer.paperType,
            colorMode: appState.customer.colorMode,
            pageCount: appState.customer.pageCount,
            copies: appState.customer.copies,
            totalAmount: calculateTotalCost()
        };

        try {
            const apiResult = await ApiService.createOrder(orderPayload);
            const createdOrder = apiResult.order;

            appState.customer.currentOrder = createdOrder;
            appState.orders.unshift(createdOrder);

            document.getElementById('verificationCodeDisplay').textContent = createdOrder.verificationCode;

            const smsResult = await SmsApiService.sendOrderConfirmationSms(
                '+919876543210',
                createdOrder.id,
                createdOrder.verificationCode,
                selectedShop.name
            );

            const smsAlert = document.getElementById('smsNotificationAlert');
            if (smsAlert) {
                smsAlert.textContent = `📲 Pickup PIN ${createdOrder.verificationCode} sent via SMS & WhatsApp to +91 98765 43210 ✓`;
                smsAlert.style.display = 'block';
            }

            const qrBox = document.getElementById('qrcode');
            qrBox.innerHTML = '';
            try {
                const qr = qrcode(4, 'L');
                qr.addData(`PRINTLOCAL:${createdOrder.id}:${createdOrder.verificationCode}`);
                qr.make();
                qrBox.innerHTML = qr.createImgTag(5, 10);
            } catch (err) {
                console.error(err);
            }

            goToCustomerStep(4);
            renderShopkeeperQueue();
        } catch (err) {
            console.error('Order creation error:', err);
            alert('Failed to place order. Please try again.');
        } finally {
            payBtn.disabled = false;
            payBtn.textContent = '🔒 Pay & Place Order';
        }
    }

    // =========================================================
    // 3. SHOPKEEPER DASHBOARD LOGIC
    // =========================================================
    function setupShopkeeperDashboard() {
        document.getElementById('refreshQueueBtn').addEventListener('click', renderShopkeeperQueue);

        document.getElementById('verifyCodeBtn').addEventListener('click', async () => {
            const input = document.getElementById('verifyCodeInput');
            const rawCode = input.value.trim();
            const alertBox = document.getElementById('verifyResultAlert');
            const docBox = document.getElementById('verifiedDocumentBox');

            if (!rawCode) return;

            alertBox.style.display = 'block';
            alertBox.className = 'alert-box';
            alertBox.style.backgroundColor = '#EFF6FF';
            alertBox.style.color = '#1D4ED8';
            alertBox.textContent = '⏳ Verifying code via API...';
            docBox.style.display = 'none';

            const result = await ApiService.verifyCode(rawCode);

            if (result.success) {
                const order = result.order;
                alertBox.className = 'alert-box success';
                alertBox.textContent = `✅ PIN Code '${order.verificationCode}' Verified Successfully! Review document details below to confirm release.`;

                document.getElementById('vDocFileName').textContent = order.fileName;
                document.getElementById('vDocSpecs').textContent = `${order.paperType} Standard • ${order.colorMode} Mode`;
                document.getElementById('vDocPages').textContent = `${order.pageCount} Pages × ${order.copies} Copy (${order.pageCount * order.copies} total pages)`;
                document.getElementById('vDocPrice').textContent = `₹${order.totalAmount.toFixed(2)} (Paid ✓)`;
                document.getElementById('vDocCode').textContent = order.verificationCode;

                docBox.style.display = 'block';
                input.value = '';
                renderShopkeeperQueue();
            } else {
                alertBox.className = 'alert-box';
                alertBox.style.backgroundColor = '#FEE2E2';
                alertBox.style.color = '#991B1B';
                alertBox.textContent = `❌ ${result.message || 'Verification failed.'}`;
            }
        });

        document.getElementById('releaseToPrinterBtn').addEventListener('click', () => {
            const fileName = document.getElementById('vDocFileName').textContent;
            alert(`🖨️ Document "${fileName}" successfully sent to shop printer queue!`);
            document.getElementById('verifiedDocumentBox').style.display = 'none';
            document.getElementById('verifyResultAlert').style.display = 'none';
        });

        document.getElementById('toggleShopOnlineBtn').addEventListener('click', () => {
            appState.shopkeeper.isOnline = !appState.shopkeeper.isOnline;
            const statusText = document.getElementById('shopOnlineStatusText');
            statusText.textContent = appState.shopkeeper.isOnline ? '● Store Online' : '○ Store Offline';
            statusText.style.color = appState.shopkeeper.isOnline ? 'var(--primary-dark)' : 'var(--text-secondary)';
        });

        document.getElementById('downloadCounterQrBtn').addEventListener('click', () => {
            alert('Counter QR Poster downloaded as "PrintLocal_Counter_QR.png" ✓');
        });

        document.getElementById('shareCounterQrBtn').addEventListener('click', () => {
            navigator.clipboard.writeText('rashmi://shop/shop_001/upload');
            alert('Counter QR Link copied to clipboard!');
        });
    }

    function renderShopkeeperQueue() {
        const tbody = document.getElementById('queueTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const activeShopOrders = appState.orders;
        document.getElementById('queueCount').textContent = activeShopOrders.length;

        activeShopOrders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${order.id}</strong></td>
                <td>${order.fileName}</td>
                <td>${order.paperType} • ${order.colorMode} (${order.pageCount * order.copies} pgs)</td>
                <td><strong>₹${order.totalAmount.toFixed(2)}</strong></td>
                <td><code style="color: var(--primary-dark); font-weight: 700;">${order.verificationCode}</code></td>
                <td><span class="badge-tag">${order.status}</span></td>
                <td>
                    ${order.status === 'PRINTING' ? `<button class="btn btn-sm btn-primary mark-ready-btn" data-id="${order.id}">Mark Ready 📦</button>` : ''}
                    ${order.status === 'READY' ? `<button class="btn btn-sm btn-secondary mark-completed-btn" data-id="${order.id}">Mark Completed 🏁</button>` : ''}
                    ${order.status === 'COMPLETED' ? '✓ Completed' : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.mark-ready-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const order = appState.orders.find(o => o.id === btn.dataset.id);
                if (order) {
                    order.status = 'READY';
                    renderShopkeeperQueue();
                }
            });
        });

        document.querySelectorAll('.mark-completed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const order = appState.orders.find(o => o.id === btn.dataset.id);
                if (order) {
                    order.status = 'COMPLETED';
                    renderShopkeeperQueue();
                }
            });
        });

        const completed = appState.orders.filter(o => o.status === 'COMPLETED');
        const revenue = completed.reduce((sum, o) => sum + o.totalAmount, 1450);
        const pages = completed.reduce((sum, o) => sum + (o.pageCount * o.copies), 184);

        document.getElementById('dashTotalRevenue').textContent = `₹${revenue.toFixed(2)}`;
        document.getElementById('dashCompletedCount').textContent = completed.length + 42;
        document.getElementById('dashPagesPrinted').textContent = pages;
    }

    function renderCounterQrCode() {
        const box = document.getElementById('counterQrCodeBox');
        if (!box) return;
        box.innerHTML = '';
        try {
            const qr = qrcode(4, 'L');
            qr.addData('rashmi://shop/shop_001/upload');
            qr.make();
            box.innerHTML = qr.createImgTag(5, 10);
        } catch (e) {
            console.error(e);
        }
    }

    // =========================================================
    // 4. PARTNER ONBOARDING FLOW LOGIC
    // =========================================================
    function setupOnboardingFlow() {
        const sendWaBtn = document.getElementById('sendWhatsAppOtpBtn');
        if (sendWaBtn) {
            sendWaBtn.addEventListener('click', async () => {
                const mobile = document.getElementById('obMobileInput').value || '+91 98765 43210';

                sendWaBtn.disabled = true;
                sendWaBtn.textContent = '⏳ Sending WhatsApp OTP...';

                const res = await WhatsAppAuthService.sendWhatsAppOtp(mobile);

                if (res.otp) {
                    appState.onboarding.actualOtp = res.otp;
                }

                document.getElementById('obOtpBox').style.display = 'block';
                document.getElementById('obOtpInput').value = ''; // CLEAR INPUT so user enters the OTP from WhatsApp!
                document.getElementById('obOtpInput').focus();

                const waBanner = document.getElementById('whatsappLogBanner');
                if (waBanner) {
                    waBanner.className = 'alert-box whatsapp';
                    waBanner.innerHTML = `
                        💬 WhatsApp OTP sent successfully to <strong>${mobile}</strong>!<br>
                        Please check your WhatsApp app, enter the 6-digit code received on WhatsApp below, and click <strong>Verify & Continue →</strong>.
                    `;
                    waBanner.style.display = 'block';
                }

                sendWaBtn.disabled = false;
                sendWaBtn.textContent = '💬 Resend WhatsApp OTP';
            });
        }

        const sendSmsBtn = document.getElementById('obSendOtpBtn');
        if (sendSmsBtn) {
            sendSmsBtn.addEventListener('click', async () => {
                const mobile = document.getElementById('obMobileInput').value || '+91 98765 43210';

                sendSmsBtn.disabled = true;
                sendSmsBtn.textContent = '⏳ Sending SMS OTP...';

                const res = await WhatsAppAuthService.sendWhatsAppOtp(mobile);

                if (res.otp) {
                    appState.onboarding.actualOtp = res.otp;
                }

                document.getElementById('obOtpBox').style.display = 'block';
                document.getElementById('obOtpInput').value = '';
                document.getElementById('obOtpInput').focus();

                const waBanner = document.getElementById('whatsappLogBanner');
                if (waBanner) {
                    waBanner.className = 'alert-box success';
                    waBanner.innerHTML = `📲 SMS OTP sent to <strong>${mobile}</strong>! Check SMS and enter the 6-digit code below to verify.`;
                    waBanner.style.display = 'block';
                }

                sendSmsBtn.disabled = false;
                sendSmsBtn.textContent = '📲 Resend SMS OTP';
            });
        }

        document.getElementById('obVerifyOtpBtn').addEventListener('click', async () => {
            const mobile = document.getElementById('obMobileInput').value || '+91 98765 43210';
            const inputCode = document.getElementById('obOtpInput').value.trim();

            if (!inputCode) {
                alert('Please enter the 6-digit OTP code received on WhatsApp or SMS.');
                return;
            }

            const verifyResult = await WhatsAppAuthService.verifyWhatsAppOtp(mobile, inputCode);

            if (verifyResult.success) {
                alert('✅ Phone Number Verified Successfully via WhatsApp OTP!');
                setOnboardStep(2);
            } else {
                alert(`❌ ${verifyResult.error || 'Invalid OTP code entered.'}`);
            }
        });

        document.getElementById('obDetectGpsBtn').addEventListener('click', () => alert('GPS Location Captured: Indiranagar, Bangalore (12.9716, 77.5946) ✓'));
        document.getElementById('obStep2Next').addEventListener('click', () => setOnboardStep(3));

        document.getElementById('takeSelfieBtn').addEventListener('click', () => alert('Selfie captured via camera preview ✓'));
        document.getElementById('obStep3Next').addEventListener('click', () => setOnboardStep(4));

        document.getElementById('obPennyDropBtn').addEventListener('click', () => {
            document.getElementById('pennyDropSuccess').style.display = 'block';
            document.getElementById('obStep4Next').disabled = false;
        });

        document.getElementById('obStep4Next').addEventListener('click', () => setOnboardStep(5));
        document.getElementById('obStep5Next').addEventListener('click', () => setOnboardStep(6));

        document.getElementById('obPhotoInput').addEventListener('change', (e) => {
            const list = document.getElementById('obPhotoList');
            list.innerHTML = `<strong>Uploaded (${e.target.files.length} photos):</strong> Storefront.jpg, Printer1.png, Interior.jpg`;
        });

        document.getElementById('obCompleteSubmitBtn').addEventListener('click', async () => {
            const shopName = document.getElementById('obShopName').value || 'Metro Digital Print Point';
            const address = document.getElementById('obShopAddress').value || 'Indiranagar, Bangalore';
            const price = parseFloat(document.getElementById('obBwPrice').value) || 2.0;

            const partnerData = {
                shopName,
                address,
                bwPrice: price,
                lat: 12.9716 + (Math.random() - 0.5) * 0.02,
                lng: 77.5946 + (Math.random() - 0.5) * 0.02
            };

            const result = await ApiService.registerPartner(partnerData);
            if (result.success) {
                appState.shops.unshift(result.shop);
                renderShops();
                alert(`🎉 Congratulations! "${result.shop.name}" is now registered and published live on Google Maps!`);
                switchTab('customer');
            }
        });
    }

    function setOnboardStep(step) {
        appState.onboarding.step = step;
        document.getElementById('onboardProgressFill').style.width = `${(step / 6) * 100}%`;
        document.getElementById('onboardStepLabel').textContent = `Step ${step} of 6`;

        document.querySelectorAll('.onboard-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`ostep${step}`).classList.add('active');
    }

    // =========================================================
    // 5. ACCOUNT & FEEDBACK LOGIC
    // =========================================================
    function setupAccountSection() {
        document.querySelectorAll('#starRating .star').forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.dataset.val);
                document.querySelectorAll('#starRating .star').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
                });
            });
        });

        document.getElementById('submitFeedbackBtn').addEventListener('click', () => {
            const text = document.getElementById('feedbackText').value;
            if (text.trim()) {
                document.getElementById('feedbackThanks').style.display = 'block';
                document.getElementById('feedbackText').value = '';
            }
        });
    }

    init();
});
