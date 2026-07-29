<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { gcalPrimaryBtn } from '@/utils/calendarioGoogleTheme'

defineOptions({ name: 'ChangePasswordPage' })

const router = useRouter()
const { changePassword, homeRouteForUser } = useAuth()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  if (newPassword.value.length < 8) {
    error.value = 'La nueva contraseña debe tener al menos 8 caracteres'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contraseñas nuevas no coinciden'
    return
  }

  loading.value = true
  try {
    const authUser = await changePassword(currentPassword.value, newPassword.value)
    await router.replace(homeRouteForUser(authUser))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cambiar la contraseña'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-full flex-col justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
    <div class="mx-auto w-full max-w-md">
      <div class="text-center">
        <h1 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Cambiar contraseña</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Por seguridad, debés definir una nueva contraseña antes de continuar.
        </p>
      </div>

      <form
        class="mt-8 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-800"
        @submit.prevent="onSubmit"
      >
        <div>
          <label for="current-password" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Contraseña actual
          </label>
          <input
            id="current-password"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label for="new-password" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nueva contraseña
          </label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            required
            minlength="8"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label for="confirm-password" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirmar nueva contraseña
          </label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            minlength="8"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          :class="['w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60', gcalPrimaryBtn]"
        >
          {{ loading ? 'Guardando…' : 'Guardar y continuar' }}
        </button>
      </form>
    </div>
  </div>
</template>
