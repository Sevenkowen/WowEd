<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/api/http'
import { gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'

defineOptions({ name: 'LoginPage' })

const router = useRouter()
const route = useRoute()
const { login, homeRouteForUser } = useAuth()
const apiEnabled = useApi()
const isDev = import.meta.env.DEV

const loginName = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    const authUser = await login(loginName.value.trim(), password.value)
    if (authUser.must_change_password) {
      await router.replace({ name: 'change-password' })
      return
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    if (redirect) {
      await router.replace(redirect)
      return
    }
    await router.replace(homeRouteForUser(authUser))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-full flex-col justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
    <div class="mx-auto w-full max-w-md">
      <div class="text-center">
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">WowEd</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Acceso para directores y administradores de plataforma
        </p>
      </div>

      <form
        class="mt-8 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-800"
        @submit.prevent="onSubmit"
      >
        <div>
          <label for="login" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Usuario o mail personal
          </label>
          <input
            id="login"
            v-model="loginName"
            type="text"
            autocomplete="username"
            required
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Contraseña
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          :class="['w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60', gcalPrimaryBtn]"
        >
          {{ loading ? 'Ingresando…' : 'Ingresar' }}
        </button>

        <p v-if="apiEnabled && isDev" class="space-y-1 text-center text-xs text-gray-500 dark:text-gray-400">
          <span class="block">Superadmin: <span class="font-mono">superadmin@wowed.com</span></span>
          <span class="block">Director dev: <span class="font-mono">tito@wow.com</span></span>
        </p>
      </form>
    </div>
  </div>
</template>
