import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import CustomerLayout from './layouts/CustomerLayout.jsx';
import Home from './pages/Home.jsx';
import { Loading } from './components/States.jsx';

const Listing = lazy(() => import('./pages/Listing.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const ProductDetails = lazy(() => import('./pages/ProductDetails.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess.jsx'));
const TrackOrder = lazy(() => import('./pages/TrackOrder.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// PHASE 2 HOOK: if client/src/admin/routes.jsx exists (admin module merged in), mount it at /admin/*.
const adminLoaders = import.meta.glob('./admin/routes.jsx');
const adminLoader = Object.values(adminLoaders)[0];
const AdminApp = adminLoader ? lazy(adminLoader) : null;

export default function App() {
  return (
    <Routes>
      {AdminApp && (
        <Route path="/admin/*" element={<Suspense fallback={<Loading text="Loading admin..." />}><AdminApp /></Suspense>} />
      )}
      <Route element={<CustomerLayout />}>
        <Route index element={<Home />} />
        <Route path="mobiles" element={<Listing section="mobiles" />} />
        <Route path="electronics" element={<Listing section="electronics" />} />
        <Route path="search" element={<Listing section="all" />} />
        <Route path="about" element={<About />} />
        <Route path="product/:id" element={<ProductDetails />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-success/:orderId" element={<OrderSuccess />} />
        <Route path="track-order" element={<TrackOrder />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
