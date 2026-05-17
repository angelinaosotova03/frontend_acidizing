/* eslint-disable */
/**
 * src/app.jsx — top-level App: providers + routes + mount.
 */

const App = () => (
  <RouterProvider>
    <ToastHost>
      <AuthProvider>
        <HandoffProvider>
          <Routes>
            <Route path="/login"           element={<PublicOnlyRoute><LoginPage/></PublicOnlyRoute>}/>
            <Route path="/register"        element={<PublicOnlyRoute><RegisterPage/></PublicOnlyRoute>}/>
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage/></PublicOnlyRoute>}/>
            <Route path="/reset-password"  element={<PublicOnlyRoute><ResetPasswordPage/></PublicOnlyRoute>}/>

            <Route path="/"               element={<ProtectedRoute><AppShell><DashboardPage/></AppShell></ProtectedRoute>}/>
            <Route path="/volumes"        element={<ProtectedRoute><AppShell><VolumesPage/></AppShell></ProtectedRoute>}/>
            <Route path="/predict"        element={<ProtectedRoute><AppShell><PredictPage/></AppShell></ProtectedRoute>}/>
            <Route path="/predict/batch"  element={<ProtectedRoute><AppShell><PredictBatchPage/></AppShell></ProtectedRoute>}/>
            <Route path="/profile"        element={<ProtectedRoute><AppShell><ProfilePage/></AppShell></ProtectedRoute>}/>

            <Route path="*" element={<Navigate to="/"/>}/>
          </Routes>
        </HandoffProvider>
      </AuthProvider>
    </ToastHost>
  </RouterProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
