import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { UserRole } from '../constants/roles.js';

// Pages
import { MarketplacePage } from '../pages/marketplace/MarketplacePage.jsx';
import { ListingDetailPage } from '../pages/marketplace/ListingDetailPage.jsx';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { RegisterPage } from '../pages/auth/RegisterPage.jsx';
import { BuyerOrdersPage } from '../pages/buyer/BuyerOrdersPage.jsx';
import { SellerDashboardPage } from '../pages/seller/SellerDashboardPage.jsx';
import { CreateListingPage } from '../pages/seller/CreateListingPage.jsx';
import { EditListingPage } from '../pages/seller/EditListingPage.jsx';
import { SellerOrdersPage } from '../pages/seller/SellerOrdersPage.jsx';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect to marketplace */}
      <Route path="/" element={<Navigate to="/marketplace" replace />} />

      {/* Public / Marketplace Routes */}
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/listings/:id" element={<ListingDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* BUYER Protected Routes */}
      <Route
        path="/buyer/orders"
        element={
          <ProtectedRoute allowedRoles={[UserRole.BUYER]}>
            <BuyerOrdersPage />
          </ProtectedRoute>
        }
      />

      {/* SELLER Protected Routes */}
      <Route
        path="/seller/dashboard"
        element={
          <ProtectedRoute allowedRoles={[UserRole.SELLER]}>
            <SellerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/listings/new"
        element={
          <ProtectedRoute allowedRoles={[UserRole.SELLER]}>
            <CreateListingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/listings/:id/edit"
        element={
          <ProtectedRoute allowedRoles={[UserRole.SELLER]}>
            <EditListingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/orders"
        element={
          <ProtectedRoute allowedRoles={[UserRole.SELLER]}>
            <SellerOrdersPage />
          </ProtectedRoute>
        }
      />

      {/* ADMIN Protected Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
