import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import ProjectEditor from './pages/ProjectEditor.vue'
import PresenterView from './pages/PresenterView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/project/:projectId', component: ProjectEditor },
    { path: '/view/:projectId', component: PresenterView },
  ],
})
