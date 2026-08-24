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
            
            return {
                id: getVal(0),
                name: getVal(1),
                category: getVal(2),
                categoryName: getVal(3),
                price: getVal(4),
                desc: getVal(5),
                image: getVal(6)
            };
        }).filter(p => p.id && p.name && String(p.id).toLowerCase() !== 'id'); // Filter out empty rows
        
        // Remove loading state and render
        if (loadingEl) loadingEl.style.display = 'none';
        renderCategories();
        renderProducts();
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

let favItems = JSON.parse(localStorage.getItem('favItems')) || [];
const ORDERS_API_URL = "https://script.google.com/macros/s/AKfycbyshJE4mX29mhSTNn3jd8TDOZwTgJD3Wf_SCS6e89e_Lq9aqJpopHXNl8knqsC93ObYtA/exec";
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
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${product.image}" alt="${product.name}" class="product-image">
                </div>
                <div class="product-favorite ${favItems.includes(product.id) ? 'active' : ''}" data-id="${product.id}" onclick="toggleFavorite(this, '${product.id}')" aria-label="إضافة المنتج للمفضلة" title="إضافة المنتج للمفضلة">
                    <i class="fas fa-heart"></i>
                </div>
                <span class="product-category">${product.categoryName}</span>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.desc}</p>
                    <div class="product-price-container">
                        <span class="product-price">${product.price}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn-cart" onclick="addToCart(this, '${product.id}')" aria-label="أضف للسلة">
                            إضافة للسلة <i class="fas fa-cart-plus"></i>
                        </button>
                        <button class="btn-order" onclick="openOrderModal('${product.id}', '${product.name}', '${product.price}')" aria-label="طلب المنتج">
                            طلب المنتج <i class="fab fa-whatsapp"></i>
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
                    <div class="fav-item-price">${product.price}</div>
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

window.calculateTotal = function() {
    const qty = parseInt(productQuantity.value) || 1;
    const price = parseFloat(modalRawPrice.value) || 0;
    const total = qty * price;
    modalTotalPrice.textContent = total + " ر.س";
};

window.closeModal = function() {
    modal.classList.remove('show');
    orderForm.reset();
};

window.submitOrder = function(event) {
    event.preventDefault(); // Prevent form from submitting normally
    
    const name = document.getElementById('customerName').value.trim();
    if (name.split(/\s+/).length < 2) {
        alert("يرجى ادخال اسمك الكريم كاملاً لتسهيل توصيل الطلب");
        return;
    }
    const address = document.getElementById('customerAddress').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const productId = modalProductId.value;
    const qty = document.getElementById('productQuantity').value;
    
    // Find the product to get its name and price
    const product = products.find(p => p.id == productId);
    
    if (name && phone && address && product) {
        // Calculate total price for the message
        const numericPrice = parseFloat(product.price.replace(/[^0-9.]/g, ''));
        const totalPrice = numericPrice * parseInt(qty);
        
        // Construct the WhatsApp message exactly as requested
        const targetPhone1 = "967780304833";
        const targetPhone2 = "967778540339";
        const message = `مرحباً، أود طلب هذا المنتج:%0A%0Aرقم المنتج: ${product.id}%0Aاسم المنتج: ${product.name}%0Aالكمية: ${qty}%0Aسعر الطلب: ${totalPrice} ر.س%0A%0A%0Aبيانات العميل:%0Aالاسم: ${name}%0Aرقم الهاتف: ${phone}%0Aالعنوان: ${address}`;
        
        // Save order to Google Sheets
        const orderData = {
            customerName: name,
            phone: phone,
            address: address,
            orderDetails: `المنتج: ${product.name} (رقم: ${product.id}) - الكمية: ${qty}`,
            totalPrice: `${totalPrice} ر.س`
        };
        fetch(ORDERS_API_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(orderData)
        }).catch(err => console.error("Error saving order", err));
        
        // Open WhatsApp in a new tab for the first number
        window.open(`https://wa.me/${targetPhone1}?text=${message}`, '_blank');
        
        // Open WhatsApp in a new tab for the second number
        setTimeout(() => {
            window.open(`https://wa.me/${targetPhone2}?text=${message}`, '_blank');
        }, 500);
        
        // Close modal and reset form
        closeModal();
    }
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
                    <div class="cart-item-price">${item.price}</div>
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
    
    cartTotalPriceEl.textContent = total + ' ر.س';
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
        
        const targetPhone1 = "967780304833";
        const targetPhone2 = "967778540339";
        
        window.open(`https://wa.me/${targetPhone1}?text=${messageText}`, '_blank');
        setTimeout(() => {
            window.open(`https://wa.me/${targetPhone2}?text=${messageText}`, '_blank');
        }, 500);
        
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
