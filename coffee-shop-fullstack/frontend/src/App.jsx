import { useEffect, useMemo, useState } from "react";
import { Coffee, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, X, Clock3, ReceiptText } from "lucide-react";

const money = (value) => `₹${Number(value).toFixed(2)}`;

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]);
  const [customer, setCustomer] = useState("Guest");
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "", category: "Special" });
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const cartItems = useMemo(
    () => products.filter((p) => cart[p.id]).map((p) => ({ ...p, quantity: cart[p.id] })),
    [products, cart]
  );
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  async function loadData() {
    const [productResponse, orderResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/orders"),
    ]);
    if (!productResponse.ok || !orderResponse.ok) throw new Error("Could not load shop data.");
    setProducts(await productResponse.json());
    setOrders(await orderResponse.json());
  }

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message));
  }, []);

  function changeQuantity(id, delta) {
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[id] || 0) + delta;
      if (quantity <= 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  }

  async function addProduct(event) {
    event.preventDefault();
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newProduct, price: Number(newProduct.price), image: "" }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not add product.");
    setProducts((current) => [...current, data]);
    setNewProduct({ name: "", description: "", price: "", category: "Special" });
    setShowAdd(false);
    setMessage("New coffee added to the menu.");
  }

  async function checkout() {
    if (!cartItems.length) return;
    setBusy(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customer.trim() || "Guest",
          items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Checkout failed.");
      setCart({});
      await loadData();
      setMessage(`Order #${data.id} saved successfully. Total: ${money(data.total)}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Coffee size={21}/></span><span>brew<span className="amp">&</span>bean</span></a>
        <nav><a className="active" href="#menu">Menu</a><a href="#orders">Orders</a></nav>
        <a className="cart-pill" href="#bill"><ShoppingBag size={17}/> <span>{itemCount}</span></a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot"/> YOUR DAILY CUP OF JOY</span>
            <h1>Good coffee.<br/><em>Good mood.</em></h1>
            <p>Thoughtfully brewed, freshly served. Find your new favourite in every cup.</p>
            <a className="primary-link" href="#menu">Explore the menu <span>↗</span></a>
          </div>
          <div className="hero-image">
            <div className="hero-note"><span>EST. 2024</span><strong>Made with<br/>a little love.</strong></div>
          </div>
          <div className="hero-stamp"><Coffee size={25}/><span>FRESH<br/>EVERY DAY</span></div>
        </section>

        <section className="menu-section" id="menu">
          <div className="section-heading">
            <div><span className="eyebrow">THE GOOD STUFF</span><h2>Our coffee menu<span>.</span></h2><p>Simple ingredients. Beautifully made.</p></div>
            <button className="outline-button" onClick={() => setShowAdd(true)}><Plus size={16}/> Add coffee</button>
          </div>

          {message && <div className="notice"><CheckCircle2 size={17}/>{message}<button onClick={() => setMessage("")}><X size={15}/></button></div>}

          <div className="product-grid">
            {products.map((product, index) => (
              <article className="product-card" key={product.id}>
                <div className={`product-photo photo-${index % 4}`} style={product.image ? { backgroundImage: `url("${product.image}")` } : {}}>
                  <span className="category-tag">{product.category}</span>
                  <button className="add-button" onClick={() => changeQuantity(product.id, 1)} aria-label={`Add ${product.name}`}><Plus size={19}/></button>
                </div>
                <div className="product-info"><div><h3>{product.name}</h3><p>{product.description}</p></div><strong>{money(product.price)}</strong></div>
                {cart[product.id] > 0 && <div className="quantity-row"><span>In your order</span><div className="quantity-control"><button onClick={() => changeQuantity(product.id, -1)}><Minus size={13}/></button><b>{cart[product.id]}</b><button onClick={() => changeQuantity(product.id, 1)}><Plus size={13}/></button></div></div>}
              </article>
            ))}
          </div>
          {!products.length && <p className="empty-state">Loading the coffee menu...</p>}
        </section>

        <section className="lower-grid">
          <section className="bill-panel" id="bill">
            <div className="panel-title"><div><span className="eyebrow">YOUR SELECTION</span><h2>Your order<span>.</span></h2></div><span className="count-badge">{itemCount} items</span></div>
            <label className="field-label">CUSTOMER NAME</label>
            <input className="customer-input" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Enter customer name"/>
            <div className="bill-items">
              {!cartItems.length && <div className="empty-cart"><ShoppingBag size={24}/><span>Your cup is waiting.</span><small>Add something delicious from the menu.</small></div>}
              {cartItems.map((item) => <div className="bill-item" key={item.id}><div><b>{item.name}</b><small>{item.quantity} × {money(item.price)}</small></div><strong>{money(item.price * item.quantity)}</strong><button onClick={() => changeQuantity(item.id, -item.quantity)} aria-label="Remove item"><Trash2 size={15}/></button></div>)}
            </div>
            <div className="totals"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>GST (5%)</span><b>{money(tax)}</b></div><div className="grand-total"><span>Total</span><strong>{money(total)}</strong></div></div>
            <button className="checkout-button" disabled={!cartItems.length || busy} onClick={checkout}>{busy ? "Saving order..." : <>Complete order <span>→</span></>}</button>
            <p className="secure-note"><CheckCircle2 size={13}/> Your order is saved securely in the database.</p>
          </section>

          <section className="orders-panel" id="orders">
            <div className="panel-title"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Recent orders<span>.</span></h2></div><ReceiptText size={22}/></div>
            {!orders.length && <div className="empty-orders">No orders yet. Your first coffee order will appear here.</div>}
            <div className="order-list">{orders.slice(0, 6).map((order) => <div className="order-row" key={order.id}><div className="order-icon"><Coffee size={17}/></div><div className="order-detail"><b>Order #{order.id}</b><small>{order.customer_name} · {new Date(order.created_at).toLocaleString()}</small><small>{order.items.map((item) => `${item.quantity} ${item.product_name}`).join(", ")}</small></div><strong>{money(order.total)}</strong></div>)}</div>
            <div className="hours-note"><Clock3 size={16}/><span>Freshly brewed, all day long.</span></div>
          </section>
        </section>
      </main>
      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Coffee size={17}/></span><span>brew<span className="amp">&</span>bean</span></a><span>GOOD COFFEE, GOOD COMPANY.</span><span>© 2026 Brew & Bean</span></footer>

      {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" onSubmit={(e) => addProduct(e).catch((error) => setMessage(error.message))} onClick={(e) => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">GROW THE MENU</span><h2>Add a coffee</h2></div><button type="button" onClick={() => setShowAdd(false)}><X/></button></div><label>Coffee name<input required minLength="2" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}/></label><label>Description<input value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}/></label><div className="modal-fields"><label>Price (₹)<input required type="number" min="1" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}/></label><label>Category<select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}><option>Special</option><option>Classic</option><option>Milk Coffee</option><option>Cold</option></select></label></div><button className="checkout-button" type="submit">Save coffee <span>→</span></button></form></div>}
    </div>
  );
}
