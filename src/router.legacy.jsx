/* eslint-disable */
/**
 * src/router.jsx — minimal hash router (file:// friendly) +
 *                  AuthProvider + PredictHandoff context.
 *
 * Public API mirrors react-router enough for our prototype:
 *   useNavigate(), useLocation(), <Routes><Route>, <Link>, <Navigate>
 *
 * Route paths support `:param`.
 */

const { useState: rUseState, useEffect: rUseEffect, useContext: rUseContext, createContext: rCreate, useCallback: rUseCallback, useMemo: rUseMemo } = React;

// ─── Hash router internals ────────────────────────────────────────────
const RouterCtx = rCreate(null);

function parseHashUrl(hash) {
  // strip leading "#" and split off ?query
  const raw = (hash || '').replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const search = new URLSearchParams(query || '');
  return { pathname: path.startsWith('/') ? path : '/' + path, search };
}

const RouterProvider = ({ children }) => {
  const [loc, setLoc] = rUseState(() => parseHashUrl(window.location.hash));
  const [state, setState] = rUseState(null); // ephemeral routerState passed via navigate(...,{state})

  rUseEffect(() => {
    const onHash = () => setLoc(parseHashUrl(window.location.hash));
    window.addEventListener('hashchange', onHash);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = rUseCallback((to, opts = {}) => {
    if (typeof to === 'number') { window.history.go(to); return; }
    let target = to;
    if (typeof to === 'object') {
      const params = new URLSearchParams(to.search || '');
      target = to.pathname + (params.toString() ? '?' + params.toString() : '');
    }
    if (opts.state !== undefined) setState(opts.state);
    else setState(null);
    if (opts.replace) {
      window.location.replace('#' + target);
    } else {
      window.location.hash = '#' + target;
    }
  }, []);

  const value = rUseMemo(() => ({ ...loc, navigate, state }), [loc, navigate, state]);
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>;
};

const useLocation = () => rUseContext(RouterCtx);
const useNavigate = () => rUseContext(RouterCtx).navigate;

// match a route pattern against a pathname
function matchPath(pattern, pathname) {
  const pa = pattern.split('/').filter(Boolean);
  const pb = pathname.split('/').filter(Boolean);
  if (pa.length !== pb.length && !pattern.endsWith('/*')) return null;
  const params = {};
  for (let i = 0; i < pa.length; i++) {
    const seg = pa[i];
    if (seg === '*') return { params };
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(pb[i] || '');
    else if (seg !== pb[i]) return null;
  }
  return { params };
}

const RouteParamsCtx = rCreate({});
const useParams = () => rUseContext(RouteParamsCtx);

const Routes = ({ children }) => {
  const { pathname } = useLocation();
  const routes = React.Children.toArray(children);
  for (const r of routes) {
    const m = matchPath(r.props.path, pathname);
    if (m) {
      return <RouteParamsCtx.Provider value={m.params}>{r.props.element}</RouteParamsCtx.Provider>;
    }
  }
  // 404 → first route with path "*"
  const notFound = routes.find(r => r.props.path === '*');
  return notFound ? notFound.props.element : null;
};
const Route = () => null;

const Link = ({ to, className='', state, replace=false, children, ...rest }) => {
  const navigate = useNavigate();
  return (
    <a href={'#' + to} className={className}
       onClick={e => { e.preventDefault(); navigate(to, { state, replace }); }}
       {...rest}>
      {children}
    </a>
  );
};
const NavLink = ({ to, className='', activeClassName='active', children, ...rest }) => {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to));
  return <Link to={to} className={`${className} ${active?activeClassName:''}`.trim()} {...rest}>{children}</Link>;
};
const Navigate = ({ to, replace=true, state }) => {
  const navigate = useNavigate();
  rUseEffect(() => { navigate(to, { replace, state }); }, []);
  return null;
};

// ─── Auth Context ─────────────────────────────────────────────────────
const AuthCtx = rCreate(null);
const useAuth = () => rUseContext(AuthCtx);

const AuthProvider = ({ children }) => {
  const [user, setUser] = rUseState(null);
  const [bootstrapping, setBootstrapping] = rUseState(true);

  // Bootstrap: if we have a token, fetch /auth/me
  rUseEffect(() => {
    (async () => {
      if (tokenStore.getAccess()) {
        try {
          const me = await authApi.me();
          setUser(me);
        } catch (_) { tokenStore.clear(); }
      }
      setBootstrapping(false);
    })();
    const onExpired = () => { setUser(null); };
    window.addEventListener('opz:auth-expired', onExpired);
    return () => window.removeEventListener('opz:auth-expired', onExpired);
  }, []);

  const login = rUseCallback(async (creds) => {
    await authApi.login(creds);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);
  const register = rUseCallback(async (body) => {
    await authApi.register(body);
    // auto-login per brief
    await authApi.login({ username: body.username, password: body.password });
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);
  const logout = rUseCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);
  const refreshMe = rUseCallback(async () => {
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login, register, logout, refreshMe, bootstrapping }}>
      {children}
    </AuthCtx.Provider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <FullScreenLoader/>;
  if (!user) return <Navigate to="/login"/>;
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <FullScreenLoader/>;
  if (user) return <Navigate to="/"/>;
  return children;
};

const FullScreenLoader = () => (
  <div className="h-screen w-screen grid place-items-center bg-ink-50">
    <div className="flex items-center gap-3 text-ink-500">
      <span className="spinner dark"/>
      <span className="text-sm">Загрузка…</span>
    </div>
  </div>
);

// ─── Volumes → Predict handoff context ────────────────────────────────
const HandoffCtx = rCreate({ payload: null, set: () => {}, consume: () => {} });
const HandoffProvider = ({ children }) => {
  const [payload, setPayload] = rUseState(null);
  return (
    <HandoffCtx.Provider value={{
      payload,
      set: setPayload,
      consume: () => { const p = payload; setPayload(null); return p; },
    }}>
      {children}
    </HandoffCtx.Provider>
  );
};
const useHandoff = () => rUseContext(HandoffCtx);

// ─── Export ───────────────────────────────────────────────────────────
Object.assign(window, {
  RouterProvider, useLocation, useNavigate, useParams,
  Routes, Route, Link, NavLink, Navigate,
  AuthProvider, useAuth, ProtectedRoute, PublicOnlyRoute,
  HandoffProvider, useHandoff, FullScreenLoader,
});
