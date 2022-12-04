import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import PageHome from './components/PageHome.vue';
import PageAbout from './components/PageAbout.vue';
import PageServices from './components/PageServices.vue';
import PageContact from './components/PageContact.vue';
import './style.css';

const routes = [
  { path: '/', component: PageHome, meta: { title: 'You\'re home.', isHome: true } },
  { path: '/about', component: PageAbout, meta: { title: 'About me' } },
  { path: '/consultancy', component: PageServices, meta: { title: 'Web Technologies Consultancy' } },
  { path: '/contact', component: PageContact, meta: { title: 'Web Technologies Consultancy' } },
];
const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _, next) => {
  document.title = `${to.meta.title} | Sr. Web Consultant`;
  next();
});

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount('#app');
