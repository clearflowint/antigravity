import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ChittiCircleView from '../views/ChittiCircleView.vue';
import { useAuth } from '../composables/useAuth';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/home',
    redirect: '/'
  },
  {
    path: '/groups',
    redirect: '/'
  },
  {
    path: '/groups/:chittiId',
    name: 'GroupDetail',
    component: ChittiCircleView,
    meta: { requiresAuth: true }
  },
  {
    path: '/chitti/:chittiId',
    redirect: (to) => `/groups/${to.params.chittiId}`
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/OnboardingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/demo',
    redirect: '/'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/summary',
    redirect: '/'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Route Protection: Force unauthenticated users to /login
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth();
  const isPublic = to.meta.public === true;

  if (!isPublic && !isAuthenticated.value) {
    // Unauthenticated -> Force redirect to /login
    next({
      name: 'Login',
      query: to.path !== '/' ? { redirect: to.fullPath } : undefined
    });
  } else if (to.name === 'Login' && isAuthenticated.value) {
    // Already authenticated -> Redirect to /home
    next({ name: 'Home' });
  } else {
    next();
  }
});

export default router;
