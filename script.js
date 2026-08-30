let products = [];
// ضع معرّف جدول بيانات جوجل الخاص بك هنا (Spreadsheet ID)
// مثلاً إذا كان الرابط: https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F/edit
// فالمعرف هو: 1A2B3C4D5E6F
const SHEET_ID = '1o-StXqzi9SmOMcMj50vkRroFDBR3k75JjhQr-Zop4WI'; 

async function fetchProductsFromSheet() {
    const loadingEl = document.getElementById('loadingProducts');
    
    if (SHEET_ID === 'YOUR_SHEET_ID_HERE') {
        if (loadingEl) loadingEl.innerHTML = '<p style="color:var(--primary); font-size:1.1rem; line-height:1.6;">يرجى إضافة معرّف Google Sheet في ملف script.js لعرض المنتجات.</p>';
        return;
    }
    
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        
        // Remove the gviz prefix/suffix to get pure JSON
        const jsonString = text.substring(47).slice(0, -2);
        const data = JSON.parse(jsonString);
        
        const rows = data.table.rows;
        
        products = rows.map(row => {
            // Helper to get cell value safely based on column index
            const getVal = (index) => {
                if (!row.c || !row.c[index]) return '';
                return row.c[index].f ? row.c[index].f : row.c[index].v;
            };
            
            const rawImages = getVal(6) ? String(getVal(6)) : '';
            const imagesArray = rawImages.split(/[,\n]+/).map(url => url.trim()).filter(url => url);
            const mainImage = imagesArray.length > 0 ? imagesArray[0] : '';
            
            return {
                id: getVal(0),
                name: getVal(1),
                category: getVal(2),
                categoryName: getVal(3),
                price: getVal(4),
                desc: getVal(5),
                image: mainImage,
                images: imagesArray
            };
        }).filter(p => p.id && p.name && String(p.id).toLowerCase() !== 'id'); // Filter out empty rows
        
        // Remove loading state and render
        if (loadingEl) loadingEl.style.display = 'none';
        renderCategories();
        renderProducts();
        fetchReviewsFromSheet();
    } catch (error) {
        console.error('Error fetching products:', error);
        if (loadingEl) loadingEl.innerHTML = '<p style="color:red; font-size:1.1rem; line-height:1.6;">حدث خطأ أثناء تحميل المنتجات. تأكد من صحة الرابط وأن الملف متاح للجميع (Anyone with the link).</p>';
    }
}

const productsGrid = document.getElementById('productsGrid');
const categoryFiltersContainer = document.getElementById('categoryFilters');
let filterBtns = [];
// DOM Elements
let cartItems = [];
const cartCountElement = document.querySelector('.cart-count');
let cartCount = 0;
const YER_EXCHANGE_RATE = 420;     // متغير يتم فيه تخزين قيمة الصرف المطلوبة للريال السعودي بما يقابله من الريال اليمني

let favItems = JSON.parse(localStorage.getItem('favItems')) || [];
const ORDERS_API_URL = "https://script.google.com/macros/s/AKfycbyMab8vi_Q7-FhkQ0FGo5EriSTlokQJ1gNL9FHdM084GhcHrc4rzhkTCX9D-pbu5xRfWQ/exec";
const favCountElement = document.querySelector('.fav-count');

// Pagination logic
const ITEMS_PER_PAGE = 20;
let currentDisplayedCount = ITEMS_PER_PAGE;
let currentFilter = 'all';
let currentSearchQuery = '';
let renderTimeout;

// Search Logic
window.handleSearch = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentSearchQuery = searchInput.value.toLowerCase().trim();
        renderProducts(currentFilter, false);
    }
};

// Render Categories Dynamically
function renderCategories() {
    if (!categoryFiltersContainer) return;
    
    // Extract unique categories
    const uniqueCategories = [];
    products.forEach(p => {
        if (!uniqueCategories.find(c => c.id === p.category)) {
            uniqueCategories.push({ id: p.category, name: p.categoryName });
        }
    });
    
    // Build HTML
    let html = `<button class="filter-btn active" data-filter="all">الكل</button>`;
    uniqueCategories.forEach(cat => {
        html += `<button class="filter-btn" data-filter="${cat.id}">${cat.name}</button>`;
    });
    
    categoryFiltersContainer.innerHTML = html;
    
    // Reattach listeners
    filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(btn.dataset.filter);
        });
    });
}

// Render Products
function renderProducts(filter = 'all', append = false) {
    if (!append) {
        productsGrid.innerHTML = '';
        currentDisplayedCount = ITEMS_PER_PAGE;
        currentFilter = filter;
        // Add simple fade out/in effect
        productsGrid.style.opacity = '0';
    }
    
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    
    renderTimeout = setTimeout(() => {
        let filteredProducts = filter === 'all' 
            ? products 
            : products.filter(p => p.category === filter);
            
        if (currentSearchQuery) {
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(currentSearchQuery) || 
                p.desc.toLowerCase().includes(currentSearchQuery)
            );
        }
            
        const productsToShow = filteredProducts.slice(append ? currentDisplayedCount - ITEMS_PER_PAGE : 0, currentDisplayedCount);
        
        productsToShow.forEach(product => {
            let imageHtml = '';
            if (product.images && product.images.length > 1) {
                const imgTags = product.images.map((imgUrl, idx) => 
                    `<img src="${imgUrl}" alt="${product.name}" class="product-image slide-${idx} ${idx === 0 ? 'active' : 'hidden'}">`
                ).join('');
                
                imageHtml = `
                    <div class="product-slider" data-current="0" data-total="${product.images.length}">
                        ${imgTags}
                        <div class="slider-arrow right-arrow" onclick="changeSlide(event, '${product.id}', 1)">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="slider-arrow left-arrow" onclick="changeSlide(event, '${product.id}', -1)">
                            <i class="fas fa-chevron-left"></i>
                        </div>
                    </div>
                `;
            } else {
                imageHtml = `<img src="${product.image}" alt="${product.name}" class="product-image">`;
            }

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image-container" id="slider-container-${product.id}">
                    ${imageHtml}
                </div>
                <div class="product-favorite ${favItems.includes(product.id) ? 'active' : ''}" data-id="${product.id}" onclick="toggleFavorite(this, '${product.id}')" aria-label="إضافة المنتج للمفضلة" title="إضافة المنتج للمفضلة">
                    <i class="fas fa-heart"></i>
                </div>
                <span class="product-category">${product.categoryName}</span>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.desc}</p>
                    <div class="product-price-container">
                        <span class="product-price">${product.price} ر.س</span>
                        <span class="product-price-yer" style="display:block; font-size:0.85rem; color:#888; margin-top:4px;">(${(parseFloat(`${product.price}`.replace(/[^0-9.]/g, '')) * YER_EXCHANGE_RATE).toLocaleString('en-US')} ر.ي)</span>
                    </div>
                                        <div class="product-actions">
                        <button class="btn-cart" onclick="addToCart(this, '${product.id}')" aria-label="أضف للسلة">
                            إضافة للسلة <i class="fas fa-cart-plus"></i>
                        </button>
                        <button class="btn-order" onclick="openOrderModal('${product.id}', '${product.name}', '${product.price}')" aria-label="طلب منتج">
                            طلب منتج <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="btn-review" onclick="openReviewModal('${product.id}', '${product.name.replace("'", "\\'")}')" aria-label="تقييم">
                            تقييم <i class="fas fa-star"></i>
                        </button>
                    </div>
                </div>
            `;
            productsGrid.appendChild(card);
        });
        
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (loadMoreContainer) {
            if (currentDisplayedCount < filteredProducts.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
        
        if (!append) {
            productsGrid.style.transition = 'opacity 0.4s ease';
            productsGrid.style.opacity = '1';
        }
    }, append ? 0 : 200);
}

window.loadMoreProducts = function() {
    currentDisplayedCount += ITEMS_PER_PAGE;
    renderProducts(currentFilter, true);
};

// Initial fetch and render
fetchProductsFromSheet();

// Add to Cart Animation and Logic
window.addToCart = function(btnElement, productId) {
    const product = products.find(p => p.id == productId);
    
    // Check if already in cart
    const existingItem = cartItems.find(item => item.id == productId);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cartItems.push({
            ...product,
            qty: 1
        });
    }
    
    updateCartBadge();
    showToast();
    
    // Simple button feedback
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fas fa-check"></i>';
    btnElement.style.background = 'var(--primary)';
    btnElement.style.color = 'white';
    
    setTimeout(() => {
        btnElement.innerHTML = originalHtml;
        btnElement.style.background = '';
        btnElement.style.color = '';
    }, 1000);
};

window.changeSlide = function(event, productId, direction) {
    event.stopPropagation();
    const container = document.getElementById(`slider-container-${productId}`);
    if (!container) return;
    const slider = container.querySelector('.product-slider');
    if (!slider) return;
    
    let current = parseInt(slider.getAttribute('data-current'));
    const total = parseInt(slider.getAttribute('data-total'));
    
    const images = slider.querySelectorAll('.product-image');
    images[current].classList.remove('active');
    images[current].classList.add('hidden');
    
    current = (current + direction + total) % total;
    
    images[current].classList.remove('hidden');
    images[current].classList.add('active');
    
    slider.setAttribute('data-current', current);
};

function updateCartBadge() {
    const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0);
    cartCountElement.textContent = totalQty;
    // Animate cart badge
    cartCountElement.style.transform = 'scale(1.3)';
    setTimeout(() => {
        cartCountElement.style.transform = 'scale(1)';
    }, 200);
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.className = 'toast show';
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

// Favorites Logic
window.toggleFavorite = function(btnElement, productId) {
    if (favItems.includes(productId)) {
        favItems = favItems.filter(id => id !== productId);
        btnElement.classList.remove('active');
    } else {
        favItems.push(productId);
        btnElement.classList.add('active');
        
        // Simple animation
        btnElement.style.transform = 'scale(1.3)';
        setTimeout(() => btnElement.style.transform = '', 200);
    }
    
    favCountElement.textContent = favItems.length;
    favCountElement.style.transform = 'scale(1.3)';
    setTimeout(() => {
        favCountElement.style.transform = 'scale(1)';
    }, 200);
    
    // If the modal is open, re-render it
    if (document.getElementById('favModal').classList.contains('show')) {
        renderFavItems();
    }
};

// Favorites Modal Logic
const favModal = document.getElementById('favModal');
const favItemsContainer = document.getElementById('favItemsContainer');

window.openFavModal = function() {
    renderFavItems();
    favModal.classList.add('show');
};

window.closeFavModal = function() {
    favModal.classList.remove('show');
};

window.renderFavItems = function() {
    favItemsContainer.innerHTML = '';
    
    if (favItems.length === 0) {
        favItemsContainer.innerHTML = '<p class="empty-fav-msg">لا توجد منتجات في المفضلة حالياً</p>';
        return;
    }
    
    favItems.forEach(id => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'fav-item';
        itemEl.innerHTML = `
            <div class="fav-item-info">
                <img src="${product.image}" alt="${product.name}" class="fav-item-img">
                <div class="fav-item-details">
                    <h4>${product.name}</h4>
                    <div class="fav-item-price">${product.price} ر.س <span style="font-size:0.8rem; color:#888;">(${(parseFloat(product.price.replace(/[^0-9.]/g, '')) * YER_EXCHANGE_RATE).toLocaleString('en-US')} ر.ي)</span></div>
                </div>
            </div>
            <div class="fav-item-actions">
                <button type="button" class="btn-fav-order" title="طلب المنتج" onclick="openOrderFromFav('${product.id}', '${product.name}', '${product.price}')">
                    <i class="fab fa-whatsapp"></i>
                </button>
                <button type="button" class="btn-fav-remove" title="إزالة من المفضلة" onclick="removeFavoriteFromModal('${product.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        favItemsContainer.appendChild(itemEl);
    });
};

window.removeFavoriteFromModal = function(productId) {
    const prodIdStr = String(productId);
    favItems = favItems.filter(id => String(id) !== prodIdStr);
    favCountElement.textContent = favItems.length;
    
    // Update the heart icon on the main grid directly without re-rendering
    const heartIcon = document.querySelector(`.product-favorite[data-id="${prodIdStr}"]`);
    if (heartIcon) {
        heartIcon.classList.remove('active');
    }
    
    renderFavItems();
};

window.openOrderFromFav = function(productId, productName, productPrice) {
    closeFavModal();
    openOrderModal(productId, productName, productPrice);
};

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        nav.style.padding = '1rem 5%';
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
    } else {
        nav.style.padding = '1.5rem 5%';
        nav.style.background = 'rgba(255, 255, 255, 0.85)';
    }
});

const modal = document.getElementById('orderModal');
const modalProductName = document.getElementById('modalProductName');
const modalProductId = document.getElementById('modalProductId');
const modalRawPrice = document.getElementById('modalRawPrice');
const modalProductPrice = document.getElementById('modalProductPrice');
const productQuantity = document.getElementById('productQuantity');
const modalTotalPrice = document.getElementById('modalTotalPrice');
const orderForm = document.getElementById('orderForm');

window.openOrderModal = function(id, name, priceStr) {
    modalProductId.value = id;
    modalProductName.textContent = name;
    
    // Extract the numeric part of the price for calculation
    const numericPrice = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    modalRawPrice.value = numericPrice;
    
    modalProductPrice.textContent = priceStr;
    productQuantity.value = 1; // reset to 1
    
    calculateTotal();
    
    modal.classList.add('show');
};

window.toggleDeliveryOptions = function(type) {
    const inputs = document.getElementsByName(type === 'order' ? 'deliveryMethod' : 'cartDeliveryMethod');
    let selected = '';
    for(let i of inputs) if(i.checked) selected = i.value;
    
    const pInfo = document.getElementById('pickupInfo_' + type);
    const dInfo = document.getElementById('deliveryInfo_' + type);
    if (selected === 'pickup') {
        if(pInfo) pInfo.classList.remove('hidden');
        if(dInfo) dInfo.classList.add('hidden');
    } else if (selected === 'delivery') {
        if(pInfo) pInfo.classList.add('hidden');
        if(dInfo) dInfo.classList.remove('hidden');
    }
    if (type === 'order') calculateTotal();
    else calculateCartTotal();
};

window.calculateTotal = function() {
    const qty = parseInt(productQuantity.value) || 1;
    const price = parseFloat(modalRawPrice.value) || 0;
    
    let isDelivery = false;
    const inputs = document.getElementsByName('deliveryMethod');
    for(let i of inputs) if(i.checked && i.value === 'delivery') isDelivery = true;
    
    let fee = 0;
    if (isDelivery) {
        const area = document.getElementById('deliveryArea');
        if (area && area.options[area.selectedIndex]) {
            fee = parseFloat(area.options[area.selectedIndex].getAttribute('data-fee')) || 0;
        }
    }
    
    const productsTotalSAR = qty * price;
    let html = productsTotalSAR + " ر.س <span style='font-size:0.85rem; color:#888; display:block; margin-top:4px;'>(" + (productsTotalSAR * YER_EXCHANGE_RATE).toLocaleString('en-US') + " ر.ي)</span>";
    
    if (fee > 0) {
        const feeYER = (fee * YER_EXCHANGE_RATE).toLocaleString('en-US');
        html += `<div style="font-size:0.9rem; color:#d63384; margin-top:8px; font-weight:bold;">+ التوصيل: ${feeYER} ر.ي</div>`;
    }
    
    modalTotalPrice.innerHTML = html;
};

window.closeModal = function() {
    modal.classList.remove('show');
    orderForm.reset();
};

window.submitOrder = function(event) {
    event.preventDefault();
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const qty = document.getElementById('productQuantity').value;
    const product = products.find(p => p.id == modalProductId.value);
    
    if (name.split(/\s+/).length < 2) {
        alert("يرجى ادخال اسمك الكريم كاملاً لتسهيل توصيل الطلب");
        return;
    }
    if (!product) return;
    
    let isDelivery = false;
    let selectedMethod = '';
    const inputs = document.getElementsByName('deliveryMethod');
    for(let i of inputs) if(i.checked) selectedMethod = i.value;
    
    if (!selectedMethod) {
        alert("يرجى اختيار طريقة الاستلام");
        return;
    }
    
    isDelivery = selectedMethod === 'delivery';
    
    let areaText = '';
    let mapsLink = '';
    let fee = 0;
    
    if (isDelivery) {
        const area = document.getElementById('deliveryArea');
        if (!area.value) {
            alert("يرجى اختيار المنطقة");
            return;
        }
        areaText = area.value;
        fee = parseFloat(area.options[area.selectedIndex].getAttribute('data-fee')) || 0;
        mapsLink = document.getElementById('googleMapsLink').value.trim();
        if(!mapsLink) {
            alert("يرجى تحديد الموقع عبر خرائط جوجل");
            return;
        }
    }
    
    const numericPrice = parseFloat(product.price.replace(/[^0-9.]/g, ''));
    const total = (numericPrice * parseInt(qty)) + fee;
    
    let methodText = isDelivery ? 'توصيل للبيت' : 'عبر النقطة';
    let addressInfo = isDelivery ? `\nالمنطقة: ${areaText}\nرسوم التوصيل: ${fee} ر.س\nرابط خرائط جوجل: ${mapsLink}` : '';
    
    const targetPhone = "967778540339";
    const message = `مرحباً، أود طلب هذا المنتج:%0A%0Aرقم المنتج: ${product.id}%0Aاسم المنتج: ${product.name}%0Aالكمية: ${qty}%0Aسعر الطلب: ${total} ر.س%0A%0Aبيانات العميل:%0Aالاسم: ${name}%0Aرقم الهاتف: ${phone}%0Aطريقة الاستلام: ${methodText}${addressInfo.replace(/\n/g, '%0A')}`;
    
    const orderData = {
        customerName: name,
        phone: phone,
        address: isDelivery ? areaText + " (خرائط: " + mapsLink + ")" : "استلام عبر النقطة",
        orderDetails: `المنتج: ${product.name} (رقم: ${product.id}) - الكمية: ${qty}`,
        totalPrice: `${total} ر.س`
    };
    
    fetch(ORDERS_API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(orderData) }).catch(e => console.error(e));
    window.open(`https://wa.me/${targetPhone}?text=${message}`, '_blank');
    closeModal();
};

// Close modal if user clicks outside of it
window.addEventListener('click', (event) => {
    if (event.target == modal) {
        closeModal();
    }
    if (event.target == document.getElementById('cartModal')) {
        closeCartModal();
    }
    if (event.target == document.getElementById('favModal')) {
        closeFavModal();
    }
});

// Cart Modal Logic
const cartModal = document.getElementById('cartModal');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalPriceEl = document.getElementById('cartTotalPrice');
const cartSubmitBtn = document.getElementById('cartSubmitBtn');

window.openCartModal = function() {
    renderCartItems();
    cartModal.classList.add('show');
};

window.closeCartModal = function() {
    cartModal.classList.remove('show');
};

window.renderCartItems = function() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">السلة فارغة حالياً</p>';
        cartTotalPriceEl.textContent = '0 ر.س';
        cartSubmitBtn.disabled = true;
        return;
    }
    
    cartSubmitBtn.disabled = false;
    
    cartItems.forEach((item, index) => {
        const numericPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        total += numericPrice * item.qty;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="cart-item-info">
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">${item.price} ر.س <span style="font-size:0.8rem; color:#888;">(${(parseFloat(item.price.replace(/[^0-9.]/g, '')) * YER_EXCHANGE_RATE).toLocaleString('en-US')} ر.ي)</span></div>
                </div>
            </div>
            <div class="cart-item-actions">
                <div class="cart-qty-controls">
                    <button type="button" class="qty-btn" onclick="updateCartItemQty(${index}, -1)">-</button>
                    <span class="cart-qty-val">${item.qty}</span>
                    <button type="button" class="qty-btn" onclick="updateCartItemQty(${index}, 1)">+</button>
                </div>
                <button type="button" class="remove-item-btn" onclick="removeCartItem(${index})" aria-label="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });
    
    calculateCartTotal();
};

window.calculateCartTotal = function() {
    let total = 0;
    cartItems.forEach(item => {
        const itemPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
        total += itemPrice * item.qty;
    });
    
    let isDelivery = false;
    const inputs = document.getElementsByName('cartDeliveryMethod');
    for(let i of inputs) if(i.checked && i.value === 'delivery') isDelivery = true;
    
    let fee = 0;
    if (isDelivery) {
        const area = document.getElementById('cartDeliveryArea');
        if (area && area.options[area.selectedIndex]) {
            fee = parseFloat(area.options[area.selectedIndex].getAttribute('data-fee')) || 0;
        }
    }
    total += fee;
    
    if (cartTotalPriceEl) {
        cartTotalPriceEl.innerHTML = total + " ر.س <span style='font-size:0.85rem; color:#888;'>(" + (total * YER_EXCHANGE_RATE).toLocaleString('en-US') + " ر.ي)</span>";
    }
};

window.updateCartItemQty = function(index, change) {
    if (cartItems[index].qty + change > 0) {
        cartItems[index].qty += change;
    } else {
        cartItems.splice(index, 1);
    }
    updateCartBadge();
    renderCartItems();
};

window.removeCartItem = function(index) {
    cartItems.splice(index, 1);
    updateCartBadge();
    renderCartItems();
};

window.submitCartOrder = function(event) {
    event.preventDefault();
    
    const name = document.getElementById('cartCustomerName').value.trim();
    if (name.split(/\s+/).length < 2) {
        alert("يرجى ادخال اسمك الكريم كاملاً لتسهيل توصيل الطلب");
        return;
    }
    const phone = document.getElementById('cartCustomerPhone').value.trim();
    const address = document.getElementById('cartCustomerAddress').value.trim();
    
    if (cartItems.length === 0) return;
    
    const nameWords = name.split(/\s+/).filter(word => word.length > 0);
    if (nameWords.length < 3) {
        alert("يرجى إدخال الاسم الثلاثي على الأقل لتأكيد الطلب.");
        return;
    }
    
    const addressWords = address.split(/\s+/).filter(word => word.length > 0);
    if (addressWords.length < 2) {
        alert("يرجى إدخال العنوان بالتفصيل (كلمتين على الأقل) لتأكيد الطلب.");
        return;
    }
    
    if (name && phone && address) {
        let messageText = 'مرحباً، أود طلب هذه المنتجات:%0A%0A';
        let grandTotal = 0;
        
        cartItems.forEach((item, i) => {
            const numericPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
            const totalItemPrice = numericPrice * item.qty;
            grandTotal += totalItemPrice;
            
            messageText += `${i + 1}. ${item.name} - الكمية: ${item.qty} - السعر: ${totalItemPrice} ر.س%0A`;
        });
        
        messageText += `%0Aالمجموع الكلي: ${grandTotal} ر.س%0A%0A`;
        messageText += `بيانات العميل:%0Aالاسم: ${name}%0Aرقم الهاتف: ${phone}%0Aالعنوان: ${address}`;
        
        // Save cart order to Google Sheets
        let detailsText = cartItems.map(item => `${item.name} (الكمية: ${item.qty})`).join(' | ');
        const orderData = {
            customerName: name,
            phone: phone,
            address: address,
            orderDetails: detailsText,
            totalPrice: `${grandTotal} ر.س`
        };
        fetch(ORDERS_API_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(orderData)
        }).catch(err => console.error("Error saving order", err));
        
        const targetPhone = "967778540339";
        
        // Open WhatsApp in a new tab
        window.open(`https://wa.me/${targetPhone}?text=${messageText}`, '_blank');
        
        // Reset Cart
        cartItems = [];
        updateCartBadge();
        closeCartModal();
        document.getElementById('cartCheckoutForm').reset();
    }
};

// Hero Slider Logic
document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.hero-image .slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000);
    }
});


// Reviews Logic
let productReviews = JSON.parse(localStorage.getItem('productReviews')) || {};

const reviewsModal = document.getElementById('reviewsModal');
const reviewsList = document.getElementById('reviewsList');
const modalReviewProductName = document.getElementById('modalReviewProductName');
const reviewProductIdInput = document.getElementById('reviewProductId');

window.openReviewModal = function(productId, productName) {
    reviewProductIdInput.value = productId;
    modalReviewProductName.textContent = productName;
    renderReviews(productId);
    reviewsModal.classList.add('show');
    
    // Reset stars to 5
    document.getElementById('reviewRating').value = 5;
    document.querySelectorAll('.star-rating-input i').forEach(s => {
        s.classList.add('active');
        s.classList.remove('far');
        s.classList.add('fas');
    });
};

window.closeReviewModal = function() {
    reviewsModal.classList.remove('show');
    document.getElementById('addReviewForm').reset();
};

window.renderReviews = function(productId) {
    reviewsList.innerHTML = '';
    const reviews = productReviews[productId] || [];
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<p class="no-reviews">لا توجد آراء لهذا المنتج بعد. كن أول من يضيف رأيه!</p>';
        return;
    }
    
    reviews.forEach(review => {
        let starsHtml = '';
        const rating = review.rating || 5;
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                starsHtml += '<i class="fas fa-star"></i>';
            } else {
                starsHtml += '<i class="far fa-star"></i>';
            }
        }

        const reviewEl = document.createElement('div');
        reviewEl.className = 'review-item';
        reviewEl.innerHTML = `
            <div class="review-header">
                <span class="reviewer-name"><i class="fas fa-user-circle"></i> ${review.name}</span>
                <span class="review-stars">
                    ${starsHtml}
                </span>
            </div>
            <div class="review-text">${review.text}</div>
        `;
        reviewsList.appendChild(reviewEl);
    });
};

window.submitReview = function(event) {
    event.preventDefault();
    const productId = reviewProductIdInput.value;
    let name = document.getElementById('reviewerName').value.trim();
    const text = document.getElementById('reviewText').value.trim();
    const rating = parseInt(document.getElementById('reviewRating').value) || 5;
    
    if (!name) name = "مجهول";
    
    if (text) {
        if (!productReviews[productId]) {
            productReviews[productId] = [];
        }
        
        productReviews[productId].unshift({
            name: name,
            text: text,
            rating: rating,
            date: new Date().toISOString()
        });
        
        localStorage.setItem('productReviews', JSON.stringify(productReviews));
        
        // Save review to Google Sheets
        const reviewData = {
            action: "review",
            productId: productId,
            productName: modalReviewProductName.textContent,
            reviewerName: name,
            rating: rating,
            reviewText: text
        };
        fetch(ORDERS_API_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(reviewData)
        }).catch(err => console.error("Error saving review", err));
        
        document.getElementById('addReviewForm').reset();
        
        // Reset stars
        document.getElementById('reviewRating').value = 5;
        document.querySelectorAll('.star-rating-input i').forEach(s => {
            s.classList.add('active');
            s.classList.remove('far');
            s.classList.add('fas');
        });

        renderReviews(productId);
        
        // Show success animation or toast
        const submitBtn = document.querySelector('#addReviewForm .submit-order-btn');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = 'تم الإرسال بنجاح <i class="fas fa-check"></i>';
        submitBtn.style.backgroundColor = '#25D366';
        
        setTimeout(() => {
            submitBtn.innerHTML = originalHtml;
            submitBtn.style.backgroundColor = 'var(--primary)';
        }, 2000);
    }
};


// Add Star Rating Logic (Explicit Function for reliability)
window.setRating = function(rating) {
    document.getElementById('reviewRating').value = rating;
    const stars = document.querySelectorAll('#starRatingInput i');
    stars.forEach(s => {
        const sRating = parseInt(s.getAttribute('data-rating'));
        if (sRating <= rating) {
            s.classList.add('active');
            s.classList.remove('far');
            s.classList.add('fas');
        } else {
            s.classList.remove('active');
            s.classList.remove('fas');
            s.classList.add('far');
        }
    });
};


async function fetchReviewsFromSheet() {
    if (SHEET_ID === 'YOUR_SHEET_ID_HERE') return;
    const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:json&sheet=Reviews';
    try {
        const response = await fetch(url);
        const text = await response.text();
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonString);
        
        productReviews = {};
        data.table.rows.forEach(row => {
            if(row.c[1] && row.c[1].v) { // Product ID
                const pId = row.c[1].v.toString();
                if(!productReviews[pId]) productReviews[pId] = [];
                productReviews[pId].push({
                    date: row.c[0] ? (row.c[0].f || row.c[0].v) : '',
                    name: row.c[3] ? row.c[3].v : 'مجهول',
                    rating: row.c[4] ? parseInt(row.c[4].v) : 5,
                    text: row.c[5] ? row.c[5].v : ''
                });
            }
        });
        localStorage.setItem('productReviews', JSON.stringify(productReviews));
    } catch (error) {
        console.error('Error fetching reviews:', error);
    }
}

window.getCurrentLocation = function(inputId, btnElement) {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديد...';
    btnElement.disabled = true;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
                document.getElementById(inputId).value = mapLink;
                
                btnElement.innerHTML = '<i class="fas fa-check"></i> تم التحديد';
                btnElement.classList.add('success-btn');
                btnElement.style.backgroundColor = '#28a745';
                btnElement.style.color = 'white';
                
                setTimeout(() => {
                    btnElement.innerHTML = originalText;
                    btnElement.disabled = false;
                    btnElement.classList.remove('success-btn');
                    btnElement.style.backgroundColor = '';
                    btnElement.style.color = '';
                }, 3000);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("تعذر الحصول على الموقع. يرجى التأكد من تفعيل خدمة الموقع (GPS) في جهازك والموافقة على الصلاحية.");
                btnElement.innerHTML = originalText;
                btnElement.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("متصفحك لا يدعم خاصية تحديد الموقع الجغرافي.");
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
};

// Update delivery option texts to include YER
function updateDeliveryOptionsPrices() {
    const selects = document.querySelectorAll('.delivery-select');
    selects.forEach(select => {
        Array.from(select.options).forEach(option => {
            const fee = parseFloat(option.getAttribute('data-fee'));
            if (fee > 0 && !option.text.includes('ر.ي')) {
                const yerFee = (fee * YER_EXCHANGE_RATE).toLocaleString('en-US');
                // Remove the "(xx ر.س)" and add the YER fee
                option.text = option.text.replace(/\(.*?\)/, `(${yerFee} ر.ي)`);
            }
        });
    });
}
document.addEventListener('DOMContentLoaded', updateDeliveryOptionsPrices);
